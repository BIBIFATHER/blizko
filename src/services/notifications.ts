import { ParentRequest } from '@/core/types';
import { sendToWebhook } from './api';

const ADMIN_BASE_URL = 'https://www.blizko.app';

function escapeHtml(value?: string | null) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function compact(value?: string | null, fallback = 'не указано') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function compactList(values?: string[]) {
  const clean = (values || []).map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return 'не указано';
  return clean.slice(0, 4).join(', ');
}

function formatAdminParentRequestMessage(req: ParentRequest, title: string) {
  const shortId = req.id.slice(0, 8);
  const adminUrl = `${ADMIN_BASE_URL}/admin/parents?q=${encodeURIComponent(shortId)}`;
  const district = [req.district, req.metro ? `м. ${req.metro}` : ''].filter(Boolean).join(', ');
  const comment = compact(req.comment, 'без комментария');
  const trimmedComment = comment.length > 360 ? `${comment.slice(0, 357)}...` : comment;
  const requester = req.requesterEmail || req.requesterId || '';
  const sharing = req.isNannySharing ? '\n🤝 <b>Формат:</b> няня на две семьи возможна' : '';

  return {
    shortId,
    adminUrl,
    text: `${title} <a href="${adminUrl}">#${escapeHtml(shortId)}</a>

📍 <b>Локация:</b> ${escapeHtml(compact(req.city))}${district ? `, ${escapeHtml(district)}` : ''}
👶 <b>Ребёнок:</b> ${escapeHtml(compact(req.childAge))}
🗓 <b>График:</b> ${escapeHtml(compact(req.schedule))}
💰 <b>Бюджет:</b> ${escapeHtml(compact(req.budget))}
🧩 <b>Важно:</b> ${escapeHtml(compactList(req.requirements))}${sharing}
💬 <b>Комментарий:</b> ${escapeHtml(trimmedComment)}
${requester ? `\n👤 <b>Контакт:</b> ${escapeHtml(requester)}` : ''}

Открой заявку в админке, чтобы развернуть детали и взять в работу.`,
  };
}

export const notifyAdminNewRequest = async (req: ParentRequest): Promise<boolean> => {
  const message = formatAdminParentRequestMessage(req, '🆕 <b>Новая заявка</b>');

  return sendToWebhook({
    channel: 'telegram',
    event: 'admin.new_parent_request',
    subject: 'Новая заявка родителя',
    requestId: req.id,
    city: req.city,
    status: req.status || 'new',
    requesterEmail: req.requesterEmail || null,
    text: message.text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: `Открыть заявку #${message.shortId}`, url: message.adminUrl }]],
    },
  });
};

export const notifyAdminResubmitted = async (req: ParentRequest): Promise<boolean> => {
  const message = formatAdminParentRequestMessage(req, '🔁 <b>Заявка отправлена повторно</b>');

  return sendToWebhook({
    channel: 'telegram',
    event: 'admin.parent_request_resubmitted',
    subject: 'Заявка отправлена повторно',
    requestId: req.id,
    city: req.city,
    status: req.status || 'in_review',
    requesterEmail: req.requesterEmail || null,
    text: message.text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: `Открыть заявку #${message.shortId}`, url: message.adminUrl }]],
    },
  });
};

export const notifyUserStatusChanged = async (req: ParentRequest): Promise<boolean> => {
  if (!req.requesterEmail) return false;

  const statusMap: Record<string, string> = {
    payment_pending: 'Ожидает оплаты',
    new: 'Новая',
    in_review: 'На проверке',
    resubmitted: 'Отправлена повторно',
    approved: 'Одобрена',
    rejected: 'Отклонена',
  };

  const statusLabel = statusMap[req.status || 'new'] || req.status || 'new';
  const reason = req.rejectionInfo?.reasonText ? ` Причина: ${req.rejectionInfo.reasonText}` : '';

  return sendToWebhook({
    event: 'user.parent_request_status_changed',
    to: req.requesterEmail,
    subject: `Статус заявки: ${statusLabel}`,
    requestId: req.id,
    status: req.status || 'new',
    text: `Ваша заявка #${req.id.slice(0, 8)}: статус «${statusLabel}».${reason}`,
  });
};
