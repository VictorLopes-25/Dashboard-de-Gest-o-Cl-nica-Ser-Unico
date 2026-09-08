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
          status: Database['public']['Enums']['agenda_item_status']
          title: string
          transferred: boolean
          type: Database['public']['Enums']['agenda_item_type']
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
          status?: Database['public']['Enums']['agenda_item_status']
          title: string
          transferred?: boolean
          type: Database['public']['Enums']['agenda_item_type']
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
          status?: Database['public']['Enums']['agenda_item_status']
          title?: string
          transferred?: boolean
          type?: Database['public']['Enums']['agenda_item_type']
        }
        Relationships: [
          {
            foreignKeyName: 'agenda_items_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_agenda_function'
            columns: ['function_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_agenda_person'
            columns: ['person_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id', 'organization_id']
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
            foreignKeyName: 'areas_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_areas_function'
            columns: ['function_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id', 'organization_id']
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
            foreignKeyName: 'fk_fa_function'
            columns: ['function_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_fa_person'
            columns: ['person_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'function_assignments_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      function_cadence_logs: {
        Row: {
          adherence_pct: number
          completed_count: number
          created_at: string
          date: string
          expected_count: number
          function_id: string
          id: string
          notes: string | null
          organization_id: string
          person_id: string | null
          updated_at: string
        }
        Insert: {
          adherence_pct?: number
          completed_count?: number
          created_at?: string
          date?: string
          expected_count?: number
          function_id: string
          id?: string
          notes?: string | null
          organization_id: string
          person_id?: string | null
          updated_at?: string
        }
        Update: {
          adherence_pct?: number
          completed_count?: number
          created_at?: string
          date?: string
          expected_count?: number
          function_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          person_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'function_cadence_logs_function_id_fkey'
            columns: ['function_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'function_cadence_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'function_cadence_logs_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
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
            foreignKeyName: 'functions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      lead_contacts: {
        Row: {
          channel: string | null
          contact_date: string
          created_at: string
          function_id: string | null
          id: string
          lead_id: string
          next_action: string | null
          next_follow_up_at: string | null
          notes: string | null
          organization_id: string
          outcome: string | null
          person_id: string | null
        }
        Insert: {
          channel?: string | null
          contact_date?: string
          created_at?: string
          function_id?: string | null
          id?: string
          lead_id: string
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          organization_id: string
          outcome?: string | null
          person_id?: string | null
        }
        Update: {
          channel?: string | null
          contact_date?: string
          created_at?: string
          function_id?: string | null
          id?: string
          lead_id?: string
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          organization_id?: string
          outcome?: string | null
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_lc_function'
            columns: ['function_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_lc_lead'
            columns: ['lead_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_lc_person'
            columns: ['person_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'lead_contacts_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
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
          email: string | null
          evaluation_completed_at: string | null
          evaluation_scheduled_at: string | null
          evaluator_person_id: string | null
          id: string
          interest: string | null
          last_contact_at: string | null
          lost_at: string | null
          lost_reason: string | null
          name: string
          next_action: string | null
          next_contact_at: string | null
          next_follow_up_at: string | null
          organization_id: string
          origin: Database['public']['Enums']['lead_origin']
          phone: string | null
          referred_by_lead_id: string | null
          referred_by_name: string | null
          sale_date: string | null
          sale_value: number | null
          stage: Database['public']['Enums']['lead_stage']
          updated_at: string
        }
        Insert: {
          campaign?: string | null
          closed_at?: string | null
          commercial_function_id?: string | null
          commercial_person_id?: string | null
          created_at?: string
          email?: string | null
          evaluation_completed_at?: string | null
          evaluation_scheduled_at?: string | null
          evaluator_person_id?: string | null
          id?: string
          interest?: string | null
          last_contact_at?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          name: string
          next_action?: string | null
          next_contact_at?: string | null
          next_follow_up_at?: string | null
          organization_id: string
          origin?: Database['public']['Enums']['lead_origin']
          phone?: string | null
          referred_by_lead_id?: string | null
          referred_by_name?: string | null
          sale_date?: string | null
          sale_value?: number | null
          stage?: Database['public']['Enums']['lead_stage']
          updated_at?: string
        }
        Update: {
          campaign?: string | null
          closed_at?: string | null
          commercial_function_id?: string | null
          commercial_person_id?: string | null
          created_at?: string
          email?: string | null
          evaluation_completed_at?: string | null
          evaluation_scheduled_at?: string | null
          evaluator_person_id?: string | null
          id?: string
          interest?: string | null
          last_contact_at?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          name?: string
          next_action?: string | null
          next_contact_at?: string | null
          next_follow_up_at?: string | null
          organization_id?: string
          origin?: Database['public']['Enums']['lead_origin']
          phone?: string | null
          referred_by_lead_id?: string | null
          referred_by_name?: string | null
          sale_date?: string | null
          sale_value?: number | null
          stage?: Database['public']['Enums']['lead_stage']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_leads_commercial_function'
            columns: ['commercial_function_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_leads_commercial_person'
            columns: ['commercial_person_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_leads_evaluator'
            columns: ['evaluator_person_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_leads_referred_by'
            columns: ['referred_by_lead_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'leads_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      managed_exceptions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by_person_id: string | null
          created_at: string
          decision_at: string | null
          decision_by_person_id: string | null
          decision_text: string | null
          dedup_key: string
          description: string
          entity_id: string | null
          entity_type: string
          first_detected_at: string
          id: string
          last_detected_at: string
          organization_id: string
          recurrence_count: number
          resolved_at: string | null
          responsible_function_id: string
          responsible_person_id: string | null
          severity: Database['public']['Enums']['exception_severity']
          status: Database['public']['Enums']['exception_status']
          title: string
          type: Database['public']['Enums']['exception_type']
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by_person_id?: string | null
          created_at?: string
          decision_at?: string | null
          decision_by_person_id?: string | null
          decision_text?: string | null
          dedup_key: string
          description?: string
          entity_id?: string | null
          entity_type: string
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          organization_id: string
          recurrence_count?: number
          resolved_at?: string | null
          responsible_function_id: string
          responsible_person_id?: string | null
          severity?: Database['public']['Enums']['exception_severity']
          status?: Database['public']['Enums']['exception_status']
          title: string
          type: Database['public']['Enums']['exception_type']
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by_person_id?: string | null
          created_at?: string
          decision_at?: string | null
          decision_by_person_id?: string | null
          decision_text?: string | null
          dedup_key?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          organization_id?: string
          recurrence_count?: number
          resolved_at?: string | null
          responsible_function_id?: string
          responsible_person_id?: string | null
          severity?: Database['public']['Enums']['exception_severity']
          status?: Database['public']['Enums']['exception_status']
          title?: string
          type?: Database['public']['Enums']['exception_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'managed_exceptions_acknowledged_by_person_id_fkey'
            columns: ['acknowledged_by_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'managed_exceptions_decision_by_person_id_fkey'
            columns: ['decision_by_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'managed_exceptions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'managed_exceptions_responsible_function_id_fkey'
            columns: ['responsible_function_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'managed_exceptions_responsible_person_id_fkey'
            columns: ['responsible_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      management_actions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by_person_id: string | null
          description: string
          due_date: string | null
          id: string
          organization_id: string
          origin_item_id: string | null
          responsible_function_id: string | null
          responsible_person_id: string | null
          status: Database['public']['Enums']['management_action_status']
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by_person_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          organization_id: string
          origin_item_id?: string | null
          responsible_function_id?: string | null
          responsible_person_id?: string | null
          status?: Database['public']['Enums']['management_action_status']
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by_person_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          origin_item_id?: string | null
          responsible_function_id?: string | null
          responsible_person_id?: string | null
          status?: Database['public']['Enums']['management_action_status']
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'management_actions_created_by_person_id_fkey'
            columns: ['created_by_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'management_actions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'management_actions_origin_item_id_fkey'
            columns: ['origin_item_id']
            isOneToOne: false
            referencedRelation: 'management_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'management_actions_responsible_function_id_fkey'
            columns: ['responsible_function_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'management_actions_responsible_person_id_fkey'
            columns: ['responsible_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      management_items: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by_person_id: string | null
          content: string
          created_at: string
          created_by_person_id: string | null
          id: string
          organization_id: string
          status: Database['public']['Enums']['management_item_status']
          target_function_id: string | null
          target_person_id: string | null
          title: string
          type: Database['public']['Enums']['management_item_type']
          updated_at: string
          visibility_level: Database['public']['Enums']['management_visibility_level']
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by_person_id?: string | null
          content: string
          created_at?: string
          created_by_person_id?: string | null
          id?: string
          organization_id: string
          status?: Database['public']['Enums']['management_item_status']
          target_function_id?: string | null
          target_person_id?: string | null
          title: string
          type: Database['public']['Enums']['management_item_type']
          updated_at?: string
          visibility_level: Database['public']['Enums']['management_visibility_level']
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by_person_id?: string | null
          content?: string
          created_at?: string
          created_by_person_id?: string | null
          id?: string
          organization_id?: string
          status?: Database['public']['Enums']['management_item_status']
          target_function_id?: string | null
          target_person_id?: string | null
          title?: string
          type?: Database['public']['Enums']['management_item_type']
          updated_at?: string
          visibility_level?: Database['public']['Enums']['management_visibility_level']
        }
        Relationships: [
          {
            foreignKeyName: 'management_items_acknowledged_by_person_id_fkey'
            columns: ['acknowledged_by_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'management_items_created_by_person_id_fkey'
            columns: ['created_by_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'management_items_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'management_items_target_function_id_fkey'
            columns: ['target_function_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'management_items_target_person_id_fkey'
            columns: ['target_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      org_threshold_configs: {
        Row: {
          created_at: string
          description: string
          id: string
          key: string
          organization_id: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          key: string
          organization_id: string
          unit?: string
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key?: string
          organization_id?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: 'org_threshold_configs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
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
          org_role: Database['public']['Enums']['org_role_type'] | null
          organization_id: string
        }
        Insert: {
          active?: boolean
          auth_user_id?: string | null
          created_at?: string
          id?: string
          name: string
          org_role?: Database['public']['Enums']['org_role_type'] | null
          organization_id: string
        }
        Update: {
          active?: boolean
          auth_user_id?: string | null
          created_at?: string
          id?: string
          name?: string
          org_role?: Database['public']['Enums']['org_role_type'] | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'people_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
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
            foreignKeyName: 'scripts_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
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
          estimated_minutes: number | null
          function_id: string | null
          id: string
          is_routine: boolean | null
          organization_id: string
          priority: string | null
          recurrence: Database['public']['Enums']['recurrence_type']
          recurrence_day: number | null
          time_window: string | null
          title: string
        }
        Insert: {
          active?: boolean
          area_id?: string | null
          created_at?: string
          default_person_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          function_id?: string | null
          id?: string
          is_routine?: boolean | null
          organization_id: string
          priority?: string | null
          recurrence?: Database['public']['Enums']['recurrence_type']
          recurrence_day?: number | null
          time_window?: string | null
          title: string
        }
        Update: {
          active?: boolean
          area_id?: string | null
          created_at?: string
          default_person_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          function_id?: string | null
          id?: string
          is_routine?: boolean | null
          organization_id?: string
          priority?: string | null
          recurrence?: Database['public']['Enums']['recurrence_type']
          recurrence_day?: number | null
          time_window?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_tasks_area'
            columns: ['area_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_tasks_function'
            columns: ['function_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'fk_tasks_person'
            columns: ['default_person_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'tasks_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
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
          status: Database['public']['Enums']['treatment_status']
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          name: string
          organization_id: string
          status?: Database['public']['Enums']['treatment_status']
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          name?: string
          organization_id?: string
          status?: Database['public']['Enums']['treatment_status']
        }
        Relationships: [
          {
            foreignKeyName: 'fk_treatment_lead'
            columns: ['lead_id', 'organization_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id', 'organization_id']
          },
          {
            foreignKeyName: 'treatments_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_management_item: {
        Args: { p_item_id: string }
        Returns: Json
      }
      bootstrap_initial_owner: {
        Args: {
          owner_email: string
          owner_name: string
          owner_password: string
          target_org_id: string
        }
        Returns: Json
      }
      bootstrap_owner: {
        Args: { owner_name: string; target_org_id: string }
        Returns: Json
      }
      current_function_ids: { Args: never; Returns: string[] }
      current_org_id: { Args: never; Returns: string }
      current_org_role: {
        Args: never
        Returns: Database['public']['Enums']['org_role_type']
      }
      current_person: {
        Args: never
        Returns: {
          active: boolean
          auth_user_id: string | null
          created_at: string
          id: string
          name: string
          org_role: Database['public']['Enums']['org_role_type'] | null
          organization_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'people'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_person_id: { Args: never; Returns: string }
      get_auth_state: { Args: never; Returns: Json }
      get_bootstrap_status: { Args: never; Returns: Json }
      is_current_manager: { Args: never; Returns: boolean }
      is_current_owner: { Args: never; Returns: boolean }
      replace_function_occupant: {
        Args: { p_function_id: string; p_new_person_id: string }
        Returns: Json
      }
      upsert_managed_exception: {
        Args: {
          p_dedup_key: string
          p_description: string
          p_entity_id: string
          p_entity_type: string
          p_responsible_function_id: string
          p_responsible_person_id: string
          p_severity: Database['public']['Enums']['exception_severity']
          p_title: string
          p_type: Database['public']['Enums']['exception_type']
        }
        Returns: Json
      }
    }
    Enums: {
      agenda_item_status: 'aberto' | 'concluido' | 'cancelado'
      agenda_item_type: 'tarefa' | 'compromisso' | 'follow_up' | 'pos_venda' | 'pendencia'
      exception_severity: 'baixa' | 'media' | 'alta' | 'critica'
      exception_status: 'aberta' | 'reconhecida' | 'decidida' | 'resolvida'
      exception_type:
        | 'tarefa_atrasada'
        | 'ocorrencia_perdida'
        | 'lead_sem_followup'
        | 'falhas_recorrentes'
        | 'outro_desvio'
      lead_origin:
        | 'indicacao'
        | 'meta_ads'
        | 'google'
        | 'organico'
        | 'reativacao'
        | 'campanha'
        | 'parceiro'
        | 'outros'
      lead_stage:
        | 'novo'
        | 'avaliacao_agendada'
        | 'nao_compareceu'
        | 'avaliacao_realizada'
        | 'proposta_enviada'
        | 'fechado'
        | 'perdido'
      management_action_status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
      management_item_status: 'ativo' | 'resolvido' | 'arquivado'
      management_item_type:
        | 'feedback'
        | 'nota_privada_gestao'
        | 'decisao_posse'
        | 'conteudo_estrategico'
        | 'instrucao_funcao'
        | 'reconhecimento'
        | 'plano_desenvolvimento'
      management_visibility_level:
        | 'OWNER_ONLY'
        | 'PRIVATE_MANAGEMENT'
        | 'SHARED_WITH_EMPLOYEE'
        | 'FUNCTION_VISIBLE'
      org_role_type: 'OWNER'
      recurrence_type: 'pontual' | 'diaria' | 'semanal' | 'mensal' | 'data_especifica'
      treatment_status: 'em_andamento' | 'concluido' | 'cancelado'
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
    Enums: {
      agenda_item_status: ['aberto', 'concluido', 'cancelado'],
      agenda_item_type: ['tarefa', 'compromisso', 'follow_up', 'pos_venda', 'pendencia'],
      exception_severity: ['baixa', 'media', 'alta', 'critica'],
      exception_status: ['aberta', 'reconhecida', 'decidida', 'resolvida'],
      exception_type: [
        'tarefa_atrasada',
        'ocorrencia_perdida',
        'lead_sem_followup',
        'falhas_recorrentes',
        'outro_desvio',
      ],
      lead_origin: [
        'indicacao',
        'meta_ads',
        'google',
        'organico',
        'reativacao',
        'campanha',
        'parceiro',
        'outros',
      ],
      lead_stage: [
        'novo',
        'avaliacao_agendada',
        'nao_compareceu',
        'avaliacao_realizada',
        'proposta_enviada',
        'fechado',
        'perdido',
      ],
      management_action_status: ['pendente', 'em_andamento', 'concluida', 'cancelada'],
      management_item_status: ['ativo', 'resolvido', 'arquivado'],
      management_item_type: [
        'feedback',
        'nota_privada_gestao',
        'decisao_posse',
        'conteudo_estrategico',
        'instrucao_funcao',
        'reconhecimento',
        'plano_desenvolvimento',
      ],
      management_visibility_level: [
        'OWNER_ONLY',
        'PRIVATE_MANAGEMENT',
        'SHARED_WITH_EMPLOYEE',
        'FUNCTION_VISIBLE',
      ],
      org_role_type: ['OWNER'],
      recurrence_type: ['pontual', 'diaria', 'semanal', 'mensal', 'data_especifica'],
      treatment_status: ['em_andamento', 'concluido', 'cancelado'],
    },
  },
} as const
