export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface SeoFetishContent {
  intro: string;
  sections: Array<{ title: string; body: string }>;
  faqs: Array<{ q: string; a: string }>;
  internal_links_hint?: string[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_premium: boolean;
          premium_since: string | null;
          is_admin: boolean;
          current_room_id: string | null;
          last_room_created_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_premium?: boolean;
          premium_since?: string | null;
          is_admin?: boolean;
          current_room_id?: string | null;
          last_room_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_premium?: boolean;
          premium_since?: string | null;
          is_admin?: boolean;
          current_room_id?: string | null;
          last_room_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_current_room_fk";
            columns: ["current_room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          emoji: string | null;
          description: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          emoji?: string | null;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          emoji?: string | null;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      fetishes: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          description: string | null;
          sort_order: number;
          used_in_tiktok_at: string | null;
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string[] | null;
          seo_content: SeoFetishContent | null;
          seo_generated_at: string | null;
          seo_llm_provider: string | null;
          seo_llm_model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          description?: string | null;
          sort_order?: number;
          used_in_tiktok_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[] | null;
          seo_content?: SeoFetishContent | null;
          seo_generated_at?: string | null;
          seo_llm_provider?: string | null;
          seo_llm_model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          sort_order?: number;
          used_in_tiktok_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[] | null;
          seo_content?: SeoFetishContent | null;
          seo_generated_at?: string | null;
          seo_llm_provider?: string | null;
          seo_llm_model?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fetishes_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_rooms: {
        Row: {
          id: string;
          owner_id: string;
          fetish_id: string | null;
          name: string;
          description: string | null;
          unlock_message: string;
          is_premium_only: boolean;
          is_featured: boolean;
          active_users_count: number;
          last_activity_at: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          fetish_id?: string | null;
          name: string;
          description?: string | null;
          unlock_message?: string;
          is_premium_only?: boolean;
          is_featured?: boolean;
          active_users_count?: number;
          last_activity_at?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          fetish_id?: string | null;
          name?: string;
          description?: string | null;
          unlock_message?: string;
          is_premium_only?: boolean;
          is_featured?: boolean;
          active_users_count?: number;
          last_activity_at?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_rooms_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_rooms_fetish_id_fkey";
            columns: ["fetish_id"];
            isOneToOne: false;
            referencedRelation: "fetishes";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          content: string | null;
          image_url: string | null;
          image_path: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          content?: string | null;
          image_url?: string | null;
          image_path?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          content?: string | null;
          image_url?: string | null;
          image_path?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_participants: {
        Row: {
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          room_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      dm_threads: {
        Row: {
          id: string;
          user_a_id: string | null;
          user_b_id: string | null;
          created_at: string;
          last_message_at: string | null;
        };
        Insert: {
          id?: string;
          user_a_id?: string | null;
          user_b_id?: string | null;
          created_at?: string;
          last_message_at?: string | null;
        };
        Update: {
          id?: string;
          user_a_id?: string | null;
          user_b_id?: string | null;
          created_at?: string;
          last_message_at?: string | null;
        };
        Relationships: [];
      };
      dm_thread_participants: {
        Row: {
          thread_id: string;
          user_id: string;
          added_by: string | null;
          added_at: string;
          left_at: string | null;
        };
        Insert: {
          thread_id: string;
          user_id: string;
          added_by?: string | null;
          added_at?: string;
          left_at?: string | null;
        };
        Update: {
          thread_id?: string;
          user_id?: string;
          added_by?: string | null;
          added_at?: string;
          left_at?: string | null;
        };
        Relationships: [];
      };
      dm_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          content: string | null;
          created_at: string;
          read_at: string | null;
          image_path: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          content?: string | null;
          created_at?: string;
          read_at?: string | null;
          image_path?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          content?: string | null;
          created_at?: string;
          read_at?: string | null;
          image_path?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      user_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          room_id: string | null;
          reason: string;
          resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          room_id?: string | null;
          reason: string;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_id?: string;
          room_id?: string | null;
          reason?: string;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      featured_fetish_cards: {
        Row: {
          id: string;
          title: string;
          description: string;
          image_url: string;
          fetish_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          image_url: string;
          fetish_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          image_url?: string;
          fetish_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string;
          author_id: string;
          fetish_id: string | null;
          title: string;
          content: string;
          image_paths: string[];
          status: "pending" | "approved" | "rejected";
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          like_count: number;
          comment_count: number;
          is_pinned: boolean;
          last_activity_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          fetish_id?: string | null;
          title: string;
          content: string;
          image_paths?: string[];
          status?: "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          like_count?: number;
          comment_count?: number;
          is_pinned?: boolean;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Insert"]>;
        Relationships: [];
      };
      blog_post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["blog_post_comments"]["Insert"]>;
        Relationships: [];
      };
      blog_post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blog_post_likes"]["Insert"]>;
        Relationships: [];
      };
      blog_post_reports: {
        Row: {
          id: string;
          reporter_id: string;
          post_id: string | null;
          comment_id: string | null;
          reason: string;
          resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          reason: string;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blog_post_reports"]["Insert"]>;
        Relationships: [];
      };
      tiktok_scripts: {
        Row: {
          id: string;
          fetiche_id: string | null;
          titulo: string;
          hook: string;
          corpo: string;
          cta: string;
          hashtags: string[];
          broll_tags: string[];
          voz: string;
          llm_provider: string | null;
          llm_model: string | null;
          audio_path: string | null;
          srt_path: string | null;
          broll_paths: string[] | null;
          video_path: string | null;
          status:
            | "pending_approval"
            | "approved"
            | "rejected"
            | "processing"
            | "audio_done"
            | "broll_done"
            | "srt_done"
            | "ready_to_post"
            | "posted_inbox"
            | "posted"
            | "failed";
          rejection_reason: string | null;
          failure_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          tiktok_publish_id: string | null;
          tiktok_video_id: string | null;
          tiktok_share_url: string | null;
          posted_at: string | null;
          video_config: Record<string, unknown> | null;
          progress_message: string | null;
          progress_started_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fetiche_id?: string | null;
          titulo: string;
          hook: string;
          corpo: string;
          cta: string;
          hashtags?: string[];
          broll_tags?: string[];
          voz?: string;
          llm_provider?: string | null;
          llm_model?: string | null;
          audio_path?: string | null;
          srt_path?: string | null;
          broll_paths?: string[] | null;
          video_path?: string | null;
          status?:
            | "pending_approval"
            | "approved"
            | "rejected"
            | "processing"
            | "audio_done"
            | "broll_done"
            | "srt_done"
            | "ready_to_post"
            | "posted_inbox"
            | "posted"
            | "failed";
          rejection_reason?: string | null;
          failure_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          tiktok_publish_id?: string | null;
          tiktok_video_id?: string | null;
          tiktok_share_url?: string | null;
          posted_at?: string | null;
          video_config?: Record<string, unknown> | null;
          progress_message?: string | null;
          progress_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tiktok_scripts"]["Insert"]>;
        Relationships: [];
      };
      tiktok_metrics: {
        Row: {
          id: string;
          script_id: string;
          views: number;
          likes: number;
          comments: number;
          shares: number;
          watch_time_avg: number;
          fyp_views_pct: number;
          collected_at: string;
        };
        Insert: {
          id?: string;
          script_id: string;
          views?: number;
          likes?: number;
          comments?: number;
          shares?: number;
          watch_time_avg?: number;
          fyp_views_pct?: number;
          collected_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tiktok_metrics"]["Insert"]>;
        Relationships: [];
      };
      tiktok_settings: {
        Row: {
          id: boolean;
          font_name: string;
          font_size: number;
          font_bold: boolean;
          font_color: string;
          outline_color: string;
          outline_width: number;
          shadow: number;
          alignment: number;
          margin_v: number;
          margin_l: number;
          margin_r: number;
          uppercase: boolean;
          words_per_chunk: number;
          default_voz: string;
          default_voz_rate: string;
          default_llm: string;
          default_llm_model: string;
          video_width: number;
          video_height: number;
          video_fps: number;
          video_crf: number;
          cron_enabled: boolean;
          cron_hours: number[];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["tiktok_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["tiktok_settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_premium: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_room_owner: { Args: { p_room_id: string }; Returns: boolean };
      join_room: { Args: { p_room_id: string }; Returns: undefined };
      leave_current_room: { Args: Record<PropertyKey, never>; Returns: undefined };
      soft_delete_room: { Args: { p_room_id: string }; Returns: undefined };
      open_dm_thread: { Args: { p_other_user_id: string }; Returns: string };
      add_dm_participant: {
        Args: { p_thread_id: string; p_user_id: string };
        Returns: undefined;
      };
      report_user: {
        Args: { p_reported_id: string; p_reason: string; p_room_id?: string | null };
        Returns: string;
      };
      create_blog_post: {
        Args: {
          p_title: string;
          p_content: string;
          p_fetish_id: string | null;
          p_image_paths: string[];
        };
        Returns: string;
      };
      toggle_blog_post_like: { Args: { p_post_id: string }; Returns: boolean };
      add_blog_comment: { Args: { p_post_id: string; p_content: string }; Returns: string };
      soft_delete_my_blog_post: { Args: { p_post_id: string }; Returns: undefined };
      approve_blog_post: { Args: { p_post_id: string }; Returns: undefined };
      reject_blog_post: { Args: { p_post_id: string; p_reason: string }; Returns: undefined };
      delete_blog_comment: { Args: { p_comment_id: string }; Returns: undefined };
      pin_blog_post: { Args: { p_post_id: string; p_pin: boolean }; Returns: undefined };
      report_blog: {
        Args: {
          p_post_id: string | null;
          p_comment_id: string | null;
          p_reason: string;
        };
        Returns: string;
      };
      global_online_users: { Args: Record<PropertyKey, never>; Returns: number };
      global_active_rooms: { Args: Record<PropertyKey, never>; Returns: number };
      blog_posts_today: { Args: Record<PropertyKey, never>; Returns: number };
      approve_tiktok_script: { Args: { p_script_id: string }; Returns: undefined };
      reject_tiktok_script: {
        Args: { p_script_id: string; p_reason: string };
        Returns: undefined;
      };
      retry_tiktok_script: { Args: { p_script_id: string }; Returns: undefined };
      delete_tiktok_script: { Args: { p_script_id: string }; Returns: undefined };
      update_tiktok_script: {
        Args: {
          p_script_id: string;
          p_titulo: string;
          p_hook: string;
          p_corpo: string;
          p_cta: string;
          p_hashtags: string[];
          p_broll_tags: string[];
          p_voz: string;
          p_video_config?: Record<string, unknown> | null;
        };
        Returns: undefined;
      };
      update_tiktok_settings: {
        Args: { p_data: Record<string, unknown> };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Tables<"profiles">;
export type Category = Tables<"categories">;
export type Fetish = Tables<"fetishes">;
export type ChatRoom = Tables<"chat_rooms">;
export type Message = Tables<"messages">;
export type RoomParticipant = Tables<"room_participants">;

export type ChatRoomWithRelations = ChatRoom & {
  owner: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
  fetish: (Pick<Fetish, "id" | "name" | "slug"> & {
    category: Pick<Category, "id" | "name" | "slug" | "emoji"> | null;
  }) | null;
};

export type BlogPost = Tables<"blog_posts">;
export type BlogPostComment = Tables<"blog_post_comments">;
export type BlogPostLike = Tables<"blog_post_likes">;

export type BlogPostWithAuthor = BlogPost & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "is_premium"> | null;
  fetish: (Pick<Fetish, "id" | "name" | "slug"> & {
    category: Pick<Category, "id" | "name" | "slug" | "emoji"> | null;
  }) | null;
};

export type CategoryWithFetishes = Category & {
  fetishes: Fetish[];
};

export type TiktokScript = Tables<"tiktok_scripts">;
export type TiktokMetric = Tables<"tiktok_metrics">;
export type TiktokSettings = Tables<"tiktok_settings">;
