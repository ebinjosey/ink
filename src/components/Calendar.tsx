import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { JournalEntry } from '../App';
import { EntryDetail } from './EntryDetail';
import { NewEntry } from './NewEntry';

interface CalendarProps {
  entries: JournalEntry[];
  onUpdateEntry?: (entry: JournalEntry) => void;
  onNewEntry?: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
}

type ViewMode = 'week' | 'month' | 'year';

export function Calendar({ entries, onUpdateEntry, onNewEntry }: CalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'joy':
        return '#FCD34D';
      case 'calm':
        return '#93C5FD';
      case 'sad':
        return '#A5B4FC';
      case 'anxious':
        return '#FDA4AF';
      case 'stressed':
        return '#FB923C';
      case 'motivated':
        return '#86EFAC';
      case 'grateful':
        return '#DDD6FE';
      default:
        return '#D4D4D4';
    }
  };

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

  const getEntriesForDate = (date: Date) => {
    return entries.filter(
      (entry) =>
        entry.date.getDate() === date.getDate() &&
        entry.date.getMonth() === date.getMonth() &&
        entry.date.getFullYear() === date.getFullYear()
    );
  };

  const handleUpdateEntry = (updatedEntry: JournalEntry) => {
    if (onUpdateEntry) {
      onUpdateEntry(updatedEntry);
    }
    setSelectedEntry(null);
  };

  const handleNewEntryForDate = (entryData: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    if (onNewEntry) {
      onNewEntry(entryData);
    }
    setIsCreatingEntry(false);
    setSelectedDate(null);
  };

  const handleMonthClick = (monthIndex: number) => {
    const newDate = new Date(currentDate.getFullYear(), monthIndex, 1);
    setCurrentDate(newDate);
    setViewMode('month');
  };

  // If creating new entry for selected date
  if (isCreatingEntry && selectedDate) {
    return (
      <NewEntry
        existingEntry={{ date: selectedDate } as JournalEntry}
        onSave={handleNewEntryForDate}
        onCancel={() => setIsCreatingEntry(false)}
      />
    );
  }

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

  // If viewing entries for a selected date
  if (selectedDate) {
    const dateEntries = getEntriesForDate(selectedDate);
    const hasEntry = dateEntries.length > 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="min-h-screen bg-[#FFFFFF] px-5 pt-8 pb-6"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1 -ml-2"
            >
              <ChevronLeft className="w-6 h-6 text-[#171717]" strokeWidth={2} />
              <span className="text-[17px] text-[#171717]">Back</span>
            </button>

            {!hasEntry && (
              <button
                onClick={() => setIsCreatingEntry(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#171717] text-[#FFFFFF] hover:bg-[#525252] transition-colors"
              >
                <Plus className="w-5 h-5" strokeWidth={2} />
              </button>
            )}
          </div>
          
          <h1 className="text-[28px] font-bold text-[#171717] mb-2">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </h1>
          <p className="text-[15px] text-[#525252]">
            {dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          {dateEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[17px] text-[#525252] mb-4">No entry for this day</p>
              <button
                onClick={() => setIsCreatingEntry(true)}
                className="px-6 py-3 bg-[#171717] text-[#FFFFFF] rounded-lg font-medium hover:bg-[#525252] transition-colors"
              >
                Write Entry
              </button>
            </div>
          ) : (
            dateEntries.map((entry, index) => (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => setSelectedEntry(entry)}
                className="w-full bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-4 text-left hover:bg-[#F5F5F4] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[15px] font-semibold text-[#171717]">
                    {entry.date.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit'
                    })}
                  </span>
                  {entry.mood && (
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-lg"
                      style={{
                        backgroundColor: getMoodColor(entry.mood) + '30',
                      }}
                    >
                      {getMoodEmoji(entry.mood)}
                    </div>
                  )}
                </div>
                <p className="text-[17px] text-[#525252] line-clamp-4 leading-relaxed mb-2">
                  {entry.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#A3A3A3]">
                    {entry.content.split(' ').length} words
                  </span>
                  <span className="text-[15px] text-[#171717] font-medium">
                    Read More →
                  </span>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </motion.div>
    );
  }

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs text-gray-500 font-medium mb-2">
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          const dayEntries = getEntriesForDate(date);
          const isToday =
            date.getDate() === new Date().getDate() &&
            date.getMonth() === new Date().getMonth() &&
            date.getFullYear() === new Date().getFullYear();

          return (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              onClick={() => setSelectedDate(date)}
              className={`aspect-square bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-2 flex flex-col items-center justify-center hover:bg-[#F5F5F4] transition-colors ${
                isToday ? 'ring-2 ring-[#171717]' : ''
              }`}
            >
              <span className={`text-sm font-medium ${isToday ? 'text-[#171717]' : 'text-[#525252]'}`}>
                {date.getDate()}
              </span>
              {dayEntries.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {dayEntries.slice(0, 1).map((entry, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getMoodColor(entry.mood), opacity: 0.6 }}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs text-gray-500 font-medium mb-2">
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} />;
          }

          const dayEntries = getEntriesForDate(date);
          const isToday =
            date.getDate() === new Date().getDate() &&
            date.getMonth() === new Date().getMonth() &&
            date.getFullYear() === new Date().getFullYear();

          return (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (index % 7) * 0.03, duration: 0.3 }}
              onClick={() => setSelectedDate(date)}
              className={`aspect-square bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-1 flex flex-col items-center justify-center hover:bg-[#F5F5F4] transition-colors ${
                isToday ? 'ring-2 ring-[#171717]' : ''
              }`}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-[#171717]' : 'text-[#525252]'}`}>
                {date.getDate()}
              </span>
              {dayEntries.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEntries.slice(0, 1).map((entry, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: getMoodColor(entry.mood), opacity: 0.6 }}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    
    // Count entries per day for the year
    const entriesPerDay = new Map<string, number>();
    entries.forEach(entry => {
      if (entry.date.getFullYear() === year) {
        const dateKey = `${entry.date.getFullYear()}-${entry.date.getMonth()}-${entry.date.getDate()}`;
        entriesPerDay.set(dateKey, (entriesPerDay.get(dateKey) || 0) + 1);
      }
    });

    // Count entries in the year
    const yearEntries = entries.filter(entry => entry.date.getFullYear() === year);
    const daysWithEntries = new Set(yearEntries.map(entry => 
      `${entry.date.getFullYear()}-${entry.date.getMonth()}-${entry.date.getDate()}`
    )).size;
    
    return (
      <div>
        {/* Mini Month Grids */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {Array.from({ length: 12 }, (_, i) => {
            const monthDate = new Date(year, i, 1);
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
            const daysInMonth = new Date(year, i + 1, 0).getDate();
            const firstDayOfWeek = new Date(year, i, 1).getDay();
            
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => handleMonthClick(i)}
                className="bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-2 hover:bg-[#F5F5F4] transition-colors"
              >
                <div className="text-[13px] font-semibold text-[#171717] text-center mb-2">
                  {monthName}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: firstDayOfWeek }, (_, j) => (
                    <div key={`empty-${j}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                    const date = new Date(year, i, dayIndex + 1);
                    const dateKey = `${year}-${i}-${dayIndex + 1}`;
                    const entryCount = entriesPerDay.get(dateKey) || 0;
                    const opacity = entryCount === 0 ? 0.1 : entryCount === 1 ? 0.3 : entryCount === 2 ? 0.6 : 1;
                    
                    return (
                      <div
                        key={dayIndex}
                        className="w-1 h-1 rounded-full bg-[#171717]"
                        style={{ opacity }}
                      />
                    );
                  })}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Activity Heatmap */}
        <div className="border-t border-[#E5E5E5] pt-6">
          <h3 className="text-[13px] font-semibold text-[#525252] uppercase mb-3">Activity</h3>
          <div className="bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg p-4 mb-4">
            <div className="flex gap-0.5 overflow-x-auto mb-4">
              {Array.from({ length: 52 }, (_, weekIndex) => {
                // Start from beginning of year
                const startOfYear = new Date(year, 0, 1);
                const startOfWeek = new Date(startOfYear);
                startOfWeek.setDate(startOfYear.getDate() - startOfYear.getDay() + (weekIndex * 7));
                
                return (
                  <div key={weekIndex} className="flex flex-col gap-0.5">
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const currentDay = new Date(startOfWeek);
                      currentDay.setDate(startOfWeek.getDate() + dayIndex);
                      
                      // Only show if in current year
                      if (currentDay.getFullYear() !== year) {
                        return (
                          <div
                            key={dayIndex}
                            className="w-2 h-2 rounded-sm bg-[#171717]"
                            style={{ opacity: 0.05 }}
                          />
                        );
                      }
                      
                      const dateKey = `${currentDay.getFullYear()}-${currentDay.getMonth()}-${currentDay.getDate()}`;
                      const entryCount = entriesPerDay.get(dateKey) || 0;
                      const opacity = entryCount === 0 ? 0.1 : entryCount === 1 ? 0.3 : entryCount === 2 ? 0.6 : 1;
                      
                      return (
                        <div
                          key={dayIndex}
                          className="w-2 h-2 rounded-sm bg-[#171717]"
                          style={{ opacity }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="text-center">
              <p className="text-[15px] text-[#525252]">
                {yearEntries.length} entries in {year}
              </p>
              <p className="text-[15px] text-[#525252]">
                {Math.round((daysWithEntries / 365) * 100)}% of days
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="px-5 pt-8 pb-6"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold mb-6 text-[#171717]">Calendar</h1>
        
        {/* View Mode Selector */}
        <div className="flex gap-2 mb-6">
          {(['week', 'month', 'year'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-5 py-2 rounded-lg text-[15px] font-medium transition-all ${
                viewMode === mode
                  ? 'bg-[#171717] text-[#FAFAF9]'
                  : 'bg-[#F5F5F4] text-[#525252]'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate('prev')}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#F5F5F4] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#171717]" />
          </button>
          <h2 className="text-[22px] font-semibold text-[#171717]">
            {viewMode === 'week'
              ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : viewMode === 'month'
              ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateDate('next')}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#F5F5F4] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#171717]" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'year' && renderYearView()}
    </motion.div>
  );
}
