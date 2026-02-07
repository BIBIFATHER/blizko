import React, { useEffect, useMemo, useState } from "react";
import {
  getParentRequests,
  getNannyProfiles,
  clearAllData,
  saveNannyProfile,
} from "../services/storage";
import { ParentRequest, NannyProfile, DocumentVerification } from "../types";
import { Button, Card } from "./UI";
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

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [parents, setParents] = useState<ParentRequest[]>([]);
  const [nannies, setNannies] = useState<NannyProfile[]>([]);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [query, setQuery] = useState("");
  const [onlyProblematic, setOnlyProblematic] = useState(false);

  const loadData = () => {
    setParents(getParentRequests());
    setNannies(getNannyProfiles());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClear = () => {
    if (confirm("Удалить все данные?")) {
      clearAllData();
      setParents([]);
      setNannies([]);
    }
  };

  const toggleVerified = (nanny: NannyProfile) => {
    saveNannyProfile({ id: nanny.id, isVerified: !nanny.isVerified });
    loadData();
  };

  const updateDocumentStatus = (
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

    saveNannyProfile({ id: nanny.id, documents: docs });
    loadData();
  };

  const filteredParents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter(
      (p) =>
        p.city.toLowerCase().includes(q) ||
        p.comment.toLowerCase().includes(q) ||
        p.requirements.join(" ").toLowerCase().includes(q)
    );
  }, [parents, query]);

  const filteredNannies = useMemo(() => {
    const q = query.trim().toLowerCase();

    const byQuery = (n: NannyProfile) =>
      !q ||
      [n.name, n.city, n.about, n.contact, (n.skills || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q);

    const hasProblem = (n: NannyProfile) => {
      const docs = n.documents || [];
      const hasRejected = docs.some((d) => d.status === "rejected");
      const hasPending = docs.some((d) => d.status === "pending");
      const hasNoDocs = docs.length === 0;
      const lowConfidence = docs.some((d) => (d.aiConfidence || 0) < 70);
      return !n.isVerified || hasNoDocs || hasRejected || hasPending || lowConfidence;
    };

    return nannies.filter((n) => byQuery(n) && (!onlyProblematic || hasProblem(n)));
  }, [nannies, query, onlyProblematic]);

  const stats = useMemo(() => {
    const verified = nannies.filter((n) => n.isVerified).length;
    const withDocs = nannies.filter((n) => (n.documents || []).length > 0).length;
    const pendingDocs = nannies.reduce(
      (acc, n) => acc + (n.documents || []).filter((d) => d.status === "pending").length,
      0
    );
    return { verified, withDocs, pendingDocs };
  }, [nannies]);

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-slide-up">
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg text-stone-800">Admin Panel</h2>
            <p className="text-xs text-stone-500">Локальные данные / модерация / запуск</p>
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
              onClick={() => setTab("parents")}
              className={`px-3 py-2 rounded-lg text-sm ${
                tab === "parents" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              Родители
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
          <div className="sm:w-56">
            <Button onClick={handleClear} variant="secondary">
              <Trash2 size={16} /> Очистить данные
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === "overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="!p-4">
                <div className="text-xs text-stone-500">Заявки родителей</div>
                <div className="text-2xl font-bold text-stone-800 mt-1 flex items-center gap-2">
                  <ListChecks size={18} /> {parents.length}
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
                <div className="text-xs text-stone-500">Документы pending</div>
                <div className="text-2xl font-bold text-amber-700 mt-1 flex items-center gap-2">
                  <ShieldAlert size={18} /> {stats.pendingDocs}
                </div>
              </Card>
            </div>
          )}

          {tab === "parents" && (
            <section>
              <h3 className="text-stone-500 font-bold uppercase text-xs mb-3">
                Заявки родителей ({filteredParents.length})
              </h3>

              {filteredParents.length === 0 ? (
                <p className="text-stone-400 text-sm">Пусто</p>
              ) : (
                <div className="space-y-3">
                  {filteredParents.map((p) => (
                    <Card key={p.id} className="!p-4 bg-amber-50/50">
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>{new Date(p.createdAt).toLocaleString()}</span>
                        <span className="font-mono">{p.id.slice(0, 6)}</span>
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
                              issue
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
                            <BrainCircuit size={12} /> AI Profile ({n.softSkills.dominantStyle})
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
                                  <span className="text-xs font-bold text-stone-700 uppercase">{doc.type}</span>
                                  <span className="text-[10px] bg-stone-100 text-stone-500 px-1 rounded">
                                    {doc.status} • {doc.aiConfidence}%
                                  </span>
                                </div>
                              </div>

                              <div className="text-[10px] text-stone-600 mt-1 italic">{doc.aiNotes}</div>

                              <div className="flex gap-1 mt-2">
                                {(["verified", "pending", "rejected"] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateDocumentStatus(n, idx, s)}
                                    className={`text-[10px] px-2 py-1 rounded ${
                                      doc.status === s
                                        ? "bg-stone-800 text-white"
                                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                    }`}
                                  >
                                    {s}
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
                            Reviews ({n.reviews.length})
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
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
