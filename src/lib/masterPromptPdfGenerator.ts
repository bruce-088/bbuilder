import { jsPDF } from "jspdf";
import type { Json } from "@/integrations/supabase/types";

interface MasterPromptBusinessIdea {
  businessName: string;
  niche: string;
  targetAudience: string;
  valueProposition: string;
  serviceOffering: string;
  revenueMath?: string;
  validationPath?: string;
  aiAutomationStrategy?: Json;
}

const PURPLE_PRIMARY: [number, number, number] = [139, 92, 246];
const DARK_BG: [number, number, number] = [26, 26, 46];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_GRAY: [number, number, number] = [156, 163, 175];

const formatStrategy = (strategy: Json | undefined): string => {
  if (!strategy) return "";
  if (typeof strategy === "string") return strategy;
  if (typeof strategy === "object" && strategy !== null) {
    const obj = strategy as Record<string, unknown>;
    if ("summary" in obj && typeof obj.summary === "string") return obj.summary;
    return JSON.stringify(strategy, null, 2);
  }
  return String(strategy);
};

export function generateMasterPromptPDF(idea: MasterPromptBusinessIdea): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 20;
  const cw = pw - m * 2;
  let y = m;

  const checkPage = (need: number) => {
    if (y + need > ph - 25) {
      doc.addPage();
      y = m;
    }
  };

  const sectionTitle = (title: string) => {
    checkPage(20);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE_PRIMARY);
    doc.text(title, m, y);
    y += 2;
    doc.setDrawColor(...PURPLE_PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(m, y, m + 50, y);
    y += 7;
  };

  const bodyText = (text: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, cw);
    for (const line of lines) {
      checkPage(6);
      doc.text(line, m, y);
      y += 5;
    }
    y += 3;
  };

  const bulletItem = (text: string, indent = 0) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const x = m + 4 + indent;
    const lines = doc.splitTextToSize(text, cw - 4 - indent);
    for (let i = 0; i < lines.length; i++) {
      checkPage(6);
      if (i === 0) {
        doc.setTextColor(...PURPLE_PRIMARY);
        doc.text("•", m + indent, y);
        doc.setTextColor(60, 60, 60);
      }
      doc.text(lines[i], x, y);
      y += 5;
    }
  };

  const numberedItem = (num: string, title: string, items: string[]) => {
    checkPage(12);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`${num} ${title}`, m, y);
    y += 6;
    for (const item of items) {
      bulletItem(item, 6);
    }
    y += 2;
  };

  // ── Header ──
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pw, 45, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MASTER IMPLEMENTATION PROMPT", m, 20);
  doc.setFontSize(10);
  doc.setTextColor(...PURPLE_PRIMARY);
  doc.text("MYA - Mission Yield Accelerator", m, 30);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pw - m, 30, { align: "right" }
  );
  y = 55;

  // Business name
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(idea.businessName, m, y);
  y += 14;

  // ── Business Overview ──
  sectionTitle("📋 BUSINESS OVERVIEW");
  const overviewFields = [
    { label: "Niche", value: idea.niche },
    { label: "Target Audience", value: idea.targetAudience },
    { label: "Value Proposition", value: idea.valueProposition },
    { label: "Service/Product Offering", value: idea.serviceOffering },
    { label: "Revenue Model", value: idea.revenueMath },
    { label: "Validation Strategy", value: idea.validationPath },
    { label: "AI Automation Strategy", value: formatStrategy(idea.aiAutomationStrategy) },
  ];
  for (const f of overviewFields) {
    if (!f.value) continue;
    checkPage(12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`${f.label}:`, m, y);
    y += 5;
    bodyText(f.value);
  }

  // ── Phase 1 ──
  sectionTitle("🎯 PHASE 1: Foundation (Week 1)");
  numberedItem("1.", "Brand Identity Setup", [
    "Create a compelling brand name validation",
    "Design a brand positioning statement",
    "Define brand voice and messaging guidelines",
    "Suggest color palette, typography, and visual identity direction",
  ]);
  numberedItem("2.", "Online Presence", [
    "Recommend the best website builder/platform",
    "Outline exact pages needed and their content structure",
    "Write compelling copy for homepage, about, and services",
    "SEO strategy for organic discovery",
  ]);
  numberedItem("3.", "Legal & Admin Basics", [
    "Business structure recommendation (LLC, sole prop, etc.)",
    "Essential legal documents (contracts, terms, privacy policy)",
    "Payment processing setup (Stripe, PayPal, etc.)",
    "Basic bookkeeping setup",
  ]);

  // ── Phase 2 ──
  sectionTitle("🎯 PHASE 2: Offer Creation (Week 2)");
  numberedItem("1.", "Service/Product Packaging", [
    "Define 2-3 service tiers with clear pricing",
    "Create irresistible offer positioning",
    "Design the client journey from inquiry to delivery",
    "Build out the deliverables checklist",
  ]);
  numberedItem("2.", "Sales Assets", [
    "Write a compelling sales page or proposal template",
    "Create a case study/portfolio structure",
    "Develop FAQ document addressing common objections",
    "Design a simple pitch deck if needed",
  ]);
  numberedItem("3.", "Onboarding System", [
    "Client intake questionnaire",
    "Welcome email sequence",
    "Project kickoff process",
    "Communication protocols and tools",
  ]);

  // ── Phase 3 ──
  sectionTitle("🎯 PHASE 3: Lead Generation (Week 3)");
  numberedItem("1.", "Outbound Strategy", [
    "Identify 100 ideal prospects with specific criteria",
    "Write 3 cold email templates that convert",
    "LinkedIn outreach strategy and connection messages",
    "Follow-up sequence (5-touch campaign)",
  ]);
  numberedItem("2.", "Inbound Strategy", [
    `Content pillars and topic clusters for ${idea.niche}`,
    `10 blog post/article ideas that attract ${idea.targetAudience}`,
    "Social media content calendar (LinkedIn, Twitter, etc.)",
    "Lead magnet idea and creation outline",
  ]);
  numberedItem("3.", "Networking & Partnerships", [
    "Communities and groups to join",
    "Potential referral partners to approach",
    "Collaboration opportunities",
    "Speaking/podcast opportunities",
  ]);

  // ── Phase 4 ──
  sectionTitle("🎯 PHASE 4: First Customer Acquisition (Week 4)");
  numberedItem("1.", "Launch Campaign", [
    "Pre-launch buzz building strategy",
    "Launch announcement templates",
    "Special launch offer structure",
    "Urgency and scarcity tactics (ethical)",
  ]);
  numberedItem("2.", "Conversion Optimization", [
    "Discovery call script",
    "Objection handling guide",
    "Proposal/quote template",
    "Closing techniques",
  ]);
  numberedItem("3.", "Delivery Excellence", [
    "Step-by-step service delivery process",
    "Quality checkpoints",
    "Client communication templates",
    "Feedback collection system",
  ]);

  // ── Success Metrics ──
  sectionTitle("📊 SUCCESS METRICS");
  const metrics = [
    "Website visitors and conversion rate",
    "Number of leads generated",
    "Discovery calls booked",
    "Proposals sent",
    "Close rate",
    "Revenue generated",
    "Client satisfaction score",
  ];
  for (const metric of metrics) bulletItem(metric);
  y += 3;

  // ── Automation Priorities ──
  sectionTitle("🤖 AUTOMATION PRIORITIES");
  const automations = [
    "Lead capture and nurturing",
    "Appointment scheduling",
    "Email follow-ups",
    "Invoice and payment collection",
    "Client onboarding",
    "Feedback collection",
  ];
  automations.forEach((a, i) => bulletItem(`${i + 1}. ${a}`));
  y += 3;

  // ── Start Now ──
  sectionTitle("⚡ START NOW");
  bodyText("Begin by:");
  bulletItem("Validating this business concept - any red flags or improvements?");
  bulletItem("Providing the EXACT first 3 actions to take TODAY");
  bulletItem("Creating a Week 1 day-by-day action plan");
  bulletItem("Writing the copy for the homepage");

  // ── Footer on each page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...DARK_BG);
    doc.rect(0, ph - 15, pw, 15, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_GRAY);
    doc.text("MYA - Where success feels effortless and the journey is the reward", pw / 2, ph - 6, { align: "center" });
    doc.setTextColor(...PURPLE_PRIMARY);
    doc.text(`Page ${i} of ${pageCount}`, pw - m, ph - 6, { align: "right" });
  }

  const fileName = `${idea.businessName.replace(/[^a-zA-Z0-9]/g, "-")}-Master-Prompt.pdf`;
  doc.save(fileName);
}
