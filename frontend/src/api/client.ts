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
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorBody.detail || errorBody.message || response.statusText;
    console.error('Voice API Error Response:', errorBody);
    throw new Error(`Voice API error (${response.status}): ${errorMessage}`);
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

// Contact Types
export interface Contact {
  name: string;
  full_name: string;
  sms?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  slack_user_id?: string | null;
  slack_channel?: string | null;
}

export interface ContactCreate {
  name: string;
  full_name: string;
  sms?: string;
  whatsapp?: string;
  email?: string;
  slack_user_id?: string;
  slack_channel?: string;
}

export interface ContactUpdate {
  full_name?: string;
  sms?: string;
  whatsapp?: string;
  email?: string;
  slack_user_id?: string;
  slack_channel?: string;
}

export interface ContactListResponse {
  contacts: Contact[];
  total: number;
}

// Contact API Functions
export async function listContacts(): Promise<ContactListResponse> {
  const response = await fetch(`${API_BASE_URL}/contacts`);
  if (!response.ok) {
    throw new Error(`Failed to fetch contacts: ${response.statusText}`);
  }
  return response.json();
}

export async function getContact(name: string): Promise<Contact> {
  const response = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch contact: ${response.statusText}`);
  }
  return response.json();
}

export async function createContact(contact: ContactCreate): Promise<Contact> {
  const response = await fetch(`${API_BASE_URL}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create contact');
  }
  return response.json();
}

export async function updateContact(name: string, contact: ContactUpdate): Promise<Contact> {
  const response = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update contact');
  }
  return response.json();
}

export async function deleteContact(name: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete contact');
  }
}

export async function searchContacts(query: string): Promise<Contact[]> {
  const response = await fetch(`${API_BASE_URL}/contacts/search/${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`Failed to search contacts: ${response.statusText}`);
  }
  return response.json();
}
