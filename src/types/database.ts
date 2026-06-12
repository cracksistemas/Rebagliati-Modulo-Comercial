export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: string;
          avatar_url: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; full_name: string; role: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      role_greetings: {
        Row: {
          id: string;
          role: string;
          message: string;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["role_greetings"]["Row"]> & { role: string; message: string };
        Update: Partial<Database["public"]["Tables"]["role_greetings"]["Row"]>;
      };
      sales: {
        Row: {
          id: string;
          sale_date: string;
          executive_id: string;
          team_id: string;
          product_type_id: string;
          product_id: string | null;
          quantity: number;
          gross_amount: number;
          discount_amount: number;
          net_amount: number;
          payment_method: string;
          lead_source: string;
          validation_status: string;
          notes: string | null;
          created_by: string;
          validated_by: string | null;
          validated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sales"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["sales"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
