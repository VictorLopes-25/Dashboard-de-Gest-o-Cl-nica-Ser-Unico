// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      collaborators: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role_ids: string[]
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role_ids?: string[]
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role_ids?: string[]
        }
        Relationships: []
      }
      contact_history: {
        Row: {
          created_at: string
          date: string
          id: string
          lead_id: string
          registered_by: string | null
          script_title_used: string | null
          summary: string
          type: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          lead_id: string
          registered_by?: string | null
          script_title_used?: string | null
          summary: string
          type?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          lead_id?: string
          registered_by?: string | null
          script_title_used?: string | null
          summary?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contact_history_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
      dentists: {
        Row: {
          created_at: string
          cro: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          specialties: string[]
        }
        Insert: {
          created_at?: string
          cro?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          specialties?: string[]
        }
        Update: {
          created_at?: string
          cro?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          specialties?: string[]
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to_id: string | null
          assigned_to_name: string | null
          assigned_to_role: string | null
          created_at: string
          follow_up_date: string | null
          id: string
          interest: string
          loss_notes: string | null
          loss_reason: string | null
          name: string
          next_action: string | null
          notes: string | null
          origin: string
          phone: string
          stage: string
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          assigned_to_name?: string | null
          assigned_to_role?: string | null
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interest?: string
          loss_notes?: string | null
          loss_reason?: string | null
          name: string
          next_action?: string | null
          notes?: string | null
          origin?: string
          phone: string
          stage?: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          assigned_to_name?: string | null
          assigned_to_role?: string | null
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interest?: string
          loss_notes?: string | null
          loss_reason?: string | null
          name?: string
          next_action?: string | null
          notes?: string | null
          origin?: string
          phone?: string
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_admin: boolean
          name: string
          role_ids: string[]
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          is_admin?: boolean
          name?: string
          role_ids?: string[]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean
          name?: string
          role_ids?: string[]
        }
        Relationships: []
      }
      roles: {
        Row: {
          bg_light: string
          border_color: string
          color: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          sort_order: number
          text_color: string
        }
        Insert: {
          bg_light?: string
          border_color?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          text_color?: string
        }
        Update: {
          bg_light?: string
          border_color?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          text_color?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          content: string
          id: string
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          id?: string
          stage?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_collaborator_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string
          id: string
          recurrence: string
          role_id: string
          status: string
          title: string
        }
        Insert: {
          assigned_collaborator_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          recurrence?: string
          role_id: string
          status?: string
          title: string
        }
        Update: {
          assigned_collaborator_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          recurrence?: string
          role_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_collaborator_id_fkey'
            columns: ['assigned_collaborator_id']
            isOneToOne: false
            referencedRelation: 'collaborators'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
