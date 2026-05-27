import { voice, llm } from '@livekit/agents';
import * as deepgramPlugin from '@livekit/agents-plugin-deepgram';
import * as openaiPlugin from '@livekit/agents-plugin-openai';
import OpenAI from 'openai';

export interface CoachAgentOptions {
  sessionId: string;
  backendUrl: string;
  jobDescription: string;
  resumeText: string;
}

function buildInstructions(jobDescription: string, resumeText: string): string {
  return `You are an experienced technical interviewer conducting a mock interview.

Job Description:
${jobDescription}

Candidate Resume:
${resumeText}

Guidelines:
- Ask one focused question at a time and wait for the candidate to finish speaking before responding.
- Start with a brief friendly introduction, then ask your first interview question.
- Tailor questions to the job description and the candidate's background.
- After 4–6 questions, provide brief encouraging feedback, then call the endInterview tool to wrap up.
- Keep your responses concise and conversational.`;
}

async function generateSummary(transcript: string, apiKey: string): Promise<string> {
  const client = new OpenAI({ apiKey });
  const prompt = `Given the following interview transcript, produce a structured Markdown report with these sections:

## Overall Impression
## Technical Strengths
## Areas for Improvement
## Recommended Follow-up Topics
## Suggested Next Steps

Transcript:
${transcript}`;

  const resp = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
  });

  return resp.choices[0]?.message?.content ?? '# Interview Summary\n\nSummary unavailable.';
}

function extractContent(content: llm.ChatContent[]): string {
  return content
    .map((c) => (typeof c === 'string' ? c : ''))
    .join(' ')
    .trim();
}

async function runEndInterview(
  sessionId: string,
  backendUrl: string,
  runCtx: voice.RunContext,
) {
  const localParticipant = runCtx.session._roomIO?.rtcRoom?.localParticipant;
  const apiKey = process.env.OPENAI_API_KEY ?? '';

  const transcript = runCtx.session.chatCtx.items
    .filter((item): item is llm.ChatMessage => item.type === 'message' && item.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${extractContent(m.content)}`)
    .join('\n');

  let summary = '# Interview Summary\n\nSummary unavailable.';
  try {
    summary = await generateSummary(transcript, apiKey);
  } catch (err) {
    console.error('Summary generation failed:', err);
  }

  if (localParticipant) {
    try {
      await localParticipant.sendText(summary, { topic: 'interview.summary' });
      await localParticipant.sendText('completed', { topic: 'interview.status' });
    } catch (err) {
      console.error('Failed to publish to LiveKit:', err);
    }
  }

  try {
    await fetch(`${backendUrl}/session/${sessionId}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Failed to delete session:', err);
  }
}

export class CoachAgent extends voice.Agent {
  constructor(opts: CoachAgentOptions) {
    super({
      instructions: buildInstructions(opts.jobDescription, opts.resumeText),
      stt: new deepgramPlugin.STT({ model: 'nova-3', endpointing: 1200 }),
      llm: new openaiPlugin.LLM({ model: 'gpt-4o', temperature: 0.7 }),
      tts: new openaiPlugin.TTS({ model: 'tts-1', voice: 'alloy' }),
      tools: {
        endInterview: llm.tool({
          description:
            'Call this when the interview is complete to generate a summary and end the session.',
          execute: async (_args, toolOpts) => {
            await runEndInterview(opts.sessionId, opts.backendUrl, toolOpts.ctx);
            return 'Interview ended. Thank you for participating!';
          },
        }),
      },
    });
  }
}
