import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { celebrateSave } from "@/lib/confetti";

interface VerifyFixButtonProps {
  onVerify: () => Promise<{
    nodesAdded: string[];
    nodesRemoved: string[];
    nodesModified: Array<{ name: string; changes: string[] }>;
    credentialsAdded: string[];
    summary: string;
  } | null>;
  onRefreshContext: () => Promise<void>;
  disabled?: boolean;
}

export default function VerifyFixButton({
  onVerify,
  onRefreshContext,
  disabled,
}: VerifyFixButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    nodesAdded: string[];
    nodesRemoved: string[];
    nodesModified: Array<{ name: string; changes: string[] }>;
    credentialsAdded: string[];
    summary: string;
  } | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    
    try {
      // First refresh the context to get latest data
      await onRefreshContext();
      
      // Then compare snapshots
      const result = await onVerify();
      setVerificationResult(result);
      setShowResults(true);

      // Celebrate if there were positive changes
      if (result && (result.nodesModified.length > 0 || result.credentialsAdded.length > 0)) {
        celebrateSave();
      }
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const hasImprovements = verificationResult && (
    verificationResult.nodesModified.length > 0 ||
    verificationResult.credentialsAdded.length > 0 ||
    verificationResult.nodesAdded.length > 0
  );

  return (
    <>
      <Button
        onClick={handleVerify}
        disabled={disabled || isVerifying}
        variant="outline"
        className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Verify My Fix
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {hasImprovements ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Changes Detected!
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-yellow-500" />
                  No Changes Found
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {verificationResult?.summary || "Comparing your workflow before and after."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <AnimatePresence mode="popLayout">
              {/* Credentials Added */}
              {verificationResult?.credentialsAdded && verificationResult.credentialsAdded.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-green-500">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium text-sm">Credentials Connected</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {verificationResult.credentialsAdded.map((node) => (
                      <Badge key={node} variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                        {node}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Nodes Modified */}
              {verificationResult?.nodesModified && verificationResult.nodesModified.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <ArrowRight className="w-4 h-4" />
                    <span className="font-medium text-sm">Nodes Updated</span>
                  </div>
                  <div className="space-y-1">
                    {verificationResult.nodesModified.map(({ name, changes }) => (
                      <div key={name} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-2 py-1">
                        <span>{name}</span>
                        <span className="text-muted-foreground text-xs">{changes.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Nodes Added */}
              {verificationResult?.nodesAdded && verificationResult.nodesAdded.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-blue-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium text-sm">New Nodes Added</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {verificationResult.nodesAdded.map((node) => (
                      <Badge key={node} variant="secondary">
                        {node}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* No changes message */}
              {!hasImprovements && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4"
                >
                  <p className="text-muted-foreground text-sm">
                    No changes detected between snapshots. Try making your changes in n8n first, then verify again.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowResults(false)}>
              Close
            </Button>
            {hasImprovements && (
              <Button onClick={() => setShowResults(false)} className="bg-gradient-primary">
                Continue Troubleshooting
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
