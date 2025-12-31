import { useState, useEffect } from 'react';
import { Contact, listContacts, createContact, updateContact, deleteContact } from '../api/client';
import ContactForm from './ContactForm';
import ContactDetails from './ContactDetails';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalView = 'list' | 'add' | 'edit';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<ModalView>('list');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listContacts();
      setContacts(response.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (contact: any) => {
    try {
      setError(null);
      await createContact(contact);
      await loadContacts();
      setCurrentView('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
      throw err;
    }
  };

  const handleUpdateContact = async (contact: any) => {
    if (!editingContact) return;

    try {
      setError(null);
      await updateContact(editingContact.name, contact);
      await loadContacts();
      setCurrentView('list');
      setEditingContact(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact');
      throw err;
    }
  };

  const handleDeleteContact = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      setError(null);
      await deleteContact(name);
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-none sm:rounded-lg shadow-xl max-w-3xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {currentView === 'list' && 'Settings'}
            {currentView === 'add' && 'Add Contact'}
            {currentView === 'edit' && 'Edit Contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentView === 'list' && (
            <div>
              {/* Search & Add Button */}
              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setCurrentView('add')}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap min-h-[44px]"
                >
                  + Add Contact
                </button>
              </div>

              {/* Demo Data Notice */}
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Sample Data:</span> These contacts are for demonstration purposes only.
                </p>
              </div>

              {/* Contact List */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading contacts...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'No contacts found' : 'No contacts yet'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setCurrentView('add')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Add your first contact
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.name}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                          <p className="text-sm text-gray-600">{contact.full_name}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingContact(contact);
                              setCurrentView('edit');
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact.name)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <ContactDetails
                        contactName={contact.name}
                        sms={contact.sms}
                        whatsapp={contact.whatsapp}
                        email={contact.email}
                        slack_user_id={contact.slack_user_id}
                        slack_channel={contact.slack_channel}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'add' && (
            <ContactForm
              onSubmit={handleAddContact}
              onCancel={() => setCurrentView('list')}
            />
          )}

          {currentView === 'edit' && editingContact && (
            <ContactForm
              initialData={editingContact}
              onSubmit={handleUpdateContact}
              onCancel={() => {
                setCurrentView('list');
                setEditingContact(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
