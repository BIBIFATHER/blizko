import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Рендерит полноэкранный оверлей через портал в document.body.
 *
 * Зачем: модалки с `position: fixed inset-0`, вложенные в контейнеры с `transform`
 * (анимации шагов формы — `.step-enter`, `.animate-slide-up` и т.п.), позиционируются
 * относительно трансформированного предка, а не вьюпорта → верх уезжает под статус-бар
 * на мобильном. Портал выносит оверлей из такого предка. (ModalShell делает это сам.)
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
}
