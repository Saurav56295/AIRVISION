function getRecommendations(aqi) {
  if (!Number.isFinite(aqi)) {
    return {
      aqi: null,
      status: "Unavailable",
      alertLevel: "Unknown",
      precautions: [
        "AQI could not be calculated because sufficient pollutant data is unavailable.",
        "Check again when more air-quality data is available.",
        "Follow official local air-quality advisories."
      ]
    };
  }

  let status;
  let alertLevel;
  let precautions = [];

  if (aqi <= 50) {
    status = "Good";
    alertLevel = "Low";
    precautions = [
      "Air quality is good with minimal health impact.",
      "Enjoy normal outdoor activities.",
      "Continue monitoring local air quality."
    ];

  } else if (aqi <= 100) {
    status = "Satisfactory";
    alertLevel = "Low";
    precautions = [
      "Air quality is generally acceptable.",
      "Unusually sensitive people may experience minor breathing discomfort.",
      "Sensitive individuals should monitor symptoms."
    ];

  } else if (aqi <= 200) {
    status = "Moderately Polluted";
    alertLevel = "Moderate";
    precautions = [
      "People with asthma or lung conditions should take extra care.",
      "Children and older adults should reduce prolonged strenuous outdoor activity.",
      "Consider taking breaks during outdoor exercise."
    ];

  } else if (aqi <= 300) {
    status = "Poor";
    alertLevel = "High";
    precautions = [
      "Reduce prolonged outdoor exertion.",
      "People with heart or lung conditions should avoid strenuous outdoor activity.",
      "Keep windows closed when outdoor air is polluted, if practical.",
      "Use a suitable air purifier indoors if available."
    ];

  } else if (aqi <= 400) {
    status = "Very Poor";
    alertLevel = "Very High";
    precautions = [
      "Avoid prolonged outdoor physical activity.",
      "People with respiratory or heart conditions should stay in cleaner indoor air.",
      "Reduce outdoor exposure as much as possible.",
      "Follow official local health advisories."
    ];

  } else {
    status = "Severe";
    alertLevel = "Severe";
    precautions = [
      "Avoid outdoor physical activity.",
      "Remain indoors in cleaner air where possible.",
      "People with existing health conditions should take extra precautions.",
      "Follow official local health advisories.",
      "If going outside is unavoidable, consider appropriate respiratory protection."
    ];
  }

  return {
    aqi,
    status,
    alertLevel,
    precautions
  };
}

module.exports = { getRecommendations };