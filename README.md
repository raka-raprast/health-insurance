# Health Insurance Payment Orchestration Service (POS)

The Health Insurance POS is a robust, "money-safe" middleware designed to connect a **Web Storefront** (HealthSafe) to an internal **Financial Ledger**. 

Built for the Full-stack Engineer Technical Assessment, this system ensures financial accuracy using **double-entry bookkeeping** and high resilience through **asynchronous processing**, even when external gateways experience latency or failure.

## 🚀 Quick Start

### 1. Spin up the Backend Services
The POS requires PostgreSQL and Redis. Start the API, worker, and databases using Docker Compose:

```bash
docker-compose up -d --build
```

### 2. Start the Frontend Application
The storefront and back-office dashboard are built with React, Vite, and Tailwind CSS.

```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` to select an insurance plan and test the checkout flow.

## 🏗️ Architecture Summary
- **POS API (Express):** Acts as a Wix Payment Provider, implementing `POST /v1/create-order` with HMAC-SHA256 signature validation and idempotency checks.
- **Gateway Simulator:** A mock 3rd-party provider that simulates 2-5s latency and a 10% random failure rate.
- **Asynchronous Layer (Redis):** Payment events are queued in Redis to decouple the checkout response from the ledger updates.
- **Ledger Worker:** A background process that consumes events and performs atomic, double-entry SQL transactions.
- **Double-Entry Ledger (Postgres):** An immutable record where every transaction results in offsetting Debit and Credit entries (e.g., `GATEWAY_RECEIVABLE` and `REVENUE`).

## 📄 Documentation Links
Comprehensive documentation is available in the `docs/` folder:

1. **[System Architecture Document (SAD)](docs/architecture.md):** Detailed Mermaid diagrams showing the "money-safe" data flow.
2. **[API Specification](docs/openapi.yaml):** OpenAPI 3.0 definition for all endpoints (Wix SPI + Dashboard).
3. **[Operational Runbook](docs/runbook.md):** Detailed setup guide and **Manual Intervention** steps for handling failed transactions.
4. **[AI Utilization Log](docs/ai-log.md):** Documentation of the AI's role in the research, implementation, and documentation of this service.

## 🛠️ Tech Stack
- **Backend:** Node.js (Express), PostgreSQL (Ledger), Redis (Queue).
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide icons.
- **Infrastructure:** Docker, Docker Compose.

---
*Developed for the Health Insurance Startup Technical Assessment.*
