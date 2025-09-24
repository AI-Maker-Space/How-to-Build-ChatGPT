import { NextResponse } from "next/server";
import { CONNECTORS } from "@/config/connectors";
import { AVAILABLE_TOOL_METADATA } from "@/lib/tools";
import { DEFAULT_MODEL } from "@/lib/openai";

const AVAILABLE_MODELS = (process.env.OPENAI_MODELS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

export async function GET() {
  return NextResponse.json({
    defaultModel: DEFAULT_MODEL,
    models: AVAILABLE_MODELS.length ? AVAILABLE_MODELS : [DEFAULT_MODEL],
    connectors: CONNECTORS,
    tools: AVAILABLE_TOOL_METADATA,
  });
}
