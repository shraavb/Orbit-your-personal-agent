import { useState, useRef, forwardRef, useImperativeHandle } from 'react';

interface VoiceButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export interface VoiceButtonHandle {
  startRecording: () => void;
}

const VoiceButton = forwardRef<VoiceButtonHandle, VoiceButtonProps>(({ onRecordingComplete, disabled }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Expose startRecording method to parent via ref
  useImperativeHandle(ref, () => ({
    startRecording: () => {
      if (!disabled && !isRecording) {
        startRecording();
      }
    }
  }));

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMouseDown = () => {
    if (!disabled) {
      startRecording();
    }
  };

  const handleMouseUp = () => {
    if (!disabled) {
      stopRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full font-semibold text-white transition-all shadow-lg ${
          isRecording
            ? 'bg-red-500 scale-110 animate-pulse'
            : disabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled}
      >
        {isRecording ? 'Recording...' : 'Hold to Talk'}
      </button>

      {error && (
        <p className="text-red-500 text-sm text-center max-w-xs">{error}</p>
      )}

      {isRecording && (
        <div className="flex gap-2 items-center text-gray-600">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm">Listening...</span>
        </div>
      )}
    </div>
  );
});

VoiceButton.displayName = 'VoiceButton';

export default VoiceButton;
