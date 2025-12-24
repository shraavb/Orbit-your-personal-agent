import { useState } from 'react';
import { Contact } from '../api/client';

interface ContactFormProps {
  initialData?: Contact;
  onSubmit: (contact: any) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export default function ContactForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    full_name: initialData?.full_name || '',
    sms: initialData?.sms || '',
    whatsapp: initialData?.whatsapp || '',
    email: initialData?.email || '',
    slack_user_id: initialData?.slack_user_id || '',
    slack_channel: initialData?.slack_channel || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one contact method
    if (!formData.sms && !formData.whatsapp && !formData.email &&
        !formData.slack_user_id && !formData.slack_channel) {
      alert('Please provide at least one contact method');
      return;
    }

    setIsSubmitting(true);
    try {
      // Remove empty strings
      const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '')
      );
      await onSubmit(cleanedData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name (short alias) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name/Alias <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          disabled={!!initialData}
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Mom, John, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Short name to use in voice commands (e.g., "Send message to Mom")
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.full_name}
          onChange={(e) => handleChange('full_name', e.target.value)}
          placeholder="Jane Smith"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Contact Methods Section */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Contact Methods (at least one required)
        </h3>

        {/* SMS */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">SMS Phone</label>
          <input
            type="tel"
            value={formData.sms}
            onChange={(e) => handleChange('sms', e.target.value)}
            placeholder="+15551234567"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* WhatsApp */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone</label>
          <input
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => handleChange('whatsapp', e.target.value)}
            placeholder="+15551234567"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="jane@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Slack User ID */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Slack User ID</label>
          <input
            type="text"
            value={formData.slack_user_id}
            onChange={(e) => handleChange('slack_user_id', e.target.value)}
            placeholder="U01234ABC"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Slack Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slack Channel</label>
          <input
            type="text"
            value={formData.slack_channel}
            onChange={(e) => handleChange('slack_channel', e.target.value)}
            placeholder="#general"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
