#!/usr/bin/env node
/**
 * Importa equipos, nóminas y estadísticas desde papifutbolsanjosemoron.com.ar a Supabase.
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

const EQUIPOS_URL = 'https://papifutbolsanjosemoron.com.ar/index.php?r=equipos/vistaweb';
const HOMEPAGE_URL = 'https://papifutbolsanjosemoron.com.ar/';

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
    .replace(/&[a-z][a-z0-9]*;/gi, '');
}

function parseTeamsPage(html: string): TeamData[] {
  const lines = stripHtml(html)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const teams: TeamData[] = [];
  let current: TeamData | null = null;

  for (const line of lines) {
    const m = line.match(/^(\d{1,2})\s+([A-ZÁÉÍÓÚÜÑ0-9 .'-]{2,50})$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num >= 1 && num <= 30) {
        if (current) teams.push(current);
        current = { number: num, name: m[2].trim().toUpperCase(), players: [] };
        continue;
      }
    }
    if (current && /^[A-ZÁÉÍÓÚÜÑ ,.'()-]+$/i.test(line) && line.length >= 3) {
      current.players.push(line.trim().toUpperCase());
    }
  }

  if (current) teams.push(current);
  return teams;
}

/**
 * Extrae filas de una tabla HTML identificada por su atributo id.
 * Retorna array de arrays de strings (celdas por fila), omitiendo filas de encabezado.
 */
function parseTableSection(html: string, sectionId: string): string[][] {
  const sectionStart = html.indexOf(`id="${sectionId}"`);
  if (sectionStart < 0) return [];

  const chunk = html.slice(sectionStart, sectionStart + 30000);

  const bodyStart = chunk.indexOf('<tbody');
  const bodyEnd = chunk.indexOf('</tbody>');
  const body =
    bodyStart >= 0 && bodyEnd >= 0
      ? chunk.slice(bodyStart, bodyEnd + 8)
      : (() => {
          const s = chunk.indexOf('<table');
          const e = chunk.indexOf('</table>');
          return s >= 0 && e >= 0 ? chunk.slice(s, e + 8) : '';
        })();

  if (!body) return [];

  const rows: string[][] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(body)) !== null) {
    const cols: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cols.push(stripHtml(tdMatch[1]).replace(/\s+/g, ' ').trim());
    }
    if (cols.length > 1) rows.push(cols);
  }
  return rows;
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

  const initials = words.slice(0, 4).map((w) => w[0]).join('').toUpperCase();
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

// ─── Stats Sync ───────────────────────────────────────────────────────────────

