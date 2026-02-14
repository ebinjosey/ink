import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProfileProps {
  onBack: () => void;
}

export function Profile({ onBack }: ProfileProps) {
  const listSections = [
    { 
      title: 'Account', 
      items: [
        { label: 'Name', value: 'Team Ink' },
        { label: 'Email', value: 'team@ink.com' },
      ]
    },
    { 
      title: 'Settings', 
      items: [
        { label: 'Notifications' },
        { label: 'Privacy' },
        { label: 'Data & Storage' },
      ]
    },
    { 
      title: 'About', 
      items: [
        { label: 'Help & Support' },
        { label: 'Terms of Use' },
        { label: 'Privacy Policy' },
      ]
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-[#FFFFFF]"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-[#171717]" strokeWidth={2} />
          <span className="text-[17px] text-[#171717]">Back</span>
        </button>
      </div>

      {/* Avatar Section */}
      <div className="px-5 py-8 text-center border-b border-[#E5E5E5]">
        <div className="w-24 h-24 rounded-full bg-[#F5F5F4] border-2 border-[#E5E5E5] mx-auto mb-4 flex items-center justify-center">
          <span className="text-[32px] font-semibold text-[#A3A3A3]">TI</span>
        </div>
        <h2 className="text-[22px] font-semibold text-[#171717] mb-1">
          Team Ink
        </h2>
        <p className="text-[15px] text-[#525252]">team@ink.com</p>
      </div>

      {/* Sections */}
      <div className="px-5 py-6 space-y-8">
        {listSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + sectionIndex * 0.05, duration: 0.3 }}
          >
            {/* Section Header */}
            <h3 className="text-[13px] font-semibold text-[#525252] uppercase mb-3">
              {section.title}
            </h3>

            {/* List Items */}
            <div className="bg-[#FAFAF9] border border-[#E5E5E5] rounded-lg overflow-hidden">
              {section.items.map((item, itemIndex) => (
                <button
                  key={item.label}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-[#F5F5F4] transition-colors"
                  style={{
                    borderBottom: itemIndex < section.items.length - 1 ? '1px solid #E5E5E5' : 'none',
                  }}
                >
                  <span className="text-[17px] text-[#171717]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.value && (
                      <span className="text-[15px] text-[#525252]">{item.value}</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-[#A3A3A3]" strokeWidth={2} />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sign Out Button */}
      <div className="px-5 py-8 text-center border-t border-[#E5E5E5]">
        <button className="text-[17px] text-[#FF3B30] font-medium hover:opacity-70 transition-opacity">
          Sign Out
        </button>
      </div>
    </motion.div>
  );
}