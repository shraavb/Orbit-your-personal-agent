/**
 * API client for communicating with the Orbit backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface ProposedAction {
  action_type: 'send_sms' | 'send_email' | 'send_whatsapp' | 'send_slack';
  parameters: {
    recipient_name?: string;      // For all actions
    recipient_phone?: string;     // For SMS/WhatsApp
    message: string;               // For all actions
    subject?: string;              // For email
    body?: string;                 // For email
    user_id?: string;              // For Slack DM
    channel_id?: string;           // For Slack channel
    is_channel?: boolean;          // For Slack
  };
  confirmation_message: string;
}

export interface VoiceResponse {
  request_id: number;
  transcript: string;
  agent_response: string;
  tts_audio_url?: string;
  tts_alignment?: CharacterAlignment;
  proposed_action?: ProposedAction;
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
  tts_alignment?: CharacterAlignment;
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
    // Throw just the plain error message - no "Voice API error (XXX):" prefix
    throw new Error(errorMessage);
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

// User Types
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface UpdateUserRequest {
  name: string;
}

// User API Functions
export async function getUser(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/user`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  return response.json();
}

export async function updateUser(request: UpdateUserRequest): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/user`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user');
  }
  return response.json();
}
