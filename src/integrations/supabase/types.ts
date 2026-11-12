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
      couple_daily_challenge_progress: {
        Row: {
          challenge_date: string
          challenge_id: string
          completed_at: string
          couple_id: string
          user_id: string
        }
        Insert: {
          challenge_date: string
          challenge_id: string
          completed_at?: string
          couple_id: string
          user_id: string
        }
        Update: {
          challenge_date?: string
          challenge_id?: string
          completed_at?: string
          couple_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_daily_challenge_progress_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_game_choices: {
        Row: {
          answered_at: string
          choice: string
          couple_id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          choice: string
          couple_id: string
          question_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          choice?: string
          couple_id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_game_choices_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_game_matches: {
        Row: {
          board: Json
          couple_id: string
          created_at: string
          current_turn: string
          finished_at: string | null
          game_key: string
          id: string
          is_draw: boolean
          player_one_id: string
          player_two_id: string
          status: string
          turn_number: number
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          board: Json
          couple_id: string
          created_at?: string
          current_turn: string
          finished_at?: string | null
          game_key: string
          id?: string
          is_draw?: boolean
          player_one_id: string
          player_two_id: string
          status?: string
          turn_number?: number
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          board?: Json
          couple_id?: string
          created_at?: string
          current_turn?: string
          finished_at?: string | null
          game_key?: string
          id?: string
          is_draw?: boolean
          player_one_id?: string
          player_two_id?: string
          status?: string
          turn_number?: number
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couple_game_matches_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          couple_id: string
          created_at: string
          expires_at: string
          id: string
          inviter_user_id: string
          revoked_at: string | null
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          couple_id: string
          created_at?: string
          expires_at: string
          id?: string
          inviter_user_id: string
          revoked_at?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          couple_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          inviter_user_id?: string
          revoked_at?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_invitations_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_members: {
        Row: {
          couple_id: string
          ended_at: string | null
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          couple_id: string
          ended_at?: string | null
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          couple_id?: string
          ended_at?: string | null
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_members_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_memories: {
        Row: {
          body: string
          couple_id: string | null
          created_at: string
          id: string
          memory_date: string
          owner_id: string
          title: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          body: string
          couple_id?: string | null
          created_at?: string
          id?: string
          memory_date?: string
          owner_id: string
          title?: string | null
          updated_at?: string
          visibility: string
        }
        Update: {
          body?: string
          couple_id?: string | null
          created_at?: string
          id?: string
          memory_date?: string
          owner_id?: string
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_path: string | null
          body: string
          couple_id: string
          created_at: string
          id: string
          message_type: string
          metadata: Json
          sender_id: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          body: string
          couple_id: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          sender_id: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string
          couple_id?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_messages_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_plan_events: {
        Row: {
          all_day: boolean
          couple_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          owner_id: string
          place: string | null
          start_time: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          all_day?: boolean
          couple_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          owner_id: string
          place?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          all_day?: boolean
          couple_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          owner_id?: string
          place?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_plan_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_posts: {
        Row: {
          author_id: string
          body: string
          couple_id: string
          created_at: string
          id: string
          media_mime: string | null
          media_name: string | null
          media_path: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          couple_id: string
          created_at?: string
          id?: string
          media_mime?: string | null
          media_name?: string | null
          media_path?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          couple_id?: string
          created_at?: string
          id?: string
          media_mime?: string | null
          media_name?: string | null
          media_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_posts_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          created_at: string
          created_by: string
          id: string
          relationship_started_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          relationship_started_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          relationship_started_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_couple_invitation: { Args: { p_token: string }; Returns: string }
      can_view_couple: { Args: { p_couple_id: string }; Returns: boolean }
      create_connect_four_match: {
        Args: { p_couple_id: string }
        Returns: string
      }
      create_couple: {
        Args: { p_relationship_started_on?: string }
        Returns: string
      }
      create_couple_invitation: {
        Args: { p_couple_id: string }
        Returns: {
          expires_at: string
          invitation_id: string
          token: string
        }[]
      }
      play_connect_four_move: {
        Args: { p_column: number; p_expected_turn: number; p_match_id: string }
        Returns: {
          board: Json
          couple_id: string
          created_at: string
          current_turn: string
          finished_at: string
          game_key: string
          is_draw: boolean
          match_id: string
          player_one_id: string
          player_two_id: string
          status: string
          turn_number: number
          updated_at: string
          winner_id: string
        }[]
      }
      revoke_couple_invitation: {
        Args: { p_couple_id: string }
        Returns: boolean
      }
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
    Enums: {},
  },
} as const
