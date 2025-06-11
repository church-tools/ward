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
      agenda: {
        Row: {
          created_at: string
          deleted: boolean
          id: number
          name: string
          unit: number
          updated_at: string
          uuid: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          id: number
          name: string
          unit: number
          updated_at?: string
          uuid?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          id?: number
          name?: string
          unit?: number
          updated_at?: string
          uuid?: string
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
          content: string | null
          created_at: string
          created_by: number
          id: number
          modified_at: string
          title: string | null
          unit: number
        }
        Insert: {
          agenda: number
          content?: string | null
          created_at?: string
          created_by: number
          id: number
          modified_at?: string
          title?: string | null
          unit: number
        }
        Update: {
          agenda?: number
          content?: string | null
          created_at?: string
          created_by?: number
          id?: number
          modified_at?: string
          title?: string | null
          unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_item_unit_agenda_fkey"
            columns: ["unit", "agenda"]
            isOneToOne: false
            referencedRelation: "agenda"
            referencedColumns: ["unit", "id"]
          },
          {
            foreignKeyName: "agenda_item_unit_created_by_fkey"
            columns: ["unit", "created_by"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["unit", "id"]
          },
          {
            foreignKeyName: "agenda_item_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
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
          organization: number | null
          unit: number
        }
        Insert: {
          caller?: Database["public"]["Enums"]["calling_caller"]
          created_at?: string
          full_name: string
          id: number
          is_temporary?: boolean
          is_unique?: boolean
          modified_at?: string
          name: string
          organization?: number | null
          unit?: number
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
          organization?: number | null
          unit?: number
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
          id: number
          member: number | null
          modified_at: string
          unit: number
        }
        Insert: {
          calling?: number | null
          created_at?: string
          id: number
          member?: number | null
          modified_at?: string
          unit: number
        }
        Update: {
          calling?: number | null
          created_at?: string
          id?: number
          member?: number | null
          modified_at?: string
          unit?: number
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
        }
        Insert: {
          created_at?: string
          id: number
          modified_at?: string
          name: string
          number: number
          unit: number
        }
        Update: {
          created_at?: string
          id?: number
          modified_at?: string
          name?: string
          number?: number
          unit?: number
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
          first_name: string
          id: number
          last_name: string | null
          modified_at: string
          nick_name: string | null
          notes: string | null
          permissions: Database["public"]["Enums"]["permission"][] | null
          unit: number
          user: number | null
        }
        Insert: {
          agenda_permissions?: number[] | null
          created_at?: string
          first_name: string
          id: number
          last_name?: string | null
          modified_at?: string
          nick_name?: string | null
          notes?: string | null
          permissions?: Database["public"]["Enums"]["permission"][] | null
          unit: number
          user?: number | null
        }
        Update: {
          agenda_permissions?: number[] | null
          created_at?: string
          first_name?: string
          id?: number
          last_name?: string | null
          modified_at?: string
          nick_name?: string | null
          notes?: string | null
          permissions?: Database["public"]["Enums"]["permission"][] | null
          unit?: number
          user?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      member_agenda_permission: {
        Row: {
          agenda: number
          created_at: string
          member: number
          unit: number
        }
        Insert: {
          agenda: number
          created_at?: string
          member: number
          unit: number
        }
        Update: {
          agenda?: number
          created_at?: string
          member?: number
          unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_agenda_permission_unit_agenda_fkey"
            columns: ["unit", "agenda"]
            isOneToOne: false
            referencedRelation: "agenda"
            referencedColumns: ["unit", "id"]
          },
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
          member: number
          modified_at: string
          unit: number
        }
        Insert: {
          calling: number
          created_at?: string
          member: number
          modified_at?: string
          unit: number
        }
        Update: {
          calling?: number
          created_at?: string
          member?: number
          modified_at?: string
          unit?: number
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
          unit: number
          updated_at: string
        }
        Insert: {
          color?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          id: number
          name: string
          unit: number
          updated_at?: string
        }
        Update: {
          color?: Database["public"]["Enums"]["color"] | null
          created_at?: string
          id?: number
          name?: string
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
          created_at: string
          id: number
          uid: string
          unit: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          uid: string
          unit?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          uid?: string
          unit?: number | null
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
          created_at: string
          created_by: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      permission: "calling" | "sacrament_meeting" | "music"
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
      permission: ["calling", "sacrament_meeting", "music"],
    },
  },
} as const
