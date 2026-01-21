export type Database = {
  public: {
    Tables: {
      trusts: {
        Row: {
          id: string
          trust_name: string
          trust_type: string
          trust_date: string
          attorney_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_name: string
          trust_type: string
          trust_date?: string
          attorney_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_name?: string
          trust_type?: string
          trust_date?: string
          attorney_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          trust_id: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string | null
          uploaded_at: string
          document_type: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
          document_type?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
          document_type?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      beneficiaries: {
        Row: {
          id: string
          trust_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          relationship: string | null
          percentage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          relationship?: string | null
          percentage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          relationship?: string | null
          percentage?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      gifts: {
        Row: {
          id: string
          trust_id: string
          beneficiary_id: string
          gift_date: string
          amount: number
          gift_type: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          beneficiary_id: string
          gift_date: string
          amount: number
          gift_type?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          beneficiary_id?: string
          gift_date?: string
          amount?: number
          gift_type?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trustees: {
        Row: {
          id: string
          trust_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          role: string
          verified: boolean
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          role?: string
          verified?: boolean
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          role?: string
          verified?: boolean
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trust_assets: {
        Row: {
          id: string
          trust_id: string
          asset_type: string
          asset_name: string
          asset_value: number | null
          last_valued_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          asset_type: string
          asset_name: string
          asset_value?: number | null
          last_valued_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          asset_type?: string
          asset_name?: string
          asset_value?: number | null
          last_valued_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tax_filings: {
        Row: {
          id: string
          trust_id: string
          filing_type: string
          tax_year: number
          due_date: string | null
          filed_date: string | null
          status: string
          preparer_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          filing_type: string
          tax_year: number
          due_date?: string | null
          filed_date?: string | null
          status?: string
          preparer_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          filing_type?: string
          tax_year?: number
          due_date?: string | null
          filed_date?: string | null
          status?: string
          preparer_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      compliance_tasks: {
        Row: {
          id: string
          trust_id: string
          task_type: string
          task_description: string | null
          due_date: string | null
          completed_date: string | null
          assigned_to: string | null
          status: string
          priority: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          task_type: string
          task_description?: string | null
          due_date?: string | null
          completed_date?: string | null
          assigned_to?: string | null
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          task_type?: string
          task_description?: string | null
          due_date?: string | null
          completed_date?: string | null
          assigned_to?: string | null
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
        }
      }
      communications: {
        Row: {
          id: string
          trust_id: string
          beneficiary_id: string
          communication_type: string
          subject: string | null
          content: string | null
          sent_at: string | null
          acknowledged_at: string | null
          delivery_method: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          beneficiary_id: string
          communication_type: string
          subject?: string | null
          content?: string | null
          sent_at?: string | null
          acknowledged_at?: string | null
          delivery_method?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          beneficiary_id?: string
          communication_type?: string
          subject?: string | null
          content?: string | null
          sent_at?: string | null
          acknowledged_at?: string | null
          delivery_method?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      distributions: {
        Row: {
          id: string
          trust_id: string
          beneficiary_id: string
          distribution_type: string
          amount: number
          scheduled_date: string | null
          completed_date: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          beneficiary_id: string
          distribution_type: string
          amount: number
          scheduled_date?: string | null
          completed_date?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          beneficiary_id?: string
          distribution_type?: string
          amount?: number
          scheduled_date?: string | null
          completed_date?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      annual_reviews: {
        Row: {
          id: string
          trust_id: string
          review_year: number
          review_date: string | null
          reviewed_by: string | null
          family_changes: string | null
          recommended_actions: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trust_id: string
          review_year: number
          review_date?: string | null
          reviewed_by?: string | null
          family_changes?: string | null
          recommended_actions?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trust_id?: string
          review_year?: number
          review_date?: string | null
          reviewed_by?: string | null
          family_changes?: string | null
          recommended_actions?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}