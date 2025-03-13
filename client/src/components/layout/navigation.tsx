import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CreateProjectDialog from "@/components/project/create-project-dialog";

export default function Navigation() {
  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <a className="text-2xl font-bold text-primary">StudyFlow</a>
        </Link>
        <div className="flex items-center gap-4">
          <CreateProjectDialog />
        </div>
      </div>
    </nav>
  );
}