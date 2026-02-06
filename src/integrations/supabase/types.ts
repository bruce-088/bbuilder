export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_prompts: {
        Row: {
          business_idea_id: string
          created_at: string
          id: string
          prompt_content: string
          prompt_type: string
          user_id: string
        }
        Insert: {
          business_idea_id: string
          created_at?: string
          id?: string
          prompt_content: string
          prompt_type: string
          user_id: string
        }
        Update: {
          business_idea_id?: string
          created_at?: string
          id?: string
          prompt_content?: string
          prompt_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_business_idea_id_fkey"
            columns: ["business_idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_jobs: {
        Row: {
          completed_actions: number | null
          created_at: string
          current_action: string | null
          error: string | null
          id: string
          results: Json | null
          session_id: string
          status: string
          total_actions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_actions?: number | null
          created_at?: string
          current_action?: string | null
          error?: string | null
          id?: string
          results?: Json | null
          session_id: string
          status?: string
          total_actions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_actions?: number | null
          created_at?: string
          current_action?: string | null
          error?: string | null
          id?: string
          results?: Json | null
          session_id?: string
          status?: string
          total_actions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          ai_provider: string | null
          business_idea_id: string
          completed_at: string | null
          created_at: string
          current_phase: string | null
          errors: Json | null
          id: string
          phase_logs: Json | null
          phases_completed: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_provider?: string | null
          business_idea_id: string
          completed_at?: string | null
          created_at?: string
          current_phase?: string | null
          errors?: Json | null
          id?: string
          phase_logs?: Json | null
          phases_completed?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_provider?: string | null
          business_idea_id?: string
          completed_at?: string | null
          created_at?: string
          current_phase?: string | null
          errors?: Json | null
          id?: string
          phase_logs?: Json | null
          phases_completed?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_business_idea_id_fkey"
            columns: ["business_idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      business_ideas: {
        Row: {
          ai_automation_strategy: Json
          business_name: string
          conversation_id: string | null
          created_at: string
          id: string
          is_favorite: boolean
          niche: string
          revenue_math: string
          service_offering: string
          target_audience: string
          updated_at: string
          user_id: string
          validation_path: string
          value_proposition: string
        }
        Insert: {
          ai_automation_strategy?: Json
          business_name: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          niche: string
          revenue_math: string
          service_offering: string
          target_audience: string
          updated_at?: string
          user_id: string
          validation_path: string
          value_proposition: string
        }
        Update: {
          ai_automation_strategy?: Json
          business_name?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          niche?: string
          revenue_math?: string
          service_offering?: string
          target_audience?: string
          updated_at?: string
          user_id?: string
          validation_path?: string
          value_proposition?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_ideas_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_analyses: {
        Row: {
          analyzed_at: string | null
          business_idea_id: string | null
          competitor_name: string
          created_at: string | null
          features: string[] | null
          id: string
          positioning: string | null
          pricing_info: Json | null
          recent_news: Json | null
          source_urls: string[] | null
          strengths: string[] | null
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          analyzed_at?: string | null
          business_idea_id?: string | null
          competitor_name: string
          created_at?: string | null
          features?: string[] | null
          id?: string
          positioning?: string | null
          pricing_info?: Json | null
          recent_news?: Json | null
          source_urls?: string[] | null
          strengths?: string[] | null
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          analyzed_at?: string | null
          business_idea_id?: string | null
          competitor_name?: string
          created_at?: string | null
          features?: string[] | null
          id?: string
          positioning?: string | null
          pricing_info?: Json | null
          recent_news?: Json | null
          source_urls?: string[] | null
          strengths?: string[] | null
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analyses_business_idea_id_fkey"
            columns: ["business_idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      differentiation_strategies: {
        Row: {
          business_idea_id: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          recommendation: string
          strategy_type: string
          supporting_data: Json | null
          user_id: string
        }
        Insert: {
          business_idea_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          recommendation: string
          strategy_type: string
          supporting_data?: Json | null
          user_id: string
        }
        Update: {
          business_idea_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          recommendation?: string
          strategy_type?: string
          supporting_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "differentiation_strategies_business_idea_id_fkey"
            columns: ["business_idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      fix_knowledge_base: {
        Row: {
          created_at: string
          fix_prompt: string
          id: string
          issue_type: string
          node_type: string
          root_cause: string | null
          solution_summary: string | null
          success_count: number
          updated_at: string
          user_id: string
          workflow_name: string | null
        }
        Insert: {
          created_at?: string
          fix_prompt: string
          id?: string
          issue_type: string
          node_type: string
          root_cause?: string | null
          solution_summary?: string | null
          success_count?: number
          updated_at?: string
          user_id: string
          workflow_name?: string | null
        }
        Update: {
          created_at?: string
          fix_prompt?: string
          id?: string
          issue_type?: string
          node_type?: string
          root_cause?: string | null
          solution_summary?: string | null
          success_count?: number
          updated_at?: string
          user_id?: string
          workflow_name?: string | null
        }
        Relationships: []
      }
      implementation_progress: {
        Row: {
          business_idea_id: string | null
          completed_steps: string[]
          created_at: string
          id: string
          section_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_idea_id?: string | null
          completed_steps?: string[]
          created_at?: string
          id?: string
          section_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_idea_id?: string | null
          completed_steps?: string[]
          created_at?: string
          id?: string
          section_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_progress_business_idea_id_fkey"
            columns: ["business_idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contacts: {
        Row: {
          business_idea_id: string | null
          company: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          estimated_value: number | null
          id: string
          last_contact_at: string | null
          name: string
          phone: string | null
          source: string
          stage: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_idea_id?: string | null
          company?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          name: string
          phone?: string | null
          source?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_idea_id?: string | null
          company?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          name?: string
          phone?: string | null
          source?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_business_idea_id_fkey"
            columns: ["business_idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          quest_unlocked: string | null
          user_id: string
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          quest_unlocked?: string | null
          user_id: string
          xp_awarded?: number
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          quest_unlocked?: string | null
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      n8n_deployment_requests: {
        Row: {
          business_idea_id: string | null
          created_at: string | null
          deployed_at: string | null
          error_message: string | null
          id: string
          n8n_workflow_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          workflow_json: Json
          workflow_name: string
        }
        Insert: {
          business_idea_id?: string | null
          created_at?: string | null
          deployed_at?: string | null
          error_message?: string | null
          id?: string
          n8n_workflow_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          workflow_json: Json
          workflow_name: string
        }
        Update: {
          business_idea_id?: string | null
          created_at?: string | null
          deployed_at?: string | null
          error_message?: string | null
          id?: string
          n8n_workflow_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_json?: Json
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_deployment_requests_business_idea_id_fkey"
            columns: ["business_idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_execution_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          error_node: string | null
          execution_data: Json | null
          execution_id: string
          finished_at: string | null
          id: string
          node_execution_count: number | null
          retry_count: number | null
          started_at: string
          status: string
          trigger_type: string | null
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          error_node?: string | null
          execution_data?: Json | null
          execution_id: string
          finished_at?: string | null
          id?: string
          node_execution_count?: number | null
          retry_count?: number | null
          started_at?: string
          status?: string
          trigger_type?: string | null
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          error_node?: string | null
          execution_data?: Json | null
          execution_id?: string
          finished_at?: string | null
          id?: string
          node_execution_count?: number | null
          retry_count?: number | null
          started_at?: string
          status?: string
          trigger_type?: string | null
          user_id?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: []
      }
      n8n_workflow_snapshots: {
        Row: {
          captured_at: string | null
          connections: Json | null
          conversation_id: string | null
          id: string
          nodes: Json
          source: string | null
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          captured_at?: string | null
          connections?: Json | null
          conversation_id?: string | null
          id?: string
          nodes: Json
          source?: string | null
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          captured_at?: string | null
          connections?: Json | null
          conversation_id?: string | null
          id?: string
          nodes?: Json
          source?: string | null
          user_id?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_workflow_snapshots_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_workflow_stats: {
        Row: {
          avg_duration_ms: number | null
          created_at: string
          error_count: number | null
          id: string
          last_execution_at: string | null
          last_status: string | null
          success_count: number | null
          success_rate: number | null
          total_executions: number | null
          updated_at: string
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          avg_duration_ms?: number | null
          created_at?: string
          error_count?: number | null
          id?: string
          last_execution_at?: string | null
          last_status?: string | null
          success_count?: number | null
          success_rate?: number | null
          total_executions?: number | null
          updated_at?: string
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          avg_duration_ms?: number | null
          created_at?: string
          error_count?: number | null
          id?: string
          last_execution_at?: string | null
          last_status?: string | null
          success_count?: number | null
          success_rate?: number | null
          total_executions?: number | null
          updated_at?: string
          user_id?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenue_entries: {
        Row: {
          amount: number
          created_at: string
          entry_date: string
          id: string
          is_recurring: boolean
          lead_id: string | null
          notes: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          entry_date?: string
          id?: string
          is_recurring?: boolean
          lead_id?: string | null
          notes?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_date?: string
          id?: string
          is_recurring?: boolean
          lead_id?: string | null
          notes?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_entries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_guide_progress: {
        Row: {
          created_at: string
          id: string
          progress: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          progress?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          progress?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_preferences: {
        Row: {
          claude_configured: boolean | null
          created_at: string
          elevenlabs_configured: boolean | null
          gemini_configured: boolean | null
          id: string
          openai_configured: boolean | null
          perplexity_configured: boolean | null
          preferred_provider: string | null
          preferred_voice_id: string | null
          updated_at: string
          user_id: string
          voice_enabled: boolean | null
        }
        Insert: {
          claude_configured?: boolean | null
          created_at?: string
          elevenlabs_configured?: boolean | null
          gemini_configured?: boolean | null
          id?: string
          openai_configured?: boolean | null
          perplexity_configured?: boolean | null
          preferred_provider?: string | null
          preferred_voice_id?: string | null
          updated_at?: string
          user_id: string
          voice_enabled?: boolean | null
        }
        Update: {
          claude_configured?: boolean | null
          created_at?: string
          elevenlabs_configured?: boolean | null
          gemini_configured?: boolean | null
          id?: string
          openai_configured?: boolean | null
          perplexity_configured?: boolean | null
          preferred_provider?: string | null
          preferred_voice_id?: string | null
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean | null
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          encrypted_key_secure: string | null
          id: string
          n8n_credential_id: string | null
          provider: string
          service_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          encrypted_key_secure?: string | null
          id?: string
          n8n_credential_id?: string | null
          provider: string
          service_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          encrypted_key_secure?: string | null
          id?: string
          n8n_credential_id?: string | null
          provider?: string
          service_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          achievements: string[]
          active_quest_id: string | null
          created_at: string
          current_stage: number
          id: string
          mission_started_at: string
          target_date: string
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          achievements?: string[]
          active_quest_id?: string | null
          created_at?: string
          current_stage?: number
          id?: string
          mission_started_at?: string
          target_date?: string
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          achievements?: string[]
          active_quest_id?: string | null
          created_at?: string
          current_stage?: number
          id?: string
          mission_started_at?: string
          target_date?: string
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_active_quest_id_fkey"
            columns: ["active_quest_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_deploy_workflows: boolean | null
          auto_expand_details: boolean | null
          created_at: string
          id: string
          n8n_hosting_type: string | null
          n8n_instance_url: string | null
          n8n_workflow_path: string | null
          onboarding_completed_at: string | null
          preferred_fix_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_deploy_workflows?: boolean | null
          auto_expand_details?: boolean | null
          created_at?: string
          id?: string
          n8n_hosting_type?: string | null
          n8n_instance_url?: string | null
          n8n_workflow_path?: string | null
          onboarding_completed_at?: string | null
          preferred_fix_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_deploy_workflows?: boolean | null
          auto_expand_details?: boolean | null
          created_at?: string
          id?: string
          n8n_hosting_type?: string | null
          n8n_instance_url?: string | null
          n8n_workflow_path?: string | null
          onboarding_completed_at?: string | null
          preferred_fix_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_edges: {
        Row: {
          created_at: string
          id: string
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_logs: {
        Row: {
          completed_at: string | null
          error: string | null
          execution_id: string
          id: string
          input_data: Json | null
          node_id: string
          output_data: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          node_id: string
          output_data?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          node_id?: string
          output_data?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_logs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          id: string
          started_at: string
          status: string
          trigger_data: Json | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: string
          trigger_data?: Json | null
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: string
          trigger_data?: Json | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          ai_model: string | null
          ai_prompt: string | null
          config: Json
          created_at: string
          id: string
          name: string
          position_x: number
          position_y: number
          type: string
          workflow_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_prompt?: string | null
          config?: Json
          created_at?: string
          id?: string
          name?: string
          position_x?: number
          position_y?: number
          type: string
          workflow_id: string
        }
        Update: {
          ai_model?: string | null
          ai_prompt?: string | null
          config?: Json
          created_at?: string
          id?: string
          name?: string
          position_x?: number
          position_y?: number
          type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_schedules: {
        Row: {
          created_at: string
          cron_expression: string
          enabled: boolean
          id: string
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          cron_expression?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          cron_expression?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: true
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_api_key_encrypted: {
        Args: { p_provider: string; p_user_id: string }
        Returns: string
      }
      store_api_key_encrypted: {
        Args: {
          p_encrypted_data: string
          p_provider: string
          p_service_type?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
