---
name: blizko-supabase
description: "Supabase-паттерны для Blizko: схема БД, RLS policies, real-time каналы, auth flow, Edge Functions. Используй при работе с данными, аутентификацией, чатом, бронированиями."
---

# Blizko Supabase Patterns

## Архитектура данных

### Таблицы

```
parents          — заявки родителей (payload JSONB)
nannies          — профили нянь (payload JSONB)
bookings         — бронирования
booking_confirmations — подтверждения T-24h
chat_threads     — треды чата (type: 'support' | 'match')
chat_messages    — сообщения
chat_participants — участники тредов
admin_actions    — лог действий модераторов
```

### Ключевые связи

```
parents.user_id → auth.users.id
nannies.user_id → auth.users.id
bookings.parent_id → auth.users.id
bookings.nanny_id → auth.users.id
bookings.request_id → parents.id
chat_threads.family_id → auth.users.id
chat_threads.nanny_id → auth.users.id
chat_threads.match_id → parents.id (для match-тредов)
```

## Паттерн хранения: Payload JSONB

Blizko использует **payload pattern** — основные данные хранятся в JSONB-колонке `payload`.

```typescript
// Запись
const row = {
  id: item.id,
  user_id: userId,
  payload: item,  // весь объект ParentRequest/NannyProfile
};
await supabase.from('parents').upsert(row, { onConflict: 'id' });

// Чтение
const { data } = await supabase.from('parents')
  .select('id,payload,created_at');
const items = data.map(r => ({ ...r.payload, id: r.id }));
```

**Почему:** быстрая итерация без миграций. Фильтрация по payload полям:

```sql
SELECT * FROM parents WHERE payload->>'status' = 'approved';
```

## Auth Flow

```typescript
// Текущий пользователь
const { data } = await supabase.auth.getUser();
const userId = data.user?.id;

// Роль пользователя (из JWT / user_metadata)
const role = data.user?.user_metadata?.role; // 'parent' | 'nanny' | 'admin'

// Logout
await supabase.auth.signOut();
```

### Роли

- `parent` — родитель, может создавать заявки, видеть match results, чатиться
- `nanny` — няня, может видеть свой профиль, заявки, подтверждать бронирования
- `admin` — оператор, полный доступ к модерации

## Real-time: Чат

```typescript
// Подписка на новые сообщения
const channel = supabase
  .channel(`match-thread-${threadId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `thread_id=eq.${threadId}`
  }, (payload) => onMessage(payload.new))
  .subscribe();

// Отписка
supabase.removeChannel(channel);
```

### Тред для match-чата

```typescript
// Создание треда
await supabase.from('chat_threads').insert({
  type: 'match',
  family_id: parentUserId,
  nanny_id: nannyUserId,
  match_id: parentRequestId
});

// Добавление участника
await supabase.from('chat_participants').upsert({
  thread_id: threadId,
  user_id: userId,
  role: 'family' | 'nanny'
});
```

## Бронирования

```typescript
// Создание
await supabase.from('bookings').insert({
  parent_id: userId,
  nanny_id: nannyId,
  request_id: requestId,
  date: bookingDate,
  status: 'pending',
  amount: calculatedAmount
});

// Обновление статуса
await supabase.from('bookings')
  .update({ status: 'confirmed' })
  .eq('id', bookingId);

// Статусы: pending → confirmed → active → completed | cancelled
```

## T-24h подтверждения

```typescript
// Создание при бронировании
await supabase.from('booking_confirmations').insert({
  booking_id: bookingId,
  type: 't_24h',
  status: 'pending',
  due_at: new Date(bookingDate.getTime() - 24*60*60*1000)
});

// Подтверждение няней
await supabase.from('booking_confirmations')
  .update({ status: 'confirmed', responded_at: new Date() })
  .eq('id', confirmationId);
```

## Error Handling

```typescript
// Паттерн для всех Supabase-вызовов
async function safeQuery<T>(
  query: Promise<{ data: T | null; error: any }>
): Promise<T | null> {
  try {
    const { data, error } = await query;
    if (error) {
      console.error('[Supabase]', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('[Supabase] unexpected:', e);
    return null;
  }
}
```

## Правила

1. **Dual write** — всегда сохраняй и в localStorage, и в Supabase
2. **Offline-first** — если Supabase недоступен, работай с localStorage
3. **Optimistic UI** — показывай результат до ответа сервера
4. **Payload JSONB** — не создавай новые колонки без необходимости
5. **Auth guard** — проверяй `getCurrentUserId()` перед записью
