import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceResponse } from '../api/client';

interface FloatingConversationCardProps {
  isOpen: boolean;
  currentResponse: VoiceResponse | null;
  isQuestioning: boolean;
  isProcessing: boolean;
  awaitingVoiceModification: boolean;
  modificationPreview?: string | null;
  onClose: () => void;
  onReplayAudio: () => void;
  onConfirm: (confirmed: boolean, modification?: string) => void;
  onVoiceModification: () => void; // Trigger to start voice recording for modification
}

export default function FloatingConversationCard({
  isOpen,
  currentResponse,
  isQuestioning,
  isProcessing,
  awaitingVoiceModification,
  modificationPreview,
  onClose,
  onReplayAudio,
  onConfirm,
  onVoiceModification,
}: FloatingConversationCardProps) {
  const [textModification, setTextModification] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewModification, setPreviewModification] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragConstraints, setDragConstraints] = useState({
    top: 0,
    left: 0,
    right: window.innerWidth - 320,
    bottom: window.innerHeight - 300
  });

  // Load position from localStorage on mount
  useEffect(() => {
    const getDefaultPosition = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Center on mobile
        return {
          x: window.innerWidth / 2 - 160, // Half of min mobile width
          y: 60 // Below header
        };
      } else {
        // Right side on desktop
        return {
          x: window.innerWidth - 420,
          y: window.innerHeight / 2 - 200
        };
      }
    };

    const saved = localStorage.getItem('orbit_card_position');
    if (saved) {
      try {
        const savedPosition = JSON.parse(saved);
        setPosition(savedPosition);
      } catch (e) {
        setPosition(getDefaultPosition());
      }
    } else {
      setPosition(getDefaultPosition());
    }

    // Reset position on window resize for mobile/desktop switch
    const handleResize = () => {
      const saved = localStorage.getItem('orbit_card_position');
      if (!saved) {
        setPosition(getDefaultPosition());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update drag constraints responsively
  useEffect(() => {
    const updateConstraints = () => {
      const isMobile = window.innerWidth < 768;
      const cardWidth = isMobile ? window.innerWidth * 0.9 : 384;

      setDragConstraints({
        top: 0,
        left: 0,
        right: Math.max(0, window.innerWidth - cardWidth),
        bottom: Math.max(0, window.innerHeight - 300)
      });
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, []);

  // Sync preview when voice modification preview arrives
  useEffect(() => {
    if (modificationPreview) {
      setPreviewModification(modificationPreview);
      setPreviewMode(true);
      setShowTextInput(false); // Close text input if open
    }
  }, [modificationPreview]);

  if (!isOpen || !currentResponse) return null;

  // Play confirmation sound based on action type
  const playConfirmationSound = () => {
    if (!actionType) return;

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different sounds for different actions
    switch (actionType) {
      case 'send_sms':
        // SMS: Quick beep (notification sound)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
        break;

      case 'send_email':
        // Email: "Whoosh" send sound
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.25);
        break;

      case 'send_whatsapp':
        // WhatsApp: Double beep
        oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.08);

        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.setValueAtTime(900, audioContext.currentTime);
          gain2.gain.setValueAtTime(0.25, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.08);
        }, 100);
        break;

      case 'send_slack':
        // Slack: Plop sound
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.18);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.18);
        break;
    }
  };

  const handleConfirmClick = () => {
    playConfirmationSound();
    onConfirm(true);
    setTextModification('');
    setShowTextInput(false);
    onClose(); // Close immediately
  };

  const handleCancelClick = () => {
    onConfirm(false);
    setTextModification('');
    setShowTextInput(false);
    onClose(); // Close immediately
  };

  const handleModifyClick = () => {
    if (textModification.trim()) {
      // Show preview instead of confirming immediately
      setPreviewModification(textModification);
      setPreviewMode(true);
      setShowTextInput(false); // Hide text input when showing preview
    }
  };

  const confirmPreview = () => {
    playConfirmationSound();
    onConfirm(true, previewModification);
    setPreviewMode(false);
    setPreviewModification('');
    setTextModification('');
    onClose();
  };

  const editMore = () => {
    // Return to edit mode with preview text
    setTextModification(previewModification);
    setShowTextInput(true);
    setPreviewMode(false);
  };

  const cancelPreview = () => {
    setPreviewMode(false);
    setPreviewModification('');
    setTextModification('');
  };

  // Get action type for color coding
  const actionType = currentResponse?.proposed_action?.action_type;

  // Color schemes by action type
  const getColorScheme = () => {
    if (!actionType) return { bg: 'bg-white', border: 'border-gray-200', accent: 'bg-gray-500' };

    switch (actionType) {
      case 'send_sms':
        return { bg: 'bg-green-50', border: 'border-green-300', accent: 'bg-green-500' };
      case 'send_email':
        return { bg: 'bg-blue-50', border: 'border-blue-300', accent: 'bg-blue-500' };
      case 'send_whatsapp':
        return { bg: 'bg-emerald-50', border: 'border-emerald-300', accent: 'bg-emerald-500' };
      case 'send_slack':
        return { bg: 'bg-purple-50', border: 'border-purple-300', accent: 'bg-purple-500' };
      default:
        return { bg: 'bg-white', border: 'border-gray-200', accent: 'bg-gray-500' };
    }
  };

  const colorScheme = getColorScheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={dragConstraints}
          initial={{ x: position.x, y: position.y, opacity: 0 }}
          animate={{ x: position.x, y: position.y, opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
          onDragEnd={(_event, info) => {
            const newPosition = { x: info.point.x, y: info.point.y };
            setPosition(newPosition);
            localStorage.setItem('orbit_card_position', JSON.stringify(newPosition));
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed w-[90vw] sm:w-96 md:w-[400px] max-w-[90vw] z-30 cursor-grab active:cursor-grabbing"
          style={{ x: position.x, y: position.y }}
        >
          <div
            className={`rounded-lg shadow-2xl border-2 ${
              isQuestioning
                ? 'bg-blue-50 border-blue-300'
                : `${colorScheme.bg} ${colorScheme.border}`
            }`}
          >
            {/* Drag Handle */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing flex justify-center">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header with Close Button */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 ${colorScheme.accent} rounded-full`}></div>
                <span className="text-xs font-medium text-gray-600">
                  {isQuestioning ? 'Waiting for response...' : actionType ? actionType.replace('send_', '').toUpperCase() : 'Conversation'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close conversation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-4 py-3 space-y-3">
              {/* Transcript */}
              <div>
                <div className="text-xs text-gray-500 mb-1">You said:</div>
                <div className="text-sm text-gray-900 font-medium break-words">{currentResponse.transcript}</div>
              </div>

              {/* Agent Response */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Orbit:</div>
                <div className="text-sm text-gray-700 break-words">{currentResponse.agent_response}</div>
              </div>

              {/* Questioning Mode Indicator */}
              {isQuestioning && (
                <div className="flex items-center gap-2 text-blue-700 text-xs font-medium pt-2 border-t border-blue-200">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Click the microphone to answer</span>
                </div>
              )}

              {/* Replay Audio Button */}
              {currentResponse.tts_audio_url && (
                <button
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  onClick={onReplayAudio}
                >
                  🔊 Replay Audio
                </button>
              )}

              {/* Voice Modification Indicator */}
              {awaitingVoiceModification && (
                <div className="flex items-center gap-2 text-blue-700 text-xs font-medium pt-2 border-t border-blue-200">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Speak now to modify this action</span>
                </div>
              )}

              {/* Confirmation Section */}
              {currentResponse.proposed_action && (
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-yellow-900 mb-1">
                      Proposed Action:
                    </div>
                    <div className="text-sm text-yellow-800 break-words">
                      {currentResponse.proposed_action.action_type === 'send_sms' && (
                        <>
                          Send SMS to{' '}
                          <span className="font-semibold">
                            {currentResponse.proposed_action.parameters.recipient_name}
                          </span>
                          : "{currentResponse.proposed_action.parameters.message}"
                        </>
                      )}
                      {currentResponse.proposed_action.action_type === 'send_email' && (
                        <>
                          Send email to{' '}
                          <span className="font-semibold">
                            {currentResponse.proposed_action.parameters.recipient_name}
                          </span>
                          <br />
                          Subject: {currentResponse.proposed_action.parameters.subject}
                          <br />
                          Message: "{currentResponse.proposed_action.parameters.body || currentResponse.proposed_action.parameters.message}"
                        </>
                      )}
                      {currentResponse.proposed_action.action_type === 'send_whatsapp' && (
                        <>
                          Send WhatsApp to{' '}
                          <span className="font-semibold">
                            {currentResponse.proposed_action.parameters.recipient_name}
                          </span>
                          : "{currentResponse.proposed_action.parameters.message}"
                        </>
                      )}
                      {currentResponse.proposed_action.action_type === 'send_slack' && (
                        <>
                          Send Slack message to{' '}
                          <span className="font-semibold">
                            {currentResponse.proposed_action.parameters.is_channel
                              ? `#${currentResponse.proposed_action.parameters.channel_id}`
                              : currentResponse.proposed_action.parameters.recipient_name}
                          </span>
                          : "{currentResponse.proposed_action.parameters.message}"
                        </>
                      )}
                    </div>
                  </div>

                  {/* Modification Preview */}
                  {previewMode && (
                    <div className="mt-3 pt-3 border-t border-green-200 space-y-3">
                      <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                        <div className="text-xs font-medium text-green-900 mb-2 flex items-center gap-2">
                          <span>✓</span>
                          <span>Modified Action Preview:</span>
                        </div>
                        <div className="text-sm text-green-800 break-words">
                          {currentResponse.proposed_action.action_type === 'send_sms' && (
                            <>
                              Send SMS to{' '}
                              <span className="font-semibold">
                                {currentResponse.proposed_action.parameters.recipient_name}
                              </span>
                              : "{previewModification}"
                            </>
                          )}
                          {currentResponse.proposed_action.action_type === 'send_email' && (
                            <>
                              Send email to{' '}
                              <span className="font-semibold">
                                {currentResponse.proposed_action.parameters.recipient_name}
                              </span>
                              <br />
                              Subject: {currentResponse.proposed_action.parameters.subject}
                              <br />
                              Message: "{previewModification}"
                            </>
                          )}
                          {currentResponse.proposed_action.action_type === 'send_whatsapp' && (
                            <>
                              Send WhatsApp to{' '}
                              <span className="font-semibold">
                                {currentResponse.proposed_action.parameters.recipient_name}
                              </span>
                              : "{previewModification}"
                            </>
                          )}
                          {currentResponse.proposed_action.action_type === 'send_slack' && (
                            <>
                              Send Slack message to{' '}
                              <span className="font-semibold">
                                {currentResponse.proposed_action.parameters.is_channel
                                  ? `#${currentResponse.proposed_action.parameters.channel_id}`
                                  : currentResponse.proposed_action.parameters.recipient_name}
                              </span>
                              : "{previewModification}"
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={confirmPreview}
                          disabled={isProcessing}
                          className="w-full sm:flex-1 sm:min-w-[100px] px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
                        >
                          ✓ Send This
                        </button>

                        <button
                          onClick={editMore}
                          disabled={isProcessing}
                          className="w-full sm:w-auto px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:bg-gray-100 transition-colors text-sm font-medium"
                        >
                          ✏️ Edit More
                        </button>

                        <button
                          onClick={cancelPreview}
                          disabled={isProcessing}
                          className="w-full sm:w-auto px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:bg-gray-100 transition-colors text-sm font-medium"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Text Modification Input (Optional) */}
                  {showTextInput && !previewMode && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={textModification}
                        onChange={(e) => setTextModification(e.target.value)}
                        placeholder="Type your modification..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleModifyClick();
                        }}
                      />
                    </div>
                  )}

                  {/* Action Buttons - Only show when not in preview mode */}
                  {!previewMode && (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={handleConfirmClick}
                          disabled={isProcessing}
                          className="w-full sm:flex-1 sm:min-w-[100px] px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {isProcessing ? 'Processing...' : '✓ Confirm'}
                        </button>

                        <button
                          onClick={onVoiceModification}
                          disabled={isProcessing}
                          className={`w-full sm:w-auto px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                            awaitingVoiceModification
                              ? 'bg-blue-700 text-white ring-2 ring-blue-400 ring-offset-2'  // Active state
                              : 'bg-blue-600 text-white hover:bg-blue-700'  // Inactive state
                          } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                          title="Speak to modify"
                        >
                          {awaitingVoiceModification ? '🎤 Listening...' : '🎤 Modify'}
                        </button>

                        <button
                          onClick={() => setShowTextInput(!showTextInput)}
                          disabled={isProcessing}
                          className={`w-full sm:w-auto px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                            showTextInput
                              ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-2'  // Active state
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'  // Inactive state
                          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                          title="Type to modify"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={handleCancelClick}
                          disabled={isProcessing}
                          className="w-full sm:w-auto px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          ✕ Cancel
                        </button>
                      </div>

                      {showTextInput && textModification.trim() && (
                        <button
                          onClick={handleModifyClick}
                          disabled={isProcessing}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
                        >
                          Send Modified Action
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
