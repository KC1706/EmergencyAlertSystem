import twilio from 'twilio';

/**
 * Send SMS using Twilio service
 * @param phoneNumbers - Array of phone numbers to send SMS to
 * @param message - Message to send
 * @returns Promise with response from Twilio
 */
export async function sendSMS(phoneNumbers: string[], message: string): Promise<any> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.log("Twilio credentials not configured - using Fast2SMS for Indian numbers only");
    return {
      success: false,
      message: "Twilio credentials not configured. For international numbers, please set up Twilio.",
      sentCount: 0,
      failedCount: phoneNumbers.length,
      errors: [{
        error: "Twilio credentials missing. Only Indian numbers are supported via Fast2SMS."
      }]
    };
  }

  // Initialize Twilio client
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  const results = {
    success: false,
    sentCount: 0,
    failedCount: 0,
    messages: [] as any[],
    errors: [] as any[]
  };

  // Send SMS to each phone number
  const promises = phoneNumbers.map(async (phoneNumber) => {
    try {
      // Format the phone number if it doesn't have a + prefix
      const formattedNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+${phoneNumber}`;
        
      const twilioMessage = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedNumber
      });
      
      results.sentCount++;
      if (twilioMessage && typeof twilioMessage === 'object' && 'sid' in twilioMessage && 'status' in twilioMessage) {
        results.messages.push({
          to: phoneNumber,
          messageId: twilioMessage.sid,
          status: twilioMessage.status
        });
      } else {
        results.messages.push({
          to: phoneNumber,
          messageId: 'unknown',
          status: 'sent'
        });
      }
      
      return twilioMessage;
    } catch (error) {
      results.failedCount++;
      
      results.errors.push({
        to: phoneNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.error(`Failed to send SMS to ${phoneNumber}:`, error);
      return error;
    }
  });
  
  // Wait for all SMS to be sent
  await Promise.all(promises);
  
  results.success = results.sentCount > 0;
  
  return results;
}