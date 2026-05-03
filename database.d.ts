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
      agenda: {
        Row: {
          color: Database["public"]["Enums"]["color"] | null
          deleted: boolean
          id: number
          name: string
          on_weeks: number[]
          organizations: number[]
          position: number
          postponed_until: string | null
          pre_assign_prayer: boolean
          shape: Database["public"]["Enums"]["shape"] | null
          start_time: number
          unit: number
          updated_at: string
          weekday: number
        }
        Insert: {
          color?: Database["public"]["Enums"]["color"] | null
          deleted?: boolean
          id: number
          name: string
          on_weeks?: number[]
          organizations?: number[]
          position: number
          postponed_until?: string | null
          pre_assign_prayer?: boolean
          shape?: Database["public"]["Enums"]["shape"] | null
          start_time?: number
          unit: number
          updated_at?: string
          weekday?: number
        }
        Update: {
          color?: Database["public"]["Enums"]["color"] | null
          deleted?: boolean
          id?: number
          name?: string
          on_weeks?: number[]
          organizations?: number[]
          position?: number
          postponed_until?: string | null
          pre_assign_prayer?: boolean
          shape?: Database["public"]["Enums"]["shape"] | null
          start_time?: number
          unit?: number
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_item: {
        Row: {
          agenda: number
          assigned_to: number[] | null
          content: string | null
          created_by: number
          deleted: boolean
          files: string[] | null
          id: number
          position: number
          title: string | null
          type: Database["public"]["Enums"]["agenda_item_type"]
          unit: number
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          agenda: number
          assigned_to?: number[] | null
          content?: string | null
          created_by: number
          deleted?: boolean
          files?: string[] | null
          id: number
          position: number
          title?: string | null
          type?: Database["public"]["Enums"]["agenda_item_type"]
          unit: number
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          agenda?: number
          assigned_to?: number[] | null
          content?: string | null
          created_by?: number
          deleted?: boolean
          files?: string[] | null
          id?: number
          position?: number
          title?: string | null
          type?: Database["public"]["Enums"]["agenda_item_type"]
          unit?: number
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_item_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_agenda_unit_fkey"
            columns: ["agenda", "unit"]
            isOneToOne: false
            referencedRelation: "agenda"
            referencedColumns: ["id", "unit"]
          },
          {
            foreignKeyName: "task_created_by_unit_fkey"
            columns: ["created_by", "unit"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id", "unit"]
          },
        ]
      }
      agenda_section: {
        Row: {
          agenda: number
          content: string | null
          deleted: boolean
          file_handles: string[] | null
          id: number
          position: number
          type: Database["public"]["Enums"]["agenda_section_type"]
          unit: number
          updated_at: string
        }
        Insert: {
          agenda: number
          content?: string | null
          deleted?: boolean
          file_handles?: string[] | null
          id?: number
          position: number
          type?: Database["public"]["Enums"]["agenda_section_type"]
          unit: number
          updated_at?: string
        }
        Update: {
          agenda?: number
          content?: string | null
          deleted?: boolean
          file_handles?: string[] | null
          id?: number
          position?: number
          type?: Database["public"]["Enums"]["agenda_section_type"]
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_item_agenda_unit_fkey"
            columns: ["agenda", "unit"]
            isOneToOne: false
            referencedRelation: "agenda"
            referencedColumns: ["id", "unit"]
          },
        ]
      }
      calling: {
        Row: {
          caller: Database["public"]["Enums"]["calling_caller"]
          deleted: boolean
          full_name: string | null
          gender_restriction: Database["public"]["Enums"]["gender"] | null
          id: number
          is_temporary: boolean
          is_unique: boolean
          name: string
          organization: number | null
          position: number
          unit: number
          updated_at: string
        }
        Insert: {
          caller?: Database["public"]["Enums"]["calling_caller"]
          deleted?: boolean
          full_name?: string | null
          gender_restriction?: Database["public"]["Enums"]["gender"] | null
          id: number
          is_temporary?: boolean
          is_unique?: boolean
          name: string
          organization?: number | null
          position: number
          unit?: number
          updated_at?: string
        }
        Update: {
          caller?: Database["public"]["Enums"]["calling_caller"]
          deleted?: boolean
          full_name?: string | null
          gender_restriction?: Database["public"]["Enums"]["gender"] | null
          id?: number
          is_temporary?: boolean
          is_unique?: boolean
          name?: string
          organization?: number | null
          position?: number
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calling_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_unit_organization_fkey"
            columns: ["unit", "organization"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["unit", "id"]
          },
        ]
      }
      hymn: {
        Row: {
          deleted: boolean
          id: number
          number: number | null
          position: number
          sacrament_meeting: number | null
          unit: number
          updated_at: string
        }
        Insert: {
          deleted?: boolean
          id?: number
          number?: number | null
          position: number
          sacrament_meeting?: number | null
          unit: number
          updated_at?: string
        }
        Update: {
          deleted?: boolean
          id?: number
          number?: number | null
          position?: number
          sacrament_meeting?: number | null
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "singing_sacrament_meeting_unit_fkey"
            columns: ["sacrament_meeting", "unit"]
            isOneToOne: false
            referencedRelation: "sacrament_meeting"
            referencedColumns: ["week", "unit"]
          },
          {
            foreignKeyName: "singing_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      language: {
        Row: {
          created_at: string
          id: number
          modified_at: string
          name: string | null
          unit: number
        }
        Insert: {
          created_at?: string
          id: number
          modified_at?: string
          name?: string | null
          unit: number
        }
        Update: {
          created_at?: string
          id?: number
          modified_at?: string
          name?: string | null
          unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "language_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      member: {
        Row: {
          created_at: string
          deleted: boolean
          first_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: number
          last_name: string | null
          nick_name: string | null
          notes: string | null
          profile: number | null
          unit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          first_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: number
          last_name?: string | null
          nick_name?: string | null
          notes?: string | null
          profile?: number | null
          unit: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: number
          last_name?: string | null
          nick_name?: string | null
          notes?: string | null
          profile?: number | null
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_unit_fkey"
            columns: ["profile", "unit"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id", "unit"]
          },
          {
            foreignKeyName: "member_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      member_agenda_permission: {
        Row: {
          created_at: string
          member: number
          unit: number
        }
        Insert: {
          created_at?: string
          member: number
          unit: number
        }
        Update: {
          created_at?: string
          member?: number
          unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_agenda_permission_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_agenda_permission_unit_member_fkey"
            columns: ["unit", "member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["unit", "id"]
          },
        ]
      }
      member_calling: {
        Row: {
          calling: number
          created_at: string
          deleted: boolean
          member: number
          notes: string | null
          responsible: number | null
          state: Database["public"]["Enums"]["member_calling_state"]
          unit: number
          updated_at: string
        }
        Insert: {
          calling: number
          created_at?: string
          deleted?: boolean
          member: number
          notes?: string | null
          responsible?: number | null
          state: Database["public"]["Enums"]["member_calling_state"]
          unit: number
          updated_at?: string
        }
        Update: {
          calling?: number
          created_at?: string
          deleted?: boolean
          member?: number
          notes?: string | null
          responsible?: number | null
          state?: Database["public"]["Enums"]["member_calling_state"]
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_calling_responsible_unit_fkey"
            columns: ["responsible", "unit"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id", "unit"]
          },
          {
            foreignKeyName: "member_calling_unit_calling_fkey"
            columns: ["unit", "calling"]
            isOneToOne: false
            referencedRelation: "calling"
            referencedColumns: ["unit", "id"]
          },
          {
            foreignKeyName: "member_calling_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_calling_unit_member_fkey"
            columns: ["unit", "member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["unit", "id"]
          },
        ]
      }
      member_language: {
        Row: {
          created_at: string
          language: number
          member: number
          modified_at: string
          unit: number
        }
        Insert: {
          created_at?: string
          language: number
          member: number
          modified_at?: string
          unit: number
        }
        Update: {
          created_at?: string
          language?: number
          member?: number
          modified_at?: string
          unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_language_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_language_unit_language_fkey"
            columns: ["unit", "language"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["unit", "id"]
          },
          {
            foreignKeyName: "member_language_unit_member_fkey"
            columns: ["unit", "member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["unit", "id"]
          },
        ]
      }
      message: {
        Row: {
          deleted: boolean
          duration: string | null
          id: number
          position: number
          sacrament_meeting: number | null
          speaker: string | null
          topic: string | null
          type: Database["public"]["Enums"]["message_type"]
          unit: number
          updated_at: string
        }
        Insert: {
          deleted?: boolean
          duration?: string | null
          id?: number
          position: number
          sacrament_meeting?: number | null
          speaker?: string | null
          topic?: string | null
          type: Database["public"]["Enums"]["message_type"]
          unit: number
          updated_at?: string
        }
        Update: {
          deleted?: boolean
          duration?: string | null
          id?: number
          position?: number
          sacrament_meeting?: number | null
          speaker?: string | null
          topic?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talk_sacrament_meeting_unit_fkey"
            columns: ["sacrament_meeting", "unit"]
            isOneToOne: false
            referencedRelation: "sacrament_meeting"
            referencedColumns: ["week", "unit"]
          },
          {
            foreignKeyName: "talk_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      musical_performance: {
        Row: {
          deleted: boolean
          id: number
          name: string | null
          performers: string | null
          position: number
          sacrament_meeting: number | null
          unit: number
          updated_at: string
        }
        Insert: {
          deleted?: boolean
          id?: number
          name?: string | null
          performers?: string | null
          position: number
          sacrament_meeting?: number | null
          unit: number
          updated_at?: string
        }
        Update: {
          deleted?: boolean
          id?: number
          name?: string | null
          performers?: string | null
          position?: number
          sacrament_meeting?: number | null
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "musical_performance_sacrament_meeting_unit_fkey"
            columns: ["sacrament_meeting", "unit"]
            isOneToOne: false
            referencedRelation: "sacrament_meeting"
            referencedColumns: ["week", "unit"]
          },
          {
            foreignKeyName: "musical_performance_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          abbreviation: string | null
          color: Database["public"]["Enums"]["color"] | null
          created_at: string
          id: number
          name: string
          position: number
          type: Database["public"]["Enums"]["organization_type"] | null
          unit: number
          updated_at: string
        }
        Insert: {
          abbreviation?: string | null
          color?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          id: number
          name: string
          position: number
          type?: Database["public"]["Enums"]["organization_type"] | null
          unit: number
          updated_at?: string
        }
        Update: {
          abbreviation?: string | null
          color?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          id?: number
          name?: string
          position?: number
          type?: Database["public"]["Enums"]["organization_type"] | null
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      poster: {
        Row: {
          files: string[]
          id: number
          organization: number | null
          unit: number
          updated_at: string
        }
        Insert: {
          files: string[]
          id?: number
          organization?: number | null
          unit: number
          updated_at?: string
        }
        Update: {
          files?: string[]
          id?: number
          organization?: number | null
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poster_organization_unit_fkey"
            columns: ["organization", "unit"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id", "unit"]
          },
          {
            foreignKeyName: "poster_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          color_1: Database["public"]["Enums"]["color"] | null
          color_2: Database["public"]["Enums"]["color"] | null
          created_at: string
          deleted: boolean
          email: string
          id: number
          is_admin: boolean
          is_unit_admin: boolean
          unit: number
          unit_approved: boolean | null
          updated_at: string
          user: string
        }
        Insert: {
          color_1?: Database["public"]["Enums"]["color"] | null
          color_2?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          deleted?: boolean
          email: string
          id?: number
          is_admin?: boolean
          is_unit_admin?: boolean
          unit: number
          unit_approved?: boolean | null
          updated_at?: string
          user: string
        }
        Update: {
          color_1?: Database["public"]["Enums"]["color"] | null
          color_2?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          deleted?: boolean
          email?: string
          id?: number
          is_admin?: boolean
          is_unit_admin?: boolean
          unit?: number
          unit_approved?: boolean | null
          updated_at?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      sacrament_meeting: {
        Row: {
          announcements: string[] | null
          baptised_members: string[] | null
          classes: string | null
          closing_hymn: number | null
          closing_prayer: string | null
          further_meetings: string[] | null
          greetings: string[] | null
          moved_member: string[] | null
          opening_hymn: number | null
          opening_prayer: string | null
          sacrament_hymn: number | null
          type: Database["public"]["Enums"]["meeting_type"] | null
          unit: number
          updated_at: string
          week: number
        }
        Insert: {
          announcements?: string[] | null
          baptised_members?: string[] | null
          classes?: string | null
          closing_hymn?: number | null
          closing_prayer?: string | null
          further_meetings?: string[] | null
          greetings?: string[] | null
          moved_member?: string[] | null
          opening_hymn?: number | null
          opening_prayer?: string | null
          sacrament_hymn?: number | null
          type?: Database["public"]["Enums"]["meeting_type"] | null
          unit: number
          updated_at?: string
          week: number
        }
        Update: {
          announcements?: string[] | null
          baptised_members?: string[] | null
          classes?: string | null
          closing_hymn?: number | null
          closing_prayer?: string | null
          further_meetings?: string[] | null
          greetings?: string[] | null
          moved_member?: string[] | null
          opening_hymn?: number | null
          opening_prayer?: string | null
          sacrament_hymn?: number | null
          type?: Database["public"]["Enums"]["meeting_type"] | null
          unit?: number
          updated_at?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "sacrament_meeting_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      unit: {
        Row: {
          approved: boolean | null
          bulletin_board_key: string
          created_by: string
          id: number
          join_timeout: string | null
          join_token: string | null
          name: string
          sacrament_service_time: number
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          bulletin_board_key?: string
          created_by: string
          id?: number
          join_timeout?: string | null
          join_token?: string | null
          name: string
          sacrament_service_time?: number
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          bulletin_board_key?: string
          created_by?: string
          id?: number
          join_timeout?: string | null
          join_token?: string | null
          name?: string
          sacrament_service_time?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      access_token_hook: { Args: { event: Json }; Returns: Json }
      get_user_id_by_email: {
        Args: { email: string }
        Returns: {
          id: string
        }[]
      }
    }
    Enums: {
      agenda_item_type:
        | "suggestion"
        | "topic"
        | "task"
        | "in_progress"
        | "done"
        | "acknowledged"
      agenda_section_type:
        | "text"
        | "suggestions"
        | "topics"
        | "resolutions"
        | "prayer"
        | "spiritual_thought"
        | "callings"
      callability: "callable" | "other_needs" | "retired"
      calling_caller: "bishopric" | "elders_quorum" | "stake_presidency"
      color:
        | "palevioletred"
        | "red"
        | "tomato"
        | "coral"
        | "chocolate"
        | "orange"
        | "goldenrod"
        | "yellow"
        | "yellowgreen"
        | "lawngreen"
        | "green"
        | "aquamarine"
        | "turquoise"
        | "teal"
        | "powderblue"
        | "skyblue"
        | "steelblue"
        | "dodgerblue"
        | "royalblue"
        | "blue"
        | "mediumpurple"
        | "indigo"
        | "magenta"
        | "deeppink"
      gender: "male" | "female"
      meeting_type:
        | "fast_and_testimony"
        | "general_conference"
        | "stake_conference"
        | "ward_conference"
      member_calling_state:
        | "proposed"
        | "decided"
        | "accepted"
        | "rejected"
        | "sustained"
        | "set_apart"
        | "release_proposed"
        | "release_issued"
        | "release_sustained"
      message_type: "message" | "testimony"
      organization_type:
        | "bishopric"
        | "relief_society"
        | "elders_quorum"
        | "sunday_school"
        | "young_men"
        | "young_women"
        | "primary"
        | "mission_work"
        | "tempel_work"
      permission: "calling" | "sacrament_meeting" | "music"
      shape:
        | "circle"
        | "triangle"
        | "square"
        | "pentagon"
        | "hexagon"
        | "shapes"
        | "oval"
        | "rhombus"
        | "premium"
        | "fire"
        | "water"
        | "mountain_trail"
        | "weather_cloudy"
        | "weather_sunny"
        | "weather_moon"
        | "star"
        | "heart"
        | "bow_tie"
        | "briefcase"
        | "guardian"
        | "hat_graduation"
        | "book"
        | "food_fish"
        | "lightbulb"
        | "key_multiple"
        | "compass_northwest"
        | "card_ui"
        | "dust"
        | "tree_deciduous"
        | "plant_ragweed"
        | "food_grains"
        | "hand_right"
        | "money"
        | "savings"
        | "people_audience"
        | "scales"
        | "sport"
        | "sport_basketball"
        | "sport_american_football"
        | "sport_soccer"
        | "doctor"
        | "shape_organic"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      agenda_item_type: [
        "suggestion",
        "topic",
        "task",
        "in_progress",
        "done",
        "acknowledged",
      ],
      agenda_section_type: [
        "text",
        "suggestions",
        "topics",
        "resolutions",
        "prayer",
        "spiritual_thought",
        "callings",
      ],
      callability: ["callable", "other_needs", "retired"],
      calling_caller: ["bishopric", "elders_quorum", "stake_presidency"],
      color: [
        "palevioletred",
        "red",
        "tomato",
        "coral",
        "chocolate",
        "orange",
        "goldenrod",
        "yellow",
        "yellowgreen",
        "lawngreen",
        "green",
        "aquamarine",
        "turquoise",
        "teal",
        "powderblue",
        "skyblue",
        "steelblue",
        "dodgerblue",
        "royalblue",
        "blue",
        "mediumpurple",
        "indigo",
        "magenta",
        "deeppink",
      ],
      gender: ["male", "female"],
      meeting_type: [
        "fast_and_testimony",
        "general_conference",
        "stake_conference",
        "ward_conference",
      ],
      member_calling_state: [
        "proposed",
        "decided",
        "accepted",
        "rejected",
        "sustained",
        "set_apart",
        "release_proposed",
        "release_issued",
        "release_sustained",
      ],
      message_type: ["message", "testimony"],
      organization_type: [
        "bishopric",
        "relief_society",
        "elders_quorum",
        "sunday_school",
        "young_men",
        "young_women",
        "primary",
        "mission_work",
        "tempel_work",
      ],
      permission: ["calling", "sacrament_meeting", "music"],
      shape: [
        "circle",
        "triangle",
        "square",
        "pentagon",
        "hexagon",
        "shapes",
        "oval",
        "rhombus",
        "premium",
        "fire",
        "water",
        "mountain_trail",
        "weather_cloudy",
        "weather_sunny",
        "weather_moon",
        "star",
        "heart",
        "bow_tie",
        "briefcase",
        "guardian",
        "hat_graduation",
        "book",
        "food_fish",
        "lightbulb",
        "key_multiple",
        "compass_northwest",
        "card_ui",
        "dust",
        "tree_deciduous",
        "plant_ragweed",
        "food_grains",
        "hand_right",
        "money",
        "savings",
        "people_audience",
        "scales",
        "sport",
        "sport_basketball",
        "sport_american_football",
        "sport_soccer",
        "doctor",
        "shape_organic",
      ],
    },
  },
} as const
