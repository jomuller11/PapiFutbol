'use client';

import { useState, useTransition } from 'react';
import {
  Check, X, Clock, AlertTriangle, GraduationCap, Search, Users,
  MoreVertical, ShieldCheck, AlertCircle, Save,
} from 'lucide-react';
import type { ApprovalsData, RegistrationRow } from '@/app/admin/approvals/page';
import {
  approveRegistration,
  rejectRegistration,
  moveToWaitlist,
  approveAllPending,
} from '@/lib/actions/approvals';

const REFERENCE_NAMES: Record<string, string> = {
  padre_alumno: 'Padre de Alumno',
  padre_ex_alumno: 'Padre de Ex Alumno',
  ex_alumno: 'Ex Alumno',
  docente_colegio: 'Docente del Colegio',
  invitado: 'Invitado',
  hermano_marista: 'Hermano Marista',
  esposo_educadora: 'Esposo de Educadora',
  abuelo_alumno: 'Abuelo de Alumno',
};

type Tab = 'pending' | 'approved' | 'rejected' | 'waitlist';

type Props = {
  data: ApprovalsData;
};

export function ApprovalsPageClient({ data }: Props) {
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState<RegistrationRow | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();

  const rows = data[tab];
  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      `${r.first_name} ${r.last_name} ${r.nickname ?? ''} ${r.dni} ${r.email}`
        .toLowerCase()
        .includes(q)
    );
  });

  const handleApproveAll = () => {
    if (!data.tournamentId) return;
    if (!confirm(`¿Aprobar las ${data.pending.length} inscripciones pendientes?`)) return;

    setBulkError(null);
    startBulkTransition(async () => {
      const res = await approveAllPending(data.tournamentId!);
      if (!res.success) {
        setBulkError(res.error ?? 'No pudimos aprobar todas.');
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-5 mb-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
            Torneo activo
          </div>
          <div className="font-serif font-bold text-xl mt-0.5">{data.tournamentName}</div>
        </div>
        <div className="flex items-center gap-5 text-center">
          <Metric label="Pendientes" value={data.pending.length} color="amber" />
          <Metric label="Aprobados" value={data.approved.length} color="emerald" />
          <Metric label="Rechazados" value={data.rejected.length} color="red" />
          <Metric label="Espera" value={data.waitlist.length} color="slate" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 p-1 mb-4 inline-flex">
        <TabButton
          active={tab === 'pending'}
          onClick={() => setTab('pending')}
          label="Pendientes"
          count={data.pending.length}
          amber={data.pending.length > 0}
        />
        <TabButton
          active={tab === 'approved'}
          onClick={() => setTab('approved')}
          label="Aprobados"
          count={data.approved.length}
        />
        <TabButton
          active={tab === 'rejected'}
          onClick={() => setTab('rejected')}
          label="Rechazados"
          count={data.rejected.length}
        />
        <TabButton
          active={tab === 'waitlist'}
          onClick={() => setTab('waitlist')}
          label="Lista de espera"
          count={data.waitlist.length}
        />
      </div>

      {bulkError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>{bulkError}</div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 p-4 mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI o email..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-700 focus:bg-white"
          />
        </div>

        {tab === 'pending' && data.pending.length > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={isBulkPending}
            className="bg-emerald-600 text-white px-3 py-2 text-xs font-medium hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isBulkPending ? 'Aprobando...' : `Aprobar todos (${data.pending.length})`}
          </button>
        )}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState tab={tab} hadSearch={search.trim() !== ''} />
      ) : (
        <div className="bg-white border border-slate-200">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-mono text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="text-left px-5 py-3">Jugador</th>
                <th className="text-center py-3">Pos</th>
                <th className="text-left py-3">Referencia</th>
                {tab === 'pending' && <th className="text-left py-3">Solicitud</th>}
                {(tab === 'approved' || tab === 'rejected' || tab === 'waitlist') && (
                  <th className="text-left py-3">Revisión</th>
                )}
                <th className="text-center py-3">Puntaje</th>
                <th className="text-right py-3 px-5">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <RegistrationTableRow
                  key={r.registration_id}
                  row={r}
                  tab={tab}
                  onReject={() => setRejecting(r)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500 font-mono">
        {filtered.length} / {rows.length} en {tab}
      </div>

      {rejecting && (
        <RejectModal row={rejecting} onClose={() => setRejecting(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RegistrationTableRow({
  row,
  tab,
  onReject,
}: {
  row: RegistrationRow;
  tab: Tab;
  onReject: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initials = (row.first_name[0] ?? '') + (row.last_name[0] ?? '');
  const requestedAt = new Date(row.requested_at).toLocaleDateString('es', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const reviewedAt = row.reviewed_at
    ? new Date(row.reviewed_at).toLocaleDateString('es', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveRegistration(row.registration_id);
      if (!res.success) setError(res.error ?? 'No pudimos aprobar.');
    });
  };

  const handleWaitlist = () => {
    setError(null);
    startTransition(async () => {
      const res = await moveToWaitlist(row.registration_id);
      if (!res.success) setError(res.error ?? 'No pudimos mover a espera.');
    });
  };

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center text-[10px] font-semibold">
            {initials}
          </div>
          <div>
            <div className="font-semibold">
              {row.first_name} {row.last_name}
              {row.nickname && <span className="text-slate-400 font-normal"> · "{row.nickname}"</span>}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              DNI {row.dni} · {row.email}
            </div>
          </div>
        </div>
      </td>
      <td className="text-center">
        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 font-semibold">
          {row.position}
        </span>
      </td>
      <td className="text-xs">
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-100 px-2 py-0.5 font-medium">
          <GraduationCap className="w-3 h-3" />
          {REFERENCE_NAMES[row.reference] ?? row.reference}
        </span>
      </td>
      {tab === 'pending' && (
        <td className="text-xs text-slate-500">{requestedAt}</td>
      )}
      {tab !== 'pending' && (
        <td className="text-xs text-slate-500">
          {reviewedAt ?? '—'}
          {row.rejection_reason && (
            <div className="text-[10px] text-red-600 mt-0.5 truncate max-w-[180px]" title={row.rejection_reason}>
              «{row.rejection_reason}»
            </div>
          )}
        </td>
      )}
      <td className="text-center">
        {row.score !== null ? (
          <span className="font-serif font-bold text-sm text-orange-600">
            {row.score}<span className="text-[9px] text-slate-400 font-mono">/15</span>
          </span>
        ) : (
          <span className="font-mono text-[10px] text-slate-400">—</span>
        )}
      </td>
      <td className="text-right px-5">
        {error && (
          <div className="text-[10px] text-red-600 mb-1 text-right">{error}</div>
        )}
        <div className="flex gap-1.5 justify-end">
          {tab === 'pending' && (
            <>
              <button
                onClick={handleWaitlist}
                disabled={isPending}
                className="w-8 h-8 bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 flex items-center justify-center disabled:opacity-50"
                title="Lista de espera"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={onReject}
                disabled={isPending}
                className="w-8 h-8 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center justify-center disabled:opacity-50"
                title="Rechazar"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="bg-emerald-600 text-white px-3 py-2 text-xs font-medium hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {isPending ? '...' : 'Aprobar'}
              </button>
            </>
          )}
          {(tab === 'rejected' || tab === 'waitlist') && (
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="bg-emerald-600 text-white px-3 py-2 text-xs font-medium hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {isPending ? '...' : 'Aprobar'}
            </button>
          )}
          {tab === 'approved' && (
            <>
              <button
                onClick={onReject}
                disabled={isPending}
                className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <X className="w-3 h-3" />
                Revocar
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RejectModal({ row, onClose }: { row: RegistrationRow; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await rejectRegistration(row.registration_id, reason || undefined);
      if (!res.success) {
        setError(res.error ?? 'No pudimos rechazar.');
        return;
      }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md border border-slate-200 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-[10px] text-red-600 tracking-widest font-semibold mb-1">
                RECHAZAR INSCRIPCIÓN
              </div>
              <h3 className="font-serif font-bold text-lg">
                {row.first_name} {row.last_name}
              </h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-2">
            Motivo (opcional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ej: datos incompletos, no cumple requisitos..."
            className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-700"
          />
          <div className="text-[10px] text-slate-400 mt-1 text-right">{reason.length}/500</div>

          <div className="mt-3 bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              El jugador recibirá notificación del rechazo. Podrá volver a solicitar la inscripción si lo desea.
            </div>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 flex items-center justify-end gap-2 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isPending}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-red-600 text-white px-5 py-2 text-sm font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            {isPending ? 'Rechazando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
  count,
  amber,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  amber?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
        active ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
      <span
        className={`text-[10px] font-mono px-1.5 py-0.5 font-semibold ${
          active
            ? 'bg-white/20 text-white'
            : amber
            ? 'bg-amber-100 text-amber-800'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'amber' | 'emerald' | 'red' | 'slate';
}) {
  const colorClass: Record<string, string> = {
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    slate: 'text-slate-600',
  };
  return (
    <div>
      <div className={`font-serif font-bold text-2xl leading-none ${colorClass[color]}`}>{value}</div>
      <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

function EmptyState({ tab, hadSearch }: { tab: Tab; hadSearch: boolean }) {
  const messages: Record<Tab, { title: string; sub: string }> = {
    pending: { title: 'No hay inscripciones pendientes', sub: 'Cuando un jugador solicite inscribirse, aparecerá acá.' },
    approved: { title: 'Todavía no hay jugadores aprobados', sub: 'Los jugadores aprobados van a aparecer en esta sección.' },
    rejected: { title: 'Sin rechazos', sub: 'No se ha rechazado ninguna inscripción.' },
    waitlist: { title: 'Lista de espera vacía', sub: 'No hay jugadores en lista de espera.' },
  };
  const m = hadSearch
    ? { title: 'Sin resultados', sub: 'Ningún jugador coincide con tu búsqueda.' }
    : messages[tab];

  return (
    <div className="bg-white border border-slate-200 p-12 text-center">
      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
      <div className="font-serif font-bold text-base mb-1">{m.title}</div>
      <div className="text-xs text-slate-500">{m.sub}</div>
    </div>
  );
}
