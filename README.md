# ScrapCTL — Enterprise-Grade Web Scraping & Proxy Control Center

<p align="center">
  <img src="Frontend/public/logo.svg" alt="ScrapCTL Logo" width="200" height="200" />
</p>

ScrapCTL is a modular, high-concurrency e-commerce web scraping and proxy management platform. Built on a powerful **FastAPI** backend and a real-time **React Router v7** dashboard, ScrapCTL simplifies parallel web crawling, proxy health tracking, and automated IP rotation.

🌐 **Live Demo:** [scrapctl.vercel.app](https://scrapctl.vercel.app)

---

## 🎯 The Goal & Reason to Start

Modern web scraping at scale is plagued by sophisticated bot-detection mechanisms, rate limits, and network bottlenecks. ScrapCTL was started to address these core challenges:
*   **Bypassing Rate-Limits & 407 Auth Spikes:** Concurrent connection requests often trigger `407 Proxy Authentication Required` and `403 Forbidden` errors. ScrapCTL implements staggered worker starts and automatic cooldowns to gracefully slide past gateway limits.
*   **Targeting Enterprise Portals (Example: Croma.com):** The primary goal of ScrapCTL is to harvest deep product data, spec pages, and pricing metrics from high-security, dynamic e-commerce websites like **Croma** (India's premier electronics retail chain). By utilizing Croma-specific endpoints and custom headers, it acts as a robust test target for parsing CMS content at scale.
*   **Real-Time Telemetry:** Monolithic, terminal-only scraping scripts offer zero visibility into active threads. ScrapCTL provides a live, cyberpunk-themed control dashboard with instant log streaming (via Server-Sent Events) and live worker statuses.


---

## 📊 Performance & Concurrency Benchmarks

ScrapCTL is built for high-throughput, enterprise-scale scraping. Below are real-world benchmarks observed when targeting e-commerce environments like **Croma**:

*   **Extraction Speed:** Scrapes and parses **10,000+ product details in just 5 to 8 minutes** using a configuration of **10 concurrent workers**.
*   **Horizontal Scaling:** Increasing the worker count (e.g., to 20, 50, or more) proportionally reduces the overall extraction time.
*   **Proxy-to-Worker Scaling Rule:** To support a higher number of concurrent workers without triggering rate-limiting blockades or `407 Proxy Authentication` errors, the size of your proxy pool must increase linearly with the worker count.

---

## ⚡ Quick Start

### 1. Run the FastAPI Backend Locally

```bash
# Navigate to the Backend folder
cd Backend

# Create a virtual environment and activate it
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your environment variables (.env file)
cp .env.example .env

# Spin up the FastAPI backend on port 4322
uvicorn main:app --port 4322 --reload
```

The Backend API documentation will be available at `http://localhost:4322/docs`.

### 2. Run the React Router Frontend Dashboard Locally

```bash
# Navigate to the Frontend folder
cd Frontend

# Install node dependencies
npm install

# Start the Vite development server
npm run dev
```

Your React Router application will run locally at `http://localhost:5173`.

---

## 🚀 Deployment

*   **Frontend:** Optimized for Vercel SPA builds. The project includes [vercel.json](Frontend/vercel.json) rewrites to cleanly route wildcards to the client router.
*   **Backend:** Dockerized and ready for deployment on platforms like AWS ECS, Google Cloud Run, or Fly.io (Docker files included in both folders).
*   **Database:** Configured to interface with local PostgreSQL or cloud Neon DB with SSL configurations.

---
Built with 💚 and cyberpunk aesthetics by Smit Patel (`shangkudev`).
