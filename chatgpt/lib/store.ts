import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import type { Message, Thread, ThreadSummary } from "@/lib/types";

const THREAD_KEY_PREFIX = "thread:";
const THREAD_INDEX_KEY = "thread:index";

interface ThreadStore {
  createThread(partial: Partial<Thread>): Promise<Thread>;
  getThread(id: string): Promise<Thread | null>;
  listThreads(): Promise<ThreadSummary[]>;
  updateThread(thread: Thread): Promise<void>;
  deleteThread(id: string): Promise<void>;
}

function now() {
  return new Date().toISOString();
}

function createSummary(thread: Thread): ThreadSummary {
  const lastMessage = thread.messages.at(-1);
  const preview = lastMessage?.content.find((block) => block.type === "text");
  return {
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    lastMessagePreview: preview && "text" in preview ? preview.text.slice(0, 140) : "",
  };
}

class RedisThreadStore implements ThreadStore {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async createThread(partial: Partial<Thread>): Promise<Thread> {
    const id = partial.id ?? randomUUID();
    const timestamp = now();
    const thread: Thread = {
      id,
      title: partial.title ?? "New Chat",
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: partial.messages ?? [],
      model: partial.model ?? "gpt-4.1-mini",
      connectorIds: partial.connectorIds ?? [],
      toolIds: partial.toolIds ?? [],
      systemPrompt: partial.systemPrompt,
    };

    await this.client.set(`${THREAD_KEY_PREFIX}${id}`, JSON.stringify(thread));
    await this.client.zadd(THREAD_INDEX_KEY, {
      score: Date.parse(thread.updatedAt),
      member: id,
    });

    return thread;
  }

  async getThread(id: string): Promise<Thread | null> {
    const payload = await this.client.get<string | null>(`${THREAD_KEY_PREFIX}${id}`);
    if (!payload) return null;
    return JSON.parse(payload) as Thread;
  }

  async listThreads(): Promise<ThreadSummary[]> {
    const ids = await this.client.zrevrange<string[]>(THREAD_INDEX_KEY, 0, -1);
    if (!ids.length) return [];

    const entries = await this.client.mget<string[]>(...ids.map((id) => `${THREAD_KEY_PREFIX}${id}`));
    return entries
      .map((item) => (item ? (JSON.parse(item) as Thread) : null))
      .filter((thread): thread is Thread => Boolean(thread))
      .map(createSummary)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async updateThread(thread: Thread): Promise<void> {
    const updated = { ...thread, updatedAt: now() } satisfies Thread;
    await this.client.set(`${THREAD_KEY_PREFIX}${updated.id}`, JSON.stringify(updated));
    await this.client.zadd(THREAD_INDEX_KEY, {
      score: Date.parse(updated.updatedAt),
      member: updated.id,
    });
  }

  async deleteThread(id: string): Promise<void> {
    await this.client.del(`${THREAD_KEY_PREFIX}${id}`);
    await this.client.zrem(THREAD_INDEX_KEY, id);
  }
}

class InMemoryThreadStore implements ThreadStore {
  private store = new Map<string, Thread>();

  async createThread(partial: Partial<Thread>): Promise<Thread> {
    const id = partial.id ?? randomUUID();
    const timestamp = now();
    const thread: Thread = {
      id,
      title: partial.title ?? "New Chat",
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: partial.messages ?? [],
      model: partial.model ?? "gpt-4.1-mini",
      connectorIds: partial.connectorIds ?? [],
      toolIds: partial.toolIds ?? [],
      systemPrompt: partial.systemPrompt,
    };
    this.store.set(id, thread);
    return thread;
  }

  async getThread(id: string): Promise<Thread | null> {
    return this.store.get(id) ?? null;
  }

  async listThreads(): Promise<ThreadSummary[]> {
    return Array.from(this.store.values())
      .map(createSummary)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async updateThread(thread: Thread): Promise<void> {
    const updated: Thread = { ...thread, updatedAt: now() };
    this.store.set(thread.id, updated);
  }

  async deleteThread(id: string): Promise<void> {
    this.store.delete(id);
  }
}

function initialiseStore(): ThreadStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const client = new Redis({ url, token });
    return new RedisThreadStore(client);
  }
  console.warn("UPSTASH_REDIS_* env vars not set. Falling back to ephemeral in-memory store.");
  return new InMemoryThreadStore();
}

export const threadStore: ThreadStore = initialiseStore();

export function appendMessage(thread: Thread, message: Message): Thread {
  return {
    ...thread,
    messages: [...thread.messages, message],
    updatedAt: now(),
  };
}
