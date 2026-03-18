# Blizko Interview Ops Pack

_Prepared on March 18, 2026. Built only from repo docs._

Sources used:
- `docs/2026-03-17_parent_interview_kit.md`
- `docs/2026-03-17_supply_side_nanny_research.md`
- `docs/2026-03-17_nanny_search_customer_research.md`
- `docs/2026-03-17_competitor_complaint_signal_scan.md`
- `docs/operating-metrics.md`

## 1. Note-Taking Template

### Parent Interview

```md
Interview ID:
Date:
Interviewer:
Recruit source:
City:
Family type:
Child age:
Searched in last 12 months:
Urgency:

1. Last real search story
- Trigger:
- First channel used:
- Other channels used:
- Peak number of chats/tabs:
- What happened next:

2. Friction and anxiety
- Highest-anxiety moment:
- Biggest operational friction:
- Biggest red flag:
- What slowed the decision most:

3. Trust and proof
- First real trust signal:
- What "verified" must mean:
- Must-see before payment:
- What would make a shortlist feel credible:

4. Decision model
- Catalog vs 2-3 curated matches:
- What makes a nanny feel like a fit:
- Preferred next step after a good profile:
- Support needed before contact / after failure:

5. Economics and reliability
- Comfortable payment moment:
- Fee fears:
- What should happen on no-show / cancellation:

Tags
- entry_point: referral | classifieds | agency | marketplace | social | repeat_nanny
- search_friction: too_many_profiles | fragmented_channels | low_response | schedule_mismatch | unclear_next_step | weak_filters
- trust_blocker: stranger_at_home | unclear_verification | fake_profile_risk | no_show_risk | weak_reviews | no_platform_accountability
- proof_needed: reviews | manual_moderation | docs_check | references | repeat_bookings | response_speed | availability | fit_explanation | support_path
- shortlist_preference: catalog | 4_5_options | 2_3_curated | 1_best_pick
- payment_readiness: before_shortlist | after_shortlist | after_contact | after_trial | no_prepay
- decision_driver: trust | fit | availability | price | location | experience | platform_support
- support_need: none | optional | wanted_at_decision | wanted_on_failure

Scorecard (1-5)
- trust_pain:
- search_chaos:
- curated_shortlist_pull:
- proof_sensitivity:
- payment_trust_readiness:
- human_support_need:
- urgency:

Top quotes
- "..."
- "..."

Best fit for Blizko now: strong | medium | weak
Single biggest blocker:
```

### Nanny Interview

```md
Interview ID:
Date:
Interviewer:
Recruit source:
City:
Experience / format:
Currently taking jobs:
Urgency:

1. Last real job-search story
- Trigger:
- First channel used:
- Other channels used:
- Time to first real response:
- Time to first real job:

2. Economics
- Expected fee model:
- Hidden-fee fear:
- Who should pay platform fee:
- What feels fair:

3. Trust and safety
- Biggest family red flag:
- What family info must be clear upfront:
- What protection is expected in conflict / non-payment:
- What makes a platform feel safe:

4. Workflow and onboarding
- Availability control needs:
- What onboarding feels respectful:
- What feels humiliating or risky:
- Reaction to verification:
- Best next step after profile submit:

5. Retention
- What would make you stay after first job:
- What would make you leave immediately:

Tags
- source_channel: hh | avito | profi | pomogatel | kidsout | telegram | referral | repeat_family | other
- primary_motivation: stable_demand | clear_economics | family_safety | schedule_control | respect_reputation
- red_flag: hidden_fees | family_conflict_risk | nonpayment_risk | weak_support | low_demand
- green_flag: clear_commission | real_jobs | conflict_protection | respectful_onboarding | fair_reviews
- proof_needed: clear_fee_rules | family_info | support_path | review_sla | first_job_expectation
- support_need: none | wanted_before_accept | wanted_on_conflict | wanted_after_first_job
- verification_friction: none | unclear | too_early | too_heavy
- pricing_clarity_need: low | medium | high

Scorecard (1-5)
- stable_demand_pull:
- economics_clarity_need:
- family_safety_need:
- schedule_control_need:
- onboarding_respect_need:
- verification_friction:
- support_need:
- urgency:

Top quotes
- "..."
- "..."

Best fit for Blizko now: strong | medium | weak
Single biggest blocker:
```

## 2. Quick Synthesis Template

Use this right after every interview.

```md
Interview ID / Segment:
One-line takeaway:

What happened in the last real search/job:
- 

Core pain:
- 

Trust blocker:
- 

Proof needed:
- 

Economics blocker:
- 

Support expectation:
- 

What changed in our belief:
- Confirmed:
- Weakened:
- New:

Product implication now:
- Homepage:
- Shortlist/profile:
- Pricing:
- Support/reliability:

Strongest quote:

Best fit for Blizko now: strong | medium | weak
Next recruiting need:
```

## 3. Spreadsheet Schema

Use 2 tabs: `parent_interviews` and `nanny_interviews`.

### parent_interviews

```text
interview_id,date,interviewer,recruit_source,city,family_type,child_age,recency_months,urgency_1_5,entry_point,peak_channels_count,search_friction,trust_blocker,proof_needed,shortlist_preference,payment_readiness,decision_driver,support_need,trust_pain_1_5,search_chaos_1_5,curated_shortlist_pull_1_5,proof_sensitivity_1_5,payment_trust_readiness_1_5,human_support_need_1_5,best_fit_for_blizko_now,must_show_before_payment,single_biggest_blocker,top_quote
```

### nanny_interviews

```text
interview_id,date,interviewer,recruit_source,city,experience_years,job_type,currently_taking_jobs,urgency_1_5,source_channel,time_to_first_response_days,time_to_first_job_days,primary_motivation,red_flag,green_flag,proof_needed,support_need,verification_friction,pricing_clarity_need,expected_fee_model,who_should_pay_fee,stable_demand_pull_1_5,economics_clarity_need_1_5,family_safety_need_1_5,schedule_control_need_1_5,onboarding_respect_need_1_5,verification_friction_1_5,support_need_1_5,best_fit_for_blizko_now,single_biggest_blocker,top_quote
```

## 4. Strong Signal vs Noise

### Count as strong signal

- It comes from a recent real behavior, not a hypothetical opinion.
- It describes a concrete moment: search start, payment hesitation, no-show fear, verification confusion, conflict, or dropout.
- It explains consequence: delayed decision, abandoned platform, refused payment, or churn risk.
- It maps to Blizko's core decision areas: trust, fit, availability/reliability, payment clarity, or support path.
- It reveals a tradeoff: catalog vs curated shortlist, speed vs proof, hype vs operational honesty.
- It repeats across interviews, or appears once with a very clear failure mode and business consequence.
- It is stated in the participant's own language and supported by a quote.

### Count as noise

- Abstract feature wishes with no recent example.
- Positive reaction to a concept pitch, especially if prompted.
- Generic praise for "AI", "verification", or "support" without saying what must actually happen.
- One-off wording or visual preferences that do not change trust or conversion.
- Outlier complaints with no consequence and no repetition.
- Answers created by interviewer leading the witness.
- Requests for impossible certainty such as "100% verified" or "instant jobs" unless tied to actual past behavior.

### Working rule

- Prioritize signals that can change homepage claims, shortlist structure, profile proof, pricing timing, or support/reliability handling.
- De-prioritize anything that only changes copy polish but not decision quality.
