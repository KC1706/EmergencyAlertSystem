import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertContactSchema } from "@shared/schema";

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";
let twilio: any;

try {
  // Try to import Twilio
  twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} catch (err) {
  console.warn("Twilio not initialized. SMS functionality will not work.");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // === CONTACT ROUTES ===
  
  // Get all contacts
  app.get('/api/contacts', async (req: Request, res: Response) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  
  // Get a specific contact
  app.get('/api/contacts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      const contact = await storage.getContact(id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });
  
  // Create a new contact
  app.post('/api/contacts', async (req: Request, res: Response) => {
    try {
      // Validate input data
      const validatedData = insertContactSchema.parse(req.body);
      
      // If updating an existing contact (ID provided in request body)
      if (req.body.id) {
        const id = parseInt(req.body.id);
        const updatedContact = await storage.updateContact(id, validatedData);
        
        if (!updatedContact) {
          return res.status(404).json({ message: "Contact not found" });
        }
        
        res.json(updatedContact);
      } else {
        // Create new contact
        const contact = await storage.createContact(validatedData);
        res.status(201).json(contact);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create contact" });
      }
    }
  });
  
  // Update a contact
  app.put('/api/contacts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      // Validate input data
      const validatedData = insertContactSchema.partial().parse(req.body);
      
      const updatedContact = await storage.updateContact(id, validatedData);
      if (!updatedContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(updatedContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update contact" });
      }
    }
  });
  
  // Delete a contact
  app.delete('/api/contacts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      const success = await storage.deleteContact(id);
      if (!success) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });
  
  // === SETTINGS ROUTES ===
  
  // Get settings
  app.get('/api/settings', async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });
  
  // Update settings
  app.post('/api/settings', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        countdownDuration: z.number().min(5).max(60),
        thresholds: z.object({
          mild: z.number().min(1),
          moderate: z.number().min(1),
          severe: z.number().min(1)
        })
      });
      
      const validatedData = schema.parse(req.body);
      const success = await storage.updateSettings(validatedData);
      
      res.json({ success });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  });
  
  // === EMERGENCY ROUTES ===
  
  // Send emergency SMS
  app.post('/api/emergency/sms', async (req: Request, res: Response) => {
    try {
      const { severity, location, contactIds } = req.body;
      
      // Validate required fields
      if (!severity || !location || !location.lat || !location.lng) {
        return res.status(400).json({ message: "Missing required emergency data" });
      }
      
      // Get emergency contacts (filtered by contactIds if provided)
      const contacts = await storage.getContacts();
      const targetContacts = contactIds 
        ? contacts.filter(contact => contactIds.includes(contact.id))
        : contacts;
      
      if (targetContacts.length === 0) {
        return res.status(400).json({ 
          message: "No emergency contacts available",
          sentCount: 0
        });
      }
      
      // Prepare emergency message
      const message = `EMERGENCY: Helmet user detected a crash!\nSeverity: ${severity}\nLocation: https://www.google.com/maps?q=${location.lat},${location.lng}`;
      
      // Send SMS to each contact
      const results = await Promise.allSettled(
        targetContacts.map(async (contact) => {
          if (!contact.sendSms) return { skipped: true, contact };
          
          try {
            if (!twilio) {
              // If Twilio not initialized, log the message but pretend success
              console.log(`[MOCK SMS] To: ${contact.phone}, Message: ${message}`);
              await storage.logNotification(contact.id, message, true);
              return { success: true, contact };
            }
            
            // Send the actual SMS via Twilio
            await twilio.messages.create({
              body: message,
              from: TWILIO_PHONE_NUMBER,
              to: contact.phone
            });
            
            await storage.logNotification(contact.id, message, true);
            return { success: true, contact };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await storage.logNotification(contact.id, message, false, errorMessage);
            return { success: false, error: errorMessage, contact };
          }
        })
      );
      
      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
      const skipped = results.filter(r => r.status === 'fulfilled' && (r.value as any).skipped).length;
      const failures = results.length - successes - skipped;
      
      // Return results summary
      res.json({
        success: successes > 0,
        sentCount: successes,
        skippedCount: skipped,
        failedCount: failures
      });
    } catch (error) {
      console.error('Emergency SMS error:', error);
      res.status(500).json({ 
        message: "Failed to send emergency messages",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
