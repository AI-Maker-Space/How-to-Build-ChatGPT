"use client";

import { KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
}

export function ChatComposer({ value, onChange, onSubmit, isSending }: ChatComposerProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 pb-6 pt-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <textarea
          value={value}
          onKeyDown={handleKeyDown}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Message ChatGPT"
          rows={3}
          className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner outline-none focus:border-accent focus:bg-white"
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={isSending || !value.trim()}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white shadow-subtle transition enabled:hover:bg-emerald-500 disabled:opacity-60"
          >
            {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
