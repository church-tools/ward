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
    PostgrestVersion: "12.2.3 (519615d)"
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
          created_at: string
          deleted: boolean
          full_name: string
          id: number
          is_temporary: boolean
          is_unique: boolean
          name: string
          organization: number | null
          position: number
          unit: number
          updated_at: string
          uuid: string
        }
        Insert: {
          caller?: Database["public"]["Enums"]["calling_caller"]
          created_at?: string
          deleted?: boolean
          full_name: string
          id: number
          is_temporary?: boolean
          is_unique?: boolean
          name: string
          organization?: number | null
          position: number
          unit?: number
          updated_at?: string
          uuid: string
        }
        Update: {
          caller?: Database["public"]["Enums"]["calling_caller"]
          created_at?: string
          deleted?: boolean
          full_name?: string
          id?: number
          is_temporary?: boolean
          is_unique?: boolean
          name?: string
          organization?: number | null
          position?: number
          unit?: number
          updated_at?: string
          uuid?: string
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
      calling_process: {
        Row: {
          calling: number | null
          created_at: string
          deleted: boolean
          id: number
          member: number | null
          unit: number
          updated_at: string
        }
        Insert: {
          calling?: number | null
          created_at?: string
          deleted?: boolean
          id: number
          member?: number | null
          unit: number
          updated_at?: string
        }
        Update: {
          calling?: number | null
          created_at?: string
          deleted?: boolean
          id?: number
          member?: number | null
          unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calling_process_unit_calling_fkey"
            columns: ["unit", "calling"]
            isOneToOne: false
            referencedRelation: "calling"
            referencedColumns: ["unit", "id"]
          },
          {
            foreignKeyName: "calling_process_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_process_unit_member_fkey"
            columns: ["unit", "member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["unit", "id"]
          },
        ]
      }
      hymn: {
        Row: {
          created_at: string
          id: number
          modified_at: string
          name: string
          number: number
          unit: number
          uuid: string
        }
        Insert: {
          created_at?: string
          id: number
          modified_at?: string
          name: string
          number: number
          unit: number
          uuid: string
        }
        Update: {
          created_at?: string
          id?: number
          modified_at?: string
          name?: string
          number?: number
          unit?: number
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "hymn_unit_fkey"
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
          agenda_permissions: number[] | null
          created_at: string
          deleted: boolean
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: number
          last_name: string | null
          nick_name: string | null
          notes: string | null
          permissions: Database["public"]["Enums"]["permission"][] | null
          profile: number | null
          unit: number
          updated_at: string
        }
        Insert: {
          agenda_permissions?: number[] | null
          created_at?: string
          deleted?: boolean
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: number
          last_name?: string | null
          nick_name?: string | null
          notes?: string | null
          permissions?: Database["public"]["Enums"]["permission"][] | null
          profile?: number | null
          unit: number
          updated_at?: string
        }
        Update: {
          agenda_permissions?: number[] | null
          created_at?: string
          deleted?: boolean
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: number
          last_name?: string | null
          nick_name?: string | null
          notes?: string | null
          permissions?: Database["public"]["Enums"]["permission"][] | null
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
          unit: number
          updated_at: string
        }
        Insert: {
          calling: number
          created_at?: string
          deleted?: boolean
          member: number
          unit: number
          updated_at?: string
        }
        Update: {
          calling?: number
          created_at?: string
          deleted?: boolean
          member?: number
          unit?: number
          updated_at?: string
        }
        Relationships: [
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
      organization: {
        Row: {
          color: Database["public"]["Enums"]["color"] | null
          created_at: string
          id: number
          name: string
          position: number
          unit: number
          updated_at: string
        }
        Insert: {
          color?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          id: number
          name: string
          position: number
          unit: number
          updated_at?: string
        }
        Update: {
          color?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          id?: number
          name?: string
          position?: number
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
          classes: Database["public"]["Enums"]["class"][] | null
          created_at: string
          date: string
          further_meetings: string[] | null
          greetings: string[] | null
          moved_member: string[] | null
          type: Database["public"]["Enums"]["meeting_type"] | null
          updated_at: string
        }
        Insert: {
          announcements?: string[] | null
          baptised_members?: string[] | null
          classes?: Database["public"]["Enums"]["class"][] | null
          created_at?: string
          date: string
          further_meetings?: string[] | null
          greetings?: string[] | null
          moved_member?: string[] | null
          type?: Database["public"]["Enums"]["meeting_type"] | null
          updated_at?: string
        }
        Update: {
          announcements?: string[] | null
          baptised_members?: string[] | null
          classes?: Database["public"]["Enums"]["class"][] | null
          created_at?: string
          date?: string
          further_meetings?: string[] | null
          greetings?: string[] | null
          moved_member?: string[] | null
          type?: Database["public"]["Enums"]["meeting_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      talk: {
        Row: {
          created_at: string
          duration: string | null
          extern_speaker: string | null
          id: number
          member: number | null
          modified_at: string
          sacrament_meeting: string | null
          topic: string | null
        }
        Insert: {
          created_at?: string
          duration?: string | null
          extern_speaker?: string | null
          id?: number
          member?: number | null
          modified_at?: string
          sacrament_meeting?: string | null
          topic?: string | null
        }
        Update: {
          created_at?: string
          duration?: string | null
          extern_speaker?: string | null
          id?: number
          member?: number | null
          modified_at?: string
          sacrament_meeting?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talk_sacrament_meeting_fkey"
            columns: ["sacrament_meeting"]
            isOneToOne: false
            referencedRelation: "sacrament_meeting"
            referencedColumns: ["date"]
          },
        ]
      }
      unit: {
        Row: {
          approved: boolean | null
          created_by: string
          id: number
          invitation_issue_date: string | null
          invitation_token: string | null
          name: string
          sacrament_service_time: number
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          created_by: string
          id?: number
          invitation_issue_date?: string | null
          invitation_token?: string | null
          name: string
          sacrament_service_time?: number
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          created_by?: string
          id?: number
          invitation_issue_date?: string | null
          invitation_token?: string | null
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
      calling_process_state:
        | "proposed"
        | "decided"
        | "accepted"
        | "confirmed"
        | "set_apart"
      class: "sunday_school" | "relief_society" | "elders_quorum"
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
      calling_process_state: [
        "proposed",
        "decided",
        "accepted",
        "confirmed",
        "set_apart",
      ],
      class: ["sunday_school", "relief_society", "elders_quorum"],
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
      ],
    },
  },
} as const
