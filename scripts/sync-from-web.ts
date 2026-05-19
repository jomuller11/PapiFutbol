#!/usr/bin/env node
/**
 * Importa equipos y nóminas desde papifutbolsanjosemoron.com.ar a Supabase.
 *
 * Uso:
 *   npx tsx scripts/sync-from-web.ts [--dry-run] [--tournament-id=<uuid>]
 *
 * --dry-run           Parsea y muestra los datos pero no escribe en Supabase.
 * --tournament-id=... Usa ese torneo en lugar del más reciente activo/borrador.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const TOURNAMENT_ID_ARG = process.argv
  .find((a) => a.startsWith('--tournament-id='))
  ?.split('=')[1];

const EQUIPOS_URL =
  'https://papifutbolsanjosemoron.com.ar/index.php?r=equipos/vistaweb';

// ─── Env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.local no encontrado en ${process.cwd()}`);
  }
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// ─── HTML Parsing ─────────────────────────────────────────────────────────────

interface TeamData {
  number: number;
  name: string;
  players: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(td|th|tr|div|p|li|span|h[1-6]|table|tbody|thead)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&[a-z][a-z0-9]*;/gi, '');  // elimina entidades restantes como &emsp13;
}

function parseTeamsPage(html: string): TeamData[] {
  const lines = stripHtml(html)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const teams: TeamData[] = [];
  let current: TeamData | null = null;

  for (const line of lines) {
    // Encabezado de equipo: "01 NOMBREEQUIPO" o "1 NOMBRE"
    const m = line.match(/^(\d{1,2})\s+([A-ZÁÉÍÓÚÜÑ0-9 .'-]{2,50})$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num >= 1 && num <= 30) {
        if (current) teams.push(current);
        current = { number: num, name: m[2].trim().toUpperCase(), players: [] };
        continue;
      }
    }

    // Nombre de jugador: solo letras, espacios y puntuación básica
    if (current && /^[A-ZÁÉÍÓÚÜÑ ,.'()-]+$/i.test(line) && line.length >= 3) {
      current.players.push(line.trim().toUpperCase());
    }
  }

  if (current) teams.push(current);
  return teams;
}

// ─── Short name ───────────────────────────────────────────────────────────────

function deriveShortName(name: string): string {
  const clean = name.replace(/[^A-Z0-9\s]/gi, '').trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 'EQP';

  if (words.length === 1) {
    const s = words[0].slice(0, 4).toUpperCase();
    return s.length >= 2 ? s : s.padEnd(2, s[0] ?? 'X');
  }

  // Iniciales de las primeras palabras (máx 4 chars)
  const initials = words
    .slice(0, 4)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return initials.length >= 2 ? initials.slice(0, 4) : words[0].slice(0, 4).toUpperCase();
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLORS = [
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
  '#059669', '#0891b2', '#2563eb', '#1e3a8a',
  '#7c3aed', '#c026d3', '#ec4899', '#be185d',
  '#44403c', '#facc15', '#000000', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#059669',
  '#0891b2', '#2563eb', '#1e3a8a', '#7c3aed',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌  Faltan variables de entorno en .env.local:');
    if (!supabaseUrl) console.error('   NEXT_PUBLIC_SUPABASE_URL');
    if (!serviceKey) console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── 1. Obtener torneo ──────────────────────────────────────────────────────

  let tournamentId: string;
  let tournamentName: string;

  if (TOURNAMENT_ID_ARG) {
    tournamentId = TOURNAMENT_ID_ARG;
    tournamentName = tournamentId;
    console.log(`Torneo especificado: ${tournamentId}`);
  } else {
    const { data: rows, error } = await (supabase as any)
      .from('tournaments')
      .select('id, name, status')
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !rows?.length) {
      console.error(
        '❌  No hay ningún torneo activo o borrador.\n' +
          '   Creá uno desde /admin/tournament o usá --tournament-id=<uuid>.'
      );
      process.exit(1);
    }

    tournamentId = rows[0].id;
    tournamentName = `${rows[0].name} (${rows[0].status})`;
    console.log(`Torneo: ${tournamentName}`);
  }

  // ── 2. Fetchear y parsear página ──────────────────────────────────────────

  console.log(`\nFetcheando ${EQUIPOS_URL} ...`);
  let html: string;
  try {
    const res = await fetch(EQUIPOS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    html = await res.text();
  } catch (err: any) {
    console.error(`❌  Error al fetchear la página: ${err.message}`);
    process.exit(1);
  }

  const teams = parseTeamsPage(html);

  if (teams.length === 0) {
    console.error(
      '❌  No se encontraron equipos en la página.\n' +
        '   Puede que el formato HTML haya cambiado. Revisá la función parseTeamsPage().'
    );
    process.exit(1);
  }

  // ── 3. Mostrar resultados ─────────────────────────────────────────────────

  console.log(`\n${teams.length} equipos encontrados:\n`);
  let totalPlayers = 0;
  for (const t of teams) {
    console.log(
      `  ${String(t.number).padStart(2, '0')}  ${t.name.padEnd(30)}  ${t.players.length} jugadores`
    );
    totalPlayers += t.players.length;
  }
  console.log(`\nTotal jugadores: ${totalPlayers}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No se escribió nada en Supabase.');
    return;
  }

  // ── 4. Upsert equipos ─────────────────────────────────────────────────────

  console.log('\nImportando equipos...');
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  const teamIdByName: Record<string, string> = {};

  for (const [i, teamData] of teams.entries()) {
    // ¿Ya existe?
    const { data: existing } = await (supabase as any)
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('name', teamData.name)
      .maybeSingle();

    if (existing) {
      teamIdByName[teamData.name] = existing.id;
      skipped++;
      continue;
    }

    const { data: newTeam, error } = await (supabase as any)
      .from('teams')
      .insert({
        tournament_id: tournamentId,
        name: teamData.name,
        short_name: deriveShortName(teamData.name),
        color: COLORS[i] ?? '#2563eb',
      })
      .select('id')
      .single();

    if (error || !newTeam) {
      console.error(`  ✗ ${teamData.name}: ${error?.message ?? 'error desconocido'}`);
      errors++;
      continue;
    }

    teamIdByName[teamData.name] = newTeam.id;
    inserted++;
    console.log(`  ✓ ${teamData.name}`);
  }

  console.log(`\nEquipos: ${inserted} nuevos, ${skipped} ya existían, ${errors} errores`);

  // ── 5. Upsert roster_players ──────────────────────────────────────────────

  console.log('\nImportando jugadores...');
  let playersOk = 0;
  let playersErr = 0;

  for (const teamData of teams) {
    const teamId = teamIdByName[teamData.name];
    if (!teamId || teamData.players.length === 0) continue;

    const rows = teamData.players.map((name, pos) => ({
      team_id: teamId,
      full_name: name,
      roster_position: pos + 1,
    }));

    const { error } = await (supabase as any)
      .from('roster_players')
      .upsert(rows, { onConflict: 'team_id,full_name', ignoreDuplicates: false });

    if (error) {
      console.error(`  ✗ Jugadores de ${teamData.name}: ${error.message}`);
      playersErr += rows.length;
    } else {
      playersOk += rows.length;
    }
  }

  console.log(`Jugadores: ${playersOk} importados, ${playersErr} errores`);
  console.log('\n✅  Sincronización completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
