---
name: generation-router
description: Decide whether an image or video generation should run on Higgsfield (subscription credits) or fal.ai (pay-per-generation), and route it to whichever is genuinely cheaper — falling back to fal automatically when Higgsfield credits run out mid-job. Use this skill whenever a generation is about to be spent on: any call to generate_image, generate_video, or their batch variants; any request to make images, videos, clips, ads, UGC, b-roll, storyboards, or renders; whenever the user asks what a generation will cost, which platform to use, whether they have enough credits, or how to avoid running out; and whenever a content skill (higgsfield-content-factory, ai-filmmaking, motion-design, scroll-cinematic, vaughn-listing-video, night-lighting-renders) is about to generate in bulk. Use it even when the user names one platform outright — they usually mean "make this", not "and bill me the expensive way".
---

# Generation Router

Two generation platforms are configured, and they bill on completely different models:

- **Higgsfield** — a subscription. Credits arrive monthly and expire. Spending them costs nothing extra today; *not* spending them wastes them.
- **fal.ai** — pay-per-generation. Every render bills the card. Nothing expires, nothing is wasted, nothing is prepaid.

The job here is to spend the right one, and to never let a batch die halfway through because credits ran out.

## The one thing to get right

**Higgsfield credits are almost always cheaper per generation than fal.** Measured on identical models, a Higgsfield generation costs single-digit credits where fal charges $0.15–$0.70. Unless a credit costs more than about 5¢, Higgsfield wins on price every time.

So fal is **not** the cheap option. Treat it as:

1. **The overflow valve** — credits are exhausted or too low to finish the job, and waiting for the monthly reset isn't acceptable.
2. **The catalog extension** — the model needed isn't on Higgsfield (FLUX schnell/dev/pro, Nano Banana 2, GPT Image 2 direct, and much of fal's long tail).
3. **The deliberate choice** — the user explicitly wants to preserve credits for something else, or wants no subscription draw at all.

Getting this backwards is the expensive mistake: routing to fal "to save money" while paid-for credits sit unspent and then expire. That burns real dollars to protect a resource that was going to vanish anyway.

## Never guess a price

Both platforms expose live cost preflights that cost nothing to call. Prices change, plans change, and a number memorized from a previous session is a number that will eventually be wrong in a way nobody notices. Always measure before routing anything non-trivial:

- **Higgsfield** — add `get_cost: true` to the same `generate_image` / `generate_video` params you were about to send. Returns credits; submits no job, charges nothing.
- **fal** — `get_pricing` with the endpoint ID. Returns a unit price and the unit it's charged in.
- **Balance** — `balance` returns credits remaining and the plan.

The units differ and that matters. fal bills video per **second** (multiply by clip length), images per **image** or per **megapixel**, and some models per **1000 tokens** — token-billed models can't be predicted precisely ahead of time, so treat those estimates as soft and say so.

## Routing procedure

For a single generation:

1. **Read the balance.** `balance` → credits remaining.
2. **Preflight Higgsfield.** Same params plus `get_cost: true` → credits for this specific job. Duration, resolution, and mode all move this number substantially, so preflight the *actual* job, not a generic one.
3. **Price fal.** `get_pricing` on the equivalent endpoint (see the mapping table below) → multiply out to a dollar figure for this job.
4. **Convert and compare.** Credits × `CREDIT_VALUE_USD` (below) vs the fal dollar figure.
5. **Check sufficiency.** If credits remaining < credits needed, Higgsfield cannot run this job regardless of price — route to fal.
6. **Route, then say what happened and why**, with both numbers.

For a batch, do the arithmetic *before* generating anything: multiply the per-item credit cost by the item count and compare against the balance. A batch that runs out of credits at item 7 of 20 leaves a half-finished job and a confused user. If the balance won't cover the whole run, decide up front — either send the whole batch to fal for consistency, or split deliberately and tell the user where the seam is.

### Configuration

```
CREDIT_VALUE_USD = <unset>
```

This is what one Higgsfield credit costs in dollars — the plan's monthly price divided by its monthly credit allowance, or a top-up pack's price divided by its credits.

