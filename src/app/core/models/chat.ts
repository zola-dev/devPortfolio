export interface Chat {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  hidden?: boolean;
}

export type ChatRole = Chat['role'];

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

// Exhaustive-check helper using `never`
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

// Example of using `never` for exhaustive switch on ChatRole
export function chatRoleLabel(role: ChatRole): string {
  switch (role) {
    case 'user':
      return 'You';
    case 'assistant':
      return 'Assistant';
    case 'system':
      return 'System';
    default:
      return assertNever(role);
  }
}