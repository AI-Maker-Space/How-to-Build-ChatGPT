import { NextResponse } from "next/server";
import { threadStore } from "@/lib/store";
import type { CreateThreadPayload } from "@/lib/types";

interface Params {
  params: {
    threadId: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  const thread = await threadStore.getThread(params.threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  return NextResponse.json(thread);
}

export async function PATCH(request: Request, { params }: Params) {
  const thread = await threadStore.getThread(params.threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<CreateThreadPayload> & { title?: string };

  const updated = {
    ...thread,
    title: body.title ?? thread.title,
    model: body.model ?? thread.model,
    connectorIds: body.connectorIds ?? thread.connectorIds,
    toolIds: body.toolIds ?? thread.toolIds,
    systemPrompt: body.systemPrompt ?? thread.systemPrompt,
  };

  await threadStore.updateThread(updated);
  const refreshed = await threadStore.getThread(params.threadId);
  return NextResponse.json(refreshed);
}

export async function DELETE(request: Request, { params }: Params) {
  await threadStore.deleteThread(params.threadId);
  return NextResponse.json({ ok: true });
}
