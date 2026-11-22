export function readDatabaseFailure(error: unknown) {
  for (let cause = error, depth = 0; depth < 5 && cause && typeof cause === 'object'; depth++) {
    const failure = cause as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (typeof failure.code === 'string') {
      return {
        code: failure.code,
        constraint: typeof failure.constraint_name === 'string' ? failure.constraint_name : undefined,
      };
    }
    cause = failure.cause;
  }
  return { code: 'UNKNOWN', constraint: undefined };
}
