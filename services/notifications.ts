import { ParentRequest } from '../types';
import { sendToWebhook } from './api';

export const notifyAdminNewRequest = async (req: ParentRequest) => {
  await sendToWebhook({
    event: 'admin.new_parent_request',
    subject: 'Новая заявка родителя',
    requestId: req.id,
    city: req.city,
    status: req.status || 'new',
    requesterEmail: req.requesterEmail || null,
    text: `Новая заявка #${req.id.slice(0, 8)} (${req.city}).`,
  });
};

export const notifyAdminResubmitted = async (req: ParentRequest) => {
  await sendToWebhook({
    event: 'admin.parent_request_resubmitted',
    subject: 'Заявка отправлена повторно',
    requestId: req.id,
    city: req.city,
    status: req.status || 'in_review',
    requesterEmail: req.requesterEmail || null,
    text: `Заявка #${req.id.slice(0, 8)} отправлена повторно на модерацию.`,
  });
};

export const notifyUserStatusChanged = async (req: ParentRequest) => {
  if (!req.requesterEmail) return;

  const statusMap: Record<string, string> = {
    new: 'Новая',
    in_review: 'На проверке',
    approved: 'Одобрена',
    rejected: 'Отклонена',
  };

  const statusLabel = statusMap[req.status || 'new'] || req.status || 'new';
  const reason = req.rejectionInfo?.reasonText
    ? ` Причина: ${req.rejectionInfo.reasonText}`
    : '';

  await sendToWebhook({
    event: 'user.parent_request_status_changed',
    to: req.requesterEmail,
    subject: `Статус заявки: ${statusLabel}`,
    requestId: req.id,
    status: req.status || 'new',
    text: `Ваша заявка #${req.id.slice(0, 8)}: статус «${statusLabel}».${reason}`,
  });
};
