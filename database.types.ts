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
      agenda_item: {
        Row: {
          content: string | null
          created_at: string
          created_by: number
          id: number
          in_agenda: Database["public"]["Enums"]["agenda"] | null
          modified_at: string
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: number
          id?: number
          in_agenda?: Database["public"]["Enums"]["agenda"] | null
          modified_at?: string
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: number
          id?: number
          in_agenda?: Database["public"]["Enums"]["agenda"] | null
          modified_at?: string
          title?: string | null
        }
        Relationships: []
      }
      calling: {
        Row: {
          caller: Database["public"]["Enums"]["calling_caller"]
          created_at: string
          full_name: string
          id: number
          is_temporary: boolean
          is_unique: boolean
          modified_at: string
          name: string
        }
        Insert: {
          caller?: Database["public"]["Enums"]["calling_caller"]
          created_at?: string
          full_name: string
          id?: number
          is_temporary?: boolean
          is_unique?: boolean
          modified_at?: string
          name: string
        }
        Update: {
          caller?: Database["public"]["Enums"]["calling_caller"]
          created_at?: string
          full_name?: string
          id?: number
          is_temporary?: boolean
          is_unique?: boolean
          modified_at?: string
          name?: string
        }
        Relationships: []
      }
      calling_process: {
        Row: {
          calling: number | null
          created_at: string
          id: number
          member: number | null
          modified_at: string
        }
        Insert: {
          calling?: number | null
          created_at?: string
          id?: number
          member?: number | null
          modified_at?: string
        }
        Update: {
          calling?: number | null
          created_at?: string
          id?: number
          member?: number | null
          modified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calling_process_calling_fkey"
            columns: ["calling"]
            isOneToOne: false
            referencedRelation: "calling"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_process_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
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
        }
        Insert: {
          created_at?: string
          id?: number
          modified_at?: string
          name: string
          number: number
        }
        Update: {
          created_at?: string
          id?: number
          modified_at?: string
          name?: string
          number?: number
        }
        Relationships: []
      }
      language: {
        Row: {
          created_at: string
          id: number
          modified_at: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          modified_at?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          modified_at?: string
          name?: string | null
        }
        Relationships: []
      }
      member: {
        Row: {
          created_at: string
          first_name: string
          id: number
          last_name: string | null
          modified_at: string
          nick_name: string | null
          notes: string | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: number
          last_name?: string | null
          modified_at?: string
          nick_name?: string | null
          notes?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: number
          last_name?: string | null
          modified_at?: string
          nick_name?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      member_calling: {
        Row: {
          calling: number
          created_at: string
          member: number
          modified_at: string
        }
        Insert: {
          calling: number
          created_at?: string
          member?: number
          modified_at?: string
        }
        Update: {
          calling?: number
          created_at?: string
          member?: number
          modified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_calling_calling_fkey"
            columns: ["calling"]
            isOneToOne: false
            referencedRelation: "calling"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_calling_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      member_language: {
        Row: {
          created_at: string
          language: number
          member: number
          modified_at: string
        }
        Insert: {
          created_at?: string
          language: number
          member?: number
          modified_at?: string
        }
        Update: {
          created_at?: string
          language?: number
          member?: number
          modified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_language_language_fkey"
            columns: ["language"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_language_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          color: Database["public"]["Enums"]["color"] | null
          created_at: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          color?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          id?: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "talk_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talk_sacrament_meeting_fkey"
            columns: ["sacrament_meeting"]
            isOneToOne: false
            referencedRelation: "sacrament_meeting"
            referencedColumns: ["date"]
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
      agenda: "bishopric" | "extended_bishopric" | "ward_council"
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
        | "red"
        | "pink"
        | "berry"
        | "purple"
        | "lavender"
        | "navy"
        | "blue"
        | "teal"
        | "seafoam"
        | "green"
        | "forest"
        | "yellow"
        | "brass"
        | "peach"
        | "orange"
      gender: "male" | "female"
      meeting_type:
        | "fast_and_testimony"
        | "general_conference"
        | "stake_conference"
        | "ward_conference"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agenda: ["bishopric", "extended_bishopric", "ward_council"],
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
        "red",
        "pink",
        "berry",
        "purple",
        "lavender",
        "navy",
        "blue",
        "teal",
        "seafoam",
        "green",
        "forest",
        "yellow",
        "brass",
        "peach",
        "orange",
      ],
      gender: ["male", "female"],
      meeting_type: [
        "fast_and_testimony",
        "general_conference",
        "stake_conference",
        "ward_conference",
      ],
    },
  },
} as const
