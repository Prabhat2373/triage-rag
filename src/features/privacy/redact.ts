/**
 * Enterprise PII & Secret Redaction Pipeline
 * Masks API keys, tokens, credentials, connection strings, emails, and sensitive IDs.
 */

export interface SanitizeResult {
  sanitized: string;
  redactedCount: number;
  redactedTypes: string[];
}

export function sanitizeText(input: string): SanitizeResult {
  if (!input) return { sanitized: '', redactedCount: 0, redactedTypes: [] };

  let text = input;
  let count = 0;
  const types = new Set<string>();

  // 1. JWT Tokens (eyJ...)
  const jwtRegex = /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g;
  if (jwtRegex.test(text)) {
    text = text.replace(jwtRegex, () => {
      count++;
      types.add('JWT Token');
      return '[REDACTED_JWT_TOKEN]';
    });
  }

  // 2. Stripe / OpenAI / GitHub / AWS API Keys
  const apiKeyRegex = /\b(sk_live_[a-zA-Z0-9]{20,}|sk_test_[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z-_]{35})\b/g;
  if (apiKeyRegex.test(text)) {
    text = text.replace(apiKeyRegex, () => {
      count++;
      types.add('API Key');
      return '[REDACTED_API_KEY]';
    });
  }

  // 3. Bearer Authorization Headers
  const bearerRegex = /Bearer\s+([a-zA-Z0-9_\-\.]{20,})/gi;
  if (bearerRegex.test(text)) {
    text = text.replace(bearerRegex, () => {
      count++;
      types.add('Bearer Token');
      return 'Bearer [REDACTED_TOKEN]';
    });
  }

  // 4. Database Connection Strings with Passwords
  const dbUriRegex = /(postgres|postgresql|mysql|mongodb|redis):\/\/([^:]+):([^@]+)@([^\/\s]+)/gi;
  if (dbUriRegex.test(text)) {
    text = text.replace(dbUriRegex, (_match, proto, user, _pass, host) => {
      count++;
      types.add('Database Secret');
      return `${proto}://${user}:[REDACTED_SECRET]@${host}`;
    });
  }

  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, () => {
    count++;
    types.add('Email Address');
    return '[REDACTED_EMAIL]';
  });

  // 5. Credit Cards (Luhn candidate strings 13-19 digits)
  const ccRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  if (ccRegex.test(text)) {
    text = text.replace(ccRegex, () => {
      count++;
      types.add('Credit Card');
      return '[REDACTED_CREDIT_CARD]';
    });
  }

  return {
    sanitized: text,
    redactedCount: count,
    redactedTypes: Array.from(types),
  };
}

export function detectPromptInjection(input: string): { isSuspicious: boolean; reason?: string } {
  if (!input) return { isSuspicious: false };
  const lower = input.toLowerCase();

  const injectionPatterns = [
    'ignore all previous instructions',
    'ignore previous rules',
    'system prompt override',
    'bypass security',
    'print all internal tickets',
    'dump database',
    'drop table',
  ];

  for (const pattern of injectionPatterns) {
    if (lower.includes(pattern)) {
      return {
        isSuspicious: true,
        reason: `Potential prompt manipulation or jailbreak detected: "${pattern}"`,
      };
    }
  }

  return { isSuspicious: false };
}
