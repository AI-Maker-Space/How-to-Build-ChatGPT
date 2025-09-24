"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import type { Message, MessageContentBlock } from "@/lib/types";

interface MessageListProps {
  messages: Message[];
  isBusy?: boolean;
}

const ROLE_LABEL: Record<Message["role"], string> = {
  system: "System",
  user: "You",
  assistant: "ChatGPT",
  tool: "Tool",
};

const ROLE_STYLES: Record<Message["role"], string> = {
  system: "bg-amber-50 border-amber-200",
  user: "bg-white border-gray-200",
  assistant: "bg-gray-50 border-gray-200",
  tool: "bg-blue-50 border-blue-200",
};

function renderBlock(block: MessageContentBlock) {
  switch (block.type) {
    case "text":
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className="prose prose-sm max-w-none text-gray-900"
        >
          {block.text}
        </ReactMarkdown>
      );
    case "tool-call":
      return (
        <div className="rounded-lg bg-white/60 p-3 text-sm text-gray-700 shadow-inner">
          <div className="font-medium text-gray-900">Tool call: {block.toolName}</div>
          <pre className="mt-1 overflow-auto rounded bg-gray-900/80 p-2 text-xs text-gray-100">
            {JSON.stringify(block.arguments, null, 2)}
          </pre>
        </div>
      );
    case "tool-result":
      return (
        <div className="rounded-lg bg-white p-3 text-sm text-gray-700 shadow-inner">
          <div className="font-medium text-gray-900">Tool result: {block.toolName}</div>
          <pre className="mt-1 overflow-auto rounded bg-gray-900/90 p-2 text-xs text-emerald-100">
            {block.output}
          </pre>
        </div>
      );
    case "error":
      return (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {block.error}
        </div>
      );
    default:
      return null;
  }
}

export function MessageList({ messages, isBusy }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isBusy]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f7f8] px-6 py-6 custom-scrollbar">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              "w-full rounded-2xl border px-5 py-4 shadow-sm",
              ROLE_STYLES[message.role]
            )}
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {ROLE_LABEL[message.role]}
            </div>
            <div className="flex flex-col gap-3">
              {message.content.map((block, index) => (
                <div key={index}>{renderBlock(block)}</div>
              ))}
            </div>
          </div>
        ))}
        {isBusy && (
          <div className="w-full max-w-3xl animate-pulse rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">
            ChatGPT is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
