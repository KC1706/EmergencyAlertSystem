import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Contact } from '@shared/schema';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contact: Omit<Contact, 'id'>) => void;
  contact: Contact | null;
  isEditing: boolean;
}

// Form validation schema
const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { 
    message: "Please enter a valid phone number in international format (e.g. +1234567890)" 
  }),
  email: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal('')),
  sendSms: z.boolean(),
  sendEmail: z.boolean()
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function AddContactModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  contact, 
  isEditing 
}: AddContactModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      sendSms: true,
      sendEmail: false
    }
  });

  // Reset form when contact changes (for editing)
  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || '',
        sendSms: contact.sendSms === null ? true : contact.sendSms,
        sendEmail: contact.sendEmail === null ? false : contact.sendEmail
      });
    } else {
      reset({
        name: '',
        phone: '',
        email: '',
        sendSms: true,
        sendEmail: false
      });
    }
  }, [contact, reset]);

  // Handle form submission
  const handleFormSubmit = (data: ContactFormData) => {
    // Include userId as null to match the InsertContact type
    // and handle email as null if it's empty
    onSubmit({
      name: data.name,
      phone: data.phone,
      email: data.email && data.email.trim() !== '' ? data.email : null,
      sendSms: data.sendSms,
      sendEmail: data.sendEmail,
      userId: null
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{isEditing ? 'Edit' : 'Add'} Emergency Contact</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="contact-name">Full Name</label>
            <input 
              type="text" 
              id="contact-name" 
              className={`border rounded p-2 w-full ${errors.name ? 'border-red-500' : ''}`}
              placeholder="John Doe" 
              {...register('name')}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="contact-phone">Phone Number</label>
            <input 
              type="tel" 
              id="contact-phone" 
              className={`border rounded p-2 w-full ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="+1 (123) 456-7890" 
              {...register('phone')}
            />
            {errors.phone ? (
              <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">International format recommended: +1XXXXXXXXXX</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="contact-email">Email Address</label>
            <input 
              type="email" 
              id="contact-email" 
              className={`border rounded p-2 w-full ${errors.email ? 'border-red-500' : ''}`}
              placeholder="johndoe@example.com" 
              {...register('email')}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Used for emergency email notifications</p>
          </div>
          
          <div className="mb-2">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="mr-2" 
                {...register('sendSms')}
              />
              <span>Send SMS in case of emergency</span>
            </label>
          </div>
          
          <div className="mb-6">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="mr-2" 
                {...register('sendEmail')}
              />
              <span>Send Email in case of emergency</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
              {isEditing ? 'Update' : 'Save'} Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
