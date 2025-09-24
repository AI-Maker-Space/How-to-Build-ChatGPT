"use client";

import { useMemo } from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { ThreadSummary } from "@/lib/types";

interface ThreadSidebarProps {
  threads: ThreadSummary[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function ThreadSidebar({ threads, selectedId, onSelect, onCreate, onDelete }: ThreadSidebarProps) {
  const ordered = useMemo(
    () => [...threads].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [threads]
  );

  return (
    <aside className="flex h-full w-72 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-subtle transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>
      <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Conversations</div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
        {ordered.map((thread) => {
          const isActive = thread.id === selectedId;
          return (
            <div
              key={thread.id}
              className={clsx(
                "group mb-2 flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-3 py-2 transition",
                isActive ? "border-accent bg-emerald-50" : "hover:border-gray-200 hover:bg-gray-50"
              )}
              onClick={() => onSelect(thread.id)}
            >
              <div className={clsx("rounded-full bg-gray-100 p-2", isActive && "bg-emerald-100")}>
                <MessageSquare className={clsx("h-4 w-4", isActive ? "text-accent" : "text-gray-600")} />
              </div>
              <div className="flex-1 text-left">
                <div className="truncate text-sm font-medium text-gray-900">{thread.title || "New chat"}</div>
                <div className="overflow-hidden text-xs text-gray-500">
                  {thread.lastMessagePreview || "Start a conversation"}
                </div>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(thread.id);
                }}
                className="opacity-0 transition group-hover:opacity-100"
                aria-label={`Delete ${thread.title}`}
              >
                <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          );
        })}
        {!ordered.length && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            No conversations yet. Start one!
          </div>
        )}
      </div>
    </aside>
  );
}
