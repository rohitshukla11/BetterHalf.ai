export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  memoryId?: string;
  explorerUrl?: string;
  transactionHash?: string;
}
