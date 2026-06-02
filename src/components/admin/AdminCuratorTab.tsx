import React, { useState, useMemo } from 'react';
import { Check, UserCheck } from 'lucide-react';
import { ParentRequest, NannyProfile } from '@/core/types';
import { Card, Badge } from '../UI';
import { AdminPillButton } from './adminPrimitives';
import { createBooking } from '@/services/booking';
import { useAdminWorkflowUI } from './adminWorkflowUI';

interface AdminCuratorTabProps {
  parents: ParentRequest[];
  nannies: NannyProfile[];
  onDataChanged: () => void;
  logAdminAction: (action: string, meta?: Record<string, unknown>) => void;
}

function norm(s?: string) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function compatBreakdown(p: ParentRequest, n: NannyProfile): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const pc = norm(p.city);
  const nc = norm(n.city);
  if (pc && nc && nc === pc) {
    score += 3;
    reasons.push('Один город');
  } else if (pc && nc && (nc.includes(pc) || pc.includes(nc))) {
    score += 1;
    reasons.push('Близкая локация');
  }
  if (n.isVerified) {
    score += 2;
    reasons.push('Личность подтверждена');
  }
  const ps = norm(p.schedule);
  const ns = norm(n.schedule);
  if (ps && ns) {
    if (ns === ps) {
      score += 2;
      reasons.push('График совпадает');
    } else if (ns.includes('полный') && ps.includes('полный')) {
      score += 1;
      reasons.push('Оба — полный день');
    } else if (ns.includes('частич') && ps.includes('частич')) {
      score += 1;
      reasons.push('Оба — частичная занятость');
    }
  }
  const pa = norm(p.childAge);
  if (pa && n.childAges?.some((a) => norm(a).includes(pa) || pa.includes(norm(a)))) {
    score += 1;
    reasons.push('Опыт с возрастом ребёнка');
  }
  return { score, reasons };
}

const MAX_SCORE = 8;

function scorePct(score: number) {
  return Math.min(100, Math.round((score / MAX_SCORE) * 100));
}

function parentLabel(p: ParentRequest) {
  return `${p.city} • ${p.childAge} • ${p.schedule}`;
}

function parentStatusLabel(status?: ParentRequest['status']) {
  if (status === 'in_review') return 'На проверке';
  if (status === 'approved') return 'Одобрена';
  if (status === 'rejected') return 'Отклонена';
  return 'Новая';
}

