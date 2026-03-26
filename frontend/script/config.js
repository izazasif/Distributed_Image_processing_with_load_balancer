// ========= CONFIG =========

// DEMO_MODE = true  -> uses demo data generator (no backend required)
// DEMO_MODE = false -> fetches from backend METRICS_URL
window.DEMO_MODE = true;

// Your future backend endpoint (change later)
window.METRICS_URL = "/api/metrics-summary";

// refresh interval for live updates
window.REFRESH_MS = 2000;

// number of points to keep in live line charts
window.MAX_POINTS = 60;

// used to map requests/min into a 0..100% gauge
window.RPM_MAX = 300;
