export function isConversationalFollowUp(query: string) {
  const normalized = query.toLowerCase().trim().replace(/^(?:ok(?:ay)?|sure|right|got it)[,.!\s]+/, '');
  if (normalized.length > 260) return false;
  return /^(?:anything else|what else|any other (?:checks|steps|ideas|suggestions)|what (?:should|can) (?:i|we) (?:check|try|do) next|how (?:can|do|should) (?:i|we) (?:verify|confirm|test) (?:it|that|this)|(?:can you |could you )?(?:explain|elaborate|expand on) (?:it|that|this)|(?:what|why|how) (?:did|does|would|should|could) (?:it|that|this)\b)/.test(normalized);
}

export function replyToGreeting(query: string) {
  if (/^(?:hi|hello|hey)[!.\s]*$/i.test(query)) {
    return 'Hi! Tell me what you’re investigating. If you have an affected service, error message, or recent change, share it and I’ll look for related incidents.';
  }
  if (/^(?:thanks|thank you|got it|ok(?:ay)?)[!.\s]*$/i.test(query)) {
    return 'You’re welcome. If you want to keep investigating, ask what to check next or share what you’re seeing now.';
  }
  return undefined;
}
