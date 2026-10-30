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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          body_html: string
          category_id: string | null
          cover_alt: string
          cover_credit: string
          cover_path: string
          created_at: string
          created_by: string
          editor_note: string
          id: string
          is_breaking: boolean
          is_featured: boolean
          lang: string
          location: string
          pending_edits: Json | null
          publish_at: string | null
          published_at: string | null
          published_slug: string | null
          reporter_name: string
          seo_description: string
          seo_title: string
          slug: string
          status: string
          summary: string
          tags: string[]
          title: string
          updated_at: string
          youtube_id: string
        }
        Insert: {
          body_html?: string
          category_id?: string | null
          cover_alt?: string
          cover_credit?: string
          cover_path?: string
          created_at?: string
          created_by: string
          editor_note?: string
          id?: string
          is_breaking?: boolean
          is_featured?: boolean
          lang?: string
          location?: string
          pending_edits?: Json | null
          publish_at?: string | null
          published_at?: string | null
          published_slug?: string | null
          reporter_name?: string
          seo_description?: string
          seo_title?: string
          slug: string
          status?: string
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          youtube_id?: string
        }
        Update: {
          body_html?: string
          category_id?: string | null
          cover_alt?: string
          cover_credit?: string
          cover_path?: string
          created_at?: string
          created_by?: string
          editor_note?: string
          id?: string
          is_breaking?: boolean
          is_featured?: boolean
          lang?: string
          location?: string
          pending_edits?: Json | null
          publish_at?: string | null
          published_at?: string | null
          published_slug?: string | null
          reporter_name?: string
          seo_description?: string
          seo_title?: string
          slug?: string
          status?: string
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string
          id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          colour: string
          icon: string
          id: string
          names: Json
          sort_order: number
        }
        Insert: {
          active?: boolean
          colour?: string
          icon?: string
          id: string
          names: Json
          sort_order?: number
        }
        Update: {
          active?: boolean
          colour?: string
          icon?: string
          id?: string
          names?: Json
          sort_order?: number
        }
        Relationships: []
      }
      content_sources: {
        Row: {
          accessed_at: string | null
          content_id: string
          content_type: string
          data_year: string
          id: string
          note: string
          page_ref: string
          sort_order: number
          source_id: string | null
          source_type: string
          title: string
          url: string
        }
        Insert: {
          accessed_at?: string | null
          content_id: string
          content_type: string
          data_year?: string
          id?: string
          note?: string
          page_ref?: string
          sort_order?: number
          source_id?: string | null
          source_type?: string
          title?: string
          url?: string
        }
        Update: {
          accessed_at?: string | null
          content_id?: string
          content_type?: string
          data_year?: string
          id?: string
          note?: string
          page_ref?: string
          sort_order?: number
          source_id?: string | null
          source_type?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_cards: {
        Row: {
          chart_data: Json
          chart_type: string
          comparison_year: number | null
          created_at: string
          created_by: string | null
          data_year: number | null
          geography: string
          id: string
          name_en: string
          name_te: string
          notes: string
          source_id: string | null
          status: string
          unit: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          chart_data?: Json
          chart_type?: string
          comparison_year?: number | null
          created_at?: string
          created_by?: string | null
          data_year?: number | null
          geography?: string
          id?: string
          name_en?: string
          name_te?: string
          notes?: string
          source_id?: string | null
          status?: string
          unit?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          chart_data?: Json
          chart_type?: string
          comparison_year?: number | null
          created_at?: string
          created_by?: string | null
          data_year?: number | null
          geography?: string
          id?: string
          name_en?: string
          name_te?: string
          notes?: string
          source_id?: string | null
          status?: string
          unit?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_cards_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt: string
          credit: string
          height: number
          id: string
          original_name: string
          path: string
          size: number
          thumb_path: string
          uploaded_at: string
          uploaded_by: string
          width: number
        }
        Insert: {
          alt?: string
          credit?: string
          height?: number
          id?: string
          original_name?: string
          path: string
          size?: number
          thumb_path?: string
          uploaded_at?: string
          uploaded_by: string
          width?: number
        }
        Update: {
          alt?: string
          credit?: string
          height?: number
          id?: string
          original_name?: string
          path?: string
          size?: number
          thumb_path?: string
          uploaded_at?: string
          uploaded_by?: string
          width?: number
        }
        Relationships: []
      }
      pages: {
        Row: {
          body_html: string
          id: string
          title: string
        }
        Insert: {
          body_html?: string
          id: string
          title: string
        }
        Update: {
          body_html?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      planner_comments: {
        Row: {
          author: string | null
          body: string
          created_at: string
          id: string
          item_id: string
        }
        Insert: {
          author?: string | null
          body: string
          created_at?: string
          id?: string
          item_id: string
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "planner_items"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_items: {
        Row: {
          category_id: string | null
          checklist: Json
          core_question: string
          created_at: string
          created_by: string | null
          data_to_collect: string
          due_date: string | null
          id: string
          owner: string | null
          planned_date: string | null
          post_id: string | null
          query_id: string | null
          region: string
          script_html: string
          sort_order: number
          stage: string
          suggested_sources: string
          title_en: string
          title_te: string
          updated_at: string
          video_id: string | null
          viewer_ask: string
        }
        Insert: {
          category_id?: string | null
          checklist?: Json
          core_question?: string
          created_at?: string
          created_by?: string | null
          data_to_collect?: string
          due_date?: string | null
          id?: string
          owner?: string | null
          planned_date?: string | null
          post_id?: string | null
          query_id?: string | null
          region?: string
          script_html?: string
          sort_order?: number
          stage?: string
          suggested_sources?: string
          title_en?: string
          title_te?: string
          updated_at?: string
          video_id?: string | null
          viewer_ask?: string
        }
        Update: {
          category_id?: string | null
          checklist?: Json
          core_question?: string
          created_at?: string
          created_by?: string | null
          data_to_collect?: string
          due_date?: string | null
          id?: string
          owner?: string | null
          planned_date?: string | null
          post_id?: string | null
          query_id?: string | null
          region?: string
          script_html?: string
          sort_order?: number
          stage?: string
          suggested_sources?: string
          title_en?: string
          title_te?: string
          updated_at?: string
          video_id?: string | null
          viewer_ask?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_items_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          cover_youtube_id: string
          body_en: string
          body_te: string
          category_id: string | null
          cover_alt: string
          cover_credit: string
          cover_path: string
          created_at: string
          created_by: string | null
          id: string
          post_type: string
          publish_at: string | null
          published_at: string | null
          region: string
          seo_description: string
          seo_title: string
          slug: string
          status: string
          tags: string[]
          title_en: string
          title_te: string
          updated_at: string
        }
        Insert: {
          cover_youtube_id?: string
          body_en?: string
          body_te?: string
          category_id?: string | null
          cover_alt?: string
          cover_credit?: string
          cover_path?: string
          created_at?: string
          created_by?: string | null
          id?: string
          post_type?: string
          publish_at?: string | null
          published_at?: string | null
          region?: string
          seo_description?: string
          seo_title?: string
          slug: string
          status?: string
          tags?: string[]
          title_en?: string
          title_te?: string
          updated_at?: string
        }
        Update: {
          cover_youtube_id?: string
          body_en?: string
          body_te?: string
          category_id?: string | null
          cover_alt?: string
          cover_credit?: string
          cover_path?: string
          created_at?: string
          created_by?: string | null
          id?: string
          post_type?: string
          publish_at?: string | null
          published_at?: string | null
          region?: string
          seo_description?: string
          seo_title?: string
          slug?: string
          status?: string
          tags?: string[]
          title_en?: string
          title_te?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          name?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      queries: {
        Row: {
          assignee: string | null
          body: string
          category_id: string | null
          consent_public: boolean
          consent_truth: boolean
          consent_use: boolean
          created_at: string
          district: string
          followup_summary: string
          id: string
          is_blocked: boolean
          lat: number | null
          lng: number | null
          location_text: string
          mandal: string
          merged_into: string | null
          people_affected: string
          priority: string
          published_followup: boolean
          ref_no: string
          secret_hash: string
          started_at: string
          status: string
          submitter_name: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          body?: string
          category_id?: string | null
          consent_public?: boolean
          consent_truth?: boolean
          consent_use?: boolean
          created_at?: string
          district?: string
          followup_summary?: string
          id?: string
          is_blocked?: boolean
          lat?: number | null
          lng?: number | null
          location_text?: string
          mandal?: string
          merged_into?: string | null
          people_affected?: string
          priority?: string
          published_followup?: boolean
          ref_no: string
          secret_hash: string
          started_at?: string
          status?: string
          submitter_name?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          body?: string
          category_id?: string | null
          consent_public?: boolean
          consent_truth?: boolean
          consent_use?: boolean
          created_at?: string
          district?: string
          followup_summary?: string
          id?: string
          is_blocked?: boolean
          lat?: number | null
          lng?: number | null
          location_text?: string
          mandal?: string
          merged_into?: string | null
          people_affected?: string
          priority?: string
          published_followup?: boolean
          ref_no?: string
          secret_hash?: string
          started_at?: string
          status?: string
          submitter_name?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      query_contacts: {
        Row: {
          email: string
          name: string
          phone: string
          query_id: string
        }
        Insert: {
          email?: string
          name?: string
          phone?: string
          query_id: string
        }
        Update: {
          email?: string
          name?: string
          phone?: string
          query_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_contacts_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: true
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      query_events: {
        Row: {
          actor: string | null
          created_at: string
          detail: Json
          event: string
          id: string
          query_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          detail?: Json
          event: string
          id?: string
          query_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          query_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_events_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      query_files: {
        Row: {
          content_type: string
          id: string
          kind: string
          path: string
          query_id: string
          size: number
          uploaded_at: string
        }
        Insert: {
          content_type?: string
          id?: string
          kind?: string
          path: string
          query_id: string
          size?: number
          uploaded_at?: string
        }
        Update: {
          content_type?: string
          id?: string
          kind?: string
          path?: string
          query_id?: string
          size?: number
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_files_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      query_notes: {
        Row: {
          author: string | null
          body: string
          created_at: string
          id: string
          query_id: string
        }
        Insert: {
          author?: string | null
          body: string
          created_at?: string
          id?: string
          query_id: string
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string
          id?: string
          query_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_notes_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          lang: string
          new_slug: string
          old_slug: string
        }
        Insert: {
          lang: string
          new_slug: string
          old_slug: string
        }
        Update: {
          lang?: string
          new_slug?: string
          old_slug?: string
        }
        Relationships: []
      }
      removed_stories: {
        Row: {
          lang: string
          slug: string
        }
        Insert: {
          lang: string
          slug: string
        }
        Update: {
          lang?: string
          slug?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          youtube_channel_id: string
          address: string
          email: string
          facebook: string
          hindi_enabled: boolean
          id: number
          instagram: string
          maintenance_mode: boolean
          phone: string
          privacy_contact: string
          site_name: string
          site_url: string
          taglines: Json
          ticker_count: number
          whatsapp: string
          x: string
          youtube: string
        }
        Insert: {
          youtube_channel_id?: string
          address?: string
          email?: string
          facebook?: string
          hindi_enabled?: boolean
          id?: number
          instagram?: string
          maintenance_mode?: boolean
          phone?: string
          privacy_contact?: string
          site_name?: string
          site_url?: string
          taglines?: Json
          ticker_count?: number
          whatsapp?: string
          x?: string
          youtube?: string
        }
        Update: {
          youtube_channel_id?: string
          address?: string
          email?: string
          facebook?: string
          hindi_enabled?: boolean
          id?: number
          instagram?: string
          maintenance_mode?: boolean
          phone?: string
          privacy_contact?: string
          site_name?: string
          site_url?: string
          taglines?: Json
          ticker_count?: number
          whatsapp?: string
          x?: string
          youtube?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          organisation: string
          ref: string
          reliability_note: string
          source_type: string
          usage_tips: string
          website: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          organisation?: string
          ref?: string
          reliability_note?: string
          source_type?: string
          usage_tips?: string
          website?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          organisation?: string
          ref?: string
          reliability_note?: string
          source_type?: string
          usage_tips?: string
          website?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          planner_item_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          planner_item_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          planner_item_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_planner_item_id_fkey"
            columns: ["planner_item_id"]
            isOneToOne: false
            referencedRelation: "planner_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          duration_seconds: number | null
          is_short: boolean
          yt_channel: string
          yt_checked_at: string | null
          yt_published_at: string | null
          yt_status: string
          category_id: string | null
          created_at: string
          created_by: string | null
          description_en: string
          description_te: string
          id: string
          is_featured: boolean
          language: string
          publish_at: string | null
          published_at: string | null
          region: string
          seo_description: string
          seo_title: string
          series: string
          show_in_ticker: boolean
          slug: string
          social_links: Json
          status: string
          tags: string[]
          title_en: string
          title_te: string
          updated_at: string
          youtube_id: string
        }
        Insert: {
          duration_seconds?: number | null
          is_short?: boolean
          yt_channel?: string
          yt_checked_at?: string | null
          yt_published_at?: string | null
          yt_status?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_en?: string
          description_te?: string
          id?: string
          is_featured?: boolean
          language?: string
          publish_at?: string | null
          published_at?: string | null
          region?: string
          seo_description?: string
          seo_title?: string
          series?: string
          show_in_ticker?: boolean
          slug: string
          social_links?: Json
          status?: string
          tags?: string[]
          title_en?: string
          title_te?: string
          updated_at?: string
          youtube_id?: string
        }
        Update: {
          duration_seconds?: number | null
          is_short?: boolean
          yt_channel?: string
          yt_checked_at?: string | null
          yt_published_at?: string | null
          yt_status?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_en?: string
          description_te?: string
          id?: string
          is_featured?: boolean
          language?: string
          publish_at?: string | null
          published_at?: string | null
          region?: string
          seo_description?: string
          seo_title?: string
          series?: string
          show_in_ticker?: boolean
          slug?: string
          social_links?: Json
          status?: string
          tags?: string[]
          title_en?: string
          title_te?: string
          updated_at?: string
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_moderate: { Args: { _user_id?: string }; Returns: boolean }
      can_publish: { Args: { _user_id?: string }; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_news_editor: { Args: never; Returns: boolean }
      is_newsroom_member: { Args: { _user_id?: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _detail?: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "editor"
        | "reporter"
        | "editor_in_chief"
        | "research_analyst"
        | "scriptwriter"
        | "video_editor"
        | "moderator"
        | "social_media_manager"
        | "web_admin"
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
      app_role: [
        "admin",
        "editor",
        "reporter",
        "editor_in_chief",
        "research_analyst",
        "scriptwriter",
        "video_editor",
        "moderator",
        "social_media_manager",
        "web_admin",
      ],
    },
  },
} as const
