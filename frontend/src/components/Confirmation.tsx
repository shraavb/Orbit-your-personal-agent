import { useState } from 'react';

interface ProposedAction {
  action_type: string;
  parameters: Record<string, any>;
  confirmation_message: string;
}

interface ConfirmationProps {
  requestId: number;
  proposedAction: ProposedAction;
  onConfirm: (confirmed: boolean, modification?: string) => void;
}

export default function Confirmation({
  requestId,
  proposedAction,
  onConfirm,
}: ConfirmationProps) {
  const [modification, setModification] = useState('');
  const [showModify, setShowModify] = useState(false);

  const handleConfirm = () => {
    onConfirm(true);
  };

  const handleCancel = () => {
    onConfirm(false);
  };

  const handleModify = () => {
    if (modification.trim()) {
      onConfirm(false, modification);
      setModification('');
      setShowModify(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 shadow-md">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-yellow-900 text-sm font-bold">!</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">Confirm Action</h3>
          <p className="text-gray-700">{proposedAction.confirmation_message}</p>
        </div>
      </div>

      {showModify ? (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter modification..."
            value={modification}
            onChange={(e) => setModification(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleModify}
            >
              Submit Change
            </button>
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={() => setShowModify(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            onClick={handleConfirm}
          >
            Confirm
          </button>
          <button
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            onClick={() => setShowModify(true)}
          >
            Modify
          </button>
          <button
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
