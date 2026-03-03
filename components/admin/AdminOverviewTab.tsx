import React from 'react';
import { Card } from '../UI';
import { ParentRequest } from '../../types';
import {
    ListChecks,
    Users,
    CheckCircle,
    FileCheck2,
    ShieldCheck,
    ShieldAlert,
} from 'lucide-react';

interface AdminOverviewTabProps {
    parents: ParentRequest[];
    nannies: { isVerified: boolean; documents?: { type: string; status: string; fileDataUrl?: string }[] }[];
    unseenParentsCount: number;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
    parents,
    nannies,
    unseenParentsCount,
}) => {
    const verified = nannies.filter((n) => n.isVerified).length;
    const withDocs = nannies.filter((n) => (n.documents || []).length > 0).length;
    const pendingDocs = nannies.reduce(
        (acc, n) => acc + (n.documents || []).filter((d) => d.status === 'pending').length,
        0
    );
    const aReady = nannies.filter((n) => {
        const docs = n.documents || [];
        const hasPassport = docs.some((d) => d.type === 'passport' && d.fileDataUrl);
        const hasResume = docs.some((d) => d.type === 'resume' && d.fileDataUrl);
        return hasPassport && hasResume;
    }).length;

    return (
        <>
            {unseenParentsCount > 0 && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2 rounded-lg">
                    Новые/обновлённые заявки родителей: {unseenParentsCount}
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <Card className="!p-4">
                    <div className="text-xs text-stone-500">Заявки родителей</div>
                    <div className="text-2xl font-bold text-stone-800 mt-1 flex items-center gap-2">
                        <ListChecks size={18} /> {parents.length}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                        Требуют действия: {parents.filter(p => ['new', 'in_review', 'rejected'].includes(p.status || 'new')).length}
                    </div>
                </Card>

                <Card className="!p-4">
                    <div className="text-xs text-stone-500">Анкеты нянь</div>
                    <div className="text-2xl font-bold text-stone-800 mt-1 flex items-center gap-2">
                        <Users size={18} /> {nannies.length}
                    </div>
                </Card>

                <Card className="!p-4 bg-indigo-50 border-indigo-100">
                    <div className="text-xs text-stone-500">A-ready (паспорт+резюме)</div>
                    <div className="text-2xl font-bold text-indigo-700 mt-1 flex items-center gap-2">
                        <CheckCircle size={18} /> {aReady}
                    </div>
                </Card>

                <Card className="!p-4 bg-sky-50 border-sky-100">
                    <div className="text-xs text-stone-500">Документы загружены</div>
                    <div className="text-2xl font-bold text-sky-700 mt-1 flex items-center gap-2">
                        <FileCheck2 size={18} /> {withDocs}
                    </div>
                </Card>

                <Card className="!p-4 bg-green-50 border-green-100">
                    <div className="text-xs text-stone-500">Верифицировано</div>
                    <div className="text-2xl font-bold text-green-700 mt-1 flex items-center gap-2">
                        <ShieldCheck size={18} /> {verified}
                    </div>
                </Card>

                <Card className="!p-4 bg-amber-50 border-amber-100">
                    <div className="text-xs text-stone-500">Документы на проверке</div>
                    <div className="text-2xl font-bold text-amber-700 mt-1 flex items-center gap-2">
                        <ShieldAlert size={18} /> {pendingDocs}
                    </div>
                </Card>
            </div>
        </>
    );
};
