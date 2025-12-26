import { maskSensitiveText } from '../utils/privacy';

interface HistoryItem {
  transcript: string;
  agent_response: string;
  timestamp: string;
  actionType?: 'send_sms' | 'send_email' | 'send_whatsapp' | 'send_slack';
  isAction?: boolean;
}

interface HistoryProps {
  items: HistoryItem[];
}

export default function History({ items }: HistoryProps) {
  if (items.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No conversation history yet. Try saying something!
      </div>
    );
  }

  const getActionStyles = (actionType?: string) => {
    if (!actionType) return { bg: 'bg-white', border: 'border-gray-200', icon: '💬', label: '' };

    switch (actionType) {
      case 'send_sms':
        return { bg: 'bg-green-50', border: 'border-green-300', icon: '📱', label: 'SMS Sent' };
      case 'send_email':
        return { bg: 'bg-blue-50', border: 'border-blue-300', icon: '📧', label: 'Email Sent' };
      case 'send_whatsapp':
        return { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '💬', label: 'WhatsApp Sent' };
      case 'send_slack':
        return { bg: 'bg-purple-50', border: 'border-purple-300', icon: '💼', label: 'Slack Sent' };
      default:
        return { bg: 'bg-white', border: 'border-gray-200', icon: '💬', label: '' };
    }
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const styles = getActionStyles(item.isAction ? item.actionType : undefined);

        return (
          <div
            key={index}
            className={`border rounded-lg p-4 shadow-sm ${styles.bg} ${styles.border} ${
              item.isAction ? 'border-l-4' : ''
            }`}
          >
            {/* Action Badge */}
            {item.isAction && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{styles.icon}</span>
                <span className="text-xs font-semibold text-gray-700 px-2 py-1 bg-white rounded-full">
                  {styles.label}
                </span>
              </div>
            )}

            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">You said:</div>
              <div className="text-gray-900 font-medium">{maskSensitiveText(item.transcript)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Orbit:</div>
              <div className="text-gray-700">{maskSensitiveText(item.agent_response)}</div>
            </div>
            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
