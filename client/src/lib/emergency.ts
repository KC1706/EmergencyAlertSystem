import { apiRequest } from "./queryClient";
import type { Contact } from "@shared/schema";

interface EmergencyResponse {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

/**
 * Send emergency notifications to all emergency contacts using 
 * a combination of available methods - web browser sharing,
 * direct messaging links, etc.
 */
export async function sendEmergencyNotifications(
  severity: string,
  location: { lat: number; lng: number },
  contacts?: Contact[]
): Promise<EmergencyResponse> {
  try {
    const emergencyMessage = createEmergencyMessage(severity, location);
    
    // Get all contacts if not provided
    if (!contacts) {
      const response = await apiRequest('GET', '/api/contacts');
      contacts = await response.json();
    }
    
    if (!contacts || contacts.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ["No emergency contacts found"]
      };
    }
    
    // Local success tracking
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Process contacts one by one
    for (const contact of contacts) {
      try {
        // Try creating direct message links appropriate for contact
        const messageURL = createMessageUrl(contact, emergencyMessage, location);
        
        // Open the messaging URL in a new tab/window
        window.open(messageURL, '_blank');
        
        // Consider this a success if the URL opens
        successCount++;
        
        // Log notification attempt
        await apiRequest('POST', '/api/emergency/log', {
          contactId: contact.id,
          message: emergencyMessage,
          success: true
        });
      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to send to ${contact.name}: ${errorMsg}`);
        
        // Log failure
        await apiRequest('POST', '/api/emergency/log', {
          contactId: contact.id,
          message: emergencyMessage,
          success: false,
          errorMessage: errorMsg
        });
      }
    }
    
    // Try to use Web Share API as a backup if available
    if (navigator.share && successCount === 0) {
      try {
        await navigator.share({
          title: 'EMERGENCY: Crash Detected',
          text: emergencyMessage,
          url: `https://www.google.com/maps?q=${location.lat},${location.lng}`
        });
        successCount++;
      } catch (shareError) {
        // Web Share API failed or was cancelled
        console.error('Web Share API error:', shareError);
      }
    }

    return {
      success: successCount > 0,
      sentCount: successCount,
      failedCount: failureCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Failed to send emergency notifications:', error);
    throw error;
  }
}

/**
 * Creates a direct message URL based on the contact's information
 */
function createMessageUrl(
  contact: Contact, 
  message: string,
  location: { lat: number; lng: number }
): string {
  // SMS link for mobile devices
  if (contact.phone) {
    // URL encode the message
    const encodedMessage = encodeURIComponent(message);
    return `sms:${contact.phone}?body=${encodedMessage}`;
  }
  
  // Email fallback (if contact has email)
  if (contact.email) {
    const subject = encodeURIComponent('EMERGENCY: Crash Detected');
    const body = encodeURIComponent(message);
    return `mailto:${contact.email}?subject=${subject}&body=${body}`;
  }
  
  // WhatsApp (if number is available)
  if (contact.phone) {
    // Format phone number for WhatsApp - remove non-digits
    const whatsappNumber = contact.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  }
  
  // Default to a manual copy-paste page
  return `/emergency-share?message=${encodeURIComponent(message)}&lat=${location.lat}&lng=${location.lng}`;
}

/**
 * Create the emergency message that will be sent to contacts
 */
export function createEmergencyMessage(severity: string, location: { lat: number; lng: number }): string {
  return `EMERGENCY: Helmet user detected a crash!
Severity: ${severity}
Location: https://www.google.com/maps?q=${location.lat},${location.lng}
Time: ${new Date().toLocaleString()}`;
}

/**
 * Make an emergency call
 */
export function makeEmergencyCall(): boolean {
  try {
    window.open('tel:911');
    return true;
  } catch (error) {
    console.error('Failed to initiate emergency call:', error);
    return false;
  }
}

/**
 * Generate a shareable emergency link to be copied manually
 */
export function generateShareableLink(severity: string, location: { lat: number; lng: number }): string {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    severity,
    lat: location.lat.toString(),
    lng: location.lng.toString(),
    time: new Date().toISOString()
  });
  
  return `${baseUrl}/emergency-share?${params.toString()}`;
}
