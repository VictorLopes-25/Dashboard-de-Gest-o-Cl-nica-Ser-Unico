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
      roles: {
        Row: {
          id: string
          name: string
          color: string
          bg_light: string
          text_color: string
          border_color: string | null
          description: string | null
          sort_order: number
        }
        Insert: {
          id: string
          name: string
          color?: string
          bg_light?: string
          text_color?: string
          border_color?: string | null
          description?: string | null
          sort_order?: number
        }
        Update: {
          name?: string
          color?: string
          bg_light?: string
          text_color?: string
          border_color?: string | null
          description?: string | null
          sort_order?: number
        }
      }
      collaborators: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          role_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          role_id: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          email?: string | null
          phone?: string | null
          role_id?: string
          is_active?: boolean
        }
      }
      dentists: {
        Row: {
          id: string
          name: string
          cro: string | null
          phone: string | null
          specialties: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          cro?: string | null
          phone?: string | null
          specialties?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          cro?: string | null
          phone?: string | null
          specialties?: string[]
          is_active?: boolean
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          role_id: string
          status: 'Pendente' | 'Em andamento' | 'Concluída'
          recurrence: 'Única' | 'Diária' | 'Semanal' | 'Mensal'
          assigned_collaborator_id: string | null
          due_date: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          role_id: string
          status?: 'Pendente' | 'Em andamento' | 'Concluída'
          recurrence?: 'Única' | 'Diária' | 'Semanal' | 'Mensal'
          assigned_collaborator_id?: string | null
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          role_id?: string
          status?: 'Pendente' | 'Em andamento' | 'Concluída'
          recurrence?: 'Única' | 'Diária' | 'Semanal' | 'Mensal'
          assigned_collaborator_id?: string | null
          due_date?: string | null
          completed_at?: string | null
        }
      }
      leads: {
        Row: {
          id: string
          name: string
          phone: string | null
          origin: string
          interest: string
          stage: string
          assigned_to_id: string | null
          next_action: string | null
          follow_up_date: string | null
          loss_reason: string | null
          loss_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          origin?: string
          interest?: string
          stage?: string
          assigned_to_id?: string | null
          next_action?: string | null
          follow_up_date?: string | null
          loss_reason?: string | null
          loss_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone?: string | null
          origin?: string
          interest?: string
          stage?: string
          assigned_to_id?: string | null
          next_action?: string | null
          follow_up_date?: string | null
          loss_reason?: string | null
          loss_notes?: string | null
        }
      }
      contact_history: {
        Row: {
          id: string
          lead_id: string
          type: string
          date: string
          summary: string | null
          registered_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          type: string
          date?: string
          summary?: string | null
          registered_by?: string | null
          created_at?: string
        }
        Update: {
          lead_id?: string
          type?: string
          date?: string
          summary?: string | null
          registered_by?: string | null
        }
      }
      scripts: {
        Row: {
          id: string
          title: string
          stage: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          stage?: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          stage?: string
          content?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role_id?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          email?: string
          role_id?: string
          is_active?: boolean
        }
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

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DatabaseWithoutInternals['public']['Tables'] &
        DatabaseWithoutInternals['public']['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DatabaseWithoutInternals['public']['Tables'] extends never
    ? never
    : keyof (DatabaseWithoutInternals['public']['Tables'] &
          DatabaseWithoutInternals['public']['Views']) extends never
      ? never
      : never = never,
> = never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
