export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          sort_order?: number;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          content?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          content?: string | null;
          image_url?: string | null;
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

export type CategoryWithFetishes = Category & {
  fetishes: Fetish[];
};
