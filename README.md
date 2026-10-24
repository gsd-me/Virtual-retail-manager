<div align="center">

# 🏬 Retail Command Center (Egypt) | مركز قيادة مبيعات التجزئة
**Decision-Support & AI Performance Analytics for Women's Fashion Retail in Egypt**

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/gsd-me/Virtual-retail-manager)
[![Build and Test](https://github.com/gsd-me/Virtual-retail-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/gsd-me/Virtual-retail-manager/actions/workflows/ci.yml)

</div>

---

## ⚡ Run Instantly on GitHub (In Cloud Browser)

You can run the full application and all its AI features directly in the cloud on GitHub without installing anything locally:

1. Click the button below:
   
   [![Run on GitHub Codespaces](https://img.shields.io/badge/GitHub_Codespaces-Run_Now-2ea44f?style=for-the-badge&logo=github)](https://codespaces.new/gsd-me/Virtual-retail-manager)

2. Choose **"Create new codespace"**.
3. GitHub will start the cloud container, install dependencies, and automatically launch the application on port `3000`.
4. A notification will appear in the bottom-right corner: **"Open in Browser"** — click it to view the live dashboard!

> **Note for AI features on Codespaces:**  
> Add your `GEMINI_API_KEY` in GitHub Codespaces:  
> Go to **[GitHub Codespaces Secrets](https://github.com/settings/codespaces)** ➔ Click **"New secret"** ➔ Name: `GEMINI_API_KEY` ➔ Enter your API key and select this repository.

---

## 💻 Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/gsd-me/Virtual-retail-manager.git
cd Virtual-retail-manager

# 2. Install dependencies
npm install --legacy-peer-deps
npm install react-is --legacy-peer-deps

# 3. Configure Gemini AI API Key
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY

# 4. Start the application
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 Core Features & AI Intelligence

- **Executive Overview & Chain KPIs:** 27 retail outlets in Egypt, sales run-rates, UPT, ATV, and Day-of-Week seasonality.
- **AI Executive Brief:** One-click automated daily/monthly briefing with operational anomalies and prioritized actions.
- **Predictive Sales Forecasting:** 30-day forecast engine with baseline, optimistic, and conservative scenario modeling.
- **Branch Performance (27 Outlets):** Drilldowns by governorate, mall, and outlet with AI "Explain Store" diagnostics.
- **Salesperson Scorecard & Coaching Matrix:** UPT vs. ATV matrix with automated coaching cards and floor scripts.
- **Customer Lifecycle & Win-Back:** RFM segmentation (Champions, Regulars, Near to Retire, Retired) with AI WhatsApp/SMS retention campaigns.
- **Inventory Monitoring & Velocity:** Non-moving dead stock liquidation plans and Days of Inventory (DOI) tracking.
- **Competitor Intelligence Radar:** Real-time search-grounded market scanner for Egyptian fashion competitors with promotional tracking and pricing benchmarks.
- **POS Data Quality Audit:** Automated anomaly detection, unattributed sales analysis, and Excel drag-and-drop parser.
