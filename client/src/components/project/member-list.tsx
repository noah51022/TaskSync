import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ProjectMember } from "@shared/schema";

interface MemberListProps {
  members: ProjectMember[];
}

export default function MemberList({ members }: MemberListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {member.userId.toString()[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">User {member.userId}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {member.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
