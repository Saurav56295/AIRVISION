// CPCB National AQI breakpoints
// Concentrations: µg/m³, except CO which is converted to mg/m³.

const BREAKPOINTS = {
  pm25: [
    { low: 0, high: 30, aqiLow: 0, aqiHigh: 50 },
    { low: 30, high: 60, aqiLow: 50, aqiHigh: 100 },
    { low: 60, high: 90, aqiLow: 100, aqiHigh: 200 },
    { low: 90, high: 120, aqiLow: 200, aqiHigh: 300 },
    { low: 120, high: 250, aqiLow: 300, aqiHigh: 400 },
    { low: 250, high: Infinity, aqiLow: 400, aqiHigh: 500 }
  ],

  pm10: [
    { low: 0, high: 50, aqiLow: 0, aqiHigh: 50 },
    { low: 50, high: 100, aqiLow: 50, aqiHigh: 100 },
    { low: 100, high: 250, aqiLow: 100, aqiHigh: 200 },
    { low: 250, high: 350, aqiLow: 200, aqiHigh: 300 },
    { low: 350, high: 430, aqiLow: 300, aqiHigh: 400 },
    { low: 430, high: Infinity, aqiLow: 400, aqiHigh: 500 }
  ],

  no2: [
    { low: 0, high: 40, aqiLow: 0, aqiHigh: 50 },
    { low: 40, high: 80, aqiLow: 50, aqiHigh: 100 },
    { low: 80, high: 180, aqiLow: 100, aqiHigh: 200 },
    { low: 180, high: 280, aqiLow: 200, aqiHigh: 300 },
    { low: 280, high: 400, aqiLow: 300, aqiHigh: 400 },
    { low: 400, high: Infinity, aqiLow: 400, aqiHigh: 500 }
  ],

  so2: [
    { low: 0, high: 40, aqiLow: 0, aqiHigh: 50 },
    { low: 40, high: 80, aqiLow: 50, aqiHigh: 100 },
    { low: 80, high: 380, aqiLow: 100, aqiHigh: 200 },
    { low: 380, high: 800, aqiLow: 200, aqiHigh: 300 },
    { low: 800, high: 1600, aqiLow: 300, aqiHigh: 400 },
    { low: 1600, high: Infinity, aqiLow: 400, aqiHigh: 500 }
  ],

  co: [
    { low: 0, high: 1, aqiLow: 0, aqiHigh: 50 },
    { low: 1, high: 2, aqiLow: 50, aqiHigh: 100 },
    { low: 2, high: 10, aqiLow: 100, aqiHigh: 200 },
    { low: 10, high: 17, aqiLow: 200, aqiHigh: 300 },
    { low: 17, high: 34, aqiLow: 300, aqiHigh: 400 },
    { low: 34, high: Infinity, aqiLow: 400, aqiHigh: 500 }
  ],

  ozone: [
    { low: 0, high: 50, aqiLow: 0, aqiHigh: 50 },
    { low: 50, high: 100, aqiLow: 50, aqiHigh: 100 },
    { low: 100, high: 168, aqiLow: 100, aqiHigh: 200 },
    { low: 168, high: 208, aqiLow: 200, aqiHigh: 300 },
    { low: 208, high: 748, aqiLow: 300, aqiHigh: 400 },
    { low: 748, high: Infinity, aqiLow: 400, aqiHigh: 500 }
  ]
};

const POLLUTANTS = [
  { key: "pm25", field: "pm2_5", window: 24, minSamples: 16 },
  { key: "pm10", field: "pm10", window: 24, minSamples: 16 },
  { key: "no2", field: "nitrogen_dioxide", window: 24, minSamples: 16 },
  { key: "so2", field: "sulphur_dioxide", window: 24, minSamples: 16 },
  { key: "co", field: "carbon_monoxide", window: 8, minSamples: 6 },
  { key: "ozone", field: "ozone", window: 8, minSamples: 6 }
];

