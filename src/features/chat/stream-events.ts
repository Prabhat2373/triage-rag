import type { ChatStreamEvent } from './types';

export function chatStreamResponse(events: AsyncGenerator<ChatStreamEvent>, abort: () => void) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await events.next();
      if (next.done) {
        controller.close();
      } else {
        controller.enqueue(encoder.encode(JSON.stringify(next.value) + '\n'));
      }
    },
    async cancel() {
      abort();
      await events.return(undefined);
    },
  }), {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function* readChatEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const lines = (pending + decoder.decode(value, { stream: true })).split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (line) yield JSON.parse(line) as ChatStreamEvent;
      }
    }

    pending += decoder.decode();
    if (pending.trim()) throw new Error('The chat stream ended before the final event.');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
