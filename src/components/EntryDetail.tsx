import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Edit2 } from 'lucide-react';
import type { JournalEntry } from '../App';
import { NewEntry } from './NewEntry';

interface EntryDetailProps {
  entry: JournalEntry;
  onBack: () => void;
  onUpdate?: (entry: JournalEntry) => void;
}

export function EntryDetail({ entry, onBack, onUpdate }: EntryDetailProps) {
  const [isEditing, setIsEditing] = useState(false);

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

  const getMoodLabel = (mood?: string) => {
    switch (mood) {
      case 'joy': return 'Joyful';
      case 'calm': return 'Calm';
      case 'sad': return 'Sad';
      case 'anxious': return 'Anxious';
      case 'stressed': return 'Stressed';
      case 'motivated': return 'Motivated';
      case 'grateful': return 'Grateful';
      default: return 'Neutral';
    }
  };

  const handleSaveEdit = (updatedData: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    if (onUpdate) {
      onUpdate({
        ...entry,
        ...updatedData,
      });
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <NewEntry
        existingEntry={entry}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-[#FFFFFF]"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#171717]" strokeWidth={2} />
          <span className="text-[17px] text-[#171717]">Back</span>
        </button>

        <button
          onClick={() => setIsEditing(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors"
          aria-label="Edit entry"
        >
          <Edit2 className="w-5 h-5 text-[#171717]" strokeWidth={2} />
        </button>
      </div>

      {/* Entry Content */}
      <div className="px-5 py-6">
        {/* Date and Time */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#171717] mb-2">
            {entry.date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </h1>
          <p className="text-[15px] text-[#525252]">
            {entry.date.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Mood Badge */}
        {entry.mood && (
          <div className="mb-6">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: getMoodColor(entry.mood) + '30' }}
            >
              <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
              <span className="text-[15px] font-medium text-[#171717]">
                {getMoodLabel(entry.mood)}
              </span>
            </div>
          </div>
        )}

        {/* Photos */}
        {entry.photos && entry.photos.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              {entry.photos.map((photo, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-[#F5F5F4]">
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entry Text */}
        <div className="prose prose-lg max-w-none">
          <p className="text-[17px] text-[#171717] leading-[1.7] whitespace-pre-wrap">
            {entry.content}
          </p>
        </div>

        {/* Metadata */}
        <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
          <p className="text-[13px] text-[#A3A3A3]">
            {entry.content.split(' ').length} words
            {entry.photos && entry.photos.length > 0 && ` • ${entry.photos.length} ${entry.photos.length === 1 ? 'photo' : 'photos'}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}