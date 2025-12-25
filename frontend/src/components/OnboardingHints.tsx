import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingHintsProps {
  onShowOnboarding?: () => void;
}

export default function OnboardingHints({ onShowOnboarding }: OnboardingHintsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle outside click (handled by backdrop onClick now)
  // Keep refs for potential future use
  useEffect(() => {
    // Cleanup function for ESC key handler
    return () => {};
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  return (
    <>
      {/* Question Mark Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-7 h-7 ml-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        aria-label="Show quick guide"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Quick Guide"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Modal - rendered via portal to body */}
      {createPortal(
        <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Close quick guide"
            />

            {/* Modal Content */}
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
              role="dialog"
              aria-label="Quick guide"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Quick Guide</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close quick guide"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-5">
                {/* How to use */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">How to use</h4>
                  <ul className="space-y-2.5 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="mr-2 text-gray-400">•</span>
                      <span>Hold the button and speak clearly</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-gray-400">•</span>
                      <span>Review and confirm actions before sending</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-gray-400">•</span>
                      <span>Check the history drawer for past conversations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-gray-400">•</span>
                      <span>Add contacts in settings for quick access</span>
                    </li>
                  </ul>
                </div>

                {/* Example */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Example</p>
                  <p className="text-sm text-gray-900">"Send a text to Mom saying I'll be home at 6pm"</p>
                </div>

                {/* Onboarding Button */}
                {onShowOnboarding && (
                  <button
                    onClick={() => {
                      onShowOnboarding();
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Full Tutorial
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
