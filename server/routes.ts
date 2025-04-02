import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertContactSchema } from "@shared/schema";
import { sendSMS as sendFast2SMS, isValidIndianPhoneNumber } from "./services/fast2sms";
import { sendSMS as sendTwilioSMS } from "./services/twilio";

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
  
  // Log emergency notification 
  app.post('/api/emergency/log', async (req: Request, res: Response) => {
    try {
      const { contactId, message, success, errorMessage } = req.body;
      
      // Validate required fields
      if (!contactId || !message) {
        return res.status(400).json({ message: "Missing required notification data" });
      }
      
      // Log the notification
      await storage.logNotification(contactId, message, success, errorMessage);
      
      res.json({
        success: true,
        message: "Notification logged successfully"
      });
    } catch (error) {
      console.error('Emergency notification log error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to log notification",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Send emergency SMS via Fast2SMS (for Indian numbers)
  app.post('/api/emergency/sms/fast2sms', async (req: Request, res: Response) => {
    try {
      const { phoneNumbers, message } = req.body;
      
      // Validate required fields
      if (!phoneNumbers || !Array.isArray(phoneNumbers) || !message) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required data. Please provide phoneNumbers array and message."
        });
      }
      
      // Filter valid Indian phone numbers only
      const validPhoneNumbers = phoneNumbers.filter(isValidIndianPhoneNumber);
      const invalidPhoneNumbers = phoneNumbers.filter(num => !isValidIndianPhoneNumber(num));
      
      if (validPhoneNumbers.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: "No valid Indian phone numbers provided. Fast2SMS only supports Indian numbers.",
          invalidNumbers: invalidPhoneNumbers
        });
      }
      
      // Send SMS using Fast2SMS
      const result = await sendFast2SMS(validPhoneNumbers, message);
      
      if (result.success) {
        res.json({
          success: true,
          message: "SMS sent successfully",
          sentCount: result.sentCount,
          invalidNumbers: invalidPhoneNumbers.length > 0 ? invalidPhoneNumbers : undefined
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: "Failed to send SMS",
          error: result.error,
          invalidNumbers: invalidPhoneNumbers.length > 0 ? invalidPhoneNumbers : undefined
        });
      }
    } catch (error) {
      console.error('Emergency SMS error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to send SMS",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Send emergency SMS via Twilio (for international numbers)
  app.post('/api/emergency/sms/twilio', async (req: Request, res: Response) => {
    try {
      const { phoneNumbers, message } = req.body;
      
      // Validate required fields
      if (!phoneNumbers || !Array.isArray(phoneNumbers) || !message) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required data. Please provide phoneNumbers array and message."
        });
      }
      
      // Send SMS using Twilio
      const result = await sendTwilioSMS(phoneNumbers, message);
      
      if (result.success) {
        res.json({
          success: true,
          message: "SMS sent successfully via Twilio",
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          messages: result.messages
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: "Failed to send SMS via Twilio",
          errors: result.errors
        });
      }
    } catch (error) {
      console.error('Twilio SMS error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to send SMS via Twilio",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // General SMS endpoint that selects the appropriate service
  app.post('/api/emergency/sms', async (req: Request, res: Response) => {
    try {
      const { phoneNumbers, message } = req.body;
      
      // Validate required fields
      if (!phoneNumbers || !Array.isArray(phoneNumbers) || !message) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required data. Please provide phoneNumbers array and message."
        });
      }
      
      // Separate Indian and International numbers
      const indianNumbers = phoneNumbers.filter(isValidIndianPhoneNumber);
      const internationalNumbers = phoneNumbers.filter(num => !isValidIndianPhoneNumber(num));
      
      const results = {
        success: false,
        sentCount: 0,
        failedCount: 0,
        indianResults: null as any,
        internationalResults: null as any
      };
      
      // Send Indian numbers via Fast2SMS if available
      if (indianNumbers.length > 0) {
        try {
          const fast2smsResult = await sendFast2SMS(indianNumbers, message);
          results.indianResults = fast2smsResult;
          
          if (fast2smsResult.success) {
            results.sentCount += fast2smsResult.sentCount || 0;
          } else {
            results.failedCount += indianNumbers.length;
          }
        } catch (error) {
          console.error('Fast2SMS error:', error);
          results.failedCount += indianNumbers.length;
          results.indianResults = { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          };
        }
      }
      
      // Check if there are any international numbers
      if (internationalNumbers.length > 0) {
        // Check if Twilio secrets are configured
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
          console.warn('Twilio not configured, but international numbers were provided');
          results.failedCount += internationalNumbers.length;
          results.internationalResults = {
            success: false,
            message: "Twilio credentials not configured. Only Indian numbers are supported.",
            failedCount: internationalNumbers.length,
            invalidNumbers: internationalNumbers
          };
        } else {
          // Send international numbers via Twilio
          try {
            const twilioResult = await sendTwilioSMS(internationalNumbers, message);
            results.internationalResults = twilioResult;
            
            if (twilioResult.success) {
              results.sentCount += twilioResult.sentCount || 0;
            }
            results.failedCount += twilioResult.failedCount || 0;
          } catch (error) {
            console.error('Twilio error:', error);
            results.failedCount += internationalNumbers.length;
            results.internationalResults = { 
              success: false, 
              error: error instanceof Error ? error.message : "Unknown error" 
            };
          }
        }
      }
      
      results.success = results.sentCount > 0;
      
      // Return appropriate response based on results
      if (results.success) {
        res.json({
          success: true,
          message: "SMS sent successfully",
          sentCount: results.sentCount,
          failedCount: results.failedCount,
          indianResults: results.indianResults,
          internationalResults: results.internationalResults
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: "Failed to send SMS to any recipients",
          indianResults: results.indianResults,
          internationalResults: results.internationalResults
        });
      }
    } catch (error) {
      console.error('Emergency SMS error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to send SMS",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
