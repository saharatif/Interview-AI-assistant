# Module 1 — Project Setup & Web Service

## Goal
Bootstrap the monorepo, configure environment variables, and build the Express-based web service that manages sessions, file uploads, and LiveKit token generation.

---

## Scope

### 1.1 Repository & Toolchain
- Initialize `pnpm` workspace with two packages: `server` and `frontend`
- Configure TypeScript (`tsconfig.json`) for both packages
- Set up `tsx` for running TypeScript directly (no build step during dev)
- Add `.env` support via `dotenv`

### 1.2 Environment Variables
Define and document all required secrets/config in `.env.example`:

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
AGENT_NAME=interview-coach
TIKA_URL=http://localhost:9998        # optional
VITE_BACKEND_URL=http://localhost:3000
```

### 1.3 In-Memory Session Store
- `Map<sessionId, SessionRecord>` holding job description, resume text, and `createdAt`
- TTL cleanup job (e.g., 30-minute expiry) runs on an interval
- Expose helper functions: `createSession`, `getSession`, `deleteSession`
- Note: production should swap this for Redis or MongoDB

### 1.4 File Upload Endpoint — `POST /session`
- Accept `multipart/form-data` with fields: `jobDescription`, `resume`
- Support plaintext fields **and** file uploads (PDF, DOCX, MD, TXT)
- If `TIKA_URL` is set, proxy binary files to Apache Tika for text extraction; otherwise accept plaintext only
- Store extracted text in the session store
- Return `{ sessionId, token }` to the caller

### 1.5 LiveKit Access Token Generation
- Use `livekit-server-sdk` `AccessToken` class
- Participant identity: `candidate-{sessionId}`
- Grant: `RoomCreate`, `RoomJoin`, publish & subscribe
- Embed `RoomAgentDispatch` metadata containing `sessionId` so the agent can look it up
- `AGENT_NAME` env var must match the agent's registration name (Module 2)

### 1.6 Health & Misc Endpoints
- `GET /health` → `{ status: "ok" }`
- `GET /session/:id` → returns stored text (used by the agent in Module 2)
- `DELETE /session/:id` → cleanup hook called by the agent after interview ends

---

## Acceptance Criteria
- [ ] `tsx watch src/server/index.ts` starts without errors
- [ ] `POST /session` with plaintext fields returns a valid LiveKit JWT
- [ ] Session TTL cleanup runs in background without leaking memory
- [ ] `.env.example` documents every variable used

---

## Dependencies
- `express`, `multer` (file upload middleware)
- `livekit-server-sdk`
- `dotenv`, `tsx`, `typescript`
- `apache-tika` client (optional)
