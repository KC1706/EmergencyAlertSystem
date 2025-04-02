import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import EmergencyScreen from "./components/EmergencyScreen";
import { useToast } from "./hooks/use-toast";

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contacts' | 'settings'>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [severity, setSeverity] = useState<'NONE' | 'MILD' | 'MODERATE' | 'SEVERE'>('NONE');
  const [countdown, setCountdown] = useState(15);
  const [lastLocation, setLastLocation] = useState({ lat: 22.31641, lng: 87.32150 });
  const { toast } = useToast();

  const connectBluetooth = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['00001101-0000-1000-8000-00805f9b34fb']
        });
        
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "Connected to helmet successfully",
          variant: "success"
        });
      } catch (error) {
        throw new Error("Bluetooth pairing failed or was cancelled");
      }
    } catch (error) {
      console.error("Bluetooth error:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const simulateAccident = () => {
    if (emergencyActive) return;
    
    // Generate random force value between 15-35
    const forceValue = Math.random() * 20 + 15;
    
    // Determine severity based on the force value
    let newSeverity: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' = 'NONE';
    if (forceValue > 35) {
      newSeverity = 'SEVERE';
    } else if (forceValue > 15) {
      newSeverity = 'MODERATE';
    } else if (forceValue > 7) {
      newSeverity = 'MILD';
    }
    
    setSeverity(newSeverity);
    setEmergencyActive(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="bg-gray-100 text-gray-800 font-sans min-h-screen">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-center text-gray-800">Smart Helmet Accident Detection</h1>
            
            {/* Tab Navigation */}
            <div className="flex justify-center mt-6 border-b border-gray-200">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 border-b-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-500 font-medium' : 'border-transparent hover:border-gray-300'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 border-b-2 ${activeTab === 'contacts' ? 'border-blue-500 text-blue-500 font-medium' : 'border-transparent hover:border-gray-300'}`}
              >
                Emergency Contacts
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 border-b-2 ${activeTab === 'settings' ? 'border-blue-500 text-blue-500 font-medium' : 'border-transparent hover:border-gray-300'}`}
              >
                Settings
              </button>
            </div>
          </header>
          
          {/* Connection Status */}
          <div className={`mb-4 px-4 py-2 rounded-md font-semibold text-center
            ${isConnecting ? 'bg-yellow-500 text-white' : isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            Bluetooth: {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 mb-6 justify-center">
            <button 
              onClick={connectBluetooth}
              disabled={isConnecting || isConnected}
              className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center
                ${(isConnecting || isConnected) ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span className="material-icons mr-1">bluetooth</span> 
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect Helmet'}
            </button>
            <button 
              onClick={simulateAccident}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <span className="material-icons mr-1">warning</span> Simulate Accident
            </button>
          </div>

          {/* Content Area */}
          {activeTab === 'dashboard' && <Dashboard severity={severity} lastLocation={lastLocation} />}
          {activeTab === 'contacts' && <Contacts lastLocation={lastLocation} />}
          {activeTab === 'settings' && <Settings onCountdownChange={setCountdown} />}
        </div>
        
        {/* Emergency Screen */}
        {emergencyActive && (
          <EmergencyScreen 
            countdown={countdown} 
            severity={severity}
            location={lastLocation}
            onCancel={() => setEmergencyActive(false)}
            onCall={() => {
              // Make emergency call
              setEmergencyActive(false);
            }}
          />
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;
