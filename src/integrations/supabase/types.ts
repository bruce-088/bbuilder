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
      user_ai_preferences: {
        Row: {
          claude_configured: boolean | null
          created_at: string
          gemini_configured: boolean | null
          id: string
          openai_configured: boolean | null
          perplexity_configured: boolean | null
          preferred_provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          claude_configured?: boolean | null
          created_at?: string
          gemini_configured?: boolean | null
          id?: string
          openai_configured?: boolean | null
          perplexity_configured?: boolean | null
          preferred_provider?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          claude_configured?: boolean | null
          created_at?: string
          gemini_configured?: boolean | null
          id?: string
          openai_configured?: boolean | null
          perplexity_configured?: boolean | null
          preferred_provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          provider?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
