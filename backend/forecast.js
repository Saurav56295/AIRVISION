const { deriveAQISeries } = require("./dataProcessor");

function generateForecast(hourly, currentTime) {
  const now = new Date(currentTime).getTime();

  if (!Number.isFinite(now)) {
    return {
      error: "Invalid forecast reference time"
    };
  }

  const series = deriveAQISeries(hourly);

  const forecasts = series
    .filter(item => {
      const time = new Date(item.time).getTime();

      return (
        time > now &&
        time <= now + 6 * 60 * 60 * 1000 &&
        Number.isFinite(item.aqi)
      );
    })
    .slice(0, 6);

  if (forecasts.length === 0) {
    return {
      error: "Insufficient pollutant data for the next 6-hour AQI forecast",
      forecastHours: 0
    };
  }

  const values = forecasts.map(item => item.aqi);

  const averageAQI = Math.round(
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );

  const maximumAQI = Math.max(...values);
  const minimumAQI = Math.min(...values);

  let alert = "No elevated AQI forecast detected";

  if (maximumAQI > 400) {
    alert = "Severe air quality forecast";
  } else if (maximumAQI > 300) {
    alert = "Very poor air quality forecast";
  } else if (maximumAQI > 200) {
    alert = "Poor air quality forecast";
  } else if (maximumAQI > 100) {
    alert = "Moderately polluted air quality forecast";
  } else if (maximumAQI > 50) {
    alert = "Satisfactory air quality forecast";
  }

  return {
    forecastHours: forecasts.length,
    averageAQI,
    maximumAQI,
    minimumAQI,
    category: getCategory(averageAQI),
    alert,
    forecasts
  };
}

function getCategory(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderately Polluted";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

module.exports = { generateForecast };