function getAQICategory(aqi) {
  if (!Number.isFinite(aqi)) return "Unavailable";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderately Polluted";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

function calculateSubIndex(pollutant, concentration) {
  if (!Number.isFinite(concentration) || concentration < 0) {
    return null;
  }

  const ranges = BREAKPOINTS[pollutant];

  if (!ranges) return null;

  for (const range of ranges) {
    if (concentration <= range.high) {
      // Avoid an infinite upper boundary in the final range.
      if (!Number.isFinite(range.high)) {
        return 500;
      }

      const value =
        ((range.aqiHigh - range.aqiLow) /
          (range.high - range.low)) *
          (concentration - range.low) +
        range.aqiLow;

      return Math.max(0, Math.min(500, Math.round(value)));
    }
  }

  return 500;
}

function getRollingAverage(hourly, field, index, hours, minSamples) {
  const values = hourly[field];
  const times = hourly.time;

  if (!Array.isArray(values) || !Array.isArray(times)) {
    return null;
  }

  const endTime = new Date(times[index]).getTime();

  if (!Number.isFinite(endTime)) return null;

  const startTime = endTime - (hours - 1) * 60 * 60 * 1000;

  const samples = [];

  for (let i = 0; i <= index; i++) {
    const sampleTime = new Date(times[i]).getTime();
    const value = values[i];

    if (
      sampleTime >= startTime &&
      sampleTime <= endTime &&
      Number.isFinite(value) &&
      value >= 0
    ) {
      samples.push(value);
    }
  }

  if (samples.length < minSamples) {
    return null;
  }

  return samples.reduce((sum, value) => sum + value, 0) /
    samples.length;
}

function calculateAQIAtIndex(hourly, index) {
  const subIndices = {};

  for (const pollutant of POLLUTANTS) {
    const average = getRollingAverage(
      hourly,
      pollutant.field,
      index,
      pollutant.window,
      pollutant.minSamples
    );

    if (average === null) continue;

    // Open-Meteo CO is µg/m³.
    // CPCB CO breakpoints are mg/m³.
    const concentration =
      pollutant.key === "co" ? average / 1000 : average;

    const subIndex = calculateSubIndex(
      pollutant.key,
      concentration
    );

    if (subIndex !== null) {
      subIndices[pollutant.key] = {
        value: subIndex,
        concentration: Number(concentration.toFixed(3)),
        averagingPeriodHours: pollutant.window
      };
    }
  }

  const validPollutants = Object.keys(subIndices);

  const hasParticulateMatter =
    validPollutants.includes("pm25") ||
    validPollutants.includes("pm10");

  if (validPollutants.length < 3 || !hasParticulateMatter) {
    return {
      time: hourly.time[index],
      aqi: null,
      category: "Unavailable",
      subIndices,
      validPollutantCount: validPollutants.length,
      error: "Insufficient valid pollutant data"
    };
  }

  const aqi = Math.max(
    ...Object.values(subIndices).map(item => item.value)
  );

  return {
    time: hourly.time[index],
    aqi,
    category: getAQICategory(aqi),
    subIndices,
    dominantPollutant: Object.entries(subIndices)
      .sort((a, b) => b[1].value - a[1].value)[0][0],
    validPollutantCount: validPollutants.length
  };
}

function deriveAQISeries(hourly) {
  if (
    !hourly ||
    !Array.isArray(hourly.time)
  ) {
    return [];
  }

  return hourly.time.map((time, index) =>
    calculateAQIAtIndex(hourly, index)
  );
}

function analyzePollution(hourly, currentTime) {
  const series = deriveAQISeries(hourly);
  const now = new Date(currentTime).getTime();

  let latestIndex = -1;

  for (let i = 0; i < series.length; i++) {
    const sampleTime = new Date(series[i].time).getTime();

    if (
      sampleTime <= now &&
      Number.isFinite(series[i].aqi)
    ) {
      latestIndex = i;
    }
  }

  if (latestIndex < 0) {
    return {
      error: "Insufficient data to calculate estimated CPCB AQI",
      history: series
    };
  }

  const current = series[latestIndex];

  // Compare with the closest valid reading at least 3 hours earlier.
  let previous = null;

  for (let i = latestIndex - 1; i >= 0; i--) {
    const hoursDifference =
      (new Date(current.time).getTime() -
        new Date(series[i].time).getTime()) /
      (60 * 60 * 1000);

    if (
      hoursDifference >= 3 &&
      Number.isFinite(series[i].aqi)
    ) {
      previous = series[i];
      break;
    }
  }

  let difference = null;
  let trend = "Insufficient historical data";

  if (previous) {
    difference = current.aqi - previous.aqi;
    trend = "Stable";

    if (difference > 5) trend = "Increasing";
    if (difference < -5) trend = "Decreasing";
  }

  return {
    currentAQI: current.aqi,
    previousAQI: previous ? previous.aqi : null,
    difference,
    trend,
    category: current.category,
    observationTime: current.time,
    dominantPollutant: current.dominantPollutant,
    subIndices: current.subIndices,
    validPollutantCount: current.validPollutantCount,
    history: series
  };
}

module.exports = {
  getAQICategory,
  calculateSubIndex,
  deriveAQISeries,
  analyzePollution
};