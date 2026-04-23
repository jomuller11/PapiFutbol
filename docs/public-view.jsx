import React, { useState } from 'react';
import {
  Home, CalendarDays, Trophy, Users, BarChart3, Menu, ChevronLeft,
  ChevronRight, Share2, Copy, Clock, MapPin, Target, Square, Eye,
  Star, Flame, Zap, TrendingUp, Flag, Hash, Lock, Award, Shield,
  Link2, MessageCircle, X, ArrowRight, ArrowUp, ArrowDown, Minus,
  Play, Circle, Filter, Hand, ShieldCheck
} from 'lucide-react';

// ============ DATA MOCK ============
const TEAMS = [
  { id: 1, name: 'FC Boreal', short: 'BOR', color: '#ea580c', zone: 'A', pj: 3, pg: 3, pe: 0, pp: 0, gf: 11, gc: 2, pts: 9, avg: 13.1, trend: 'up' },
  { id: 2, name: 'Los Tigres', short: 'TIG', color: '#f59e0b', zone: 'A', pj: 3, pg: 2, pe: 1, pp: 0, gf: 7, gc: 3, pts: 7, avg: 11.2, trend: 'same' },
  { id: 3, name: 'Atlético Este', short: 'ATE', color: '#06b6d4', zone: 'A', pj: 3, pg: 1, pe: 0, pp: 2, gf: 5, gc: 8, pts: 3, avg: 10.8, trend: 'down' },
  { id: 4, name: 'Unión Norte', short: 'UNN', color: '#7c3aed', zone: 'B', pj: 3, pg: 2, pe: 0, pp: 1, gf: 8, gc: 4, pts: 6, avg: 12.3, trend: 'up' },
  { id: 5, name: 'Deportivo Oeste', short: 'DPO', color: '#059669', zone: 'B', pj: 3, pg: 2, pe: 1, pp: 0, gf: 6, gc: 2, pts: 7, avg: 11.6, trend: 'up' },
  { id: 6, name: 'Racing del Sur', short: 'RDS', color: '#dc2626', zone: 'B', pj: 3, pg: 1, pe: 1, pp: 1, gf: 4, gc: 5, pts: 4, avg: 10.5, trend: 'down' },
];

const SCORERS = [
  { id: 3, name: 'Lucas Morales', nickname: 'Luki', team: 'FC Boreal', teamColor: '#ea580c', pos: 'DEL', goals: 7, matches: 3, score: 15 },
  { id: 8, name: 'Joaquín Díaz', nickname: null, team: 'Unión Norte', teamColor: '#7c3aed', pos: 'DEL', goals: 5, matches: 3, score: 13 },
  { id: 4, name: 'Sebastián Ríos', nickname: 'Seba', team: 'FC Boreal', teamColor: '#ea580c', pos: 'MCO', goals: 4, matches: 3, score: 14 },
  { id: 12, name: 'Emiliano Sosa', nickname: null, team: 'Unión Norte', teamColor: '#7c3aed', pos: 'MCO', goals: 3, matches: 3, score: 13 },
  { id: 5, name: 'Diego Alvarez', nickname: 'Dieguito', team: 'Racing del Sur', teamColor: '#dc2626', pos: 'EXT', goals: 3, matches: 3, score: 12 },
];

const MATCHES = [
  { id: 1, round: 4, date: '2026-04-25', time: '10:00', field: 1, homeId: 2, awayId: 3, zone: 'A', status: 'upcoming' },
  { id: 2, round: 4, date: '2026-04-25', time: '10:00', field: 2, homeId: 1, awayId: 6, zone: 'A', status: 'upcoming' },
  { id: 3, round: 4, date: '2026-04-25', time: '10:00', field: 3, homeId: 4, awayId: 5, zone: 'B', status: 'upcoming' },
  { id: 4, round: 4, date: '2026-04-25', time: '10:00', field: 4, homeId: 6, awayId: 2, zone: 'B', status: 'upcoming' },
  { id: 7, round: 3, date: '2026-04-18', time: '10:00', field: 1, homeId: 2, awayId: 1, zone: 'A', status: 'played', homeScore: 1, awayScore: 3 },
  { id: 8, round: 3, date: '2026-04-18', time: '11:30', field: 2, homeId: 4, awayId: 6, zone: 'B', status: 'played', homeScore: 2, awayScore: 2 },
  { id: 9, round: 3, date: '2026-04-18', time: '13:00', field: 3, homeId: 3, awayId: 1, zone: 'A', status: 'played', homeScore: 0, awayScore: 4 },
  { id: 10, round: 3, date: '2026-04-18', time: '13:00', field: 4, homeId: 5, awayId: 4, zone: 'B', status: 'played', homeScore: 3, awayScore: 1 },
];

const FEED = [
  { id: 1, type: 'goal', icon: Flame, color: 'orange', title: 'Nuevo líder de goleadores', body: 'Lucas Morales llegó a 7 goles y se consagra el artillero del torneo.', time: 'Hace 3h', featured: true },
  { id: 2, type: 'result', icon: Trophy, color: 'blue', title: 'FC Boreal sigue invicto', body: 'Goleó 3-1 a Los Tigres y mantiene el puntaje ideal en la Zona A.', time: 'Hace 3h' },
  { id: 5, type: 'goalkeeper', icon: Shield, color: 'emerald', title: 'Valla menos vencida', body: 'Tomás Aguirre (FC Boreal) acumula 3 partidos sin goles en contra.', time: 'Hace 1d' },
  { id: 3, type: 'fixture', icon: CalendarDays, color: 'purple', title: 'Fecha 4 confirmada', body: 'Se juegan 6 partidos el sábado 25 en las 4 canchas del complejo.', time: 'Hace 1d' },
  { id: 4, type: 'milestone', icon: Star, color: 'amber', title: 'Primera tarjeta azul del torneo', body: 'Nicolás Herrera fue suspendido 5 min en el partido Racing vs. Unión.', time: 'Hace 2d' },
];

const getTeam = (id) => TEAMS.find(t => t.id === id);

// ============ MAIN APP ============
export default function PublicView() {
  const [device, setDevice] = useState('mobile'); // mobile | desktop

  return (
    <div className="min-h-screen bg-slate-100 p-0 sm:p-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <BaseStyles />
      <DeviceSwitcher device={device} setDevice={setDevice} />
      <div className={device === 'mobile' ? 'flex justify-center pt-12 pb-20 px-4 bg-slate-200' : 'bg-slate-50 pt-8'}>
        {device === 'mobile' ? <MobileFrame /> : <DesktopView />}
      </div>
    </div>
  );
}

function BaseStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800;9..144,900&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
      .font-display { font-family: 'Anton', sans-serif; letter-spacing: 0.01em; }
      .font-serif { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.02em; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      .stripe-bg {
        background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 12px);
      }
      .stadium-grid {
        background-image:
          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
        background-size: 32px 32px;
      }
      .noise {
        background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 3px 3px;
      }
      .hide-scroll::-webkit-scrollbar { display: none; }
      .hide-scroll { scrollbar-width: none; }
      .tilt { transform: rotate(-1.5deg); }
    `}</style>
  );
}

// ============ DEVICE SWITCHER ============
function DeviceSwitcher({ device, setDevice }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 text-xs">
      <span className="font-mono text-[10px] text-amber-800 uppercase tracking-widest font-bold">Demo vista pública · Ver en:</span>
      <div className="flex gap-1">
        <button onClick={() => setDevice('mobile')} className={`px-3 py-1 text-[11px] font-medium ${device === 'mobile' ? 'bg-amber-600 text-white' : 'bg-white border border-amber-200 text-amber-900'}`}>
          📱 Mobile (principal)
        </button>
        <button onClick={() => setDevice('desktop')} className={`px-3 py-1 text-[11px] font-medium ${device === 'desktop' ? 'bg-amber-600 text-white' : 'bg-white border border-amber-200 text-amber-900'}`}>
          🖥️ Desktop
        </button>
      </div>
    </div>
  );
}

// ============ MOBILE FRAME ============
function MobileFrame() {
  const [currentView, setCurrentView] = useState('home');
  const [ctx, setCtx] = useState({}); // para pasar datos entre vistas

  const go = (view, data = {}) => {
    setCurrentView(view);
    setCtx(data);
  };

  return (
    <div className="w-full max-w-[390px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-[10px] border-slate-900 relative" style={{ height: '844px' }}>
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-30" />

      {/* Status bar */}
      <div className="h-7 bg-white flex items-center justify-between px-6 pt-1 font-mono text-[10px] font-semibold">
        <span>9:41</span>
        <span className="flex gap-1 items-center">
          <span>📶</span><span>🔋</span>
        </span>
      </div>

      {/* Screen content */}
      <div className="h-[calc(100%-56px-28px)] overflow-y-auto bg-slate-50 hide-scroll">
        {currentView === 'home' && <MobileHome go={go} />}
        {currentView === 'fixture' && <MobileFixture go={go} />}
        {currentView === 'standings' && <MobileStandings go={go} />}
        {currentView === 'scorers' && <MobileScorers go={go} />}
        {currentView === 'more' && <MobileMore go={go} />}
        {currentView === 'match-detail' && <MobileMatchDetail match={ctx.match} go={go} />}
        {currentView === 'team-detail' && <MobileTeamDetail team={ctx.team} go={go} />}
        {currentView === 'player-detail' && <MobilePlayerDetail player={ctx.player} go={go} />}
        {currentView === 'bracket' && <MobileBracket go={go} />}
        {currentView === 'fairplay' && <MobileFairPlay go={go} />}
        {currentView === 'goalkeepers' && <MobileGoalkeepers go={go} />}
      </div>

      {/* Bottom nav */}
      <MobileTabBar currentView={currentView} go={go} />
    </div>
  );
}

// ============ MOBILE TAB BAR ============
function MobileTabBar({ currentView, go }) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'fixture', icon: CalendarDays, label: 'Fixture' },
    { id: 'standings', icon: Trophy, label: 'Tabla' },
    { id: 'scorers', icon: Target, label: 'Goles' },
    { id: 'more', icon: Menu, label: 'Más' },
  ];
  const matchesRoot = ['home', 'fixture', 'standings', 'scorers', 'more'];
  const activeTab = matchesRoot.includes(currentView) ? currentView : null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 flex items-center px-2 z-20">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className="flex-1 h-full flex flex-col items-center justify-center gap-0.5"
          >
            <Icon className={`w-5 h-5 ${active ? 'text-orange-500' : 'text-slate-400'}`} strokeWidth={active ? 2.5 : 1.75} />
            <span className={`text-[9px] font-medium ${active ? 'text-orange-500' : 'text-slate-500'}`}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============ MOBILE HEADER ============
function MobileHeader({ title, go, back }) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 h-12 flex items-center px-4 gap-3">
      {back && (
        <button onClick={() => go(back)} className="w-8 h-8 flex items-center justify-center -ml-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1 font-serif font-bold text-base truncate">{title}</div>
      <button className="w-8 h-8 flex items-center justify-center text-slate-500">
        <Share2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============ MOBILE HOME ============
function MobileHome({ go }) {
  const nextRound = MATCHES.filter(m => m.status === 'upcoming').slice(0, 4);
  const lastResults = MATCHES.filter(m => m.status === 'played').slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white p-5 pb-8 overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-40" />
        <div className="absolute inset-0 noise opacity-50" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-orange-500/20 rounded-full" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white flex items-center justify-center relative">
                <Trophy className="w-4 h-4 text-blue-900" strokeWidth={2.5} />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500" />
              </div>
              <div className="font-serif text-lg font-black leading-none">Liga<span className="text-orange-400">.</span>9</div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 backdrop-blur text-[9px] font-mono tracking-widest">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              EN JUEGO
            </div>
          </div>

          <div className="font-mono text-[10px] text-orange-400 tracking-[0.2em] font-bold mb-1">EDICIÓN 2026</div>
          <h1 className="font-display text-[44px] leading-[0.9] mb-3">APERTURA<br />2026</h1>

          <div className="flex items-center gap-3 text-xs text-blue-100">
            <div className="flex items-center gap-1"><Users className="w-3 h-3" /> 24 eq.</div>
            <div className="w-0.5 h-3 bg-white/20" />
            <div className="flex items-center gap-1"><Hash className="w-3 h-3" /> Fecha 4/12</div>
            <div className="w-0.5 h-3 bg-white/20" />
            <div className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> 25 ABR</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 px-4 -mt-4 relative z-10 mb-5">
        <QuickAction icon={Trophy} label="Tabla" color="bg-blue-900" onClick={() => go('standings')} />
        <QuickAction icon={Target} label="Goleadores" color="bg-orange-500" onClick={() => go('scorers')} />
        <QuickAction icon={Shield} label="Fair Play" color="bg-emerald-600" onClick={() => go('fairplay')} />
      </div>

      {/* Próxima fecha */}
      <SectionTitle title="Próxima fecha" sub="Sábado 25 de abril" actionLabel="Ver todo" onAction={() => go('fixture')} />
      <div className="px-4 mb-6">
        <div className="flex gap-3 overflow-x-auto hide-scroll -mx-4 px-4 pb-2">
          {nextRound.map(m => (
            <MatchCardHorizontal key={m.id} match={m} go={go} />
          ))}
        </div>
      </div>

      {/* Feed */}
      <SectionTitle title="Novedades" sub="Lo último del torneo" />
      <div className="px-4 space-y-3 mb-6">
        {FEED.map(item => <FeedCard key={item.id} item={item} />)}
      </div>

      {/* Resultados recientes */}
      <SectionTitle title="Últimos resultados" sub="Fecha 3" actionLabel="Ver todos" onAction={() => go('fixture')} />
      <div className="px-4 space-y-2 mb-6">
        {lastResults.map(m => <MatchRow key={m.id} match={m} go={go} />)}
      </div>

      {/* Top goleadores resumen */}
      <SectionTitle title="Artilleros" actionLabel="Ranking" onAction={() => go('scorers')} />
      <div className="px-4 mb-8">
        <div className="bg-white border border-slate-200 overflow-hidden">
          {SCORERS.slice(0, 3).map((s, i) => (
            <div key={s.id} onClick={() => go('player-detail', { player: s })} className="p-3 flex items-center gap-3 border-b border-slate-100 last:border-0 active:bg-slate-50">
              <div className={`w-8 h-8 font-display text-base flex items-center justify-center text-white ${
                i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{s.name}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5" style={{ background: s.teamColor }} />
                  {s.team}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl text-blue-900 leading-none">{s.goals}</div>
                <div className="font-mono text-[9px] text-slate-500 mt-0.5">GOLES</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }) {
  return (
    <button onClick={onClick} className={`${color} text-white p-3 flex flex-col items-start gap-1 active:scale-95 transition-transform shadow-md`}>
      <Icon className="w-4 h-4" />
      <span className="font-semibold text-xs">{label}</span>
    </button>
  );
}

