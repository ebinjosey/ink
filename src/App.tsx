import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { NewEntry } from './components/NewEntry';
import { Calendar } from './components/Calendar';
import { Insights } from './components/Insights';
import { Profile } from './components/Profile';
import { BottomNav } from './components/BottomNav';

export type Screen = 'home' | 'new-entry' | 'calendar' | 'insights' | 'profile';

export interface JournalEntry {
  id: string;
  date: Date;
  content: string;
  mood?: 'joy' | 'calm' | 'sad' | 'anxious' | 'stressed' | 'motivated' | 'grateful';
  createdAt: Date;
  photos?: string[]; // Array of image URLs
}

// Serializable format for localStorage
interface StoredJournalEntry {
  id: string;
  date: string;
  content: string;
  mood?: 'joy' | 'calm' | 'sad' | 'anxious' | 'stressed' | 'motivated' | 'grateful';
  createdAt: string;
  photos?: string[];
}

// Load entries from localStorage
const loadEntriesFromStorage = (): JournalEntry[] => {
  try {
    const stored = localStorage.getItem('ink_entries');
    if (!stored) return [];
    
    const parsed: StoredJournalEntry[] = JSON.parse(stored);
    return parsed.map(entry => ({
      ...entry,
      date: new Date(entry.date),
      createdAt: new Date(entry.createdAt),
    }));
  } catch (error) {
    console.error('Failed to load entries from localStorage:', error);
    return [];
  }
};

// Save entries to localStorage
const saveEntriesToStorage = (entries: JournalEntry[]): void => {
  try {
    const storable: StoredJournalEntry[] = entries.map(entry => ({
      ...entry,
      date: entry.date.toISOString(),
      createdAt: entry.createdAt.toISOString(),
    }));
    localStorage.setItem('ink_entries', JSON.stringify(storable));
  } catch (error) {
    console.error('Failed to save entries to localStorage:', error);
  }
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  // Load entries from localStorage on mount
  useEffect(() => {
    const loadedEntries = loadEntriesFromStorage();
    setEntries(loadedEntries);
  }, []);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    saveEntriesToStorage(entries);
  }, [entries]);
  const handleNewEntry = async (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    
    // Save to localStorage
    setEntries([newEntry, ...entries]);
    
    // Save to backend database
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch('/api/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: entry.content,
            moodEmoji: entry.mood,
            createdAt: newEntry.createdAt.toISOString(),
          }),
        });
      } catch (err) {
        console.error('Failed to save entry to backend:', err);
      }
    }
    
    setCurrentScreen('home');
  };

  const handleUpdateEntry = async (updatedEntry: JournalEntry) => {
    setEntries(entries.map((entry: JournalEntry) => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    ));
    
    // Save to backend database
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch(`/api/entries/${updatedEntry.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: updatedEntry.content,
            moodEmoji: updatedEntry.mood,
          }),
        });
      } catch (err) {
        console.error('Failed to update entry on backend:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#171717]">
      <main className="pb-20 max-w-md mx-auto">
        {currentScreen === 'home' && (
          <Home 
            onStartEntry={() => setCurrentScreen('new-entry')} 
            onNavigate={setCurrentScreen}
            entries={entries}
            onUpdateEntry={handleUpdateEntry}
          />
        )}
        {currentScreen === 'new-entry' && (
          <NewEntry onSave={handleNewEntry} onCancel={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'calendar' && <Calendar entries={entries} onUpdateEntry={handleUpdateEntry} onNewEntry={handleNewEntry} />}
        {currentScreen === 'insights' && <Insights entries={entries} />}
        {currentScreen === 'profile' && <Profile onBack={() => setCurrentScreen('home')} />}
      </main>
      <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
    </div>
  );
}