import { useState, useRef, useEffect } from 'react';
import VoiceButton from './components/VoiceButton';
import Confirmation from './components/Confirmation';
import History from './components/History';
import OnboardingWizard from './components/OnboardingWizard';
import SettingsModal from './components/SettingsModal';
import { sendVoiceRequest, confirmAction, VoiceResponse } from './api/client';

interface HistoryItem {
  transcript: string;
  agent_response: string;
  timestamp: string;
}

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<VoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check onboarding status on mount
  useEffect(() => {
    const onboardingComplete = localStorage.getItem('orbit_onboarding_complete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, []);

  // Initialize audio on first user interaction
  const initializeAudio = () => {
    if (audioRef.current && !audioInitialized) {
      audioRef.current.load();
      setAudioInitialized(true);
    }
  };

  const playAudio = async (audioUrl: string) => {
    if (!audioEnabled || !audioRef.current) return;

    try {
      audioRef.current.src = audioUrl;
      await audioRef.current.play();
      setAudioBlocked(false);
    } catch (err) {
      console.error('Error playing audio:', err);
      setAudioBlocked(true);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setError(null);
      setCurrentResponse(null);

      // Initialize audio on first interaction
      initializeAudio();

      const response = await sendVoiceRequest(audioBlob);
      setCurrentResponse(response);

      // Add to history
      setHistory((prev) => [
        {
          transcript: response.transcript,
          agent_response: response.agent_response,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Play TTS audio if available
      if (response.tts_audio_url) {
        await playAudio(response.tts_audio_url);
      }
    } catch (err) {
      console.error('Error processing voice request:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.log('Full error details:', err);
      setError(`${errorMessage} - Check console (F12) for details`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = async (confirmed: boolean, modification?: string) => {
    if (!currentResponse) return;

    try {
      setIsProcessing(true);
      setError(null);

      const response = await confirmAction({
        request_id: currentResponse.request_id,
        confirmed,
        modification,
      });

      // Add to history
      setHistory((prev) => [
        {
          transcript: modification || (confirmed ? 'Confirmed' : 'Cancelled'),
          agent_response: response.message,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Play TTS audio if available
      if (response.tts_audio_url) {
        await playAudio(response.tts_audio_url);
      }

      // Clear current response
      setCurrentResponse(null);
    } catch (err) {
      console.error('Error confirming action:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12 relative">
          {/* Settings Icon (top right) */}
          <button
            onClick={() => setShowSettings(true)}
            className="absolute top-0 right-0 p-2 text-gray-600 hover:text-gray-900 transition-colors"
            title="Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orbit</h1>
          <p className="text-gray-600">Your Personal Voice Agent</p>
          <p className="text-sm text-gray-500 mt-2 italic">Try saying: "Hi Orbit, can you hear me?"</p>
        </header>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Voice Button */}
          <div className="flex flex-col items-center">
            <VoiceButton
              onRecordingComplete={handleRecordingComplete}
              disabled={isProcessing}
            />

            {isProcessing && (
              <div className="mt-4 flex items-center gap-2 text-gray-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            )}
          </div>

          {/* Audio Toggle */}
          <div className="flex justify-center">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              <span className="text-sm">
                {audioEnabled ? '🔊 Audio On' : '🔇 Audio Off'}
              </span>
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Audio Blocked Warning */}
          {audioBlocked && audioEnabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm mb-2">
                🔇 Audio playback was blocked by your browser. Click below to play:
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

          {/* Current Response */}
          {currentResponse && (
            <div className="bg-white rounded-lg p-6 shadow-md space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">You said:</div>
                <div className="text-gray-900 font-medium">{currentResponse.transcript}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Orbit:</div>
                <div className="text-gray-700">{currentResponse.agent_response}</div>
              </div>
              {currentResponse.tts_audio_url && (
                <button
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  onClick={() => currentResponse.tts_audio_url && playAudio(currentResponse.tts_audio_url)}
                >
                  🔊 Replay Audio
                </button>
              )}
            </div>
          )}

          {/* Confirmation Dialog */}
          {currentResponse?.proposed_action && (
            <Confirmation
              requestId={currentResponse.request_id}
              proposedAction={currentResponse.proposed_action}
              onConfirm={handleConfirmAction}
            />
          )}

          {/* History */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">History</h2>
            <History items={history} />
          </div>
        </div>

        {/* Hidden audio element for TTS playback */}
        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
}

export default App;
