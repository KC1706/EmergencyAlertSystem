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
      try {
        // First try the direct messaging methods
        const result = await sendEmergencyNotifications(severity, location, contacts);
        return result;
      } catch (error) {
        console.error("Error sending notifications:", error);
        // Fall back to the sharing page if direct messaging fails
        navigate(`/emergency-share?severity=${severity}&lat=${location.lat}&lng=${location.lng}`);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Emergency Alerts Sent",
        description: `Sent to ${data.sentCount} contacts`,
        variant: "success"
      });
      
      // Try to make an emergency call
      makeEmergencyCall();
      
      // Call the parent handler
      onCall();
    },
    onError: (error) => {
      toast({
        title: "Using Alternative Messaging",
        description: "Opening emergency sharing options",
        variant: "default"
      });
      
      // If error, we've already navigated to the share page
      // so just close this screen
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
          <p className="text-sm mb-2">Emergency message will be sent to:</p>
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
                  {contact.sendSms && contact.phone && (
                    <div className="flex items-center">
                      <span className="material-icons text-xs mr-1">message</span> 
                      {contact.phone}
                    </div>
                  )}
                  {contact.sendEmail && contact.email && (
                    <div className="flex items-center">
                      <span className="material-icons text-xs mr-1">email</span> 
                      {contact.email}
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
