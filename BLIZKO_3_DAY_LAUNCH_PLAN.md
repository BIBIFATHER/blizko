# Blizko 3-Day Launch Plan

Цель: за 3 дня довести приложение до состояния, в котором можно начинать реальный подбор нянь с ручным кураторским слоем, не ломая текущую модель подбора.

Основа плана:

- `BLIZKO_TONE_OF_VOICE_V2.md` - канонический тон продукта.
- `deep-research-report (3).md` - интеграция human-centered onboarding в модель подбора.
- Текущая архитектура Blizko - rule-based matching, risk engine, trust badges, AI explanations, human final decision.

---

## 1. Главный принцип запуска

На запуске Blizko не должен выглядеть как полностью автоматическая AI-система.

Правильная рамка:

> Приложение собирает структурированные сигналы, алгоритм помогает увидеть совпадения, а ручной кураторский слой принимает финальное решение о том, кого показывать семье.

Это значит:

- текущий `legacy_score` остается backbone;
- новые вопросы не заменяют модель;
- P0-сигналы усиливают анкету, risk flags и ручной просмотр;
- `compatibility_v2_score` и A/B-тесты идут после первых реальных данных;
- тон остается мягким: совместимость, доверие, спокойствие в быту, без громких claims.

---

## 2. Что берем из research сейчас

Нужно внедрять только то, что помогает запуску и не требует большой перестройки модели.

### Must Ship Before Launch

| Направление | Что внедрить | Почему сейчас |
|---|---|---|
| Семейная анкета | обязанности, что точно не входит, график, гибкость, режим, коммуникация, камеры/питомцы/кто дома | это дает куратору реальные сигналы для первого подбора |
| Анкета няни | комфортные обязанности, no-go, сдвиги графика, обратная связь, автономность, sick care, камеры/питомцы/WFH | это снижает риск неподходящих показов семье |
| Тон текстов | убрать AI-claims, психологическую диагностику, "идеальную няню", жесткую селективность | это влияет на доверие сразу |
| Проверка | документы, видео-знакомство, анкета/тесты, ручной просмотр | это честная модель trust layer |
| Ручной просмотр | статус, заметки, красные линии, документы, ключевые ответы | без этого подбор не будет реально кураторским |
| QA | формы сохраняются, build проходит, мобильный сценарий работает | без этого нельзя начинать набор нянь |

### Should Ship If Time Remains

| Направление | Что сделать | Условие |
|---|---|---|
| Risk flags v2 | добавить warning для камер, обязанностей, больного ребенка, слишком частых апдейтов | если не ломает текущий `riskEngine` |
| Admin review | вывести больше ключевых ответов в админке | если быстро находится место в UI |
| Analytics | логировать completion и submit для новых форм | если уже есть простой event path |
| Match result copy | смягчить score/проценты, объяснять "почему может подойти" | если редизайн результата уже готов |

### Do Not Ship Before Launch

| Не делать | Почему |
|---|---|
| Полноценный `compatibility_v2_score` в прод | нет shadow data, высокий риск иллюзии точности |
| `0.85 legacy + 0.15 compatibility` как реальный ranking | сначала нужно собрать данные и проверить стабильность |
| Новые SQL-таблицы для `match_feature_snapshot`, `curator_override`, `outcome_event` | это может съесть запуск; payload/заметки достаточно на старте |
| Большой A/B testing framework | нет объема трафика и времени |
| Автоматические rejection rules из новых soft-вопросов | mismatch часто повод для разговора, не отказ |
| Психологические claims | юридически и доверительно рискованно |

---

## 3. Минимальная модель данных на запуск

До запуска лучше не делать тяжелые миграции. Новые сигналы можно хранить в существующих payload/riskProfile/comment-like полях, если текущая архитектура это позволяет.

### Family Signals

