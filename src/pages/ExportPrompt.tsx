import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const MASTER_PROMPT = `# IdeaForge AI - Master Prompt for Application Recreation

> **Purpose:** This document serves as a comprehensive specification to recreate the IdeaForge AI application from scratch using Lovable.dev (or similar AI-powered app builders).

---

## 📋 System Overview

Build an **AI-powered business idea generator and consultant** specifically designed for **solopreneurs and introverts**. The application generates detailed, turn-key online business concepts with a clear revenue target of **$10,000 net profit per month** and a fast validation path.

### Core Value Proposition
- Generate unique, actionable business ideas tailored for introverts
- Provide detailed AI automation strategies for each business concept
- Create n8n workflow automation prompts for sales/client management
- Enable conversation-based consulting with memory persistence
- Compare multiple business ideas side-by-side

---

## 🎯 Features List

### 1. Business Idea Generation
- Generate ONE detailed business concept at a time (not lists)
- Support industry-specific idea generation (15+ industries)
- Include all critical business components:
  - Business name and niche
  - Target audience (demographics + psychographics)
  - Value proposition
  - Service/product offering
  - Revenue math (path to $10K/month)
  - Fast validation path (2-4 weeks to first customer)
  - AI automation strategy for each sales stage

### 2. n8n Workflow Generation
- Generate comprehensive n8n automation workflows for saved business ideas
- Include specific node configurations for:
  - Lead prospecting & discovery
  - Outreach & follow-up sequences
  - Client onboarding automation
  - Payment & invoicing
  - Client success & follow-up
- Provide step-by-step instructions for implementing in n8n

### 3. User Authentication
- Email/password signup and login
- Auto-confirm email signups (for ease of use)
- Persistent user sessions
- Protected routes (dashboard, chat, compare pages)

### 4. Persistent Storage
- Save business ideas to database
- Store conversation history
- Link business ideas to conversations
- Favorite/unfavorite ideas and conversations
- Delete and rename functionality

### 5. Interactive Chat Interface
- Real-time streaming responses
- Markdown rendering for rich content
- Save business ideas directly from chat messages
- Continue conversations with context
- Auto-generate conversation titles

### 6. Memory Integration (Mem0)
- Store conversation context for personalized responses
- Search relevant memories during conversations
- Improve response quality over time

### 7. Comparison Feature
- Select 2-4 business ideas to compare
- Side-by-side comparison view
- Highlight key differences in niche, audience, revenue model

---

## 🏗️ Architecture

### Multi-Agent Architecture

#### Business Idea Generator Agent
- **Purpose:** Generate unique, detailed business concepts
- **Trigger:** User clicks "Generate Business Idea" or sends specific prompts
- **Output:** Structured business idea with all required sections

#### n8n Workflow Agent
- **Purpose:** Create n8n automation workflows for business ideas
- **Trigger:** User clicks "Generate n8n Workflow" for a saved idea
- **Output:** JSON workflow specification with node configurations

#### Consultation Agent
- **Purpose:** Answer business questions, provide advice
- **Trigger:** General chat messages
- **Output:** Contextual business guidance

#### Memory Integration Agent
- **Purpose:** Store and retrieve conversation context
- **Trigger:** Every message exchange
- **Output:** Relevant context for improved responses

---

## 🔧 Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS with custom design system
- **UI Components:** shadcn/ui
- **Animations:** Framer Motion
- **Routing:** React Router v6
- **State Management:** React Query + useState
- **Markdown:** react-markdown

### Backend (Lovable Cloud / Supabase)
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth
- **Edge Functions:** Deno runtime
- **AI Gateway:** Lovable AI (google/gemini-3-flash-preview)
- **Memory Service:** Mem0 API integration

---

## 📊 Database Schema

### Tables

#### 1. profiles
\`\`\`sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can read/update own profile
\`\`\`

#### 2. conversations
\`\`\`sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can CRUD own conversations
\`\`\`

#### 3. chat_messages
\`\`\`sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can CRUD own messages
\`\`\`

#### 4. business_ideas
\`\`\`sql
CREATE TABLE business_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  business_name TEXT NOT NULL,
  niche TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  value_proposition TEXT NOT NULL,
  service_offering TEXT NOT NULL,
  revenue_math TEXT NOT NULL,
  validation_path TEXT NOT NULL,
  ai_automation_strategy JSONB DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can CRUD own ideas
\`\`\`

#### 5. ai_prompts
\`\`\`sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_idea_id UUID NOT NULL REFERENCES business_ideas(id),
  user_id UUID NOT NULL,
  prompt_type TEXT NOT NULL, -- 'n8n_workflow', 'lovable', etc.
  prompt_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can CRUD own prompts
\`\`\`

---

## 🎨 UI/UX Requirements

### Design System

#### Color Palette (HSL format in index.css)
\`\`\`css
:root {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 262.1 83.3% 57.8%; /* Purple accent */
  --primary-foreground: 0 0% 100%;
  --secondary: 240 3.7% 15.9%;
  --muted: 240 3.7% 15.9%;
  --accent: 240 3.7% 15.9%;
  --border: 240 3.7% 15.9%;
}
\`\`\`

### Visual Elements
- Gradient glow backgrounds
- Frosted glass effects (backdrop-blur)
- Subtle animations on interactions
- Dark theme by default
- Card-based layouts

### Page Structure

#### 1. Landing Page (\`/\`)
- Hero section with value proposition
- Feature highlights
- Call-to-action buttons

#### 2. Auth Page (\`/auth\`)
- Toggle between Sign In / Sign Up
- Email and password fields
- Form validation

#### 3. Dashboard (\`/dashboard\`)
- Quick Actions: Generate Idea, Chat
- Business Ideas list with search/filter/favorites
- Conversations list with CRUD actions
- Compare mode for ideas

#### 4. Chat Page (\`/chat/:id\`)
- Streaming AI responses
- Save as Business Idea button
- Generate n8n Workflow button
- Markdown rendering

#### 5. Compare Page (\`/compare\`)
- Side-by-side idea cards

---

## 🤖 AI Prompts

### System Prompt (Chat/Consultation)
\`\`\`
You are IdeaForge AI, an expert business consultant specializing in creating turn-key online business concepts for solopreneurs and introverts. Your goal is to help users discover, validate, and launch profitable online businesses that can generate $10,000+ net profit per month.

You have deep expertise in:
- Online business models (agencies, SaaS, productized services, digital products)
- AI automation for sales and client management
- Fast validation strategies
- Revenue modeling and pricing
- Market research and niche selection

When generating business ideas, always provide:
1. Business Name and Niche
2. Target Audience
3. Value Proposition
4. Service/Product Offering
5. Revenue Math (path to $10K/month)
6. Fast Validation Path (2-4 weeks)
7. AI Automation Strategy

Be encouraging, practical, and specific. Focus on businesses suitable for introverts.
\`\`\`

### Business Idea Structure
\`\`\`
# 💡 [Creative Business Name]
## 🎯 The Niche
## 👥 Target Audience
## ✨ Value Proposition
## 📦 Service/Product Offering
## 💰 Revenue Math (Path to $10K/month)
## 🚀 Fast Validation Path (2-4 Weeks)
## 🤖 AI Automation Strategy
## 🛠️ Tech Stack Recommendation
## ⚠️ Potential Challenges & Solutions
\`\`\`

---

## 📁 Key File Structure

\`\`\`
src/
├── App.tsx
├── components/ui/
├── contexts/AuthContext.tsx
├── lib/ai.ts
├── pages/
│   ├── Landing.tsx
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Chat.tsx
│   └── Compare.tsx

supabase/functions/
├── chat/index.ts
├── generate-n8n-workflow/index.ts
└── mem0/index.ts
\`\`\`

---

## 🔑 Required Secrets

| Secret Name | Description |
|-------------|-------------|
| LOVABLE_API_KEY | Auto-provided by Lovable Cloud |
| MEM0_API_KEY | API key for Mem0 memory service |

---

## 🎯 Quick Start Prompt

\`\`\`
Build an AI-powered business idea generator called "IdeaForge AI" for solopreneurs. Features:

1. Auth: Email/password login with auto-confirm
2. Dashboard: Quick actions to generate ideas or chat, lists of saved ideas and conversations with favorites, search, and CRUD operations
3. Chat: Streaming AI responses, markdown rendering, save ideas from messages, generate n8n workflows
4. Compare: Side-by-side business idea comparison

Database tables: profiles, conversations, chat_messages, business_ideas (with niche, target_audience, value_proposition, revenue_math, etc.), ai_prompts

Edge functions: /chat (streaming AI), /generate-n8n-workflow, /mem0 (memory operations)

Design: Dark theme, purple accents, gradient glows, frosted glass effects, Framer Motion animations

AI should generate detailed $10K/month business concepts with validation paths and AI automation strategies.
\`\`\`

---

*This master prompt was auto-generated from the IdeaForge AI application codebase.*
`;

