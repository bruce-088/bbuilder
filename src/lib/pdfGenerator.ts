import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Json } from "@/integrations/supabase/types";

interface BusinessIdea {
  id: string;
  business_name: string;
  niche: string;
  target_audience: string;
  value_proposition: string;
  service_offering: string;
  revenue_math: string;
  validation_path: string;
  ai_automation_strategy: Json;
  created_at: string;
}

interface QuickStartStep {
  id: string;
  label: string;
}

const QUICK_START_STEPS: QuickStartStep[] = [
  { id: "validate", label: "Validate your idea with 3 potential customers" },
  { id: "landing", label: "Create a simple landing page or social profile" },
  { id: "offer", label: "Define your core offer and pricing" },
  { id: "outreach", label: "Reach out to 10 prospects this week" },
  { id: "first_sale", label: "Close your first paying customer" },
];

// Brand colors (mutable arrays for jsPDF)
const PURPLE_PRIMARY: [number, number, number] = [139, 92, 246]; // #8B5CF6
const DARK_BG: [number, number, number] = [26, 26, 46]; // #1A1A2E
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_GRAY: [number, number, number] = [156, 163, 175];

const formatAutomationStrategy = (strategy: Json): string => {
  if (!strategy) return "Not specified";
  if (typeof strategy === "string") return strategy;
  if (typeof strategy === "object" && strategy !== null) {
    const obj = strategy as Record<string, unknown>;
    if ("summary" in obj && typeof obj.summary === "string") {
      return obj.summary;
    }
    return JSON.stringify(strategy, null, 2);
  }
  return String(strategy);
};

// Internal function that creates and returns the jsPDF document
function createBusinessPlanPDF(
  idea: BusinessIdea,
  completedSteps: string[]
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number): void => {
    if (yPos + requiredSpace > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
  };

  // Header with branding
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("BUSINESS PLAN", margin, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PURPLE_PRIMARY);
  doc.text("MYA - Mission Yield Accelerator", margin, 32);

  doc.setTextColor(...LIGHT_GRAY);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  })}`, pageWidth - margin, 32, { align: "right" });

  yPos = 55;

  // Business Name
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(idea.business_name, margin, yPos);
  yPos += 12;

  // Sections
  const sections = [
    { title: "The Niche", content: idea.niche },
    { title: "Target Audience", content: idea.target_audience },
    { title: "Value Proposition", content: idea.value_proposition },
    { title: "Service Offering", content: idea.service_offering },
    { title: "Revenue Math ($10K/month Path)", content: idea.revenue_math },
    { title: "Fast Validation Path", content: idea.validation_path },
    { title: "AI Automation Strategy", content: formatAutomationStrategy(idea.ai_automation_strategy) },
  ];

  for (const section of sections) {
    checkPageBreak(40);

    // Section title with purple underline
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE_PRIMARY);
    doc.text(section.title, margin, yPos);
    yPos += 2;

    doc.setDrawColor(...PURPLE_PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin + 40, yPos);
    yPos += 6;

    // Section content
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    const lines = doc.splitTextToSize(section.content, contentWidth);
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, margin, yPos);
      yPos += 5;
    }

    yPos += 8;
  }

  // Quick Start Checklist
  checkPageBreak(60);

  doc.setFillColor(...PURPLE_PRIMARY);
  doc.rect(margin, yPos, contentWidth, 8, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("QUICK START CHECKLIST", margin + 4, yPos + 5.5);

  const completedCount = completedSteps.length;
  const totalSteps = QUICK_START_STEPS.length;
  doc.text(`${completedCount}/${totalSteps} Complete`, pageWidth - margin - 4, yPos + 5.5, { align: "right" });
  yPos += 14;

  // Checklist table
  const checklistData = QUICK_START_STEPS.map((step, index) => {
    const isCompleted = completedSteps.includes(step.id);
    return [
      `${index + 1}.`,
      step.label,
      isCompleted ? "✓" : "○"
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: checklistData,
    theme: "plain",
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", fontStyle: "bold", textColor: PURPLE_PRIMARY },
      1: { cellWidth: contentWidth - 20 },
      2: { cellWidth: 10, halign: "center", fontStyle: "bold" }
    },
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    didParseCell: (data) => {
      if (data.column.index === 0) {
        data.cell.styles.textColor = PURPLE_PRIMARY;
      }
      if (data.column.index === 2) {
        const text = data.cell.text[0];
        if (text === "✓") {
          data.cell.styles.textColor = [34, 197, 94] as [number, number, number]; // green
        } else {
          data.cell.styles.textColor = LIGHT_GRAY;
        }
      }
    },
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setFillColor(...DARK_BG);
    doc.rect(0, pageHeight - 15, pageWidth, 15, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_GRAY);
    doc.text(
      "Generated by MYA - Mission Yield Accelerator",
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );

    doc.setTextColor(...PURPLE_PRIMARY);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  return doc;
}

// Returns PDF as Blob (for bundling)
export function generateBusinessPlanPDFBlob(
  idea: BusinessIdea,
  completedSteps: string[]
): Blob {
  const doc = createBusinessPlanPDF(idea, completedSteps);
  return doc.output("blob");
}

// Downloads PDF directly
export async function generateBusinessPlanPDF(
  idea: BusinessIdea,
  completedSteps: string[]
): Promise<void> {
  const doc = createBusinessPlanPDF(idea, completedSteps);
  const fileName = `${idea.business_name.replace(/[^a-zA-Z0-9]/g, "-")}-Business-Plan.pdf`;
  doc.save(fileName);
}
