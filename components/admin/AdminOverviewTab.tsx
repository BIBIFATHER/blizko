import React from 'react';
import { Card } from '../UI';
import { NannyProfile, ParentRequest } from '../../types';
import {
    ListChecks,
    Users,
    CheckCircle,
    FileCheck2,
    ShieldCheck,
    ShieldAlert,
    TrendingUp,
    MessageSquareText,
    RefreshCw,
} from 'lucide-react';
import { Booking } from '../../services/booking';
import { buildDashboardMetrics } from '../../services/dashboardMetrics';
import { getAnalyticsEvents } from '../../services/analytics';
import { getNannyReadinessSnapshot } from '../../services/nannyReadiness';

interface AdminOverviewTabProps {
    parents: ParentRequest[];
    nannies: NannyProfile[];
    bookings: Booking[];
    unseenParentsCount: number;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
    parents,
    nannies,
    bookings,
    unseenParentsCount,
}) => {
    const metrics = React.useMemo(() => buildDashboardMetrics({
        parents,
        nannies,
        bookings,
        events: getAnalyticsEvents(),
    }), [bookings, nannies, parents]);

    const readiness = React.useMemo(() => nannies.map((n) => getNannyReadinessSnapshot(n)), [nannies]);
    const verified = nannies.filter((n) => n.isVerified).length;
    const withDocs = metrics.supply.docsUploaded;
    const pendingDocs = nannies.reduce(
        (acc, n) => acc + (n.documents || []).filter((d) => d.status === 'pending').length,
        0
    );
    const aReady = readiness.filter((item) => item.readyForReview).length;
    const qualityApproved = readiness.filter((item) => item.qualityApproved).length;

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
                        <ListChecks size={18} /> {metrics.parentOps.total}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                        Требуют действия: {metrics.parentOps.needsAction}
                    </div>
                </Card>

                <Card className="!p-4">
                    <div className="text-xs text-stone-500">Анкеты нянь</div>
                    <div className="text-2xl font-bold text-stone-800 mt-1 flex items-center gap-2">
                        <Users size={18} /> {metrics.supply.total}
                    </div>
                </Card>

                <Card className="!p-4 bg-indigo-50 border-indigo-100">
                    <div className="text-xs text-stone-500">Готовы к ручной проверке</div>
                    <div className="text-2xl font-bold text-indigo-700 mt-1 flex items-center gap-2">
                        <CheckCircle size={18} /> {aReady}
                    </div>
                </Card>

                <Card className="!p-4 bg-emerald-50 border-emerald-100">
                    <div className="text-xs text-stone-500">Quality-approved supply</div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1 flex items-center gap-2">
                        <TrendingUp size={18} /> {qualityApproved}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                        Готовы к показу семье
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
                <Card className="!p-4">
                    <div className="text-xs uppercase tracking-wide text-stone-400 mb-2">Parent Conversion</div>
                    <div className="space-y-2 text-sm text-stone-600">
                        <div className="flex items-center justify-between">
                            <span>Старт формы</span>
                            <strong className="text-stone-800">{metrics.parentConversion.starts}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Отправлено</span>
                            <strong className="text-stone-800">{metrics.parentConversion.submitted}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Увидели мэтчи</span>
                            <strong className="text-stone-800">{metrics.parentConversion.resultsViewed}</strong>
                        </div>
                        <div className="pt-2 text-[11px] text-stone-500">
                            Submit rate: {metrics.parentConversion.submitRate}% • Match view rate: {metrics.parentConversion.matchViewRate}%
                        </div>
                    </div>
                </Card>

                <Card className="!p-4">
                    <div className="text-xs uppercase tracking-wide text-stone-400 mb-2">Nanny Quality Funnel</div>
                    <div className="space-y-2 text-sm text-stone-600">
                        <div className="flex items-center justify-between">
                            <span>Документы</span>
                            <strong className="text-stone-800">{metrics.supply.docsUploaded}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Резюме распознано</span>
                            <strong className="text-stone-800">{metrics.supply.resumesParsed}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Готовы к ревью</span>
                            <strong className="text-stone-800">{metrics.supply.readyForReview}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Quality-approved</span>
                            <strong className="text-emerald-700">{metrics.supply.qualityApproved}</strong>
                        </div>
                    </div>
                </Card>

                <Card className="!p-4">
                    <div className="text-xs uppercase tracking-wide text-stone-400 mb-2">Post-Match Retention</div>
                    <div className="space-y-2 text-sm text-stone-600">
                        <div className="flex items-center justify-between">
                            <span>Открыли профиль</span>
                            <strong className="text-stone-800 flex items-center gap-1"><MessageSquareText size={14} /> {metrics.retention.profileOpens}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Создано бронирований</span>
                            <strong className="text-stone-800">{metrics.retention.bookingsCreated}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Повторные семьи</span>
                            <strong className="text-stone-800 flex items-center gap-1"><RefreshCw size={14} /> {metrics.retention.repeatFamilies}</strong>
                        </div>
                        <div className="text-[11px] text-stone-500 pt-2">
                            First action rate: {metrics.retention.firstActionRate}% • Booking rate: {metrics.retention.bookingRate}%
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
};
