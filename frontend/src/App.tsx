import { useState, useRef, useEffect } from 'react';
import VoiceButton, { VoiceButtonHandle } from './components/VoiceButton';
import OnboardingWizard from './components/OnboardingWizard';
import SettingsModal from './components/SettingsModal';
import AnimatedCharacter, { CharacterState } from './components/AnimatedCharacter';
import FunctionalitiesPanel from './components/FunctionalitiesPanel';
import HistoryDrawer, { HistoryDrawerButton } from './components/HistoryDrawer';
import OnboardingHints from './components/OnboardingHints';
import FloatingConversationCard from './components/FloatingConversationCard';
import ErrorNotification from './components/ErrorNotification';
import { sendVoiceRequest, transcribeVoice, confirmAction, VoiceResponse, CharacterAlignment, getUser } from './api/client';
import { useNotifications } from './hooks/useNotifications';

interface HistoryItem {
  transcript: string;
  agent_response: string;
  timestamp: string;
  actionType?: 'send_sms' | 'send_email' | 'send_whatsapp' | 'send_slack';
  isAction?: boolean;
}

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<VoiceResponse | null>(null);
  const { notifications, addNotification, dismissNotification } = useNotifications();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isQuestioning, setIsQuestioning] = useState(false);
  const [characterState, setCharacterState] = useState<CharacterState>('idle');
  const [currentAlignment, setCurrentAlignment] = useState<CharacterAlignment | undefined>();
  const [showFloatingCard, setShowFloatingCard] = useState(false);
  const [awaitingVoiceModification, setAwaitingVoiceModification] = useState(false);
  const [modificationPreview, setModificationPreview] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [nightMode, setNightMode] = useState(() => {
    const saved = localStorage.getItem('orbit_night_mode');
    return saved === 'true';
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const voiceButtonRef = useRef<VoiceButtonHandle>(null);

  // Check onboarding status and load user name on mount
  useEffect(() => {
    const onboardingComplete = localStorage.getItem('orbit_onboarding_complete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }

    // Load user name from localStorage or API
    const loadUserName = async () => {
      // First check localStorage for quick load
      const savedName = localStorage.getItem('orbit_user_name');
      if (savedName) {
        setUserName(savedName);
      }

      // Then fetch from API to ensure sync
      try {
        const user = await getUser();
        if (user.name) {
          setUserName(user.name);
          localStorage.setItem('orbit_user_name', user.name);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };

    loadUserName();
  }, []);

  // Save night mode preference
  useEffect(() => {
    localStorage.setItem('orbit_night_mode', nightMode.toString());
  }, [nightMode]);

  // Audio event listeners for character state management
  useEffect(() => {
    if (!audioRef.current) return;

    const handlePlay = () => {
      setCharacterState('speaking');
    };

    const handleEnded = () => {
      setCharacterState(isQuestioning ? 'listening' : 'idle');
    };

    const audio = audioRef.current;
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isQuestioning]);

  // Initialize audio on first user interaction
  const initializeAudio = () => {
    if (audioRef.current && !audioInitialized) {
      audioRef.current.load();
      setAudioInitialized(true);
    }
  };

  const playAudio = async (audioUrl: string) => {
    if (!audioEnabled || !audioRef.current) {
      console.log('[App] Audio playback skipped:', { audioEnabled, hasAudioRef: !!audioRef.current });
      return;
    }

    try {
      console.log('[App] Starting audio playback:', audioUrl.substring(0, 50) + '...');
      audioRef.current.src = audioUrl;
      audioRef.current.volume = 1.0; // Ensure volume is max
      audioRef.current.load(); // Force load before play

      // Try to play, handle autoplay blocking gracefully
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        await playPromise;
        console.log('[App] Audio playback started successfully');
        setAudioBlocked(false); // Clear any previous block state
      }
    } catch (err) {
      console.error('[App] Error playing audio:', err);
      setAudioBlocked(true); // Show manual play button
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setCharacterState('thinking');

      // Initialize audio on first interaction
      initializeAudio();

      // Check if this is a voice modification BEFORE sending to backend
      if (awaitingVoiceModification && currentResponse) {
        // Use transcription-only endpoint (don't process through agent)
        const { transcript } = await transcribeVoice(audioBlob);
        setAwaitingVoiceModification(false);
        setModificationPreview(transcript);
        setIsProcessing(false);
        setCharacterState('idle');
        return;
      }

      const response = await sendVoiceRequest(audioBlob);

      setCurrentResponse(response);
      setAwaitingVoiceModification(false);  // Clear flag when new response arrives

      // Store alignment data for lip-sync
      console.log('[App] Voice response received:', {
        hasAlignment: !!response.tts_alignment,
        alignmentChars: response.tts_alignment?.characters?.length,
        hasTtsUrl: !!response.tts_audio_url,
        hasProposedAction: !!response.proposed_action,
      });

      if (response.tts_alignment) {
        console.log('[App] Setting alignment data:', response.tts_alignment);
        setCurrentAlignment(response.tts_alignment);
      } else {
        console.warn('[App] No alignment data in response!');
      }

      // NEW: Check if agent is asking a question (questioning mode)
      const isQuestion = !response.proposed_action && response.agent_response.includes('?');
      if (isQuestion) {
        setIsQuestioning(true);
        setCharacterState('listening');
      } else {
        setIsQuestioning(false);
      }

      // Show floating card if there's an action OR if agent is asking a question
      const shouldShowCard = !!(response.proposed_action || isQuestion);
      console.log('[App] Card visibility decision:', {
        hasProposedAction: !!response.proposed_action,
        isQuestion,
        shouldShowCard,
        actionType: response.proposed_action?.action_type
      });
      setShowFloatingCard(shouldShowCard);

      // Do NOT add to history here - only add after confirmation

      // Play TTS audio if available
      if (response.tts_audio_url) {
        setCharacterState('speaking');
        await playAudio(response.tts_audio_url);
      }
    } catch (err) {
      console.error('Error processing voice request:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.log('Full error details:', err);
      // Log original error for debugging
      console.error('Original error message:', errorMessage);
      addNotification(errorMessage, 'error', 7000);
      setCharacterState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = async (confirmed: boolean, modification?: string) => {
    if (!currentResponse) return;

    try {
      setIsProcessing(true);
      setCharacterState('thinking');

      const response = await confirmAction({
        request_id: currentResponse.request_id,
        confirmed,
        modification,
      });

      // Store alignment for confirmation response
      console.log('[App] Confirmation response received:', {
        hasAlignment: !!response.tts_alignment,
        alignmentChars: response.tts_alignment?.characters?.length,
      });

      if (response.tts_alignment) {
        console.log('[App] Setting confirmation alignment data:', response.tts_alignment);
        setCurrentAlignment(response.tts_alignment);
      } else {
        console.warn('[App] No alignment data in confirmation response!');
      }

      // Add to history only if action was confirmed (not cancelled or modified without confirmation)
      if (confirmed && currentResponse.proposed_action) {
        setHistory((prev) => [
          {
            transcript: modification || 'Confirmed',
            agent_response: response.message,
            timestamp: new Date().toISOString(),
            actionType: currentResponse.proposed_action.action_type,
            isAction: true,
          },
          ...prev,
        ]);
      }

      // Play TTS audio if available
      if (response.tts_audio_url) {
        setCharacterState('speaking');
        await playAudio(response.tts_audio_url);
      }

      // Clear current response and hide card
      setCurrentResponse(null);
      setShowFloatingCard(false);
      setAwaitingVoiceModification(false);  // Ensure flag is cleared
      setModificationPreview(null);  // Clear preview
    } catch (err) {
      console.error('Error confirming action:', err);
      addNotification(err instanceof Error ? err.message : 'An error occurred', 'error', 7000);
      setCharacterState('idle');
      setAwaitingVoiceModification(false);  // Clear flag on error
      setModificationPreview(null);  // Clear preview on error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceModification = () => {
    // Set flag to indicate next voice input is a modification
    setAwaitingVoiceModification(true);

    // Auto-trigger voice recording
    if (voiceButtonRef.current) {
      voiceButtonRef.current.startRecording();
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      nightMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950'
        : 'bg-gradient-to-br from-blue-50 to-purple-50'
    }`}>
      {/* Day mode subtle light effects */}
      {!nightMode && (
        <>
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Subtle light particles */}
            {[...Array(window.innerWidth < 768 ? 15 : 30)].map((_, i) => {
              const size = Math.random() * 2 + 1;
              return (
                <div
                  key={`particle-${i}`}
                  className="absolute rounded-full bg-blue-200"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.3 + 0.2,
                    boxShadow: `0 0 ${Math.random() * 4 + 2}px rgba(191, 219, 254, 0.4)`,
                    animation: `pulse ${Math.random() * 6 + 4}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 3}s`,
                  }}
                />
              );
            })}
          </div>
          {/* Ambient light gradient */}
          <div className="fixed inset-0 pointer-events-none opacity-10 z-0">
            <div className="absolute top-0 right-0 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] bg-blue-300 rounded-full filter blur-[60px] sm:blur-[100px] md:blur-[150px]"></div>
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] bg-purple-200 rounded-full filter blur-[60px] sm:blur-[100px] md:blur-[150px]"></div>
          </div>
        </>
      )}

      {/* Starfield effect for night mode */}
      {nightMode && (
        <>
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Large white stars with glow */}
            {[...Array(window.innerWidth < 768 ? 20 : 40)].map((_, i) => {
              const size = Math.random() * 3 + 2;
              const glow = Math.random() * 8 + 4;
              return (
                <div
                  key={`star-white-${i}`}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.4 + 0.6,
                    boxShadow: `0 0 ${glow}px ${glow/2}px rgba(255, 255, 255, 0.9), 0 0 ${glow*2}px rgba(255, 255, 255, 0.5)`,
                    animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 3}s`,
                  }}
                />
              );
            })}
            {/* Small white stars */}
            {[...Array(window.innerWidth < 768 ? 50 : 100)].map((_, i) => (
              <div
                key={`star-small-${i}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: '2px',
                  height: '2px',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.4,
                  animation: `pulse ${Math.random() * 4 + 3}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}
            {/* Blue glowing stars */}
            {[...Array(window.innerWidth < 768 ? 12 : 25)].map((_, i) => {
              const size = Math.random() * 3 + 2;
              const glow = Math.random() * 12 + 6;
              return (
                <div
                  key={`star-blue-${i}`}
                  className="absolute rounded-full bg-blue-400"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.4 + 0.5,
                    boxShadow: `0 0 ${glow}px ${glow/2}px rgba(96, 165, 250, 0.8), 0 0 ${glow*2}px rgba(96, 165, 250, 0.4)`,
                    animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 3}s`,
                  }}
                />
              );
            })}
          </div>
          {/* Subtle nebula/aurora effect */}
          <div className="fixed inset-0 pointer-events-none opacity-15 z-0">
            <div className="absolute top-0 left-1/4 w-[200px] h-[200px] sm:w-[350px] sm:h-[350px] md:w-[500px] md:h-[500px] bg-blue-600 rounded-full filter blur-[50px] sm:blur-[80px] md:blur-[120px]"></div>
            <div className="absolute bottom-0 right-1/4 w-[200px] h-[200px] sm:w-[350px] sm:h-[350px] md:w-[500px] md:h-[500px] bg-cyan-600 rounded-full filter blur-[50px] sm:blur-[100px] md:blur-[140px]"></div>
          </div>
        </>
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => {
          setShowOnboarding(false);
          // Reload user name after onboarding
          const savedName = localStorage.getItem('orbit_user_name');
          if (savedName) {
            setUserName(savedName);
          }
        }} />
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Top Right Controls */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 flex gap-2 z-10">
        {/* Night Mode Toggle */}
        <button
          onClick={() => setNightMode(!nightMode)}
          className={`p-2.5 sm:p-3 transition-colors rounded-full shadow-md hover:shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${
            nightMode
              ? 'bg-slate-800 text-blue-300 hover:text-blue-200'
              : 'bg-white text-gray-600 hover:text-gray-900'
          }`}
          title={nightMode ? 'Day Mode' : 'Night Mode'}
        >
          {nightMode ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Settings Icon */}
        <button
          onClick={() => setShowSettings(true)}
          className={`p-2.5 sm:p-3 transition-colors rounded-full shadow-md hover:shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${
            nightMode
              ? 'bg-slate-800 text-gray-300 hover:text-gray-200'
              : 'bg-white text-gray-600 hover:text-gray-900'
          }`}
          title="Settings"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full flex flex-col items-center min-h-screen relative z-10">
        {/* Spacer to push character down - ensures everything fits in viewport */}
        <div style={{ height: '3vh' }}></div>

        {/* Main Character */}
        <div className="flex justify-center items-center mb-6">
          <AnimatedCharacter
            state={characterState}
            audioElement={audioRef.current}
            alignment={currentAlignment}
          />
        </div>

        {/* Functionalities Panel */}
        <FunctionalitiesPanel />

        {/* Header Text */}
        <header className="text-center mb-4 sm:mb-6 px-4">
          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 flex items-center justify-center transition-colors ${
            nightMode ? 'text-white' : 'text-gray-900'
          }`}>
            Orbit
            <OnboardingHints onShowOnboarding={() => setShowOnboarding(true)} />
          </h1>
          <p className={`text-base sm:text-lg md:text-xl mb-2 transition-colors ${
            nightMode ? 'text-blue-100' : 'text-gray-600'
          }`}>
            {userName ? `${userName}'s Personal Voice Agent` : 'Your Personal Voice Agent'}
          </p>
          <p className={`text-xs sm:text-sm italic transition-colors ${
            nightMode ? 'text-gray-300' : 'text-gray-500'
          }`}>Try saying: "Hi Orbit, can you hear me?"</p>
        </header>

        {/* Main Content */}
        <div className="w-full max-w-3xl space-y-12 mb-16">
          {/* Voice Button */}
          <div className="flex flex-col items-center">
            <VoiceButton
              ref={voiceButtonRef}
              onRecordingComplete={handleRecordingComplete}
              disabled={isProcessing}
            />

            {isProcessing && (
              <div className={`mt-4 flex items-center gap-2 ${
                nightMode ? 'text-gray-200' : 'text-gray-600'
              }`}>
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            )}

            {awaitingVoiceModification && !isProcessing && (
              <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border ${
                nightMode
                  ? 'text-blue-200 bg-blue-900/50 border-blue-700'
                  : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">🎤 Speak your modification now</span>
              </div>
            )}
          </div>

          {/* Audio Toggle */}
          <div className="flex justify-center">
            <button
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                nightMode
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-gray-100'
                  : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-900'
              }`}
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              <span className="text-sm">
                {audioEnabled ? '🔊 Audio On' : '🔇 Audio Off'}
              </span>
            </button>
          </div>

          {/* Audio Blocked Warning */}
          {audioBlocked && audioEnabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm mb-2">
                🔇 Audio playback was blocked by your browser. Click the button to play:
              </p>
              <button
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                onClick={() => {
                  if (currentResponse?.tts_audio_url) {
                    playAudio(currentResponse.tts_audio_url);
                  }
                }}
              >
                ▶️ Play Audio Response
              </button>
            </div>
          )}

        </div>

        {/* Hidden audio element for TTS playback */}
        <audio ref={audioRef} className="hidden" />
      </div>

      {/* History Drawer Button */}
      <HistoryDrawerButton onClick={() => setShowHistoryDrawer(true)} />

      {/* History Drawer */}
      <HistoryDrawer
        items={history}
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
      />

      {/* Floating Conversation Card */}
      <FloatingConversationCard
        isOpen={showFloatingCard}
        currentResponse={currentResponse}
        isQuestioning={isQuestioning}
        isProcessing={isProcessing}
        awaitingVoiceModification={awaitingVoiceModification}
        modificationPreview={modificationPreview}
        onClose={() => {
          setShowFloatingCard(false);
          setAwaitingVoiceModification(false);  // Clear modification flag
          setModificationPreview(null);  // Clear preview
        }}
        onReplayAudio={() => {
          if (currentResponse?.tts_audio_url) {
            playAudio(currentResponse.tts_audio_url);
          }
        }}
        onConfirm={handleConfirmAction}
        onVoiceModification={handleVoiceModification}
      />

      {/* Error Notification System */}
      <ErrorNotification
        notifications={notifications}
        onDismiss={dismissNotification}
        nightMode={nightMode}
      />
    </div>
  );
}

export default App;
