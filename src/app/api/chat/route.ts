import { answerChatRequest } from '@/features/chat/answer-request';

export async function POST(request: Request) {
  return answerChatRequest(request);
}
