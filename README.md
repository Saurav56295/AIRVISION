# 🌍 AIRVISION – Smart Air Quality Monitoring & Prediction Dashboard

**See the Air. Understand the Risk. Breathe Smarter.**

AIRVISION is a smart air-quality monitoring dashboard designed to help citizens understand local air pollution, identify pollution trends, monitor upcoming air-quality changes and receive general health precautions.

The platform transforms air-quality data into meaningful visual insights, helping people make informed decisions about their daily outdoor activities and health.

---

## 🚀 Key Features

### 1. Real-Time Air Quality Monitoring
- Search for locations and cities.
- View the Air Quality Index (AQI).
- Monitor major air pollutants.
- Understand current air-quality conditions through visual indicators.

### 2. Interactive Air Quality Map
- Explore air-quality information geographically.
- Understand pollution conditions across locations.
- Identify areas with potentially unhealthy air quality.

### 3. Pollution Analytics
- Analyze pollution trends.
- Understand changes in air-quality levels.
- Visualize pollutant information and environmental patterns.

### 4. Air Quality Forecast
- View a 6-hour air-quality forecast.
- Monitor expected changes in pollution levels.
- Stay prepared for potentially unhealthy air conditions.

### 5. Health Recommendations
- Receive general precautions based on AQI levels.
- Understand potential health risks.
- Get guidance for safer outdoor activities.

### 6. Smart Alerts
- Identify different pollution alert levels.
- Understand when air quality requires attention.
- Stay informed about changing environmental conditions.

### 7. AI Assistant
- Provides an additional interface for interacting with air-quality information.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js |
| Server | Node.js HTTP Server |
| Air Quality Data | Open-Meteo Air Quality API |
| AQI Methodology | Estimated CPCB-style AQI |
| Version Control | Git & GitHub |

---

## 🏗️ System Architecture

AIRVISION follows a frontend-backend architecture.

### Application Workflow

1. User searches for a city or location.
2. Frontend sends a request to the backend.
3. Backend retrieves air-quality data from Open-Meteo.
4. Backend processes pollutant information and estimates AQI.
5. The system analyzes pollution trends and generates a 6-hour forecast.
6. Precautions and alert levels are generated.
7. Processed information is returned to the frontend.
8. Dashboard presents the information through visualizations and recommendations.

---

## 📂 Project Structure

```text
AIRVISION/
│
├── backend/
│   ├── api.js
│   ├── dataProcessor.js
│   └── recommendations.js
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── .gitignore
├── README.md
└── start.bat
```

### Folder Description

**backend/**
- `api.js` – Handles API requests and manages the backend server.
- `dataProcessor.js` – Processes air-quality data, estimates AQI and generates pollution analysis and forecasts.
- `recommendations.js` – Generates health precautions and pollution alert levels based on AQI.

**frontend/**
- `index.html` – Defines the dashboard structure and content.
- `style.css` – Controls the dashboard design, layout and responsiveness.
- `script.js` – Handles frontend interactions, API communication and dynamic dashboard updates.

**Root Files**
- `.gitignore` – Specifies files and folders Git should ignore.
- `README.md` – Contains project documentation.
- `start.bat` – Helps start the AIRVISION application on Windows.

---

## ⚙️ Installation & Setup

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- [Python 3](https://www.python.org/)
- [Git](https://git-scm.com/)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Saurav56295/AIRVISION.git
```

### Step 2: Navigate to the Project

```bash
cd AIRVISION
```

### Step 3: Start the Backend

Open a terminal in the project directory and execute:

```bash
node backend/api.js
```

Backend server:

```text
http://localhost:5000
```

### Step 4: Start the Frontend

Open another terminal in the project directory and execute:

```bash
python -m http.server 5500 --bind 127.0.0.1 --directory frontend
```

Open the dashboard in your browser:

```text
http://127.0.0.1:5500
```

**Note:** Keep both terminal windows running while using AIRVISION.

---

## 🔗 API Documentation

AIRVISION provides backend endpoints for location search and air-quality analysis.

### 1. API Health Check

**Endpoint:**

```http
GET /api/health
```

This endpoint confirms that the local backend is ready. The Windows launcher uses it before opening the dashboard.

### 2. Search Location

**Endpoint:**

```http
GET /api/search-location?name=Delhi
```

**Example:**

```text
http://localhost:5000/api/search-location?name=Delhi
```

This endpoint searches for a location using its city name and returns matching location information.

### 3. Get Air Quality Information

**Endpoint:**

```http
GET /api/air-quality
```

**Required Parameters:**

| Parameter | Description |
|---|---|
| latitude | Latitude of the selected location |
| longitude | Longitude of the selected location |
| city | Name of the selected city |

**Example Request:**

```text
http://localhost:5000/api/air-quality?latitude=28.65195&longitude=77.23149&city=Delhi
```

The endpoint returns processed air-quality information, including AQI, pollutant data, pollution trends, forecasts and health guidance.

---

## 🌐 Data Source & AQI Methodology

AIRVISION uses the **Open-Meteo Air Quality API** to retrieve air-quality information.

The backend processes available pollutant data to estimate AQI using a CPCB-style methodology.

**Important:** The displayed AQI is an estimate derived from modelled air-quality data. It should not be interpreted as an official reading from a CPCB ground-based monitoring station.

---

## 🎯 Problem Statement

Air pollution is a major environmental concern, but many citizens do not know when the air around them becomes unhealthy.

People often lack accessible information about:

- Current local air pollution.
- Changes in pollution levels.
- Upcoming air-quality conditions.
- Appropriate health precautions.

AIRVISION aims to bridge this information gap through an accessible, data-driven dashboard.

---

## 💡 Our Solution

AIRVISION combines air-quality monitoring, pollution analytics, short-term forecasting and health recommendations into one platform.

Instead of presenting only pollution numbers, the platform helps users understand what those numbers mean and how they can respond.

Our goal is to make air-quality information easier to understand, accessible and useful for everyday decision-making.

---

## 🔮 Future Enhancements

- Integration with official CPCB monitoring-station data.
- Machine-learning-based pollution prediction.
- Personalized health recommendations.
- Push notifications for high-pollution alerts.
- Historical air-quality analysis.
- Expanded geographical coverage.
- Mobile application support.

---

## 👥 Team

**AIRVISION – A Two-Member Hackathon Project**

Our team works collaboratively to develop a smart solution for environmental awareness.

**Team Responsibilities**

- **Backend Development:** API integration, data processing, AQI estimation, forecasting and recommendations.
- **Frontend Development:** Dashboard interface, visualizations, user experience and frontend integration.

---

## 🤝 Contributing

Contributions, suggestions and improvements are welcome.

If you find a bug or have an idea for improvement, feel free to open an issue or submit a pull request.

---

## 📜 License

This project is developed for educational and hackathon purposes.

---

<p align="center">

# AIRVISION 🌍

**Making Air Quality Information Accessible to Everyone.**

*See the Air. Understand the Risk. Breathe Smarter.*

</p>