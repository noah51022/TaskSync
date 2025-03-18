import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  points: integer("points").notNull().default(0),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull(),
  deadline: timestamp("deadline"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: integer("assignee_id"),
  status: text("status").notNull().default("todo"),
  deadline: timestamp("deadline"),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("member"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  googleId: true,
  displayName: true,
  avatarUrl: true,
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  googleId: z.string().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  deadline: true,
}).extend({
  name: z.string().min(1, "Project name is required"),
  description: z.string().nullable(),
  deadline: z.string().nullable().transform(val => val ? new Date(val) : null),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  projectId: true,
  title: true,
  description: true,
}).extend({
  title: z.string().min(1, "Task title is required"),
  description: z.string().nullable(),
});

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;