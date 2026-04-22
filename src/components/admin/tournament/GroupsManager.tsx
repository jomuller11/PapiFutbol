'use client';

import { useState, useTransition } from 'react';
import { Plus, Edit3, Trash2, Check, X, AlertCircle, Hash, MapPin } from 'lucide-react';
import { createGroup, updateGroup, deleteGroup } from '@/lib/actions/tournament';

export type Group = {
  id: string;
  name: string;
  order: number;
  phase_id: string;
};

type Props = {
  phaseId: string;
  phaseName: string;
  groups: Group[];
};

export function GroupsManager({ phaseId, phaseName, groups }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sugerir el próximo nombre automáticamente (Zona A, B, C...)
  const suggestedName = String.fromCharCode(65 + groups.length); // 65 = 'A'

  const handleCreate = () => {
    const name = (newName.trim() || suggestedName).trim();
    if (!name) return;
    setError(null);

    const formData = new FormData();
    formData.append('phaseId', phaseId);
    formData.append('name', name);

    startTransition(async () => {
      const result = await createGroup(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNewName('');
      setIsAdding(false);
    });
  };

  const handleStartEdit = (group: Group) => {
    setEditingId(group.id);
    setEditValue(group.name);
    setError(null);
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = (groupId: string) => {
    if (!editValue.trim()) return;
    setError(null);

    const formData = new FormData();
    formData.append('groupId', groupId);
    formData.append('name', editValue.trim());

    startTransition(async () => {
      const result = await updateGroup(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      setEditValue('');
    });
  };

  const handleDelete = (groupId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteGroup(groupId);
      if (!result.success) {
        setError(result.error);
        setConfirmDeleteId(null);
        return;
      }
      setConfirmDeleteId(null);
    });
  };

  return (
    <div className="bg-slate-50 border-t border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-700" />
          <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
            Zonas de {phaseName}
          </span>
          <span className="text-[10px] font-mono text-slate-400">({groups.length})</span>
        </div>
        {!isAdding && (
          <button
            onClick={() => {
              setIsAdding(true);
              setNewName('');
              setError(null);
            }}
            className="text-[11px] text-blue-700 hover:underline font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Agregar zona
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 mb-3 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {groups.length === 0 && !isAdding ? (
        <div className="text-center py-4 text-xs text-slate-500">
          Todavía no hay zonas. Agregá la primera con el botón de arriba.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {groups.map(g => {
            const isEditing = editingId === g.id;
            const isConfirming = confirmDeleteId === g.id;

            if (isConfirming) {
              return (
                <div
                  key={g.id}
                  className="bg-red-50 border border-red-200 p-2 flex flex-col gap-2"
                >
                  <div className="text-[10px] text-red-800 font-semibold">
                    ¿Borrar {g.name}?
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={isPending}
                      className="flex-1 bg-white border border-slate-200 text-slate-600 px-2 py-1 text-[10px] hover:bg-slate-50 disabled:opacity-50"
                    >
                      No
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      disabled={isPending}
                      className="flex-1 bg-red-600 text-white px-2 py-1 text-[10px] font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      Sí, borrar
                    </button>
                  </div>
                </div>
              );
            }

            if (isEditing) {
              return (
                <div
                  key={g.id}
                  className="bg-white border border-blue-300 p-2 flex items-center gap-1"
                >
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit(g.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    disabled={isPending}
                    className="flex-1 min-w-0 border-0 text-sm px-1 py-0.5 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveEdit(g.id)}
                    disabled={isPending || !editValue.trim()}
                    className="w-6 h-6 bg-blue-900 text-white flex items-center justify-center hover:bg-blue-800 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={isPending}
                    className="w-6 h-6 bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={g.id}
                className="bg-white border border-slate-200 p-2 flex items-center gap-2 group hover:border-slate-300"
              >
                <div className="w-6 h-6 bg-blue-900 text-white font-display text-[10px] flex items-center justify-center flex-shrink-0">
                  {g.order}
                </div>
                <div className="flex-1 min-w-0 text-sm font-semibold truncate">
                  Zona {g.name}
                </div>
                <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(g)}
                    className="text-slate-400 hover:text-blue-700"
                    title="Editar"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setConfirmDeleteId(g.id);
                      setEditingId(null);
                    }}
                    className="text-slate-400 hover:text-red-600"
                    title="Borrar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {isAdding && (
            <div className="bg-white border border-blue-300 p-2 flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-mono">Zona</span>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewName('');
                  }
                }}
                placeholder={suggestedName}
                autoFocus
                disabled={isPending}
                className="flex-1 min-w-0 border-0 text-sm px-1 py-0.5 focus:outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="w-6 h-6 bg-blue-900 text-white flex items-center justify-center hover:bg-blue-800 disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewName('');
                }}
                disabled={isPending}
                className="w-6 h-6 bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
