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
      hotspot_sessions: {
        Row: {
          bytes_in: number
          bytes_out: number
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_synced_at: string
          login_at: string | null
          mac_address: string | null
          session_key: string
          uptime_seconds: number | null
          username: string | null
          voucher_id: string | null
        }
        Insert: {
          bytes_in?: number
          bytes_out?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_synced_at?: string
          login_at?: string | null
          mac_address?: string | null
          session_key: string
          uptime_seconds?: number | null
          username?: string | null
          voucher_id?: string | null
        }
        Update: {
          bytes_in?: number
          bytes_out?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_synced_at?: string
          login_at?: string | null
          mac_address?: string | null
          session_key?: string
          uptime_seconds?: number | null
          username?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotspot_sessions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          created_by: string | null
          data_limit_mb: number | null
          description: string | null
          device_limit: number
          duration_minutes: number
          id: string
          is_active: boolean
          mikrotik_profile: string | null
          name: string
          price: number
          speed_down_kbps: number | null
          speed_up_kbps: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_limit_mb?: number | null
          description?: string | null
          device_limit?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          mikrotik_profile?: string | null
          name: string
          price?: number
          speed_down_kbps?: number | null
          speed_up_kbps?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_limit_mb?: number | null
          description?: string | null
          device_limit?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          mikrotik_profile?: string | null
          name?: string
          price?: number
          speed_down_kbps?: number | null
          speed_up_kbps?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      router_commands: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          result: string | null
          status: Database["public"]["Enums"]["command_status"]
          type: Database["public"]["Enums"]["command_type"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          result?: string | null
          status?: Database["public"]["Enums"]["command_status"]
          type: Database["public"]["Enums"]["command_type"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          result?: string | null
          status?: Database["public"]["Enums"]["command_status"]
          type?: Database["public"]["Enums"]["command_type"]
        }
        Relationships: []
      }
      router_heartbeats: {
        Row: {
          board_name: string | null
          cpu_load: number | null
          free_hdd_bytes: number | null
          free_memory_bytes: number | null
          hotspot_active_users: number | null
          id: string
          os_version: string | null
          recorded_at: string
          total_hdd_bytes: number | null
          total_memory_bytes: number | null
          uptime: string | null
          wireguard_connected: boolean | null
        }
        Insert: {
          board_name?: string | null
          cpu_load?: number | null
          free_hdd_bytes?: number | null
          free_memory_bytes?: number | null
          hotspot_active_users?: number | null
          id?: string
          os_version?: string | null
          recorded_at?: string
          total_hdd_bytes?: number | null
          total_memory_bytes?: number | null
          uptime?: string | null
          wireguard_connected?: boolean | null
        }
        Update: {
          board_name?: string | null
          cpu_load?: number | null
          free_hdd_bytes?: number | null
          free_memory_bytes?: number | null
          hotspot_active_users?: number | null
          id?: string
          os_version?: string | null
          recorded_at?: string
          total_hdd_bytes?: number | null
          total_memory_bytes?: number | null
          uptime?: string | null
          wireguard_connected?: boolean | null
        }
        Relationships: []
      }
      router_settings: {
        Row: {
          api_port: number
          api_use_tls: boolean
          connector_token_hash: string | null
          connector_token_hint: string | null
          created_at: string
          host: string | null
          id: string
          identity: string | null
          last_seen_at: string | null
          name: string
          notes: string | null
          updated_at: string
          wireguard_endpoint: string | null
          wireguard_peer_public_key: string | null
        }
        Insert: {
          api_port?: number
          api_use_tls?: boolean
          connector_token_hash?: string | null
          connector_token_hint?: string | null
          created_at?: string
          host?: string | null
          id?: string
          identity?: string | null
          last_seen_at?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          wireguard_endpoint?: string | null
          wireguard_peer_public_key?: string | null
        }
        Update: {
          api_port?: number
          api_use_tls?: boolean
          connector_token_hash?: string | null
          connector_token_hint?: string | null
          created_at?: string
          host?: string | null
          id?: string
          identity?: string | null
          last_seen_at?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          wireguard_endpoint?: string | null
          wireguard_peer_public_key?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voucher_batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          package_id: string | null
          prefix: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          package_id?: string | null
          prefix?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          package_id?: string | null
          prefix?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_batches_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          activated_at: string | null
          batch_id: string | null
          bound_mac: string | null
          buyer_name: string | null
          buyer_phone: string | null
          code: string
          comment: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          package_id: string | null
          password: string
          price: number
          sold_at: string | null
          sold_by: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          used_data_mb: number
          username: string
        }
        Insert: {
          activated_at?: string | null
          batch_id?: string | null
          bound_mac?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          code: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          package_id?: string | null
          password: string
          price?: number
          sold_at?: string | null
          sold_by?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          used_data_mb?: number
          username: string
        }
        Update: {
          activated_at?: string | null
          batch_id?: string | null
          bound_mac?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          code?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          package_id?: string | null
          password?: string
          price?: number
          sold_at?: string | null
          sold_by?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          used_data_mb?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "voucher_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_sales_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "cashier" | "technician"
      command_status: "pending" | "sent" | "done" | "failed"
      command_type:
        | "disconnect_session"
        | "disable_user"
        | "sync_voucher"
        | "reboot"
        | "custom"
      voucher_status:
        | "unused"
        | "sold"
        | "active"
        | "used"
        | "expired"
        | "disabled"
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
      app_role: ["admin", "cashier", "technician"],
      command_status: ["pending", "sent", "done", "failed"],
      command_type: [
        "disconnect_session",
        "disable_user",
        "sync_voucher",
        "reboot",
        "custom",
      ],
      voucher_status: [
        "unused",
        "sold",
        "active",
        "used",
        "expired",
        "disabled",
      ],
    },
  },
} as const
