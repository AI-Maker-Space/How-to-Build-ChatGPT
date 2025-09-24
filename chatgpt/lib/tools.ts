import fs from "fs/promises";
import path from "path";
import type { ToolMetaDefinition } from "@/lib/types";

interface ToolCall {
  id: string;
  type: string;
  function?: {
    name: string;
    arguments: string;
  };
}

interface ToolDefinition {
  id: string;
  label: string;
  description: string;
  openAITool: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  handler: (args: Record<string, unknown>) => Promise<string> | string;
}

async function readCompanyFaq() {
  const filePath = path.join(process.cwd(), "data", "company_faq.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as Array<{ topic: string; answer: string }>;
}

const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  time: {
    id: "time",
    label: "Current Time",
    description: "Expose the current timestamp for scheduling and reminders.",
    openAITool: {
      type: "function",
      function: {
        name: "get_current_time",
        description: "Get the current time in ISO 8601 format. Optionally convert to a provided IANA timezone name.",
        parameters: {
          type: "object",
          properties: {
            timezone: {
              type: "string",
              description: "An optional IANA timezone identifier (e.g. America/Los_Angeles).",
            },
          },
        },
      },
    },
    handler: (args) => {
      const tz = typeof args.timezone === "string" && args.timezone.trim() ? args.timezone.trim() : undefined;
      const now = new Date();
      if (!tz) {
        return now.toISOString();
      }
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          dateStyle: "full",
          timeStyle: "long",
        });
        return formatter.format(now);
      } catch (error) {
        return `Invalid timezone '${tz}'. Falling back to ISO time: ${now.toISOString()}`;
      }
    },
  },
  company_faq: {
    id: "company_faq",
    label: "Company FAQ",
    description: "Answer questions from a curated company handbook.",
    openAITool: {
      type: "function",
      function: {
        name: "lookup_company_faq",
        description: "Look up internal FAQ answers by topic keyword.",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Primary topic or keyword to search for (e.g. mission, pricing, events).",
            },
          },
          required: ["topic"],
        },
      },
    },
    handler: async (args) => {
      const topic = typeof args.topic === "string" ? args.topic.toLowerCase().trim() : "";
      if (!topic) {
        return "No topic provided. Please supply a topic string.";
      }
      const faqEntries = await readCompanyFaq();
      const directHit = faqEntries.find((entry) => entry.topic.toLowerCase() === topic);
      if (directHit) {
        return directHit.answer;
      }
      const related = faqEntries.filter((entry) => entry.topic.toLowerCase().includes(topic));
      if (related.length) {
        return related.map((entry) => `• ${entry.topic}: ${entry.answer}`).join("\n");
      }
      return `No FAQ entries found for '${topic}'.`;
    },
  },
};

export const AVAILABLE_TOOL_METADATA: ToolMetaDefinition[] = Object.values(TOOL_REGISTRY).map(
  ({ id, label, description }) => ({ id, label, description })
);

export function getOpenAIToolDefinitions(selected: string[]) {
  return selected
    .map((toolId) => TOOL_REGISTRY[toolId])
    .filter(Boolean)
    .map((tool) => tool.openAITool);
}

export async function resolveToolCalls(toolCalls: ToolCall[]) {
  const outputs = [] as Array<{ tool_call_id: string; output: string }>;

  for (const call of toolCalls) {
    if (call.type !== "function" || !call.function) {
      continue;
    }
    const { name, arguments: argsJson } = call.function;
    const tool = Object.values(TOOL_REGISTRY).find((entry) => entry.openAITool.function.name === name);
    if (!tool) {
      outputs.push({
        tool_call_id: call.id,
        output: `Tool '${name}' is not implemented on the server.`,
      });
      continue;
    }

    try {
      const args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
      const result = await tool.handler(args);
      outputs.push({
        tool_call_id: call.id,
        output: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      });
    } catch (error) {
      outputs.push({
        tool_call_id: call.id,
        output: `Tool execution failed: ${(error as Error).message}`,
      });
    }
  }

  return outputs;
}
