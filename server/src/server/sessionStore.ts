import { randomUUID } from 'crypto';

export interface SessionRecord {
  sessionId: string;
  jobDescription: string;
  resumeText: string;
  createdAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map<string, SessionRecord>();

export function createSession(jobDescription: string, resumeText: string): SessionRecord {
  const sessionId = randomUUID();
  const record: SessionRecord = {
    sessionId,
    jobDescription,
    resumeText,
    createdAt: Date.now(),
  };
  sessions.set(sessionId, record);
  return record;
}

export function getSession(sessionId: string): SessionRecord | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [id, record] of sessions.entries()) {
    if (now - record.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

export function startSessionCleanupInterval(intervalMs = 5 * 60 * 1000): NodeJS.Timer {
  return setInterval(cleanupExpiredSessions, intervalMs);
}
