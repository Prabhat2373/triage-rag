import { isDemoMode } from '@/features/demo/config';
import { answerDemoChatRequest } from '@/features/demo/answer-request';
import { answerChatRequest } from '@/features/chat/answer-request';

export async function POST(request: Request) {
  return isDemoMode() ? answerDemoChatRequest(request) : answerChatRequest(request);
}
