/**
 * API client for communicating with the Orbit backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface VoiceResponse {
  request_id: number;
  transcript: string;
  agent_response: string;
  tts_audio_url?: string;
  proposed_action?: {
    action_type: string;
    parameters: Record<string, any>;
    confirmation_message: string;
  };
  status: string;
}

export interface ConfirmActionRequest {
  request_id: number;
  confirmed: boolean;
  modification?: string;
}

export interface ConfirmActionResponse {
  request_id: number;
  status: string;
  message: string;
  tts_audio_url?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

/**
 * Send voice recording to backend for processing.
 */
export async function sendVoiceRequest(audioBlob: Blob): Promise<VoiceResponse> {
  // Convert blob to base64
  const reader = new FileReader();
  const base64Audio = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const response = await fetch(`${API_BASE_URL}/voice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_data: base64Audio,
      audio_format: 'webm',
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Confirm or cancel a proposed action.
 */
export async function confirmAction(request: ConfirmActionRequest): Promise<ConfirmActionResponse> {
  const response = await fetch(`${API_BASE_URL}/voice/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Health check endpoint.
 */
export async function healthCheck(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
