# KPI_DICTIONARY.md — словарь метрик и статусов

## Воронка нянь (ops)
- **new** — новый отклик/анкета, ещё не обработан
- **contacted** — отправлено первое сообщение/звонок
- **responded** — получен ответ от няни
- **in_review** — анкета на проверке/модерации
- **approved** — анкета принята, готова к матчам
- **matched** — есть потенциальный матч с семьёй
- **deal_done** — состоялась сделка

## Ключевые метрики
- **responded %** = responded / contacted
- **approved %** = approved / responded
- **matched %** = matched / approved
- **deal_done %** = deal_done / matched
- **time‑to‑respond** — время до первого ответа няни
- **time‑to‑match** — время от заявки до матча
- **complaint rate** — доля жалоб на число сделок
