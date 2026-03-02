import React, { useEffect, useState } from "react";
import { getParentRequests, getNannyProfiles, clearAllData } from "../services/storage";
import { ParentRequest, NannyProfile } from "../types";
import { Button, Card } from "./UI";
import {
  Trash2,
  X,
  ShieldCheck,
  BrainCircuit,
  CheckCircle,
  PlayCircle,
  User as UserIcon,
} from "lucide-react";

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [parents, setParents] = useState<ParentRequest[]>([]);
  const [nannies, setNannies] = useState<NannyProfile[]>([]);

  useEffect(() => {
    setParents(getParentRequests());
    setNannies(getNannyProfiles());
  }, []);

  const handleClear = () => {
    if (confirm("Удалить все данные?")) {
      clearAllData();
      setParents([]);
      setNannies([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-slide-up">
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
          <h2 className="font-bold text-lg text-stone-800">Admin Debug</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-500">
              Данные берутся из локального хранилища (debug).
            </div>
            <Button onClick={handleClear} variant="secondary">
              <Trash2 size={16} />
              Очистить данные
            </Button>
          </div>

          {/* Parents */}
          <section>
            <h3 className="text-stone-500 font-bold uppercase text-xs mb-3">
              Заявки родителей ({parents.length})
            </h3>

            {parents.length === 0 ? (
              <p className="text-stone-400 text-sm">Пусто</p>
            ) : (
              <div className="space-y-3">
                {parents.map((p) => (
                  <Card key={p.id} className="!p-4 bg-amber-50/50">
                    <div className="flex justify-between text-xs text-stone-400 mb-1">
                      <span>{new Date(p.createdAt).toLocaleString()}</span>
                      <span className="font-mono">{p.id.slice(0, 6)}</span>
                    </div>

                    <div className="text-sm font-semibold text-stone-800">
                      {p.city} • {p.childAge}
                    </div>
                    <div className="text-sm text-stone-600 mt-1">
                      Бюджет: {p.budget}
                    </div>
                    {p.comment && (
                      <div className="text-xs text-stone-500 mt-2 italic">
                        “{p.comment}”
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Nannies */}
          <section>
            <h3 className="text-stone-500 font-bold uppercase text-xs mb-3">
              Анкеты нянь ({nannies.length})
            </h3>

            {nannies.length === 0 ? (
              <p className="text-stone-400 text-sm">Пусто</p>
            ) : (
              <div className="space-y-3">
                {nannies.map((n) => (
                  <Card
                    key={n.id}
                    className={`!p-4 ${
                      n.isVerified ? "bg-green-50 border-green-100" : "bg-sky-50/50"
                    }`}
                  >
                    <div className="flex justify-between text-xs text-stone-400 mb-1">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        {n.isVerified && (
                          <ShieldCheck size={14} className="text-green-600" />
                        )}
                        <span className="font-mono">{n.id.slice(0, 6)}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 mt-2">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-stone-200 flex-shrink-0 flex items-center justify-center">
                        {n.photo ? (
                          <img
                            src={n.photo}
                            alt={n.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon size={24} className="text-stone-300" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-semibold text-stone-800">
                          {n.name}
                        </div>
                        <div className="text-sm text-stone-600">
                          {n.city} • Опыт: {n.experience} лет
                        </div>
                        <div className="text-xs text-stone-500 mt-1">{n.contact}</div>
                      </div>
                    </div>

                    {n.video && (
                      <div className="mt-3">
                        <button className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors w-full justify-center">
                          <PlayCircle size={14} /> Watch Video Interview
                        </button>
                      </div>
                    )}

                    {n.softSkills && (
                      <div className="mt-3 bg-white p-2 rounded border border-stone-100">
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mb-1">
                          <BrainCircuit size={12} /> AI Profile ({n.softSkills.dominantStyle})
                        </div>
                        <p className="text-[10px] text-stone-500 leading-tight">
                          {n.softSkills.summary}
                        </p>
                      </div>
                    )}

                    {n.documents && n.documents.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {n.documents.map((doc, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2 rounded border border-green-100 flex items-start gap-2"
                          >
                            <CheckCircle size={14} className="text-green-500 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-stone-700 uppercase">
                                  {doc.type}
                                </span>
                                <span className="text-[10px] bg-stone-100 text-stone-500 px-1 rounded">
                                  Confidence: {doc.aiConfidence}%
                                </span>
                              </div>
                              {doc.documentNumber && (
                                <div className="text-[10px] font-mono text-stone-500">
                                  {doc.documentNumber}
                                </div>
                              )}
                              <div className="text-[10px] text-green-700 mt-0.5 italic">
                                {doc.aiNotes}
                              </div>
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
                            <div
                              key={idx}
                              className="bg-white p-2 rounded border border-stone-100"
                            >
                              <div className="flex justify-between">
                                <div className="text-xs font-semibold text-stone-700">
                                  {r?.author ?? "Parent"}
                                </div>
                                {typeof r?.rating === "number" && (
                                  <div className="text-[10px] text-stone-500">
                                    ★ {r.rating}/5
                                  </div>
                                )}
                              </div>
                              {r?.text && (
                                <div className="text-[10px] text-stone-600 mt-1">
                                  {r.text}
                                </div>
                              )}
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
        </div>
      </div>
    </div>
  );
};
