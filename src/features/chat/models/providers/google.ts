import { createGoogle } from '@ai-sdk/google';

function googleApiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
}

export function isGoogleConfigured() {
  return Boolean(googleApiKey());
}

export function getGoogleProvider() {
  const apiKey = googleApiKey();
  if (!apiKey) throw new Error('Google Gemini is not configured.');
  return createGoogle({ apiKey });
}
