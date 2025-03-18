import { users, projects, tasks, projectMembers } from "@shared/schema";
import type { User, Project, Task, ProjectMember, InsertUser, InsertProject, InsertTask } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<void>;
  updateUserGoogleId(userId: number, googleId: string): Promise<void>;

  // Project operations
  createProject(project: InsertProject & { creatorId: number }): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  addProjectMember(projectId: number, userId: number, role?: string): Promise<void>;
  getProjectMembers(projectId: number): Promise<ProjectMember[]>;

  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTasks(projectId: number): Promise<Task[]>;
  updateTaskStatus(taskId: number, status: string): Promise<void>;
  assignTask(taskId: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPoints(userId: number, points: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    await db.update(users)
      .set({ points: user.points + points })
      .where(eq(users.id, userId));
  }

  async updateUserGoogleId(userId: number, googleId: string): Promise<void> {
    await db.update(users)
      .set({ googleId })
      .where(eq(users.id, userId));
  }

  async createProject(project: InsertProject & { creatorId: number }): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();

    // Add creator as project member
    await this.addProjectMember(newProject.id, project.creatorId, "owner");
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    const result = await db
      .select({
        project: projects,
      })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId))
      .innerJoin(projects, eq(projects.id, projectMembers.projectId));

    return result.map(r => r.project);
  }

  async addProjectMember(projectId: number, userId: number, role: string = "member"): Promise<void> {
    await db.insert(projectMembers).values({ projectId, userId, role });
  }

  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values({ ...task, status: "todo" })
      .returning();
    return newTask;
  }

  async getTasks(projectId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
  }

  async updateTaskStatus(taskId: number, status: string): Promise<void> {
    await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, taskId));
  }

  async assignTask(taskId: number, userId: number): Promise<void> {
    await db
      .update(tasks)
      .set({ assigneeId: userId })
      .where(eq(tasks.id, taskId));
  }
}

export const storage = new DatabaseStorage();