const http = require("http");

const { analyzePollution } = require("./dataProcessor");
const { getRecommendations } = require("./recommendations");
const { generateForecast } = require("./forecast");

const API_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

const GEO_API =
  "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";

const REVERSE_GEOCODING_API =
  "https://nominatim.openstreetmap.org/reverse";

const AIR_QUALITY_VARIABLES = [
  "pm10",
  "pm2_5",
  "carbon_monoxide",
  "nitrogen_dioxide",
  "sulphur_dioxide",
  "ozone"
];

const nearbyPlaceCache = new Map();
let reverseGeocodingQueue = Promise.resolve();
let lastReverseGeocodingRequest = 0;

// Data source information
const AQI_INFO = {
  standard: "CPCB National AQI methodology",
  type: "Estimated CPCB-method AQI",
  source: "Open-Meteo Air Quality API",
  disclaimer:
    "This is an indicative estimate based on modelled pollutant concentrations. It is not an official CPCB monitoring-station AQI reading.",
  averagingPeriods: {
    pm25: "24-hour rolling average",
    pm10: "24-hour rolling average",
    no2: "24-hour rolling average",
    so2: "24-hour rolling average",
    co: "8-hour rolling average",
    ozone: "8-hour rolling average"
  }
};

// 1. Search location by city name
async function searchLocation(city) {
  const params = new URLSearchParams({
    name: city,
    count: "10",
    language: "en",
    format: "json",
    countryCode: "IN"
  });

  const response = await fetch(`${GEO_API}?${params}`);

  if (!response.ok) {
    throw new Error(`Location API Error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("Location not found in India");
  }

  return data.results.map(place => ({
    name: place.name,
    state: place.admin1 || "",
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude
  }));
}

async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "Asia/Kolkata"
  });

  const response = await fetch(`${WEATHER_API}?${params}`);

  if (!response.ok) {
    throw new Error(`Weather API Error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.current || !data.current_units) {
    throw new Error("Weather data unavailable for this location");
  }

  return {
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m ?? null,
      humidity: data.current.relative_humidity_2m ?? null,
      windSpeed: data.current.wind_speed_10m ?? null,
      weatherCode: data.current.weather_code ?? null,
      isDay: data.current.is_day ?? null
    },
    units: {
      temperature: data.current_units.temperature_2m,
      humidity: data.current_units.relative_humidity_2m,
      windSpeed: data.current_units.wind_speed_10m
    }
  };
}

