# Nanny Role MVP — Tech Spec

## GOAL
Внедрить role-based routing, route guards и feature flags для MVP Nanny Mode.

## ARCHITECTURE IMPACT
- Добавить role-based routing (nanny/family)
- Ввести route guards по ролям
- Добавить feature flags для nanny функций

## SECURITY IMPACT
- Ограничение доступа к маршрутам по ролям (admin/family/nanny)
- Исключить неавторизованный доступ к /admin, /family/*, /nanny/*

## DATA IMPACT
- Требуется `user.role` (nanny/family/admin)
- Источник роли: auth/session/user profile

## SCALE RISK
Низкий (логика маршрутизации + guards)

## TECH DEBT RISK
Средний, если flags будут разрастаться без управления

## IMPLEMENTATION PLAN
1) **Role-based routing**
```js
if (user.role === "nanny") { route = "/nanny-dashboard" }
else if (user.role === "family") { route = "/family-dashboard" }
```

2) **Route Guards**
- `/admin` → only admin
- `/family/*` → family only
- `/nanny/*` → nanny only

3) **Feature Flags (initial)**
```js
features = { nannyMatching: false, nannyMessaging: false }
```

4) **MVP Nanny Dashboard**
Nanny видит только:
- Статус (Pending / Verified / Matched)
- Профиль
- Документы
- FAQ
- Поддержка

## ROLLBACK PLAN
Удалить guards/flags и вернуть единый маршрут на общий дашборд.

## FILES TO CREATE/UPDATE (tech/**)
- tech/architecture/nanny_role_mvp.md
- (дальше по реализации) маршруты/guards/flags
