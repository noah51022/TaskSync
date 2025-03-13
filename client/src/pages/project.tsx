import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { Project, Task, ProjectMember } from "@shared/schema";
import TaskCard from "@/components/project/task-card";
import MemberList from "@/components/project/member-list";
import ProgressChart from "@/components/project/progress-chart";
import CreateTaskDialog from "@/components/project/create-task-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectPage() {
  const { id } = useParams();
  const projectId = parseInt(id);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: [`/api/projects/${id}/tasks`],
  });

  const { data: members } = useQuery<ProjectMember[]>({
    queryKey: [`/api/projects/${id}/members`],
  });

  if (!project || !tasks || !members) {
    return <div>Loading...</div>;
  }

  const todoTasks = tasks.filter((task) => task.status === "todo");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const doneTasks = tasks.filter((task) => task.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">{project.name}</h1>
        <CreateTaskDialog projectId={projectId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>To Do</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {todoTasks.map((task) => (
                  <TaskCard key={task.id} task={task} members={members} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>In Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {inProgressTasks.map((task) => (
                  <TaskCard key={task.id} task={task} members={members} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Done</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doneTasks.map((task) => (
                  <TaskCard key={task.id} task={task} members={members} />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <MemberList members={members} />
          <ProgressChart tasks={tasks} />
        </div>
      </div>
    </div>
  );
}