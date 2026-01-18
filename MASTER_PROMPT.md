# IdeaForge AI - Master Prompt for Application Recreation

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
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can read/update own profile
```

#### 2. conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can CRUD own conversations
```

#### 3. chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can CRUD own messages
```

#### 4. business_ideas
```sql
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
```

#### 5. ai_prompts
```sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_idea_id UUID NOT NULL REFERENCES business_ideas(id),
  user_id UUID NOT NULL,
  prompt_type TEXT NOT NULL, -- 'n8n_workflow', 'lovable', etc.
  prompt_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Users can CRUD own prompts
```

---

## 🎨 UI/UX Requirements

### Design System

#### Color Palette (HSL format in index.css)
```css
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
```

#### Typography
- **Font Family:** System fonts with display font for headings
- **Headings:** Bold, clear hierarchy
- **Body:** Readable, good line height

### Visual Elements
- Gradient glow backgrounds
- Frosted glass effects (backdrop-blur)
- Subtle animations on interactions
- Dark theme by default
- Card-based layouts

### Page Structure

#### 1. Landing Page (`/`)
- Hero section with value proposition
- Feature highlights
- Call-to-action buttons (Sign Up / Get Started)
- Modern, engaging design

#### 2. Auth Page (`/auth`)
- Toggle between Sign In / Sign Up
- Email and password fields
- Form validation with error messages
- Redirect to dashboard on success

#### 3. Dashboard (`/dashboard`)
- **Header:** Logo, user menu, sign out
- **Quick Actions:**
  - Generate Business Idea (opens industry selector)
  - Chat with AI Consultant
- **Business Ideas Section:**
  - List of saved ideas with search/filter
  - Favorite toggle
  - Edit/delete actions
  - Compare mode (select 2-4 ideas)
  - Click to view full details in dialog
- **Conversations Section:**
  - Recent conversations list
  - Favorite/edit/delete actions
  - Click to continue chat

#### 4. Chat Page (`/chat/:id`)
- **Header:** Back button, app logo
- **Messages Area:**
  - User messages (right-aligned)
  - Assistant messages (left-aligned, markdown rendered)
  - "Save as Business Idea" button on relevant messages
  - "Generate/View n8n Workflow" button when idea is saved
- **Input Area:**
  - Expandable textarea
  - Send button
  - Dashboard shortcut button

#### 5. Compare Page (`/compare`)
- Side-by-side business idea cards
- Key metrics highlighted
- Back to dashboard navigation

---

## 🤖 AI Prompts

### System Prompt (Chat/Consultation)
```
You are IdeaForge AI, an expert business consultant specializing in creating turn-key online business concepts for solopreneurs and introverts. Your goal is to help users discover, validate, and launch profitable online businesses that can generate $10,000+ net profit per month.

You have deep expertise in:
- Online business models (agencies, SaaS, productized services, digital products)
- AI automation for sales and client management
- Fast validation strategies
- Revenue modeling and pricing
- Market research and niche selection

When generating business ideas, always provide:
1. Business Name and Niche - catchy, memorable, and descriptive
2. Target Audience - specific demographics and psychographics
3. Value Proposition - the unique benefit you provide
4. Service/Product Offering - detailed description of deliverables
5. Revenue Math - clear breakdown showing path to $10K/month
6. Fast Validation Path - steps to get first paying customer in 2-4 weeks
7. AI Automation Strategy - how AI can handle prospecting, qualification, presentation, objection handling, closing, and follow-up

Be encouraging, practical, and specific. Focus on businesses that:
- Can be started with minimal upfront investment
- Don't require extensive technical skills
- Leverage AI tools for automation
- Can scale without proportional time investment
- Are suitable for introverts (minimal cold calling, relationship-focused)

Format your responses with clear sections and bullet points for readability. Use markdown formatting.
```

### Business Idea Generation Prompt
When generating a business idea, use this detailed structure:
```
# 💡 [Creative Business Name]

## 🎯 The Niche
[Specific, underserved niche with market opportunity]

## 👥 Target Audience
- Demographics (age, location, profession)
- Psychographics (pain points, desires, fears)
- Where they hang out online
- What keeps them up at night

## ✨ Value Proposition
[Compelling one-liner + 3-4 key benefits]

## 📦 Service/Product Offering
[Detailed deliverables, timeline, process]

## 💰 Revenue Math (Path to $10K/month)
- Pricing: $X per [unit]
- Clients needed: X clients/month
- Net profit calculation

## 🚀 Fast Validation Path (2-4 Weeks)
- Week 1: [Actions]
- Week 2: [Actions]
- Week 3-4: [Actions]

## 🤖 AI Automation Strategy
### Prospecting
### Qualification & Discovery
### Presentation & Proposal
### Objection Handling
### Closing
### Client Success & Follow-up

## 🛠️ Tech Stack Recommendation

