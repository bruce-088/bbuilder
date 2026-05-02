import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Users, Workflow, MessagesSquare, FileText, Map as MapIcon, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExportSpecButton from "@/components/ExportSpecButton";


interface SubPageHeaderProps {
  title: string;
  description?: string;
}

export default function SubPageHeader({ title, description }: SubPageHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <>
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
            aria-label="Back to dashboard"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Mya</span>
          </button>
          <div className="flex items-center gap-1">
            <Button onClick={() => navigate("/leads")} variant="ghost" size="sm">
              <Users className="w-4 h-4 mr-2" /> Leads
            </Button>
            <Button onClick={() => navigate("/workflows")} variant="ghost" size="sm">
              <Workflow className="w-4 h-4 mr-2" /> Workflows
            </Button>
            <Button onClick={() => navigate("/conversations")} variant="ghost" size="sm">
              <MessagesSquare className="w-4 h-4 mr-2" /> Conversations
            </Button>
            <Button onClick={() => navigate("/plans")} variant="ghost" size="sm">
              <FileText className="w-4 h-4 mr-2" /> Plans
            </Button>
            <Button onClick={() => navigate("/strategy")} variant="ghost" size="sm">
              <MapIcon className="w-4 h-4 mr-2" /> Strategy
            </Button>
            <ExportSpecButton />
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-6 pt-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </Button>
        <h1 className="font-display text-2xl md:text-3xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </>
  );
}
