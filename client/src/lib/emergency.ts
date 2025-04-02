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
 * Log notification attempt (but don't actually send via browser)
 * @param contacts - Array of contacts notified
 * @param message - Emergency message sent
 * @param success - Whether the message was sent successfully
 * @param errorMessage - Optional error message if there was a failure
 */
async function logNotifications(
  contacts: Contact[],
  message: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  // Log each contact notification in the system
  for (const contact of contacts) {
    try {
      await apiRequest('POST', '/api/emergency/log', {
        contactId: contact.id,
        message: message,
        success: success,
        errorMessage: errorMessage || 'SMS notification attempt'
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }
}

/**
 * Send emergency notifications to all emergency contacts via SMS.
 * This is used for automatic emergency notifications when accidents are detected.
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

    // Get contacts with valid phone numbers and format them for SMS
    const phoneNumbers = contacts
      .filter(contact => contact.phone && contact.phone.trim() !== '')
      .map(contact => {
        let phone = contact.phone!.trim();
        
        // Ensure Indian numbers have the +91 prefix if they don't already have it
        if (phone.length === 10 && /^\d{10}$/.test(phone)) {
          // This appears to be a 10-digit Indian number without country code
          phone = '+91' + phone;
        } else if (phone.startsWith('0') && phone.length === 11 && /^0\d{10}$/.test(phone)) {
          // This appears to be a 10-digit Indian number with leading 0
          phone = '+91' + phone.substring(1);
        } else if (!phone.startsWith('+') && !phone.startsWith('00')) {
          // If there's no international prefix, assume Indian number
          phone = '+91' + phone.replace(/^91/, ''); // Remove 91 prefix if it exists
        }
        
        return phone;
      });
    
    console.log('Formatted phone numbers for emergency SMS:', phoneNumbers);
    
    if (phoneNumbers.length > 0) {
      try {
        // Send SMS using the best available SMS provider
        const smsResult = await sendSMS(phoneNumbers, emergencyMessage);
        
        if (smsResult.success && smsResult.sentCount) {
          console.log('Successfully sent SMS to', smsResult.sentCount, 'contacts');
          successCount += smsResult.sentCount;
          
          // Log successful notifications
          for (const contact of contacts.filter(c => c.phone)) {
            await apiRequest('POST', '/api/emergency/log', {
              contactId: contact.id,
              message: emergencyMessage,
              success: true,
              errorMessage: 'Sent via SMS API'
            });
          }
        } else {
          console.error('SMS sending failed:', smsResult.message || smsResult.error);
          failureCount += phoneNumbers.length;
          errors.push(`Failed to send SMS: ${smsResult.message || smsResult.error}`);
          
          // Log the failed attempts
          await logNotifications(
            contacts.filter(c => c.phone), 
            emergencyMessage,
            false,
            `SMS sending failed: ${smsResult.message || smsResult.error}`
          );
        }
      } catch (error) {
        console.error('Failed to send via SMS API:', error);
        failureCount += phoneNumbers.length;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to send via SMS API: ${errorMsg}`);
        
        // Log the failed attempts
        await logNotifications(
          contacts.filter(c => c.phone),
          emergencyMessage,
          false,
          `SMS API error: ${errorMsg}`
        );
      }
    } else {
      // No phone numbers available
      errors.push("No valid phone numbers found for emergency contacts");
      console.error("No valid phone numbers found for emergency contacts");
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
 * Send SMS directly using Fast2SMS API
 * @param phoneNumbers - Array of phone numbers to send SMS to (should be Indian numbers)
 * @param message - Emergency message to send
 * @returns Promise with response from the server
 */
export async function sendFast2SMS(phoneNumbers: string[], message: string): Promise<SMSResponse> {
  try {
    console.log('Sending SMS via Fast2SMS to:', phoneNumbers);
    
    const response = await apiRequest('POST', '/api/emergency/sms/fast2sms', {
      phoneNumbers,
      message
    });
    
    const data = await response.json();
    
    // Add diagnostic information if there's an error for better user feedback
    if (!data.success && data.error) {
      try {
        // Try to parse the error if it's a JSON string
        const errorDetails = JSON.parse(data.error);
        console.warn('Fast2SMS error details:', errorDetails);
        
        // Additional context for common error codes
        if (errorDetails.status_code === 999) {
          console.info('Fast2SMS account needs setup: This is a new account that requires an initial transaction.');
        }
      } catch (e) {
        // If error is not a JSON string, just log it
        console.warn('Fast2SMS error (not JSON):', data.error);
      }
    }
    
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

/**
 * Send SMS directly using Twilio API
 * @param phoneNumbers - Array of phone numbers to send SMS to (international format)
 * @param message - Emergency message to send
 * @returns Promise with response from the server
 */
export async function sendTwilioSMS(phoneNumbers: string[], message: string): Promise<SMSResponse> {
  try {
    const response = await apiRequest('POST', '/api/emergency/sms/twilio', {
      phoneNumbers,
      message
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send SMS via Twilio API:', error);
    return {
      success: false,
      message: 'Failed to send SMS via Twilio',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send SMS using the best available method
 * This function automatically chooses the appropriate SMS service based on the phone numbers.
 * For Indian numbers, it uses Fast2SMS as the primary method.
 * 
 * NOTE: Currently only Indian phone numbers are fully supported through Fast2SMS.
 * International numbers require Twilio credentials to be configured.
 * 
 * @param phoneNumbers - Array of phone numbers to send SMS to
 * @param message - Emergency message to send
 * @returns Promise with response from the server
 */
export async function sendSMS(phoneNumbers: string[], message: string): Promise<SMSResponse> {
  try {
    console.log('Sending emergency SMS to:', phoneNumbers);
    
    const response = await apiRequest('POST', '/api/emergency/sms', {
      phoneNumbers,
      message
    });
    
    const data = await response.json();
    
    // Handle error responses with improved details
    if (!data.success && data.error) {
      console.warn('SMS API error:', data.error);
      
      // Check if the error is from Fast2SMS account setup requirements
      if (data.error.includes('transaction of 100 INR or more')) {
        console.info('Fast2SMS account setup required: Initial transaction needed to enable API access.');
        
        // Adjust error message to be more user-friendly
        data.message = 'SMS delivery temporarily unavailable. Fast2SMS setup pending. Emergency contact will be attempted through alternative methods.';
      }
    }
    
    return data;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return {
      success: false,
      message: 'Unable to send SMS notifications. Will attempt alternative contact methods.',
      error: error instanceof Error ? error.message : 'Network or server error'
    };
  }
}