**It is deliberately unset.** Ask the user for their plan price and credit allowance the first time this matters, compute it, and write the number in here. Guessing it produces a routing rule that looks rigorous and is quietly wrong.

While it's unset, route on the safe default: **prefer Higgsfield whenever credits cover the job**, because the measured gap is wide enough that no realistic credit price flips it. Say that this is the assumption being used rather than presenting it as a calculated result.

## Model equivalence

Many models exist on both platforms — the same underlying model, different billing. These are the pairs worth knowing:

| Model | Higgsfield ID | fal endpoint |
|---|---|---|
| Kling 3.0 (std) | `kling3_0` + `mode: std` | `fal-ai/kling-video/v3/standard/image-to-video` |
| Kling 3.0 (pro) | `kling3_0` + `mode: pro` | `fal-ai/kling-video/v3/pro/image-to-video` |
| Kling 2.5 Turbo Pro | — | `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` |
| Seedance 2.5 | `seedance_2_5` | `bytedance/seedance-2.5/image-to-video` |
| Seedance 2.0 | `seedance_2_0` | `bytedance/seedance-2.0/image-to-video` |
| MiniMax H3 | `minimax_h3` | `minimax/h3/reference-to-video` |
| MiniMax H3 Max | `minimax_h3_max` | `minimax/h3-max/image-to-video` |
| Nano Banana Pro | `nano_banana_pro` | `fal-ai/nano-banana-pro` |
| Nano Banana 2 | — | `fal-ai/nano-banana-2` |
| GPT Image 2 | — | `openai/gpt-image-2` |
| FLUX (schnell/dev/2-pro) | — | `fal-ai/flux/schnell`, `fal-ai/flux/dev`, `fal-ai/flux-2-pro` |

A dash means that platform doesn't carry it, so there's no routing decision — use whichever side has it.

Use `models_explore` (Higgsfield) and `search_models` (fal) to check the current catalogs rather than trusting this table indefinitely; both platforms add models frequently.

### Reference prices, measured 2026-09-07

A snapshot for sanity-checking a preflight that looks implausible. **Verify before spending — do not route on these.**

| Job | Higgsfield | fal |
|---|---|---|
| Kling 3.0 std, 5s | 10 credits | $0.14/s → $0.70 |
| Kling 3.0 pro, 5s | 12.5 credits | $0.14/s → $0.70 |
| Seedance 2.5, 5s | 32.5 credits | $0.0214 / 1k tokens |
| Nano Banana Pro, 1 image | 2 credits | $0.15/image |
| FLUX schnell | — | $0.003/megapixel |

Note the spread *within* Higgsfield: Seedance 2.5 costs 3¼× what Kling 3.0 does for the same 5 seconds. When credits are tight, switching model is often a bigger saving than switching platform — worth raising with the user before falling back to fal.

## When credits run out

Running dry mid-project is the scenario this skill exists for. Handle it without drama:

- **Detected before starting** (balance < job cost) — say so plainly, state what the job costs on fal, and proceed on fal. Don't stop to ask permission for a cost the user has already accepted by asking for the work, unless the fal bill is large enough to be a genuine decision (a long video, a big batch).
- **Detected mid-batch** — finish the remaining items on fal rather than aborting. A completed batch with a noted seam beats a half-finished one. Report which items ran where.
- **Never** silently substitute a cheaper model to fit the remaining balance. The user asked for a specific quality level; changing it without saying so is worse than spending the money.

Offer the model-switch option (Kling instead of Seedance, for instance) as a *choice* when it would keep the job on credits, with the quality tradeoff stated.

## Reporting

State the decision in one line, with the numbers that drove it. Something like:

> Routing to Higgsfield — 12.5 credits (~$0.44) vs $0.70 on fal. Balance after: 139 credits.

or

> Credits exhausted (3.5 left, job needs 32.5). Running on fal: 5s Seedance ≈ $0.55.

What matters is that the user can see the tradeoff and correct the routing if their priorities differ from the arithmetic — maybe they're saving credits for a deadline tomorrow, which no cost model can know. Don't bury the decision, and don't pad it into a paragraph.

After a run that drew down credits significantly, mention the remaining balance. Running out is much less disruptive when it isn't a surprise.
