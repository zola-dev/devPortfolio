export interface Chat {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    hidden?: boolean;
    streaming?: boolean;
  }
  
  export interface ChatMessage extends Chat {}
  
  export interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
  }

  export interface ChatApiResponse {
    success: boolean;
    reply: string;
    error?: string;
  }