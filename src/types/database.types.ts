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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: 'admin' | 'staff'
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          role?: 'admin' | 'staff'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          role?: 'admin' | 'staff'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      service_packages: {
        Row: {
          id: string
          name: string
          description: string | null
          service_type: 'cleaning' | 'training'
          duration_minutes: number
          price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          service_type: 'cleaning' | 'training'
          duration_minutes: number
          price: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          service_type?: 'cleaning' | 'training'
          duration_minutes?: number
          price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          customer_id: string
          service_package_id: string
          staff_id: string | null
          team_id: string | null
          booking_date: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          total_price: number
          notes: string | null
          address: string
          city: string
          state: string
          zip_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          service_package_id: string
          staff_id?: string | null
          team_id?: string | null
          booking_date: string
          start_time: string
          end_time: string
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          total_price: number
          notes?: string | null
          address: string
          city: string
          state: string
          zip_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          service_package_id?: string
          staff_id?: string | null
          team_id?: string | null
          booking_date?: string
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          total_price?: number
          notes?: string | null
          address?: string
          city?: string
          state?: string
          zip_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          staff_id: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          staff_id: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          staff_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          message?: string
          is_read?: boolean
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          table_name: string
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          table_name: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          table_name?: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
      booking_status_history: {
        Row: {
          id: string
          booking_id: string
          changed_by: string
          old_status: string | null
          new_status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          changed_by: string
          old_status?: string | null
          new_status: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          changed_by?: string
          old_status?: string | null
          new_status?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
