import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertContactSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