| Signal | Launch use | Model use |
|---|---|---|
| `schedule_flex` | насколько график может сдвигаться | P0, manual + future rhythm |
| `duties_core[]` | что входит в помощь | P0, requirements/manual |
| `duties_excluded[]` | что точно не входит | P0, red lines/manual |
| `routine_priorities[]` | сон, прогулки, еда, экраны | P0, family context |
| `discipline_style` | мягко/строго/по ситуации | P0, maps to `nannyStylePreference` |
| `red_lines[]` | крик, физические наказания, угрозы | P0, hard safety/manual |
| `updates_pref` | минимум/1-2/часто/по договоренности | P0, maps to `communicationPreference` |
| `autonomy_pref` | сколько инициативы можно няне | P0, manual + future communication |
| `home_presence` | кто дома во время работы | P0, household context |
| `cameras_policy` | нет/да/планируем | P0, risk/manual |
| `pets_context` | есть ли питомцы | P0, household context |
| `medication_required` | нужен ли режим лекарств/ухода | P0, safety/manual |

### Nanny Signals

| Signal | Launch use | Model use |
|---|---|---|
| `schedule_flex` | готовность к сдвигам | P0, manual + future rhythm |
| `duties_comfortable[]` | что няня готова делать | P0, requirements match |
| `duties_no_go[]` | что няня не берет | P0, boundary risk |
| `sick_policy` | работает ли с легкими симптомами | P0, safety/boundary |
| `feedback_style` | как удобно давать апдейты | P0, maps to `communicationStyle` |
| `autonomy_style` | инструкции или свобода в рамках | P0, manual + future communication |
| `preferred_family_env[]` | в какой семье легче работать | P0, manual |
| `camera_ok` | да/зависит/нет | P0, risk/manual |
| `pets_ok` | да/зависит/нет | P0, household |
| `smoke_ok` | да/нет | P0, household |
| stress scenario answer | что делает при перегрузе ребенка | P0, tag/manual |
| conflict scenario answer | как говорит о mismatch с родителями | P0, tag/manual |
| 5-item microtest | coarse work-style signal | P1, weak signal only |

---

## 4. Bridge To Existing Model

Новые поля должны временно маппиться в текущую модель, а не заменять ее.

| New signal | Existing field / layer | Launch rule |
|---|---|---|
| `updates_pref` | `communicationPreference` | direct map |
| `feedback_style` | `communicationStyle` | direct map |
| `discipline_style` | `nannyStylePreference` | map to gentle / strict / balanced |
| `routine_priorities[]` | `familyStyle` / manual note | do not over-score |
| `schedule_flex` | schedule context | manual note first |
| `autonomy_pref` | `familyStyle` proxy | manual note first |
| `camera_ok` + `cameras_policy` | risk flag | warning, not rejection |
| `duties_core[]` | `requirements` | include in profile/request summary |
| `duties_excluded[]` + `duties_no_go[]` | risk/manual | conflict requires discussion |
| stress scenario tags | `tantrumFirstStep` / risk | human review before critical flag |
| microtest | `softSkills` context | weak prior, no diagnostic language |

`pcmType` should stay legacy-only for now. Do not infer it from new questions.

---

## 5. Launch Risk Rules

These rules protect the model from breaking during rollout.

1. **No new soft answer can automatically reject a nanny.**
   Only safety/legal/document signals can block publication.

2. **Free text is not a strong numeric signal.**
   Use it for curator notes, tags and follow-up questions.

3. **Mismatch is usually a conversation topic.**
   Convert mismatch into "что обсудить", not "не подходит".

4. **Critical risk from new fields requires human confirmation.**
   Especially for medicine, infants, aggression, discipline and safety.

5. **Legacy score remains primary.**
   New signals improve context and review quality until outcome data exists.

6. **Tone cannot imply diagnosis.**
   Use "профиль по тестам", "стиль работы", "сигналы", not "психологическая оценка".

---

## 6. Acceptance Checklist After Lovable Redesign

