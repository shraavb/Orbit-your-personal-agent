interface HistoryItem {
  transcript: string;
  agent_response: string;
  timestamp: string;
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

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">You said:</div>
            <div className="text-gray-900 font-medium">{item.transcript}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Orbit:</div>
            <div className="text-gray-700">{item.agent_response}</div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {new Date(item.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
