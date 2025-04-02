import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { sendEmergencyNotifications, makeEmergencyCall } from '../lib/emergency';
import { Contact } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface EmergencyScreenProps {
  countdown: number;
  severity: string;
  location: { lat: number; lng: number };
  onCancel: () => void;
  onCall: () => void;
}

export default function EmergencyScreen({ 
  countdown: initialCountdown, 
  severity, 
  location,
  onCancel,
  onCall
}: EmergencyScreenProps) {
  const [countdown, setCountdown] = useState(initialCountdown);
  const { toast } = useToast();

  // Fetch emergency contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const [, navigate] = useLocation();
  
  // Send emergency notifications mutation
  const sendEmergencyMutation = useMutation({
    mutationFn: async () => {
      // Send SMS notifications via API
      const result = await sendEmergencyNotifications(severity, location, contacts);
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Emergency Alerts Sent",
        description: `Sent SMS to ${data.sentCount} contacts`,
        variant: "success"
      });
      
      // Try to make an emergency call
      makeEmergencyCall();
      
      // Call the parent handler
      onCall();
    },
    onError: (error) => {
      console.error("Error sending notifications:", error);
      toast({
        title: "Error Sending Emergency Alerts",
        description: "Failed to send SMS notifications",
        variant: "destructive"
      });
      
      // Close this screen even on error
      onCall();
    }
  });

  // Handle countdown
  useEffect(() => {
    if (countdown <= 0) {
      sendEmergencyMutation.mutate();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle immediate call
  const handleCallNow = () => {
    sendEmergencyMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-red-500 bg-opacity-20 z-50 flex flex-col justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 text-center">
        <h2 className="text-3xl text-red-500 font-bold mb-2 flex justify-center items-center">
          <span className="material-icons text-4xl mr-2">warning</span> EMERGENCY DETECTED!
        </h2>
        <p className="text-2xl my-4 font-bold">Calling emergency in: {countdown}s...</p>
        
        <div className="bg-gray-100 p-4 rounded-md mb-4 text-left">
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm font-medium text-green-800 flex items-center">
              <span className="material-icons text-green-500 mr-1" style={{ fontSize: '1rem' }}>info</span>
              When the countdown finishes or you click "CALL 911 NOW":
            </p>
            <ul className="text-xs text-green-700 list-disc ml-6 mt-1">
              <li>Emergency SMS will be sent automatically to your contacts</li>
              <li>Messages include your location and emergency details</li>
              <li>No manual intervention needed</li>
            </ul>
          </div>
          
          <p className="text-sm font-medium mb-2">Emergency SMS will be sent to:</p>
          {contacts.length === 0 ? (
            <p className="text-gray-500 italic">No emergency contacts configured</p>
          ) : (
            contacts.map(contact => (
              <div key={contact.id} className="mb-2 ml-2 border-l-2 border-gray-300 pl-2">
                <div className="flex items-center text-gray-700">
                  <span className="material-icons text-sm mr-1">person</span> 
                  <span className="font-medium">{contact.name}</span>
                </div>
                <div className="text-sm text-gray-600 ml-5">
                  {contact.phone && (
                    <div className="flex items-center">
                      <span className="material-icons text-xs mr-1">message</span> 
                      {contact.phone} <span className="text-xs text-green-600">(automatic SMS)</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onCancel} 
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg text-lg flex justify-center items-center"
          >
            <span className="material-icons mr-1">check_circle</span> I'M OK
          </button>
          <button 
            onClick={handleCallNow}
            disabled={sendEmergencyMutation.isPending} 
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg text-lg flex justify-center items-center"
          >
            <span className="material-icons mr-1">call</span> CALL 911 NOW
          </button>
        </div>
      </div>
    </div>
  );
}
