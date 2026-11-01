# DeadLink Hunter (Part 1: Frontend)

**Detect. Diagnose. Fix.** An AI-assisted website health monitor. Part 1 is the complete frontend running on mock data. No crawler, database, or API keys are needed.

## Quick start (Windows PowerShell)
```powershell
cd deadlink-hunter
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview
```
Optional: `Copy-Item .env.example .env` and set `VITE_API_URL` once a backend exists. If it is empty (or unreachable) every service falls back to mock adapters.

## Tech stack
React 18, TypeScript, Vite, Tailwind CSS, React Router 6, Framer Motion, Recharts, React Flow (`@xyflow/react`), Lucide.

## Structure
`src/services` (API + mock adapters), `src/hooks/useScan.ts` (polling state machine), `src/types` (contracts), `src/data/demoData.ts` (all mock data, clearly labelled DEMO in the UI), `src/components/animations` (MechanicalScanner, TextDropHero).

## Backend contract (Part 2)
Base URL = `VITE_API_URL`. All bodies are JSON; types live in `src/types/scan.ts`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/scans` | `ScanRequest {url, maxDepth?, checkExternal?}` | `ScanJob` |
| GET | `/scans` | | `ScanJob[]` (newest first) |
| GET | `/scans/:id` | | `ScanJob` (`progress` while running, `summary` when completed) |
| GET | `/scans/:id/results` | | `LinkIssue[]` |
| POST | `/scans/:id/cancel` | | 204 |

`ScanStatus`: queued, running, completed, failed, cancelled. `IssueSeverity`: critical, warning, info. The frontend polls `GET /scans/:id` every 400 ms; swap for SSE/WebSocket inside `useScan.ts` later.
