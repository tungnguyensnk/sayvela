# Sayvela

Sayvela is a real-time speech transcription, translation, and AI conversation platform. The project includes a Windows desktop app, an account management website, and a backend service for data synchronization.

## Key Features

- Capture microphone or system audio.
- Transcribe and translate speech in real time with Soniox.
- Play translated speech using TTS.
- Chat with AI through ChatGPT.
- Manage sessions, contexts, settings, and usage.
- Handle authentication, authorization, and subscriptions through Stripe.

## Architecture

```text
sayvela/
├── desktop/          # React, Vite, and Tauri/Rust
├── web/
│   ├── frontend/     # Next.js
│   ├── backend/      # NestJS
│   └── docker-compose.yml
└── scripts/          # supporting tools
```

Main data flows:

```text
Desktop/Web → NestJS API → PostgreSQL
Desktop → WASAPI → Soniox → transcript/translation → TTS
```

## Technology Stack

- Desktop: React 19, Redux Toolkit, Vite 7, Tauri 2, Rust.
- Web: Next.js 16, React 19, NextAuth, Tailwind CSS 4.
- Backend: NestJS 11, Drizzle ORM, PostgreSQL 15.
- Services: Soniox, ChatGPT, Stripe.
- Testing: Vitest, Testing Library, Jest.
- Infrastructure: Docker Compose, Nginx.

## Requirements

- Node.js 22 and npm.
- Docker Desktop for running the web stack with Docker.
- Rust stable, Tauri prerequisites, and WebView2 for the desktop app.
- Windows 10/11 for WASAPI and Windows TTS.
- Soniox, ChatGPT/Groq, and Stripe credentials for their respective features.

## Run the Web Stack with Docker

```powershell
cd web
Copy-Item .env.example .env
docker compose up --build
```

Default endpoints:

- Website: `http://localhost`
- API: `http://localhost/api`
- PostgreSQL: `localhost:52432`

Stop the stack:

```powershell
docker compose down
```

## Run the Web Stack Manually

Start PostgreSQL and update `web/.env` so `DATABASE_URL` points to a database accessible from the host machine.

Backend:

```powershell
cd web\backend
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

Frontend, in another terminal:

```powershell
cd web\frontend
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api`

## Run the Desktop App

```powershell
cd desktop
npm install
Copy-Item .env.example .env
npm run tauri dev
```

The web/backend stack must be running to use authentication, subscriptions, and data synchronization. The `npm run dev` command only starts the Vite UI; native features are not fully available outside Tauri.

## Environment Variables

Copy the example files before starting the project:

- `web/.env.example` → `web/.env`: PostgreSQL, JWT, NextAuth, Stripe, and service URLs.
- `desktop/.env.example` → `desktop/.env`: API keys used by the desktop app.

Never commit `.env` files or secrets to the repository.

## Build and Test

Desktop:

```powershell
cd desktop
npm test
npm run build
npm run tauri build
```

Web frontend:

```powershell
cd web\frontend
npm run lint
npm test
npm run build
```

Web backend:

```powershell
cd web\backend
npm run lint
npm test
npm run build
```

## Status

The project is under active development. APIs, environment configuration, and deployment workflows may change.
