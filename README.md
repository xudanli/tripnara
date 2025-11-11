# TripMind Backend

Production-ready NestJS service powering the TripMind AI journey inspiration experience. This backend orchestrates itinerary generation with LLM providers, enriches destination data, aggregates travel guides, and exposes a typed API for the TripMind apps.

## Features
- **Journey orchestration** – Modular services handle framework, daily detail, transport, and tips generation.
- **Destination intelligence** – Mapbox-style geocoding, routing, altitude, and event discovery stubs ready for provider wiring.
- **Guides aggregation** – Cached search across guide sources with Redis-ready abstractions.
- **Reference catalog** – Shared enums and configuration hints for TripMind clients.
- **Task processing** – BullMQ-compatible queue scaffolding for async workloads.
- **Swagger docs** – Auto-generated API documentation served at `/api/docs`.

## Tech Stack
- Node.js 22 + TypeScript
- NestJS (Express) with `@nestjs/config` and Swagger
- Zod for environment validation
- Jest + Supertest for testing

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables by copying `.env.example` to `.env` (and `.env.stage`, `.env.prod` as needed) and filling provider credentials:
   ```bash
   cp .env.example .env
   ```
3. Run the development server with hot reload:
   ```bash
   npm run start:dev
   ```
4. Visit Swagger docs at `http://localhost:3000/api/docs`.

## Scripts
| Command | Description |
| --- | --- |
| `npm run start:dev` | Start Nest in watch mode |
| `npm run start` | Start Nest in production mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Execute e2e test suite |
| `npm run lint` | Run ESLint on `src/` and `test/` |

## Environment Reference
Key variables expected by `ConfigModule`:
- `PORT` – HTTP port (default `3000`)
- `DATABASE_URL` – Postgres connection string (when persistence is enabled)
- `REDIS_URL` – Redis endpoint for caching/queues
- `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` – LLM provider credentials
- `EVENTBRITE_API_TOKEN` – Event aggregation API token
- `MAPBOX_ACCESS_TOKEN` – Mapbox token for geocoding and routing

## Module Overview
- `GatewayModule` – Global interceptors, logging, error handling (extend as needed)
- `JourneyModule` – Journey APIs and orchestration logic
- `DestinationModule` – Geocoding, transport, altitude, and event endpoints
- `GuidesModule` – Guide search and source metadata
- `CatalogModule` – Static reference catalog for clients
- `PersistenceModule` – Repository layer (currently stubbed)
- `TaskModule` – BullMQ queue façade and dev helpers
- `LlmModule` – LLM client abstractions and prompt tooling

## Testing
Run the full suite:
```bash
npm run test
```
Generate coverage:
```bash
npm run test:cov
```

## Deployment Notes
- Build a production image with a multi-stage Dockerfile targeting Node.js 22.
- Configure secrets via your platform’s secret manager (Fly.io, Render, Kubernetes).
- Expose `/health` and `/metrics` once health checks and Prometheus integration are added.

## Project Structure
```
src/
  config/
  modules/
    catalog/
    destination/
    guides/
    journey/
    llm/
    persistence/
    task/
  main.ts
```

## Contributing
1. Create feature branches from `main`.
2. Run `npm run lint` and `npm run test` before pushing.
3. Submit PRs with context and testing evidence.
