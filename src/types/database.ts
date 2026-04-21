/**
 * Este archivo se genera automáticamente con:
 *   pnpm types:db
 *
 * El contenido de abajo es un placeholder para que el proyecto compile.
 * Después de correr la migración, reemplazar con los types reales.
 */

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
          role: 'player' | 'staff' | 'admin';
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'player' | 'staff' | 'admin';
          email: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      players: {
        Row: {
          id: string;
          profile_id: string;
          first_name: string;
          last_name: string;
          nickname: string | null;
          dni: string;
          birth_date: string;
          phone: string;
          reference: PlayerReference;
          position: PlayerPosition;
          foot: PlayerFoot;
          score: number | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };
      // ... el resto de tablas se auto-generan con `pnpm types:db`
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'player' | 'staff' | 'admin';
      player_position: 'ARQ' | 'DFC' | 'LAT' | 'MCC' | 'MCO' | 'EXT' | 'DEL';
      player_foot: 'derecho' | 'izquierdo' | 'ambidiestro';
      player_reference: PlayerReference;
      tournament_status: 'draft' | 'active' | 'finished' | 'cancelled';
      registration_status: 'pending' | 'approved' | 'rejected' | 'waitlist';
      match_status: 'scheduled' | 'played' | 'cancelled' | 'postponed';
      card_type: 'yellow' | 'red' | 'blue';
    };
  };
}

export type PlayerReference =
  | 'padre_alumno'
  | 'padre_ex_alumno'
  | 'ex_alumno'
  | 'docente_colegio'
  | 'invitado'
  | 'hermano_marista'
  | 'esposo_educadora'
  | 'abuelo_alumno';

export type PlayerPosition = 'ARQ' | 'DFC' | 'LAT' | 'MCC' | 'MCO' | 'EXT' | 'DEL';
export type PlayerFoot = 'derecho' | 'izquierdo' | 'ambidiestro';
