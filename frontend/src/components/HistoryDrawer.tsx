import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import History from './History';

interface HistoryItem {
  transcript: string;
  agent_response: string;
  timestamp: string;
}

interface HistoryDrawerProps {
  items: HistoryItem[];
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryDrawer({ items, isOpen, onClose }: HistoryDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Focus management: focus close button when drawer opens
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const closeButton = drawerRef.current.querySelector('button');
      closeButton?.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
            aria-label="Close history drawer"
          />

          {/* Drawer */}
          <motion.aside
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-white shadow-xl z-40 flex flex-col"
            role="complementary"
            aria-label="Conversation history"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Conversation History</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close history drawer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <History items={items} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// History Trigger Button Component
interface HistoryDrawerButtonProps {
  onClick: () => void;
}

export function HistoryDrawerButton({ onClick }: HistoryDrawerButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all z-20"
      aria-label="Open conversation history"
      title="Conversation History"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </button>
  );
}