export const AdminCuratorTab: React.FC<AdminCuratorTabProps> = ({
  parents,
  nannies,
  onDataChanged,
  logAdminAction,
}) => {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const { confirmAction, reportSuccess, reportError } = useAdminWorkflowUI();

  const actionableParents = useMemo(
    () => parents.filter((p) => !p.status || p.status === 'new' || p.status === 'in_review'),
    [parents],
  );

  const selectedParent = useMemo(
    () => actionableParents.find((p) => p.id === selectedParentId) ?? null,
    [actionableParents, selectedParentId],
  );

  const rankedNannies = useMemo(() => {
    if (!selectedParent) return [];
    return [...nannies]
      .map((n) => {
        const { score, reasons } = compatBreakdown(selectedParent, n);
        return { nanny: n, score, reasons };
      })
      .sort((a, b) => b.score - a.score);
  }, [selectedParent, nannies]);

  const handleAssign = async (nanny: NannyProfile) => {
    if (!selectedParent) return;
    const ok = await confirmAction({
      message: `Назначить ${nanny.name} для заявки из ${selectedParent.city}?`,
      detail: `${nanny.name} → ${parentLabel(selectedParent)}\n\nСоздастся бронирование со статусом «pending».`,
      confirmLabel: 'Назначить',
    });
    if (!ok) return;

    setAssigningId(nanny.id);
    try {
      await createBooking({
        parent_id: selectedParent.requesterId ?? selectedParent.id,
        nanny_id: nanny.userId ?? nanny.id,
        request_id: selectedParent.id,
        date: new Date().toISOString().slice(0, 10),
      });
      logAdminAction('curator_manual_match', {
        parentId: selectedParent.id,
        nannyId: nanny.id,
        city: selectedParent.city,
      });
      reportSuccess(`${nanny.name} назначена. Бронирование создано.`);
      onDataChanged();
    } catch {
      reportError('Не удалось создать бронирование.');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-stone-500 font-bold uppercase text-xs">Ручной подбор</h3>
        <p className="text-sm text-stone-500 mt-1">
          Выберите заявку — увидите нянь по совместимости.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 min-h-0">
        {/* Parent list */}
        <div className="md:w-80 shrink-0 space-y-2">
          <div className="text-xs font-semibold text-stone-500 mb-2 uppercase">
            Заявки ({actionableParents.length})
          </div>
          {actionableParents.length === 0 && (
            <p className="text-stone-400 text-sm">Нет заявок для подбора</p>
          )}
          {actionableParents.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedParentId(p.id === selectedParentId ? null : p.id)}
              className={`w-full text-left rounded-[1.25rem] border p-3 transition-all ${
                p.id === selectedParentId
                  ? 'border-stone-900 bg-stone-900 text-white shadow-md'
                  : 'border-[color:var(--cloud-border)] bg-white/70 hover:bg-white hover:border-amber-200/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={`text-xs font-semibold ${p.id === selectedParentId ? 'text-white' : 'text-stone-800'}`}
                >
                  {p.city}
                </span>
                <Badge variant={p.status === 'in_review' ? 'warning' : 'info'}>
                  {parentStatusLabel(p.status)}
                </Badge>
              </div>
              <div
                className={`text-xs ${p.id === selectedParentId ? 'text-stone-300' : 'text-stone-500'}`}
              >
                {p.childAge} · {p.schedule}
              </div>
              <div
                className={`text-xs mt-0.5 ${p.id === selectedParentId ? 'text-stone-400' : 'text-stone-400'}`}
              >
                Бюджет: {p.budget}
              </div>
            </button>
          ))}
        </div>

        {/* Nanny list */}
        <div className="flex-1 min-w-0">
          {!selectedParent ? (
            <div className="flex flex-col items-center justify-center h-48 text-stone-400 text-sm rounded-[1.5rem] border border-dashed border-stone-200">
              <UserCheck size={28} className="mb-2 opacity-40" />
              Выберите заявку слева
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-stone-500 mb-2 uppercase">
                Няни для «{selectedParent.city}» · {nannies.length} всего
              </div>
              <div className="space-y-2">
                {rankedNannies.map(({ nanny: n, score, reasons }) => {
                  const pct = scorePct(score);
                  return (
                    <Card key={n.id} className="p-3!">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-stone-800 truncate">
                              {n.name}
                            </span>
                            {n.isVerified && (
                              <Badge variant="trust">
                                <Check size={10} className="inline mr-0.5" />
                                Верифицирована
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-stone-500 mt-0.5">
                            {n.city} · {n.experience} лет опыта · {n.schedule}
                          </div>
                          {n.childAges?.length > 0 && (
                            <div className="text-xs text-stone-400 mt-0.5">
                              Возраст: {n.childAges.join(', ')}
                            </div>
                          )}
                          {reasons.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] uppercase tracking-[0.08em] font-bold text-stone-400 mb-1">
                                Почему подходит
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {reasons.map((r) => (
                                  <span
                                    key={r}
                                    className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-medium"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <div
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              pct >= 60
                                ? 'bg-green-100 text-green-700'
                                : pct >= 30
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-stone-100 text-stone-500'
                            }`}
                          >
                            {pct}%
                          </div>
                          <AdminPillButton
                            tone="dark"
                            disabled={assigningId === n.id}
                            onClick={() => handleAssign(n)}
                            className="text-[11px] px-3 py-1.5"
                          >
                            {assigningId === n.id ? '...' : 'Назначить'}
                          </AdminPillButton>
                        </div>
                      </div>
                      {score === 0 && (
                        <div className="mt-1.5 text-[10px] text-stone-400 italic">
                          Нет совпадений по городу / графику
                        </div>
                      )}
                    </Card>
                  );
                })}
                {rankedNannies.length === 0 && (
                  <p className="text-stone-400 text-sm">Нет доступных нянь</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
