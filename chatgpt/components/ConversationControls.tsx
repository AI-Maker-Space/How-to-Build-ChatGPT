"use client";

import clsx from "clsx";
import type { ConnectorDefinition, ToolMetaDefinition } from "@/lib/types";

interface ConversationControlsProps {
  models: string[];
  connectors: ConnectorDefinition[];
  tools: ToolMetaDefinition[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedConnectorIds: string[];
  onToggleConnector: (id: string) => void;
  selectedToolIds: string[];
  onToggleTool: (id: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
}

export function ConversationControls({
  models,
  connectors,
  tools,
  selectedModel,
  onModelChange,
  selectedConnectorIds,
  onToggleConnector,
  selectedToolIds,
  onToggleTool,
  systemPrompt,
  onSystemPromptChange,
}: ConversationControlsProps) {
  return (
    <div className="border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-gray-500">Model</span>
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <button
                key={model}
                onClick={() => onModelChange(model)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  selectedModel === model
                    ? "border-accent bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                )}
              >
                {model}
              </button>
            ))}
          </div>
        </div>

        {connectors.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">Connectors</span>
            <div className="flex flex-wrap gap-2">
              {connectors.map((connector) => {
                const active = selectedConnectorIds.includes(connector.id);
                return (
                  <button
                    key={connector.id}
                    onClick={() => onToggleConnector(connector.id)}
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs transition",
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                    )}
                    title={connector.description}
                  >
                    {connector.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tools.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">Tools</span>
            <div className="flex flex-wrap gap-2">
              {tools.map((tool) => {
                const active = selectedToolIds.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => onToggleTool(tool.id)}
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs transition",
                      active
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                    )}
                    title={tool.description}
                  >
                    {tool.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">System Prompt</span>
          <textarea
            value={systemPrompt}
            onChange={(event) => onSystemPromptChange(event.target.value)}
            placeholder="Set optional instructions for the assistant"
            rows={2}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-inner focus:border-accent focus:bg-white"
          />
        </div>
      </div>
    </div>
  );
}
