import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@shared/schema";

interface ProgressChartProps {
  tasks: Task[];
}

export default function ProgressChart({ tasks }: ProgressChartProps) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">
            {completed} of {total} tasks completed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
