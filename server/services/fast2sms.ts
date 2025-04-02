// Using the built-in fetch API

/**
 * Send SMS using Fast2SMS service
 * @param phoneNumbers - Array of phone numbers (should be Indian numbers)
 * @param message - Message to send (max 160 characters)
 * @returns Promise with response from Fast2SMS
 */
export async function sendSMS(phoneNumbers: string[], message: string): Promise<any> {
  if (!process.env.FAST2SMS_API_KEY) {
    console.error('Fast2SMS API error: FAST2SMS_API_KEY environment variable is not set');
    throw new Error('FAST2SMS_API_KEY environment variable is not set');
  }

  console.log('Fast2SMS preparing to send to numbers:', phoneNumbers);
  
  // Format phone numbers - Fast2SMS doesn't need the country code and expects 10 digits
  const processedNumbers = phoneNumbers.map(phone => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Handle country code (+91) automatically 
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return digitsOnly.slice(2); // Remove the country code
    } else if (digitsOnly.startsWith('091') && digitsOnly.length === 13) {
      return digitsOnly.slice(3); // Remove the country code with leading 0
    }
    
    return digitsOnly; // Return the numbers as is if already in correct format
  });

  // Validate phone numbers
  const validPhoneNumbers = processedNumbers.filter(phone => phone.length === 10);
  
  if (validPhoneNumbers.length === 0) {
    console.error('Fast2SMS error: No valid 10-digit phone numbers provided');
    return {
      success: false,
      message: 'No valid phone numbers provided. Indian phone numbers must be 10 digits.',
      invalidNumbers: phoneNumbers
    };
  }

  // Trim message to 160 characters if longer
  const trimmedMessage = message.length > 160 
    ? message.substring(0, 157) + '...' 
    : message;

  console.log('Fast2SMS sending to numbers:', validPhoneNumbers);
  console.log('Fast2SMS message:', trimmedMessage);

  try {
    // Fast2SMS API endpoint (updated per latest docs)
    const apiEndpoint = 'https://www.fast2sms.com/dev/bulkV2';
    
    // Log API key (partial - only first few characters for security)
    const apiKeyPartial = process.env.FAST2SMS_API_KEY?.substring(0, 5) + '...' + process.env.FAST2SMS_API_KEY?.substring(process.env.FAST2SMS_API_KEY.length - 5);
    console.log('Using Fast2SMS API key (partial):', apiKeyPartial);
    
    // Updated API format based on Fast2SMS documentation (non-DLT route for now)
    console.log('Fast2SMS attempting API request to:', apiEndpoint);
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        route: 'q', // Using quick SMS route (no DLT registration required)
        message: trimmedMessage,
        language: 'english',
        flash: '0',
        numbers: validPhoneNumbers.join(',')
      }).toString()
    });

    const responseText = await response.text();
    console.log('Fast2SMS API raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      console.error('Fast2SMS API returned invalid JSON:', responseText);
      return {
        success: false,
        message: 'Invalid response from Fast2SMS API',
        error: 'Response was not valid JSON: ' + responseText
      };
    }
    
    console.log('Fast2SMS API response data:', data);
    
    // Handle successful response
    if (data.return === true) {
      return {
        success: true,
        message: 'SMS sent successfully',
        sentCount: validPhoneNumbers.length,
        requestId: data.request_id
      };
    } 
    // Handle common Fast2SMS error scenarios with descriptive messages
    else {
      console.error('Fast2SMS API returned error:', data);
      
      let errorMessage = data.message || 'Failed to send SMS';
      
      // Provide more helpful messages for common error codes
      if (data.status_code === 999) {
        errorMessage = 'Account setup required: Fast2SMS requires an initial transaction of 100 INR or more to activate API services.';
      } else if (data.status_code === 412) {
        errorMessage = 'Authentication failed: The Fast2SMS API key appears to be invalid or expired.';
      } else if (data.status_code === 402) {
        errorMessage = 'Insufficient balance: Please recharge your Fast2SMS account.';
      } else if (data.status_code === 501) {
        errorMessage = 'Message content error: The SMS message may contain blacklisted keywords or be too long.';
      }
      
      return {
        success: false,
        message: errorMessage,
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
  } else if (phoneNumber.startsWith('+91') && digitsOnly.length === 12) {
    return true;
  }
  
  return false;
}