# Module 3 — Frontend (Browser UI)

## Goal
Build the browser-based interface using Lit web components and Tailwind CSS. The UI guides the user through three screens: uploading materials, conducting the live voice interview, and reviewing the AI-generated summary.

---

## Scope

### 3.1 Toolchain & Setup
- Bundler: Vite
- Framework: Lit (web components, no heavy framework overhead)
- Styling: Tailwind CSS v4
- SDK: `livekit-client`
- Language: TypeScript

### 3.2 Application Shell
- Single-page app with a root component that swaps between three screen states:
  - `pre-session`
  - `live-session`
  - `post-session`
- State driven by session lifecycle callbacks (no router needed)

### 3.3 Screen 1 — Pre-Session
Purpose: collect job description and resume before starting the interview.

- Job Description field:
  - Toggle between textarea (paste) and file upload
  - File upload hidden if backend reports Tika is unavailable
- Resume field:
  - Same paste/upload toggle
- Submit button calls `POST /session` on the web service
- On success: store token, transition to live-session screen

### 3.4 Screen 2 — Live Session
Purpose: display interview status and handle real-time voice.

- Visual status indicator with four states:
  - `connecting` — spinner while establishing LiveKit connection
  - `listening` — mic active, waiting for candidate to speak
  - `agent-speaking` — AI interviewer is talking
  - `disconnected` — session ended or connection lost
- `LiveSession` class responsibilities:
  - Initialize `Room` from `livekit-client`
  - Enable microphone on join (`room.localParticipant.setMicrophoneEnabled(true)`)
  - Attach remote audio tracks for agent playback
  - Register text stream handler for `interview.summary` topic
  - Register text stream handler for `interview.status` topic
  - Listen to `RoomEvent.ActiveSpeakersChanged` to update the status indicator
  - On disconnect: transition to post-session screen with summary payload

### 3.5 Screen 3 — Post-Session
Purpose: display the structured feedback report.

- Render received Markdown summary using a lightweight Markdown renderer (e.g., `marked` or `@github/markdown`)
- Styled with Tailwind prose classes for readable typography
- "Start New Interview" button resets the app to pre-session state

### 3.6 LiveKit Client Integration Details
- Connect using token received from `POST /session`
- Room URL from `VITE_BACKEND_URL` env var (injected by Vite at build time)
- Handle `RoomEvent.Disconnected` gracefully (show post-session even if summary arrives before disconnect)
- Text streams arrive as async iterables — buffer chunks and render incrementally if desired

---

## Acceptance Criteria
- [ ] `pnpm run dev` starts Vite dev server without errors
- [ ] Pre-session form submits materials and receives a token from the web service
- [ ] Live-session screen connects to LiveKit and status indicator updates correctly
- [ ] Agent audio plays in the browser
- [ ] Microphone input is captured and transmitted
- [ ] Post-session screen renders the Markdown summary with correct formatting
- [ ] "Start New Interview" resets all state cleanly

---

## Dependencies
- `lit`
- `livekit-client`
- `tailwindcss`
- `vite`, `typescript`
- `marked` (or equivalent Markdown renderer)
- Module 1 web service running for token endpoint
- Module 2 agent running for voice interaction
