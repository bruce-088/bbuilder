export type NodeType = 
  | 'webhook_trigger'
  | 'schedule_trigger'
  | 'ai_agent'
  | 'http_request'
  | 'email_send'
  | 'filter'
  | 'code'
  | 'delay'
  | 'transform';

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  type: NodeType;
  name: string;
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
  ai_prompt?: string | null;
  ai_model?: string | null;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string;
  target_handle: string;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DragItem {
  type: NodeType;
  name: string;
}

export const NODE_TYPE_CONFIG: Record<NodeType, {
  label: string;
  icon: string;
  color: string;
  description: string;
  defaultConfig: Record<string, unknown>;
}> = {
  webhook_trigger: {
    label: 'Webhook Trigger',
    icon: '🔗',
    color: 'hsl(142, 76%, 36%)',
    description: 'Receives incoming HTTP requests',
    defaultConfig: { method: 'POST' },
  },
  schedule_trigger: {
    label: 'Schedule Trigger',
    icon: '⏰',
    color: 'hsl(142, 76%, 36%)',
    description: 'Fires on a cron or interval schedule',
    defaultConfig: { cron: '0 9 * * *' },
  },
  ai_agent: {
    label: 'AI Agent',
    icon: '🤖',
    color: 'hsl(239, 84%, 67%)',
    description: 'Runs an AI prompt with custom instructions',
    defaultConfig: { temperature: 0.7 },
  },
  http_request: {
    label: 'HTTP Request',
    icon: '🌐',
    color: 'hsl(199, 89%, 48%)',
    description: 'Makes API calls to external services',
    defaultConfig: { method: 'GET', url: '', headers: {} },
  },
  email_send: {
    label: 'Send Email',
    icon: '📧',
    color: 'hsl(38, 92%, 50%)',
    description: 'Sends an email via configured provider',
    defaultConfig: { to: '', subject: '', body: '' },
  },
  filter: {
    label: 'Filter / Router',
    icon: '🔀',
    color: 'hsl(280, 65%, 60%)',
    description: 'Routes data based on conditions',
    defaultConfig: { condition: '', operator: 'equals', value: '' },
  },
  code: {
    label: 'Code',
    icon: '💻',
    color: 'hsl(45, 93%, 47%)',
    description: 'Runs custom JavaScript code',
    defaultConfig: { code: 'return input;' },
  },
  delay: {
    label: 'Delay',
    icon: '⏳',
    color: 'hsl(215, 20%, 55%)',
    description: 'Waits before passing data through',
    defaultConfig: { seconds: 5 },
  },
  transform: {
    label: 'Set / Transform',
    icon: '🔄',
    color: 'hsl(170, 60%, 45%)',
    description: 'Reshapes data between nodes',
    defaultConfig: { mappings: [] },
  },
};
