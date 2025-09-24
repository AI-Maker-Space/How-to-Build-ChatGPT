import { NextResponse } from "next/server";
import { DEFAULT_MODEL } from "@/lib/openai";
import { threadStore } from "@/lib/store";
import type { CreateThreadPayload } from "@/lib/types";

export async function GET() {
  const threads = await threadStore.listThreads();
  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateThreadPayload | undefined;
    const thread = await threadStore.createThread({
      title: body?.title ?? "New chat",
      model: body?.model ?? DEFAULT_MODEL,
      connectorIds: body?.connectorIds ?? [],
      toolIds: body?.toolIds ?? [],
      systemPrompt: body?.systemPrompt,
    });
    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to create thread" },
      { status: 400 }
    );
  }
}