Use this when Lovable finishes the redesign and text changes.

### Voice

- Home says "Няня, которая подойдет именно вашей семье".
- Product sounds calm, warm and human.
- No "AI найдет идеальную няню".
- No "психологическая диагностика".
- No "гарантированная совместимость".
- No "лучшие няни" as a hard claim.
- Manual review is visible and concrete.
- Tests are described as style/work-profile signals.

### Home

- Hero explains careful matching, not AI technology.
- Section is "Как мы подбираем".
- The three steps are present: understand family, review nanny, match by compatibility.
- There is a small trust note about manual review.
- CTA says "Подобрать няню"; secondary says "Я - няня".

### How Matching Works

- Main headline is about compatibility, not "40+ parameters".
- AI/algorithm is a helper, not the hero.
- The page explains rhythm, expectations, approach to child, manual review.
- Comparison block contrasts ordinary search with Blizko's curated matching.

### How We Verify

- Blocks are documents, video, questionnaire/tests, manual review.
- No claim that a psychologist reviews profiles.
- No claim that verification guarantees behavior.
- Summary says families see profiles recommended for introduction, not random profiles.

### Forms

- Family form collects duties, boundaries, communication, household context.
- Nanny form collects duties, no-go, feedback style, autonomy, household tolerance.
- Questions use face-saving wording.
- Free text is limited and optional where possible.
- Documents are not forced too early unless current flow already requires them.

### Model Safety

- Existing matching fields are still populated.
- `communicationPreference`, `nannyStylePreference`, `familyStyle`, `requirements`, `riskProfile` are not broken.
- New fields are stored without preventing legacy flow.
- Match result still renders if new fields are missing.
- Existing tests/build still pass.

---

## 7. Three-Day Execution Plan

### Day 1: Content, Forms, Data Capture

Goal: make the product say the right thing and collect launch-critical signals.

Must complete:

- Apply tone of voice to Home, How Matching Works, How We Verify.
- Remove old AI-heavy claims from visible screens.
- Add or preserve P0 family questions in onboarding.
- Add or preserve P0 nanny questions in onboarding.
- Ensure form submit still works with legacy fields.
- Store new answers in a backward-compatible way.

Done when:

- A family can complete a request.
- A nanny can submit a profile.
- The submitted payload contains enough data for manual review.
- No visible text promises diagnosis, guarantee or fully automatic selection.

### Day 2: Curator Workflow And Risk Review

Goal: make manual selection operational.

Must complete:

- Confirm where new parent requests and nanny profiles appear.
- Ensure status flow is usable: `new`, `in_review`, `approved`, `needs_info`, `rejected`.
- Surface or document the key review checklist for a nanny.
- Surface or document the key review checklist for a family request.
- Confirm document/video/test/profile sections are understandable.
- Decide what is manual-only on launch.

Done when:

- A curator can review a nanny profile without guessing what matters.
- A curator can review a family request and identify 3-5 candidate criteria.
- Risk topics are visible as discussion points, not hidden in raw form data.

### Day 3: QA And First Nanny Acquisition

Goal: confirm the app is launchable and start recruiting.

Must complete:

- Run `npm test`.
- Run `npm run build`.
- Run `npm run lint` and classify warnings.
- Smoke test family flow on mobile viewport.
- Smoke test nanny flow on mobile viewport.
- Verify success states and next steps.
- Prepare first outreach script for nannies.
- Prepare manual review rubric for first 10 nanny profiles.

Done when:

- Build is green.
- Forms work end-to-end.
- Text is aligned with tone of voice.
- You can invite nannies and process their profiles manually.

---

## 8. Manual Review Rubric For First Nannies

Use this before showing a profile to families.

### Basic Trust

- Name and contact present.
- City / district / metro present.
- Experience summary is understandable.
- Age groups are clear.
- Photo/video is acceptable if required by current flow.
- Documents are uploaded or marked as needed later.

