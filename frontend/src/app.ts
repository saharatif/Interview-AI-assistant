import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { marked } from 'marked';
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from 'livekit-client';

type Screen = 'pre-session' | 'live-session' | 'post-session';

type SessionRecord = {
  sessionId: string;
  token: string;
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? '';

@customElement('interview-app')
export class InterviewApp extends LitElement {
  override createRenderRoot() { return this; }

  @state() private screen: Screen = 'pre-session';
  @state() private status = 'connecting';
  @state() private jobDescription = '';
  @state() private resumeText = '';
  @state() private jobFile: File | null = null;
  @state() private resumeFile: File | null = null;
  @state() private jobUploadMode = false;
  @state() private resumeUploadMode = false;
  @state() private tikaAvailable = false;
  @state() private session: SessionRecord | null = null;
  @state() private summary = '';
  @state() private error = '';

  private room?: Room;

  override async connectedCallback() {
    super.connectedCallback();
    try {
      const resp = await fetch(`${BACKEND_URL}/health`);
      if (resp.ok) {
        const data = await resp.json() as { tikaAvailable: boolean };
        this.tikaAvailable = data.tikaAvailable ?? false;
      }
    } catch {
      // health check failure is non-fatal; file uploads just stay hidden
    }
  }

  override render() {
    return html`
      <main class="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
        <div class="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/30">
          <header class="mb-8">
            <h1 class="text-3xl font-semibold text-white">AI Interview Coach</h1>
            <p class="mt-2 text-slate-400">Paste or upload your job description and resume, then start a live mock interview.</p>
          </header>

          ${this.error ? html`<div class="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-rose-100">${this.error}</div>` : ''}

          ${this.screen === 'pre-session'
            ? this.renderPreSession()
            : this.screen === 'live-session'
            ? this.renderLiveSession()
            : this.renderPostSession()}
        </div>
      </main>
    `;
  }

  private renderField(opts: {
    label: string;
    placeholder: string;
    value: string;
    file: File | null;
    uploadMode: boolean;
    onText: (v: string) => void;
    onFile: (f: File | null) => void;
    onToggle: () => void;
  }) {
    return html`
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-slate-200">${opts.label}</label>
          <button
            type="button"
            class="text-xs text-sky-400 hover:text-sky-300 transition"
            @click=${opts.onToggle}
          >
            ${opts.uploadMode ? 'Switch to paste' : 'Upload file'}
          </button>
        </div>

        ${opts.uploadMode ? html`
          <div
            class="flex flex-col items-center justify-center w-full min-h-[160px] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-4 text-slate-400 cursor-pointer hover:border-sky-500 transition"
            @click=${() => (this.shadowRoot?.querySelector(`#input-${opts.label}`) as HTMLInputElement | null ?? this.querySelector(`#input-${opts.label}`) as HTMLInputElement | null)?.click()}
          >
            <input
              id="input-${opts.label}"
              type="file"
              accept=${this.tikaAvailable ? '.pdf,.docx,.md,.txt,text/plain' : '.md,.txt,text/plain'}
              class="hidden"
              @change=${(e: Event) => {
                const f = (e.target as HTMLInputElement).files?.[0] ?? null;
                opts.onFile(f);
              }}
            />
            ${opts.file ? html`
              <span class="text-sky-400 font-medium">${opts.file.name}</span>
              <span class="text-xs mt-1">${(opts.file.size / 1024).toFixed(1)} KB</span>
            ` : html`
              <span class="text-3xl mb-2">📄</span>
              <span class="text-sm">Click to choose a file</span>
              <span class="text-xs mt-1">${this.tikaAvailable ? 'PDF, DOCX, MD, TXT' : 'MD, TXT (PDF/DOCX requires Tika)'}</span>
            `}
          </div>
        ` : html`
          <textarea
            class="w-full min-h-[160px] rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-100 shadow-inner focus:border-sky-400 focus:outline-none resize-y"
            .value=${opts.value}
            @input=${(e: Event) => opts.onText((e.target as HTMLTextAreaElement).value)}
            placeholder=${opts.placeholder}
          ></textarea>
        `}
      </div>
    `;
  }

  private renderPreSession() {
    return html`
      <section class="space-y-6">
        <div class="grid gap-6 sm:grid-cols-2">
          ${this.renderField({
            label: 'Job description',
            placeholder: 'Paste job requirements here',
            value: this.jobDescription,
            file: this.jobFile,
            uploadMode: this.jobUploadMode,
            onText: (v) => { this.jobDescription = v; },
            onFile: (f) => { this.jobFile = f; },
            onToggle: () => { this.jobUploadMode = !this.jobUploadMode; this.jobFile = null; this.jobDescription = ''; },
          })}

          ${this.renderField({
            label: 'Resume',
            placeholder: 'Paste your resume here',
            value: this.resumeText,
            file: this.resumeFile,
            uploadMode: this.resumeUploadMode,
            onText: (v) => { this.resumeText = v; },
            onFile: (f) => { this.resumeFile = f; },
            onToggle: () => { this.resumeUploadMode = !this.resumeUploadMode; this.resumeFile = null; this.resumeText = ''; },
          })}
        </div>

        <div class="flex flex-wrap gap-4 items-center">
          <button
            class="rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            @click=${this.startSession}
          >
            Start interview
          </button>
        </div>
      </section>
    `;
  }

  private renderLiveSession() {
    return html`
      <section class="space-y-6">
        <div class="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm uppercase tracking-[0.25em] text-sky-300/80">Interview status</p>
              <h2 class="mt-2 text-2xl font-semibold text-white">${this.formatStatusLabel()}</h2>
            </div>
            <span class="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
              Session ${this.session?.sessionId ?? ''}
            </span>
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <h3 class="text-lg font-semibold text-white">Live interview</h3>
            <p class="mt-3 text-slate-400">Your microphone is active. The AI interviewer will speak through your speakers.</p>
          </div>
          <div class="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <h3 class="text-lg font-semibold text-white">How it works</h3>
            <ul class="mt-3 space-y-2 text-slate-400">
              <li>• Speak naturally — the agent waits for you to finish</li>
              <li>• Answer each question fully before pausing</li>
              <li>• The agent will end the interview and generate your summary</li>
            </ul>
          </div>
        </div>
      </section>
    `;
  }

  private renderPostSession() {
    return html`
      <section class="space-y-6">
        <div class="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <h2 class="text-3xl font-semibold text-white mb-4">Interview complete</h2>
          <div class="prose prose-invert max-w-none" .innerHTML=${marked.parse(this.summary || 'No summary received.')}></div>
        </div>

        <button
          class="rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
          @click=${this.reset}
        >
          Start New Interview
        </button>
      </section>
    `;
  }

  private formatStatusLabel() {
    switch (this.status) {
      case 'connecting': return 'Connecting...';
      case 'listening': return 'Listening';
      case 'agent-speaking': return 'Agent is speaking';
      case 'disconnected': return 'Disconnected';
      default: return 'Connecting...';
    }
  }

  private async startSession() {
    this.error = '';

    const hasJob = this.jobUploadMode ? !!this.jobFile : !!this.jobDescription.trim();
    const hasResume = this.resumeUploadMode ? !!this.resumeFile : !!this.resumeText.trim();

    if (!hasJob || !hasResume) {
      this.error = 'Both job description and resume are required.';
      return;
    }

    if (!LIVEKIT_URL) {
      this.error = 'VITE_LIVEKIT_URL is not configured.';
      return;
    }

    try {
      let resp: Response;

      // Use multipart when any file is present, JSON otherwise
      if (this.jobFile || this.resumeFile) {
        const form = new FormData();
        if (this.jobFile) {
          form.append('jobDescriptionFile', this.jobFile);
        } else {
          form.append('jobDescription', this.jobDescription);
        }
        if (this.resumeFile) {
          form.append('resumeFile', this.resumeFile);
        } else {
          form.append('resume', this.resumeText);
        }
        resp = await fetch(`${BACKEND_URL}/session`, { method: 'POST', body: form });
      } else {
        resp = await fetch(`${BACKEND_URL}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription: this.jobDescription, resume: this.resumeText }),
        });
      }

      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error((body as { error?: string })?.error || 'Failed to create session');
      }

      const data = await resp.json() as SessionRecord;
      this.session = data;
      this.screen = 'live-session';
      this.status = 'connecting';
      await this.connectRoom(data.token);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  private async connectRoom(token: string) {
    this.room = new Room();

    this.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          track.attach();
        }
      },
    );

    this.room.on(RoomEvent.Connected, () => { this.status = 'listening'; });

    this.room.on(RoomEvent.Disconnected, () => {
      this.status = 'disconnected';
      if (this.screen !== 'post-session') this.screen = 'post-session';
    });

    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      this.status = speakers.some((p) => !p.isLocal) ? 'agent-speaking' : 'listening';
    });

    this.room.registerTextStreamHandler('interview.summary', async (reader) => {
      for await (const chunk of reader) {
        this.summary += chunk;
      }
    });

    this.room.registerTextStreamHandler('interview.status', async (reader) => {
      for await (const chunk of reader) {
        if (chunk.trim() === 'completed') this.screen = 'post-session';
      }
    });

    try {
      await this.room.connect(LIVEKIT_URL, token);
      await this.room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      this.error = `LiveKit connect failed: ${err instanceof Error ? err.message : String(err)}`;
      this.screen = 'pre-session';
    }
  }

  private reset() {
    this.room?.disconnect();
    this.room = undefined;
    this.screen = 'pre-session';
    this.status = 'connecting';
    this.jobDescription = '';
    this.resumeText = '';
    this.jobFile = null;
    this.resumeFile = null;
    this.jobUploadMode = false;
    this.resumeUploadMode = false;
    this.summary = '';
    this.error = '';
    this.session = null;
  }
}
