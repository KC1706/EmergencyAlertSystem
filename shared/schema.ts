import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (from initial template)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Emergency contacts schema
export const contacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  sendSms: boolean("send_sms").default(true),
  sendEmail: boolean("send_email").default(false),
  userId: integer("user_id"), // Optional foreign key if implementing user system
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  name: true,
  phone: true,
  email: true,
  sendSms: true,
  sendEmail: true,
  userId: true,
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// Settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  countdownDuration: integer("countdown_duration").default(15),
  mildThreshold: integer("mild_threshold").default(7),
  moderateThreshold: integer("moderate_threshold").default(15),
  severeThreshold: integer("severe_threshold").default(35),
  userId: integer("user_id"), // Optional foreign key
});

// SMS notification history schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  message: text("message").notNull(),
  sentAt: text("sent_at").notNull(), // Store ISO datetime string
  success: boolean("success").default(false),
  errorMessage: text("error_message"),
});
