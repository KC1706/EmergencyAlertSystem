// Using the built-in fetch API

/**
 * Send SMS using Fast2SMS service
 * @param phoneNumbers - Array of phone numbers (should be Indian numbers)
 * @param message - Message to send (max 160 characters)
 * @returns Promise with response from Fast2SMS
 */
export async function sendSMS(phoneNumbers: string[], message: string): Promise<any> {
  if (!process.env.FAST2SMS_API_KEY) {
    throw new Error('FAST2SMS_API_KEY environment variable is not set');
  }

  // Validate phone numbers
  const validPhoneNumbers = phoneNumbers.filter(phone => isValidIndianPhoneNumber(phone));
  
  if (validPhoneNumbers.length === 0) {
    return {
      success: false,
      message: 'No valid phone numbers provided',
      invalidNumbers: phoneNumbers
    };
  }

  // Trim message to 160 characters if longer
  const trimmedMessage = message.length > 160 
    ? message.substring(0, 157) + '...' 
    : message;

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'Authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q', // Quick SMS route
        message: trimmedMessage,
        numbers: validPhoneNumbers.join(',')
      })
    });

    const data = await response.json();
    
    if (data.return === true) {
      return {
        success: true,
        message: 'SMS sent successfully',
        sentCount: validPhoneNumbers.length,
        requestId: data.request_id
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to send SMS',
        error: JSON.stringify(data)
      };
    }
  } catch (error) {
    console.error('Fast2SMS API error:', error);
    return {
      success: false,
      message: 'Error connecting to Fast2SMS API',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Verify if a phone number is valid for Fast2SMS (Indian numbers)
 * @param phoneNumber - Phone number to verify
 * @returns boolean indicating if phone number is valid
 */
export function isValidIndianPhoneNumber(phoneNumber: string): boolean {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a valid Indian mobile number (10 digits, optionally with country code)
  // India's country code is +91
  if (digitsOnly.length === 10) {
    return true;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return true;
  } else if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
    return true;
  }
  
  return false;
}