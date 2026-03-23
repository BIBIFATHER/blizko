# Nanny Onboarding — Spec v1 (Mobile‑first)

## 1) Screens list (order)
1. Welcome / Role confirm
2. Basic profile
3. Experience + skills
4. Schedule + rate
5. Documents upload
6. Review & submit
7. Success (verification pending)

---

## 2) Required fields per screen
**1. Welcome / Role confirm**
- Role: nanny (preselected)

**2. Basic info**
- Name (full name)
- Age
- City
- Phone
- Email

**3. Experience**
- Years of experience
- Age groups (infants / toddlers / preschool / school)
- Special skills (first aid, driving, languages, etc.)

**4. Rate**
- Hourly rate
- Negotiable (Y/N)

**5. Schedule**
- Days available
- Hours available

**6. Documents**
- Document type (passport/ID)
- Required count: at least 1 document

**7. Final consent**
- Consent checkbox (data accuracy + terms)

---

## 3) Validation rules + error messages
**Name**
- required → “Укажите имя и фамилию”

**Age**
- required, numeric, 18–70 → “Укажите корректный возраст (18–70)”

**City**
- required → “Выберите город”

**Phone**
- required, valid format → “Введите корректный номер телефона”

**Email**
- required, valid email → “Введите корректный email”

**Years of experience**
- required, >=0 → “Укажите стаж работы”

**Age groups**
- at least 1 → “Выберите возрастные группы”

**Special skills**
- optional, if selected must be from list → “Выберите навык из списка”

**Hourly rate**
- required, numeric, >=0 → “Укажите желаемую ставку”

**Negotiable**
- required (Y/N) → “Укажите, возможен ли торг”

**Schedule**
- required, at least 1 day + hours → “Укажите график”

**Documents**
- required, count >=1 → “Добавьте минимум один документ”

**Consent checkbox**
- required → “Подтвердите корректность данных”

---

## 4) Loading / disabled states
- Submit button disabled until required fields complete
- Loading state on submit (spinner + “Отправляем…”)
- File upload shows progress + retry

---

## 5) Success states
- Success screen: “Профиль создан. Верификация занимает до 72 часов.”
- Next step CTA: “Заполнить профиль подробнее”

---

## 6) Trust copy (docs + privacy + timeline)
- Why docs: “Документы нужны для безопасности семей и детей.”
- Privacy note: “Мы не передаём документы третьим лицам. Доступ ограничен.”
- Timeline: “Проверка занимает до 72 часов. Мы уведомим в чате.”

---

## 7) Edge cases (handling)
- Refresh mid‑onboarding → auto‑save draft, restore last step
- Duplicate phone → show “Телефон уже используется, войдите”
- Document upload fail → retry + “Не удалось загрузить, попробуйте снова”
- Network fail on submit → keep data, allow retry

---

## 7) Acceptance criteria (testable)
- Required fields block submit (cannot proceed if missing)
- Errors visible inline on the same screen
- Submit disabled while loading
- Success screen visible after submit
- Event fired exactly once per profile completion
- 60%+ submit complete profile within 24h
- Average completion time < 5 minutes

---

## 8) Event mapping (tracking)
- Screen 1 mount → `nanny_profile_started`
- Final submit → `nanny_profile_completed`
- Verification flag flip (ops) → `nanny_verified`
- Completion condition: all required fields present + consent checkbox true
