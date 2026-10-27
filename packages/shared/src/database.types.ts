export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          icon: string
          label: string
          slug: string
          sort: number
        }
        ComputedFields: never
        Insert: {
          icon: string
          label: string
          slug: string
          sort?: number
        }
        Update: {
          icon?: string
          label?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      appeals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          due_at: string
          id: string
          message: string
          response: string | null
          status: Database["public"]["Enums"]["appeal_status"]
          subject: Database["public"]["Enums"]["appeal_subject"]
          subject_id: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          due_at?: string
          id?: string
          message: string
          response?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          subject: Database["public"]["Enums"]["appeal_subject"]
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          due_at?: string
          id?: string
          message?: string
          response?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          subject?: Database["public"]["Enums"]["appeal_subject"]
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          admin_id: string
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          reason: string
          subject_id: string
          subject_type: string
        }
        ComputedFields: never
        Insert: {
          action: string
          admin_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          reason: string
          subject_id: string
          subject_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          reason?: string
          subject_id?: string
          subject_type?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        ComputedFields: never
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          center_lat: number
          center_lng: number
          created_at: string
          id: string
          launch_date: string | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["city_status"]
          timezone: string
        }
        ComputedFields: never
        Insert: {
          center_lat: number
          center_lng: number
          created_at?: string
          id?: string
          launch_date?: string | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["city_status"]
          timezone?: string
        }
        Update: {
          center_lat?: number
          center_lng?: number
          created_at?: string
          id?: string
          launch_date?: string | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["city_status"]
          timezone?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          city_id: string
          created_at: string
          id: string
          name: string
          status: string
        }
        ComputedFields: never
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "colleges_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "admin_city_waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colleges_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          policy_version: string
          purpose: Database["public"]["Enums"]["consent_purpose"]
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          granted: boolean
          id?: string
          policy_version: string
          purpose: Database["public"]["Enums"]["consent_purpose"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          policy_version?: string
          purpose?: Database["public"]["Enums"]["consent_purpose"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_mutes: {
        Row: {
          conversation_id: string
          created_at: string
          reason: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          conversation_id: string
          created_at?: string
          reason: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_mutes_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_mutes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_mutes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_mutes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          closes_at: string
          created_at: string
          hold_until: string | null
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          opened_at: string
          plan_id: string | null
          status: Database["public"]["Enums"]["conversation_status"]
        }
        ComputedFields: never
        Insert: {
          closes_at: string
          created_at?: string
          hold_until?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          opened_at?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
        }
        Update: {
          closes_at?: string
          created_at?: string
          hold_until?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          opened_at?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plan_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          path: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          path: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_exports_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_exports_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_exports_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          icon: string
          label: string
          slug: string
          sort: number
        }
        ComputedFields: never
        Insert: {
          icon: string
          label: string
          slug: string
          sort?: number
        }
        Update: {
          icon?: string
          label?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          flagged: boolean
          id: string
          image_path: string | null
          image_status: Database["public"]["Enums"]["media_status"] | null
          sender_id: string | null
          status: Database["public"]["Enums"]["content_status"]
        }
        ComputedFields: never
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          flagged?: boolean
          id: string
          image_path?: string | null
          image_status?: Database["public"]["Enums"]["media_status"] | null
          sender_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          flagged?: boolean
          id?: string
          image_path?: string | null
          image_status?: Database["public"]["Enums"]["media_status"] | null
          sender_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          ai_labels: NonNullable<Json>
          ai_score: number | null
          ai_verdict: Database["public"]["Enums"]["verdict"] | null
          alerted_at: string | null
          assigned_at: string | null
          assigned_to: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          due_at: string
          id: string
          severity: Database["public"]["Enums"]["report_severity"]
          status: Database["public"]["Enums"]["queue_status"]
          subject: Database["public"]["Enums"]["queue_subject"]
          subject_id: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          ai_labels?: NonNullable<Json>
          ai_score?: number | null
          ai_verdict?: Database["public"]["Enums"]["verdict"] | null
          alerted_at?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          due_at: string
          id?: string
          severity?: Database["public"]["Enums"]["report_severity"]
          status?: Database["public"]["Enums"]["queue_status"]
          subject: Database["public"]["Enums"]["queue_subject"]
          subject_id: string
          user_id: string
        }
        Update: {
          ai_labels?: NonNullable<Json>
          ai_score?: number | null
          ai_verdict?: Database["public"]["Enums"]["verdict"] | null
          alerted_at?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          due_at?: string
          id?: string
          severity?: Database["public"]["Enums"]["report_severity"]
          status?: Database["public"]["Enums"]["queue_status"]
          subject?: Database["public"]["Enums"]["queue_subject"]
          subject_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          id: string
          kind: string
          plan_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          body: string
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          kind: string
          plan_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          kind?: string
          plan_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plan_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_members: {
        Row: {
          checked_in_at: string | null
          decided_at: string | null
          note: string | null
          plan_id: string
          requested_at: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          checked_in_at?: string | null
          decided_at?: string | null
          note?: string | null
          plan_id: string
          requested_at?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          decided_at?: string | null
          note?: string | null
          plan_id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_members_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plan_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          activity: string
          approved_count: number
          audience: Database["public"]["Enums"]["plan_audience"]
          cancel_reason: string | null
          cancelled_at: string | null
          capacity: number
          city_id: string
          college_id: string | null
          created_at: string
          description: string | null
          ends_at: string
          host_id: string | null
          id: string
          late_cancel: boolean
          price_paise: number | null
          rating_prompted_at: string | null
          requires_approval: boolean
          starts_at: string
          status: Database["public"]["Enums"]["plan_status"]
          title: string
          updated_at: string
          venue_id: string
        }
        ComputedFields: never
        Insert: {
          activity: string
          approved_count?: number
          audience?: Database["public"]["Enums"]["plan_audience"]
          cancel_reason?: string | null
          cancelled_at?: string | null
          capacity: number
          city_id: string
          college_id?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          host_id?: string | null
          id?: string
          late_cancel?: boolean
          price_paise?: number | null
          rating_prompted_at?: string | null
          requires_approval?: boolean
          starts_at: string
          status?: Database["public"]["Enums"]["plan_status"]
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          activity?: string
          approved_count?: number
          audience?: Database["public"]["Enums"]["plan_audience"]
          cancel_reason?: string | null
          cancelled_at?: string | null
          capacity?: number
          city_id?: string
          college_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          host_id?: string | null
          id?: string
          late_cancel?: boolean
          price_paise?: number | null
          rating_prompted_at?: string | null
          requires_approval?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_activity_fkey"
            columns: ["activity"]
            referencedRelation: "activities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "plans_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "admin_city_waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_college_id_fkey"
            columns: ["college_id"]
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_host_id_fkey"
            columns: ["host_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_host_id_fkey"
            columns: ["host_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_host_id_fkey"
            columns: ["host_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_venue_id_fkey"
            columns: ["venue_id"]
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          created_at: string
          id: string
          path: string | null
          position: number
          quarantine_path: string
          reject_reason: string | null
          sha256: string | null
          status: Database["public"]["Enums"]["media_status"]
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          path?: string | null
          position: number
          quarantine_path: string
          reject_reason?: string | null
          sha256?: string | null
          status?: Database["public"]["Enums"]["media_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string | null
          position?: number
          quarantine_path?: string
          reject_reason?: string | null
          sha256?: string | null
          status?: Database["public"]["Enums"]["media_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_stats: {
        Row: {
          late_cancel_count_30d: number
          plans_attended: number
          plans_hosted: number
          plans_no_show: number
          reports_received_30d: number
          unsafe_ratings_30d: number
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          late_cancel_count_30d?: number
          plans_attended?: number
          plans_hosted?: number
          plans_no_show?: number
          reports_received_30d?: number
          unsafe_ratings_30d?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          late_cancel_count_30d?: number
          plans_attended?: number
          plans_hosted?: number
          plans_no_show?: number
          reports_received_30d?: number
          unsafe_ratings_30d?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_stats_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_stats_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_stats_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area_cell: string
          area_name: string
          bio: string | null
          bio_status: Database["public"]["Enums"]["content_status"]
          birth_year: number | null
          city_id: string | null
          college_id: string | null
          created_at: string
          declared_gender: Database["public"]["Enums"]["gender"] | null
          deleted_at: string | null
          entitlement: Database["public"]["Enums"]["entitlement"]
          first_name: string
          id: string
          interests: string[]
          languages: string[]
          rules_accepted_at: string | null
          status: Database["public"]["Enums"]["profile_status"]
          status_reason: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_gender: Database["public"]["Enums"]["gender"] | null
        }
        ComputedFields: never
        Insert: {
          area_cell?: string
          area_name?: string
          bio?: string | null
          bio_status?: Database["public"]["Enums"]["content_status"]
          birth_year?: number | null
          city_id?: string | null
          college_id?: string | null
          created_at?: string
          declared_gender?: Database["public"]["Enums"]["gender"] | null
          deleted_at?: string | null
          entitlement?: Database["public"]["Enums"]["entitlement"]
          first_name?: string
          id: string
          interests?: string[]
          languages?: string[]
          rules_accepted_at?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          status_reason?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_gender?: Database["public"]["Enums"]["gender"] | null
        }
        Update: {
          area_cell?: string
          area_name?: string
          bio?: string | null
          bio_status?: Database["public"]["Enums"]["content_status"]
          birth_year?: number | null
          city_id?: string | null
          college_id?: string | null
          created_at?: string
          declared_gender?: Database["public"]["Enums"]["gender"] | null
          deleted_at?: string | null
          entitlement?: Database["public"]["Enums"]["entitlement"]
          first_name?: string
          id?: string
          interests?: string[]
          languages?: string[]
          rules_accepted_at?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          status_reason?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_gender?: Database["public"]["Enums"]["gender"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "admin_city_waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          last_seen_at?: string
          platform?: string
          token: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          felt_safe: boolean
          plan_id: string
          ratee_id: string
          rater_id: string
          showed_up: boolean
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          felt_safe: boolean
          plan_id: string
          ratee_id: string
          rater_id: string
          showed_up: boolean
        }
        Update: {
          created_at?: string
          felt_safe?: boolean
          plan_id?: string
          ratee_id?: string
          rater_id?: string
          showed_up?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ratings_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plan_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string
          id: string
          message_id: string | null
          plan_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          severity: Database["public"]["Enums"]["report_severity"]
          status: Database["public"]["Enums"]["report_status"]
          target_user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          details?: string
          id?: string
          message_id?: string | null
          plan_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          severity: Database["public"]["Enums"]["report_severity"]
          status?: Database["public"]["Enums"]["report_status"]
          target_user_id: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          message_id?: string | null
          plan_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          severity?: Database["public"]["Enums"]["report_severity"]
          status?: Database["public"]["Enums"]["report_status"]
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plan_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          count: number
          kind: string
          period_start: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          count?: number
          kind: string
          period_start: string
          user_id: string
        }
        Update: {
          count?: number
          kind?: string
          period_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_photos: {
        Row: {
          created_at: string
          id: string
          path: string
          position: number
          status: Database["public"]["Enums"]["media_status"]
          venue_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          path: string
          position?: number
          status?: Database["public"]["Enums"]["media_status"]
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          position?: number
          status?: Database["public"]["Enums"]["media_status"]
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address_line: string
          approved_at: string | null
          approved_by: string | null
          area_cell: string
          area_name: string
          capacity: number
          city_id: string
          created_at: string
          hours: NonNullable<Json>
          id: string
          lat: number
          late_events_allowed: boolean
          lng: number
          name: string
          partner: boolean
          status: Database["public"]["Enums"]["venue_status"]
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          address_line: string
          approved_at?: string | null
          approved_by?: string | null
          area_cell: string
          area_name: string
          capacity?: number
          city_id: string
          created_at?: string
          hours?: NonNullable<Json>
          id?: string
          lat: number
          late_events_allowed?: boolean
          lng: number
          name: string
          partner?: boolean
          status?: Database["public"]["Enums"]["venue_status"]
          updated_at?: string
        }
        Update: {
          address_line?: string
          approved_at?: string | null
          approved_by?: string | null
          area_cell?: string
          area_name?: string
          capacity?: number
          city_id?: string
          created_at?: string
          hours?: NonNullable<Json>
          id?: string
          lat?: number
          late_events_allowed?: boolean
          lng?: number
          name?: string
          partner?: boolean
          status?: Database["public"]["Enums"]["venue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "admin_city_waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_checks: {
        Row: {
          ai_score: number | null
          attempt: number
          created_at: string
          decided_at: string | null
          evidence: NonNullable<Json>
          id: string
          provider: string
          provider_ref: string
          reviewer_id: string | null
          type: Database["public"]["Enums"]["check_type"]
          user_id: string
          verdict: Database["public"]["Enums"]["verdict"]
        }
        ComputedFields: never
        Insert: {
          ai_score?: number | null
          attempt?: number
          created_at?: string
          decided_at?: string | null
          evidence?: NonNullable<Json>
          id?: string
          provider?: string
          provider_ref: string
          reviewer_id?: string | null
          type: Database["public"]["Enums"]["check_type"]
          user_id: string
          verdict: Database["public"]["Enums"]["verdict"]
        }
        Update: {
          ai_score?: number | null
          attempt?: number
          created_at?: string
          decided_at?: string | null
          evidence?: NonNullable<Json>
          id?: string
          provider?: string
          provider_ref?: string
          reviewer_id?: string | null
          type?: Database["public"]["Enums"]["check_type"]
          user_id?: string
          verdict?: Database["public"]["Enums"]["verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "verification_checks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_checks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_checks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          city_id: string
          created_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          city_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_signups_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "admin_city_waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_signups_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_city_waitlist: {
        Row: {
          id: string | null
          launch_date: string | null
          name: string | null
          slug: string | null
          status: Database["public"]["Enums"]["city_status"] | null
          waitlist_count: number | null
        }
        ComputedFields: never
        Insert: {
          id?: string | null
          launch_date?: string | null
          name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["city_status"] | null
          waitlist_count?: never
        }
        Update: {
          id?: string | null
          launch_date?: string | null
          name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["city_status"] | null
          waitlist_count?: never
        }
        Relationships: []
      }
      admin_user_summary: {
        Row: {
          city_id: string | null
          created_at: string | null
          declared_gender: Database["public"]["Enums"]["gender"] | null
          first_name: string | null
          id: string | null
          late_cancel_count_30d: number | null
          plans_attended: number | null
          plans_hosted: number | null
          plans_no_show: number | null
          reports_given: number | null
          reports_received: number | null
          status: Database["public"]["Enums"]["profile_status"] | null
          unsafe_ratings_30d: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_gender: Database["public"]["Enums"]["gender"] | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "admin_city_waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          age_band: string | null
          first_name: string | null
          interests: string[] | null
          is_verified: boolean | null
          low_priority: boolean | null
          note: string | null
          photo_path: string | null
          plan_id: string | null
          plans_attended: number | null
          requested_at: string | null
          show_up_rate: number | null
          status: Database["public"]["Enums"]["member_status"] | null
          user_id: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "plan_members_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plan_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      my_blocks: {
        Row: {
          blocked_id: string | null
          created_at: string | null
          first_name: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      my_verification: {
        Row: {
          attempt: number | null
          created_at: string | null
          decided_at: string | null
          id: string | null
          type: Database["public"]["Enums"]["check_type"] | null
          verdict: Database["public"]["Enums"]["verdict"] | null
        }
        ComputedFields: never
        Insert: {
          attempt?: number | null
          created_at?: string | null
          decided_at?: string | null
          id?: string | null
          type?: Database["public"]["Enums"]["check_type"] | null
          verdict?: Database["public"]["Enums"]["verdict"] | null
        }
        Update: {
          attempt?: number | null
          created_at?: string | null
          decided_at?: string | null
          id?: string | null
          type?: Database["public"]["Enums"]["check_type"] | null
          verdict?: Database["public"]["Enums"]["verdict"] | null
        }
        Relationships: []
      }
      plan_cards: {
        Row: {
          activity: string | null
          approved_count: number | null
          audience: Database["public"]["Enums"]["plan_audience"] | null
          cancel_reason: string | null
          capacity: number | null
          city_id: string | null
          conversation_id: string | null
          cover_path: string | null
          description: string | null
          ends_at: string | null
          host_age_band: string | null
          host_college: string | null
          host_first_name: string | null
          host_id: string | null
          host_late_cancels_30d: number | null
          host_photo_path: string | null
          host_plans_hosted: number | null
          host_verified: boolean | null
          id: string | null
          late_cancel: boolean | null
          member_names: string[] | null
          my_checked_in_at: string | null
          my_status: Database["public"]["Enums"]["member_status"] | null
          requires_approval: boolean | null
          starts_at: string | null
          status: Database["public"]["Enums"]["plan_status"] | null
          title: string | null
          venue_address: string | null
          venue_area_name: string | null
          venue_id: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
          venue_partner: boolean | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "plans_activity_fkey"
            columns: ["activity"]
            referencedRelation: "activities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "plans_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "admin_city_waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_city_id_fkey"
            columns: ["city_id"]
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_host_id_fkey"
            columns: ["host_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_host_id_fkey"
            columns: ["host_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_host_id_fkey"
            columns: ["host_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_venue_id_fkey"
            columns: ["venue_id"]
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_roster: {
        Row: {
          checked_in: boolean | null
          first_name: string | null
          is_host: boolean | null
          is_verified: boolean | null
          photo_path: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["member_status"] | null
          user_id: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "plan_members_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plan_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "admin_user_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          age_band: string | null
          area_name: string | null
          bio: string | null
          college_name: string | null
          first_name: string | null
          id: string | null
          interests: string[] | null
          is_verified: boolean | null
          languages: string[] | null
          photo_paths: string[] | null
          plans_attended: number | null
          plans_hosted: number | null
          show_up_rate: number | null
        }
        ComputedFields: never
        Relationships: []
      }
    }
    Functions: {
      accept_rules: { Args: { p_policy_version: string }; Returns: undefined }
      admin_cancel_plan: {
        Args: { p_plan_id: string; p_reason: string }
        Returns: undefined
      }
      admin_claim_item: { Args: { p_item_id: string }; Returns: undefined }
      admin_decide_appeal: {
        Args: { p_appeal_id: string; p_response: string; p_uphold: boolean }
        Returns: undefined
      }
      admin_decide_item: {
        Args: { p_decision: string; p_item_id: string; p_reason: string }
        Returns: undefined
      }
      admin_mute: {
        Args: { p_conversation_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_remove_member: {
        Args: { p_plan_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_remove_message: {
        Args: { p_message_id: string; p_reason: string }
        Returns: undefined
      }
      admin_save_venue: {
        Args: {
          p_address_line: string
          p_area_cell: string
          p_area_name: string
          p_capacity: number
          p_city_id: string
          p_hours: Json
          p_id: string
          p_lat: number
          p_late_events_allowed: boolean
          p_lng: number
          p_name: string
          p_partner: boolean
          p_reason: string
        }
        Returns: string
      }
      admin_set_city_status: {
        Args: {
          p_city_id: string
          p_reason: string
          p_status: Database["public"]["Enums"]["city_status"]
        }
        Returns: undefined
      }
      admin_set_gender: {
        Args: {
          p_gender: Database["public"]["Enums"]["gender"]
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_set_role: {
        Args: { p_reason: string; p_role: string; p_user_id: string }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: {
          p_reason: string
          p_status: Database["public"]["Enums"]["profile_status"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_set_venue_status: {
        Args: {
          p_reason: string
          p_status: Database["public"]["Enums"]["venue_status"]
          p_venue_id: string
        }
        Returns: undefined
      }
      block_user: { Args: { p_target_user_id: string }; Returns: undefined }
      cancel_plan: {
        Args: { p_plan_id: string; p_reason: string }
        Returns: boolean
      }
      complete_profile: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["profile_status"]
      }
      create_plan: {
        Args: {
          p_activity: string
          p_audience: Database["public"]["Enums"]["plan_audience"]
          p_capacity: number
          p_description: string
          p_ends_at: string
          p_requires_approval?: boolean
          p_starts_at: string
          p_title: string
          p_venue_id: string
        }
        Returns: string
      }
      custom_access_token: { Args: { event: Json }; Returns: Json }
      decide_join: {
        Args: { p_approve: boolean; p_plan_id: string; p_user_id: string }
        Returns: undefined
      }
      delete_message: { Args: { p_message_id: string }; Returns: undefined }
      delete_profile_photo: { Args: { p_photo_id: string }; Returns: string[] }
      leave_plan: { Args: { p_plan_id: string }; Returns: undefined }
      log_sos: { Args: { p_plan_id: string }; Returns: undefined }
      mark_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: undefined
      }
      my_caps: { Args: Record<PropertyKey, never>; Returns: Json }
      request_join: {
        Args: { p_note?: string; p_plan_id: string }
        Returns: Database["public"]["Enums"]["member_status"]
      }
      save_profile: {
        Args: {
          p_area_cell?: string
          p_area_name?: string
          p_bio?: string
          p_clear_college?: boolean
          p_college_id?: string
          p_declared_gender?: Database["public"]["Enums"]["gender"]
          p_first_name?: string
          p_interests?: string[]
          p_languages?: string[]
        }
        Returns: undefined
      }
      select_city: {
        Args: { p_city_id: string }
        Returns: Database["public"]["Enums"]["city_status"]
      }
      submit_appeal: {
        Args: {
          p_message: string
          p_subject: Database["public"]["Enums"]["appeal_subject"]
          p_subject_id: string
        }
        Returns: string
      }
      submit_rating: {
        Args: { p_plan_id: string; p_ratings: Json }
        Returns: number
      }
      submit_report: {
        Args: {
          p_details?: string
          p_message_id?: string
          p_plan_id?: string
          p_reason: Database["public"]["Enums"]["report_reason"]
          p_target_user_id: string
        }
        Returns: string
      }
      svc_apply_media: {
        Args: {
          p_faces: number
          p_id: string
          p_kind: string
          p_labels: Json
          p_media_path: string
          p_provider_error: boolean
          p_sha256: string
          p_top_confidence: number
        }
        Returns: Database["public"]["Enums"]["media_status"]
      }
      svc_check_in_context: {
        Args: { p_plan_id: string; p_user: string }
        Returns: Json
      }
      svc_drop_push_tokens: { Args: { p_tokens: string[] }; Returns: undefined }
      svc_export_user: { Args: { p_user: string }; Returns: Json }
      svc_kyc_apply: { Args: { p_result: Json }; Returns: Json }
      svc_kyc_prepare: { Args: { p_user: string }; Returns: Json }
      svc_kyc_register: {
        Args: { p_attempt: number; p_transaction_id: string; p_user: string }
        Returns: undefined
      }
      svc_mark_checked_in: {
        Args: { p_plan_id: string; p_user: string }
        Returns: string
      }
      svc_media_cached: { Args: { p_sha256: string }; Returns: boolean }
      svc_otp_locked_until: { Args: { p_phone_hmac: string }; Returns: string }
      svc_otp_record: {
        Args: { p_phone_hmac: string; p_success: boolean }
        Returns: Json
      }
      svc_push_tokens: {
        Args: { p_user_ids: string[] }
        Returns: {
          token: string
          user_id: string
        }[]
      }
      svc_rate_hit: {
        Args: {
          p_endpoint: string
          p_limit: number
          p_user: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      svc_record_export: {
        Args: { p_path: string; p_user: string }
        Returns: string
      }
      svc_register_upload: {
        Args: {
          p_conversation_id?: string
          p_kind: string
          p_message_id?: string
          p_position?: number
          p_quarantine_path: string
          p_user: string
        }
        Returns: string
      }
      svc_request_deletion: { Args: { p_user: string }; Returns: string }
      svc_vendor_usage: {
        Args: { p_units?: number; p_vendor: string }
        Returns: number
      }
      svc_webhook_seen: {
        Args: { p_event_id: string; p_provider: string }
        Returns: undefined
      }
      update_plan_text: {
        Args: { p_description: string; p_plan_id: string; p_title: string }
        Returns: undefined
      }
    }
    Enums: {
      appeal_status: "open" | "upheld" | "denied"
      appeal_subject: "verification" | "suspension" | "content" | "ban"
      check_type: "id_age" | "liveness_face" | "gender"
      city_status: "waitlist" | "beta" | "live"
      consent_purpose:
        | "location"
        | "camera"
        | "notifications"
        | "community_rules"
        | "terms_privacy"
      content_status: "visible" | "held" | "rejected"
      conversation_kind: "plan" | "pair"
      conversation_status: "open" | "closed"
      entitlement: "free" | "plus" | "premium"
      gender: "woman" | "man" | "other"
      media_status: "pending" | "approved" | "rejected"
      member_status:
        | "requested"
        | "approved"
        | "declined"
        | "withdrawn"
        | "left"
        | "removed"
        | "expired"
        | "attended"
        | "no_show"
      notification_category: "plan" | "approval" | "safety" | "account"
      plan_audience: "everyone" | "women_only" | "same_college"
      plan_status: "open" | "full" | "started" | "completed" | "cancelled"
      profile_status:
        | "onboarding"
        | "active"
        | "suspended"
        | "banned"
        | "deleted"
      queue_status:
        | "pending"
        | "in_review"
        | "approved"
        | "rejected"
        | "escalated"
      queue_subject:
        | "photo"
        | "text"
        | "verification"
        | "report"
        | "rating_review"
        | "venue"
        | "appeal"
      report_reason:
        | "harassment"
        | "sexual_content"
        | "threat_or_violence"
        | "fake_profile"
        | "underage"
        | "spam_or_scam"
        | "no_show"
        | "unsafe_at_plan"
        | "other"
      report_severity: "severe" | "standard"
      report_status: "open" | "actioned" | "dismissed"
      venue_status: "draft" | "approved" | "archived"
      verdict: "pass" | "fail" | "review" | "minor"
      verification_status:
        | "unverified"
        | "pending"
        | "manual_review"
        | "verified"
        | "rejected"
        | "blocked_minor"
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
      appeal_status: ["open", "upheld", "denied"],
      appeal_subject: ["verification", "suspension", "content", "ban"],
      check_type: ["id_age", "liveness_face", "gender"],
      city_status: ["waitlist", "beta", "live"],
      consent_purpose: [
        "location",
        "camera",
        "notifications",
        "community_rules",
        "terms_privacy",
      ],
      content_status: ["visible", "held", "rejected"],
      conversation_kind: ["plan", "pair"],
      conversation_status: ["open", "closed"],
      entitlement: ["free", "plus", "premium"],
      gender: ["woman", "man", "other"],
      media_status: ["pending", "approved", "rejected"],
      member_status: [
        "requested",
        "approved",
        "declined",
        "withdrawn",
        "left",
        "removed",
        "expired",
        "attended",
        "no_show",
      ],
      notification_category: ["plan", "approval", "safety", "account"],
      plan_audience: ["everyone", "women_only", "same_college"],
      plan_status: ["open", "full", "started", "completed", "cancelled"],
      profile_status: [
        "onboarding",
        "active",
        "suspended",
        "banned",
        "deleted",
      ],
      queue_status: [
        "pending",
        "in_review",
        "approved",
        "rejected",
        "escalated",
      ],
      queue_subject: [
        "photo",
        "text",
        "verification",
        "report",
        "rating_review",
        "venue",
        "appeal",
      ],
      report_reason: [
        "harassment",
        "sexual_content",
        "threat_or_violence",
        "fake_profile",
        "underage",
        "spam_or_scam",
        "no_show",
        "unsafe_at_plan",
        "other",
      ],
      report_severity: ["severe", "standard"],
      report_status: ["open", "actioned", "dismissed"],
      venue_status: ["draft", "approved", "archived"],
      verdict: ["pass", "fail", "review", "minor"],
      verification_status: [
        "unverified",
        "pending",
        "manual_review",
        "verified",
        "rejected",
        "blocked_minor",
      ],
    },
  },
} as const
