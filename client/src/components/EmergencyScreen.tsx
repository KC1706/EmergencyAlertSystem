import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { Contact } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

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

  // Send emergency SMS mutation
  const sendEmergencySMSMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/emergency/sms', {
        severity,
        location
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Emergency Alerts Sent",
        description: `Sent to ${data.sentCount} contacts`,
        variant: "success"
      });
      onCall();
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Alerts",
        description: error.message,
        variant: "destructive"
      });
      // Still close the screen after error
      onCall();
    }
  });

  // Handle countdown
  useEffect(() => {
    if (countdown <= 0) {
      sendEmergencySMSMutation.mutate();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle immediate call
  const handleCallNow = () => {
    sendEmergencySMSMutation.mutate();
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
              <div key={contact.id} className="flex items-center text-gray-700 mb-1">
                <span className="material-icons text-sm mr-1">person</span> 
                {contact.name}: {contact.phone}
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
            disabled={sendEmergencySMSMutation.isPending} 
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg text-lg flex justify-center items-center"
          >
            <span className="material-icons mr-1">call</span> CALL 911 NOW
          </button>
        </div>
      </div>
    </div>
  );
}