function getNearbyPlaceName(latitude, longitude) {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (nearbyPlaceCache.has(cacheKey)) {
    return Promise.resolve(nearbyPlaceCache.get(cacheKey));
  }

  const lookup = reverseGeocodingQueue.then(async () => {
    const wait = 1100 - (Date.now() - lastReverseGeocodingRequest);
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait));
    }

    lastReverseGeocodingRequest = Date.now();
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "jsonv2",
      zoom: "14",
      addressdetails: "1"
    });
    const response = await fetch(`${REVERSE_GEOCODING_API}?${params}`, {
      headers: {
        "User-Agent": "AIRVISION/1.0",
        "Accept-Language": "en"
      }
    });

    if (!response.ok) {
      throw new Error(`Place lookup failed: ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};
    const placeName = [
      address.neighbourhood,
      address.suburb,
      address.village,
      address.town,
      address.hamlet,
      address.city_district,
      address.city,
      address.municipality,
      address.county
    ].find(value => typeof value === "string" && value.trim());

    if (!placeName) {
      throw new Error("No nearby locality name was found");
    }

    nearbyPlaceCache.set(cacheKey, placeName);
    return placeName;
  });

  reverseGeocodingQueue = lookup.then(
    () => undefined,
    () => undefined
  );

  return lookup;
}

async function getNearbyAirQuality(latitude, longitude) {
  const offsets = [
    { label: "Selected", latitude: 0, longitude: 0 },
    { label: "North", latitude: 0.1, longitude: 0 },
    { label: "East", latitude: 0, longitude: 0.1 },
    { label: "South", latitude: -0.1, longitude: 0 },
    { label: "West", latitude: 0, longitude: -0.1 }
  ];

  const points = offsets
    .map(point => ({
      ...point,
      latitude: latitude + point.latitude,
      longitude: longitude + point.longitude
    }))
    .filter(point =>
      point.latitude >= 6 &&
      point.latitude <= 38 &&
      point.longitude >= 68 &&
      point.longitude <= 98
    );

  const params = new URLSearchParams({
    latitude: points.map(point => point.latitude.toFixed(4)).join(","),
    longitude: points.map(point => point.longitude.toFixed(4)).join(","),
    current: AIR_QUALITY_VARIABLES.join(","),
    hourly: AIR_QUALITY_VARIABLES.join(","),
    timezone: "Asia/Kolkata",
    past_days: "1",
    forecast_days: "1"
  });

  const response = await fetch(`${API_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Nearby Air Quality API Error: ${response.status}`);
  }

  const responseData = await response.json();
  const locations = Array.isArray(responseData)
    ? responseData
    : [responseData];

  if (locations.length !== points.length) {
    throw new Error("Nearby air-quality data is incomplete");
  }

  return Promise.all(locations.map(async (location, index) => {
    const analysis = location.hourly && location.current
      ? analyzePollution(location.hourly, location.current.time)
      : {};
    let placeName = null;
    let placeNameError = null;

    if (points[index].label !== "Selected") {
      try {
        placeName = await getNearbyPlaceName(
          location.latitude,
          location.longitude
        );
      } catch (error) {
        placeNameError = error instanceof Error
          ? error.message
          : "Nearby locality lookup failed";
        console.error(
          `Place lookup failed for ${points[index].label}:`,
          placeNameError
        );
      }
    }

    return {
      label: points[index].label,
      placeName,
      placeNameError,
      latitude: location.latitude,
      longitude: location.longitude,
      aqi: Number.isFinite(analysis.currentAQI)
        ? analysis.currentAQI
        : null,
      category: analysis.category || "Unavailable",
      time: analysis.observationTime || null
    };
  }));
}

// 2. Get pollutant data and calculate estimated CPCB AQI
async function getAirQuality(latitude, longitude, city) {
  const weatherRequest = getWeather(latitude, longitude).then(
    weather => ({ weather, error: null }),
    error => {
      const message = error instanceof Error
        ? error.message
        : "Weather data request failed";
      console.error("Weather API request failed:", message);
      return { weather: null, error: message };
    }
  );

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),

    current: AIR_QUALITY_VARIABLES.join(","),

    hourly: AIR_QUALITY_VARIABLES.join(","),

    timezone: "Asia/Kolkata",
    past_days: "1",
    forecast_days: "2"
  });

  const response = await fetch(`${API_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Air Quality API Error: ${response.status}`);
  }

  const data = await response.json();

  if (
    !data.current ||
    !data.hourly ||
    !Array.isArray(data.hourly.time)
  ) {
    throw new Error("Air quality data unavailable for this location");
  }

  // Current pollutant concentrations
  const current = {
    city,
    latitude: data.latitude,
    longitude: data.longitude,
    time: data.current.time,

    pm25: data.current.pm2_5 ?? null,
    pm10: data.current.pm10 ?? null,

    co: data.current.carbon_monoxide ?? null,
    no2: data.current.nitrogen_dioxide ?? null,
    so2: data.current.sulphur_dioxide ?? null,
    ozone: data.current.ozone ?? null,

    units: {
      pm25: "µg/m³",
      pm10: "µg/m³",
      co: "µg/m³",
      no2: "µg/m³",
      so2: "µg/m³",
      ozone: "µg/m³"
    }
  };

  // Calculate AQI and trend using pollutant concentrations
  const analysis = analyzePollution(
    data.hourly,
    data.current.time
  );

  const currentAQI = Number.isFinite(analysis.currentAQI)
    ? analysis.currentAQI
    : null;

  // Health guidance
  const guidance = getRecommendations(currentAQI);

  // Next 6-hour forecast
  const forecast = generateForecast(
    data.hourly,
    data.current.time
  );

  const weatherResult = await weatherRequest;

  return {
    current: {
      ...current,
      aqi: currentAQI,
      category: analysis.category || "Unavailable"
    },

    analysis,

    guidance,

    forecast,

    weather: weatherResult.weather,

    weatherError: weatherResult.error,

    hourly: data.hourly,

    aqiInfo: AQI_INFO
  };
}

// 3. Create HTTP server
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Location search endpoint
  if (
    pathname === "/api/search-location" &&
    req.method === "GET"
  ) {
    try {
      const city = url.searchParams.get("name");

      if (!city || !city.trim()) {
        res.writeHead(400);
        return res.end(JSON.stringify({
          success: false,
          message: "Please provide a city name"
        }));
      }

      const locations = await searchLocation(city.trim());

      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        count: locations.length,
        locations
      }));

    } catch (error) {
      res.writeHead(404);
      return res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  }

  // Dynamic air-quality endpoint
  if (
    pathname === "/api/air-quality" &&
    req.method === "GET"
  ) {
    try {
      const latitude = Number(
        url.searchParams.get("latitude")
      );

      const longitude = Number(
        url.searchParams.get("longitude")
      );

      const city = url.searchParams.get("city");

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < 6 ||
        latitude > 38 ||
        longitude < 68 ||
        longitude > 98 ||
        !city ||
        !city.trim()
      ) {
        res.writeHead(400);
        return res.end(JSON.stringify({
          success: false,
          message:
            "Valid Indian latitude, longitude and city are required"
        }));
      }

      const result = await getAirQuality(
        latitude,
        longitude,
        city.trim()
      );

      res.writeHead(200);

      return res.end(JSON.stringify({
        success: true,
        data: result
      }));

    } catch (error) {
      res.writeHead(500);

      return res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  }

  if (
    pathname === "/api/nearby-air-quality" &&
    req.method === "GET"
  ) {
    try {
      const latitude = Number(url.searchParams.get("latitude"));
      const longitude = Number(url.searchParams.get("longitude"));

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < 6 ||
        latitude > 38 ||
        longitude < 68 ||
        longitude > 98
      ) {
        res.writeHead(400);
        return res.end(JSON.stringify({
          success: false,
          message: "Valid Indian latitude and longitude are required"
        }));
      }

      const locations = await getNearbyAirQuality(latitude, longitude);
      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        count: locations.length,
        locations
      }));
    } catch (error) {
      res.writeHead(500);
      return res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  }

  // Unknown endpoint
  res.writeHead(404);

  res.end(JSON.stringify({
    success: false,
    message: "Route not found"
  }));
});

// 4. Start server
const PORT = Number(process.env.PORT) || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`AIRVISION API running on port ${PORT}`);
});