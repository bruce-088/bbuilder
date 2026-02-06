import { NODE_TYPE_CONFIG, type NodeType } from "./types";

interface NodePaletteProps {
  onDragStart: (type: NodeType) => void;
}

const categories = [
  { label: "Triggers", types: ["webhook_trigger", "schedule_trigger"] as NodeType[] },
  { label: "Logic", types: ["ai_agent", "filter", "code", "transform", "loop", "merge"] as NodeType[] },
  { label: "Data", types: ["database_query"] as NodeType[] },
  { label: "Actions", types: ["http_request", "email_send", "delay"] as NodeType[] },
];

export function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div className="w-56 border-r border-border bg-card/50 p-3 space-y-4 overflow-y-auto">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Nodes
      </h3>
      {categories.map((cat) => (
        <div key={cat.label} className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-1">
            {cat.label}
          </p>
          {cat.types.map((type) => {
            const cfg = NODE_TYPE_CONFIG[type];
            return (
              <div
                key={type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("node-type", type);
                  onDragStart(type);
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-border hover:bg-secondary/50 transition-colors group"
              >
                <span className="text-base">{cfg.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{cfg.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{cfg.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
