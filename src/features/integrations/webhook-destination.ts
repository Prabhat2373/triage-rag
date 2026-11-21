export function validateWebhookUrl(input: string, type: string): URL {
  if (typeof input !== 'string' || input.length > 4096) {
    throw new Error('Enter a valid webhook URL.');
  }

  const url = new URL(input);
  const isSlack = type === 'slack' && url.hostname === 'hooks.slack.com'
    && /^\/services\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(url.pathname);
  const isTeams = type === 'teams' && url.hostname === 'outlook.office.com'
    && /^\/webhook(?:b2)?\/[A-Za-z0-9@/_-]+$/.test(url.pathname);
  const isPagerDuty = type === 'pagerduty' && url.hostname === 'events.pagerduty.com'
    && url.pathname === '/v2/enqueue';

  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash
    || !(isSlack || isTeams || isPagerDuty)) {
    throw new Error('Use an HTTPS webhook URL from the selected provider.');
  }

  return url;
}
