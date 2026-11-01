export type ChatRole = 'user' | 'assistant' | 'system' | 'progress';

export interface ChatMessageModel {
  id: string;
  role: ChatRole;
  content: string;
  progress?: number;
  createdAt: string;
}
