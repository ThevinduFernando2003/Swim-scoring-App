import Anthropic from "@anthropic-ai/sdk";
import type {
  EventType,
  Gender,
  ImportedEvent,
  ImportedSwimmer,
  ImportedTeam,
} from "./types.ts";
import { GENDERS } from "./types.ts";

function looksLikeOpenAiKey(key: string) {
  return key.startsWith("sk-proj-") || key.startsWith("sk-svcacct-");
}

async function extractWithAnthropic(apiKey: string, pdfBytes: Buffer, prompt: string) {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
  const response = await client.messages.create({
    model,
    max_tokens: 8192,
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
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

async function extractWithOpenAi(apiKey: string, pdfBytes: Buffer, prompt: string) {
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
                filename: "import.pdf",
                file_data: `data:application/pdf;base64,${pdfBytes.toString("base64")}`,
              },
            },
            { type: "text", text: prompt },
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
  if (!text) throw new Error("OpenAI returned an empty extraction");
  return text;
}

export async function extractJsonFromPdf(pdfBytes: Buffer, prompt: string): Promise<unknown> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  let raw: string;
  if (anthropicKey && !looksLikeOpenAiKey(anthropicKey)) {
    raw = await extractWithAnthropic(anthropicKey, pdfBytes, prompt);
  } else {
    const key = openAiKey || (anthropicKey && looksLikeOpenAiKey(anthropicKey) ? anthropicKey : "");
    if (!key) {
      throw new Error(
        "Set OPENAI_API_KEY (or a real ANTHROPIC_API_KEY) to extract PDFs.",
      );
    }
    raw = await extractWithOpenAi(key, pdfBytes, prompt);
  }
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

const TEAMS_PROMPT = `Extract every team, school, university, or club from this swimming meet document.

Return STRICT JSON only:
{ "teams": [ { "code": "COL", "name": "University of Colombo" } ] }

Rules:
- code is the short official abbreviation (2–6 letters), uppercase.
- name is the full organisation name.
- Do not invent rows. Skip headers and totals.
- If a code is missing, make a short code from the name (first letters), uppercase.`;

const ROSTER_PROMPT = `Extract every swimmer / athlete entry from this registration or entry list.

Return STRICT JSON only:
{
  "swimmers": [
    {
      "name": "C. D. Ampavila",
      "team_code": "COL",
      "gender": "Men",
      "age": 21,
      "age_group": "Open",
      "slasu_number": ""
    }
  ]
}

Rules:
- team_code is the short team/school/university code, uppercase.
- age is a number if printed, otherwise null.
- age_group is the printed category (U15, U17, Open) or null.
- slasu_number is a federation / SLASU / registration number if printed, else "".
- gender is Men, Women, Boys, Girls, or Mixed when stated.
- Do not invent people.`;

const SCHEDULE_PROMPT = `Extract the full swimming meet programme / schedule of events.

Return STRICT JSON only:
{
  "events": [
    {
      "day": 1,
      "event_number": 5,
      "name": "200m Freestyle",
      "gender": "Men",
      "event_type": "individual"
    }
  ]
}

Rules:
- day is 1, 2, 3… (use 1 if the sheet is a single-day meet).
- event_number is the printed event number.
- gender must be Men, Women, Boys, Girls, or Mixed.
- event_type is "relay" if the name contains Relay, otherwise "individual".
- Include every event. Do not invent events.`;

export function parseImportedTeams(raw: unknown): ImportedTeam[] {
  const teams = (raw as { teams?: unknown[] })?.teams;
  if (!Array.isArray(teams)) return [];
  const seen = new Set<string>();
  const out: ImportedTeam[] = [];
  for (const row of teams) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const code = String(item.code ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    const name = String(item.name ?? "").trim();
    if (!code || !name || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name });
  }
  return out;
}

function asGender(value: unknown): Gender | null {
  const text = String(value ?? "").trim();
  return (GENDERS as string[]).includes(text) ? (text as Gender) : null;
}

export function parseImportedSwimmers(raw: unknown): ImportedSwimmer[] {
  const rows = (raw as { swimmers?: unknown[] })?.swimmers;
  if (!Array.isArray(rows)) return [];
  const out: ImportedSwimmer[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const name = String(item.name ?? "").trim();
    const team_code = String(item.team_code ?? "").trim().toUpperCase();
    if (!name || !team_code) continue;
    const ageNum = Number(item.age);
    out.push({
      name,
      team_code,
      gender: asGender(item.gender),
      age: Number.isFinite(ageNum) && ageNum > 0 ? ageNum : null,
      age_group: String(item.age_group ?? "").trim() || null,
      slasu_number: String(item.slasu_number ?? "").trim() || null,
    });
  }
  return out;
}

export function parseImportedEvents(raw: unknown): ImportedEvent[] {
  const rows = (raw as { events?: unknown[] })?.events;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const name = String(item.name ?? "").trim();
      const event_number = Number(item.event_number);
      if (!name || !Number.isFinite(event_number) || event_number < 1) return null;
      const gender = asGender(item.gender) ?? "Mixed";
      const typeRaw = String(item.event_type ?? "").toLowerCase();
      const event_type: EventType =
        typeRaw === "relay" || /relay/i.test(name) ? "relay" : "individual";
      const day = Number(item.day);
      return {
        day: Number.isFinite(day) && day > 0 ? day : 1,
        event_number,
        name,
        gender,
        event_type,
      } satisfies ImportedEvent;
    })
    .filter((row): row is ImportedEvent => row !== null);
}

export async function extractTeamsFromPdf(pdfBytes: Buffer) {
  return parseImportedTeams(await extractJsonFromPdf(pdfBytes, TEAMS_PROMPT));
}

export async function extractRosterFromPdf(pdfBytes: Buffer) {
  return parseImportedSwimmers(await extractJsonFromPdf(pdfBytes, ROSTER_PROMPT));
}

export async function extractScheduleFromPdf(pdfBytes: Buffer) {
  return parseImportedEvents(await extractJsonFromPdf(pdfBytes, SCHEDULE_PROMPT));
}
