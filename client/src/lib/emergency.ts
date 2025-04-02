import { apiRequest } from "./queryClient";
import type { Contact } from "@shared/schema";

interface EmergencyResponse {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

/**
 * Send emergency SMS notifications to all emergency contacts
 */
export async function sendEmergencyNotifications(
  severity: string,
  location: { lat: number; lng: number },
  contacts?: Contact[]
): Promise<EmergencyResponse> {
  try {
    const payload = {
      severity,
      location,
      // Optional: Can pass specific contacts to notify
      contactIds: contacts?.map(c => c.id)
    };
    
    const response = await apiRequest('POST', '/api/emergency/sms', payload);
    return await response.json();
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
Location: https://www.google.com/maps?q=${location.lat},${location.lng}`;
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
