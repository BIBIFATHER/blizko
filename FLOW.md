# FLOW.md — Product Flows

## Flow 1: Parent creates request → matching

1) Parent opens app (ViewState: home)
2) Goes to parent form (ViewState: parent-form)
3) Fills:
   - city, childAge, schedule, budget, requirements, comment
4) Submits request
5) App calls matching logic:
   - `src/core/ai/matchingAi.ts`
   - internally uses `aiText(...)`
6) Output:
   - matchScore (0..100)
   - recommendations array
7) UI shows results and success screen

---

## Flow 2: Nanny creates profile → trust fields

1) Nanny opens app
2) Goes to nanny form (ViewState: nanny-form)
3) Fills:
   - name, city, experience, skills, about, contact
4) Optional:
   - uploads documents (passport / medical book / police record)
5) Document analysis:
   - `src/core/ai/documentAi.ts`
   - calls `aiImage(prompt, image, options)`
6) Output stored in:
   - `documents: DocumentVerification[]`
   - includes aiConfidence and aiNotes
7) Profile becomes visible for matching / admin review

---

## Flow 3: Support Chat

1) User opens support chat UI
2) Writes message
3) Client calls:
   - `aiText(userPrompt, { systemPrompt, temperature })`
4) Response is shown as "agent" message

---

## Flow 4: PWA install prompt

1) UI detects installability
2) Shows InstallPwaPrompt component
3) Uses translations and Button UI
