export type Role = "system" | "user" | "assistant" | "tool";

export type MessageContentBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      arguments: Record<string, unknown>;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      output: string;
    }
  | {
      type: "error";
      error: string;
    };

export interface Message {
  id: string;
  role: Role;
  content: MessageContentBlock[];
  createdAt: string;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  model: string;
  connectorIds: string[];
  toolIds: string[];
  systemPrompt?: string;
}

export interface ThreadSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
}

export interface CreateThreadPayload {
  title?: string;
  model?: string;
  connectorIds?: string[];
  toolIds?: string[];
  systemPrompt?: string;
}

export interface SendMessagePayload {
  message: string;
  model?: string;
  connectorIds?: string[];
  toolIds?: string[];
  systemPrompt?: string;
}

export interface ConnectorDefinition {
  id: string;
  label: string;
  description?: string;
}

export interface ToolMetaDefinition {
  id: string;
  label: string;
  description: string;
}
