# Knightly Monorepo

Knightly lets chess.com players face lichess.org players in the same real-time pool. This repo holds two apps:
- `knightly/` — Next.js app (UI, auth, REST) that players use.
- `knightly-ws/` — Node/Socket.IO server for matchmaking, gameplay, clocks, and chat broadcast.

## Concept
- Cross-platform: chess.com users can play lichess.org users seamlessly.
- Neutral board UI: consistent visuals, sounds, and clocks regardless of platform origin.
- Real-time: websocket-driven gameplay, reconnections, and live chat.

## Tech Stack
- Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI, Framer Motion, react-chessboard, chess.js/chess.ts, Zustand, react-hook-form + zod.
- Backend (app): Next.js API routes, Prisma + Postgres (Neon), Better Auth, socket.io-client bridge to the realtime server.
- Realtime engine: Node.js + Express + Socket.IO, chess.ts validation, in-memory players/games, UUID ids.
- Tooling: pnpm, Storybook, PostCSS/Tailwind 4, TypeScript everywhere.

## How the System Works
- Auth + profile: users sign in, link a chess identity (chess.com or lichess.org), carry Elo/avatar/country/flag.
- Register: client opens a websocket to `knightly-ws`, emits `registerPlayer` with id, Elo, time control, platform tag, and profile data.
- Matchmaking: `joinQueue` pairs closest Elo; after 60s the allowed Elo delta widens. `matchFound` returns game id, colors, opponent profile, and time control.
- Game flow: players confirm (`respondToMatch`), server starts clocks, validates moves with chess.ts, broadcasts FEN/turn/clock via `gameState` and `clockUpdate`. Early false checkmates/draws are guarded against.
- Outcomes: resign (`resign`), timeout, or disconnect window (30s) ends games; reconnect uses `reconnect` + `requestGameState` to resync.
- Chat: channel-based events (`chat:join/send/edit/delete`); history comes from the app's REST API, websocket just broadcasts.

## Deployment Note (Render.com)
The websocket server is deployed on Render.com. After periods of inactivity, cold starts can add ~50 seconds before the first request/connection responds. Expect initial delay if the service has idled; subsequent requests are fast.

## Run Locally
1) Install dependencies (rooted in each project):
```bash
cd knightly && pnpm install
cd ../knightly-ws && pnpm install
```
2) Env vars (examples in `knightly/.env`):
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASS@HOST/DB?sslmode=require
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_LICHESS_CLIENT_ID=...
NEXT_PUBLIC_LICHESS_REDIRECT_URI=http://localhost:3000/lichess-oauth-callback
LICHESS_CLIENT_ID=...
LICHESS_REDIRECT_URI=http://localhost:3000/lichess-oauth-callback
WEBSOCKET_SERVER=http://localhost:4000
```
3) Start services:
```bash
# Next.js app
cd knightly
pnpm dev

# Websocket server
cd ../knightly-ws
pnpm dev
```
4) Visit http://localhost:3000, queue two users in separate browsers/tabs, and play.

## Key Websocket Events
- Player: `registerPlayer`, `joinQueue`, `leaveQueue`, `respondToMatch`, `reconnect`
- Game: `matchFound`, `gameStarted`, `makeMove`, `gameState`, `clockUpdate`, `gameEnded`, `resign`, `requestGameState`
- Chat: `chat:join`, `chat:leave`, `chat:send`, `chat:edit`, `chat:delete`, `chat:history`

## Health Check
`GET http://localhost:4000/health` returns queue length, active games, average wait/elo delta, and chat connections.
