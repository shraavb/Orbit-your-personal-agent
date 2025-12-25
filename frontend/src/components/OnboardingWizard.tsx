import { useState } from 'react';
import { Contact, createContact, updateUser } from '../api/client';
import ContactForm from './ContactForm';

interface OnboardingWizardProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'set-name' | 'add-contact' | 'complete';

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSetName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setError(null);
      await updateUser({ name: userName.trim() });
      localStorage.setItem('orbit_user_name', userName.trim());
      setCurrentStep('add-contact');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save name');
    }
  };

  const handleAddContact = async (contact: Omit<Contact, 'name'> & { name: string }) => {
    try {
      setError(null);
      await createContact(contact);
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    }
  };

  const handleSkip = () => {
    setCurrentStep('complete');
  };

  const handleFinish = () => {
    // Mark onboarding as complete in localStorage
    localStorage.setItem('orbit_onboarding_complete', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {currentStep === 'welcome' && (
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Orbit!</h1>
              <p className="text-xl text-gray-600">Your Personal Voice Agent</p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">What is Orbit?</h2>
                <p className="text-blue-800">
                  Orbit is a voice-first personal assistant that helps you send messages,
                  manage contacts, and handle everyday tasks - all with just your voice.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">How it works:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Hold the button and speak your command</li>
                  <li>Orbit transcribes and understands your request</li>
                  <li>Confirm actions before they're sent</li>
                  <li>Get voice responses instantly</li>
                </ol>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900">
                  <strong>Try saying:</strong> "Hi Orbit, send a message to Mom saying I'll be home late"
                </p>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep('set-name')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        {currentStep === 'set-name' && (
          <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">What's your name?</h2>
              <p className="text-gray-600">
                This is how Orbit will address you and sign messages on your behalf.
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSetName} className="space-y-6">
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g., Anna, John, Sarah"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Example: If your name is "Anna", messages will be signed "- Anna"
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {currentStep === 'add-contact' && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Contact</h2>
              <p className="text-gray-600">
                Add a contact so Orbit can send messages on your behalf. You can add more later.
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <ContactForm
              onSubmit={handleAddContact}
              onCancel={handleSkip}
              submitLabel="Add Contact"
              cancelLabel="Skip for Now"
            />
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="p-8 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">You're All Set!</h2>
              <p className="text-gray-600">Start talking to Orbit and get things done.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Tips:</h3>
              <ul className="text-left space-y-2 text-gray-700">
                <li>• Click the settings icon to manage contacts anytime</li>
                <li>• Hold the button to speak - release when done</li>
                <li>• Review all actions before confirming</li>
                <li>• Check the history to see past interactions</li>
              </ul>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Using Orbit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
