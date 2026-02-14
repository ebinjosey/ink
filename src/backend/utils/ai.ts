import OpenAI from 'openai';

const MODEL = 'gpt-4o-mini';
const MAX_OUTPUT_TOKENS = 350;
const TEMPERATURE = 0.6;
const FUTURE_YOU_MAX_OUTPUT_TOKENS = 400;
const FUTURE_YOU_TEMPERATURE = 0.7;

const SYSTEM_MESSAGE =
  'You are Ink, a supportive journaling insights assistant. Produce accurate, non-judgmental weekly insights based only on the provided last-7-days data. If written text is limited, explicitly say insights are mostly based on mood tags/patterns and begin howYouFelt with “Based on a small number of recent entries…”. Never invent specific events. Output ONLY valid JSON with the required schema. Keep it concise and actionable.';

const USER_MESSAGE_TEMPLATE = `DATA:
- Date range: {windowStartISO} to {windowEndISO}
- Entries count (7 days): {entryCount}
- Mood distribution: {moodDistributionJson}
- Most written: {mostWritten}
- Recent entries (trimmed): {recentEntriesBullets}
- Notes: If journal text is limited, still produce insights using moodDistribution + patterns, and clearly state that limitation.

TASK:
Return ONLY valid JSON in this schema (no markdown, no extra text):
{
  "howYouFelt": string,
  "weeklySummary": string,
  "moodDrivers": string[],
  "patterns": string[],
  "confidence": number
}

STYLE RULES:
- howYouFelt: 2–5 supportive sentences, grounded in data
- weeklySummary: 1–2 sentences
- moodDrivers/patterns: 2–5 short items each
- confidence: 0 to 1 (float)
- Never include medical advice. Encourage gentle self-reflection.
- Do not mention the model name or API.`;

const FUTURE_YOU_SYSTEM_MESSAGE =
  'You are writing a personal reflection as the user, six months in the future, speaking to their present self. Keep it casual, human, and reflective. No therapy language, no clinical framing, no motivational advice, no "you should" phrasing. Avoid em dashes. The output must be plain text only.';

const FUTURE_YOU_USER_TEMPLATE = `DATA:
- Entries count (last {days} days): {entryCount}
- Mood distribution: {moodDistributionJson}
- Summary of recent notes (trimmed): {entriesSummary}
- Note: {limitedDataNote}

TASK:
Write 1–2 short paragraphs in second person, from the user speaking to themselves from six months in the future.
The reflection should directly reference recent mood patterns and themes from the data (stress, sadness, work pressure, overthinking, etc.) without inventing specifics.
It should feel like recognition, not instruction, and avoid generic encouragement.
No headings, labels, bullet points, or markdown.

Return ONLY valid JSON:
{
  "futureYou": string
}`;

export interface OpenAIInsightInput {
  windowStartISO: string;
  windowEndISO: string;
  entryCount: number;
  moodDistributionJson: string;
  mostWritten: string;
  recentEntriesBullets: string;
  limitedDataNote?: string;
}

export interface OpenAIFutureYouInput {
  days: number;
  entryCount: number;
  moodDistributionJson: string;
  entriesSummary: string;
  limitedDataNote: string;
}

interface OpenAIInsightResponse {
  howYouFelt: string;
  weeklySummary?: string;
  moodDrivers?: string[];
  patterns?: string[];
  confidence?: number;
}

class OpenAIParseError extends Error {
  rawText: string;
  parseError?: string;
  constructor(message: string, rawText: string, parseError?: string) {
    super(message);
    this.name = 'OpenAIParseError';
    this.rawText = rawText;
    this.parseError = parseError;
  }
}

function buildUserMessage(input: OpenAIInsightInput): string {
  const limitedNote = input.limitedDataNote ? `\n- Limited data note: ${input.limitedDataNote}` : '';
  return USER_MESSAGE_TEMPLATE
    .replace('{windowStartISO}', input.windowStartISO)
    .replace('{windowEndISO}', input.windowEndISO)
    .replace('{entryCount}', String(input.entryCount))
    .replace('{moodDistributionJson}', input.moodDistributionJson)
    .replace('{mostWritten}', input.mostWritten || 'Unknown')
    .replace('{recentEntriesBullets}', (input.recentEntriesBullets || '(none)') + limitedNote);
}

function buildFutureYouMessage(input: OpenAIFutureYouInput): string {
  return FUTURE_YOU_USER_TEMPLATE
    .replace('{days}', String(input.days))
    .replace('{entryCount}', String(input.entryCount))
    .replace('{moodDistributionJson}', input.moodDistributionJson)
    .replace('{entriesSummary}', input.entriesSummary || '(no text)')
    .replace('{limitedDataNote}', input.limitedDataNote || 'No additional notes.');
}

function extractJson(text: string): any {
  const clean = text.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  try {
    return JSON.parse(clean);
  } catch (directErr: any) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new OpenAIParseError('No JSON found in response', text, directErr?.message);
    }
    try {
      return JSON.parse(match[0]);
    } catch (regexErr: any) {
      throw new OpenAIParseError('Failed to parse JSON from response', text, regexErr?.message);
    }
  }
}

