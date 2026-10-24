# Vero R7 — Authentication UX review handoff (v0)

## Purpose
This branch is a **new review candidate** based on the frozen `v0/vero-r7-experience-prototype`, not a change to that frozen branch. The source of truth for working backend behavior is `mohankandar/secure-document-vault` branch `ui/vero-r7-experience-review`, commit `e81d49f2d8db369883629fa5243bd185a1bf8eee`.

The user verified **23/23 read-only and visual checks** for Tenant IT Authentication, including desktop/tablet fit. Keep the approved R7 design system. Examine whether the presentation can become clearer, more scannable and accessible without changing the workflow or backend semantics.

## Three required sections
1. **Active binding — LIVE:** provider, issuer, type, browser client, API audience, active version, last update, immutable connection ID where available.
2. **Staged configuration — NOT LIVE:** draft version, full configuration, test status/date, Save Draft → Test Connection → Activate Validated Version. Untested drafts must not appear activatable.
3. **Known-good rollback:** clear target version/provider/issuer and explicit confirmation before changing active binding.

## Important constraints
- This UI/UX repository is an **offline prototype**: its identity actions and tests are simulated. Keep simulations unmistakably labeled. Do not imply the prototype is connected to the live backend.
- Do not add a client-side bypass for authorization or approval. Never infer that a test passed solely from the UI.
- Preserve exact backend configuration-version, freshness, rollback-target and authorization safeguards in the real repository.
- No modifications to either repository's `main` or to the frozen R7 prototype branch.
- Deliver a suggested design diff or screenshots for the user's approval; do not port changes back to the real SDV review branch without permission.
- Avoid placeholder secrets or presenting secrets as observable values.

## Review prompts for v0
- Is live versus staged versus rollback unmistakable at first glance?
- Is the save/test/activate lifecycle easy to follow when a draft is untested?
- Are long issuer URIs and IDs readable on tablet?
- Can warning or success colors be reserved for meaningful semantic status?
- Can details remain accessible without creating unnecessarily tall panels?
