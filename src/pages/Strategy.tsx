import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { StrategicCommandPanel } from "@/components/StrategicCommand";
import SubPageHeader from "@/components/SubPageHeader";
import { Loader2 } from "lucide-react";

export default function Strategy() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <SubPageHeader
        title="Strategy"
        description="Strategic Command Center · roadmap, performance intelligence, and async architect tools."
      />
      <main className="container mx-auto px-6 py-8">
        <StrategicCommandPanel />
      </main>
    </div>
  );
}
