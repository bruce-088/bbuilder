import { CheckCircle, XCircle, Workflow, UserPlus, Play, List, Users, DollarSign, BarChart3, ArrowRightLeft, MessageSquare, Trash2, Clock, Brain, TrendingUp, FileText, Download, Youtube, ExternalLink, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { downloadMyaPdf, type MyaPdfArgs } from "@/lib/myaPdfGenerator";

interface ToolResult {
  name: string;
  result: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
}

interface CopilotActionCardProps {
  toolResult: ToolResult;
}

const TOOL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  create_workflow: { label: "Workflow Created", icon: <Workflow className="h-4 w-4" />, color: "text-green-400" },
  add_lead: { label: "Lead Added", icon: <UserPlus className="h-4 w-4" />, color: "text-blue-400" },
  trigger_workflow: { label: "Workflow Triggered", icon: <Play className="h-4 w-4" />, color: "text-amber-400" },
  list_leads: { label: "Leads Retrieved", icon: <Users className="h-4 w-4" />, color: "text-purple-400" },
  list_workflows: { label: "Workflows Retrieved", icon: <List className="h-4 w-4" />, color: "text-cyan-400" },
  log_revenue: { label: "Revenue Logged", icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-400" },
  get_revenue_stats: { label: "Revenue Stats", icon: <TrendingUp className="h-4 w-4" />, color: "text-emerald-400" },
  update_lead: { label: "Lead Updated", icon: <UserPlus className="h-4 w-4" />, color: "text-blue-400" },
  move_lead_stage: { label: "Lead Moved", icon: <ArrowRightLeft className="h-4 w-4" />, color: "text-indigo-400" },
  log_lead_activity: { label: "Activity Logged", icon: <MessageSquare className="h-4 w-4" />, color: "text-sky-400" },
  delete_lead: { label: "Lead Deleted", icon: <Trash2 className="h-4 w-4" />, color: "text-red-400" },
  schedule_workflow: { label: "Workflow Scheduled", icon: <Clock className="h-4 w-4" />, color: "text-orange-400" },
  delete_workflow: { label: "Workflow Deleted", icon: <Trash2 className="h-4 w-4" />, color: "text-red-400" },
  get_pipeline_stats: { label: "Pipeline Stats", icon: <BarChart3 className="h-4 w-4" />, color: "text-violet-400" },
  get_business_summary: { label: "Business Summary", icon: <Brain className="h-4 w-4" />, color: "text-pink-400" },
  generate_pdf: { label: "PDF Generated", icon: <FileText className="h-4 w-4" />, color: "text-emerald-400" },
  export_business_plan_pdf: { label: "PDF Generated", icon: <FileText className="h-4 w-4" />, color: "text-emerald-400" },
  ingest_youtube_url: { label: "YouTube Ingested", icon: <Youtube className="h-4 w-4" />, color: "text-red-400" },
  save_system_blueprint: { label: "Blueprint Saved", icon: <BookOpen className="h-4 w-4" />, color: "text-emerald-400" },
};

export default function CopilotActionCard({ toolResult }: CopilotActionCardProps) {
  const navigate = useNavigate();
  const { name, result } = toolResult;
  const meta = TOOL_META[name] || { label: name, icon: <CheckCircle className="h-4 w-4" />, color: "text-muted-foreground" };
  const d = result.data as any;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-3"
    >
      <div className="flex items-center gap-2 mb-1">
        {result.success ? (
          <CheckCircle className="h-4 w-4 text-green-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
        <span className={`font-medium text-sm ${meta.color}`}>{meta.label}</span>
        <span className="ml-auto">{meta.icon}</span>
      </div>

      {result.success && d && (
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          {/* ── Existing tools ── */}
          {name === "create_workflow" && (
            <>
              <p>📝 <strong>{d.name}</strong> — {d.node_count || 0} nodes</p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => navigate(`/workflows/${d.workflow_id}`)}>
                Open in Editor →
              </Button>
            </>
          )}
          {name === "add_lead" && (
            <>
              <p>👤 <strong>{d.name}</strong> — Stage: {d.stage}</p>
              {d.estimated_value && <p>💰 Est. value: ${d.estimated_value?.toLocaleString()}</p>}
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/leads")}>
                View in CRM →
              </Button>
            </>
          )}
          {name === "trigger_workflow" && <p>⚡ Running <strong>{d.workflow_name}</strong></p>}
          {name === "list_leads" && <p>📋 Found {d.total} lead(s)</p>}
          {name === "list_workflows" && <p>📋 Found {d.total} workflow(s)</p>}

          {/* ── Revenue ── */}
          {name === "log_revenue" && (
            <>
              <p>💵 <strong>${Number(d.amount).toLocaleString()}</strong> from <strong>{d.source}</strong></p>
              {d.is_recurring && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">♻️ Recurring</span>}
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/dashboard")}>
                View Dashboard →
              </Button>
            </>
          )}
          {name === "get_revenue_stats" && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] text-muted-foreground">Monthly</p><p className="font-bold text-sm text-emerald-400">${Number(d.monthly_revenue).toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground">MRR</p><p className="font-bold text-sm text-emerald-400">${Number(d.mrr).toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Total</p><p className="font-bold text-sm text-emerald-400">${Number(d.total_revenue).toLocaleString()}</p></div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span>Goal: $10K/mo</span>
                  <span>{d.progress_percent}%</span>
                </div>
                <Progress value={d.progress_percent} className="h-1.5" />
              </div>
            </div>
          )}

          {/* ── Lead Pipeline ── */}
          {name === "update_lead" && (
            <>
              <p>✏️ Updated <strong>{d.name}</strong>: {(d.updated_fields as string[])?.join(", ")}</p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/leads")}>
                View in CRM →
              </Button>
            </>
          )}
          {name === "move_lead_stage" && (
            <>
              <p>🔄 <strong>{d.name}</strong>: {d.old_stage} → <strong>{d.new_stage}</strong></p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/leads")}>
                View in CRM →
              </Button>
            </>
          )}
          {name === "log_lead_activity" && (
            <p>📝 {d.activity_type} on <strong>{d.lead_name}</strong>: {d.content}</p>
          )}
          {name === "delete_lead" && (
            <p>🗑️ Removed <strong>{d.deleted_name}</strong></p>
          )}

          {/* ── Workflow Management ── */}
          {name === "schedule_workflow" && (
            <>
              <p>⏰ <strong>{d.workflow_name}</strong></p>
              <p className="font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded inline-block">{d.cron}</p>
              <span className="ml-1 text-[10px]">({d.schedule_human})</span>
              {d.enabled && <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">Active</span>}
            </>
          )}
          {name === "delete_workflow" && (
            <p>🗑️ Removed workflow <strong>{d.deleted_name}</strong></p>
          )}

          {/* ── Analytics ── */}
          {name === "get_pipeline_stats" && (
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] text-muted-foreground">Leads</p><p className="font-bold text-sm text-violet-400">{d.total_leads}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Conversion</p><p className="font-bold text-sm text-violet-400">{d.conversion_rate}%</p></div>
                <div><p className="text-[10px] text-muted-foreground">Pipeline $</p><p className="font-bold text-sm text-violet-400">${Number(d.pipeline_value).toLocaleString()}</p></div>
              </div>
              {d.top_prospects?.length > 0 && (
                <div className="mt-1">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Top Prospects:</p>
                  {(d.top_prospects as any[]).map((p: any, i: number) => (
                    <p key={i} className="text-[10px]">• {p.name} — ${Number(p.value).toLocaleString()} ({p.stage})</p>
                  ))}
                </div>
              )}
            </div>
          )}
          {name === "get_business_summary" && d.primary && (
            <>
              <p>💼 <strong>{d.primary.business_name}</strong></p>
              <p>🎯 {d.primary.niche}</p>
              {d.primary.target_audience && <p>👥 {d.primary.target_audience}</p>}
            </>
          )}
          {name === "get_business_summary" && d.message && (
            <p>💡 {d.message}</p>
          )}

          {(name === "generate_pdf" || name === "export_business_plan_pdf") && d.client_action === "generate_pdf" && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <strong>{d.filename}.pdf</strong>
                <span className="text-muted-foreground">— {Array.isArray(d.sections) ? d.sections.length : 0} section(s)</span>
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => {
                  try {
                    downloadMyaPdf({
                      title: String(d.title || "Untitled"),
                      subtitle: d.subtitle ? String(d.subtitle) : undefined,
                      filename: String(d.filename || "mya-document"),
                      sections: (d.sections as MyaPdfArgs["sections"]) || [],
                    });
                  } catch (e) {
                    console.error("PDF re-download failed:", e);
                  }
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                Download again
              </Button>
            </div>
          )}

          {name === "ingest_website_url" && (
            <div className="space-y-1">
              <p className="font-medium text-foreground truncate">{d.title || d.url || "Web page"}</p>
              {d.description && (
                <p className="text-[10px] text-muted-foreground line-clamp-2">{d.description}</p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    typeof d.text_chars === "number" && d.text_chars > 1500
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {typeof d.text_chars === "number" && d.text_chars > 1500
                    ? "✅ Page read"
                    : "⚠️ Limited content"}
                </span>
                {typeof d.text_chars === "number" && (
                  <span className="text-[10px] text-muted-foreground">
                    {d.text_chars.toLocaleString()} chars
                  </span>
                )}
              </div>
              {d.warning && <p className="text-[10px] text-amber-400/80">{d.warning}</p>}
            </div>
          )}


          {name === "ingest_youtube_url" && (
            <div className="space-y-1.5">
              <div className="flex gap-2 items-start">
                {d.thumbnail && (
                  <img
                    src={d.thumbnail}
                    alt=""
                    className="h-12 w-20 object-cover rounded border border-border/50 flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{d.title || "YouTube video"}</p>
                  {d.author && <p className="text-[10px] text-muted-foreground truncate">{d.author}</p>}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        d.source === "captions"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {d.source === "captions" ? "✅ Captions" : "⚠️ Metadata only"}
                    </span>
                    {typeof d.duration_sec === "number" && d.duration_sec > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {Math.floor(d.duration_sec / 60)}m {d.duration_sec % 60}s
                      </span>
                    )}
                    {typeof d.transcript_chars === "number" && (
                      <span className="text-[10px] text-muted-foreground">
                        · {d.transcript_chars.toLocaleString()} chars
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <a
                href={String(d.url || "#")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Open on YouTube
              </a>
            </div>
          )}

          {name === "save_system_blueprint" && (
            <div className="space-y-1">
              <p>📚 <strong>{d.title}</strong> — {d.section_count} sections saved</p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/library")}>
                Open Library →
              </Button>
            </div>
          )}
        </div>
      )}

      {!result.success && result.error && (
        <p className="text-xs text-red-400 mt-1">❌ {result.error}</p>
      )}
    </motion.div>
  );
}
