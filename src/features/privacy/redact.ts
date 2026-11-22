/**
 * Masks recognizable credentials, email addresses, and card numbers in incident text.
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

  // Mask passwords embedded in database connection strings.
  const dbUriRegex = /(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?):\/\/([^:/@\s]+):([^@/\s]+)@([^/\s]+)/gi;
  if (dbUriRegex.test(text)) {
    text = text.replace(dbUriRegex, (_match, proto, user, _pass, host) => {
      count++;
      types.add('Database Secret');
      return `${proto}://${user}:[REDACTED_SECRET]@${host}`;
    });
  }

  // JWT Tokens (eyJ...)
  const jwtRegex = /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g;
  if (jwtRegex.test(text)) {
    text = text.replace(jwtRegex, () => {
      count++;
      types.add('JWT Token');
      return '[REDACTED_JWT_TOKEN]';
    });
  }

  // Webhook URLs grant posting access to their destination.
  const webhookUrl = /https:\/\/(?:hooks\.slack\.com\/services\/|(?:[a-z0-9-]+\.)*webhook\.office\.com\/webhookb2\/)[^\s<>"']+/gi;
  text = text.replace(webhookUrl, () => {
    count++;
    types.add('Webhook Secret');
    return '[REDACTED_WEBHOOK_URL]';
  });

  // Recognizable provider credentials.
  const apiKeyRegex = /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|sk_(?:live|test)_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{35}|AQ\.[A-Za-z0-9_-]{25,}|npg_[A-Za-z0-9]{10,})(?![A-Za-z0-9_-])/g;
  if (apiKeyRegex.test(text)) {
    text = text.replace(apiKeyRegex, () => {
      count++;
      types.add('API Key');
      return '[REDACTED_API_KEY]';
    });
  }

  // Bearer authorization headers.
  const bearerRegex = /Bearer\s+([a-zA-Z0-9_\-\.]{20,})/gi;
  if (bearerRegex.test(text)) {
    text = text.replace(bearerRegex, () => {
      count++;
      types.add('Bearer Token');
      return 'Bearer [REDACTED_TOKEN]';
    });
  }

  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, () => {
    count++;
    types.add('Email Address');
    return '[REDACTED_EMAIL]';
  });

  // Mask card numbers written in common four-digit groups.
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
