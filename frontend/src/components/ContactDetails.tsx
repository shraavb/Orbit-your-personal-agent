import { useState, useEffect } from 'react';

interface ContactDetailsProps {
  contactName: string; // Used for localStorage key
  sms?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  slack_user_id?: string | null;
  slack_channel?: string | null;
  compact?: boolean;
}

export default function ContactDetails({
  contactName,
  sms,
  whatsapp,
  email,
  slack_user_id,
  slack_channel,
  compact = false,
}: ContactDetailsProps) {
  const storageKey = `orbit_contact_privacy_${contactName}`;

  // Load initial state from localStorage (default: masked)
  const [isVisible, setIsVisible] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === 'visible';
  });

  // Persist visibility state to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, isVisible ? 'visible' : 'masked');
  }, [isVisible, storageKey]);

  // Masking functions
  const maskPhone = (phone: string): string => {
    if (phone.length < 4) return '********';
    return '****' + phone.slice(-4);
  };

  const maskEmail = (email: string): string => {
    const parts = email.split('@');
    if (parts.length !== 2) return '********';
    const [local, domain] = parts;
    if (local.length === 0) return '********';
    return local[0] + '****@' + domain;
  };

  const maskSlack = (): string => {
    return '********';
  };

  return (
    <div className={`space-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Toggle Button */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label={isVisible ? 'Hide contact details' : 'Show contact details'}
          aria-pressed={isVisible}
          title={isVisible ? 'Hide details' : 'Show details'}
        >
          {isVisible ? (
            // Eye icon (visible state)
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            // Eye-off icon (masked state)
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
        <span className="text-xs font-medium text-gray-500">
          {isVisible ? 'Visible' : 'Hidden'}
        </span>
      </div>

      {/* Contact Methods */}
      <div className="text-gray-600 space-y-1">
        {sms && (
          <div>
            <span className="font-medium">SMS:</span>{' '}
            {isVisible ? sms : maskPhone(sms)}
          </div>
        )}
        {whatsapp && (
          <div>
            <span className="font-medium">WhatsApp:</span>{' '}
            {isVisible ? whatsapp : maskPhone(whatsapp)}
          </div>
        )}
        {email && (
          <div>
            <span className="font-medium">Email:</span>{' '}
            {isVisible ? email : maskEmail(email)}
          </div>
        )}
        {slack_user_id && (
          <div>
            <span className="font-medium">Slack:</span>{' '}
            {isVisible ? slack_user_id : maskSlack()}
          </div>
        )}
        {slack_channel && (
          <div>
            <span className="font-medium">Channel:</span>{' '}
            {slack_channel} {/* Channels are not masked (public) */}
          </div>
        )}
      </div>
    </div>
  );
}
