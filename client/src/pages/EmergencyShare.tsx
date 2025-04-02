import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Phone, MessageSquare, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmergencyShare() {
  const [location, setLocation] = useState<[string, Record<string, string>]>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Parse URL parameters
    const url = new URL(window.location.href);
    const params = Object.fromEntries(url.searchParams.entries());
    setLocation([url.pathname, params]);
  }, []);
  
  const emergencyInfo = location?.[1] || {};
  const message = emergencyInfo.message || `EMERGENCY: Helmet user detected a crash!
Severity: ${emergencyInfo.severity || 'UNKNOWN'}
Location: https://www.google.com/maps?q=${emergencyInfo.lat || '0'},${emergencyInfo.lng || '0'}
Time: ${emergencyInfo.time ? new Date(emergencyInfo.time).toLocaleString() : new Date().toLocaleString()}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Emergency message copied to clipboard",
      });
    });
  };
  
  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EMERGENCY: Crash Detected',
          text: message,
          url: emergencyInfo.lat && emergencyInfo.lng 
            ? `https://www.google.com/maps?q=${emergencyInfo.lat},${emergencyInfo.lng}`
            : window.location.href
        });
        toast({
          title: "Shared successfully",
          description: "Emergency information has been shared",
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          title: "Sharing failed",
          description: "Could not share emergency information",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Sharing not supported",
        description: "Your browser doesn't support web sharing",
        variant: "destructive"
      });
    }
  };
  
  const openMaps = () => {
    if (emergencyInfo.lat && emergencyInfo.lng) {
      window.open(`https://www.google.com/maps?q=${emergencyInfo.lat},${emergencyInfo.lng}`, '_blank');
    }
  };
  
  const sendSms = () => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`sms:?body=${encodedMessage}`, '_blank');
  };
  
  const sendEmail = () => {
    const subject = encodeURIComponent('EMERGENCY: Crash Detected');
    const body = encodeURIComponent(message);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };
  
  const callEmergency = () => {
    window.open('tel:911', '_blank');
  };
  
  return (
    <div className="container max-w-md mx-auto py-6 px-4">
      <Card className="border-red-500 shadow-lg">
        <CardHeader className="bg-red-500 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Emergency Alert</CardTitle>
            <Badge variant="secondary">
              {emergencyInfo.severity || 'UNKNOWN'} Severity
            </Badge>
          </div>
          <CardDescription className="text-white/90">
            Helmet crash detected - Share this information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-2 bg-red-50 p-4 rounded-md border border-red-200">
            <p className="font-bold">Emergency Message:</p>
            <pre className="whitespace-pre-wrap text-sm bg-white p-2 rounded border border-gray-200">
              {message}
            </pre>
          </div>
          
{/*           <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm font-medium text-yellow-800 flex items-center mb-1">
              <span className="text-yellow-500 mr-1">ⓘ</span>
              Important Note About Sending:
            </p>
            <ul className="text-xs text-yellow-700 list-disc ml-6">
              <li>The buttons below will open your device's messaging apps</li>
              <li>You will need to manually press "Send" in each app</li>
              <li>This approach doesn't require paid services but needs manual confirmation</li>
              <li>Try multiple methods for the best chance of reaching someone</li>
            </ul>
          </div> */}
          
          <Separator className="my-6" />
          
          <div className="space-y-4">
            <h3 className="font-semibold">Share this emergency information:</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={shareViaWebShare} 
                className="flex items-center justify-center gap-2 h-auto py-3"
                variant="default"
              >
                <div>
                  <Share2 size={16} className="mx-auto mb-1" />
                  <div className="text-xs">Share via Device</div>
                  <div className="text-[10px] opacity-70">(opens share menu)</div>
                </div>
              </Button>
              
              <Button 
                onClick={copyToClipboard} 
                className="flex items-center justify-center gap-2 h-auto py-3"
                variant="outline"
              >
                <div>
                  <Copy size={16} className="mx-auto mb-1" />
                  <div className="text-xs">Copy to Clipboard</div>
                  <div className="text-[10px] opacity-70">(paste anywhere)</div>
                </div>
              </Button>
              
              <Button 
                onClick={sendSms} 
                className="flex items-center justify-center gap-2 h-auto py-3"
                variant="secondary"
              >
                <div>
                  <MessageSquare size={16} className="mx-auto mb-1" />
                  <div className="text-xs">Open SMS App</div>
                  <div className="text-[10px] opacity-70">(press send after)</div>
                </div>
              </Button>
              
              <Button 
                onClick={sendEmail} 
                className="flex items-center justify-center gap-2 h-auto py-3"
                variant="secondary"
              >
                <div>
                  <Mail size={16} className="mx-auto mb-1" />
                  <div className="text-xs">Open Email App</div>
                  <div className="text-[10px] opacity-70">(press send after)</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex-col gap-4 bg-gray-50 rounded-b-lg">
          <Button 
            onClick={openMaps} 
            className="w-full"
            variant="outline"
            disabled={!emergencyInfo.lat || !emergencyInfo.lng}
          >
            View on Maps
          </Button>
          
          <Button 
            onClick={callEmergency} 
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <Phone size={16} className="mr-2" />
            Call Emergency Services
          </Button>
          
          <Button 
            onClick={() => navigate('/')} 
            className="w-full"
            variant="ghost"
          >
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
