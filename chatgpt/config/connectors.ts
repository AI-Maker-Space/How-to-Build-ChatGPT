import { ConnectorDefinition } from "@/lib/types";

const raw = process.env.OPENAI_CONNECTORS ?? "";

function parseConnectors(spec: string): ConnectorDefinition[] {
  if (!spec.trim()) return [];

  return spec
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, label, description] = entry.split("|").map((segment) => segment.trim());
      if (!id) {
        throw new Error(`Invalid connector entry: "${entry}". Expected format id|Label|Description`);
      }
      return {
        id,
        label: label || id,
        description: description || "Custom connector",
      } satisfies ConnectorDefinition;
    });
}

export const CONNECTORS: ConnectorDefinition[] = parseConnectors(raw);
