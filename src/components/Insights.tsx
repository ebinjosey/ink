import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Repeat, BarChart3, Hash, Calendar as CalendarIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { JournalEntry } from '../App';

interface InsightsProps {
  entries: JournalEntry[];
}

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

export function Insights({ entries }: InsightsProps) {
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  const [howYouFeltText, setHowYouFeltText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showFutureYouSection, setShowFutureYouSection] = useState(false);
  const [futureYouContent, setFutureYouContent] = useState<string | null>(null);
  const [isLoadingFutureYou, setIsLoadingFutureYou] = useState(false);
  const [futureYouError, setFutureYouError] = useState<string | null>(null);
  const futureYouSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Load cached insight (if fresh)
    try {
      const cached = localStorage.getItem('ink_ai_insight');
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageMs = Date.now() - (parsed?.timestamp || 0);
        if (ageMs < 24 * 60 * 60 * 1000 && parsed?.howYouFelt) {
          setHowYouFeltText(parsed.howYouFelt);
          setAiData(parsed?.aiData || null);
        }
      }
    } catch {
      // ignore cache errors
    }
  }, []);

  const fetchAIInsights = async () => {
    const token = localStorage.getItem('authToken');

    console.log('[Insights] fetchAIInsights started. Entries count:', entries.length);
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const apiBase = (import.meta as any)?.env?.VITE_API_BASE_URL || '';
      const apiUrl = apiBase ? `${apiBase}/insights/ai` : '/api/insights/ai';
      console.log('[Insights] AI request sent to', apiUrl);
      
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payloadEntries = entries.map((e) => ({
        createdAt: e.date.toISOString(),
        content: e.content,
        mood: e.mood,
        moodEmoji: e.mood,
      }));
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ entries: payloadEntries, mode: 'weekly', force: true }),
      });
      console.log('[Insights] AI response received, status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[Insights] AI error response:', errorData);
        // Don't display HTTP error text; show placeholder instead
        setGenerateError('Couldn’t generate insights right now. Try again.');
        setIsGenerating(false);
        return;
      }

      const data = await response.json();
      console.log('[Insights] Parsed AI data:', data);

      const normalized =
        data?.howYouFelt ? data
        : data?.insight ? data.insight
        : data?.data ? data.data
        : data?.result ? data.result
        : null;

      const normalizedData = normalized
        ? {
            howYouFelt: normalized?.howYouFelt ?? '',
            weeklySummary: normalized?.weeklySummary ?? '',
            moodDrivers: Array.isArray(normalized?.moodDrivers) ? normalized.moodDrivers : [],
            patterns: Array.isArray(normalized?.patterns) ? normalized.patterns : [],
            confidence: typeof normalized?.confidence === 'number' ? normalized.confidence : 0.4,
            sourceEntryCount: typeof normalized?.sourceEntryCount === 'number' ? normalized.sourceEntryCount : undefined,
            isFallback: typeof normalized?.isFallback === 'boolean' ? normalized.isFallback : undefined,
          }
        : null;

      if (normalizedData && response.ok && !data?.error) {
        setAiData(normalizedData);
        setHowYouFeltText(normalizedData.howYouFelt);
        setGenerateError(null);
        try {
          localStorage.setItem('ink_ai_insight', JSON.stringify({ howYouFelt: normalizedData.howYouFelt, aiData: normalizedData, timestamp: Date.now() }));
        } catch {
          // ignore cache errors
        }
      } else {
        setAiData(null);
        setHowYouFeltText('');
        if (!response.ok) {
          setGenerateError('Couldn’t generate insights right now. Try again.');
        } else {
          setGenerateError(null);
        }
      }

      // If backend reports zero entries but there are local entries, retry by posting them
      if ((normalizedData?.sourceEntryCount === 0 || normalizedData?.sourceEntryCount === undefined) && entries.length > 0) {
        try {
          const payloadEntries = entries.map((e) => ({
            createdAt: e.date.toISOString(),
            content: e.content,
            mood: e.mood,
            moodEmoji: e.mood,
          }));
          console.log('[Insights] No backend entries; retrying with localStorage entries, count=', payloadEntries.length);
          const retryResp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify({ entries: payloadEntries, mode: 'weekly', force: true }) });
          if (retryResp.ok) {
            const retryData = await retryResp.json();
            console.log('[Insights] Retry AI response:', retryData);
            const retryNormalized =
              retryData?.howYouFelt ? retryData
              : retryData?.insight ? retryData.insight
              : retryData?.data ? retryData.data
              : retryData?.result ? retryData.result
              : null;
            const retryNormalizedData = retryNormalized
              ? {
                  howYouFelt: retryNormalized?.howYouFelt ?? '',
                  weeklySummary: retryNormalized?.weeklySummary ?? '',
                  moodDrivers: Array.isArray(retryNormalized?.moodDrivers) ? retryNormalized.moodDrivers : [],
                  patterns: Array.isArray(retryNormalized?.patterns) ? retryNormalized.patterns : [],
                  confidence: typeof retryNormalized?.confidence === 'number' ? retryNormalized.confidence : 0.4,
                  sourceEntryCount: typeof retryNormalized?.sourceEntryCount === 'number' ? retryNormalized.sourceEntryCount : undefined,
                  isFallback: typeof retryNormalized?.isFallback === 'boolean' ? retryNormalized.isFallback : undefined,
                }
              : null;
            if (retryNormalizedData) {
              setAiData(retryNormalizedData);
              setHowYouFeltText(retryNormalizedData.howYouFelt);
              setGenerateError(null);
              try {
                localStorage.setItem('ink_ai_insight', JSON.stringify({ howYouFelt: retryNormalizedData.howYouFelt, aiData: retryNormalizedData, timestamp: Date.now() }));
              } catch {
                // ignore cache errors
              }
            }
          } else {
            console.warn('[Insights] Retry AI call failed:', retryResp.statusText);
          }
        } catch (err) {
          console.error('[Insights] Local fallback AI call failed:', err);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch insights';
      console.error('[Insights] AI fetch error:', message);
      setGenerateError('Couldn’t generate insights right now. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateInsight = () => {
    console.log('[Insights] Generate Insight clicked.');
    fetchAIInsights();
  };
  // Get mood counts and percentages
  const getMoodCounts = () => {
    const counts: Record<string, number> = {};
    entries.forEach((entry) => {
      if (entry.mood) {
        counts[entry.mood] = (counts[entry.mood] || 0) + 1;
      }
    });
    return counts;
  };

  const moodCounts = getMoodCounts();
  const totalWithMood = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const getMoodEmoji = (mood: string) => {
    const emojis: Record<string, string> = {
      joy: '😊',
      calm: '😌',
      sad: '😔',
      anxious: '😰',
      stressed: '🫠',
      motivated: '💪',
      grateful: '🙏',
    };
    return emojis[mood] || '😐';
  };

  const getMoodLabel = (mood: string) => {
    const labels: Record<string, string> = {
      joy: 'Content',
      calm: 'Calm',
      sad: 'Sad',
      anxious: 'Anxious',
      stressed: 'Stressed',
      motivated: 'Motivated',
      grateful: 'Grateful',
    };
    return labels[mood] || mood;
  };

  const getMoodColor = (mood: string) => {
    const colors: Record<string, string> = {
      joy: '#FCD34D',
      calm: '#93C5FD',
      sad: '#A5B4FC',
      anxious: '#FDA4AF',
      stressed: '#FB923C',
      motivated: '#86EFAC',
      grateful: '#DDD6FE',
    };
    return colors[mood] || '#D4D4D4';
  };

  // Weekly stats
  const weekEntries = entries.filter((e) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return e.date >= weekAgo;
  });

  const isNegativeAvg = ['sad', 'anxious', 'stressed'].includes(dominantMood || '');

  useEffect(() => {
    if (isNegativeAvg) {
      setShowFutureYouSection(true);
    }
  }, [isNegativeAvg]);

  const handleAvgMoodClick = () => {
    setShowFutureYouSection(true);
    setTimeout(() => {
      futureYouSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const fetchFutureYou = async () => {
    const token = localStorage.getItem('authToken');
    console.log('[FutureYouToast] Generate clicked');
    setIsLoadingFutureYou(true);
    setFutureYouError(null);
    try {
      const apiBase = (import.meta as any)?.env?.VITE_API_BASE_URL || '';
      const apiUrl = apiBase ? `${apiBase}/insights/ai` : '/api/insights/ai';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      console.log('[FutureYouToast] API called');
      const payloadEntries = entries.map((e) => ({
        createdAt: e.date.toISOString(),
        content: e.content,
        mood: e.mood,
        moodEmoji: e.mood,
      }));
      const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify({ entries: payloadEntries, mode: 'future_you', force: true }) });
      const data = await response.json();
      const futureText = typeof data?.futureYouMessage === 'string' ? data.futureYouMessage : '';
      if (response.ok && futureText) {
        console.log('[FutureYouToast] API success');
        setFutureYouContent(futureText);
        setShowFutureYouSection(true);
      } else {
        console.log('[FutureYouToast] API failure');
        setFutureYouContent(null);
        setFutureYouError('Couldn’t generate right now. Try again later.');
      }
    } catch (err) {
      console.log('[FutureYouToast] API failure');
      setFutureYouContent(null);
      setFutureYouError('Couldn’t generate right now. Try again later.');
    } finally {
      setIsLoadingFutureYou(false);
    }
  };

  const collapseFutureYouSection = () => {
    setShowFutureYouSection(false);
    setFutureYouError(null);
  };

  const prevWeekEntries = entries.filter((e) => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return e.date >= twoWeeksAgo && e.date < weekAgo;
  });

  // Calculate mood trend changes
  const getMoodTrend = (mood: string) => {
    const thisWeekCount = weekEntries.filter(e => e.mood === mood).length;
    const lastWeekCount = prevWeekEntries.filter(e => e.mood === mood).length;
    
    if (lastWeekCount === 0) return { change: 0, direction: 'neutral' as const };
    
    const percentChange = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
    return {
      change: Math.abs(percentChange),
      direction: percentChange > 0 ? 'up' as const : percentChange < 0 ? 'down' as const : 'neutral' as const,
    };
  };

  // Most common writing day/time
  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const dayFrequency: Record<string, number> = {};
  entries.forEach(entry => {
    const day = getDayName(entry.date);
    dayFrequency[day] = (dayFrequency[day] || 0) + 1;
  });

  const mostCommonDay = Object.entries(dayFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Tuesday';
  const avgHour = entries.length > 0 
    ? Math.round(entries.reduce((sum, e) => sum + e.date.getHours(), 0) / entries.length)
    : 20;

  // Extract themes from actual entry content
  const extractThemes = () => {
    const themeCounts: Record<string, number> = {};
    
    // Keywords to track (expandable)
    const themeKeywords: Record<string, string[]> = {
      'Work': ['work', 'project', 'meeting', 'deadline', 'presentation', 'team', 'office', 'job'],
      'Family': ['family', 'mom', 'dad', 'parent', 'child', 'kid', 'sibling', 'brother', 'sister'],
      'Friends': ['friend', 'conversation', 'hang', 'catch up', 'connected'],
      'Health': ['health', 'exercise', 'workout', 'run', 'walk', 'meditation', 'yoga'],
      'Mindfulness': ['mindful', 'meditation', 'grateful', 'reflect', 'peace', 'calm', 'present'],
      'Nature': ['park', 'sunset', 'outdoor', 'walk', 'nature', 'weather', 'sky'],
      'Productivity': ['focus', 'productive', 'prioritize', 'organize', 'accomplish', 'goals'],
      'Growth': ['learn', 'growth', 'improve', 'better', 'progress', 'develop', 'patient'],
      'Stress': ['stress', 'overwhelm', 'anxious', 'worried', 'pressure'],
      'Books': ['book', 'read', 'reading'],
    };

    entries.forEach(entry => {
      const contentLower = entry.content.toLowerCase();
      
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        keywords.forEach(keyword => {
          if (contentLower.includes(keyword)) {
            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
          }
        });
      });
    });

    // Sort themes by count and return top 5
    return Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  };

  const themes = extractThemes();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="px-4 pt-8 pb-6"
    >
      <h1 className="font-display text-[34px] font-semibold mb-6 text-[#171717] tracking-tight" style={{ letterSpacing: '-0.5px' }}>
        Insights
      </h1>

      <div className="space-y-4">
        {entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <p className="text-[17px] text-[#525252] mb-2">No data yet</p>
            <p className="text-[15px] text-[#A3A3A3]">Create some entries to see insights about your moods and themes.</p>
          </motion.div>
        )}
        {/* Weekly Digest Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-white border border-[#E5E5E5] rounded-[10px] p-4 min-h-[180px] flex flex-col"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-[20px] font-semibold text-[#171717] mb-1">This Week</h3>
              <p className="text-[13px] text-[#525252]">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-[#171717]">{weekEntries.length} entries</span>
            </div>
            <button
              onClick={handleAvgMoodClick}
              className="flex items-center gap-2 text-left active:opacity-70 transition-opacity"
            >
              <span className="text-[15px] text-[#525252]">Avg mood:</span>
              <span className="text-xl">{dominantMood ? getMoodEmoji(dominantMood) : '😐'}</span>
            </button>
            <div className="text-[15px] text-[#525252]">
              Most written: <span className="font-semibold text-[#171717]">{mostCommonDay} evenings</span>
            </div>
          </div>

          <button className="mt-4 text-[15px] text-[#007AFF] font-semibold self-start active:opacity-60 transition-opacity">
            View Details
          </button>
        </motion.div>

        {/* How You Felt - AI Powered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="bg-white border border-[#E5E5E5] rounded-[10px] p-4"
        >
          <h3 className="text-[17px] font-semibold mb-3 text-[#171717]">How You Felt</h3>
          <div className="bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-4">
            {/* No entries → show "create more entries..." */}
            {isGenerating ? (
              <div className="space-y-2">
                <p className="text-[15px] text-[#A3A3A3] italic">Generating your weekly reflection...</p>
              </div>
            ) : howYouFeltText ? (
              <div className="space-y-3">
                <p className="text-[15px] text-[#171717] leading-relaxed">{howYouFeltText}</p>
                {aiData?.weeklySummary && (
                  <p className="text-[14px] text-[#525252] leading-relaxed">
                    <span className="font-semibold text-[#171717]">Summary:</span> {aiData.weeklySummary}
                  </p>
                )}
                {aiData?.moodDrivers && aiData.moodDrivers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                    <p className="text-[14px] font-semibold text-[#171717] mb-2">Mood Drivers</p>
                    <ul className="space-y-1">
                      {aiData.moodDrivers.map((driver, idx) => (
                        <li key={idx} className="text-[14px] text-[#525252]">• {driver}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiData?.patterns && aiData.patterns.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                    <p className="text-[14px] font-semibold text-[#171717] mb-2">Patterns</p>
                    <ul className="space-y-1">
                      {aiData.patterns.map((pattern, idx) => (
                        <li key={idx} className="text-[14px] text-[#525252]">• {pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={handleGenerateInsight}
                  className="mt-3 text-[14px] text-[#007AFF] font-semibold self-start active:opacity-60 transition-opacity"
                >
                  Regenerate
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {generateError ? (
                  <p className="text-[15px] text-[#A3A3A3] italic">Couldn’t generate insights right now. Try again.</p>
                ) : (
                  <p className="text-[15px] text-[#A3A3A3] italic">Tap to generate a deeper 7-day AI insight from your journal.</p>
                )}
                <button
                  onClick={handleGenerateInsight}
                  disabled={isGenerating}
                  className="text-[15px] text-[#007AFF] font-semibold active:opacity-60 transition-opacity disabled:opacity-50"
                >
                  {isGenerating ? 'Generating…' : 'Generate Insight'}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Mood Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-white border border-[#E5E5E5] rounded-[10px] p-4"
        >
          <h3 className="text-[17px] font-semibold mb-4 text-[#171717]">Mood Trends</h3>
          
          <div className="space-y-4">
            {Object.entries(moodCounts).map(([mood, count]) => {
              const percentage = totalWithMood > 0 ? Math.round((count / totalWithMood) * 100) : 0;
              const trend = getMoodTrend(mood);
              
              return (
                <div key={mood} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getMoodEmoji(mood)}</span>
                      <span className="text-[15px] font-medium text-[#171717]">{getMoodLabel(mood)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] text-[#525252]">{percentage}%</span>
                      {trend.direction !== 'neutral' && (
                        <div className="flex items-center gap-1">
                          {trend.direction === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-[#F5F5F4] rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getMoodColor(mood) + '99' }} // 60% opacity
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recurring Patterns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-white border border-[#E5E5E5] rounded-[10px] p-4"
        >
          <h3 className="text-[17px] font-semibold mb-4 text-[#171717]">Recurring Patterns</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FDA4AF]/10 flex items-center justify-center flex-shrink-0">
                <Repeat className="w-5 h-5 text-[#FDA4AF]" />
              </div>
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-[#171717] mb-1">Work Stress</h4>
                <p className="text-[13px] text-[#525252] mb-2">
                  Appears on Sunday nights<br />
                  4 times this month
                </p>
                <button className="text-[15px] text-[#007AFF] font-semibold active:opacity-60 transition-opacity">
                  See entries
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Writing Habits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="bg-white border border-[#E5E5E5] rounded-[10px] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#171717]" />
            <h3 className="text-[17px] font-semibold text-[#171717]">Writing Habits</h3>
          </div>
          
          <div className="space-y-3">
            <div className="text-[15px] text-[#525252]">
              You write most on <span className="font-semibold text-[#171717]">{mostCommonDay}s</span>
              <br />
              <span className="text-[13px]">({avgHour > 12 ? `${avgHour - 12}` : avgHour} {avgHour >= 12 ? 'PM' : 'AM'} average)</span>
            </div>
            <div className="text-[15px] text-[#525252]">
              Longest entries when <span className="font-semibold text-[#171717]">anxious</span>
              <br />
              <span className="text-[13px]">(450 avg words)</span>
            </div>
          </div>
        </motion.div>

        {/* Top Themes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="bg-white border border-[#E5E5E5] rounded-[10px] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-5 h-5 text-[#171717]" />
            <h3 className="text-[17px] font-semibold text-[#171717]">Top Themes</h3>
          </div>
          
          <div className="space-y-2 mb-4">
            <p className="text-[13px] text-[#525252] mb-3">Most mentioned:</p>
            {themes.map((theme) => (
              <div key={theme.name} className="flex items-center justify-between py-2 border-b border-[#E5E5E5] last:border-0">
                <span className="text-[15px] text-[#171717]">• {theme.name}</span>
                <span className="text-[13px] text-[#525252]">({theme.count}x)</span>
              </div>
            ))}
          </div>

          <button className="text-[15px] text-[#007AFF] font-semibold active:opacity-60 transition-opacity">
            Explore
          </button>
        </motion.div>

        {/* Future You (6 months later) */}
        {showFutureYouSection && (
          <motion.div
            ref={futureYouSectionRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white border border-[#E5E5E5] rounded-[10px] p-4"
          >
            <h3 className="text-[17px] font-semibold mb-3 text-[#171717]">Future You (6 months later)</h3>
            {futureYouContent ? (
              <div className="space-y-2">
                {futureYouContent.split('\n').map((line, idx) => (
                  <p key={idx} className="text-[14px] text-[#525252] leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[14px] text-[#525252]">
                  Want a perspective shift written in your voice, from six months ahead?
                </p>
                {futureYouError && (
                  <p className="text-[13px] text-[#B91C1C]">Couldn’t generate right now. Try again later.</p>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchFutureYou}
                    className="text-[14px] text-[#171717] bg-[#F2F2F4] px-4 py-2 rounded-lg font-semibold hover:bg-[#E8E8EC] active:bg-[#DDDEE3] disabled:opacity-60"
                    disabled={isLoadingFutureYou}
                  >
                    {isLoadingFutureYou ? 'Generating…' : 'Generate'}
                  </button>
                  <button
                    onClick={collapseFutureYouSection}
                    className="text-[14px] text-[#525252] font-semibold"
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
