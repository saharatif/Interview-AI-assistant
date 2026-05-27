# Module 2 — Agent Worker (Voice AI)

## Goal

Build the LiveKit agent worker that conducts mock interviews via voice, invokes GPT-4o for coaching logic, and publishes a structured Markdown summary when the interview ends.

---

## Scope

### 2.1 Agent Bootstrap

- Entry point: `src/agent/index.ts`
- Register the worker with LiveKit using `AGENT_NAME` (must match server dispatch name from Module 1)
- Support two CLI commands:
  - `tsx src/agent/index.ts dev` — run in development mode
  - `tsx src/agent/index.ts download-files` — pre-download VAD model weights

### 2.2 CoachAgent Class

- Extend LiveKit's `voice.Agent`
- On `connect`, fetch session context from web service (`GET /session/:id`) using the `sessionId` from room metadata
- Build system prompt by injecting job description and resume into a base coaching template
- Maintain conversation history automatically via LiveKit's built-in transcript

### 2.3 LLM Configuration (OpenAI GPT-4o)

- Model: `gpt-4o`
- Temperature tuned for consistent, professional interview questioning
- System prompt structure:
  - Role definition (experienced technical interviewer)
  - Job description context
  - Resume highlights
  - Instructions to ask one question at a time and listen actively

### 2.4 Speech-to-Text — Deepgram Nova-3

- Provider: `@livekit/agents-plugin-deepgram`
- Model: `nova-3`
- Language: multilingual via `MultilingualModel`
- Endpointing: 1.2–4 second pauses to give candidates time to think

### 2.5 Text-to-Speech — Cartesia Sonic-2

- Provider: `@livekit/agents-plugin-cartesia`
- Voice model: `sonic-2`
- Interrupt guard: require 2+ words before cutting agent speech (prevents filler sounds triggering interrupts)

### 2.6 Voice Activity Detection

- Use Silero VAD via LiveKit plugin for natural pause detection
- Tuned sensitivity to avoid false positives during thinking pauses

### 2.7 `endInterview` Tool

- LLM-callable function tool registered on the agent
- Triggered when the interview is complete (LLM decides naturally or after N questions)
- Callback flow:
  1. Extract full conversation transcript
  2. Call GPT-4o with structured summary prompt (strengths, weaknesses, recommendations)
  3. Publish Markdown summary as a text stream on LiveKit topic `interview.summary`
  4. Publish status update on topic `interview.status`
  5. Call `DELETE /session/:id` on the web service
  6. Disconnect from the room

### 2.8 Summary Prompt Structure

```
Given this interview transcript, produce a Markdown report with:
- **Overall Impression**
- **Technical Strengths**
- **Areas for Improvement**
- **Recommended Follow-up Topics**
- **Suggested Next Steps**
```

---

## Acceptance Criteria

- [ ] `tsx src/agent/index.ts dev` connects to LiveKit without errors
- [ ] Agent fetches session context and injects it into system prompt
- [ ] Voice conversation works end-to-end (STT → LLM → TTS)
- [ ] `endInterview` tool publishes a Markdown summary to `interview.summary` topic
- [ ] Session is deleted from web service after interview ends

---

## Implementation note

- A minimal agent worker skeleton was added at `src/agent` with:
  - `src/agent/index.ts` — CLI entry (`dev` and `download-files`)
  - `src/agent/coachAgent.ts` — `CoachAgent` skeleton with `start()` and `endInterview()` (writes Markdown summary to `agent_data/`)

This is a starting point for completing Module 2 implementation.

**Added demo harness**

- `src/agent/demo.ts` — demo runner that simulates an interview transcript and calls `endInterview()`; run with `pnpm demo:agent` (requires `pnpm`/`tsx` in your environment). The demo writes `agent_data/summary-<id>.md` and prints the result. If `OPENAI_API_KEY` is present the agent will attempt a GPT-4o-based summary.

**Pending best-practices**

- Runtime env validation (`src/agent/env.ts`) is recommended before LiveKit wiring.
- LiveKit connection, agent registration, and STT/TTS plugin wiring still need implementation for end-to-end testing.

---

## Dependencies

- `@livekit/agents`
- `@livekit/agents-plugin-openai`
- `@livekit/agents-plugin-deepgram`
- `@livekit/agents-plugin-cartesia`
- `@livekit/agents-plugin-silero`
- `openai` (for summary generation)
- Module 1 web service running (for session fetch and cleanup)
