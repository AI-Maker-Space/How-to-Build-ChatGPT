import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { appendMessage, threadStore } from "@/lib/store";
import { getOpenAIToolDefinitions, resolveToolCalls } from "@/lib/tools";
import type { Message, MessageContentBlock, SendMessagePayload, Thread } from "@/lib/types";

interface Params {
  params: {
    threadId: string;
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function flattenContent(blocks: MessageContentBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "text") return block.text;
      if (block.type === "tool-call") {
        return `Tool call → ${block.toolName}: ${JSON.stringify(block.arguments)}`;
      }
      if (block.type === "tool-result") {
        return `Tool result ← ${block.toolName}: ${block.output}`;
      }
      if (block.type === "error") {
        return `Error: ${block.error}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function toResponseInput(thread: Thread) {
  return thread.messages.map((message) => ({
    role: message.role,
    content: [{ type: "text", text: flattenContent(message.content) }],
  }));
}

function buildAssistantMessageText(response: any): string {
  if (!response) return "";
  const output = Array.isArray(response.output) ? response.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (typeof block?.text === "string") {
        chunks.push(block.text);
      } else if (block?.type === "output_text" && typeof block?.text === "string") {
        chunks.push(block.text);
      }
    }
  }
  const aggregated = chunks.join("").trim();
  return aggregated;
}

function extractToolCalls(response: any) {
  const required = response?.required_action;
  if (!required || required.type !== "submit_tool_outputs") {
    return [] as Array<{
      id: string;
      type: string;
      function?: { name: string; arguments: string };
    }>;
  }
  return required.submit_tool_outputs?.tool_calls ?? [];
}

async function persistThread(thread: Thread) {
  await threadStore.updateThread(thread);
  // Avoid an empty microtask queue on Vercel edge runtime.
  await delay(0);
}

export async function POST(request: Request, { params }: Params) {
  const thread = await threadStore.getThread(params.threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const body = (await request.json()) as SendMessagePayload;
  if (!body?.message?.trim()) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }

  const model = body.model ?? thread.model ?? DEFAULT_MODEL;
  const connectorIds = body.connectorIds ?? thread.connectorIds;
  const toolIds = body.toolIds ?? thread.toolIds;
  const systemPrompt = body.systemPrompt ?? thread.systemPrompt;

  const timestamp = new Date().toISOString();
  const userMessage: Message = {
    id: randomUUID(),
    role: "user",
    createdAt: timestamp,
    content: [
      {
        type: "text",
        text: body.message.trim(),
      },
    ],
  };

  let workingThread = appendMessage(thread, userMessage);
  if (!thread.title || thread.title.toLowerCase().startsWith("new chat")) {
    workingThread = {
      ...workingThread,
      title: body.message.trim().slice(0, 60) || "New chat",
    };
  }
  await persistThread(workingThread);

  const baseInput = toResponseInput(workingThread);
  const openAiInput = systemPrompt
    ? [
        {
          role: "system",
          content: [{ type: "text", text: systemPrompt }],
        },
        ...baseInput,
      ]
    : baseInput;

  const connectorsPayload = connectorIds?.map((id) => ({ id })) ?? [];
  const toolsPayload = getOpenAIToolDefinitions(toolIds ?? []);

  let response = await openai.responses.create({
    model,
    input: openAiInput,
    connectors: connectorsPayload.length ? connectorsPayload : undefined,
    tools: toolsPayload.length ? toolsPayload : undefined,
  });

  const assistantMessages: Message[] = [];

  // Handle tool-call loops until the model produces a final message.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const toolCalls = extractToolCalls(response);
    if (toolCalls.length === 0) {
      break;
    }

    const toolCallMessages: Message[] = toolCalls.map((call) => {
      const args = call.function?.arguments ?? "{}";
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(args);
      } catch (error) {
        parsed = { error: `Failed to parse tool arguments: ${(error as Error).message}`, raw: args };
      }
      return {
        id: randomUUID(),
        role: "assistant",
        createdAt: new Date().toISOString(),
        content: [
          {
            type: "tool-call",
            toolCallId: call.id,
            toolName: call.function?.name ?? "function",
            arguments: parsed,
          },
        ],
      } satisfies Message;
    });

    for (const message of toolCallMessages) {
      workingThread = appendMessage(workingThread, message);
    }
    await persistThread(workingThread);

    const outputs = await resolveToolCalls(toolCalls);

    const toolResultMessages: Message[] = outputs.map((output) => {
      const toolCall = toolCalls.find((call) => call.id === output.tool_call_id);
      return {
        id: randomUUID(),
        role: "tool",
        createdAt: new Date().toISOString(),
        content: [
          {
            type: "tool-result",
            toolCallId: output.tool_call_id,
            toolName: toolCall?.function?.name ?? "tool",
            output: output.output,
          },
        ],
      } satisfies Message;
    });

    for (const message of toolResultMessages) {
      workingThread = appendMessage(workingThread, message);
    }
    await persistThread(workingThread);

    response = await openai.responses.submitToolOutputs(response.id, {
      tool_outputs: outputs,
    });
  }

  const assistantText = buildAssistantMessageText(response);
  const assistantMessage: Message = {
    id: randomUUID(),
    role: "assistant",
    createdAt: new Date().toISOString(),
    content: assistantText
      ? [
          {
            type: "text",
            text: assistantText,
          },
        ]
      : [
          {
            type: "error",
            error: "The model did not return any assistant content.",
          },
        ],
  };
  assistantMessages.push(assistantMessage);

  for (const message of assistantMessages) {
    workingThread = appendMessage(workingThread, message);
  }

  await persistThread(workingThread);

  const refreshed = await threadStore.getThread(params.threadId);

  return NextResponse.json({
    thread: refreshed,
    assistantMessage,
  });
}
