import { users, type User, type InsertUser, contacts, type Contact, type InsertContact, notifications } from "@shared/schema";

// Storage interface with CRUD operations for all schema entities
export interface IStorage {
  // User methods (from initial template)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Contact methods
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;
  
  // Settings methods
  getSettings(): Promise<{
    countdownDuration: number;
    thresholds: {
      mild: number;
      moderate: number;
      severe: number;
    }
  }>;
  updateSettings(settings: {
    countdownDuration: number;
    thresholds: {
      mild: number;
      moderate: number;
      severe: number;
    }
  }): Promise<boolean>;
  
  // Notification methods
  logNotification(contactId: number, message: string, success: boolean, errorMessage?: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contactsStore: Map<number, Contact>;
  private notificationsStore: any[];
  private appSettings: {
    countdownDuration: number;
    thresholds: {
      mild: number;
      moderate: number;
      severe: number;
    }
  };
  currentId: number;
  currentContactId: number;

  constructor() {
    this.users = new Map();
    this.contactsStore = new Map();
    this.notificationsStore = [];
    this.currentId = 1;
    this.currentContactId = 1;
    this.appSettings = {
      countdownDuration: 15,
      thresholds: {
        mild: 7,
        moderate: 15,
        severe: 35
      }
    };
    
    // Add some sample emergency contacts
    this.createContact({
      name: "John Doe",
      phone: "+12345678901",
      email: "john.doe@example.com",
      sendSms: true,
      sendEmail: false,
      userId: null
    });
    
    this.createContact({
      name: "Sarah Smith",
      phone: "+19876543210",
      email: "sarah.smith@example.com",
      sendSms: true,
      sendEmail: false,
      userId: null
    });
  }

  // User methods (from initial template)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Contact methods
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contactsStore.values());
  }
  
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contactsStore.get(id);
  }
  
  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    // Ensure all required fields are present with defaults
    const newContact: Contact = { 
      ...contact, 
      id,
      email: contact.email || null,
      sendSms: contact.sendSms === undefined ? true : contact.sendSms,
      sendEmail: contact.sendEmail === undefined ? false : contact.sendEmail,
      userId: contact.userId === undefined ? null : contact.userId
    };
    this.contactsStore.set(id, newContact);
    return newContact;
  }
  
  async updateContact(id: number, updatedFields: Partial<InsertContact>): Promise<Contact | undefined> {
    const contact = this.contactsStore.get(id);
    if (!contact) return undefined;
    
    const updatedContact = { ...contact, ...updatedFields };
    this.contactsStore.set(id, updatedContact);
    return updatedContact;
  }
  
  async deleteContact(id: number): Promise<boolean> {
    return this.contactsStore.delete(id);
  }
  
  // Settings methods
  async getSettings(): Promise<{
    countdownDuration: number;
    thresholds: {
      mild: number;
      moderate: number;
      severe: number;
    }
  }> {
    return this.appSettings;
  }
  
  async updateSettings(settings: {
    countdownDuration: number;
    thresholds: {
      mild: number;
      moderate: number;
      severe: number;
    }
  }): Promise<boolean> {
    this.appSettings = settings;
    return true;
  }
  
  // Notification methods
  async logNotification(contactId: number, message: string, success: boolean, errorMessage?: string): Promise<void> {
    this.notificationsStore.push({
      id: this.notificationsStore.length + 1,
      contactId,
      message,
      sentAt: new Date().toISOString(),
      success,
      errorMessage
    });
  }
}

export const storage = new MemStorage();