export function parseOpenAIInsights(text: string): OpenAIInsightResponse {
  const parsed = extractJson(text);
  return {
    howYouFelt: String(parsed?.howYouFelt || '').trim(),
    weeklySummary: parsed?.weeklySummary || '',
    moodDrivers: Array.isArray(parsed?.moodDrivers) ? parsed.moodDrivers : [],
    patterns: Array.isArray(parsed?.patterns) ? parsed.patterns : [],
    confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0.5,
  };
}

export async function callOpenAIInsights(
  input: OpenAIInsightInput,
  apiKey: string
): Promise<OpenAIInsightResponse> {
  const { parsed } = await callOpenAIInsightsRaw(input, apiKey);
  return parseOpenAIInsights(JSON.stringify(parsed));
}

export async function callOpenAIInsightsRaw(
  input: OpenAIInsightInput,
  apiKey: string
): Promise<{ rawText: string; parsed: any }> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const client = new OpenAI({ apiKey });
  const userMessage = buildUserMessage(input);

  try {
    const response = await client.responses.create({
      model: MODEL,
      text: {
        format: {
          type: 'json_schema',
          name: 'journal_insights',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              howYouFelt: { type: 'string' },
              weeklySummary: { type: 'string' },
              moodDrivers: { type: 'array', items: { type: 'string' } },
              patterns: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['howYouFelt', 'weeklySummary', 'moodDrivers', 'patterns', 'confidence'],
          },
        },
      },
      input: [
        { role: 'system', content: [{ type: 'input_text', text: SYSTEM_MESSAGE }] },
        { role: 'user', content: [{ type: 'input_text', text: userMessage }] },
      ],
      max_output_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
    });

    const outputParsed = (response as any)?.output_parsed ?? null;
    const outputText = (response as any)?.output_text?.trim() || '';
    if (!outputParsed && !outputText) {
      throw new OpenAIParseError('Empty OpenAI response text', '', 'empty_output_text');
    }

    if (outputParsed) {
      return { rawText: outputText || JSON.stringify(outputParsed), parsed: outputParsed };
    }

    const parsed = extractJson(outputText);
    return { rawText: outputText, parsed };
  } catch (err: any) {
    const status = err?.status;
    const code = err?.code;
    const name = err?.name || 'OpenAIError';

    if (status === 429 || code === 'rate_limit_exceeded') {
      const rateErr = new Error('OpenAI rate limit');
      rateErr.name = 'OpenAIRateLimitError';
      (rateErr as any).status = 429;
      throw rateErr;
    }

    if (name === 'APIConnectionError' || ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(code)) {
      const netErr = new Error(err?.message || 'Network error');
      netErr.name = 'OpenAINetworkError';
      (netErr as any).status = status;
      throw netErr;
    }

    if (err?.name === 'OpenAIParseError') {
      throw err;
    }

    throw err;
  }
}

export async function callOpenAIFutureYou(
  input: OpenAIFutureYouInput,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const client = new OpenAI({ apiKey });
  const userMessage = buildFutureYouMessage(input);

  try {
    const response = await client.responses.create({
      model: MODEL,
      text: {
        format: {
          type: 'json_schema',
          name: 'future_you_message',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              futureYou: { type: 'string' },
            },
            required: ['futureYou'],
          },
        },
      },
      input: [
        { role: 'system', content: [{ type: 'input_text', text: FUTURE_YOU_SYSTEM_MESSAGE }] },
        { role: 'user', content: [{ type: 'input_text', text: userMessage }] },
      ],
      max_output_tokens: FUTURE_YOU_MAX_OUTPUT_TOKENS,
      temperature: FUTURE_YOU_TEMPERATURE,
    });

    const outputParsed = (response as any)?.output_parsed ?? null;
    const outputText = (response as any)?.output_text?.trim() || '';
    if (!outputParsed && !outputText) {
      throw new OpenAIParseError('Empty OpenAI response text', '', 'empty_output_text');
    }

    const parsed = outputParsed || extractJson(outputText);
    const futureYou = String(parsed?.futureYou || '').trim();
    if (!futureYou) {
      throw new OpenAIParseError('Missing futureYou in response', outputText, 'missing_future_you');
    }
    return futureYou;
  } catch (err: any) {
    const status = err?.status;
    const code = err?.code;
    const name = err?.name || 'OpenAIError';

    if (status === 429 || code === 'rate_limit_exceeded') {
      const rateErr = new Error('OpenAI rate limit');
      rateErr.name = 'OpenAIRateLimitError';
      (rateErr as any).status = 429;
      throw rateErr;
    }

    if (name === 'APIConnectionError' || ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(code)) {
      const netErr = new Error(err?.message || 'Network error');
      netErr.name = 'OpenAINetworkError';
      (netErr as any).status = status;
      throw netErr;
    }

    throw err;
  }
}

export type { OpenAIInsightResponse };
export { OpenAIParseError };
export const OPENAI_MODEL = MODEL;
