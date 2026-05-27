# Module 4 — Integration, Testing & Production Readiness

## Goal
Wire all three components together, validate the end-to-end flow, harden edge cases, and document what would be needed to take this from prototype to production.

---

## Scope

### 4.1 End-to-End Smoke Test
Run all three components simultaneously and walk through the full user journey:

1. Open frontend at `http://localhost:5173`
2. Paste a job description and resume, submit the form
3. Observe agent dispatched by LiveKit, status indicator transitions correctly
4. Conduct a short mock interview (3–5 exchanges)
5. Agent invokes `endInterview`, summary appears on post-session screen
6. Verify session is cleaned up on the web service

### 4.2 Configuration Validation
- Confirm `AGENT_NAME` matches between `src/server/index.ts` (dispatch) and `src/agent/index.ts` (registration) — mismatch causes silent dispatch failures
- Validate all required env vars are present at startup; fail fast with a descriptive error if any are missing
- Add a startup log line listing active config (masked secrets)

### 4.3 Apache Tika Integration (Optional Path)
- Document how to run Tika locally via Docker: `docker run -p 9998:9998 apache/tika`
- Test PDF and DOCX upload paths through the `/session` endpoint
- Frontend upload toggles should appear/disappear based on `GET /health` Tika availability flag

### 4.4 Error Handling & Edge Cases
- Web service:
  - Session not found → `404` with clear message
  - File too large → `413` with size limit guidance
  - Tika unavailable → fall back to plaintext, log warning
- Agent:
  - Session fetch fails → disconnect gracefully, publish error status
  - LLM API error during interview → agent apologizes and retries once
  - Summary generation fails → publish partial summary with error note
- Frontend:
  - Token fetch fails → show error on pre-session screen
  - LiveKit connection drops mid-interview → show reconnecting state, then post-session fallback

### 4.5 Security Considerations
- Tokens are short-lived JWTs; do not persist them client-side beyond the session
- Session store holds user data in memory — ensure TTL cleanup is tested
- Rate-limit `POST /session` to prevent token farming
- Never expose `LIVEKIT_API_SECRET` or `OPENAI_API_KEY` to the frontend

### 4.6 Production Upgrade Path
The tutorial uses in-memory state appropriate for a prototype. Document the swap-out points:

| Component | Prototype | Production Recommendation |
|---|---|---|
| Session store | In-memory `Map` | Redis with TTL or MongoDB |
| File storage | Memory (multer) | S3 / GCS with presigned URLs |
| Secrets | `.env` file | Vault, AWS Secrets Manager |
| Agent scaling | Single process | LiveKit Cloud auto-scaling workers |
| Frontend hosting | Vite dev server | Static build deployed to CDN |

### 4.7 Known Limitations (Prototype Scope)
- No authentication — anyone with the backend URL can create sessions
- Resumes and job descriptions are not persisted beyond TTL
- Single-region LiveKit deployment (latency may vary globally)
- No conversation logging or analytics

---

## Acceptance Criteria
- [ ] Full user journey completes without manual intervention
- [ ] Agent `AGENT_NAME` mismatch is caught at startup with a clear error
- [ ] Missing env vars cause a fail-fast error, not a runtime crash
- [ ] Tika path tested with at least one PDF upload (if Docker available)
- [ ] All edge cases in section 4.4 produce user-visible feedback, not silent failures
- [ ] Production upgrade path documented in `README.md`

---

## Dependencies
- Modules 1, 2, and 3 complete and running
- Docker (optional, for Tika testing)
- LiveKit Cloud account with valid credentials
