import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { callOpenAIInsightsRaw, callOpenAIFutureYou, parseOpenAIInsights, OPENAI_MODEL } from '../utils/ai';

const prisma = new PrismaClient();
const router = express.Router();

// Cache store (fallback for unauthenticated requests)
const aiResultCache: Record<string, { latestEntryAt?: string; timestamp: number; result: AIResponse }> = {};

interface AIResponse {
  howYouFelt?: string;
  weeklySummary?: string;
  moodDrivers?: string[];
  patterns?: string[];
  confidence?: number;
  sourceEntryCount?: number;
  range?: { days: number };
  error?: string;
  isFallback?: boolean;
  futureYouMessage?: string;
}


// POST /insights/ai - AI-powered insights
const handleInsightsAI = async (req: express.Request, res: express.Response) => {
  let entriesForAIValidated: Array<{ date: string; mood?: string; text: string }> = [];
  let combinedTextLength = 0;
  let forceGenerate = false;
  let cacheReason = 'miss:no_cache';
  const isDev = process.env.NODE_ENV !== 'production';
  let mode = '';
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const forceParam = req.body?.force;
    mode = String(req.body?.mode ?? 'weekly').toLowerCase();
    const isFutureYou = mode === 'future_you';
    forceGenerate = String(forceParam || '').toLowerCase() === 'true' || String(forceParam || '') === '1';
    console.log('INSIGHTS_AI_HIT');
    console.log('FORCE:', forceGenerate);
    console.log('MODE:', mode || 'weekly');
    if (isFutureYou) {
      console.log('[FutureYou] mode detected');
    }
    console.log('INSIGHTS_REQUEST_RECEIVED');
    console.log('[Insights] POST /ai called. OPENAI_KEY_PRESENT:', !!apiKey);
    console.log('OPENAI_ENV_VAR_USED:', 'OPENAI_API_KEY');
    console.log('OPENAI_KEY_PREFIX:', apiKey ? apiKey.slice(0, 3) : '');
    console.log('MODEL_USED:', OPENAI_MODEL);

    // Determine userId from Authorization header if present (optional auth)
    let userId: string | undefined = undefined;
    const authHeader = (req.headers.authorization || '') as string;
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        userId = decoded?.userId;
      } catch (err) {
        // ignore token errors; we allow unauthenticated usage with provided entries
      }
    }

    // Prefer DB entries from last 7 days inclusive; if DB is down, fall back to entries sent in the request body.
    // Attempt DB query but do not allow a DB failure to crash the route
    let dbEntries: Array<{ date: string; mood?: string; text: string }> = [];
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const where: any = { createdAt: { gte: start, lte: end } };
      if (userId) where.userId = userId;

      const found = await prisma.entry.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: { id: true, content: true, createdAt: true, moodEmoji: true, moodTags: true },
      });
      console.log('[Insights] Entries fetched from DB:', found.length);
      // Include ALL entries, even those without text, to include mood-only entries
      dbEntries = found
        .map((f) => ({
          date: f.createdAt?.toISOString?.() || new Date().toISOString(),
          mood: f.moodEmoji || f.moodTags?.[0] || '',
          text: f.content || '',
        }));
    } catch (err: any) {
      console.error('[Insights] DB query failed:', err.message);
      dbEntries = [];
    }

    if (dbEntries.length > 0) {
      entriesForAIValidated = dbEntries;
    } else {
      // No DB entries available (either none or DB failed). Try request-provided entries.
      try {
        if (Array.isArray(req.body?.entries) && req.body.entries.length > 0) {
          // Include ALL entries, even those without text. Extract mood and content separately.
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - 7);
          entriesForAIValidated = req.body.entries
            .map((e: any) => ({ date: e.createdAt || e.date || new Date().toISOString(), mood: e.mood || e.moodEmoji || '', text: String(e.content || e.text || '') }))
            .filter((e: any) => {
              const d = new Date(e.date);
              return d >= start && d <= end;
            });
          console.log('[Insights] Using entries provided in request body, count=', entriesForAIValidated.length);
        } else {
          entriesForAIValidated = [];
        }
      } catch (err: any) {
        console.error('[Insights] Failed to parse request entries:', err.message);
        entriesForAIValidated = [];
      }
    }

    console.log('ENTRIES_LAST_7_DAYS:', entriesForAIValidated.length);

    // If we have no entries, respond 200 with message (no Gemini call)
    if (!entriesForAIValidated || entriesForAIValidated.length === 0) {
      console.log('[Insights] No entries available for AI');
      console.log('COMBINED_TEXT_LENGTH:', 0);
      console.log('CACHE_HIT:', false);
      console.log('CACHE_REASON:', 'miss:no_entries');
      console.log('AI_CALLED:', false);
      console.log('PARSE_OK:', false);
      console.log('RETURNING_FALLBACK:', false, 'reason=no_entries');
      return res.status(200).json({ error: 'NO_ENTRIES' });
    }

    console.log('INSIGHTS: Ready to call Gemini AI with', entriesForAIValidated.length, 'entries');

    if (!apiKey) {
      console.error('INSIGHTS: OPENAI_API_KEY missing - cannot generate AI insights');
      return res.status(500).json({ howYouFelt: '', sourceEntryCount: entriesForAIValidated.length, error: 'OpenAI API key missing' } as AIResponse);
    }

    // Calculate mood statistics for seed narrative
    const moodCounts: Record<string, number> = {};
    const textEntries: string[] = [];
    entriesForAIValidated.forEach((e) => {
      if (e.mood) moodCounts[e.mood]++;
      if (e.text && String(e.text).trim().length > 0) textEntries.push(String(e.text).trim());
    });

    const totalTextLength = textEntries.reduce((sum, t) => sum + t.length, 0);
    const combinedText = textEntries.join(' ');
    const moodList = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => `${m} (${c})`)
      .join(', ');

    console.log('[Insights] Mood stats:', moodList, 'Total text length:', totalTextLength, 'Entries with text:', textEntries.length);
    combinedTextLength = combinedText.length;
    console.log('COMBINED_TEXT_LENGTH:', combinedTextLength);

    const shouldGenerateAI = entriesForAIValidated.length >= 1;
    console.log('SKIPPED_AI_REASON:', shouldGenerateAI ? 'none' : 'insufficient_entries');

    const totalMoodCount = Object.values(moodCounts).reduce((sum, c) => sum + c, 0);
    const moodDistribution: Record<string, number> = {};
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (totalMoodCount > 0) {
        moodDistribution[mood] = Math.round((count / totalMoodCount) * 100);
      }
    });

    const windowEnd = new Date();
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 7);
    const dateRangeStartISO = windowStart.toISOString();
    const dateRangeEndISO = windowEnd.toISOString();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeBuckets = (hour: number) => {
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
    };
    const dayTimeCounts: Record<string, number> = {};
    entriesForAIValidated.forEach((e) => {
      const d = new Date(e.date);
      const label = `${dayNames[d.getDay()]} ${timeBuckets(d.getHours())}`;
      dayTimeCounts[label] = (dayTimeCounts[label] || 0) + 1;
    });
    const mostWrittenDayAndTime = Object.entries(dayTimeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const cleanCombinedText = combinedText.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    const redactPreview = (text: string) => {
      const preview = text.slice(0, 200);
      return preview
        .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
        .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]');
    };
    console.log('REQUEST_PAYLOAD_PREVIEW:', redactPreview(cleanCombinedText));

    const sortedEntries = [...entriesForAIValidated].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recentEntries = sortedEntries.slice(-5);
    const recentEntriesBullets = recentEntries
      .map((e) => {
        const date = new Date(e.date).toISOString().slice(0, 10);
        const mood = e.mood ? ` [${e.mood}]` : '';
        const text = String(e.text || '').replace(/\s+/g, ' ').trim().slice(0, 500);
        return `- ${date}${mood}: ${text || '(no text)'}`;
      })
      .join('\n');

    const remainingCount = Math.max(0, entriesForAIValidated.length - recentEntries.length);
    const topMoods = Object.entries(moodDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m, p]) => `${m} ${p}%`)
      .join(', ') || 'no mood data';
    const highSignalSummary = `Remaining entries: ${remainingCount}. Top moods: ${topMoods}. Most written: ${mostWrittenDayAndTime || 'unknown'}.`;

    const limitedDataNote =
      combinedText.length < 150
        ? 'Based on limited journal text, provide insights mainly from mood tags and timestamps, and explicitly state that limitation.'
        : '';

    // Prepare payload for the AI helper
    const aiInput = {
      windowStartISO: dateRangeStartISO,
      windowEndISO: dateRangeEndISO,
      entryCount: entriesForAIValidated.length,
      moodDistributionJson: JSON.stringify(moodDistribution),
      mostWritten: mostWrittenDayAndTime || 'Unknown',
      recentEntriesBullets: `${recentEntriesBullets}\n\nHigh-signal summary: ${highSignalSummary}`,
      limitedDataNote,
    };

    const latestEntryAt = sortedEntries[sortedEntries.length - 1]?.date;

    // Cache lookup
    if (userId && !forceGenerate && !isFutureYou) {
      try {
        const cache = await prisma.insightCache.findUnique({ where: { userId } });
        if (cache) {
          let meta: any = {};
          try {
            meta = JSON.parse(cache.deterministicJson || '{}');
          } catch {
            meta = {};
          }
          const cacheAgeMs = Date.now() - new Date(cache.updatedAt).getTime();
          const latestMatches = meta?.latestEntryAt && latestEntryAt && meta.latestEntryAt === latestEntryAt;
          if (cacheAgeMs < 24 * 60 * 60 * 1000 && latestMatches && cache.aiJson) {
            try {
              const cached = JSON.parse(cache.aiJson);
              if (!cached?.isFallback) {
                cacheReason = 'hit:db_cache_fresh_latest_match';
                console.log('CACHE_HIT:', true);
                console.log('CACHE_REASON:', cacheReason);
                console.log('AI_CALLED:', false);
                console.log('PARSE_OK:', true);
                console.log('RETURNING_FALLBACK:', false, 'reason=cache_hit');
                return res.status(200).json({ ...cached, sourceEntryCount: entriesForAIValidated.length } as AIResponse);
              } else {
                cacheReason = 'miss:cached_fallback';
              }
            } catch {
              // no-op, fall through to miss
            }
          } else if (cacheAgeMs >= 24 * 60 * 60 * 1000) {
            cacheReason = 'miss:cache_stale';
          } else if (!latestMatches) {
            cacheReason = 'miss:newer_entry';
          } else if (!cache.aiJson) {
            cacheReason = 'miss:cache_empty';
          }
        }
      } catch (err: any) {
        console.warn('INSIGHTS: Cache lookup failed:', err?.message || err);
      }
    } else if (!forceGenerate && !isFutureYou) {
      const anonKey = 'anon';
      const cached = aiResultCache[anonKey];
      if (cached) {
        const cacheAgeMs = Date.now() - cached.timestamp;
        if (cacheAgeMs < 24 * 60 * 60 * 1000 && cached.latestEntryAt === latestEntryAt) {
          if (!cached.result?.isFallback) {
            cacheReason = 'hit:memory_cache_fresh_latest_match';
            console.log('CACHE_HIT:', true);
            console.log('CACHE_REASON:', cacheReason);
            console.log('AI_CALLED:', false);
            console.log('PARSE_OK:', true);
            console.log('RETURNING_FALLBACK:', false, 'reason=cache_hit');
            return res.status(200).json({ ...cached.result, sourceEntryCount: entriesForAIValidated.length } as AIResponse);
          } else {
            cacheReason = 'miss:cached_fallback';
          }
        } else if (cacheAgeMs >= 24 * 60 * 60 * 1000) {
          cacheReason = 'miss:cache_stale';
        } else if (cached.latestEntryAt !== latestEntryAt) {
          cacheReason = 'miss:newer_entry';
        }
      }
    }
    console.log('CACHE_HIT:', false);
    console.log('CACHE_REASON:', cacheReason);

    // Always run AI when we have any entries (no low-data early return)

    // Call OpenAI
    try {
      if (!apiKey) {
        console.log('OPENAI_STATUS:', 401);
        console.log('ERROR_CODE:', 'missing_api_key');
        console.log('ERROR_MESSAGE:', 'OPENAI_API_KEY missing');
        console.log('AI_CALLED:', false);
        console.log('PARSE_OK:', false);
        console.log('RETURNING_FALLBACK:', false, 'reason=missing_api_key');
        return res.status(502).json({
          error: 'OpenAI request failed',
          details: isDev ? 'OPENAI_API_KEY missing' : undefined,
        });
      }

      console.log('OPENAI_CALL_START');
      console.log('AI_CALLED:', true);

      if (isFutureYou) {
        console.log('[FutureYou] entries count:', entriesForAIValidated.length);
        const combinedSummary = combinedText.replace(/\s+/g, ' ').trim().slice(0, 1200);
        const fallbackSummary =
          combinedSummary ||
          entriesForAIValidated
            .slice(0, 7)
            .map((e) => `${new Date(e.date).toISOString().slice(0, 10)}${e.mood ? ` [${e.mood}]` : ''}`)
            .join(', ');
        const futureInput = {
          days: 7,
          entryCount: entriesForAIValidated.length,
          moodDistributionJson: JSON.stringify(moodDistribution),
          entriesSummary: fallbackSummary || '(no text)',
          limitedDataNote,
        };
        console.log('[FutureYou] OpenAI called');
        try {
          const futureYou = await callOpenAIFutureYou(futureInput as any, apiKey);
          console.log('[FutureYou] response sent');
          return res.status(200).json({ futureYouMessage: futureYou });
        } catch (err: any) {
          const errMsg = err?.message || 'Future You generation failed';
          console.error('AI_ERROR', err);
          console.log('[FutureYou] response sent');
          return res.status(200).json({ futureYouMessage: 'This reflection is based on a small snapshot of recent entries. Even so, it’s clear you’re processing something meaningful. Be gentle with yourself today.' });
        }
      }

      const { rawText, parsed } = await callOpenAIInsightsRaw(aiInput as any, apiKey);
      console.log('AI_SUCCESS');
      const rawPreview = rawText.slice(0, 200);
      console.log('OPENAI_RAW_PREVIEW:', rawPreview);
      const ai = parseOpenAIInsights(JSON.stringify(parsed));
      console.log('PARSE_OK:', true);
      console.log('[Insights] returning AI data', ai);

      const responsePayload: AIResponse = {
        howYouFelt: (ai?.howYouFelt || '').trim(),
        weeklySummary: ai?.weeklySummary || '',
        moodDrivers: Array.isArray(ai?.moodDrivers) ? ai.moodDrivers : [],
        patterns: Array.isArray(ai?.patterns) ? ai.patterns : [],
        confidence: ai?.confidence ?? 0.5,
        sourceEntryCount: entriesForAIValidated.length,
        isFallback: false,
      };
      console.log('RETURNING_FALLBACK:', false, 'reason=openai_success');

      if (userId && !forceGenerate && !responsePayload.isFallback) {
        try {
          await prisma.insightCache.upsert({
            where: { userId },
            update: {
              periodStart: new Date(dateRangeStartISO),
              periodEnd: new Date(dateRangeEndISO),
              deterministicJson: JSON.stringify({ latestEntryAt }),
              aiJson: JSON.stringify(responsePayload),
            },
            create: {
              userId,
              periodStart: new Date(dateRangeStartISO),
              periodEnd: new Date(dateRangeEndISO),
              deterministicJson: JSON.stringify({ latestEntryAt }),
              aiJson: JSON.stringify(responsePayload),
            },
          });
        } catch (err: any) {
          console.warn('INSIGHTS: Failed to write cache:', err?.message || err);
        }
      } else if (!forceGenerate && !responsePayload.isFallback) {
        aiResultCache['anon'] = { latestEntryAt, timestamp: Date.now(), result: responsePayload };
      }

      return res.status(200).json(responsePayload);
    } catch (err: any) {
      const errMsg = err?.message || 'Unknown error';
      const errName = err?.name || 'Error';
      const status = err?.status;
      console.error('OPENAI_ERROR:', { status, code: err?.code, name: errName, message: errMsg, response: err?.response?.data });
      console.log('OPENAI_STATUS:', status);
      console.log('ERROR_CODE:', err?.code || errName);
      console.log('ERROR_MESSAGE:', errMsg);
      console.log('PARSE_OK:', false);

      if (isFutureYou) {
        console.log('[FutureYou] response sent');
        return res.status(200).json({
          futureYouMessage: 'This reflection is based on a small snapshot of recent entries. Even so, it’s clear you’re processing something meaningful. Be gentle with yourself today.',
        });
      }

      // A) Missing API key
      if (!apiKey) {
        console.log('RETURNING_FALLBACK:', false, 'reason=missing_api_key');
        return res.status(502).json({
          error: 'OpenAI request failed',
          details: isDev ? 'OPENAI_API_KEY missing' : undefined,
        });
      }

      // B) Invalid key / permissions
      if (status === 401 || status === 403) {
        console.log('RETURNING_FALLBACK:', false, 'reason=auth_error');
        return res.status(502).json({
          error: 'OpenAI request failed',
          details: isDev ? 'OpenAI authentication error' : undefined,
        });
      }

      // C) Model not found
      if (status === 404) {
        console.log('RETURNING_FALLBACK:', false, 'reason=model_not_found');
        return res.status(502).json({
          error: 'OpenAI request failed',
          details: isDev ? 'OpenAI model not found' : undefined,
        });
      }

      // D) Rate limit / quota
      if (status === 429 || errName === 'OpenAIRateLimitError') {
        console.log('RETURNING_FALLBACK:', false, 'reason=rate_limit');
        return res.status(502).json({
          error: 'OpenAI request failed',
          details: isDev ? 'OpenAI rate limit' : undefined,
        });
      }

      // E) Network failure
      if (errName === 'OpenAINetworkError') {
        console.log('RETURNING_FALLBACK:', false, 'reason=network_error');
        return res.status(502).json({
          error: 'OpenAI request failed',
          details: isDev ? 'OpenAI network error' : undefined,
        });
      }

      // F) Parsing/format problems -> 502
      console.log('RETURNING_FALLBACK:', false, 'reason=openai_error');
      return res.status(502).json({
        error: 'OpenAI request failed',
        details: isDev ? errMsg : undefined,
      });
    }
  } catch (err: any) {
    const errMsg = err?.message || 'Unknown error';
    console.error('INSIGHTS_HANDLER_ERROR:', errMsg);
    console.log('OPENAI_STATUS:', err?.status);
    console.log('ERROR_CODE:', err?.code || err?.name || 'handler_error');
    console.log('ERROR_MESSAGE:', errMsg);
    console.log('AI_CALLED:', false);
    console.log('PARSE_OK:', false);
    console.log('RETURNING_FALLBACK:', false, 'reason=handler_error');
    if (typeof mode !== 'undefined' && String(mode).toLowerCase() === 'future_you') {
      console.log('[FutureYou] response sent');
      return res.status(200).json({
        futureYouMessage: 'This reflection is based on a small snapshot of recent entries. Even so, it’s clear you’re processing something meaningful. Be gentle with yourself today.',
      });
    }
    return res.status(500).json({
      error: 'Unexpected server error',
      message: isDev ? errMsg : 'Unexpected server error',
      stack: isDev ? err?.stack : undefined,
    });
  }
};

router.post('/ai', handleInsightsAI);

export default router;
