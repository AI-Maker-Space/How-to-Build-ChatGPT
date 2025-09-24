import type {
  CreateThreadPayload,
  SendMessagePayload,
  Thread,
  ThreadSummary,
} from "@/lib/types";

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function getConfig() {
  return fetcher<{
    defaultModel: string;
    models: string[];
    connectors: Array<{ id: string; label: string; description?: string }>;
    tools: Array<{ id: string; label: string; description: string }>;
  }>("/api/config");
}

export async function createThread(payload?: CreateThreadPayload) {
  const res = await fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) {
    throw new Error(`Failed to create thread: ${res.statusText}`);
  }
  return (await res.json()) as Thread;
}

export async function listThreads() {
  const res = await fetch("/api/threads", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load threads: ${res.statusText}`);
  }
  const data = (await res.json()) as { threads: ThreadSummary[] };
  return data.threads;
}

export async function getThread(id: string) {
  return fetcher<Thread>(`/api/threads/${id}`);
}

export async function updateThread(id: string, payload: Partial<CreateThreadPayload> & { title?: string }) {
  const res = await fetch(`/api/threads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update thread: ${res.statusText}`);
  }
  return (await res.json()) as Thread;
}

export async function deleteThread(id: string) {
  const res = await fetch(`/api/threads/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete thread: ${res.statusText}`);
  }
}

export async function sendMessage(threadId: string, payload: SendMessagePayload) {
  const res = await fetch(`/api/threads/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    const msg = error?.error ?? `Failed to send message: ${res.statusText}`;
    throw new Error(msg);
  }
  return (await res.json()) as { thread: Thread; assistantMessage: Thread["messages"][number] };
}
