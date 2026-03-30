# REFACTORING_RULES.md

Active refactoring constraints for generated and AI-assisted code in this workspace.

Goal:
- reduce exception rate
- reduce accidental complexity
- reduce duplicate side effects
- reduce hidden global behavior

## Rule 1: Single Owner For Completion Side Effects

When a flow has both:
- an event listener
- and a submit/verification handler

only one of them may own completion side effects.

Completion side effects include:
- `onLogin`
- `onClose`
- navigation
- success toasts
- analytics completion events

Do not duplicate them across:
- auth listeners and verify handlers
- fetch listeners and optimistic callbacks
- modal close logic and route transitions

Why:
- duplicate completion paths create double state writes, repeated analytics, and racey UI.

## Rule 2: No Uncancellable Async UI Effects

Async effects tied to route params, search params, or component mount must support cancellation or stale-result protection.

Required:
- reset loading and error state before new request
- ignore late responses after dependency change
- use `AbortController` or equivalent stale-guard

Why:
- prevents stale screens, set-state-after-unmount risks, and incorrect overwrites during fast navigation.

## Rule 3: Do Not Use Effects For Derivable UI State

If UI state can be derived from props, refs, or reducer input, do not introduce an effect that immediately writes state from those same values.

Avoid:
- `useEffect(() => setX(prop), [prop])`
- effect-driven transition bookkeeping when a ref/reducer/init can do it

Why:
- effect-driven derived state adds extra renders and increases synchronization bugs.

## Rule 4: Shared Hooks Must Not Hide Global Side Effects

Shared hooks must not silently perform global DOM or window effects unless the hook name and API make that behavior explicit.

Examples of global side effects:
- `window.scrollTo`
- `document.body.style.overflow`
- global event listeners
- focus management

Required:
- either move the side effect to the caller
- or expose an explicit option like `scrollOnStepChange: true`

Why:
- hidden global behavior makes reuse dangerous and raises debugging cost.

## Rule 5: Shared Modal Primitives Must Guarantee Interaction Safety

Every shared modal primitive must handle:
- escape close
- focus entry
- focus containment or equivalent keyboard safety
- background scroll locking
- safe backdrop close behavior

Why:
- modal bugs multiply across every consumer and create both UX and accessibility regressions.

## Rule 6: Public Screens Must Be Locale-Safe

Public and user-facing screens must not hardcode one locale inside reusable UI sections when the screen already accepts `lang`.

Required:
- all major labels, empty states, and CTA copy must respect the screen locale

Why:
- mixed-locale UI is a product bug, not a copy nit.

## Rule 7: Extract Reusable Trust Patterns Early

When building trust-heavy screens, repeated structures should be extracted before the second or third copy-paste.

Candidates:
- trust summary strip
- profile meta rows
- verification badges
- review summary blocks
- empty / loading trust states

Why:
- trust UIs drift fast when every screen hand-rolls its own evidence layout.

## Rule 8: Prefer Evidence Over Marketing Claims

Trust UI should display evidence, not slogans.

Prefer:
- verified status
- reviewed docs
- review counts
- timestamps
- explainability blocks

Avoid:
- oversized generic “safe” claims
- decorative trust badges without source

Why:
- weak trust claims increase skepticism and harm conversion in a high-anxiety product.
