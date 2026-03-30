# Blizko — AI Stack

_Created: 2026-03-26_

## Goal

Use AI as an operating layer, not as a one-off chat utility.

The stack should support:

- fast execution on product tasks
- strong reasoning for architecture and audits
- current-information research
- resilient fallback when one provider is unavailable or too expensive

## Recommended Routing

### Tier 1: Fast / Cheap

Use for:

- quick transformations
- copy cleanup
- small coding tasks
- draft summaries

Requirements:

- low latency
- low cost
- acceptable code quality

### Tier 2: Main Workhorse

Use for:

- implementation
- refactors
- reviews
- product thinking
- technical writing

Requirements:

- strong code quality
- good instruction-following
- stable long-context behavior

### Tier 3: Deep Reasoning

Use for:

- architecture decisions
- security review
- migration strategy
- ambiguous debugging
- product strategy where wrong choices are expensive

Requirements:

- highest reasoning quality
- slower is acceptable

### Tier 4: Research Layer

Use for:

- current events
- competitor research
- trend analysis
- source-backed market scans

Requirements:

- web-grounded answers
- citations or links
- repeatable search workflows

## Practical Default Workflow

1. Research externally when freshness matters.
2. Distill findings into a short brief.
3. Convert brief into execution plan.
4. Implement.
5. Run review / verification.
6. Write back durable decisions into memory files.

## Provider Strategy

### Good reasons to use a router

- fast model switching
- fallback between providers
- easier experimentation
- cost comparison

### Good reasons to go direct

- one-provider workflow
- minimal complexity
- provider-specific features matter more than flexibility

## Blizko-Specific Uses

- concierge and support assistance
- ranking / matching heuristics support
- profile enrichment
- SEO/content ideation
- launch research and competitor scans
- internal ops copilots

## Operating Rules

- Do not use expensive reasoning models for routine editing.
- Do not trust stale knowledge for market or product questions.
- For market, competitor, pricing, policy, or current-product research: browse first, synthesize second.
- Do not ship user-facing AI behavior without fallback and monitoring.
- Log important model choices and workflow changes in project memory.
- Codex and Antigravity should follow the same routing logic for model choice, memory discipline, research rigor, and agent/skill orchestration.
