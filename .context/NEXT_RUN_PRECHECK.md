# NEXT_RUN_PRECHECK.md

Preflight before the next non-trivial UI/codegen pass.

Goal:
- lower exception rate
- lower accidental render cost
- catch fragile patterns before editing

## Preflight Checks

Before editing auth, profile, modal, wizard, or shared UI code:

1. Identify duplicate completion paths
- listener + handler
- effect + callback
- optimistic update + server sync

2. Identify async race risks
- fetch in `useEffect`
- route-param-driven loading
- modal submit flows
- delayed `setTimeout` completion paths

3. Identify hidden global side effects
- `window.scrollTo`
- document listeners
- body scroll mutation
- focus mutation

4. Identify effect-driven derived state
- state that mirrors props
- reducer updates triggered only by effect

5. Identify locale leaks
- hardcoded RU/EN strings on screens that already accept `lang`

## Complexity Budget

When generating or refactoring UI:

- prefer one source of truth for completion
- prefer one async request owner per screen section
- prefer local derivation over extra state
- prefer extraction only after a repeated pattern is proven
- prefer narrow shared primitives over “god components”

## Stop Conditions

Pause and redesign before editing if:
- completion can happen from more than one path
- async result can overwrite a newer screen state
- shared primitive introduces hidden global behavior
- modal shell lacks keyboard/focus/scroll guarantees

## Review Focus Order

1. correctness
2. side effects
3. async safety
4. accessibility and modal safety
5. render complexity
6. style / polish
