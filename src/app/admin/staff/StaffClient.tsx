'use client';

import { useState, useTransition } from 'react';
import {
  ShieldCheck, UserPlus, Trash2, AlertCircle, Check,
  Mail, Crown, RefreshCw, Clock,
} from 'lucide-react';
import { inviteStaff, updateStaffRole, removeStaff, revokeInvitation } from '@/lib/actions/staff';
import type { StaffMember, PendingInvitation } from './page';

type Props = {
  staff: StaffMember[];
  invitations: PendingInvitation[];
  currentUserId: string;
};

export function StaffClient({ staff, invitations, currentUserId }: Props) {
  const [showInviteForm, setShowInviteForm] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">
            Administración
          </div>
          <div className="font-serif font-bold text-xl">Equipo admin</div>
          <div className="text-xs text-slate-500 mt-1">
            {staff.length} miembro{staff.length !== 1 ? 's' : ''} ·{' '}
            {invitations.length} invitación{invitations.length !== 1 ? 'es' : ''} pendiente{invitations.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="bg-blue-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-800 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Invitar colaborador
        </button>
      </div>

      {/* Descripción de roles */}
      <div className="grid grid-cols-2 gap-3">
        <RoleCard
          role="admin"
          description="Acceso total: configurar torneo, invitar staff, gestionar todo."
        />
        <RoleCard
          role="staff"
          description="Aprobar inscripciones, cargar resultados y gestionar jugadores."
        />
      </div>

      {/* Staff actual */}
      <div className="bg-white border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
            Miembros activos
          </span>
          <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 ml-1">
            {staff.length}
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {staff.map(member => (
            <StaffRow
              key={member.id}
              member={member}
              isSelf={member.id === currentUserId}
            />
          ))}
        </div>
      </div>

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <div className="bg-white border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
              Invitaciones pendientes
            </span>
            <span className="font-mono text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 ml-1">
              {invitations.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {invitations.map(inv => (
              <InvitationRow key={inv.id} invitation={inv} />
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteForm && <InviteModal onClose={() => setShowInviteForm(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RoleCard({ role, description }: { role: 'admin' | 'staff'; description: string }) {
  return (
    <div className="bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        {role === 'admin' ? (
          <Crown className="w-3.5 h-3.5 text-blue-900" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
        )}
        <RoleBadge role={role} />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

function StaffRow({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: 'admin' | 'staff') => {
    if (newRole === member.role) return;
    setError(null);
    setActiveId('role');
    const fd = new FormData();
    fd.append('profile_id', member.id);
    fd.append('role', newRole);
    startTransition(async () => {
      const result = await updateStaffRole(fd);
      setActiveId(null);
      if (!result.success) setError(result.error);
    });
  };

  const handleRemove = () => {
    setError(null);
    setActiveId('remove');
    startTransition(async () => {
      const result = await removeStaff(member.id);
      setActiveId(null);
      if (!result.success) {
        setError(result.error);
        setConfirmRemove(false);
      }
    });
  };

  return (
    <div className={`px-5 py-3 flex items-center gap-4 ${isPending ? 'opacity-60' : ''}`}>
      {/* Initials avatar */}
      <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 uppercase">
        {member.email[0]}
      </div>

      {/* Email + self badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-800 truncate">{member.email}</span>
          {isSelf && (
            <span className="font-mono text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 flex-shrink-0">
              YO
            </span>
          )}
        </div>
        {error && <div className="text-xs text-red-600 mt-0.5">{error}</div>}
      </div>

      {/* Role selector */}
      {!isSelf ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          {(['admin', 'staff'] as const).map(r => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              disabled={isPending}
              className={`px-2.5 py-1 text-[10px] font-mono font-semibold tracking-wider border transition-colors disabled:opacity-50 ${
                member.role === r
                  ? r === 'admin'
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-shrink-0">
          <RoleBadge role={member.role} />
        </div>
      )}

      {/* Remove */}
      {!isSelf && (
        <div className="flex-shrink-0">
          {!confirmRemove ? (
            <button
              onClick={() => setConfirmRemove(true)}
              disabled={isPending}
              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
              title="Quitar acceso"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-red-700 font-medium">¿Quitar?</span>
              <button
                onClick={() => setConfirmRemove(false)}
                disabled={isPending}
                className="text-[10px] px-2 py-1 border border-slate-200 bg-white hover:bg-slate-50"
              >
                No
              </button>
              <button
                onClick={handleRemove}
                disabled={isPending}
                className="text-[10px] px-2 py-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Sí
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InvitationRow({ invitation }: { invitation: PendingInvitation }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRevoke = () => {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id);
      if (!result.success) setError(result.error);
    });
  };

  const expiresDate = new Date(invitation.expires_at);
  const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / 86400000);

  return (
    <div className={`px-5 py-3 flex items-center gap-4 ${isPending ? 'opacity-60' : ''}`}>
      <div className="w-8 h-8 bg-amber-50 text-amber-600 border border-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
        <Mail className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{invitation.email}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <RoleBadge role={invitation.role} />
          <span className="text-[10px] text-slate-400 font-mono">
            Expira en {daysLeft} día{daysLeft !== 1 ? 's' : ''}
          </span>
          {invitation.invited_by_email && (
            <span className="text-[10px] text-slate-400">
              · Invitado por {invitation.invited_by_email}
            </span>
          )}
        </div>
        {error && <div className="text-xs text-red-600 mt-0.5">{error}</div>}
      </div>

      <button
        onClick={handleRevoke}
        disabled={isPending}
        className="text-xs text-red-600 hover:underline font-medium flex items-center gap-1 disabled:opacity-50 flex-shrink-0"
      >
        <Trash2 className="w-3 h-3" /> Revocar
      </button>
    </div>
  );
}

function RoleBadge({ role }: { role: 'admin' | 'staff' }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 font-mono text-[9px] bg-blue-900 text-white px-2 py-0.5 font-semibold tracking-wider uppercase">
      <Crown className="w-2.5 h-2.5" /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-mono text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 font-semibold tracking-wider uppercase">
      <ShieldCheck className="w-2.5 h-2.5" /> Staff
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invite Modal
// ─────────────────────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!email.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.append('email', email.trim());
    fd.append('role', role);
    startTransition(async () => {
      const result = await inviteStaff(fd);
      if (!result.success) { setError(result.error); return; }
      setSuccess(true);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
      onClick={() => !isPending && onClose()}
    >
      <div
        className="bg-white w-full max-w-md border border-slate-200 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-blue-900 p-5 text-white">
          <div className="font-mono text-[10px] tracking-widest opacity-80 mb-1">NUEVO COLABORADOR</div>
          <div className="font-serif font-bold text-lg">Invitar al equipo admin</div>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="font-semibold text-slate-900 mb-1">Invitación enviada</div>
            <div className="text-sm text-slate-500 mb-1">
              Se envió un email de invitación a <strong>{email}</strong>.
            </div>
            <div className="text-xs text-slate-400 mb-5">
              Si el email no llega, el usuario puede registrarse en /register y se le asignará el rol automáticamente.
            </div>
            <button
              onClick={onClose}
              className="bg-blue-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-blue-800"
            >
              Listo
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              <div>
                <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
                  Email <span className="text-orange-600">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="nombre@ejemplo.com"
                  disabled={isPending}
                  autoFocus
                  className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-2">
                  Rol <span className="text-orange-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['staff', 'admin'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      disabled={isPending}
                      className={`p-3 border text-left transition-all ${
                        role === r
                          ? 'border-blue-700 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <RoleBadge role={r} />
                        {role === r && <Check className="w-3 h-3 text-blue-700 ml-auto" />}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-relaxed">
                        {r === 'admin'
                          ? 'Acceso total al panel'
                          : 'Carga resultados, aprueba inscripciones'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={onClose}
                disabled={isPending}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !email.trim()}
                className="bg-blue-900 text-white px-5 py-2 text-sm font-medium hover:bg-blue-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {isPending ? 'Enviando...' : 'Enviar invitación'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