export default function ExportPrompt() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const downloadAsMarkdown = () => {
    const blob = new Blob([MASTER_PROMPT], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "IdeaForge_Master_Prompt.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Markdown file!");
  };

  const downloadAsText = () => {
    const blob = new Blob([MASTER_PROMPT], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "IdeaForge_Master_Prompt.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Text file!");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(MASTER_PROMPT);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Export Master Prompt
            </CardTitle>
            <CardDescription>
              Download the complete specification to recreate this application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={downloadAsMarkdown} className="gap-2">
                <Download className="w-4 h-4" />
                Download as .md
              </Button>
              <Button onClick={downloadAsText} variant="secondary" className="gap-2">
                <Download className="w-4 h-4" />
                Download as .txt
              </Button>
              <Button onClick={copyToClipboard} variant="outline" className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <h3 className="font-semibold mb-2">What's included:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Complete system overview and features list</li>
                <li>✓ Multi-agent architecture specification</li>
                <li>✓ Full database schema with SQL</li>
                <li>✓ UI/UX requirements and design system</li>
                <li>✓ AI prompts for business idea generation</li>
                <li>✓ File structure and technology stack</li>
                <li>✓ Quick start prompt for Lovable.dev</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border/50 bg-background p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {MASTER_PROMPT.substring(0, 2000)}...
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
