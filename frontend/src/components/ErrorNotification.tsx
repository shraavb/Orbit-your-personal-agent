import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  duration?: number; // Auto-dismiss timeout (ms), undefined = manual only
}

interface ErrorNotificationProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  nightMode: boolean;
}

// Extract the most user-friendly part of an error message
const extractUserFriendlyMessage = (message: string): string => {
  // Check if message looks like a technical ID or JSON (starts with quote, underscore, or looks like req_xxx)
  const looksLikeTechnicalError = /^['"`{]?[a-z]+_[A-Z0-9a-z]{20,}['"`}]?/.test(message);

  if (looksLikeTechnicalError) {
    // This is a technical error ID - provide a generic friendly message
    return "Something went wrong. Please try again or check your message.";
  }

  // Check for Agent/API error patterns
  if (message.includes('Agent error') || message.includes('request_id') || message.includes('Internal server error')) {
    // Extract any meaningful message before the technical part
    const beforeError = message.split('Agent error')[0].split('request_id')[0].trim();
    if (beforeError && beforeError.length > 10) {
      return beforeError;
    }
    return "I encountered an issue processing your request. Please try again.";
  }

  // If the message contains multiple parts separated by colons,
  // take the last part which is usually the most user-friendly
  const parts = message.split(':').map(p => p.trim());

  // Filter out parts that look like technical IDs or error patterns
  const meaningfulParts = parts.filter(p => {
    const isTechnical = (
      p.length < 10 ||
      /^[A-Z0-9_]{10,}/.test(p) ||
      p.startsWith('req_') ||
      p.startsWith('err_') ||
      p.includes('request_id') ||
      p.includes('Internal server error')
    );
    return !isTechnical && p.length > 20;
  });

  if (meaningfulParts.length > 0) {
    // Return the last meaningful part
    return meaningfulParts[meaningfulParts.length - 1];
  }

  // If no meaningful parts found, check if the original message makes sense
  if (message.length < 10 || /^[A-Z0-9_]{10,}/.test(message)) {
    return "Something went wrong. Please try again.";
  }

  // Return the last part or original message, but clean it up
  const cleanMessage = parts[parts.length - 1] || message;
  // Remove any trailing JSON or technical patterns
  return cleanMessage.replace(/\s*[{}\[\]"].*$/, '').trim() || "Something went wrong. Please try again.";
};

export default function ErrorNotification({
  notifications,
  onDismiss,
  nightMode
}: ErrorNotificationProps) {
  // Auto-dismiss logic
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    notifications.forEach((notification) => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          onDismiss(notification.id);
        }, notification.duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, onDismiss]);

  // Play notification sound
  const playNotificationSound = (type: Notification['type']) => {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case 'error':
          // Error: Descending tone (negative)
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
          break;

        case 'warning':
          // Warning: Double beep
          oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;

        case 'success':
          // Success: Ascending tone (positive)
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
          break;

        case 'info':
          // Info: Soft single beep
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.12);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.12);
          break;
      }
    } catch (error) {
      // Silently fail if Web Audio API is not available
      console.warn('Could not play notification sound:', error);
    }
  };

  // Color schemes by notification type
  const getColorScheme = (type: Notification['type'], nightMode: boolean) => {
    if (nightMode) {
      switch (type) {
        case 'error':
          return {
            bg: 'bg-red-900/90',
            border: 'border-red-700',
            text: 'text-red-100',
            icon: 'text-red-300',
          };
        case 'warning':
          return {
            bg: 'bg-yellow-900/90',
            border: 'border-yellow-700',
            text: 'text-yellow-100',
            icon: 'text-yellow-300',
          };
        case 'info':
          return {
            bg: 'bg-blue-900/90',
            border: 'border-blue-700',
            text: 'text-blue-100',
            icon: 'text-blue-300',
          };
        case 'success':
          return {
            bg: 'bg-green-900/90',
            border: 'border-green-700',
            text: 'text-green-100',
            icon: 'text-green-300',
          };
      }
    } else {
      // Day mode (existing colors)
      switch (type) {
        case 'error':
          return {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: 'text-red-600',
          };
        case 'warning':
          return {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-800',
            icon: 'text-yellow-600',
          };
        case 'info':
          return {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-700',
            icon: 'text-blue-600',
          };
        case 'success':
          return {
            bg: 'bg-green-50',
            border: 'border-green-300',
            text: 'text-green-800',
            icon: 'text-green-600',
          };
      }
    }
  };

  // Icon by type
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-3 sm:top-5 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none w-full max-w-md px-3 sm:px-4">
      <AnimatePresence>
        {notifications.map((notification, index) => {
          const colors = getColorScheme(notification.type, nightMode);

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: index * 80, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.95 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
              }}
              className="pointer-events-auto mb-3"
              onAnimationStart={() => {
                // Play sound only on first render (when index is current length - 1)
                if (index === notifications.length - 1) {
                  playNotificationSound(notification.type);
                }
              }}
            >
              <div
                className={`${colors.bg} ${colors.border} border-2 rounded-lg shadow-lg p-4 backdrop-blur-sm`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 ${colors.icon}`}>
                    {getIcon(notification.type)}
                  </div>

                  {/* Message */}
                  <div className={`flex-1 ${colors.text} text-sm font-medium pr-2 line-clamp-2`}>
                    {extractUserFriendlyMessage(notification.message)}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => onDismiss(notification.id)}
                    className={`flex-shrink-0 ${colors.icon} hover:opacity-70 transition-opacity p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2`}
                    aria-label="Dismiss notification"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Progress bar for auto-dismiss */}
                {notification.duration && notification.duration > 0 && (
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: notification.duration / 1000, ease: 'linear' }}
                    className={`h-1 ${colors.icon} rounded-full mt-3 opacity-50`}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
