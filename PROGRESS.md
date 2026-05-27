# Progress Log

Track development milestones, decisions, and status per module.

---

## Legend
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked

---

## Module 1 — Project Setup & Web Service
- [ ] Repo & pnpm workspace initialized
- [ ] TypeScript configured for server and frontend
- [ ] `.env.example` created with all variables
- [ ] In-memory session store with TTL cleanup
- [ ] `POST /session` endpoint (plaintext fields)
- [ ] `POST /session` endpoint (file upload path)
- [ ] Apache Tika integration (optional)
- [ ] LiveKit access token generation
- [ ] `GET /session/:id` endpoint for agent context fetch
- [ ] `DELETE /session/:id` cleanup endpoint
- [ ] `GET /health` endpoint

**Status:** Not started
**Notes:**

---

## Module 2 — Agent Worker (Voice AI)
- [ ] Agent entry point and LiveKit worker registration
- [ ] `download-files` command for VAD model weights
- [ ] `CoachAgent` class with session context fetch
- [ ] System prompt injection (job description + resume)
- [ ] Deepgram Nova-3 STT configured
- [ ] Cartesia Sonic-2 TTS configured
- [ ] Silero VAD configured
- [ ] Turn detection / endpointing tuned
- [ ] `endInterview` tool implemented
- [ ] GPT-4o summary generation
- [ ] Summary published to `interview.summary` topic
- [ ] Session cleanup after interview ends

**Status:** Not started
**Notes:**

---

## Module 3 — Frontend (Browser UI)
- [ ] Vite + Lit + Tailwind setup
- [ ] App shell with three-state screen switcher
- [ ] Pre-session form (paste mode)
- [ ] Pre-session form (file upload mode)
- [ ] Token fetch and LiveKit room connect
- [ ] Live-session status indicator (4 states)
- [ ] Microphone capture enabled
- [ ] Agent audio playback
- [ ] `interview.summary` text stream handler
- [ ] `interview.status` text stream handler
- [ ] Post-session Markdown rendering
- [ ] "Start New Interview" reset flow

**Status:** Not started
**Notes:**

---

## Module 4 — Integration, Testing & Production Readiness
- [ ] End-to-end smoke test passing
- [ ] Env var validation at startup
- [ ] `AGENT_NAME` mismatch detection
- [ ] Error handling — web service edge cases
- [ ] Error handling — agent edge cases
- [ ] Error handling — frontend edge cases
- [ ] Tika PDF/DOCX upload tested
- [ ] Security review (token lifetime, rate limiting)
- [ ] Production upgrade path documented in README

**Status:** Not started
**Notes:**

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-05-26 | Use OpenAI key (no Deepgram/Cartesia initially) | Simplify initial setup; swap providers in Module 2 |

---

## Blockers

_None yet._
