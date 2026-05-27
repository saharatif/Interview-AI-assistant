import cors from 'cors';
import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { RoomAgentDispatch } from '@livekit/protocol';
import {
  createSession,
  deleteSession,
  getSession,
  startSessionCleanupInterval,
} from './sessionStore.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const AGENT_NAME = process.env.AGENT_NAME || 'interview-coach';
const TIKA_URL = process.env.TIKA_URL;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error('LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are required');
}

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function buildLiveKitToken(sessionId: string): Promise<string> {
  const identity = `candidate-${sessionId}`;

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    metadata: JSON.stringify({ sessionId }),
  });

  token.addGrant({
    room: sessionId,
    roomCreate: true,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return token.toJwt();
}

async function createRoomWithAgent(sessionId: string): Promise<void> {
  await roomService.createRoom({
    name: sessionId,
    agents: [
      new RoomAgentDispatch({
        agentName: AGENT_NAME,
        metadata: JSON.stringify({ sessionId }),
      }),
    ],
  });
}

async function extractTextFromTika(buffer: Buffer): Promise<string> {
  if (!TIKA_URL) {
    throw new Error('TIKA_URL is not set; binary extraction is unavailable');
  }

  const tikaEndpoint = `${TIKA_URL.replace(/\/+$/, '')}/tika`;
  const response = await fetch(tikaEndpoint, {
    method: 'PUT',
    body: new Uint8Array(buffer),
    headers: { Accept: 'text/plain' },
  });

  if (!response.ok) {
    throw new Error(`Tika extraction failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function resolveField(
  text: string,
  file: Express.Multer.File | undefined,
): Promise<string> {
  if (file && file.buffer.length > 0) {
    if (TIKA_URL) {
      return extractTextFromTika(file.buffer);
    }
    if (file.mimetype.startsWith('text/')) {
      return file.buffer.toString('utf8').trim();
    }
    throw new Error(
      'Binary file uploads require TIKA_URL to be configured. Use plaintext instead.',
    );
  }
  return text.trim();
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', tikaAvailable: Boolean(TIKA_URL) });
});

app.get('/session/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

app.delete('/session/:id', (req, res) => {
  const deleted = deleteSession(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.status(204).send();
});

app.post(
  '/session',
  upload.fields([
    { name: 'jobDescriptionFile', maxCount: 1 },
    { name: 'resumeFile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;

      const jobDescription = await resolveField(
        String(req.body.jobDescription || ''),
        files?.jobDescriptionFile?.[0],
      );
      const resumeText = await resolveField(
        String(req.body.resume || ''),
        files?.resumeFile?.[0],
      );

      if (!jobDescription) {
        return res.status(400).json({ error: 'jobDescription is required' });
      }
      if (!resumeText) {
        return res.status(400).json({ error: 'resume is required' });
      }

      const session = createSession(jobDescription, resumeText);
      await createRoomWithAgent(session.sessionId);
      const token = await buildLiveKitToken(session.sessionId);

      res.json({ sessionId: session.sessionId, token });
    } catch (error) {
      console.error('Failed to create session', error);
      res.status(500).json({ error: 'Unable to create session' });
    }
  },
);

startSessionCleanupInterval();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