function SectionTitle({ title, sub, actionLabel, onAction }) {
  return (
    <div className="px-4 mb-3 flex items-end justify-between">
      <div>
        <div className="font-display text-2xl leading-none text-slate-900">{title}</div>
        {sub && <div className="text-[11px] text-slate-500 mt-1 font-mono tracking-wide">{sub}</div>}
      </div>
      {actionLabel && (
        <button onClick={onAction} className="text-xs text-blue-700 font-semibold flex items-center gap-0.5">
          {actionLabel} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function MatchCardHorizontal({ match, go }) {
  const home = getTeam(match.homeId);
  const away = getTeam(match.awayId);
  return (
    <button onClick={() => go('match-detail', { match })} className="flex-shrink-0 w-48 bg-white border border-slate-200 p-3 text-left active:bg-slate-50">
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 tracking-widest mb-2">
        <span>CANCHA {match.field}</span>
        <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 font-bold">Z{match.zone}</span>
      </div>
      <div className="space-y-2">
        <TeamRow team={home} />
        <TeamRow team={away} />
      </div>
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
        <span className="font-mono text-slate-500"><Clock className="w-3 h-3 inline mr-1" />{match.time}</span>
        <span className="text-orange-600 font-semibold">25 ABR</span>
      </div>
    </button>
  );
}

function TeamRow({ team, score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 flex-shrink-0" style={{ background: team.color }} />
      <span className="text-xs font-medium flex-1 truncate">{team.name}</span>
      {score !== undefined && <span className="font-display text-base leading-none">{score}</span>}
    </div>
  );
}

function FeedCard({ item }) {
  const colors = {
    orange: 'bg-orange-500 text-white',
    blue: 'bg-blue-900 text-white',
    purple: 'bg-purple-600 text-white',
    amber: 'bg-amber-500 text-white',
    emerald: 'bg-emerald-600 text-white',
  };
  const Icon = item.icon;
  return (
    <div className={`bg-white border border-slate-200 ${item.featured ? 'border-orange-300' : ''} p-3 flex gap-3`}>
      <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center ${colors[item.color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm mb-0.5 leading-tight">{item.title}</div>
        <div className="text-[11px] text-slate-600 leading-snug">{item.body}</div>
        <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-wider">{item.time}</div>
      </div>
    </div>
  );
}

function MatchRow({ match, go }) {
  const home = getTeam(match.homeId);
  const away = getTeam(match.awayId);
  const homeWon = match.homeScore > match.awayScore;
  const awayWon = match.awayScore > match.homeScore;
  return (
    <button onClick={() => go('match-detail', { match })} className="w-full bg-white border border-slate-200 p-3 active:bg-slate-50">
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-widest mb-2">
        <span>FECHA {match.round} · Z{match.zone}</span>
        <span>{new Date(match.date).toLocaleDateString('es', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ background: home.color }} />
            <span className={`text-sm ${homeWon ? 'font-bold' : 'font-medium text-slate-600'}`}>{home.name}</span>
          </div>
          <span className={`font-display text-xl ${homeWon ? 'text-blue-900' : 'text-slate-400'}`}>{match.homeScore}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ background: away.color }} />
            <span className={`text-sm ${awayWon ? 'font-bold' : 'font-medium text-slate-600'}`}>{away.name}</span>
          </div>
          <span className={`font-display text-xl ${awayWon ? 'text-blue-900' : 'text-slate-400'}`}>{match.awayScore}</span>
        </div>
      </div>
    </button>
  );
}

// ============ MOBILE FIXTURE ============
function MobileFixture({ go }) {
  const [round, setRound] = useState(4);
  const [zone, setZone] = useState('all');

  let filtered = MATCHES.filter(m => m.round === round);
  if (zone !== 'all') filtered = filtered.filter(m => m.zone === zone);

  const byTime = {};
  filtered.forEach(m => { if (!byTime[m.time]) byTime[m.time] = []; byTime[m.time].push(m); });

  return (
    <div>
      <MobileHeader title="Fixture" go={go} />

      {/* Filtros */}
      <div className="bg-white border-b border-slate-200 p-3 space-y-2">
        {/* Fases */}
        <div className="flex gap-2 overflow-x-auto hide-scroll -mx-3 px-3">
          {['Grupos', 'Cuartos', 'Semi', 'Final'].map((f, i) => (
            <button key={f} className={`flex-shrink-0 px-3 py-1 text-[11px] font-semibold tracking-wide ${i === 0 ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {f}
              {i > 0 && <Lock className="w-2.5 h-2.5 inline ml-1" />}
            </button>
          ))}
        </div>
        {/* Fechas */}
        <div className="flex gap-1 overflow-x-auto hide-scroll -mx-3 px-3">
          {[1, 2, 3, 4, 5, 6, 7].map(r => (
            <button key={r} onClick={() => setRound(r)} className={`flex-shrink-0 w-8 h-8 font-display text-sm ${round === r ? 'bg-orange-500 text-white' : r < 4 ? 'bg-slate-100 text-slate-600' : 'bg-white border border-slate-200 text-slate-400'}`}>
              {r}
            </button>
          ))}
        </div>
        {/* Zonas */}
        <div className="flex gap-1 text-[10px] font-mono tracking-wider">
          {['all', 'A', 'B'].map(z => (
            <button key={z} onClick={() => setZone(z)} className={`px-2 py-0.5 ${zone === z ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {z === 'all' ? 'TODAS' : `ZONA ${z}`}
            </button>
          ))}
        </div>
      </div>

      {/* Partidos por horario */}
      <div className="p-4 space-y-5">
        {Object.entries(byTime).map(([time, matches]) => (
          <div key={time}>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-500 text-white px-2 py-1 font-mono font-bold text-[11px]">{time}</div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="space-y-2">
              {matches.map(m => (
                m.status === 'played' ? <MatchRow key={m.id} match={m} go={go} /> : <MatchUpcomingRow key={m.id} match={m} go={go} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchUpcomingRow({ match, go }) {
  const home = getTeam(match.homeId);
  const away = getTeam(match.awayId);
  return (
    <button onClick={() => go('match-detail', { match })} className="w-full bg-white border border-slate-200 p-3 active:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="text-center w-14 flex-shrink-0">
          <div className="font-display text-xl leading-none">{match.field}</div>
          <div className="font-mono text-[9px] text-slate-500 mt-1 tracking-widest">CANCHA</div>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ background: home.color }} />
            <span className="text-sm font-semibold">{home.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ background: away.color }} />
            <span className="text-sm font-semibold">{away.name}</span>
          </div>
        </div>
        <div className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 font-bold">Z{match.zone}</div>
      </div>
    </button>
  );
}

// ============ MOBILE STANDINGS ============
function MobileStandings({ go }) {
  const [zone, setZone] = useState('A');
  const teams = TEAMS.filter(t => t.zone === zone).sort((a, b) => b.pts - a.pts);
  return (
    <div>
      <MobileHeader title="Tabla de posiciones" go={go} />

      <div className="bg-white border-b border-slate-200 p-3 flex gap-1">
        {['A', 'B'].map(z => (
          <button key={z} onClick={() => setZone(z)} className={`flex-1 py-2 font-display text-base ${zone === z ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
            ZONA {z}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2">
        {/* Leyenda */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-1 px-1">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500" />Clasifica</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500" />Repechaje</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-300" />Eliminado</div>
        </div>

        {teams.map((t, i) => {
          const status = i < 2 ? 'clasifica' : i === 2 ? 'repechaje' : 'eliminado';
          return (
            <button
              key={t.id}
              onClick={() => go('team-detail', { team: t })}
              className="w-full bg-white border border-slate-200 flex items-center gap-3 active:bg-slate-50 overflow-hidden"
            >
              {/* Ranking badge */}
              <div className={`w-12 h-full self-stretch flex items-center justify-center font-display text-xl text-white ${
                i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-600' : 'bg-slate-300'
              }`} style={{ minHeight: '68px' }}>
                {i + 1}
              </div>

              {/* Info principal */}
              <div className="flex-1 py-3 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 flex-shrink-0" style={{ background: t.color }} />
                  <div className="font-semibold text-sm truncate">{t.name}</div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-mono">{t.pj} PJ</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-emerald-600">{t.pg}G</span>
                  <span className="font-mono text-slate-400">{t.pe}E</span>
                  <span className="font-mono text-red-500">{t.pp}P</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono">{t.gf > t.gc ? '+' : ''}{t.gf - t.gc}</span>
                </div>
              </div>

              {/* Tendencia */}
              <div className="flex items-center">
                {t.trend === 'up' && <ArrowUp className="w-4 h-4 text-emerald-500" />}
                {t.trend === 'down' && <ArrowDown className="w-4 h-4 text-red-500" />}
                {t.trend === 'same' && <Minus className="w-4 h-4 text-slate-300" />}
              </div>

              {/* Puntos */}
              <div className="pr-4 text-right">
                <div className="font-display text-2xl text-blue-900 leading-none">{t.pts}</div>
                <div className="font-mono text-[9px] text-slate-400 mt-1">PTS</div>
              </div>

              {/* Barra de status a la derecha */}
              <div className={`w-1 self-stretch ${
                status === 'clasifica' ? 'bg-emerald-500' : status === 'repechaje' ? 'bg-amber-500' : 'bg-slate-300'
              }`} style={{ minHeight: '68px' }} />
            </button>
          );
        })}

        {/* Stats de la zona */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <MiniStat label="Goles" value={teams.reduce((a, t) => a + t.gf, 0)} color="orange" />
          <MiniStat label="Partidos" value={teams.reduce((a, t) => a + t.pj, 0) / 2} color="blue" />
          <MiniStat label="Equipos" value={teams.length} color="emerald" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  const colors = { orange: 'text-orange-500', blue: 'text-blue-900', emerald: 'text-emerald-600' };
  return (
    <div className="bg-white border border-slate-200 p-3 text-center">
      <div className={`font-display text-2xl leading-none ${colors[color]}`}>{value}</div>
      <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

// ============ MOBILE SCORERS ============
function MobileScorers({ go }) {
  return (
    <div>
      <MobileHeader title="Goleadores" go={go} />

      {/* Top 3 podio */}
      <div className="bg-gradient-to-b from-blue-900 to-blue-950 text-white px-4 pt-6 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="relative">
          <div className="font-mono text-[10px] text-orange-400 tracking-widest font-bold mb-1 text-center">PIE DE ORO · 2026</div>
          <div className="font-display text-2xl text-center mb-5">TABLA DE ARTILLEROS</div>

          <div className="grid grid-cols-3 gap-2 items-end">
            {[SCORERS[1], SCORERS[0], SCORERS[2]].map((s, i) => {
              const positions = [2, 1, 3];
              const heights = ['h-16', 'h-20', 'h-12'];
              const pos = positions[i];
              return (
                <button key={s.id} onClick={() => go('player-detail', { player: s })} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-white mb-2 flex items-center justify-center font-display text-blue-900 text-lg">
                    {(s.nickname || s.name).split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="text-xs font-semibold text-center leading-tight">{s.name}</div>
                  <div className="text-[10px] text-blue-200 mb-2">{s.team}</div>
                  <div className={`w-full ${heights[i]} flex flex-col items-center justify-center ${pos === 1 ? 'bg-orange-500' : pos === 2 ? 'bg-slate-300 text-slate-900' : 'bg-amber-700'}`}>
                    <div className="font-display text-2xl">{pos}°</div>
                    <div className="font-mono text-[10px]">{s.goals} GOLES</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista completa */}
      <div className="p-3 space-y-2">
        {SCORERS.map((s, i) => (
          <button key={s.id} onClick={() => go('player-detail', { player: s })} className="w-full bg-white border border-slate-200 p-3 flex items-center gap-3 active:bg-slate-50">
            <div className={`w-9 h-9 font-display text-lg flex items-center justify-center ${
              i === 0 ? 'bg-orange-500 text-white' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100'
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-semibold text-sm">{s.name} {s.nickname && <span className="text-slate-400 text-xs">"{s.nickname}"</span>}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-1.5 h-1.5" style={{ background: s.teamColor }} />
                {s.team}
                <span>·</span>
                <span className="font-mono">{s.pos}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-xl text-blue-900 leading-none">{s.goals}</div>
              <div className="font-mono text-[9px] text-slate-400 mt-1">{(s.goals / s.matches).toFixed(1)} por pj</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ MOBILE MORE ============
function MobileMore({ go }) {
  const items = [
    { icon: Shield, label: 'Fair Play', sub: 'Ranking de equipos más limpios', action: () => go('fairplay') },
    { icon: ShieldCheck, label: 'Valla menos vencida', sub: 'Arqueros con menos goles en contra', action: () => go('goalkeepers') },
    { icon: Trophy, label: 'Bracket / Eliminatorias', sub: 'Se habilita al terminar la fase de grupos', locked: true, action: () => go('bracket') },
    { icon: Users, label: 'Equipos', sub: 'Todos los planteles del torneo' },
    { icon: Target, label: 'Estadísticas del torneo', sub: 'Goles, tarjetas, récords' },
    { icon: CalendarDays, label: 'Reglamento', sub: 'Fair play, tarjetas, torneo' },
  ];
  return (
    <div>
      <MobileHeader title="Más" />
      <div className="p-4 space-y-3">
        <div className="bg-gradient-to-br from-blue-900 to-blue-950 text-white p-5 relative overflow-hidden">
          <div className="absolute inset-0 stadium-grid opacity-20" />
          <div className="relative">
            <div className="font-mono text-[10px] text-orange-400 tracking-widest font-bold mb-1">APERTURA 2026</div>
            <div className="font-display text-2xl mb-2">LIGA.9</div>
            <div className="text-xs text-blue-200">Fútbol 9 · 24 equipos · 288 jugadores</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <button key={i} onClick={it.action} className="w-full p-4 flex items-center gap-3 border-b border-slate-100 last:border-0 active:bg-slate-50 text-left">
                <div className={`w-9 h-9 flex items-center justify-center ${it.locked ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {it.label}
                    {it.locked && <Lock className="w-3 h-3 text-slate-400" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{it.sub}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            );
          })}
        </div>

        {/* Share */}
        <ShareButtons />
      </div>
    </div>
  );
}

function ShareButtons() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-white border border-slate-200 p-4">
      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-3">Compartir torneo</div>
      <div className="grid grid-cols-2 gap-2">
        <button className="bg-emerald-500 text-white p-3 flex items-center justify-center gap-2 text-sm font-semibold">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </button>
        <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={`p-3 flex items-center justify-center gap-2 text-sm font-semibold border ${copied ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-700'}`}>
          {copied ? <><Copy className="w-4 h-4" /> ¡Copiado!</> : <><Link2 className="w-4 h-4" /> Copiar link</>}
        </button>
      </div>
    </div>
  );
}

// ============ MOBILE MATCH DETAIL ============
function MobileMatchDetail({ match, go }) {
  if (!match) match = MATCHES[4]; // default
  const home = getTeam(match.homeId);
  const away = getTeam(match.awayId);
  const isPlayed = match.status === 'played';

  return (
    <div>
      <MobileHeader title={`${home.short} vs ${away.short}`} go={go} back="fixture" />

      {/* Hero marcador */}
      <div className="relative text-white p-5 pb-6" style={{
        background: `linear-gradient(135deg, ${home.color}dd 0%, #0f172a 50%, ${away.color}dd 100%)`
      }}>
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="relative">
          <div className="flex items-center justify-center gap-3 text-[10px] font-mono tracking-widest mb-4">
            <span className="bg-white/10 px-2 py-0.5">FASE GRUPOS</span>
            <span>FECHA {match.round}</span>
            <span className="bg-white/10 px-2 py-0.5">ZONA {match.zone}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center font-display text-3xl" style={{ background: home.color }}>
                {home.short}
              </div>
              <div className="font-serif font-bold text-sm">{home.name}</div>
            </div>
            <div className="text-center">
              {isPlayed ? (
                <div className="font-display text-5xl leading-none">
                  {match.homeScore}<span className="text-white/30 mx-2">–</span>{match.awayScore}
                </div>
              ) : (
                <div className="font-display text-3xl leading-none text-white/60">VS</div>
              )}
              <div className="font-mono text-[10px] mt-2 text-white/60">
                {isPlayed ? 'FINAL' : match.time}
              </div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center font-display text-3xl" style={{ background: away.color }}>
                {away.short}
              </div>
              <div className="font-serif font-bold text-sm">{away.name}</div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-[10px] text-white/70 font-mono">
            <span><Clock className="w-3 h-3 inline mr-1" />{match.time}</span>
            <span><MapPin className="w-3 h-3 inline mr-1" />Cancha {match.field}</span>
            <span><CalendarDays className="w-3 h-3 inline mr-1" />25 ABR</span>
          </div>
        </div>
      </div>

      {isPlayed ? (
        <div className="p-4 space-y-4">
          {/* Goleadores */}
          <div className="bg-white border border-slate-200">
            <SectionHeader icon={Target} title="Goles" color="orange" />
            <div className="divide-y divide-slate-100">
              <GoalRow name="Lucas Morales" team={away} min={23} />
              <GoalRow name="Lucas Morales" team={away} min={67} />
              <GoalRow name="Joaquín Díaz" team={home} min={45} />
            </div>
          </div>

          {/* Tarjetas */}
          <div className="bg-white border border-slate-200">
            <SectionHeader icon={Square} title="Tarjetas" color="yellow" />
            <div className="divide-y divide-slate-100">
              <CardRow name="Rodrigo Pérez" team={home} min={34} color="yellow" />
              <CardRow name="Nicolás Herrera" team={home} min={12} color="blue" />
            </div>
          </div>

          {/* Ficha */}
          <div className="bg-white border border-slate-200 p-4">
            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-3">Datos del partido</div>
            <div className="space-y-2 text-sm">
              <Row label="Veedor" value="FC Boreal" />
              <Row label="Estadio" value="Complejo Marista" />
              <Row label="Observaciones" value="Sin incidentes" />
            </div>
          </div>

          <ShareButtons />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="bg-white border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Veedor asignado</div>
              <div className="text-sm font-semibold">FC Boreal</div>
            </div>
          </div>

          <button className="w-full bg-orange-500 text-white py-3 font-semibold text-sm flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Avisame cuando empiece
          </button>

          <ShareButtons />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color }) {
  const colors = { orange: 'text-orange-500', yellow: 'text-yellow-600', blue: 'text-blue-700' };
  return (
    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
      <Icon className={`w-4 h-4 ${colors[color]}`} />
      <h3 className="font-display text-base">{title}</h3>
    </div>
  );
}

function GoalRow({ name, team, min }) {
  return (
    <div className="px-4 py-2.5 flex items-center gap-3 text-sm">
      <div className="w-8 text-center font-mono text-[10px] bg-slate-100 py-0.5">{min}'</div>
      <span className="font-semibold">{name}</span>
      <span className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
        <div className="w-2 h-2" style={{ background: team.color }} />
        {team.short}
      </span>
    </div>
  );
}

function CardRow({ name, team, min, color }) {
  const colors = { yellow: 'bg-yellow-400', red: 'bg-red-500', blue: 'bg-sky-400' };
  return (
    <div className="px-4 py-2.5 flex items-center gap-3 text-sm">
      <div className="w-8 text-center font-mono text-[10px] bg-slate-100 py-0.5">{min}'</div>
      <div className={`w-3 h-4 ${colors[color]}`} />
      <span className="font-semibold">{name}</span>
      <span className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
        <div className="w-2 h-2" style={{ background: team.color }} />
        {team.short}
      </span>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// ============ MOBILE TEAM DETAIL ============
function MobileTeamDetail({ team, go }) {
  if (!team) team = TEAMS[0];
  const plantel = SCORERS.filter(s => s.team === team.name);
  // completar con más jugadores ficticios
  while (plantel.length < 12) {
    plantel.push({
      id: 100 + plantel.length,
      name: ['Diego Sanz', 'Marco Ruiz', 'Kevin Luna', 'Adrián Paz', 'Tomás Vera', 'Iván Luna', 'Gonzalo Ríos', 'Leo Gómez', 'Ariel Sosa', 'Bruno Paz'][plantel.length],
      nickname: null,
      team: team.name,
      teamColor: team.color,
      pos: ['ARQ','DFC','LAT','MCC','MCO','EXT','DEL'][plantel.length % 7],
      goals: Math.floor(Math.random() * 3),
      matches: 3,
      score: 8 + Math.floor(Math.random() * 5)
    });
  }

  return (
    <div>
      <MobileHeader title={team.name} go={go} />

      {/* Hero */}
      <div className="relative text-white p-5 pb-8 overflow-hidden" style={{ background: `linear-gradient(135deg, ${team.color} 0%, #0f172a 100%)` }}>
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-white text-slate-900 font-display text-3xl flex items-center justify-center flex-shrink-0">
              {team.short}
            </div>
            <div>
              <div className="font-mono text-[10px] text-white/70 tracking-widest">ZONA {team.zone}</div>
              <div className="font-serif font-bold text-2xl leading-tight">{team.name}</div>
              <div className="text-xs text-white/80 mt-1">1° en la zona · {team.pts} pts</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <TeamStat value={team.pj} label="PJ" />
            <TeamStat value={team.pg} label="PG" />
            <TeamStat value={`${team.gf}-${team.gc}`} label="GF-GC" />
            <TeamStat value={team.avg} label="PROM" accent />
          </div>
        </div>
      </div>

      {/* Plantel */}
      <div className="p-4">
        <SectionTitle title={`Plantel · ${plantel.length}`} />
        <div className="bg-white border border-slate-200 overflow-hidden">
          {plantel.slice(0, 12).map(p => (
            <button key={p.id} onClick={() => go('player-detail', { player: p })} className="w-full p-3 flex items-center gap-3 border-b border-slate-100 last:border-0 active:bg-slate-50">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold">
                {(p.nickname || p.name).split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-semibold text-sm truncate">{p.name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="font-mono bg-slate-100 px-1 py-0">{p.pos}</span>
                  {p.nickname && <span>"{p.nickname}"</span>}
                </div>
              </div>
              {p.goals > 0 && (
                <div className="flex items-center gap-1 text-orange-500 text-xs font-semibold">
                  <Target className="w-3 h-3" /> {p.goals}
                </div>
              )}
              <div className="font-display text-sm text-blue-900 w-8 text-right">{p.score}</div>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <ShareButtons />
        </div>
      </div>
    </div>
  );
}

function TeamStat({ value, label, accent }) {
  return (
    <div>
      <div className={`font-display text-2xl leading-none ${accent ? 'text-orange-400' : ''}`}>{value}</div>
      <div className="font-mono text-[9px] text-white/60 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

// ============ MOBILE PLAYER DETAIL ============
function MobilePlayerDetail({ player, go }) {
  if (!player) player = SCORERS[0];
  const team = TEAMS.find(t => t.name === player.team);

  return (
    <div>
      <MobileHeader title={player.name} go={go} />

      {/* Hero */}
      <div className="relative text-white p-5 pb-8 overflow-hidden" style={{ background: `linear-gradient(135deg, ${player.teamColor} 0%, #0f172a 100%)` }}>
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="absolute top-4 right-4 font-display text-7xl text-white/10 leading-none">
          {SCORERS.findIndex(s => s.id === player.id) + 1}°
        </div>
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-white text-slate-900 font-display text-3xl flex items-center justify-center mb-3">
            {(player.nickname || player.name).split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="font-mono text-[10px] text-white/70 tracking-widest mb-1">{player.pos}</div>
          <div className="font-serif font-bold text-2xl leading-tight">{player.name}</div>
          {player.nickname && <div className="text-xs text-white/80">"{player.nickname}"</div>}

          <button onClick={() => team && go('team-detail', { team })} className="mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur px-2.5 py-1 text-xs">
            <div className="w-2 h-2" style={{ background: player.teamColor }} />
            <span className="font-medium">{player.team}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Stats grandes */}
      <div className="p-4 -mt-4 relative z-10">
        <div className="bg-white border border-slate-200 grid grid-cols-4 divide-x divide-slate-100">
          <BigStat value={player.goals} label="Goles" color="orange" />
          <BigStat value={player.matches} label="PJ" />
          <BigStat value={(player.goals / player.matches).toFixed(1)} label="G/PJ" />
          <BigStat value={`${player.score}`} sub="/15" label="Puntaje" color="blue" />
        </div>
      </div>

      {/* Disciplina + desglose */}
      <div className="px-4 space-y-4">
        <div className="bg-white border border-slate-200 p-4">
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-3">Fair play</div>
          <div className="grid grid-cols-3 gap-2">
            <CardStat color="yellow" value={0} label="Amarillas" />
            <CardStat color="blue" value={0} label="Azules" />
            <CardStat color="red" value={0} label="Rojas" />
          </div>
        </div>

        {/* Goles por fecha */}
        <div className="bg-white border border-slate-200 p-4">
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-3">Goles por fecha</div>
          <div className="flex items-end gap-2 h-24">
            {[2, 3, 2, 0, 0].map((g, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="font-display text-sm text-blue-900">{g || '-'}</div>
                <div className={`w-full ${g > 0 ? 'bg-orange-500' : 'border border-dashed border-slate-200'}`} style={{ height: `${g ? (g / 3) * 100 : 8}%`, minHeight: g > 0 ? '8px' : '8px' }} />
                <div className="font-mono text-[9px] text-slate-400">F{i + 1}</div>
              </div>
            ))}
          </div>
        </div>

        <ShareButtons />
      </div>
    </div>
  );
}

function BigStat({ value, sub, label, color }) {
  const colors = { orange: 'text-orange-500', blue: 'text-blue-900' };
  return (
    <div className="p-3 text-center">
      <div className={`font-display text-3xl leading-none ${colors[color] || 'text-slate-900'}`}>
        {value}{sub && <span className="text-sm text-slate-400">{sub}</span>}
      </div>
      <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mt-2">{label}</div>
    </div>
  );
}

function CardStat({ color, value, label }) {
  const bg = { yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200', blue: 'bg-sky-50 text-sky-800 border-sky-200', red: 'bg-red-50 text-red-800 border-red-200' };
  const sq = { yellow: 'bg-yellow-400', blue: 'bg-sky-400', red: 'bg-red-500' };
  return (
    <div className={`border p-2 text-center ${bg[color]}`}>
      <div className={`w-3 h-4 ${sq[color]} mx-auto mb-1`} />
      <div className="font-display text-xl leading-none">{value}</div>
      <div className="font-mono text-[9px] uppercase mt-1 opacity-70">{label}</div>
    </div>
  );
}

// ============ MOBILE BRACKET (LOCKED) ============
function MobileBracket({ go }) {
  return (
    <div>
      <MobileHeader title="Eliminatorias" go={go} back="more" />
      <div className="p-8 text-center">
        <div className="w-20 h-20 bg-slate-100 border-2 border-dashed border-slate-300 rounded-full mx-auto mb-5 flex items-center justify-center">
          <Lock className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
        </div>
        <div className="font-mono text-[10px] text-slate-500 tracking-widest mb-2">BRACKET BLOQUEADO</div>
        <h2 className="font-serif font-bold text-xl mb-3">Se habilita al terminar grupos</h2>
        <p className="text-sm text-slate-600 max-w-xs mx-auto">
          Cuando se jueguen las 5 fechas de la fase de grupos, se habilita la llave de eliminatorias con los clasificados.
        </p>

        {/* Progreso */}
        <div className="mt-8 bg-white border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-mono text-slate-500 tracking-widest">FASE DE GRUPOS</span>
            <span className="font-semibold">3/5</span>
          </div>
          <div className="w-full h-2 bg-slate-100">
            <div className="h-full bg-orange-500" style={{ width: '60%' }} />
          </div>
          <div className="mt-3 text-[11px] text-slate-500">Falta completar 2 fechas para liberar el bracket.</div>
        </div>

        <div className="mt-6">
          <div className="font-mono text-[10px] text-slate-500 tracking-widest mb-3">ASÍ SE VERÁ</div>
          <div className="opacity-30 pointer-events-none">
            <BracketPreview />
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketPreview() {
  return (
    <div className="flex gap-3 text-[9px]">
      {['Cuartos', 'Semis', 'Final'].map((f, i) => (
        <div key={f} className="flex-1">
          <div className="font-mono text-slate-500 mb-2 text-center">{f}</div>
          {Array.from({ length: 4 / Math.pow(2, i) }).map((_, j) => (
            <div key={j} className="mb-2 border border-slate-300 bg-white p-1.5" style={{ height: `${24 + i * 32}px` }}>
              <div className="h-2 bg-slate-200 mb-1" />
              <div className="h-2 bg-slate-200" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============ MOBILE FAIR PLAY ============
function MobileFairPlay({ go }) {
  const teams = [...TEAMS].map((t, i) => ({ ...t, fp: 3 + i * 2, yc: 2 + i, bc: Math.floor(i / 2), rc: 0 })).sort((a, b) => a.fp - b.fp);

  return (
    <div>
      <MobileHeader title="Fair Play" go={go} back="more" />
      <div className="p-4 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 p-4 text-center">
          <Award className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <div className="font-serif font-bold text-base">Premio al Fair Play</div>
          <div className="text-xs text-slate-600 mt-1">Al cierre del torneo, el equipo con menos puntos de fair play se lleva un premio especial.</div>
        </div>

        <div className="bg-white border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Ranking · Menos puntos, mejor</div>
          {teams.map((t, i) => (
            <div key={t.id} className="px-3 py-3 flex items-center gap-3 border-b border-slate-100 last:border-0">
              <div className="w-7 h-7 bg-slate-100 flex items-center justify-center font-display text-base">{i + 1}</div>
              <div className="w-3 h-3" style={{ background: t.color }} />
              <div className="flex-1 text-sm font-semibold">{t.name}</div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-3 bg-yellow-400" title="Amarillas" />
                <span className="text-xs font-mono w-3">{t.yc}</span>
                <div className="w-2 h-3 bg-sky-400 ml-1" title="Azules" />
                <span className="text-xs font-mono w-3">{t.bc}</span>
                <div className="w-2 h-3 bg-red-500 ml-1" title="Rojas" />
                <span className="text-xs font-mono w-3">{t.rc}</span>
              </div>
              <div className="font-display text-lg text-emerald-700 w-8 text-right">{t.fp}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ MOBILE GOALKEEPERS (Valla menos vencida) ============
function MobileGoalkeepers({ go }) {
  const goalkeepers = [
    { id: 9, name: 'Tomás Aguirre', nickname: null, team: 'FC Boreal', teamColor: '#ea580c', matches: 3, goalsAgainst: 0, cleanSheets: 3 },
    { id: 1, name: 'Matías Fernández', nickname: 'Mati', team: 'Los Tigres', teamColor: '#f59e0b', matches: 3, goalsAgainst: 3, cleanSheets: 1 },
    { id: 17, name: 'Ezequiel Torres', nickname: null, team: 'Unión Norte', teamColor: '#7c3aed', matches: 3, goalsAgainst: 4, cleanSheets: 1 },
    { id: 30, name: 'Rodrigo Suárez', nickname: null, team: 'Deportivo Oeste', teamColor: '#059669', matches: 3, goalsAgainst: 4, cleanSheets: 0 },
    { id: 31, name: 'Alan Castro', nickname: null, team: 'Racing del Sur', teamColor: '#dc2626', matches: 3, goalsAgainst: 5, cleanSheets: 0 },
    { id: 32, name: 'Leandro Ponce', nickname: 'Lea', team: 'Atlético Este', teamColor: '#06b6d4', matches: 3, goalsAgainst: 8, cleanSheets: 0 },
  ];

  return (
    <div>
      <MobileHeader title="Valla menos vencida" go={go} back="more" />

      {/* Podio */}
      <div className="bg-gradient-to-b from-emerald-800 to-emerald-950 text-white px-4 pt-6 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="relative">
          <div className="font-mono text-[10px] text-emerald-300 tracking-widest font-bold mb-1 text-center">GUANTES DORADOS · 2026</div>
          <div className="font-display text-2xl text-center mb-5">ARQUEROS INVENCIBLES</div>

          <div className="grid grid-cols-3 gap-2 items-end">
            {[goalkeepers[1], goalkeepers[0], goalkeepers[2]].map((g, i) => {
              const positions = [2, 1, 3];
              const heights = ['h-16', 'h-20', 'h-12'];
              const pos = positions[i];
              return (
                <div key={g.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-white mb-2 flex items-center justify-center font-display text-emerald-900 text-lg">
                    {(g.nickname || g.name).split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="text-xs font-semibold text-center leading-tight">{g.name}</div>
                  <div className="text-[10px] text-emerald-200 mb-2">{g.team}</div>
                  <div className={`w-full ${heights[i]} flex flex-col items-center justify-center ${pos === 1 ? 'bg-orange-500' : pos === 2 ? 'bg-slate-300 text-slate-900' : 'bg-amber-700'}`}>
                    <div className="font-display text-2xl">{pos}°</div>
                    <div className="font-mono text-[10px]">{g.goalsAgainst} GC</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center text-[10px] text-emerald-200 font-mono">
            ORDENADO POR GOLES EN CONTRA (MENOS = MEJOR)
          </div>
        </div>
      </div>

      {/* Lista completa */}
      <div className="p-3 space-y-2">
        {goalkeepers.map((g, i) => (
          <div key={g.id} className="w-full bg-white border border-slate-200 p-3 flex items-center gap-3">
            <div className={`w-9 h-9 font-display text-lg flex items-center justify-center ${
              i === 0 ? 'bg-orange-500 text-white' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100'
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-semibold text-sm">{g.name} {g.nickname && <span className="text-slate-400 text-xs">"{g.nickname}"</span>}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-1.5 h-1.5" style={{ background: g.teamColor }} />
                {g.team}
                <span>·</span>
                <span>{g.cleanSheets} vallas invictas</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-xl text-emerald-700 leading-none">{g.goalsAgainst}</div>
              <div className="font-mono text-[9px] text-slate-400 mt-1">GC en {g.matches} PJ</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ DESKTOP VIEW (simplified) ============
function DesktopView() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Nav superior */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-900 flex items-center justify-center relative">
              <Trophy className="w-5 h-5 text-white" strokeWidth={2.5} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500" />
            </div>
            <div className="font-serif text-xl font-black text-blue-900">Liga<span className="text-orange-500">.</span>9</div>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a className="text-orange-500 font-semibold">Home</a>
            <a className="text-slate-600 hover:text-slate-900">Fixture</a>
            <a className="text-slate-600 hover:text-slate-900">Posiciones</a>
            <a className="text-slate-600 hover:text-slate-900">Goleadores</a>
            <a className="text-slate-600 hover:text-slate-900">Fair Play</a>
            <a className="text-slate-600 hover:text-slate-900 opacity-50 flex items-center gap-1"><Lock className="w-3 h-3" /> Bracket</a>
            <button className="bg-blue-900 text-white px-4 py-2 text-xs font-semibold">Ingresar</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="absolute inset-0 noise opacity-40" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-orange-500/20 rounded-full" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />

        <div className="relative max-w-6xl mx-auto px-8 py-16 grid grid-cols-2 gap-8 items-center">
          <div>
            <div className="font-mono text-[11px] text-orange-400 tracking-[0.3em] font-bold mb-3">EDICIÓN 2026 · EN CURSO</div>
            <h1 className="font-display text-8xl leading-[0.85] mb-5">APERTURA<br />2026</h1>
            <p className="text-blue-100 text-lg mb-6 max-w-md">El torneo de fútbol 9 del colegio. 24 equipos, 288 jugadores, 12 fechas de pura intensidad.</p>
            <div className="flex items-center gap-3">
              <button className="bg-orange-500 text-white px-5 py-3 font-semibold hover:bg-orange-600 flex items-center gap-2">
                <Play className="w-4 h-4" /> Ver próxima fecha
              </button>
              <button className="border border-white/20 text-white px-5 py-3 font-semibold hover:bg-white/10">
                Tabla de posiciones
              </button>
            </div>
          </div>

          {/* Mini scoreboard */}
          <div className="bg-white/5 backdrop-blur border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-[10px] text-orange-400 tracking-widest font-bold">PRÓXIMA FECHA</div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono bg-white/10 px-2 py-0.5">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                SÁB 25 ABR
              </div>
            </div>
            <div className="space-y-2">
              {MATCHES.filter(m => m.status === 'upcoming').slice(0, 4).map(m => {
                const h = getTeam(m.homeId), a = getTeam(m.awayId);
                return (
                  <div key={m.id} className="bg-white/5 p-2.5 flex items-center gap-3 text-xs">
                    <div className="font-mono text-white/50">{m.time}</div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-2 h-2" style={{ background: h.color }} />
                      <span className="flex-1 truncate">{h.name}</span>
                      <span className="text-white/40 font-mono">vs</span>
                      <span className="flex-1 truncate text-right">{a.name}</span>
                      <div className="w-2 h-2" style={{ background: a.color }} />
                    </div>
                    <div className="font-mono text-[9px] bg-white/10 px-1.5 py-0.5">C{m.field}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Feed + top goleadores */}
      <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="font-mono text-[10px] text-orange-600 tracking-widest font-bold">EL TORNEO HOY</div>
              <h2 className="font-display text-4xl">Novedades</h2>
            </div>
          </div>
          <div className="space-y-3">
            {FEED.map(item => <FeedCard key={item.id} item={item} />)}
          </div>
        </div>
        <div>
          <div className="mb-5">
            <div className="font-mono text-[10px] text-orange-600 tracking-widest font-bold">PIE DE ORO</div>
            <h2 className="font-display text-4xl">Artilleros</h2>
          </div>
          <div className="bg-white border border-slate-200">
            {SCORERS.slice(0, 5).map((s, i) => (
              <div key={s.id} className="p-3 flex items-center gap-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <div className={`w-8 h-8 font-display flex items-center justify-center ${i === 0 ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-500">{s.team}</div>
                </div>
                <div className="font-display text-2xl text-blue-900">{s.goals}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de posiciones */}
      <div className="max-w-6xl mx-auto px-8 pb-16">
        <div className="mb-5">
          <div className="font-mono text-[10px] text-orange-600 tracking-widest font-bold">CLASIFICACIÓN</div>
          <h2 className="font-display text-4xl">Posiciones</h2>
        </div>
        <div className="grid grid-cols-2 gap-6">
          {['A', 'B'].map(z => (
            <div key={z} className="bg-white border border-slate-200">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="font-display text-lg">ZONA {z}</div>
                <a className="text-xs text-blue-700 font-semibold">Ver completa →</a>
              </div>
              <table className="w-full text-sm">
                <thead className="text-[10px] font-mono text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left py-2">Equipo</th>
                    <th className="text-center py-2">PJ</th>
                    <th className="text-center py-2">DG</th>
                    <th className="text-center py-2 px-5">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {TEAMS.filter(t => t.zone === z).sort((a, b) => b.pts - a.pts).map((t, i) => (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 font-mono text-slate-400">{i + 1}</td>
                      <td className="py-2 flex items-center gap-2">
                        {i === 0 && <div className="w-1 h-5 bg-emerald-500 -ml-1" />}
                        <div className="w-3 h-3" style={{ background: t.color }} />
                        <span className="font-semibold">{t.name}</span>
                      </td>
                      <td className="text-center font-mono">{t.pj}</td>
                      <td className="text-center font-mono">{t.gf - t.gc > 0 ? '+' : ''}{t.gf - t.gc}</td>
                      <td className="text-center font-display text-lg px-5 text-blue-900">{t.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-950 text-white py-10">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white flex items-center justify-center">
              <Trophy className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <div className="font-serif text-lg font-black">Liga.9</div>
              <div className="text-[10px] font-mono text-blue-300">APERTURA 2026</div>
            </div>
          </div>
          <div className="text-xs text-blue-300">
            Organizado por el Colegio Marista · © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
