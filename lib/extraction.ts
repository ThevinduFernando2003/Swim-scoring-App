import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ExtractionPayload, ResultStatus } from "./types.ts";

const EXTRACTION_PROMPT = `You extract swimming meet result sheets.

Return STRICT JSON only, no markdown, matching:
{
  "event_number": number | null,
  "event_name": string | null,
  "gender": "Men" | "Women" | null,
  "results": [
    {
      "position": number | null,
      "name": string,
      "team_code": string,
      "achievement": string,
      "status": "finished" | "DNS" | "DQ" | "DNF" | "NS" | "WD"
    }
  ]
}

Rules:
- team_code is the 3-letter university code (COL, SAB, KEL, MOR, SJP, UVA, RUH, PER, JAF, WAY, RAJ, VAU). Uppercase.
- achievement is the time (e.g. 02:08.03) or the non-finisher code.
- If the sheet shows DNS, DQ, DNF, NS, or WD, set status to that code and position to the printed place if any, otherwise null. These never score.
- Finished swimmers have status "finished".
- Include at least positions 1-6 finishers. Later places may be included.
- Do not invent rows. If a field is unreadable, use null / empty string.
- gender must be "Men" or "Women" when the sheet names it.`;

const extractionSchema = z.object({
  event_number: z.number().nullable().optional(),
  event_name: z.string().nullable().optional(),
  gender: z.enum(["Men", "Women"]).nullable().optional(),
  results: z
    .array(
      z.object({
        position: z.number().int().nullable().optional(),
        name: z.string().optional().default(""),
        team_code: z.string().optional().default(""),
        achievement: z.string().optional().default(""),
        status: z.string().optional().default("finished"),
      }),
    )
    .default([]),
});

function normalizeStatus(value: string): ResultStatus {
  const upper = value.trim().toUpperCase();
  if (upper === "FINISHED" || upper === "" || upper === "OK") return "finished";
  if (upper === "DNS" || upper === "DQ" || upper === "DNF" || upper === "NS" || upper === "WD") {
    return upper;
  }
  return "finished";
}

export function parseExtractionJson(raw: string): ExtractionPayload {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = extractionSchema.parse(JSON.parse(trimmed));
  return {
    event_number: parsed.event_number ?? null,
    event_name: parsed.event_name ?? null,
    gender: parsed.gender ?? null,
    results: parsed.results.map((row) => ({
      position: row.position ?? null,
      name: row.name.trim(),
      team_code: row.team_code.trim().toUpperCase(),
      achievement: row.achievement.trim(),
      status: normalizeStatus(row.status),
    })),
  };
}

function payloadFromParsed(parsed: z.infer<typeof extractionSchema>): ExtractionPayload {
  return {
    event_number: parsed.event_number ?? null,
    event_name: parsed.event_name ?? null,
    gender: parsed.gender ?? null,
    results: parsed.results.map((row) => ({
      position: row.position ?? null,
      name: row.name.trim(),
      team_code: row.team_code.trim().toUpperCase(),
      achievement: row.achievement.trim(),
      status: normalizeStatus(row.status),
    })),
  };
}

function looksLikeOpenAiKey(key: string) {
  return key.startsWith("sk-proj-") || key.startsWith("sk-svcacct-");
}

async function extractWithAnthropic(apiKey: string, pdfBytes: Buffer) {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
  const response = await client.messages.parse({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(extractionSchema),
    },
  });

  if (response.parsed_output) {
    return payloadFromParsed(extractionSchema.parse(response.parsed_output));
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parseExtractionJson(text);
}

async function extractWithOpenAi(apiKey: string, pdfBytes: Buffer) {
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: "result-sheet.pdf",
                file_data: `data:application/pdf;base64,${pdfBytes.toString("base64")}`,
              },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  });

  const json = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!response.ok) {
    throw new Error(
      json.error?.message ||
        `OpenAI request failed (${response.status}). Check OPENAI_API_KEY.`,
    );
  }

  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenAI returned an empty extraction");
  }
  return parseExtractionJson(text);
}

export async function extractResultsFromPdf(pdfBytes: Buffer) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (anthropicKey && !looksLikeOpenAiKey(anthropicKey)) {
    return extractWithAnthropic(anthropicKey, pdfBytes);
  }

  const key = openAiKey || (anthropicKey && looksLikeOpenAiKey(anthropicKey) ? anthropicKey : "");
  if (key) {
    return extractWithOpenAi(key, pdfBytes);
  }

  throw new Error(
    "Set OPENAI_API_KEY (or a real ANTHROPIC_API_KEY) to extract result PDFs.",
  );
}
