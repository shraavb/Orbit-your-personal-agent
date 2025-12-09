import { useState, useRef, useEffect } from 'react';
import VoiceButton from './components/VoiceButton';
import Confirmation from './components/Confirmation';
import History from './components/History';
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
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setError(null);
      setCurrentResponse(null);

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

      // Play TTS audio if available and enabled
      if (response.tts_audio_url && audioEnabled && audioRef.current) {
        audioRef.current.src = response.tts_audio_url;
        audioRef.current.play().catch((err) => {
          console.error('Error playing audio:', err);
        });
      }
    } catch (err) {
      console.error('Error processing voice request:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
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
      if (response.tts_audio_url && audioEnabled && audioRef.current) {
        audioRef.current.src = response.tts_audio_url;
        audioRef.current.play().catch((err) => {
          console.error('Error playing audio:', err);
        });
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orbit</h1>
          <p className="text-gray-600">Your Personal Voice Agent</p>
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
