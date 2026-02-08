import React, { useEffect, useMemo, useState } from "react";
import {
  clearAllData,
  clearTestData,
  saveNannyProfile,
  updateParentRequest,
} from "../services/storage";
import { ParentRequest, NannyProfile, DocumentVerification } from "../types";
import { Button, Card } from "./UI";
import { notifyUserStatusChanged } from "../services/notifications";
import { supabase } from "../services/supabase";
import {
  Trash2,
  X,
  ShieldCheck,
  BrainCircuit,
  CheckCircle,
  PlayCircle,
  User as UserIcon,
  Search,
  ShieldAlert,
  FileCheck2,
  Users,
  ListChecks,
} from "lucide-react";

type AdminTab = "overview" | "parents" | "nannies";
type NannyIssueFilter = "all" | "noDocs" | "rejected" | "pending" | "unverified";
type ParentStatus = "all" | "new" | "in_review" | "approved" | "rejected" | "resubmitted";

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [parents, setParents] = useState<ParentRequest[]>([]);
  const [nannies, setNannies] = useState<NannyProfile[]>([]);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [query, setQuery] = useState("");
  const [onlyProblematic, setOnlyProblematic] = useState(false);
  const [issueFilter, setIssueFilter] = useState<NannyIssueFilter>("all");
  const [parentStatusFilter, setParentStatusFilter] = useState<ParentStatus>("all");
  const [onlyNeedsAction, setOnlyNeedsAction] = useState(true);
  const [selectedParent, setSelectedParent] = useState<ParentRequest | null>(null);
  const [unseenParentsCount, setUnseenParentsCount] = useState(0);
  const [rejectReasonCode, setRejectReasonCode] = useState<'profile_incomplete' | 'docs_missing' | 'budget_invalid' | 'contact_invalid' | 'other'>('profile_incomplete');
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name?: string } | null>(null);

  const loadData = async () => {
    const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    // Админ-режим: читаем через server API (service role), но только для авторизованного администратора
    const [pr, nr] = await Promise.all([
      fetch('/api/data/parents', { headers }).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
      fetch('/api/data/nannies', { headers }).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
    ]);

    const p = Array.isArray(pr?.items) ? pr.items : [];
    const n = Array.isArray(nr?.items) ? nr.items : [];

    setParents(p);
    setNannies(n);

    const seenTs = Number(localStorage.getItem('blizko_admin_parents_seen_ts') || '0');
    const unseen = p.filter((item) => Number(item.updatedAt || item.createdAt || 0) > seenTs).length;
    setUnseenParentsCount(unseen);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClear = async () => {
    if (confirm("Удалить все данные?")) {
      await clearAllData();
      setParents([]);
      setNannies([]);
    }
  };

  const handleClearTest = async () => {
    if (confirm("Удалить только тестовые записи (id начинается с test-)?")) {
      await clearTestData();
      await loadData();
    }
  };

  const markParentsAsSeen = () => {
    localStorage.setItem('blizko_admin_parents_seen_ts', String(Date.now()));
    setUnseenParentsCount(0);
  };

  const toggleVerified = async (nanny: NannyProfile) => {
    await saveNannyProfile({ id: nanny.id, isVerified: !nanny.isVerified });
    await loadData();
  };

  const updateDocumentStatus = async (
    nanny: NannyProfile,
    idx: number,
    status: DocumentVerification["status"]
  ) => {
    const docs = [...(nanny.documents || [])];
    if (!docs[idx]) return;

    docs[idx] = {
      ...docs[idx],
      status,
      aiNotes:
        status === "verified"
          ? "Статус подтверждён администратором"
          : status === "rejected"
          ? "Отклонено администратором"
          : "Ожидает ручной проверки",
      verifiedAt: Date.now(),
    };

    await saveNannyProfile({ id: nanny.id, documents: docs });
    await loadData();
  };

  const getNannyFlags = (n: NannyProfile) => {
    const docs = n.documents || [];
    return {
      noDocs: docs.length === 0,
      hasRejected: docs.some((d) => d.status === "rejected"),
      hasPending: docs.some((d) => d.status === "pending"),
      unverified: !n.isVerified,
      lowConfidence: docs.some((d) => (d.aiConfidence || 0) < 70),
    };
  };

  const isProblematicNanny = (n: NannyProfile) => {
    const f = getNannyFlags(n);
    return f.noDocs || f.hasRejected || f.hasPending || f.unverified || f.lowConfidence;
  };

  const filteredParents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parents.filter((p) => {
      const status = p.status || "new";
      const isResubmitted = (p.changeLog || []).some((e) => e.type === 'resubmitted');
      const byStatus =
        parentStatusFilter === "all" ||
        status === parentStatusFilter ||
        (parentStatusFilter === 'resubmitted' && isResubmitted && status === 'in_review');
      const byNeedsAction = !onlyNeedsAction || status === 'new' || status === 'in_review' || status === 'rejected';
      const byQuery =
        !q ||
        p.city.toLowerCase().includes(q) ||
        p.comment.toLowerCase().includes(q) ||
        p.requirements.join(" ").toLowerCase().includes(q);
      return byStatus && byNeedsAction && byQuery;
    });
  }, [parents, query, parentStatusFilter, onlyNeedsAction]);

  const filteredNannies = useMemo(() => {
    const q = query.trim().toLowerCase();

    const byQuery = (n: NannyProfile) =>
      !q ||
      [n.name, n.city, n.about, n.contact, (n.skills || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q);

    const byIssue = (n: NannyProfile) => {
      const f = getNannyFlags(n);
      if (issueFilter === "all") return true;
      if (issueFilter === "noDocs") return f.noDocs;
      if (issueFilter === "rejected") return f.hasRejected;
      if (issueFilter === "pending") return f.hasPending;
      if (issueFilter === "unverified") return f.unverified;
      return true;
    };

    return nannies.filter(
      (n) => byQuery(n) && (!onlyProblematic || isProblematicNanny(n)) && byIssue(n)
    );
  }, [nannies, query, onlyProblematic, issueFilter]);

  const stats = useMemo(() => {
    const verified = nannies.filter((n) => n.isVerified).length;
    const withDocs = nannies.filter((n) => (n.documents || []).length > 0).length;
    const pendingDocs = nannies.reduce(
      (acc, n) => acc + (n.documents || []).filter((d) => d.status === "pending").length,
      0
    );
    return { verified, withDocs, pendingDocs };
  }, [nannies]);

  const parentStatusLabel = (status?: ParentRequest['status']) => {
    if (status === 'in_review') return 'На проверке';
    if (status === 'approved') return 'Одобрена';
    if (status === 'rejected') return 'Отклонена';
    return 'Новая';
  };

  const parentStatusBadge = (status?: ParentRequest['status']) => {
    if (status === 'in_review') return 'bg-amber-100 text-amber-700';
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-sky-100 text-sky-700';
  };

  const setParentStatus = async (parent: ParentRequest, status: Exclude<ParentStatus, 'all'>) => {
    const updated = await updateParentRequest(
      { id: parent.id, status },
      { actor: 'admin', note: `Админ изменил статус на: ${status}`, allowApprovedEdit: true }
    );
    if (updated) await notifyUserStatusChanged(updated);
    await loadData();
    if (selectedParent?.id === parent.id) {
      setSelectedParent({ ...parent, status });
    }
  };

  const rejectParentWithReason = async (parent: ParentRequest) => {
    const reasonMap = {
      profile_incomplete: 'Анкета заполнена не полностью',
      docs_missing: 'Не хватает документов',
      budget_invalid: 'Некорректный бюджет',
      contact_invalid: 'Некорректные контактные данные',
      other: 'Другая причина',
    } as const;

    const reasonText = (rejectReasonText || '').trim();
    if (reasonText.length < 8) {
      alert('Укажи комментарий минимум 8 символов, чтобы пользователь понял что исправить.');
      return;
    }

    const note = `Отклонено: ${reasonMap[rejectReasonCode]}. ${reasonText}`;

    const updated = await updateParentRequest(
      {
        id: parent.id,
        status: 'rejected',
        rejectionInfo: {
          reasonCode: rejectReasonCode,
          reasonText,
          rejectedAt: Date.now(),
          rejectedBy: 'admin',
        },
      },
      { actor: 'admin', note, allowApprovedEdit: true, forceStatusEvent: true }
    );

    if (updated) await notifyUserStatusChanged(updated);
    setRejectReasonText('');
    await loadData();
  };

  const bulkVerifyVisible = async () => {
    if (filteredNannies.length === 0) return;
    if (!confirm(`Подтвердить профиль у ${filteredNannies.length} анкет?`)) return;
    await Promise.all(filteredNannies.map((n) => saveNannyProfile({ id: n.id, isVerified: true })));
    await loadData();
  };

  const bulkSetDocsStatusVisible = async (status: DocumentVerification["status"]) => {
    if (filteredNannies.length === 0) return;
    if (!confirm(`Проставить статус '${status}' для документов у видимых анкет?`)) return;

    await Promise.all(
      filteredNannies.map(async (n) => {
        const docs = (n.documents || []).map((d) => ({
          ...d,
          status,
          aiNotes:
            status === "verified"
              ? "Статус подтверждён администратором"
              : status === "rejected"
              ? "Отклонено администратором"
              : "Ожидает ручной проверки",
          verifiedAt: Date.now(),
        }));

        if (docs.length > 0) {
          await saveNannyProfile({ id: n.id, documents: docs });
        }
      })
    );

    await loadData();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-slide-up">
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg text-stone-800">Админ-панель</h2>
            <p className="text-xs text-stone-500">Локальные данные / модерация / управление</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
            <Search size={16} className="text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по родителям/няням..."
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("overview")}
              className={`px-3 py-2 rounded-lg text-sm ${
                tab === "overview" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              Обзор
            </button>
            <button
              onClick={() => {
                setTab("parents");
                markParentsAsSeen();
              }}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                tab === "parents" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              Родители
              {unseenParentsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                  {unseenParentsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("nannies")}
              className={`px-3 py-2 rounded-lg text-sm ${
                tab === "nannies" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              Няни
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
            <input
              type="checkbox"
              checked={onlyProblematic}
              onChange={(e) => setOnlyProblematic(e.target.checked)}
            />
            Только проблемные анкеты
          </label>
          <div className="sm:w-72 flex gap-2">
            <Button onClick={handleClearTest} variant="secondary">
              <Trash2 size={16} /> Удалить тестовые
            </Button>
            <Button onClick={handleClear} variant="secondary">
              <Trash2 size={16} /> Очистить всё
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === "overview" && (
            <>
              {unseenParentsCount > 0 && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2 rounded-lg">
                  Новые/обновлённые заявки родителей: {unseenParentsCount}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="!p-4">
                <div className="text-xs text-stone-500">Заявки родителей</div>
                <div className="text-2xl font-bold text-stone-800 mt-1 flex items-center gap-2">
                  <ListChecks size={18} /> {parents.length}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Требуют действия: {parents.filter(p => ['new','in_review','rejected'].includes(p.status || 'new')).length}
                </div>
              </Card>

              <Card className="!p-4">
                <div className="text-xs text-stone-500">Анкеты нянь</div>
                <div className="text-2xl font-bold text-stone-800 mt-1 flex items-center gap-2">
                  <Users size={18} /> {nannies.length}
                </div>
              </Card>

              <Card className="!p-4 bg-green-50 border-green-100">
                <div className="text-xs text-stone-500">Верифицировано</div>
                <div className="text-2xl font-bold text-green-700 mt-1 flex items-center gap-2">
                  <ShieldCheck size={18} /> {stats.verified}
                </div>
              </Card>

              <Card className="!p-4 bg-amber-50 border-amber-100">
                <div className="text-xs text-stone-500">Документы на проверке</div>
                <div className="text-2xl font-bold text-amber-700 mt-1 flex items-center gap-2">
                  <ShieldAlert size={18} /> {stats.pendingDocs}
                </div>
              </Card>
            </div>
            </>
          )}

          {tab === "parents" && (
            <section>
              <h3 className="text-stone-500 font-bold uppercase text-xs mb-3">
                Заявки родителей ({filteredParents.length})
              </h3>

              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  ['all', 'Все'],
                  ['new', 'Новые'],
                  ['in_review', 'На проверке'],
                  ['resubmitted', 'Повторно отправленные'],
                  ['approved', 'Одобрены'],
                  ['rejected', 'Отклонены'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setParentStatusFilter(key as ParentStatus)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                      parentStatusFilter === key
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="mb-3 inline-flex items-center gap-2 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                <input
                  type="checkbox"
                  checked={onlyNeedsAction}
                  onChange={(e) => setOnlyNeedsAction(e.target.checked)}
                />
                Только требуют действия
              </label>

              <div className="mb-3 bg-red-50 border border-red-100 rounded-lg p-3 space-y-2">
                <div className="text-xs font-semibold text-red-700">Причина отклонения (для доработки анкеты)</div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={rejectReasonCode}
                    onChange={(e) => setRejectReasonCode(e.target.value as any)}
                    className="text-xs border border-red-200 rounded px-2 py-1 bg-white"
                  >
                    <option value="profile_incomplete">Анкета заполнена не полностью</option>
                    <option value="docs_missing">Не хватает документов</option>
                    <option value="budget_invalid">Некорректный бюджет</option>
                    <option value="contact_invalid">Некорректные контакты</option>
                    <option value="other">Другая причина</option>
                  </select>
                  <input
                    value={rejectReasonText}
                    onChange={(e) => setRejectReasonText(e.target.value)}
                    placeholder="Комментарий для пользователя"
                    className="flex-1 min-w-[220px] text-xs border border-red-200 rounded px-2 py-1"
                  />
                </div>
              </div>

              {filteredParents.length === 0 ? (
                <p className="text-stone-400 text-sm">Пусто</p>
              ) : (
                <div className="space-y-3">
                  {filteredParents.map((p) => (
                    <Card key={p.id} className="!p-4 bg-amber-50/50">
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>{new Date(p.createdAt).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${parentStatusBadge(p.status)}`}>
                            {parentStatusLabel(p.status)}
                          </span>
                          <span className="font-mono">{p.id.slice(0, 6)}</span>
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-stone-800">
                        {p.city} • {p.childAge}
                      </div>
                      <div className="text-sm text-stone-600 mt-1">График: {p.schedule}</div>
                      <div className="text-sm text-stone-600">Бюджет: {p.budget}</div>
                      {!!p.requirements?.length && (
                        <div className="text-xs text-stone-600 mt-1">
                          Требования: {p.requirements.join(", ")}
                        </div>
                      )}
                      {p.comment && (
                        <div className="text-xs text-stone-500 mt-2 italic">“{p.comment}”</div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setParentStatus(p, 'in_review')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                        >
                          На проверку
                        </button>
                        <button
                          onClick={() => setParentStatus(p, 'approved')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          Одобрить
                        </button>
                        <button
                          onClick={() => rejectParentWithReason(p)}
                          disabled={rejectReasonText.trim().length < 8}
                          title={rejectReasonText.trim().length < 8 ? 'Добавь комментарий (минимум 8 символов)' : 'Отклонить с причиной'}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                            rejectReasonText.trim().length < 8
                              ? 'bg-red-50 text-red-300 cursor-not-allowed'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Отклонить
                        </button>
                        <button
                          onClick={() => setSelectedParent(p)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200"
                        >
                          Открыть анкету
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "nannies" && (
            <section>
              <h3 className="text-stone-500 font-bold uppercase text-xs mb-3">
                Анкеты нянь ({filteredNannies.length})
              </h3>

              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  ["all", "Все"],
                  ["noDocs", "Без документов"],
                  ["rejected", "Есть отклонённые"],
                  ["pending", "Есть на проверке"],
                  ["unverified", "Не верифицированы"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setIssueFilter(key as NannyIssueFilter)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                      issueFilter === key
                        ? "bg-stone-800 text-white border-stone-800"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={bulkVerifyVisible}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                >
                  Массово: подтвердить профиль
                </button>
                <button
                  onClick={() => bulkSetDocsStatusVisible("verified")}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"
                >
                  Массово: документы подтверждены
                </button>
                <button
                  onClick={() => bulkSetDocsStatusVisible("pending")}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                >
                  Массово: документы на проверке
                </button>
              </div>

              {filteredNannies.length === 0 ? (
                <p className="text-stone-400 text-sm">Пусто</p>
              ) : (
                <div className="space-y-3">
                  {filteredNannies.map((n) => {
                    const docs = n.documents || [];
                    const isProblematic =
                      !n.isVerified ||
                      docs.length === 0 ||
                      docs.some((d) => d.status === "rejected" || d.status === "pending" || (d.aiConfidence || 0) < 70);

                    return (
                    <Card
                      key={n.id}
                      className={`!p-4 ${
                        n.isVerified ? "bg-green-50 border-green-100" : "bg-sky-50/50"
                      }`}
                    >
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          {isProblematic && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              проблема
                            </span>
                          )}
                          {n.isVerified && <ShieldCheck size={14} className="text-green-600" />}
                          <span className="font-mono">{n.id.slice(0, 6)}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 mt-2">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-stone-200 flex-shrink-0 flex items-center justify-center">
                          {n.photo ? (
                            <img src={n.photo} alt={n.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={24} className="text-stone-300" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="text-sm font-semibold text-stone-800">{n.name}</div>
                          <div className="text-sm text-stone-600">
                            {n.city} • Опыт: {n.experience} лет
                          </div>
                          <div className="text-xs text-stone-500 mt-1">{n.contact}</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => toggleVerified(n)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
                            n.isVerified
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          {n.isVerified ? "Снять верификацию" : "Подтвердить профиль"}
                        </button>

                        {n.video && (
                          <button className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-2 rounded-lg transition-colors justify-center">
                            <PlayCircle size={14} /> Смотреть видео
                          </button>
                        )}
                      </div>

                      {n.softSkills && (
                        <div className="mt-3 bg-white p-2 rounded border border-stone-100">
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mb-1">
                            <BrainCircuit size={12} /> AI-профиль ({n.softSkills.dominantStyle})
                          </div>
                          <p className="text-[10px] text-stone-500 leading-tight">{n.softSkills.summary}</p>
                        </div>
                      )}

                      {n.documents && n.documents.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {n.documents.map((doc, idx) => (
                            <div key={idx} className="bg-white p-2 rounded border border-stone-200">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <FileCheck2 size={14} className="text-stone-500" />
                                  <span className="text-xs font-bold text-stone-700 uppercase">
                                    {doc.type === "passport"
                                      ? "ПАСПОРТ"
                                      : doc.type === "medical_book"
                                      ? "МЕДКНИЖКА"
                                      : doc.type === "recommendation_letter"
                                      ? "РЕКОМЕНДАЦИЯ"
                                      : doc.type === "education_document"
                                      ? "ОБРАЗОВАНИЕ"
                                      : doc.type === "resume"
                                      ? "РЕЗЮМЕ"
                                      : "ДОКУМЕНТ"}
                                  </span>
                                  <span className="text-[10px] bg-stone-100 text-stone-500 px-1 rounded">
                                    {doc.status === "verified"
                                      ? "проверено"
                                      : doc.status === "pending"
                                      ? "загружено"
                                      : "отклонено"}
                                  </span>
                                  <button
                                    onClick={() => {
                                      if (!doc.fileDataUrl) {
                                        alert('Файл не прикреплён к этой записи. Перезагрузите резюме заново.');
                                        return;
                                      }
                                      setPreviewDoc({ url: doc.fileDataUrl, name: doc.fileName || 'document' });
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded ${doc.fileDataUrl ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-stone-100 text-stone-400'}`}
                                  >
                                    Просмотр
                                  </button>
                                </div>
                              </div>

                              <div className="text-[10px] text-stone-600 mt-1 italic">{doc.aiNotes}</div>

                              <div className="flex gap-1 mt-2">
                                {(["verified", "rejected"] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateDocumentStatus(n, idx, s)}
                                    className={`text-[10px] px-2 py-1 rounded ${
                                      doc.status === s
                                        ? "bg-stone-800 text-white"
                                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                    }`}
                                  >
                                    {s === "verified" ? "проверено" : "отклонить"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {n.reviews && n.reviews.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-stone-200/50">
                          <div className="text-xs font-bold text-stone-500 mb-2">
                            Отзывы ({n.reviews.length})
                          </div>

                          <div className="space-y-2">
                            {n.reviews.map((r: any, idx: number) => (
                              <div key={idx} className="bg-white p-2 rounded border border-stone-100">
                                <div className="flex justify-between">
                                  <div className="text-xs font-semibold text-stone-700">
                                    {r?.author ?? "Parent"}
                                  </div>
                                  {typeof r?.rating === "number" && (
                                    <div className="text-[10px] text-stone-500">★ {r.rating}/5</div>
                                  )}
                                </div>
                                {r?.text && <div className="text-[10px] text-stone-600 mt-1">{r.text}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {selectedParent && (
        <div className="fixed inset-0 z-[60] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-800">Анкета родителя</h3>
              <button
                onClick={() => setSelectedParent(null)}
                className="p-2 rounded-full hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-stone-500">Город</div>
                  <div className="font-semibold text-stone-800">{selectedParent.city}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-stone-500">Возраст ребёнка</div>
                  <div className="font-semibold text-stone-800">{selectedParent.childAge}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-stone-500">График</div>
                  <div className="font-semibold text-stone-800">{selectedParent.schedule}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-stone-500">Бюджет</div>
                  <div className="font-semibold text-stone-800">{selectedParent.budget}</div>
                </div>
              </div>

              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-500 mb-1">Требования</div>
                <div className="text-stone-700">
                  {selectedParent.requirements?.length
                    ? selectedParent.requirements.join(', ')
                    : 'Не указаны'}
                </div>
              </div>

              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-500 mb-1">Комментарий</div>
                <div className="text-stone-700">{selectedParent.comment || 'Нет комментария'}</div>
              </div>

              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-500 mb-1">Документы</div>
                {!selectedParent.documents?.length ? (
                  <div className="text-stone-500">Нет документов</div>
                ) : (
                  <div className="space-y-2">
                    {selectedParent.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-stone-100 rounded p-2">
                        <div className="text-xs text-stone-700">{(doc.fileName && !String(doc.fileName).startsWith('data:')) ? doc.fileName : `${doc.type}.pdf`}</div>
                        {doc.fileDataUrl ? (
                          <button
                            onClick={() => setPreviewDoc({ url: doc.fileDataUrl!, name: doc.fileName || 'document' })}
                            className="text-[10px] px-2 py-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-200"
                          >
                            Просмотр
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400">Файл недоступен</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-stone-400 flex items-center justify-between pt-1">
                <span>ID: {selectedParent.id}</span>
                <span>{new Date(selectedParent.createdAt).toLocaleString()}</span>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <span className={`text-[10px] px-2 py-1 rounded ${parentStatusBadge(selectedParent.status)}`}>
                  Статус: {parentStatusLabel(selectedParent.status)}
                </span>
                <span className="text-[10px] px-2 py-1 rounded bg-stone-100 text-stone-600">
                  Обновлено: {new Date(selectedParent.updatedAt || selectedParent.createdAt).toLocaleString()}
                </span>
              </div>

              {!!selectedParent.changeLog?.length && (
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-stone-500 mb-2">История изменений</div>
                  <div className="space-y-1">
                    {[...selectedParent.changeLog].slice(-6).reverse().map((item, idx) => (
                      <div key={idx} className="text-xs text-stone-600 flex items-center justify-between gap-2">
                        <span>{item.note || item.type}</span>
                        <span className="text-stone-400">{new Date(item.at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-[80] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-stone-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-stone-800 truncate pr-4">{previewDoc.name || 'Документ'}</div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.name || 'document'}
                  className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-200"
                >
                  Скачать
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-full hover:bg-stone-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {String(previewDoc.url).startsWith('data:image/') ? (
              <div className="flex-1 overflow-auto bg-stone-50 p-4">
                <img src={previewDoc.url} alt={previewDoc.name || 'preview'} className="max-w-full mx-auto rounded border border-stone-200" />
              </div>
            ) : (
              <iframe title="document-preview" src={previewDoc.url} className="flex-1 w-full" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
