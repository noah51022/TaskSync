import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, ProjectMember } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  members: ProjectMember[];
}

const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default function TaskCard({ task, members }: TaskCardProps) {
  const assignee = members.find((m) => m.userId === task.assigneeId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const currentStatus = statusOptions.find((s) => s.value === task.status) || statusOptions[0];

  async function updateStatus(newStatus: string) {
    try {
      await apiRequest("PATCH", `/api/tasks/${task.id}/status`, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.projectId}/tasks`] });

      toast({
        title: "Success",
        description: "Task status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="bg-card hover:bg-accent/5 transition-colors">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                {currentStatus.label}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {statusOptions.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => updateStatus(status.value)}
                  className="text-sm"
                >
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground">{task.description}</p>
        {assignee && (
          <div className="mt-4">
            <Avatar className="h-6 w-6">
              <AvatarFallback>
                {assignee.userId.toString()[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </CardContent>
    </Card>
  );
}