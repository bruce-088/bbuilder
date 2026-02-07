import { useState } from "react";
import {
  Target,
  Users,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Zap,
  Bot,
  type LucideIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Json } from "@/integrations/supabase/types";

interface BusinessIdea {
  business_name: string;
  niche: string;
  target_audience: string;
  value_proposition: string;
  service_offering: string;
  revenue_math: string;
  validation_path: string;
  ai_automation_strategy: Json;
}

interface BranchConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string; // HSL accent for this branch
}

const branches: BranchConfig[] = [
  { key: "niche", label: "Niche", icon: Target, color: "hsl(239 84% 67%)" },
  { key: "target_audience", label: "Target Audience", icon: Users, color: "hsl(200 84% 60%)" },
  { key: "value_proposition", label: "Value Prop", icon: Sparkles, color: "hsl(270 84% 60%)" },
  { key: "service_offering", label: "Service Offering", icon: CheckCircle2, color: "hsl(142 76% 46%)" },
  { key: "revenue_math", label: "Revenue Math", icon: DollarSign, color: "hsl(38 92% 50%)" },
  { key: "validation_path", label: "Validation Path", icon: Zap, color: "hsl(20 84% 55%)" },
  { key: "ai_automation_strategy", label: "AI Strategy", icon: Bot, color: "hsl(300 70% 55%)" },
];

const formatValue = (val: unknown): string => {
  if (!val) return "Not specified";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if ("summary" in obj && typeof obj.summary === "string") return obj.summary;
    return JSON.stringify(val, null, 2);
  }
  return String(val);
};

const CX = 300;
const CY = 250;
const RADIUS = 160;
const NODE_RX = 70;
const NODE_RY = 28;

export default function BusinessPlanMindMap({ idea }: { idea: BusinessIdea }) {
  const [openBranch, setOpenBranch] = useState<string | null>(null);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox="0 0 600 500"
        className="w-full h-auto"
        style={{ maxHeight: "420px" }}
      >
        <defs>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(239 84% 67% / 0.25)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="node-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="hsl(0 0% 0% / 0.4)" />
          </filter>
        </defs>

        {/* Background glow */}
        <circle cx={CX} cy={CY} r={RADIUS + 60} fill="url(#center-glow)" />

        {/* Connector lines */}
        {branches.map((branch, i) => {
          const angle = (i / branches.length) * 2 * Math.PI - Math.PI / 2;
          const bx = CX + RADIUS * Math.cos(angle);
          const by = CY + RADIUS * Math.sin(angle);
          const cpx = CX + (RADIUS * 0.45) * Math.cos(angle);
          const cpy = CY + (RADIUS * 0.45) * Math.sin(angle);

          return (
            <path
              key={branch.key}
              d={`M ${CX} ${CY} Q ${cpx} ${cpy} ${bx} ${by}`}
              fill="none"
              stroke={branch.color}
              strokeWidth="2"
              strokeOpacity="0.4"
              strokeDasharray="6 3"
            />
          );
        })}

        {/* Central node */}
        <ellipse
          cx={CX}
          cy={CY}
          rx={55}
          ry={30}
          fill="hsl(222 47% 11%)"
          stroke="hsl(239 84% 67%)"
          strokeWidth="2"
          filter="url(#node-shadow)"
        />
        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(210 40% 96%)"
          fontSize="11"
          fontWeight="600"
          fontFamily="'Space Grotesk', sans-serif"
        >
          {idea.business_name.length > 18
            ? idea.business_name.slice(0, 16) + "…"
            : idea.business_name}
        </text>

        {/* Branch nodes */}
        {branches.map((branch, i) => {
          const angle = (i / branches.length) * 2 * Math.PI - Math.PI / 2;
          const bx = CX + RADIUS * Math.cos(angle);
          const by = CY + RADIUS * Math.sin(angle);

          return (
            <g key={branch.key} className="cursor-pointer">
              <Popover
                open={openBranch === branch.key}
                onOpenChange={(open) => setOpenBranch(open ? branch.key : null)}
              >
                <PopoverTrigger asChild>
                  <g onClick={() => setOpenBranch(openBranch === branch.key ? null : branch.key)}>
                    <ellipse
                      cx={bx}
                      cy={by}
                      rx={NODE_RX}
                      ry={NODE_RY}
                      fill="hsl(222 47% 9%)"
                      stroke={branch.color}
                      strokeWidth="1.5"
                      filter="url(#node-shadow)"
                      className="transition-all duration-200"
                      style={{
                        opacity: openBranch && openBranch !== branch.key ? 0.5 : 1,
                      }}
                    />
                    <text
                      x={bx}
                      y={by + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="hsl(210 40% 96%)"
                      fontSize="10"
                      fontWeight="500"
                      fontFamily="'Inter', sans-serif"
                    >
                      {branch.label}
                    </text>
                  </g>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 max-h-60 overflow-y-auto text-sm"
                  side="top"
                  sideOffset={12}
                >
                  <div className="space-y-2">
                    <h4 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <branch.icon className="w-4 h-4" style={{ color: branch.color }} />
                      {branch.label}
                    </h4>
                    <p className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">
                      {formatValue((idea as unknown as Record<string, unknown>)[branch.key])}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
