# AI Utilization Log

## 1. Goal: Phase 1 & 2 - Core System Design
- **Prompt:** "Setup a Dockerized Node.js API with Postgres and Redis to act as a Wix Payment Provider. Implement HMAC signature validation and a double-entry ledger."
- **Results:**
  - Scaffolded the `docker-compose.yml` and `init-db/schema.sql`.
  - Implemented `api/server.js` with Wix SPI compliance and the gateway simulator.
  - Built `api/worker.js` for asynchronous ledger processing using Redis.

## 2. Goal: Phase 3 - Storefront & Dashboard Development
- **Prompt:** "Build a React-based storefront for plan selection and a back-office dashboard for auditing the ledger. Use Tailwind CSS and React Router."
- **Results:**
  - Implemented `frontend/src/pages/Storefront.tsx` with plan selection and HMAC signing logic.
  - Implemented `frontend/src/pages/AdminDashboard.tsx` with transaction monitoring, audit modal, and reconciliation logic.
  - Integrated the frontend with new backend endpoints for dashboard data.

## 3. Goal: Phase 4 - Project Documentation
- **Prompt:** "Create a System Architecture Document with Mermaid diagrams, an OpenAPI specification, and an Operational Runbook for the project."
- **Results:**
  - Generated `docs/architecture.md` showing the "Money-Safe" data flow.
  - Created `docs/openapi.yaml` for standardized API communication.
  - Documented setup and manual intervention steps in `docs/runbook.md`.

## 4. Assessment Summary
The AI was utilized as a senior engineer to design the system's "Money-Safe" architecture. By leveraging the AI's ability to generate boilerplate code and complex logic (like double-entry math and HMAC signing), we ensured the project met the high standards of data integrity and system resilience required by the Technical Assessment.
