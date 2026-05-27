# Bug Tracker

Log bugs encountered during development. Close them when fixed and note the resolution.

---

## Template

```
### BUG-XXX — Short title
**Module:** Module N
**Status:** Open | In Progress | Fixed | Won't Fix
**Severity:** Critical | High | Medium | Low
**Reported:** YYYY-MM-DD

**Description:**
What went wrong and how to reproduce it.

**Root Cause:**
(Fill in once identified)

**Fix:**
(Fill in once resolved)
```

---

## Open Bugs

_None yet._

---

## Fixed Bugs

_None yet._

---

## Known Gotchas (Pre-emptive Notes)

These are not bugs yet but are known sharp edges from the tutorial and LiveKit/OpenAI ecosystem that are likely to bite during development.

### GOTCHA-001 — `AGENT_NAME` mismatch causes silent dispatch failure
**Module:** Module 1 / Module 2
The `AGENT_NAME` environment variable must be identical in the web service (dispatch) and the agent worker (registration). A mismatch causes LiveKit to silently drop the dispatch with no error surfaced to the frontend.

### GOTCHA-002 — VAD model download required before first run
**Module:** Module 2
The Silero VAD model must be downloaded before the agent can start: `tsx src/agent/index.ts download-files`. Skipping this causes a runtime crash on the first audio frame.

### GOTCHA-003 — Tika not running returns 500 instead of graceful fallback
**Module:** Module 1
If `TIKA_URL` is set but Tika is not actually running, the `/session` endpoint will hang or error rather than falling back to plaintext. Add a connection check at startup or catch the error per-request.

### GOTCHA-004 — LiveKit token must be used promptly
**Module:** Module 1 / Module 3
LiveKit JWTs have a short TTL (typically 10 minutes). If the frontend holds the token without connecting, the join will fail. Keep the pre-session form fast and connect immediately after receiving the token.

### GOTCHA-005 — Interrupt sensitivity with filler words
**Module:** Module 2
Configuring interrupt detection below 2 words causes the agent to be cut off by candidate sounds like "um" or "uh". The tutorial recommends requiring 2+ words to trigger an interrupt.
