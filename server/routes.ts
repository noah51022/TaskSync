import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertTaskSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  // Project routes
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({
        ...projectData,
        creatorId: 1, // TODO: Get from session
      });
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      // For now, using userId 1 since we haven't implemented authentication yet
      const projects = await storage.getProjectsByUser(1);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  });

  app.get("/api/projects/:id/members", async (req, res) => {
    const members = await storage.getProjectMembers(parseInt(req.params.id));
    res.json(members);
  });

  // Task routes
  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.get("/api/projects/:id/tasks", async (req, res) => {
    const tasks = await storage.getTasks(parseInt(req.params.id));
    res.json(tasks);
  });

  app.patch("/api/tasks/:id/status", async (req, res) => {
    const statusSchema = z.object({ status: z.string() });
    try {
      const { status } = statusSchema.parse(req.body);
      await storage.updateTaskStatus(parseInt(req.params.id), status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid status" });
    }
  });

  app.patch("/api/tasks/:id/assign", async (req, res) => {
    const assignSchema = z.object({ userId: z.number() });
    try {
      const { userId } = assignSchema.parse(req.body);
      await storage.assignTask(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid assignment" });
    }
  });

  return httpServer;
}