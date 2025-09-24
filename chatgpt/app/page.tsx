"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ThreadSidebar } from "@/components/ThreadSidebar";
import { MessageList } from "@/components/MessageList";
import { ChatComposer } from "@/components/ChatComposer";
import { ConversationControls } from "@/components/ConversationControls";
import { createThread, deleteThread, getConfig, getThread, listThreads, sendMessage, updateThread } from "@/lib/api";
import type { Thread, ThreadSummary } from "@/lib/types";

const STORAGE_KEY = "chatgpt:selectedThread";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: config } = useSWR("config", getConfig);
  const { data: threadSummaries = [], mutate: mutateSummaries } = useSWR<ThreadSummary[]>("threads", listThreads);
  const { data: activeThread, mutate: mutateActiveThread } = useSWR<Thread | undefined>(
    activeThreadId ? ["thread", activeThreadId] : null,
    ([, id]) => getThread(id)
  );

  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveThreadId(stored);
    }
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      window.localStorage.setItem(STORAGE_KEY, activeThreadId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThread) return;
    setSelectedModel(activeThread.model);
    setSelectedConnectorIds(activeThread.connectorIds ?? []);
    setSelectedToolIds(activeThread.toolIds ?? []);
    setSystemPrompt(activeThread.systemPrompt ?? "");
  }, [activeThread?.id]);

  const ensureThread = useCallback(async () => {
    if (activeThreadId) return activeThreadId;
    const model = selectedModel ?? config?.defaultModel;
    const newThread = await createThread({ model });
    await mutateSummaries();
    setActiveThreadId(newThread.id);
    setSelectedModel(newThread.model);
    setSelectedConnectorIds(newThread.connectorIds ?? []);
    setSelectedToolIds(newThread.toolIds ?? []);
    setSystemPrompt(newThread.systemPrompt ?? "");
    return newThread.id;
  }, [activeThreadId, config?.defaultModel, mutateSummaries, selectedModel]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      const threadId = await ensureThread();
      const payload = {
        message: input,
        model: selectedModel ?? config?.defaultModel,
        connectorIds: selectedConnectorIds,
        toolIds: selectedToolIds,
        systemPrompt: systemPrompt || undefined,
      };
      setInput("");
      const response = await sendMessage(threadId, payload);
      await mutateActiveThread(response.thread, false);
      await mutateSummaries();
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [config?.defaultModel, ensureThread, input, mutateActiveThread, mutateSummaries, selectedConnectorIds, selectedModel, selectedToolIds, systemPrompt]);

  const handleSelectThread = useCallback(
    async (threadId: string) => {
      setActiveThreadId(threadId);
    },
    []
  );

  const handleCreateThread = useCallback(async () => {
    const model = config?.defaultModel;
    const thread = await createThread({ model });
    await mutateSummaries();
    setActiveThreadId(thread.id);
    setInput("");
    setSelectedModel(model);
    setSelectedConnectorIds([]);
    setSelectedToolIds([]);
    setSystemPrompt("");
  }, [config?.defaultModel, mutateSummaries]);

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      await deleteThread(threadId);
      await mutateSummaries();
      if (activeThreadId === threadId) {
        const remaining = threadSummaries.filter((summary) => summary.id !== threadId);
        setActiveThreadId(remaining[0]?.id);
      }
    },
    [activeThreadId, mutateSummaries, threadSummaries]
  );

  const persistThreadMetadata = useCallback(
    async (updates: Partial<Thread>) => {
      const id = activeThreadId ?? (await ensureThread());
      if (!id) return;
      await updateThread(id, {
        title: updates.title,
        model: updates.model,
        connectorIds: updates.connectorIds,
        toolIds: updates.toolIds,
        systemPrompt: updates.systemPrompt,
      });
      await mutateSummaries();
      await mutateActiveThread();
    },
    [activeThreadId, ensureThread, mutateActiveThread, mutateSummaries]
  );

  const toggleConnector = useCallback(
    async (id: string) => {
      const next = selectedConnectorIds.includes(id)
        ? selectedConnectorIds.filter((connectorId) => connectorId !== id)
        : [...selectedConnectorIds, id];
      setSelectedConnectorIds(next);
      await persistThreadMetadata({ connectorIds: next });
    },
    [persistThreadMetadata, selectedConnectorIds]
  );

  const toggleTool = useCallback(
    async (id: string) => {
      const next = selectedToolIds.includes(id)
        ? selectedToolIds.filter((toolId) => toolId !== id)
        : [...selectedToolIds, id];
      setSelectedToolIds(next);
      await persistThreadMetadata({ toolIds: next });
    },
    [persistThreadMetadata, selectedToolIds]
  );

  const changeModel = useCallback(
    async (model: string) => {
      setSelectedModel(model);
      await persistThreadMetadata({ model });
    },
    [persistThreadMetadata]
  );

  const handleSystemPromptChange = useCallback((value: string) => {
    setSystemPrompt(value);
  }, []);

  const messages = useMemo(() => activeThread?.messages ?? [], [activeThread?.messages]);

  const currentTitle = useMemo(() => {
    if (!activeThread) return "New chat";
    if (activeThread.title && activeThread.title.trim()) {
      return activeThread.title;
    }
    const firstBlock = messages[0]?.content?.[0];
    if (firstBlock?.type === "text" && firstBlock.text) {
      return firstBlock.text.slice(0, 60);
    }
    return "New chat";
  }, [activeThread, messages]);

  useEffect(() => {
    if (!activeThreadId) return;
    const handler = setTimeout(() => {
      if (systemPrompt !== (activeThread?.systemPrompt ?? "")) {
        void persistThreadMetadata({ systemPrompt });
      }
    }, 600);
    return () => clearTimeout(handler);
  }, [activeThread?.systemPrompt, activeThreadId, persistThreadMetadata, systemPrompt]);

  return (
    <div className="flex h-screen w-full">
      <ThreadSidebar
        threads={threadSummaries}
        selectedId={activeThreadId}
        onSelect={handleSelectThread}
        onCreate={handleCreateThread}
        onDelete={handleDeleteThread}
      />
      <main className="flex h-full flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{currentTitle || "New chat"}</h1>
            <p className="text-sm text-gray-500">ChatGPT clone powered by the OpenAI Responses API.</p>
          </div>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        </header>

        <ConversationControls
          models={config?.models ?? []}
          connectors={config?.connectors ?? []}
          tools={config?.tools ?? []}
          selectedModel={selectedModel ?? config?.defaultModel ?? ""}
          onModelChange={changeModel}
          selectedConnectorIds={selectedConnectorIds}
          onToggleConnector={toggleConnector}
          selectedToolIds={selectedToolIds}
          onToggleTool={toggleTool}
          systemPrompt={systemPrompt}
          onSystemPromptChange={handleSystemPromptChange}
        />

        <MessageList messages={messages} isBusy={isSending} />

        <ChatComposer value={input} onChange={setInput} onSubmit={handleSend} isSending={isSending} />
      </main>
    </div>
  );
}
