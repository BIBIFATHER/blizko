import { NannyProfile, DocumentVerification } from '../../types';

export const escapeCsv = (value: unknown) => {
    const str = String(value ?? "");
    if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
};

export const getNannyExportRows = (nannies: NannyProfile[]) => {
    return nannies.map((n) => {
        const docs = n.documents || [];
        const hasResume = docs.some((d) => d.type === 'resume' && !!d.fileDataUrl);
        const pdConsent = docs.length > 0;
        const requiredDone = Boolean(
            n.name &&
            n.contact &&
            n.city &&
            n.experience &&
            n.schedule &&
            n.expectedRate &&
            hasResume &&
            pdConsent
        );
        const status = requiredDone ? 'READY_FOR_MATCH' : 'INCOMPLETE';

        return {
            id: n.id,
            createdAt: new Date(n.createdAt).toISOString(),
            name: n.name,
            contact: n.contact,
            city: n.city,
            experience: n.experience,
            schedule: n.schedule || '',
            expectedRate: n.expectedRate || '',
            isVerified: n.isVerified ? '1' : '0',
            hasResume: hasResume ? '1' : '0',
            pdConsent: pdConsent ? '1' : '0',
            status,
        };
    });
};

export const exportNanniesCsv = (nannies: NannyProfile[]) => {
    const header = [
        'id', 'created_at', 'name', 'phone_or_contact', 'city',
        'experience_years', 'schedule', 'expected_rate', 'is_verified',
        'resume_uploaded', 'pd_consent', 'status', 'source',
    ];

    const rows = getNannyExportRows(nannies).map((r) => [
        r.id, r.createdAt, r.name, r.contact, r.city,
        r.experience, r.schedule, r.expectedRate, r.isVerified,
        r.hasResume, r.pdConsent, r.status, 'blizko_app',
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blizko_nannies_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

export const getNanniesOpsMatrix = (nannies: NannyProfile[]) => {
    const header = [
        'created_at', 'candidate_name', 'phone', 'source', 'status',
        'fio_ok', 'phone_ok', 'city_district_ok', 'schedule_ok',
        'experience_ok', 'expected_rate_ok', 'resume_ok', 'pd_consent_ok',
        'missing_fields', 'manager_comment', 'ready_for_match',
    ];

    const rows = getNannyExportRows(nannies).map((r) => [
        r.createdAt, r.name, r.contact, 'blizko_app', r.status,
        r.name ? '1' : '0', r.contact ? '1' : '0', r.city ? '1' : '0',
        r.schedule ? '1' : '0', r.experience ? '1' : '0',
        r.expectedRate ? '1' : '0', r.hasResume, r.pdConsent,
        '', '', r.status === 'READY_FOR_MATCH' ? 'TRUE' : 'FALSE',
    ]);

    return [header, ...rows];
};

export const exportNanniesOpsCsv = (nannies: NannyProfile[]) => {
    const matrix = getNanniesOpsMatrix(nannies);
    const csv = matrix.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blizko_nannies_ops_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

export const copyNanniesOpsForTable = async (nannies: NannyProfile[]) => {
    const matrix = getNanniesOpsMatrix(nannies);
    const tsv = matrix.map((row) => row.map((v) => String(v ?? '')).join('\t')).join('\n');
    try {
        await navigator.clipboard.writeText(tsv);
        alert('Скопировано. Вставьте в Google Sheets в ячейку A1.');
    } catch {
        alert('Не удалось скопировать автоматически. Скачайте CSV и импортируйте в таблицу.');
    }
};
