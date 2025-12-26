/**
 * Privacy utilities for masking sensitive information in the UI
 */

/**
 * Masks an email address for display
 * Example: "john.doe@example.com" → "j***@e***.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';

  const [localPart, domain] = email.split('@');
  if (!domain) return email; // Invalid email, return as-is

  const maskedLocal = localPart.length > 0 ? localPart[0] + '***' : '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.map((part, idx) => {
    if (idx === domainParts.length - 1) {
      // Keep TLD as-is (.com, .org, etc.)
      return part;
    }
    return part.length > 0 ? part[0] + '***' : '***';
  }).join('.');

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Masks a phone number for display
 * Example: "+15551234567" → "+1***4567"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove all non-digit characters except leading +
  const hasPlus = phone.startsWith('+');
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 4) return phone; // Too short to mask

  // Show country code (if present), mask middle, show last 4 digits
  const last4 = digits.slice(-4);
  const countryCode = hasPlus && digits.length > 10 ? digits.slice(0, 1) : '';

  if (countryCode) {
    return `+${countryCode}***${last4}`;
  } else {
    return `***${last4}`;
  }
}

/**
 * Masks a Slack user ID
 * Example: "U123456789" → "U***89"
 */
export function maskSlackUserId(userId: string | null | undefined): string {
  if (!userId) return '';
  if (userId.length <= 3) return userId;

  return userId[0] + '***' + userId.slice(-2);
}

/**
 * Determines if a contact should be fully visible (e.g., channels can be shown)
 */
export function shouldMaskContact(contact: { is_channel?: boolean }): boolean {
  // Don't mask channel names as they're not personal info
  return !contact.is_channel;
}

/**
 * Masks sensitive information in text (emails and phone numbers)
 * Useful for sanitizing agent responses for demos
 */
export function maskSensitiveText(text: string | null | undefined): string {
  if (!text) return '';
  let masked = text;

  // Mask email addresses
  // Matches: user@example.com, john.doe@company.co.uk, etc.
  masked = masked.replace(
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, local, domain) => {
      const maskedLocal = local.length > 0 ? local[0] + '***' : '***';
      const domainParts = domain.split('.');
      const maskedDomain = domainParts.map((part: string, idx: number) => {
        if (idx === domainParts.length - 1) return part; // Keep TLD
        return part.length > 0 ? part[0] + '***' : '***';
      }).join('.');
      return `${maskedLocal}@${maskedDomain}`;
    }
  );

  // Mask phone numbers (various formats)
  // Matches: +1-555-123-4567, (555) 123-4567, +15551234567, 555.123.4567, etc.
  masked = masked.replace(
    /(\+?\d{1,3})?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length < 4) return match; // Too short, probably not a phone
      const last4 = digits.slice(-4);
      const hasPlus = match.trim().startsWith('+');
      const countryCode = hasPlus && digits.length > 10 ? digits[0] : '';
      return countryCode ? `+${countryCode}***${last4}` : `***${last4}`;
    }
  );

  return masked;
}
