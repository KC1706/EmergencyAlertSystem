import { apiRequest } from "./queryClient";
import type { Contact } from "@shared/schema";

interface EmergencyResponse {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

interface SMSResponse {
  success: boolean;
  message: string;
  sentCount?: number;
  invalidNumbers?: string[];
  error?: string;
}

/**
 * Process browser-based notification methods as fallback
 * @param contacts - Array of contacts to notify
 * @param message - Emergency message
 * @param location - User's location
 * @param successCount - Reference to success counter
 * @param failureCount - Reference to failure counter
 * @param errors - Reference to errors array
 */
async function processBrowserBasedNotifications(
  contacts: Contact[],
  message: string,
  location: { lat: number; lng: number },
  successCount: number,
  failureCount: number,
  errors: string[]
): Promise<void> {
  // Process contacts one by one
  for (const contact of contacts) {
    try {
      // Try creating direct message links appropriate for contact
      const messageURL = createMessageUrl(contact, message, location);
      
      // Open the messaging URL in a new tab/window
      window.open(messageURL, '_blank');
      
      // Consider this a success if the URL opens
      successCount++;
      
      // Log notification attempt
      await apiRequest('POST', '/api/emergency/log', {
        contactId: contact.id,
        message: message,
        success: true
      });
    } catch (error) {
      failureCount++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to send to ${contact.name}: ${errorMsg}`);
      
      // Log failure
      await apiRequest('POST', '/api/emergency/log', {
        contactId: contact.id,
        message: message,
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
        text: message,
        url: `https://www.google.com/maps?q=${location.lat},${location.lng}`
      });
      successCount++;
    } catch (shareError) {
      // Web Share API failed or was cancelled
      console.error('Web Share API error:', shareError);
    }
  }
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

    // First try Fast2SMS for direct SMS delivery
    const phoneNumbers = contacts
      .filter(contact => contact.phone)
      .map(contact => contact.phone!);
    
    if (phoneNumbers.length > 0) {
      try {
        const smsResult = await sendFast2SMS(phoneNumbers, emergencyMessage);
        
        if (smsResult.success && smsResult.sentCount) {
          console.log('Successfully sent SMS via Fast2SMS to', smsResult.sentCount, 'contacts');
          successCount += smsResult.sentCount;
          
          // Log successful notifications
          for (const contact of contacts.filter(c => c.phone)) {
            await apiRequest('POST', '/api/emergency/log', {
              contactId: contact.id,
              message: emergencyMessage,
              success: true,
              errorMessage: 'Sent via Fast2SMS'
            });
          }
        } else {
          console.error('Fast2SMS sending failed:', smsResult.message || smsResult.error);
          
          // Only fallback to browser-based methods if Fast2SMS fails
          await processBrowserBasedNotifications(
            contacts, 
            emergencyMessage, 
            location, 
            successCount, 
            failureCount, 
            errors
          );
        }
      } catch (error) {
        console.error('Failed to send via Fast2SMS:', error);
        
        // Fallback to browser-based methods
        await processBrowserBasedNotifications(
          contacts, 
          emergencyMessage, 
          location,
          successCount,
          failureCount,
          errors
        );
      }
    } else {
      // No phone numbers available, use browser-based methods
      await processBrowserBasedNotifications(
        contacts, 
        emergencyMessage, 
        location,
        successCount,
        failureCount,
        errors
      );
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

/**
 * Send SMS directly using Fast2SMS API
 * @param phoneNumbers - Array of phone numbers to send SMS to (should be Indian numbers)
 * @param message - Emergency message to send
 * @returns Promise with response from the server
 */
export async function sendFast2SMS(phoneNumbers: string[], message: string): Promise<SMSResponse> {
  try {
    const response = await apiRequest('POST', '/api/emergency/sms', {
      phoneNumbers,
      message
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send SMS via Fast2SMS API:', error);
    return {
      success: false,
      message: 'Failed to send SMS via Fast2SMS',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}