import { cli, ServerOptions, voice, Plugin, type JobContext, type JobProcess } from '@livekit/agents';
import { VAD } from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'url';
import { CoachAgent } from './coachAgent.js';
import { validateAgentEnv } from './env.js';

const BACKEND_URL = process.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

// Agent module — loaded by each worker process
export default {
  prewarm: async (proc: JobProcess) => {
    (proc.userData as Record<string, unknown>).vad = await VAD.load({
      minSilenceDuration: 0.5,
      activationThreshold: 0.5,
    });
  },

  entry: async (ctx: JobContext) => {
    validateAgentEnv(true);

    await ctx.connect();
    const participant = await ctx.waitForParticipant();

    let sessionId = '';
    try {
      const meta = JSON.parse(participant.metadata || '{}');
      sessionId = meta.sessionId ?? '';
    } catch {
      console.error('Failed to parse participant metadata');
    }

    if (!sessionId) {
      console.error('No sessionId in participant metadata — cannot fetch session context');
      ctx.shutdown('missing-session-id');
      return;
    }

    let jobDescription = '';
    let resumeText = '';
    try {
      const resp = await fetch(`${BACKEND_URL}/session/${sessionId}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as { jobDescription: string; resumeText: string };
      jobDescription = data.jobDescription;
      resumeText = data.resumeText;
    } catch (err) {
      console.error('Failed to fetch session context:', err);
      ctx.shutdown('session-fetch-failed');
      return;
    }

    const vad = (ctx.proc.userData as Record<string, unknown>).vad as VAD;
    const agent = new CoachAgent({ sessionId, backendUrl: BACKEND_URL, jobDescription, resumeText });
    const session = new voice.AgentSession({ vad });

    await session.start({ agent, room: ctx.room });
  },
};

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] ?? 'dev';

  if (cmd === 'download-files') {
    for (const plugin of Plugin.registeredPlugins) {
      plugin.downloadFiles();
    }
    process.exit(0);
  }

  cli.runApp(
    new ServerOptions({
      agent: fileURLToPath(import.meta.url),
      wsURL: process.env.LIVEKIT_URL,
      apiKey: process.env.LIVEKIT_API_KEY,
      apiSecret: process.env.LIVEKIT_API_SECRET,
      agentName: process.env.AGENT_NAME ?? 'interview-coach',
    }),
  );
}
