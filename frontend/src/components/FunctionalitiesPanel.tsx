import { useState } from 'react';
import { motion } from 'framer-motion';

interface FunctionalitiesPanelProps {
  defaultExpanded?: boolean;
}

export default function FunctionalitiesPanel({ defaultExpanded = true }: FunctionalitiesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const tools = [
    { icon: '📱', label: 'SMS' },
    { icon: '💬', label: 'WhatsApp' },
    { icon: '📧', label: 'Email' },
    { icon: '💼', label: 'Slack' },
  ];

  const examples = [
    '"Send a text to Mom saying I\'ll be home soon"',
    '"Email the team about tomorrow\'s meeting"',
    '"Post to #general channel on Slack"',
    '"Send WhatsApp to John asking about lunch"',
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-t-lg hover:bg-blue-100 transition-colors"
        aria-label="Toggle capabilities panel"
        aria-expanded={isExpanded}
      >
        <h3 className="text-lg font-semibold text-gray-900">What I Can Do</h3>
        <motion.svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Expandable Content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-4 py-4 bg-white border-x border-b border-blue-200 rounded-b-lg space-y-4">
          {/* Tool Icons Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tools.map((tool) => (
              <div
                key={tool.label}
                className="flex flex-col items-center justify-center p-3 bg-blue-50 rounded-lg border border-blue-100"
              >
                <span className="text-3xl mb-1">{tool.icon}</span>
                <span className="text-sm font-medium text-gray-700">{tool.label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Example Commands */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Example Commands:</h4>
            <ul className="space-y-1.5">
              {examples.map((example, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="mr-2 text-blue-600">•</span>
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
