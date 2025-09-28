import { MemoryService } from './memory-service';
import { MemoryType, AccessPolicy } from '@/types/memory';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export class ChatService {
  private memoryService: MemoryService;
  private readonly CHAT_SESSION_KEY = 'chat_session';
  private readonly CHAT_HISTORY_TYPE = 'conversation';

  constructor() {
    this.memoryService = new MemoryService();
  }

  async initialize(): Promise<void> {
    await this.memoryService.initialize();
    console.log('Chat service initialized');
  }

  /**
   * Save chat messages to local storage
   */
  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    try {
      console.log('💾 Saving chat messages to local storage...', messages.length, 'messages');
      
      if (messages.length === 0) {
        console.log('No messages to save');
        return;
      }

      // Create a memory entry for the chat session
      const chatContent = messages.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const memoryData = {
        content: chatContent,
        type: this.CHAT_HISTORY_TYPE as MemoryType,
        category: 'chat',
        tags: ['chat', 'conversation'],
        encrypted: true,
        accessPolicy: {
          owner: 'local-user',
          permissions: []
        } as AccessPolicy,
        metadata: {
          size: chatContent.length,
          checksum: '',
          version: 1,
          relatedMemories: []
        }
      };

      // Check if we have an existing chat memory to update
      const existingChatMemory = await this.getExistingChatMemory();
      
      if (existingChatMemory) {
        // Update existing chat memory
        await this.memoryService.updateMemory(existingChatMemory.id, {
          content: chatContent,
          updatedAt: new Date()
        });
        console.log('✅ Chat messages updated in local storage');
      } else {
        // Create new chat memory
        const memory = await this.memoryService.createMemory(memoryData);
        console.log('✅ Chat messages saved to local storage with ID:', memory.id);
      }

      // Update cache
      this.chatCache = messages;
      this.lastCacheTime = Date.now();
    } catch (error) {
      console.error('❌ Failed to save chat messages:', error);
      throw error;
    }
  }

  /**
   * Load chat messages from local storage with caching
   */
  private chatCache: ChatMessage[] | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  async loadChatMessages(useCache: boolean = true): Promise<ChatMessage[]> {
    try {
      // Return cached data if available and fresh
      if (useCache && this.chatCache && (Date.now() - this.lastCacheTime) < this.CACHE_DURATION) {
        console.log('💬 Using cached chat messages');
        return this.chatCache;
      }

      console.log('💬 Loading chat messages from local storage...');
      
      const existingChatMemory = await this.getExistingChatMemory();
      
      if (!existingChatMemory) {
        console.log('No existing chat history found');
        this.chatCache = [];
        this.lastCacheTime = Date.now();
        return [];
      }

      // Parse the chat content back into messages
      const chatContent = existingChatMemory.content;
      const messageLines = chatContent.split('\n').filter((line: string) => line.trim());
      
      const messages: ChatMessage[] = messageLines.map((line: string, index: number) => {
        const [role, ...contentParts] = line.split(': ');
        const content = contentParts.join(': ');
        
        return {
          id: uuidv4(),
          content: content || '',
          role: (role as 'user' | 'assistant') || 'user',
          timestamp: new Date()
        };
      });

      // Cache the results
      this.chatCache = messages;
      this.lastCacheTime = Date.now();

      console.log(`📚 Loaded ${messages.length} chat messages from local storage`);
      return messages;
    } catch (error) {
      console.error('❌ Failed to load chat messages:', error);
      return [];
    }
  }

  /**
   * Load recent chat messages only (for faster initial load)
   */
  async loadRecentChatMessages(limit: number = 20): Promise<ChatMessage[]> {
    try {
      const allMessages = await this.loadChatMessages();
      return allMessages.slice(-limit);
    } catch (error) {
      console.error('❌ Failed to load recent chat messages:', error);
      return [];
    }
  }

  /**
   * Invalidate chat cache
   */
  invalidateCache(): void {
    this.chatCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Get existing chat memory from storage
   */
  private async getExistingChatMemory(): Promise<any> {
    try {
      const allMemories = await this.memoryService.getAllMemories();
      return allMemories.find(memory => 
        memory.type === this.CHAT_HISTORY_TYPE && 
        memory.category === 'chat'
      );
    } catch (error) {
      console.error('❌ Failed to get existing chat memory:', error);
      return null;
    }
  }

  /**
   * Add a new message to chat and save to local storage
   */
  async addMessage(content: string, role: 'user' | 'assistant'): Promise<void> {
    try {
      const messages = await this.loadChatMessages();
      const newMessage: ChatMessage = {
        id: uuidv4(),
        content,
        role,
        timestamp: new Date()
      };
      
      messages.push(newMessage);
      
      // Save updated messages to local storage
      await this.saveChatMessages(messages);
    } catch (error) {
      console.error('❌ Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Clear chat history from local storage
   */
  async clearChatHistory(): Promise<void> {
    try {
      console.log('🗑️ Clearing chat history from local storage...');
      
      const existingChatMemory = await this.getExistingChatMemory();
      if (existingChatMemory) {
        await this.memoryService.deleteMemory(existingChatMemory.id);
        console.log('✅ Chat history cleared from local storage');
      } else {
        console.log('No chat history to clear');
      }
    } catch (error) {
      console.error('❌ Failed to clear chat history:', error);
      throw error;
    }
  }

  /**
   * Get chat statistics
   */
  async getChatStats(): Promise<any> {
    try {
      const messages = await this.loadChatMessages();
      const userMessages = messages.filter(msg => msg.role === 'user').length;
      const assistantMessages = messages.filter(msg => msg.role === 'assistant').length;
      
      return {
        totalMessages: messages.length,
        userMessages,
        assistantMessages,
        lastMessageTime: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
        storageType: 'local'
      };
    } catch (error) {
      console.error('❌ Failed to get chat stats:', error);
      return {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        lastMessageTime: null,
        storageType: 'local'
      };
    }
  }

  /**
   * Export chat history
   */
  async exportChatHistory(): Promise<string> {
    try {
      const messages = await this.loadChatMessages();
      return JSON.stringify(messages, null, 2);
    } catch (error) {
      console.error('❌ Failed to export chat history:', error);
      throw error;
    }
  }

  /**
   * Import chat history
   */
  async importChatHistory(chatData: string): Promise<void> {
    try {
      const messages: ChatMessage[] = JSON.parse(chatData);
      await this.saveChatMessages(messages);
      console.log(`✅ Imported ${messages.length} chat messages`);
    } catch (error) {
      console.error('❌ Failed to import chat history:', error);
      throw error;
    }
  }
}

// Factory function to create chat service
export function getChatService(): ChatService {
  return new ChatService();
}