## ⚠️ Potential Challenges & Solutions
```

### n8n Workflow Generation Prompt
```
You are an expert n8n workflow automation consultant. Given a business idea, create a comprehensive n8n workflow automation prompt that can be directly imported or built in n8n.

Your output should be a detailed, ready-to-use n8n workflow specification that includes:
1. Workflow Overview
2. Trigger Node configuration
3. Node Sequence with configurations
4. Connections between nodes

For each sales automation stage, include specific n8n nodes:
- Lead Prospecting: HTTP Request, Google Sheets, AI nodes
- Outreach: Email nodes, Wait nodes, IF conditions
- Client Onboarding: Webhooks, Notion/ClickUp, Slack
- Payment: Stripe/PayPal, Invoice generation
- Client Success: Scheduled triggers, Surveys, Reporting
```

---

## 📁 Key File Structure

```
src/
├── App.tsx                 # Main app with routes
├── main.tsx               # Entry point
├── index.css              # Design tokens & globals
├── components/
│   ├── ui/                # shadcn components
│   ├── BusinessIdeaDialog.tsx
│   └── N8nWorkflowDialog.tsx
├── contexts/
│   └── AuthContext.tsx    # Auth state management
├── hooks/
│   └── use-toast.ts
├── lib/
│   ├── ai.ts              # AI streaming & Mem0 helpers
│   └── utils.ts           # Utility functions
├── pages/
│   ├── Landing.tsx
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Chat.tsx
│   ├── Compare.tsx
│   └── NotFound.tsx
└── integrations/
    └── supabase/
        ├── client.ts      # Auto-generated
        └── types.ts       # Auto-generated

supabase/
└── functions/
    ├── chat/
    │   └── index.ts       # Main AI chat function
    ├── generate-n8n-workflow/
    │   └── index.ts       # n8n workflow generator
    └── mem0/
        └── index.ts       # Mem0 memory operations
```

---

## 🔑 Required Secrets

Configure these in your Lovable Cloud / Supabase project:

| Secret Name | Description |
|-------------|-------------|
| `LOVABLE_API_KEY` | Auto-provided by Lovable Cloud |
| `MEM0_API_KEY` | API key for Mem0 memory service |

---

## 🚀 Implementation Steps

### Phase 1: Foundation
1. Set up Lovable Cloud with database
2. Create auth system (signup/login)
3. Set up basic page routing
4. Implement design system in index.css

### Phase 2: Core Features
1. Create dashboard layout
2. Implement conversation management
3. Build chat interface with streaming
4. Add business idea parsing and saving

### Phase 3: Advanced Features
1. Implement n8n workflow generation
2. Add Mem0 integration for memory
3. Build comparison feature
4. Add search/filter/favorites

### Phase 4: Polish
1. Add animations (Framer Motion)
2. Implement responsive design
3. Add loading states and error handling
4. Test all user flows

---

## 📝 Industry Options

Support these industries for idea generation:
- Any Industry (Surprise me!)
- Health & Wellness
- Finance & Investing
- Technology & SaaS
- Education & Coaching
- E-commerce & Retail
- Real Estate
- Marketing & Advertising
- Creative & Design
- Food & Beverage
- Travel & Hospitality
- Legal Services
- HR & Recruiting
- Sustainability & Green Tech
- AI & Automation

---

## ✅ Success Criteria

The application is complete when:
- [ ] Users can sign up and log in
- [ ] Users can generate business ideas by industry
- [ ] Ideas are saved to database and displayed on dashboard
- [ ] Chat conversations persist across sessions
- [ ] n8n workflows can be generated for saved ideas
- [ ] Ideas can be favorited, edited, deleted
- [ ] Conversations can be favorited, renamed, deleted
- [ ] Multiple ideas can be compared side-by-side
- [ ] Memory system improves response relevance
- [ ] UI is responsive and visually polished

---

## 🎯 Quick Start Prompt

Use this condensed prompt in Lovable to get started:

```
Build an AI-powered business idea generator called "IdeaForge AI" for solopreneurs. Features:

1. Auth: Email/password login with auto-confirm
2. Dashboard: Quick actions to generate ideas or chat, lists of saved ideas and conversations with favorites, search, and CRUD operations
3. Chat: Streaming AI responses, markdown rendering, save ideas from messages, generate n8n workflows
4. Compare: Side-by-side business idea comparison

Database tables: profiles, conversations, chat_messages, business_ideas (with niche, target_audience, value_proposition, revenue_math, etc.), ai_prompts

Edge functions: /chat (streaming AI), /generate-n8n-workflow, /mem0 (memory operations)

Design: Dark theme, purple accents, gradient glows, frosted glass effects, Framer Motion animations

AI should generate detailed $10K/month business concepts with validation paths and AI automation strategies.
```

---

*This master prompt was auto-generated from the IdeaForge AI application codebase.*
