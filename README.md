# COD Guard - Cash on Delivery (COD) Risk Decision System

COD Guard is an intelligent risk assessment and decision engine built for Indian e-commerce. It predicts **Return-to-Origin (RTO)** risk on Cash on Delivery orders, automates customer verification via WhatsApp, and protects store profits without cancelling genuine customers.

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher

### 2. Install & Run

From the project root:

```bash
# 1. Install all dependencies
npm install

# 2. Run both frontend and backend concurrently
npm run dev

# 3. if want run frontend and backend seprately 

for front-end
cd frontend
npm run dev

for back-end
cd backend
npm run dev

```

***Frontend (Web App):** [http://localhost:5173](http://localhost:5173)
***Backend (API):** [http://localhost:5000](http://localhost:5000)
---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Recharts, Lucide Icons |
| **Backend** | Node.js 20+, Express.js |
| **Database** | MongoDB via Mongoose *(with built-in local JSON fallback)* |
| **ML Engine** | Pure JavaScript Logistic Regression *(runs in Node.js)* |
| **Optional AI** | OpenAI API for address completeness check |

---

## Configuration (.env)

Create a `backend/.env` file (you can copy `backend/.env.example`):

```dotenv
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

```
---

##  4 Automated Decision Actions

For every incoming COD order, COD Guard calculates risk and recommends one of four actions:

1.  **Ship As-Is**  
   Low risk (< 25%). Order proceeds directly to normal packing & dispatch.
2.  **Ship After Confirmation**  
   Medium risk (25% – 45%). Sends an automated WhatsApp message asking the customer to reply **YES** or **NO**.
3.  **Nudge to Prepaid**  
   High incentive opportunity. Sends a WhatsApp offer with a **₹20 discount** if they pay online via UPI/card before shipping.
4.  **Hold / Manual Review**  
   High risk (> 72% for repeat buyers, > 88% for first-time buyers) or invalid details (fake names, missing phone/address). Held for operator review rather than blind auto-cancellation.

---

## Core Features & Pages

*** Overview Dashboard:** Key performance metrics, RTO rates, net financial impact, and historical decision breakdown.
*** New Order Decision:** Test and score any new order in real-time. Inspect risk score factors and toggle optional AI address review.
* ** WhatsApp Simulator:** Interactive test environment to simulate customer replies (**YES**, **NO**, ambiguous text, 24-hr timeout, and mock payment link).
*** Policy Settings:** Customize shipping and hold thresholds, courier costs, and conversion assumptions with instant net savings recalculation.
* ** Data & Model:** Inspect the historical training data, ROC-AUC validation curves, and RTO breakdown across cities and marketing channels.

---

##  Testing & Building

Run the automated backend test suite:
```bash
npm test
```

Build the frontend for production:
```bash
npm run build
```

---

## Project Structure

```text
cod_guard_mern/
├── backend/
│   ├── data/             # Historical orders CSV & local JSON state
│   ├── src/
│   │   ├── ml/           # JavaScript Logistic Regression & feature encoder
│   │   ├── models/       # Mongoose Schemas (Order, Session, Policy)
│   │   ├── services/     # Policy, WhatsApp, economics, AI review
│   │   └── server.js     # Express API server & routes
│   └── .env.example      # Example backend configuration
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components (Login, Sidebar, Badges, Metrics)
│   │   ├── pages/        # Dashboard, NewOrder, WhatsApp, Policy, DataModel
│   │   └── services/     # API client & sessionStorage auth helpers
│   └── index.html
└── package.json          # Root workspace scripts
```
