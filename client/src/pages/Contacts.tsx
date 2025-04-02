import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { queryClient } from '../lib/queryClient';
import { Contact } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import AddContactModal from '../components/AddContactModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

interface ContactsProps {
  lastLocation: { lat: number; lng: number };
}

export default function Contacts({ lastLocation }: ContactsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (contact: Omit<Contact, 'id'>) => {
      const res = await apiRequest('POST', '/api/contacts', contact);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setShowAddModal(false);
      toast({
        title: "Success",
        description: isEditing ? "Contact updated successfully" : "Contact added successfully",
        variant: "success"
      });
      setIsEditing(false);
      setCurrentContact(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'add'} contact: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const res = await apiRequest('DELETE', `/api/contacts/${contactId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setShowDeleteModal(false);
      toast({
        title: "Success",
        description: "Contact removed successfully",
        variant: "success"
      });
      setCurrentContact(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete contact: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle add/edit contact
  const handleAddContact = (contact: Omit<Contact, 'id'>) => {
    if (isEditing && currentContact) {
      addContactMutation.mutate({ 
        ...contact, 
        id: currentContact.id
      } as any);
    } else {
      addContactMutation.mutate(contact);
    }
  };

  // Handle delete contact
  const handleDeleteContact = () => {
    if (currentContact) {
      deleteContactMutation.mutate(currentContact.id);
    }
  };

  // Open edit modal
  const handleEditContact = (contact: Contact) => {
    setCurrentContact(contact);
    setIsEditing(true);
    setShowAddModal(true);
  };

  // Open delete modal
  const handleShowDeleteModal = (contact: Contact) => {
    setCurrentContact(contact);
    setShowDeleteModal(true);
  };

  // Emergency message preview
  const messagePreview = `EMERGENCY: Helmet user detected a crash!\nSeverity: MODERATE\nLocation: https://www.google.com/maps?q=${lastLocation.lat},${lastLocation.lng}`;

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <span className="material-icons mr-2 text-blue-500">contacts</span>
            Emergency Contacts
          </h3>
          <button 
            onClick={() => {
              setIsEditing(false);
              setCurrentContact(null);
              setShowAddModal(true);
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center"
          >
            <span className="material-icons text-sm mr-1">add</span> Add Contact
          </button>
        </div>
        
        {isLoading ? (
          <div className="py-10 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-current border-r-transparent"></div>
            <p className="mt-2 text-gray-500">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            <span className="material-icons text-4xl mb-2">contactless</span>
            <p>No emergency contacts added yet</p>
            <p className="text-sm">Add contacts who will be notified in case of an emergency</p>
          </div>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className="contact-item border-b py-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{contact.name}</p>
                <p className="text-gray-600">{contact.phone}</p>
                {contact.email && (
                  <p className="text-gray-600">{contact.email}</p>
                )}
                <div className="flex flex-col mt-1">
                  {contact.sendSms && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <span className="material-icons text-xs mr-1">message</span> Will receive SMS alerts
                    </div>
                  )}
                  {contact.sendEmail && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <span className="material-icons text-xs mr-1">email</span> Will receive Email alerts
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleEditContact(contact)} 
                  className="text-blue-500 hover:text-blue-700 p-1"
                >
                  <span className="material-icons">edit</span>
                </button>
                <button 
                  onClick={() => handleShowDeleteModal(contact)} 
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="material-icons mr-2 text-blue-500">notification_important</span>
          Emergency Message Preview
        </h3>
        <div className="bg-gray-50 p-4 rounded-md border border-gray-300">
          <p className="font-medium mb-1">Message that will be sent to your contacts:</p>
          <div className="bg-white p-3 rounded border border-gray-200 text-gray-700">
            <p>EMERGENCY: Helmet user detected a crash!</p>
            <p>Severity: <span className="font-medium text-yellow-500">MODERATE</span></p>
            <p>Location: <a href={`https://www.google.com/maps?q=${lastLocation.lat},${lastLocation.lng}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              https://www.google.com/maps?q={lastLocation.lat.toFixed(5)},{lastLocation.lng.toFixed(5)}
            </a></p>
            <p>Time: {new Date().toLocaleString()}</p>
          </div>
          
          <div className="mt-4">
            <p className="font-medium mb-2">Delivery methods:</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-sm">
                <span className="material-icons text-blue-500 mr-1" style={{ fontSize: '1rem' }}>message</span>
                <span>SMS message</span>
              </div>
              <div className="flex items-center bg-green-50 border border-green-200 rounded-full px-3 py-1 text-sm">
                <span className="material-icons text-green-500 mr-1" style={{ fontSize: '1rem' }}>email</span>
                <span>Email message</span>
              </div>
              <div className="flex items-center bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 text-sm">
                <span className="material-icons text-yellow-500 mr-1" style={{ fontSize: '1rem' }}>share</span>
                <span>Web Share</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddContactModal 
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setIsEditing(false);
          setCurrentContact(null);
        }}
        onSubmit={handleAddContact}
        contact={currentContact}
        isEditing={isEditing}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteContact}
        contactName={currentContact?.name || ""}
      />
    </>
  );
}
