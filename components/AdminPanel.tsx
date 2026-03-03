import React, { useEffect, useState } from 'react';
import {
  clearAllData,
  clearTestData,
} from '../services/storage';
import { ParentRequest, NannyProfile } from '../types';
import { Button } from './UI';
import { supabase } from '../services/supabase';
import { Trash2, X, Search } from 'lucide-react';
import { AdminOverviewTab } from './admin/AdminOverviewTab';
import { AdminParentsTab } from './admin/AdminParentsTab';
import { AdminNanniesTab } from './admin/AdminNanniesTab';

type AdminTab = 'overview' | 'parents' | 'nannies';

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [parents, setParents] = useState<ParentRequest[]>([]);
  const [nannies, setNannies] = useState<NannyProfile[]>([]);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [query, setQuery] = useState('');
  const [onlyProblematic, setOnlyProblematic] = useState(false);
  const [unseenParentsCount, setUnseenParentsCount] = useState(0);

  const loadData = async () => {
    const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const [pr, nr] = await Promise.all([
      fetch('/api/data/parents', { headers }).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
      fetch('/api/data/nannies', { headers }).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
    ]);

    const p = Array.isArray(pr?.items) ? pr.items : [];
    const n = Array.isArray(nr?.items) ? nr.items : [];

    setParents(p);
    setNannies(n);

    const seenTs = Number(localStorage.getItem('blizko_admin_parents_seen_ts') || '0');
    const unseen = p.filter((item: ParentRequest) => Number(item.updatedAt || item.createdAt || 0) > seenTs).length;
    setUnseenParentsCount(unseen);
  };

  useEffect(() => {
    loadData();
  }, []);

  const logAdminAction = (action: string, meta?: Record<string, any>) => {
    try {
      const raw = localStorage.getItem('blizko_admin_actions') || '[]';
      const items = JSON.parse(raw);
      items.unshift({ action, meta, at: Date.now() });
      localStorage.setItem('blizko_admin_actions', JSON.stringify(items.slice(0, 200)));
    } catch {
      // ignore
    }
  };

  const handleClear = async () => {
    if (confirm('Удалить все данные?')) {
      logAdminAction('clear_all');
      await clearAllData();
      setParents([]);
      setNannies([]);
    }
  };

  const handleClearTest = async () => {
    if (confirm('Удалить только тестовые записи (id начинается с test-)?')) {
      logAdminAction('clear_test');
      await clearTestData();
      await loadData();
    }
  };

  const markParentsAsSeen = () => {
    localStorage.setItem('blizko_admin_parents_seen_ts', String(Date.now()));
    setUnseenParentsCount(0);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-slide-up">
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-gradient-to-r from-stone-50 via-white to-stone-50 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg text-stone-800">Админ-панель</h2>
            <p className="text-xs text-stone-500">Локальные данные / модерация / управление</p>
            <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 inline-block">
              Blizko+ — подбор, который объясним • гарантия прихода
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
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
              onClick={() => setTab('overview')}
              className={`px-3 py-2 rounded-lg text-sm ${tab === 'overview' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Обзор
            </button>
            <button
              onClick={() => { setTab('parents'); markParentsAsSeen(); }}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${tab === 'parents' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Родители
              {unseenParentsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">{unseenParentsCount}</span>
              )}
            </button>
            <button
              onClick={() => setTab('nannies')}
              className={`px-3 py-2 rounded-lg text-sm ${tab === 'nannies' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Няни
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
            <input type="checkbox" checked={onlyProblematic} onChange={(e) => setOnlyProblematic(e.target.checked)} />
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
          {tab === 'overview' && (
            <AdminOverviewTab
              parents={parents}
              nannies={nannies}
              unseenParentsCount={unseenParentsCount}
            />
          )}
          {tab === 'parents' && (
            <AdminParentsTab
              parents={parents}
              query={query}
              onDataChanged={loadData}
            />
          )}
          {tab === 'nannies' && (
            <AdminNanniesTab
              nannies={nannies}
              query={query}
              onlyProblematic={onlyProblematic}
              onDataChanged={loadData}
              logAdminAction={logAdminAction}
            />
          )}
        </div>
      </div>
    </div>
  );
};