### Compatibility Signals

- Schedule is usable.
- Expected rate is within realistic range.
- Duties comfortable are clear.
- Duties no-go are clear.
- Communication style is clear.
- Household tolerance is clear: cameras, pets, WFH, smoke.
- Stress/conflict answers are not alarming.
- Test/profile language is coherent, not obviously fake or empty.

### Red Flags To Discuss

- Infant work without infant experience.
- Medical/medicine responsibilities without readiness.
- Camera refusal when family uses cameras.
- Duty mismatch: family expects household tasks, nanny refuses.
- Communication mismatch: family needs frequent updates, nanny prefers minimal contact.
- Discipline mismatch: family expects gentle approach, nanny describes harsh control.
- Avoidant conflict style with anxious/high-control family.

### Approval Decision

Use one of:

- `approved`: can be shown to families.
- `needs_info`: ask for missing detail.
- `in_review`: wait for document/video/manual check.
- `rejected`: do not publish.

Do not reject on style mismatch alone unless it creates safety or trust risk.

---

## 9. First Family Request Review

For every first family request, extract:

- child age and number of children;
- schedule and flexibility;
- location and commute sensitivity;
- duties expected;
- duties excluded;
- budget;
- communication preference;
- discipline / boundaries preference;
- household context;
- cameras / pets / WFH;
- medical or special care needs;
- hard red lines.

Then create a shortlist manually:

1. Remove hard mismatches.
2. Keep 3-5 candidates with strongest practical fit.
3. Add notes: why this nanny may fit.
4. Add notes: what to discuss before first shift.
5. Do not over-explain scores to the family.

---

## 10. Post-Launch Roadmap

After first real profiles and requests:

### After 10 Nanny Profiles

- Review which questions were useful.
- Remove or simplify questions nobody answers well.
- Add admin notes for most common missing info.
- Start logging manual reason codes.

### After 10 Family Requests

- Compare family stated needs with actual shortlist choices.
- Identify top 5 mismatch types.
- Improve risk copy and onboarding helper text.

### After First 5 Deals / Trials

- Start shadow scoring for `compatibility_v2_score`.
- Log curator agreement and override severity.
- Do not expose v2 score to users yet.

### After Baseline Metrics

- Test questionnaire changes first.
- Shadow-rank with blended score.
- Only then consider `0.85 legacy + 0.15 compatibility`.

---

## 11. Immediate File Targets After Redesign Lands

Review these files first after Lovable changes arrive:

- `src/core/i18n/translations.ts`
- `src/components/Home.tsx`
- `src/components/seo/SeoPages.tsx`
- `src/components/forms/parent/ParentFormProvider.tsx`
- `src/components/forms/parent/Step1_Requirements.tsx`
- `src/components/forms/parent/Step2_Calendar.tsx`
- `src/components/forms/parent/Step3_FamilyProfile.tsx`
- `src/components/forms/nanny/NannyFormProvider.tsx`
- `src/components/forms/nanny/Step1_BasicInfo.tsx`
- `src/components/forms/nanny/Step2_Experience.tsx`
- `src/components/forms/nanny/Step3_Verification.tsx`
- `src/components/forms/nanny/Step4_Psychology.tsx`
- `src/components/MatchResultsScreen.tsx`
- `src/core/ai/riskEngine.ts`
- `src/core/ai/matchingAiRanking.ts`

Do not start from model code unless the redesign broke data shape. Start from visible copy and form payload compatibility.

---

## 12. Launch Decision

Blizko is launchable for first nanny acquisition when:

- users see the new soft trust-first tone;
- forms collect enough information for manual review;
- matching still works with old fields;
- risk topics are visible for discussion;
- build is green;
- manual curator process is clear;
- no screen promises AI certainty or psychological diagnosis.

The launch goal is not perfect automation.

The launch goal is a reliable curated MVP: enough structure for the app, enough judgment for the human, enough calm for the family.
