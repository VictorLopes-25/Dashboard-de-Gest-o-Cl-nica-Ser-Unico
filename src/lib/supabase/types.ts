// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_items: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string
          due_time: string | null
          feedback: string | null
          function_id: string | null
          id: string
          notes: string | null
          organization_id: string
          person_id: string | null
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["agenda_item_status"]
          title: string
          transferred: boolean
          type: Database["public"]["Enums"]["agenda_item_type"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date: string
          due_time?: string | null
          feedback?: string | null
          function_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          person_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["agenda_item_status"]
          title: string
          transferred?: boolean
          type: Database["public"]["Enums"]["agenda_item_type"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string
          due_time?: string | null
          feedback?: string | null
          function_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          person_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["agenda_item_status"]
          title?: string
          transferred?: boolean
          type?: Database["public"]["Enums"]["agenda_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_agenda_function"
            columns: ["function_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_agenda_person"
            columns: ["person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      areas: {
        Row: {
          active: boolean
          function_id: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          function_id: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          function_id?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_areas_function"
            columns: ["function_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      function_assignments: {
        Row: {
          active: boolean
          created_at: string
          end_date: string | null
          function_id: string
          id: string
          organization_id: string
          person_id: string
          start_date: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_date?: string | null
          function_id: string
          id?: string
          organization_id: string
          person_id: string
          start_date?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_date?: string | null
          function_id?: string
          id?: string
          organization_id?: string
          person_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_fa_function"
            columns: ["function_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_fa_person"
            columns: ["person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "function_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      functions: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "functions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contacts: {
        Row: {
          channel: string | null
          contact_date: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          organization_id: string
          person_id: string | null
        }
        Insert: {
          channel?: string | null
          contact_date?: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          organization_id: string
          person_id?: string | null
        }
        Update: {
          channel?: string | null
          contact_date?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          organization_id?: string
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lc_lead"
            columns: ["lead_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_lc_person"
            columns: ["person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "lead_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign: string | null
          closed_at: string | null
          commercial_function_id: string | null
          commercial_person_id: string | null
          created_at: string
          evaluation_completed_at: string | null
          evaluation_scheduled_at: string | null
          evaluator_person_id: string | null
          id: string
          lost_at: string | null
          lost_reason: string | null
          name: string
          next_action: string | null
          next_contact_at: string | null
          organization_id: string
          origin: Database["public"]["Enums"]["lead_origin"]
          phone: string | null
          referred_by_lead_id: string | null
          referred_by_name: string | null
          sale_date: string | null
          sale_value: number | null
          stage: Database["public"]["Enums"]["lead_stage"]
        }
        Insert: {
          campaign?: string | null
          closed_at?: string | null
          commercial_function_id?: string | null
          commercial_person_id?: string | null
          created_at?: string
          evaluation_completed_at?: string | null
          evaluation_scheduled_at?: string | null
          evaluator_person_id?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          name: string
          next_action?: string | null
          next_contact_at?: string | null
          organization_id: string
          origin?: Database["public"]["Enums"]["lead_origin"]
          phone?: string | null
          referred_by_lead_id?: string | null
          referred_by_name?: string | null
          sale_date?: string | null
          sale_value?: number | null
          stage?: Database["public"]["Enums"]["lead_stage"]
        }
        Update: {
          campaign?: string | null
          closed_at?: string | null
          commercial_function_id?: string | null
          commercial_person_id?: string | null
          created_at?: string
          evaluation_completed_at?: string | null
          evaluation_scheduled_at?: string | null
          evaluator_person_id?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          name?: string
          next_action?: string | null
          next_contact_at?: string | null
          organization_id?: string
          origin?: Database["public"]["Enums"]["lead_origin"]
          phone?: string | null
          referred_by_lead_id?: string | null
          referred_by_name?: string | null
          sale_date?: string | null
          sale_value?: number | null
          stage?: Database["public"]["Enums"]["lead_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_commercial_function"
            columns: ["commercial_function_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_leads_commercial_person"
            columns: ["commercial_person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_leads_evaluator"
            columns: ["evaluator_person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_leads_referred_by"
            columns: ["referred_by_lead_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          active: boolean
          auth_user_id: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          auth_user_id?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          auth_user_id?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      scripts: {
        Row: {
          active: boolean
          content: string | null
          id: string
          organization_id: string
          stage: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content?: string | null
          id?: string
          organization_id: string
          stage?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string | null
          id?: string
          organization_id?: string
          stage?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          active: boolean
          area_id: string | null
          created_at: string
          default_person_id: string | null
          description: string | null
          due_date: string | null
          function_id: string | null
          id: string
          organization_id: string
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          recurrence_day: number | null
          title: string
        }
        Insert: {
          active?: boolean
          area_id?: string | null
          created_at?: string
          default_person_id?: string | null
          description?: string | null
          due_date?: string | null
          function_id?: string | null
          id?: string
          organization_id: string
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          recurrence_day?: number | null
          title: string
        }
        Update: {
          active?: boolean
          area_id?: string | null
          created_at?: string
          default_person_id?: string | null
          description?: string | null
          due_date?: string | null
          function_id?: string | null
          id?: string
          organization_id?: string
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          recurrence_day?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_area"
            columns: ["area_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_tasks_function"
            columns: ["function_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_tasks_person"
            columns: ["default_person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lead_id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["treatment_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["treatment_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["treatment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_treatment_lead"
            columns: ["lead_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "treatments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      agenda_item_status: "aberto" | "concluido" | "cancelado"
      agenda_item_type:
        | "tarefa"
        | "compromisso"
        | "follow_up"
        | "pos_venda"
        | "pendencia"
      lead_origin:
        | "indicacao"
        | "meta_ads"
        | "google"
        | "organico"
        | "reativacao"
        | "campanha"
        | "parceiro"
        | "outros"
      lead_stage:
        | "novo"
        | "avaliacao_agendada"
        | "nao_compareceu"
        | "avaliacao_realizada"
        | "proposta_enviada"
        | "fechado"
        | "perdido"
      recurrence_type:
        | "pontual"
        | "diaria"
        | "semanal"
        | "mensal"
        | "data_especifica"
      treatment_status: "em_andamento" | "concluido" | "cancelado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agenda_item_status: ["aberto", "concluido", "cancelado"],
      agenda_item_type: [
        "tarefa",
        "compromisso",
        "follow_up",
        "pos_venda",
        "pendencia",
      ],
      lead_origin: [
        "indicacao",
        "meta_ads",
        "google",
        "organico",
        "reativacao",
        "campanha",
        "parceiro",
        "outros",
      ],
      lead_stage: [
        "novo",
        "avaliacao_agendada",
        "nao_compareceu",
        "avaliacao_realizada",
        "proposta_enviada",
        "fechado",
        "perdido",
      ],
      recurrence_type: [
        "pontual",
        "diaria",
        "semanal",
        "mensal",
        "data_especifica",
      ],
      treatment_status: ["em_andamento", "concluido", "cancelado"],
    },
  },
} as const