async function syncStats(supabase: any, html: string) {
  console.log('\nSincronizando estadísticas...');

  // Standings — Zona 1 + Zona 2
  // Columnas esperadas: pos, equipo, pts, pj, pg, pe, pp, gf, gc, fp
  const allStandings = [
    ...parseTableSection(html, 'posicionesZONA_1').map((c, i) => ({
      zone: 'Zona 1',
      rank: parseInt(c[0]) || i + 1,
      team_name: c[1] ?? '',
      pts: parseInt(c[2]) || 0,
      pj: parseInt(c[3]) || 0,
      pg: parseInt(c[4]) || 0,
      pe: parseInt(c[5]) || 0,
      pp: parseInt(c[6]) || 0,
      gf: parseInt(c[7]) || 0,
      gc: parseInt(c[8]) || 0,
      fp: parseInt(c[9]) || 0,
    })),
    ...parseTableSection(html, 'posicionesZONA_2').map((c, i) => ({
      zone: 'Zona 2',
      rank: parseInt(c[0]) || i + 1,
      team_name: c[1] ?? '',
      pts: parseInt(c[2]) || 0,
      pj: parseInt(c[3]) || 0,
      pg: parseInt(c[4]) || 0,
      pe: parseInt(c[5]) || 0,
      pp: parseInt(c[6]) || 0,
      gf: parseInt(c[7]) || 0,
      gc: parseInt(c[8]) || 0,
      fp: parseInt(c[9]) || 0,
    })),
  ].filter((r) => r.team_name);

  await (supabase as any).from('stats_standings').delete().gt('rank', 0);
  const { error: e1 } = await (supabase as any).from('stats_standings').insert(allStandings);
  if (e1) console.error('  ✗ stats_standings:', e1.message);
  else console.log(`  ✓ stats_standings: ${allStandings.length} equipos`);

  // Scorers — columnas: pos, jugador, equipo, goles
  const scorers = parseTableSection(html, 'goleadoresESTADISTICAS_GENERALES')
    .map((c, i) => ({
      rank: parseInt(c[0]) || i + 1,
      player_name: c[1] ?? '',
      team_name: c[2] ?? '',
      goals: parseInt(c[3]) || 0,
    }))
    .filter((r) => r.player_name);

  await (supabase as any).from('stats_scorers').delete().gt('rank', 0);
  const { error: e2 } = await (supabase as any).from('stats_scorers').insert(scorers);
  if (e2) console.error('  ✗ stats_scorers:', e2.message);
  else console.log(`  ✓ stats_scorers: ${scorers.length} goleadores`);

  // Fair play — columnas: pos, equipo, amarilla, azul, roja, puntaje
  const fairplay = parseTableSection(html, 'fairplayESTADISTICAS_GENERALES')
    .map((c, i) => ({
      rank: parseInt(c[0]) || i + 1,
      team_name: c[1] ?? '',
      yellow: parseInt(c[2]) || 0,
      blue: parseInt(c[3]) || 0,
      red: parseInt(c[4]) || 0,
      score: parseInt(c[5]) || 0,
    }))
    .filter((r) => r.team_name);

  await (supabase as any).from('stats_fairplay').delete().gt('rank', 0);
  const { error: e3 } = await (supabase as any).from('stats_fairplay').insert(fairplay);
  if (e3) console.error('  ✗ stats_fairplay:', e3.message);
  else console.log(`  ✓ stats_fairplay: ${fairplay.length} equipos`);

  // Goalkeepers — columnas: pos, jugador, equipo, goles en contra
  const goalkeepers = parseTableSection(html, 'vallaESTADISTICAS_GENERALES')
    .map((c, i) => ({
      rank: parseInt(c[0]) || i + 1,
      player_name: c[1] ?? '',
      team_name: c[2] ?? '',
      goals_against: parseInt(c[3]) || 0,
    }))
    .filter((r) => r.player_name);

  await (supabase as any).from('stats_goalkeepers').delete().gt('rank', 0);
  const { error: e4 } = await (supabase as any).from('stats_goalkeepers').insert(goalkeepers);
  if (e4) console.error('  ✗ stats_goalkeepers:', e4.message);
  else console.log(`  ✓ stats_goalkeepers: ${goalkeepers.length} arqueros`);

  // Sanctions — columnas: pos, jugador, equipo, amarilla, azul, roja, fechas, cumplidas
  const sanctions = parseTableSection(html, 'sancionesESTADISTICAS_GENERALES')
    .map((c, i) => ({
      rank: parseInt(c[0]) || i + 1,
      player_name: c[1] ?? '',
      team_name: c[2] ?? '',
      yellow: parseInt(c[3]) || 0,
      blue: parseInt(c[4]) || 0,
      red: parseInt(c[5]) || 0,
      fechas: parseInt(c[6]) || 0,
      cumplidas: parseInt(c[7]) || 0,
    }))
    .filter((r) => r.player_name);

  await (supabase as any).from('stats_sanctions').delete().gt('rank', 0);
  const { error: e5 } = await (supabase as any).from('stats_sanctions').insert(sanctions);
  if (e5) console.error('  ✗ stats_sanctions:', e5.message);
  else console.log(`  ✓ stats_sanctions: ${sanctions.length} sanciones`);
}

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

  // ── 2. Fetchear equipos ────────────────────────────────────────────────────

  console.log(`\nFetcheando equipos desde ${EQUIPOS_URL} ...`);
  let equiposHtml: string;
  try {
    const res = await fetch(EQUIPOS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    equiposHtml = await res.text();
  } catch (err: any) {
    console.error(`❌  Error al fetchear equipos: ${err.message}`);
    process.exit(1);
  }

  const teams = parseTeamsPage(equiposHtml);

  if (teams.length === 0) {
    console.error(
      '❌  No se encontraron equipos en la página.\n' +
        '   Puede que el formato HTML haya cambiado. Revisá la función parseTeamsPage().'
    );
    process.exit(1);
  }

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

  // ── 3. Upsert equipos ─────────────────────────────────────────────────────

  console.log('\nImportando equipos...');
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  const teamIdByName: Record<string, string> = {};

  for (const [i, teamData] of teams.entries()) {
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

  // ── 4. Upsert roster_players ──────────────────────────────────────────────

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

  // ── 5. Sincronizar estadísticas ───────────────────────────────────────────

  console.log(`\nFetcheando estadísticas desde ${HOMEPAGE_URL} ...`);
  let homepageHtml: string;
  try {
    const res = await fetch(HOMEPAGE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    homepageHtml = await res.text();
  } catch (err: any) {
    console.error(`❌  Error al fetchear la página principal: ${err.message}`);
    process.exit(1);
  }

  await syncStats(supabase, homepageHtml);

  console.log('\n✅  Sincronización completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
