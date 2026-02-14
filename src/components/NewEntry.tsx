import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Image as ImageIcon } from 'lucide-react';
import type { JournalEntry } from '../App';

interface NewEntryProps {
  onSave: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  existingEntry?: JournalEntry;
}

const moods = [
  { id: 'joy', label: 'Joy', emoji: '😊', color: '#FCD34D' },
  { id: 'calm', label: 'Calm', emoji: '😌', color: '#93C5FD' },
  { id: 'sad', label: 'Sad', emoji: '😔', color: '#A5B4FC' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', color: '#FDA4AF' },
  { id: 'stressed', label: 'Stressed', emoji: '🫠', color: '#FB923C' },
  { id: 'motivated', label: 'Motivated', emoji: '💪', color: '#86EFAC' },
  { id: 'grateful', label: 'Grateful', emoji: '🙏', color: '#DDD6FE' },
] as const;

const journalPrompts = [
  "What are you most proud of today?",
  "What's currently on your mind?",
  "What made you smile recently?",
  "What challenge are you facing right now?",
  "What are you grateful for in this moment?",
  "What would make tomorrow better?",
  "What did you learn about yourself today?",
  "What's something you want to remember from today?",
  "How are you feeling, and why?",
  "What's one thing you'd like to let go of?",
];

export function NewEntry({ onSave, onCancel, existingEntry }: NewEntryProps) {
  const [content, setContent] = useState(existingEntry?.content || '');
  const [selectedMood, setSelectedMood] = useState<'joy' | 'calm' | 'sad' | 'anxious' | 'stressed' | 'motivated' | 'grateful' | undefined>(existingEntry?.mood);
  const [photos, setPhotos] = useState<string[]>(existingEntry?.photos || []);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentPrompt] = useState(() => journalPrompts[Math.floor(Math.random() * journalPrompts.length)]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autosave simulation
  useEffect(() => {
    if (content.length > 0) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [content]);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Convert files to data URLs (in a real app, upload to server)
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (content.trim()) {
      onSave({
        date: existingEntry?.date || new Date(),
        content: content.trim(),
        mood: selectedMood,
        photos: photos.length > 0 ? photos : undefined,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen flex flex-col bg-[#FFFFFF]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#FAFAF9] border-b border-[#E5E5E5]">
        <button
          onClick={onCancel}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors"
          aria-label="Cancel"
        >
          <X className="w-5 h-5 text-[#171717]" strokeWidth={2} />
        </button>
        
        <span className="text-[15px] text-[#525252]">
          {existingEntry 
            ? existingEntry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          }
        </span>
        
        <button
          onClick={handleSave}
          disabled={!content.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Save entry"
        >
          <Check className="w-5 h-5 text-[#171717]" strokeWidth={2} />
        </button>
      </div>

      {/* Mood Selector */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="flex justify-center gap-2.5 px-5 py-6 border-b border-[#E5E5E5] overflow-x-auto"
      >
        {moods.map((mood) => (
          <motion.button
            key={mood.id}
            onClick={() => setSelectedMood(selectedMood === mood.id ? undefined : mood.id)}
            whileTap={{ scale: 0.9 }}
            animate={{ scale: selectedMood === mood.id ? 1.1 : 1 }}
            className="w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all border flex-shrink-0"
            style={{
              backgroundColor: selectedMood === mood.id ? mood.color + '20' : 'transparent',
              borderColor: selectedMood === mood.id ? mood.color : '#E5E5E5',
            }}
          >
            {mood.emoji}
          </motion.button>
        ))}
      </motion.div>

      {/* Writing Area */}
      <div className="flex-1 px-5 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder=""
            className="w-full min-h-[400px] bg-transparent border-none outline-none resize-none text-[17px] leading-[1.7] text-[#171717] placeholder:text-[#A3A3A3]"
            autoFocus
          />

          {/* Photos Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-6">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-[#F5F5F4]">
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-[#171717] text-[#FFFFFF] rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Photo Add Button & Prompt */}
      <div className="px-5 py-4 border-t border-[#E5E5E5] space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoAdd}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-12 bg-[#F5F5F4] text-[#171717] rounded-lg flex items-center justify-center gap-2 hover:bg-[#E5E5E5] transition-colors"
        >
          <ImageIcon className="w-5 h-5" strokeWidth={2} />
          <span className="font-medium">Add Photo</span>
        </button>
        
        {/* Journal Prompt */}
        <div className="text-center py-2">
          <p className="text-[13px] text-[#A3A3A3] italic">
            Write freely.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
