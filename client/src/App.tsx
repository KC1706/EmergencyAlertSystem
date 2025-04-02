import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import EmergencyShare from "./pages/EmergencyShare";
import NotFound from "./pages/not-found";
import EmergencyScreen from "./components/EmergencyScreen";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contacts' | 'settings'>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [severity, setSeverity] = useState<'NONE' | 'MILD' | 'MODERATE' | 'SEVERE'>('NONE');
  const [countdown, setCountdown] = useState(15);
  const [lastLocation, setLastLocation] = useState({ lat: 22.31641, lng: 87.32150 });
  const [sirenDetectionActive, setSirenDetectionActive] = useState(false);
  const { toast } = useToast();
  
  // Start siren detection when device is connected
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (isConnected && !sirenDetectionActive && !emergencyActive) {
      setSirenDetectionActive(true);
      
      // Start the detection
      const startDetection = async () => {
        cleanup = await detectSiren();
      };
      
      startDetection();
    }
    
    // Clean up when component unmounts
    return () => {
      if (cleanup) cleanup();
    };
  }, [isConnected, emergencyActive]);

  const connectBluetooth = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // In a real implementation, we would use the Web Bluetooth API
        // For our demo, we'll just simulate a successful connection
        
        // Check if browser supports Bluetooth API (for real implementation)
        if ('bluetooth' in navigator) {
          // This will only work in browsers that support Web Bluetooth API
          // and only in secure contexts (HTTPS)
          await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['00001101-0000-1000-8000-00805f9b34fb']
          });
        } else {
          // For demo purposes, pretend connection was successful even without API
          console.log("Bluetooth API not available - simulating connection");
        }
        
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

  // Handle accident simulation (can be triggered by button or siren detection)
  const simulateAccident = (fromSiren = false) => {
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
    
    // If triggered by siren, show toast notification
    if (fromSiren) {
      toast({
        title: "Emergency Siren Detected",
        description: `Detected severity: ${newSeverity}. Starting emergency countdown.`,
        variant: "destructive"
      });
    }
    
    setSeverity(newSeverity);
    setEmergencyActive(true);
  };
  
  // Function to detect siren using device microphone
  const detectSiren = async () => {
    if (!isConnected || emergencyActive) return;
    
    toast({
      title: "Audio Monitoring Active",
      description: "Listening for emergency sirens and crash sounds. Automatic SMS will be sent when triggered.",
      variant: "default"
    });
    
    try {
      // In a real implementation, this would use WebAudio API for sound analysis
      // For this demo, we'll simulate siren detection after a delay
      
      // Simulate random siren detection events
      const checkInterval = setInterval(() => {
        // 25% chance of detecting a siren each check (increased for easier testing)
        if (Math.random() < 0.25) {
          clearInterval(checkInterval);
          simulateAccident(true); // Trigger accident simulation as if from siren
        }
      }, 3000); // Check every 3 seconds (faster for demo)
      
      // Clean up interval if component unmounts
      return () => clearInterval(checkInterval);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone for siren detection",
        variant: "destructive"
      });
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="bg-gray-100 text-gray-800 font-sans min-h-screen">
        <Switch>
          {/* Emergency share page route */}
          <Route path="/emergency-share">
            <EmergencyShare />
          </Route>
          
          {/* Main app route */}
          <Route path="/">
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
                  onClick={() => simulateAccident(false)}
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
          </Route>
          
          {/* 404 Not Found route - this must be the last route */}
          <Route>
            <NotFound />
          </Route>
        </Switch>
        
        {/* Toast notifications component */}
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
