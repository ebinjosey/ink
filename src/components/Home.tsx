import { motion } from 'framer-motion';
import { Calendar, Sparkles, User } from 'lucide-react';
import type { JournalEntry } from '../App';
import { useState } from 'react';
import { EntryDetail } from './EntryDetail';

interface HomeProps {
  onStartEntry: () => void;
  onNavigate: (screen: 'calendar' | 'insights' | 'profile') => void;
  entries: JournalEntry[];
  onUpdateEntry?: (entry: JournalEntry) => void;
}

export function Home({ onStartEntry, onNavigate, entries, onUpdateEntry }: HomeProps) {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Calculate streak (simplified)
  const streak = entries.length > 0 ? Math.min(entries.length, 7) : 0;
  
  // Calculate last entry time
  const lastEntry = entries.length > 0 ? entries[0] : null;
  const getTimeSince = () => {
    if (!lastEntry) return null;
    const diff = new Date().getTime() - lastEntry.date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  // Get mood emoji and color
  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'joy': return '😊';
      case 'calm': return '😌';
      case 'sad': return '😔';
      case 'anxious': return '😰';
      case 'stressed': return '🫠';
      case 'motivated': return '💪';
      case 'grateful': return '🙏';
      default: return '😐';
    }
  };

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'joy': return '#FCD34D';
      case 'calm': return '#93C5FD';
      case 'sad': return '#A5B4FC';
      case 'anxious': return '#FDA4AF';
      case 'stressed': return '#FB923C';
      case 'motivated': return '#86EFAC';
      case 'grateful': return '#DDD6FE';
      default: return '#D4D4D4';
    }
  };

  const handleUpdateEntry = (updatedEntry: JournalEntry) => {
    if (onUpdateEntry) {
      onUpdateEntry(updatedEntry);
    }
    setSelectedEntry(null);
  };

  // If viewing entry detail
  if (selectedEntry) {
    return (
      <EntryDetail 
        entry={selectedEntry} 
        onBack={() => setSelectedEntry(null)} 
        onUpdate={handleUpdateEntry}
      />
    );
  }

  const recentEntries = entries.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen px-5 pt-4 pb-6"
    >
      {/* Header: Ink Logo (center) | Profile (right) */}
      <div className="relative flex items-center mb-16 h-12">
        {/* Ink Logo - Centered */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-[20px] font-semibold text-[#171717]">Ink</h1>
        </div>

        {/* Profile Icon - Top Right */}
        <button 
          onClick={() => onNavigate('profile')}
          className="absolute right-0 top-0 w-9 h-9 rounded-full bg-[#F5F5F4] border border-[#E5E5E5] flex items-center justify-center hover:bg-[#E5E5E5] transition-colors"
        >
          <User className="w-5 h-5 text-[#525252]" strokeWidth={2} />
        </button>
      </div>

      {/* Hero CTA - Large, Centered */}
      <div className="text-center mb-8 mt-8">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-[34px] font-bold text-[#171717] leading-tight mb-6 px-8"
        >
          How are things today?
        </motion.h2>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartEntry}
          className="w-full h-14 bg-[#171717] text-[#FAFAF9] rounded-lg shadow-sm font-semibold text-[17px]"
        >
          Write about today
        </motion.button>
      </div>

      {/* Empty State Message */}
      {entries.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-center py-8 text-[15px] text-[#A3A3A3]"
        >
          No entries yet. Tap "Write about today" to start.
        </motion.div>
      )}

      {/* Quick Access Cards - Centered Icons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="grid grid-cols-2 gap-4 mb-8"
      >
        <button
          onClick={() => onNavigate('calendar')}
          className="bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-5 text-center h-[100px] flex flex-col items-center justify-center gap-3 hover:bg-[#F5F5F4] transition-colors"
        >
          <Calendar className="w-7 h-7 text-[#171717]" strokeWidth={2} />
          <span className="font-semibold text-[#171717]">Calendar</span>
        </button>
        <button
          onClick={() => onNavigate('insights')}
          className="bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-5 text-center h-[100px] flex flex-col items-center justify-center gap-3 hover:bg-[#F5F5F4] transition-colors"
        >
          <Sparkles className="w-7 h-7 text-[#171717]" strokeWidth={2} />
          <span className="font-semibold text-[#171717]">Insights</span>
        </button>
      </motion.div>

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <h3 className="text-[15px] font-semibold text-[#171717] mb-3">Recent Entries</h3>
          <div className="space-y-3">
            {recentEntries.map((entry, index) => (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.05, duration: 0.3 }}
                onClick={() => setSelectedEntry(entry)}
                className="w-full bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-4 min-h-[80px] text-left hover:bg-[#F5F5F4] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[13px] text-[#525252]">
                    {entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {entry.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {entry.mood && (
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{
                        backgroundColor: getMoodColor(entry.mood) + '30',
                      }}
                    >
                      {getMoodEmoji(entry.mood)}
                    </div>
                  )}
                </div>
                <p className="text-[15px] text-[#525252] line-clamp-2 leading-relaxed">
                  {entry.content}
                </p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
