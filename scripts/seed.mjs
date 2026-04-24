import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually since dotenv is not installed
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  if (line && !line.startsWith('#')) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) {
      env[key.trim()] = vals.join('=').trim();
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan credenciales de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TEAM_NAMES = [
  { name: '5 - FUNARO', short: '05', color: '#f59e0b' },
  { name: '6 - ORTIZ', short: '06', color: '#10b981' },
  { name: '3 - MEYER', short: '03', color: '#0ea5e9' },
  { name: '4 - DA COSTA', short: '04', color: '#ef4444' },
  { name: '1 - MOBRICI', short: '01', color: '#eab308' },
  { name: '2 - VENTRICELLI', short: '02', color: '#f97316' },
  { name: '8 - IRIBARREN', short: '08', color: '#3b82f6' },
  { name: '7 - DEL VALLE', short: '07', color: '#8b5cf6' },
  { name: '10 - AHUMADA', short: '10', color: '#14b8a6' },
  { name: '9 - ALIANO', short: '09', color: '#64748b' },
  { name: '12 - MACIEL', short: '12', color: '#a8a29e' },
  { name: '11 - ELIZALDE', short: '11', color: '#737373' },
  { name: '13 - PISTILLI', short: '13', color: '#57534e' },
  { name: '14 - TORRES', short: '14', color: '#dc2626' },
  { name: '15 - RUIZ DIAZ', short: '15', color: '#059669' },
  { name: '16 - VISCONTI', short: '16', color: '#b91c1c' },
  { name: '17 - CASTRO', short: '17', color: '#9333ea' },
  { name: '18 - GOMEZ', short: '18', color: '#be123c' },
  { name: '24 - FENNER', short: '24', color: '#be185d' },
  { name: '23 - RESICO', short: '23', color: '#4338ca' },
  { name: '22 - RIVAS', short: '22', color: '#1e40af' },
  { name: '21 - PINTO', short: '21', color: '#0f766e' },
  { name: '20 - MIGUEL', short: '20', color: '#b45309' },
  { name: '19 - LAGUNA', short: '19', color: '#1e293b' },
];

const FIRST_NAMES = ['Juan', 'Pedro', 'Lucas', 'Martín', 'Diego', 'Carlos', 'Pablo', 'Facundo', 'Nicolás', 'Joaquín', 'Mateo', 'Bautista', 'Santiago', 'Tomás', 'Agustín', 'Ignacio', 'Federico', 'Gastón', 'Matías', 'Emanuel'];
const LAST_NAMES = ['García', 'López', 'Pérez', 'González', 'Rodríguez', 'Fernández', 'Gómez', 'Díaz', 'Martínez', 'Sánchez', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate 12 scores that sum to exactly 80, each between 1 and 15
function generateScores() {
  let scores = Array(12).fill(1); // minimum score is 1
  let remaining = 80 - 12; // 68 points to distribute
  
  while (remaining > 0) {
    const idx = Math.floor(Math.random() * 12);
    if (scores[idx] < 15) {
      scores[idx]++;
      remaining--;
    }
  }
  return scores;
}

async function seed() {
  console.log('--- Iniciando Seed ---');

  // 1. Obtener el torneo activo
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    throw new Error('No hay un torneo activo. Por favor, crea uno primero.');
  }

  console.log('Torneo activo encontrado: ' + tournament.name);

  // 2. Limpiar datos previos del torneo (fases, partidos, equipos, etc.)
  await supabase.from('phases').delete().eq('tournament_id', tournament.id);
  await supabase.from('teams').delete().eq('tournament_id', tournament.id);

  console.log('Datos previos eliminados.');

  // 3. Crear Fase 1 (Grupos)
  const { data: phase, error: phaseErr } = await supabase
    .from('phases')
    .insert({
      tournament_id: tournament.id,
      name: 'Fase de Grupos',
      type: 'groups',
      order: 1,
      status: 'active'
    })
    .select()
    .single();

  if (phaseErr) throw phaseErr;

  console.log('Fase de Grupos creada.');

  // 4. Crear 2 zonas (Zonas A y B)
  const { data: groups, error: groupsErr } = await supabase
    .from('groups')
    .insert([
      { phase_id: phase.id, name: 'Zona A', order: 1 },
      { phase_id: phase.id, name: 'Zona B', order: 2 }
    ])
    .select();

  if (groupsErr) throw groupsErr;

  console.log('Zonas A y B creadas.');

  // 5. Crear 24 equipos
  const teamsToInsert = TEAM_NAMES.map(t => ({
    tournament_id: tournament.id,
    name: t.name,
    short_name: t.short,
    color: t.color
  }));

  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .insert(teamsToInsert)
    .select();

  if (teamsErr) throw teamsErr;

  console.log('24 equipos creados.');

  // Asignar 12 a Zona A, 12 a Zona B
  const groupA = groups.find(g => g.name === 'Zona A');
  const groupB = groups.find(g => g.name === 'Zona B');
  const groupTeams = teams.map((t, idx) => ({
    group_id: idx < 12 ? groupA.id : groupB.id,
    team_id: t.id
  }));

  await supabase.from('group_teams').insert(groupTeams);

  console.log('Creando 288 jugadores (esto puede tardar unos minutos)...');

  for (const team of teams) {
    const scores = generateScores();
    const teamMemberships = [];
    
    // Crear 12 jugadores
    for (let i = 0; i < 12; i++) {
      const email = 'player_' + team.short + '_' + i + '@test.com'.toLowerCase();
      
      let { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      
      if (!profile) {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: email,
          password: 'password123',
          email_confirm: true
        });
        
        if (authErr && !authErr.message.includes('already exists')) {
          console.error('Error creando usuario ' + email + ':', authErr);
          continue;
        }

        let { data: newProfile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
        profile = newProfile;
      }
      
      if (!profile) continue;

      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const position = randomElement(['ARQ', 'DFC', 'LAT', 'MCC', 'MCO', 'EXT', 'DEL']);
      const foot = randomElement(['derecho', 'izquierdo']);
      
      const { data: player, error: playerErr } = await supabase.from('players').upsert({
        profile_id: profile.id,
        first_name: firstName,
        last_name: lastName,
        dni: String(Math.floor(Math.random() * 90000000) + 10000000),
        birth_date: '1990-01-01',
        phone: '1122334455',
        reference: 'padre_alumno',
        position: position,
        foot: foot,
        score: scores[i]
      }, { onConflict: 'profile_id' }).select().single();

      if (playerErr) {
        console.error('Error insertando player:', playerErr);
        continue;
      }

      teamMemberships.push({
        team_id: team.id,
        player_id: player.id,
        jersey_number: i + 1
      });
    }

    await supabase.from('team_memberships').insert(teamMemberships);
    
    const registrations = teamMemberships.map(tm => ({
      player_id: tm.player_id,
      tournament_id: tournament.id,
      status: 'approved'
    }));
    await supabase.from('player_tournament_registrations').upsert(registrations, { onConflict: 'player_id, tournament_id' });

    console.log('  - ' + team.name + ' cargado con 12 jugadores. Suma puntajes: ' + scores.reduce((a,b)=>a+b,0));
  }

  console.log('Generando Fecha 1...');
  
  const matches = [];
  const teamA = teams.slice(0, 12);
  const teamB = teams.slice(12, 24);

  // Fecha 1 Zona A
  for (let i = 0; i < 6; i++) {
    matches.push({
      tournament_id: tournament.id,
      phase_id: phase.id,
      group_id: groupA.id,
      round_number: 1,
      match_date: new Date().toISOString().split('T')[0],
      match_time: '10:00',
      field_number: (i % 4) + 1,
      home_team_id: teamA[i].id,
      away_team_id: teamA[11 - i].id,
      status: 'played',
      home_score: Math.floor(Math.random() * 4),
      away_score: Math.floor(Math.random() * 4)
    });
  }

  // Fecha 1 Zona B
  for (let i = 0; i < 6; i++) {
    matches.push({
      tournament_id: tournament.id,
      phase_id: phase.id,
      group_id: groupB.id,
      round_number: 1,
      match_date: new Date().toISOString().split('T')[0],
      match_time: '11:30',
      field_number: (i % 4) + 1,
      home_team_id: teamB[i].id,
      away_team_id: teamB[11 - i].id,
      status: 'played',
      home_score: Math.floor(Math.random() * 4),
      away_score: Math.floor(Math.random() * 4)
    });
  }

  const { data: insertedMatches, error: matchErr } = await supabase.from('matches').insert(matches).select();
  if (matchErr) throw matchErr;

  console.log('Generando goles y tarjetas...');
  const goalsToInsert = [];
  const cardsToInsert = [];

  for (const m of insertedMatches) {
    const { data: homePlayers } = await supabase.from('team_memberships').select('player_id').eq('team_id', m.home_team_id);
    const { data: awayPlayers } = await supabase.from('team_memberships').select('player_id').eq('team_id', m.away_team_id);

    for (let i = 0; i < m.home_score; i++) {
      goalsToInsert.push({
        match_id: m.id,
        player_id: randomElement(homePlayers).player_id,
        team_id: m.home_team_id,
        minute: Math.floor(Math.random() * 90) + 1
      });
    }

    for (let i = 0; i < m.away_score; i++) {
      goalsToInsert.push({
        match_id: m.id,
        player_id: randomElement(awayPlayers).player_id,
        team_id: m.away_team_id,
        minute: Math.floor(Math.random() * 90) + 1
      });
    }

    if (Math.random() > 0.5) {
      cardsToInsert.push({
        match_id: m.id,
        player_id: randomElement(homePlayers).player_id,
        team_id: m.home_team_id,
        type: 'yellow',
        minute: Math.floor(Math.random() * 90) + 1
      });
    }
    if (Math.random() > 0.8) {
      cardsToInsert.push({
        match_id: m.id,
        player_id: randomElement(awayPlayers).player_id,
        team_id: m.away_team_id,
        type: 'blue',
        minute: Math.floor(Math.random() * 90) + 1
      });
    }
  }

  if (goalsToInsert.length) await supabase.from('match_goals').insert(goalsToInsert);
  if (cardsToInsert.length) await supabase.from('match_cards').insert(cardsToInsert);

  console.log('¡Seed finalizado exitosamente!');
}

seed().catch(console.error);
