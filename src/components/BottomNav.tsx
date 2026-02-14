import { motion } from 'framer-motion';
import { Home, Calendar, Sparkles } from 'lucide-react';
import type { Screen } from '../App';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const navItems = [
    { id: 'home' as Screen, label: 'Home', icon: Home },
    { id: 'calendar' as Screen, label: 'Calendar', icon: Calendar },
    { id: 'insights' as Screen, label: 'Insights', icon: Sparkles },
  ];

  if (currentScreen === 'new-entry' || currentScreen === 'profile') {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-[#E5E5E5]"
      style={{ height: '72px' }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-full px-8">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] relative flex-1"
            >
              <Icon
                className="w-6 h-6 transition-colors"
                style={{
                  color: isActive ? '#171717' : '#A3A3A3',
                }}
                strokeWidth={2}
                fill={isActive && item.id === 'home' ? '#171717' : 'none'}
              />
              <span
                className="text-[13px] font-medium transition-all"
                style={{
                  color: isActive ? '#171717' : '#A3A3A3',
                }}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
