import { answerDemoChatRequest } from '@/features/demo/answer-request';

export async function POST(request: Request) {
  return answerDemoChatRequest(request);
}
