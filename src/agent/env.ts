export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return v;
}

export function optionalEnv(name: string) {
  return process.env[name] ?? '';
}

export function validateAgentEnv(requireLivekit = false) {
  // Always allow running in pure-dev without LiveKit credentials
  if (requireLivekit) {
    requireEnv('LIVEKIT_URL');
    requireEnv('LIVEKIT_API_KEY');
    requireEnv('LIVEKIT_API_SECRET');
  }

  // Agent name should be present
  requireEnv('AGENT_NAME');
}
