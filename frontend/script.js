/* ==========================================
   AIRVISION - MAIN JAVASCRIPT
========================================== */

const API_BASE_URL = "http://localhost:5000/api";

/* ==========================================
   1. MULTI-PAGE NAVIGATION
========================================== */

const navLinks = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");

navLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const selectedPage = link.dataset.page;
        const targetPage = document.getElementById(`${selectedPage}-page`);

        if (!targetPage) {
            console.error("Page not found:", selectedPage);
            return;
        }

        pages.forEach(page => page.classList.remove("active"));
        navLinks.forEach(item => item.classList.remove("active"));

        targetPage.classList.add("active");
        link.classList.add("active");

        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});

/* ==========================================
   2. LIVE AIR-QUALITY DATA
========================================== */

const locationInput = document.querySelector("#location-search");
const searchButton = document.querySelector("#search-location");
const detectLocationButton = document.querySelector("#detect-location");
const connectionStatus = document.querySelector("#connection-status");
let activeRequest = 0;
let latestAirData = null;

function setConnectionStatus(message, state) {
    if (!connectionStatus) return;

    connectionStatus.textContent = message;
    connectionStatus.dataset.state = state || "info";
}

async function fetchApi(path) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`);
    } catch {
        throw new Error(
            "Cannot reach AIRVISION API at http://localhost:5000. " +
            "Start it from the project folder with: node backend\\api.js"
        );
    }

    const payload = await response.json();

    if (!response.ok || !payload.success) {
        throw new Error(
            payload.error || payload.message || `Request failed (${response.status})`
        );
    }

    return payload;
}

async function searchLocation() {
    if (!locationInput) return;

    const city = locationInput.value.trim();
    if (!city) {
        setConnectionStatus("Enter a city in India to search.", "error");
        locationInput.focus();
        return;
    }

    searchButton.disabled = true;
    setConnectionStatus(`Searching for ${city}...`);

    try {
        const params = new URLSearchParams({ name: city });
        const result = await fetchApi(`/search-location?${params}`);
        const location = result.locations && result.locations[0];

        if (!location) {
            throw new Error("No matching locations were returned.");
        }

        const locationName = [location.name, location.state]
            .filter(Boolean)
            .join(", ");
        locationInput.value = locationName;
        await loadAirQuality({
            name: locationName,
            latitude: location.latitude,
            longitude: location.longitude
        });
    } catch (error) {
        console.error("Location search failed:", error);
        setConnectionStatus(error.message, "error");
    } finally {
        searchButton.disabled = false;
    }
}

async function loadAirQuality(location) {
    const requestId = ++activeRequest;
    setConnectionStatus(`Loading live air-quality data for ${location.name}...`);

    try {
        const params = new URLSearchParams({
            latitude: String(location.latitude),
            longitude: String(location.longitude),
            city: location.name
        });
        const result = await fetchApi(`/air-quality?${params}`);

        if (requestId !== activeRequest) return;

        renderAirQuality(result.data);
        setConnectionStatus(
            `Live air-quality data for ${result.data.current.city}.`,
            "success"
        );
        loadNearbyMap(result.data.current, requestId);
    } catch (error) {
        if (requestId !== activeRequest) return;

        console.error("Air-quality request failed:", error);
        setConnectionStatus(error.message, "error");
    }
}

function formatTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value || "--";

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata"
    });
}

function formatConcentration(value, units) {
    return Number.isFinite(value)
        ? `${Number(value.toFixed(1))} ${units || "µg/m³"}`
        : "--";
}

function formatWeatherMeasurement(value, unit, decimals) {
    if (!Number.isFinite(value)) {
        return unit === "°C" ? "--°C" : unit === "%" ? "--%" : `-- ${unit || ""}`.trim();
    }

    const formattedValue = Number(value.toFixed(decimals));
    const separator = unit === "°C" || unit === "%" ? "" : " ";
    return `${formattedValue}${separator}${unit || ""}`;
}

function getWeatherIcon(code, isDay) {
    if (!Number.isFinite(code)) return "🌡";
    if (code === 0) return isDay === 0 ? "🌙" : "☀";
    if (code === 1 || code === 2) return isDay === 0 ? "☁" : "🌤";
    if (code === 3) return "☁";
    if (code === 45 || code === 48) return "🌫";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄";
    if ([95, 96, 99].includes(code)) return "⛈";
    return "🌡";
}

function getAQIColor(aqi) {
    if (aqi <= 50) return "#00b050";
    if (aqi <= 100) return "#92d050";
    if (aqi <= 200) return "#e5d900";
    if (aqi <= 300) return "#ff9900";
    if (aqi <= 400) return "#ff0000";
    return "#800000";
}

function updateAQI(value, category) {
    const aqiValue = document.querySelector("#aqi-value");
    const aqiStatus = document.querySelector("#aqi-status");
    const aqiGauge = document.querySelector(".aqi-gauge");
    const validAQI = Number.isFinite(value) && value >= 0 && value <= 500;

    if (!aqiValue || !aqiStatus || !aqiGauge) return;

    if (!validAQI) {
        aqiValue.textContent = "--";
        aqiValue.style.color = "";
        aqiStatus.textContent = "Unavailable";
        aqiStatus.style.background = "#526477";
        aqiStatus.style.color = "#ffffff";
        aqiGauge.style.background = "#526477";
        aqiGauge.setAttribute("aria-label", "Air Quality Index unavailable");
        return;
    }

    const color = getAQIColor(value);
    const textColor = value > 300 ? "#ffffff" : "#17202a";
    const angle = (value / 500) * 270;

    aqiValue.textContent = Math.round(value);
    aqiStatus.textContent = category || "Unavailable";
    aqiValue.style.color = color;
    aqiStatus.style.background = color;
    aqiStatus.style.color = textColor;
    aqiGauge.style.background = `conic-gradient(
        from 225deg,
        ${color} 0deg ${angle}deg,
        rgba(255,255,255,0.12) ${angle}deg 270deg,
        transparent 270deg 360deg
    )`;
    aqiGauge.setAttribute(
        "aria-label",
        `Air Quality Index ${Math.round(value)}, category ${category || "Unavailable"}`
    );
}

function renderPollutants(current) {
    const values = [current.pm25, current.pm10, current.no2, current.so2];
    document.querySelectorAll(".pollutant p").forEach((element, index) => {
        element.textContent = formatConcentration(
            values[index],
            current.units && current.units[["pm25", "pm10", "no2", "so2"][index]]
        );
    });
}

function renderHistory(history, observationTime) {
    const chart = document.querySelector("#aqi-history-chart");
    const labels = document.querySelectorAll(".chart-labels span");
    const observationTimestamp = new Date(observationTime).getTime();
    const endTime = Number.isFinite(observationTimestamp)
        ? observationTimestamp
        : Date.now();
    const startTime = endTime - 24 * 60 * 60 * 1000;
    const values = (history || [])
        .filter(item => {
            const timestamp = new Date(item.time).getTime();
            return Number.isFinite(item.aqi) &&
                timestamp >= startTime &&
                timestamp <= endTime;
        })
        .slice(-8);

    if (!chart) return;

    chart.replaceChildren();

    if (!values.length) {
        if (labels.length) labels.forEach(label => { label.textContent = "--"; });
        return;
    }

    const maximum = Math.max(...values.map(item => item.aqi), 1);
    values.forEach(item => {
        const bar = document.createElement("span");
        const height = Math.max(8, (item.aqi / maximum) * 100);
        bar.style.height = `${height}%`;
        bar.title = `${formatTime(item.time)}: AQI ${item.aqi}`;
        chart.appendChild(bar);
    });

    if (labels.length) {
        const positions = [0, Math.floor((values.length - 1) / 3),
            Math.floor(2 * (values.length - 1) / 3), values.length - 1];
        labels.forEach((label, index) => {
            label.textContent = formatTime(values[positions[index]].time);
        });
    }
}

function createForecastEntry(item, label) {
    const entry = document.createElement("div");
    const time = document.createElement("small");
    const aqi = document.createElement("b");
    const marker = document.createElement("span");

    time.textContent = label || formatTime(item.time);
    aqi.textContent = Number.isFinite(item.aqi) ? item.aqi : "--";
    marker.textContent = "●";
    if (Number.isFinite(item.aqi)) marker.style.color = getAQIColor(item.aqi);

    entry.append(time, aqi, marker);
    return entry;
}

function renderForecast(forecast, current) {
    const container = document.querySelector(".forecast-items");
    const detailContainer = document.querySelector("#forecast-detail-list");
    const note = document.querySelector("#forecast-data-note");
    const pageNote = document.querySelector("#forecast-page-alert");
    const forecastItems = forecast && Array.isArray(forecast.forecasts)
        ? forecast.forecasts
        : [];
    const forecastText = forecast && forecast.alert
        ? `${forecast.alert} · ${forecast.forecastHours} forecast hours`
        : (forecast && forecast.error) || "Forecast data unavailable.";

    if (container) {
        container.replaceChildren();
        [{ time: current.time, aqi: current.aqi }, ...forecastItems.slice(0, 3)]
            .forEach((item, index) => {
                container.appendChild(
                    createForecastEntry(item, index === 0 ? "NOW" : null)
                );
            });
    }

    if (detailContainer) {
        detailContainer.replaceChildren();
        forecastItems.slice(0, 6).forEach(item => {
            detailContainer.appendChild(createForecastEntry(item));
        });
    }

    if (note) {
        note.textContent = forecastText;
    }
    if (pageNote) {
        pageNote.textContent = forecastText;
    }
}

function renderGuidance(guidance) {
    const message = document.querySelector("#health-message");
    const list = document.querySelector("#precautions-list");
    const precautions = guidance && Array.isArray(guidance.precautions)
        ? guidance.precautions
        : [];

    if (message) {
        message.textContent = guidance
            ? `Air quality: ${guidance.status} · Alert level: ${guidance.alertLevel}`
            : "Health guidance is unavailable.";
    }

    if (list) {
        list.replaceChildren();
        precautions.forEach(precaution => {
            const item = document.createElement("li");
            item.textContent = precaution;
            list.appendChild(item);
        });
    }

    const pageSummary = document.querySelector("#health-page-summary");
    const pageList = document.querySelector("#health-page-precautions");
    if (pageSummary) {
        pageSummary.textContent = guidance
            ? `Air quality: ${guidance.status} · Alert level: ${guidance.alertLevel}`
            : "Health guidance is unavailable.";
    }
    if (pageList) {
        pageList.replaceChildren();
        precautions.forEach(precaution => {
            const item = document.createElement("li");
            item.textContent = precaution;
            pageList.appendChild(item);
        });
    }

    const alertMessage = document.querySelector("#alert-message");
    const alertDetail = document.querySelector("#alert-detail");
    const alertsPageMessage = document.querySelector("#alerts-page-message");
    const alertsPageDetail = document.querySelector("#alerts-page-detail");
    const currentAlert = guidance && guidance.status !== "Unavailable"
        ? `${guidance.alertLevel} alert level: ${guidance.status} air quality.`
        : "No AQI alert is available for this location.";
    const currentDetail = precautions[0] || "Follow official local health advisories.";
    if (alertMessage) {
        alertMessage.textContent = currentAlert;
    }
    if (alertDetail) {
        alertDetail.textContent = currentDetail;
    }
    if (alertsPageMessage) {
        alertsPageMessage.textContent = currentAlert;
    }
    if (alertsPageDetail) {
        alertsPageDetail.textContent = currentDetail;
    }
}

function renderWeather(weather, error) {
    const current = weather && weather.current;
    const units = weather && weather.units || {};
    const temperature = formatWeatherMeasurement(
        current && current.temperature,
        units.temperature || "°C",
        1
    );
    const humidity = formatWeatherMeasurement(
        current && current.humidity,
        units.humidity || "%",
        0
    );
    const windSpeed = formatWeatherMeasurement(
        current && current.windSpeed,
        units.windSpeed || "km/h",
        1
    );

    ["#temperature", "#weather-temperature"].forEach(selector => {
        const element = document.querySelector(selector);
        if (element) element.textContent = temperature;
    });

    const humidityElement = document.querySelector("#humidity");
    const windSpeedElement = document.querySelector("#wind-speed");
    const weatherNote = document.querySelector("#weather-data-note");
    if (humidityElement) humidityElement.textContent = humidity;
    if (windSpeedElement) windSpeedElement.textContent = windSpeed;
    if (weatherNote) {
        weatherNote.textContent = error
            ? `Weather data unavailable: ${error}`
            : current && current.time
                ? `Current weather · ${formatTime(current.time)} IST`
                : "Weather data is unavailable for this location.";
    }

    const icon = getWeatherIcon(
        current && current.weatherCode,
        current && current.isDay
    );
    ["#weather-icon", "#weather-summary-icon"].forEach(selector => {
        const element = document.querySelector(selector);
        if (element) element.textContent = icon;
    });
}

function renderMap(current, locations, error) {
    const location = current.city || "Selected location";
    const hasCoordinates =
        Number.isFinite(current.latitude) &&
        Number.isFinite(current.longitude);
    const mapLocation = document.querySelector("#map-location");
    const mapSubtitle = document.querySelector("#map-subtitle");
    const mapStatus = document.querySelector("#map-live-status-text");
    const markerContainer = document.querySelector("#map-markers");
    const dataLabel = document.querySelector("#map-data-label");
    const locationLabel = location === "Your location"
        ? location
        : `${location}, India`;

    if (mapLocation) mapLocation.textContent = locationLabel;
    if (mapSubtitle) {
        mapSubtitle.textContent = hasCoordinates
            ? `${Math.abs(current.latitude).toFixed(2)}° ${
                current.latitude >= 0 ? "N" : "S"
            }, ${Math.abs(current.longitude).toFixed(2)}° ${
                current.longitude >= 0 ? "E" : "W"
            } · Nearby model points are about 10 km apart; schematic, not to scale`
            : "Selected location coordinates unavailable.";
    }

    if (mapStatus) {
        mapStatus.textContent = error
            ? "NEARBY DATA UNAVAILABLE"
            : Array.isArray(locations)
                ? `${locations.filter(point => Number.isFinite(point.aqi)).length} LIVE POINTS`
                : "LOADING NEARBY AQI...";
    }
    if (markerContainer) {
        const markerPositions = {
            Selected: { top: 53, left: 50 },
            North: { top: 29, left: 50 },
            East: { top: 53, left: 74 },
            South: { top: 76, left: 50 },
            West: { top: 53, left: 26 }
        };
        const points = Array.isArray(locations) && locations.length
            ? locations
            : [{
                label: "Selected",
                latitude: current.latitude,
                longitude: current.longitude,
                aqi: current.aqi,
                category: current.category
            }];

        markerContainer.replaceChildren();
        points.forEach(point => {
            const marker = document.createElement("div");
            const value = document.createElement("span");
            const label = document.createElement("small");
            const position = markerPositions[point.label] || markerPositions.Selected;
            const isSelected = point.label === "Selected";
            const aqi = isSelected ? current.aqi : point.aqi;
            const category = isSelected ? current.category : point.category;
            const placeName = isSelected
                ? location
                : point.placeName || "Locality name unavailable";

            marker.className = "map-marker";
            marker.style.top = `${position.top}%`;
            marker.style.left = `${position.left}%`;
            value.className = "map-aqi-value";
            value.textContent = Number.isFinite(aqi) ? Math.round(aqi) : "--";
            value.style.background = Number.isFinite(aqi)
                ? getAQIColor(aqi)
                : "#526477";
            value.style.color = aqi > 300 ? "#ffffff" : "#102438";
            value.setAttribute(
                "aria-label",
                Number.isFinite(aqi)
                    ? `${isSelected ? locationLabel : point.label}: AQI ${Math.round(aqi)}, ${category || "category unavailable"}`
                    : `${isSelected ? locationLabel : point.label}: AQI unavailable`
            );
            label.textContent = placeName;
            marker.title = Number.isFinite(aqi)
                ? `${label.textContent}${isSelected ? "" : ` (${point.label})`}: AQI ${Math.round(aqi)} (${category || "category unavailable"})`
                : `${label.textContent}: AQI unavailable`;
            marker.append(value, label);
            if (!isSelected) {
                const direction = document.createElement("span");
                direction.className = "map-direction";
                direction.textContent = point.label;
                marker.appendChild(direction);
            }
            markerContainer.appendChild(marker);
        });
    }

    if (dataLabel) {
        dataLabel.textContent = error
            ? `Nearby estimates unavailable: ${error}`
            : Array.isArray(locations)
                ? `Model AQI (not station data) · ${locations.filter(point => point.label !== "Selected" && point.placeName).length}/${Math.max(0, locations.length - 1)} nearby localities named`
                : "Loading nearby model estimates...";
    }
}

async function loadNearbyMap(current, requestId) {
    const params = new URLSearchParams({
        latitude: String(current.latitude),
        longitude: String(current.longitude)
    });

    try {
        const result = await fetchApi(`/nearby-air-quality?${params}`);
        if (requestId !== activeRequest) return;
        renderMap(current, result.locations);
    } catch (error) {
        if (requestId !== activeRequest) return;
        console.error("Nearby air-quality request failed:", error);
        renderMap(current, null, error.message);
    }
}

function renderAirQuality(result) {
    latestAirData = result;
    const current = result.current || {};
    const analysis = result.analysis || {};
    const liveStatus = document.querySelector("#aqi-live-status");
    const dataNote = document.querySelector("#aqi-data-note");
    const trendStatus = document.querySelector("#trend-status");
    const historyNote = document.querySelector("#history-data-note");
    const analyticsSummary = document.querySelector("#analytics-summary");
    const analyticsPollutants = document.querySelector("#analytics-pollutants");

    updateAQI(current.aqi, current.category);
    renderMap(current);
    renderWeather(result.weather, result.weatherError);
    renderPollutants(current);
    renderHistory(analysis.history, analysis.observationTime || current.time);
    renderForecast(result.forecast, current);
    renderGuidance(result.guidance);

    if (analyticsSummary) {
        analyticsSummary.textContent = `${current.city || "Selected location"} · AQI ${
            Number.isFinite(current.aqi) ? current.aqi : "unavailable"
        } (${current.category || "Unavailable"}) · Trend: ${
            analysis.trend || "unavailable"
        }`;
    }
    if (analyticsPollutants) {
        analyticsPollutants.replaceChildren();
        [
            ["PM2.5", current.pm25, "pm25"],
            ["PM10", current.pm10, "pm10"],
            ["NO₂", current.no2, "no2"],
            ["SO₂", current.so2, "so2"],
            ["CO", current.co, "co"],
            ["Ozone", current.ozone, "ozone"]
        ].forEach(([name, value, key]) => {
            const row = document.createElement("div");
            const label = document.createElement("b");
            const reading = document.createElement("p");
            label.textContent = name;
            reading.textContent = formatConcentration(
                value,
                current.units && current.units[key]
            );
            row.append(label, reading);
            analyticsPollutants.appendChild(row);
        });
    }

    if (liveStatus) {
        liveStatus.textContent = Number.isFinite(current.aqi)
            ? "● LIVE"
            : "● AQI UNAVAILABLE";
    }
    if (dataNote) {
        dataNote.textContent = `Estimated CPCB-method AQI · ${current.city || "Selected location"} · ${formatTime(current.time)} IST`;
    }
    if (trendStatus) {
        trendStatus.textContent = analysis.trend || "Trend unavailable";
    }
    if (historyNote) {
        historyNote.textContent = Number.isFinite(current.aqi)
            ? `AQI history · ${analysis.dominantPollutant || "Dominant pollutant unavailable"} is the dominant pollutant`
            : analysis.error || "AQI history is unavailable.";
    }
}

if (searchButton) {
    searchButton.addEventListener("click", searchLocation);
}

if (locationInput) {
    locationInput.addEventListener("keydown", event => {
        if (event.key === "Enter") searchLocation();
    });
}

if (detectLocationButton) {
    detectLocationButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
            setConnectionStatus("Geolocation is not supported by this browser.", "error");
            return;
        }

        detectLocationButton.disabled = true;
        setConnectionStatus("Detecting your location...");
        navigator.geolocation.getCurrentPosition(
            position => {
                if (locationInput) locationInput.value = "Your location";
                loadAirQuality({
                    name: "Your location",
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }).finally(() => { detectLocationButton.disabled = false; });
            },
            error => {
                detectLocationButton.disabled = false;
                console.error("Geolocation failed:", error);
                setConnectionStatus(
                    error.code === error.PERMISSION_DENIED
                        ? "Location permission was denied. Search for a city instead."
                        : "Unable to detect your location. Search for a city instead.",
                    "error"
                );
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    });
}

function appendChatMessage(text, role) {
    const messages = document.querySelector("#assistant-messages");
    if (!messages) return;

    const message = document.createElement("div");
    message.className = `chat-message ${role}-message`;

    if (role === "assistant") {
        const avatar = document.createElement("span");
        avatar.className = "chat-avatar";
        avatar.textContent = "✧";
        message.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;
    message.appendChild(bubble);
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
}

function getAssistantReply(question) {
    const text = question.toLowerCase();
    if (!latestAirData) {
        return "I am waiting for live air-quality data. Search for a city or allow location detection, then ask me again.";
    }

    const current = latestAirData.current || {};
    const analysis = latestAirData.analysis || {};
    const guidance = latestAirData.guidance || {};
    const forecast = latestAirData.forecast || {};
    const weather = latestAirData.weather;

    if (text.includes("weather") || text.includes("temperature") || text.includes("humidity") || text.includes("wind")) {
        if (!weather || !weather.current) {
            return `Weather data is currently unavailable for ${current.city || "the selected location"}${latestAirData.weatherError ? `: ${latestAirData.weatherError}` : "."}`;
        }
        const conditions = weather.current;
        return `Current weather in ${current.city || "the selected location"}: ${formatWeatherMeasurement(conditions.temperature, "°C", 1)}, humidity ${formatWeatherMeasurement(conditions.humidity, "%", 0)}, and wind speed ${formatWeatherMeasurement(conditions.windSpeed, "km/h", 1)}.`;
    }

    if (text.includes("precaution") || text.includes("health") || text.includes("safe") || text.includes("protect") || text.includes("mask")) {
        const precautions = Array.isArray(guidance.precautions) ? guidance.precautions : [];
        const guidanceText = guidance.status
            ? `Air quality is ${guidance.status.toLowerCase()}`
            : "Health guidance is available";
        return `${guidanceText}.\n${precautions.length ? precautions.join("\n") : "Follow local health advisories and reduce prolonged outdoor exposure when pollution is high."}`;
    }

    if (text.includes("pollutant") || text.includes("pm2") || text.includes("pm10") || text.includes("ozone") || text.includes("dominate") || text.includes("dominant")) {
        const pollutant = analysis.dominantPollutant || "unavailable";
        return `${pollutant} is the dominant pollutant right now in ${current.city || "the selected location"}. Current readings:\nPM2.5: ${formatConcentration(current.pm25, "µg/m³")}\nPM10: ${formatConcentration(current.pm10, "µg/m³")}\nNO₂: ${formatConcentration(current.no2, "µg/m³")}\nSO₂: ${formatConcentration(current.so2, "µg/m³")}\nCO: ${formatConcentration(current.co, "µg/m³")}\nOzone: ${formatConcentration(current.ozone, "µg/m³")}`;
    }

    if (text.includes("forecast") || text.includes("tomorrow") || text.includes("next")) {
        const items = Array.isArray(forecast.forecasts) ? forecast.forecasts : [];
        if (!items.length) {
            return `Forecast data is unavailable for ${current.city || "the selected location"}${forecast.error ? `: ${forecast.error}` : "."}`;
        }
        const summary = items.slice(0, 6).map((item, index) => {
            const time = item.time ? formatTime(item.time) : `Period ${index + 1}`;
            return `${time}: AQI ${Number.isFinite(item.aqi) ? Math.round(item.aqi) : "--"} (${item.category || "Unavailable"})`;
        }).join("\n");
        return `Upcoming AQI in ${current.city || "the selected location"}:\n${summary}`;
    }

    if (text.includes("aqi") || text.includes("air quality") || text.includes("pollution") || text.includes("how is") || text.includes("current")) {
        const aqi = Number.isFinite(current.aqi) ? Math.round(current.aqi) : null;
        const trend = analysis.trend ? ` The trend is ${analysis.trend.toLowerCase()}.` : "";
        if (aqi === null) {
            return `AQI data is unavailable for ${current.city || "the selected location"} right now. Please check again when live readings are available.`;
        }
        return `The current estimated AQI in ${current.city || "the selected location"} is ${aqi}, classified as ${current.category || "Unavailable"}.${trend}`;
    }

    if (text.includes("where") || text.includes("location") || text.includes("city")) {
        return `The assistant is currently using data for ${current.city || "the selected location"} (${current.latitude ?? "--"}, ${current.longitude ?? "--"}).`;
    }

    if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
        return "Hello! Ask me for the current AQI, dominant pollutant, weather, forecast or health precautions.";
    }

    return `I can explain the live AQI, pollutants, weather, forecast and health precautions for ${current.city || "your selected location"}.\nTry asking: "What precautions should I take?"`;
}

const assistantForm = document.querySelector("#assistant-form");
const assistantInput = document.querySelector("#assistant-input");

if (assistantForm && assistantInput) {
    assistantForm.addEventListener("submit", event => {
        event.preventDefault();
        const question = assistantInput.value.trim();
        if (!question) return;

        appendChatMessage(question, "user");
        assistantInput.value = "";
        appendChatMessage(getAssistantReply(question), "assistant");
    });

    document.querySelectorAll("[data-prompt]").forEach(button => {
        button.addEventListener("click", () => {
            assistantInput.value = button.dataset.prompt;
            assistantForm.requestSubmit();
        });
    });
}

/* ==========================================
   3. DARK / LIGHT THEME
========================================== */

const themeToggle = document.querySelector("#theme-toggle");

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-theme");
        themeToggle.textContent = document.body.classList.contains("light-theme")
            ? "☀️"
            : "☾";
    });
}

/* ==========================================
   4. INITIAL PAGE SETUP
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    const activePage = document.querySelector(".page.active");
    if (!activePage) {
        document.getElementById("overview-page")?.classList.add("active");
    }

    const activePageId = document.querySelector(".page.active")?.id;
    if (activePageId) {
        const pageName = activePageId.replace("-page", "");
        navLinks.forEach(link => {
            link.classList.toggle("active", link.dataset.page === pageName);
        });
    }

    if (locationInput) {
        locationInput.value = "Mumbai";
        searchLocation();
    }
});

console.log("AIRVISION initialized successfully.");
