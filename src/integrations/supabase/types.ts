export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      annual_reports: {
        Row: {
          created_at: string
          generated_at: string | null
          id: string
          report_data: Json | null
          report_status: string | null
          report_year: number
          sent_at: string | null
          total_contributions: number | null
          total_premiums_paid: number | null
          trust_balance: number | null
          trust_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          id?: string
          report_data?: Json | null
          report_status?: string | null
          report_year: number
          sent_at?: string | null
          total_contributions?: number | null
          total_premiums_paid?: number | null
          trust_balance?: number | null
          trust_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          id?: string
          report_data?: Json | null
          report_status?: string | null
          report_year?: number
          sent_at?: string | null
          total_contributions?: number | null
          total_premiums_paid?: number | null
          trust_balance?: number | null
          trust_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_reports_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiaries: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          notification_preferences: Json | null
          percentage: number | null
          phone: string | null
          relationship: string | null
          trust_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notification_preferences?: Json | null
          percentage?: number | null
          phone?: string | null
          relationship?: string | null
          trust_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notification_preferences?: Json | null
          percentage?: number | null
          phone?: string | null
          relationship?: string | null
          trust_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          communication_type: string | null
          created_at: string
          id: string
          message: string
          recipient_id: string | null
          recipient_type: string
          sent_at: string | null
          status: string | null
          subject: string
          trust_id: string
          updated_at: string
        }
        Insert: {
          communication_type?: string | null
          created_at?: string
          id?: string
          message: string
          recipient_id?: string | null
          recipient_type: string
          sent_at?: string | null
          status?: string | null
          subject: string
          trust_id: string
          updated_at?: string
        }
        Update: {
          communication_type?: string | null
          created_at?: string
          id?: string
          message?: string
          recipient_id?: string | null
          recipient_type?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          trust_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          contribution_date: string
          contribution_type: string | null
          contributor_name: string
          created_at: string
          id: string
          notes: string | null
          status: string | null
          trust_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          contribution_date: string
          contribution_type?: string | null
          contributor_name: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          trust_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          contribution_type?: string | null
          contributor_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          trust_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          annual_premium: number | null
          created_at: string
          death_benefit: number | null
          id: string
          insurance_company: string
          next_premium_due: string | null
          policy_number: string
          policy_status: string | null
          policy_type: string | null
          premium_frequency: string | null
          trust_id: string
          updated_at: string
        }
        Insert: {
          annual_premium?: number | null
          created_at?: string
          death_benefit?: number | null
          id?: string
          insurance_company: string
          next_premium_due?: string | null
          policy_number: string
          policy_status?: string | null
          policy_type?: string | null
          premium_frequency?: string | null
          trust_id: string
          updated_at?: string
        }
        Update: {
          annual_premium?: number | null
          created_at?: string
          death_benefit?: number | null
          id?: string
          insurance_company?: string
          next_premium_due?: string | null
          policy_number?: string
          policy_status?: string | null
          policy_type?: string | null
          premium_frequency?: string | null
          trust_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_payments: {
        Row: {
          amount: number
          confirmation_number: string | null
          created_at: string
          due_date: string
          id: string
          payment_date: string | null
          payment_method: string | null
          policy_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          confirmation_number?: string | null
          created_at?: string
          due_date: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          policy_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          confirmation_number?: string | null
          created_at?: string
          due_date?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          policy_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_payments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_filings: {
        Row: {
          created_at: string
          due_date: string
          filed_date: string | null
          filing_status: string | null
          form_type: string
          id: string
          notes: string | null
          prepared_by: string | null
          tax_year: number
          trust_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          filed_date?: string | null
          filing_status?: string | null
          form_type: string
          id?: string
          notes?: string | null
          prepared_by?: string | null
          tax_year: number
          trust_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          filed_date?: string | null
          filing_status?: string | null
          form_type?: string
          id?: string
          notes?: string | null
          prepared_by?: string | null
          tax_year?: number
          trust_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_filings_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_path: string | null
          id: string
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          trust_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          file_path?: string | null
          id?: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          trust_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_path?: string | null
          id?: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          trust_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_documents_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
            referencedColumns: ["id"]
          },
        ]
      }
      trusts: {
        Row: {
          created_at: string
          crm_reference: string | null
          grantor_name: string
          id: string
          status: string | null
          trust_date: string
          trust_name: string
          trust_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm_reference?: string | null
          grantor_name: string
          id?: string
          status?: string | null
          trust_date: string
          trust_name: string
          trust_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm_reference?: string | null
          grantor_name?: string
          id?: string
          status?: string | null
          trust_date?: string
          trust_name?: string
          trust_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workflow_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          task_type: string
          title: string
          trust_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          task_type: string
          title: string
          trust_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          task_type?: string
          title?: string
          trust_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_trust_id_fkey"
            columns: ["trust_id"]
            isOneToOne: false
            referencedRelation: "trusts"
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
