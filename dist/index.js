var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import "dotenv/config";
import session from "express-session";
import passport3 from "passport";

// server/services/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  insertProjectSchema: () => insertProjectSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertUserSchema: () => insertUserSchema,
  projectMembers: () => projectMembers,
  projects: () => projects,
  tasks: () => tasks,
  users: () => users
});
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  points: integer("points").notNull().default(0)
});
var projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull(),
  deadline: timestamp("deadline")
});
var tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: integer("assignee_id"),
  status: text("status").notNull().default("todo"),
  deadline: timestamp("deadline")
});
var projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("member")
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  googleId: true,
  displayName: true,
  avatarUrl: true
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  googleId: z.string().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional()
});
var insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  deadline: true
}).extend({
  name: z.string().min(1, "Project name is required"),
  description: z.string().nullable(),
  deadline: z.string().nullable().transform((val) => val ? new Date(val) : null)
});
var insertTaskSchema = createInsertSchema(tasks).pick({
  projectId: true,
  title: true,
  description: true
}).extend({
  title: z.string().min(1, "Task title is required"),
  description: z.string().nullable()
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUserByGoogleId(googleId) {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUserPoints(userId, points) {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    await db.update(users).set({ points: user.points + points }).where(eq(users.id, userId));
  }
  async updateUserGoogleId(userId, googleId) {
    await db.update(users).set({ googleId }).where(eq(users.id, userId));
  }
  async createProject(project) {
    const [newProject] = await db.insert(projects).values(project).returning();
    await this.addProjectMember(newProject.id, project.creatorId, "owner");
    return newProject;
  }
  async getProject(id) {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }
  async getProjectsByUser(userId) {
    const result = await db.select({
      project: projects
    }).from(projectMembers).where(eq(projectMembers.userId, userId)).innerJoin(projects, eq(projects.id, projectMembers.projectId));
    return result.map((r) => r.project);
  }
  async addProjectMember(projectId, userId, role = "member") {
    await db.insert(projectMembers).values({ projectId, userId, role });
  }
  async getProjectMembers(projectId) {
    return await db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
  }
  async createTask(task) {
    const [newTask] = await db.insert(tasks).values({ ...task, status: "todo" }).returning();
    return newTask;
  }
  async getTasks(projectId) {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }
  async updateTaskStatus(taskId, status) {
    await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
  }
  async assignTask(taskId, userId) {
    await db.update(tasks).set({ assigneeId: userId }).where(eq(tasks.id, taskId));
  }
};
var storage = new DatabaseStorage();

// server/services/auth.ts
import bcrypt from "bcryptjs";
function setupAuth() {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: "Incorrect email or password" });
      }
      if (!user.password) {
        return done(null, false, { message: "This account uses Google authentication" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: "Incorrect email or password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackURL: "/auth/google/callback",
    scope: ["profile", "email"]
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await storage.getUserByGoogleId(profile.id);
      if (user) {
        return done(null, user);
      }
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error("No email found in Google profile"));
      }
      user = await storage.getUserByEmail(email);
      if (user) {
        await storage.updateUserGoogleId(user.id, profile.id);
        return done(null, user);
      }
      const newUser = await storage.createUser({
        username: profile.displayName.replace(/\s+/g, "_").toLowerCase() || `user_${Date.now()}`,
        email,
        googleId: profile.id,
        displayName: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value
      });
      return done(null, newUser);
    } catch (err) {
      return done(err);
    }
  }));
  return passport;
}

// server/routes/auth.ts
import { Router } from "express";
import passport2 from "passport";
import bcrypt2 from "bcryptjs";
var router = Router();
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }
    const salt = await bcrypt2.genSalt(10);
    const hashedPassword = await bcrypt2.hash(password, salt);
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword
    });
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to login after registration" });
      }
      return res.json({ user: { id: user.id, username: user.username, email: user.email } });
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});
router.post("/login", (req, res, next) => {
  passport2.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || "Authentication failed" });
    }
    req.login(user, (err2) => {
      if (err2) {
        return next(err2);
      }
      return res.json({ user: { id: user.id, username: user.username, email: user.email } });
    });
  })(req, res, next);
});
router.get(
  "/google",
  passport2.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport2.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/");
  }
);
router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = req.user;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl
    }
  });
});
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});
var auth_default = router;

// server/routes.ts
import { createServer } from "http";
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  app2.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });
  app2.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({
        ...projectData,
        creatorId: 1
        // TODO: Get from session
      });
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });
  app2.get("/api/projects", async (req, res) => {
    try {
      const projects2 = await storage.getProjectsByUser(1);
      res.json(projects2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });
  app2.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  });
  app2.get("/api/projects/:id/members", async (req, res) => {
    const members = await storage.getProjectMembers(parseInt(req.params.id));
    res.json(members);
  });
  app2.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });
  app2.get("/api/projects/:id/tasks", async (req, res) => {
    const tasks2 = await storage.getTasks(parseInt(req.params.id));
    res.json(tasks2);
  });
  app2.patch("/api/tasks/:id/status", async (req, res) => {
    const statusSchema = z2.object({ status: z2.string() });
    try {
      const { status } = statusSchema.parse(req.body);
      await storage.updateTaskStatus(parseInt(req.params.id), status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid status" });
    }
  });
  app2.patch("/api/tasks/:id/assign", async (req, res) => {
    const assignSchema = z2.object({ userId: z2.number() });
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

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 1e3 * 60 * 60 * 24 * 7
    // 1 week
  }
}));
setupAuth();
app.use(passport3.initialize());
app.use(passport3.session());
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api") || path3.startsWith("/auth")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
app.use("/auth", auth_default);
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 3e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
