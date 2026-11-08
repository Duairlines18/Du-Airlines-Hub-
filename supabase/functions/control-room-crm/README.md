# Control Room ↔ Airtable CRM — scoped read-only integration

Status: **feature branch only, NOT deployed or connected**.

## Source-of-truth rules
- **Supabase** owns user identity, access, programme assignments, week number, workout publication, exercise mapping, feedback and history.
- **Airtable** owns commercial relationships and coach continuity/next decisions.
- The browser never receives Airtable credentials or raw Airtable API responses.
- No automatic programme writes, publishing, status syncing, duplicate matching by names, or Airtable mutations.

## Secure connection setup (requires Coach Du's release approval)
1. Create an Airtable PAT through Airtable, scoped to **DU Airlines Elite Performance Academy CRM** only, with `data.records:read`. Do not paste the PAT in GitHub, the browser, or chat.
2. In Supabase project `hiktwkdfvlujszczthdu` → Edge Functions → Secrets, add `AIRTABLE_TOKEN` using the dashboard's secret editor.
3. Deploy the reviewed `supabase/functions/control-room-crm/index.ts` as `control-room-crm` with **`verify_jwt=true`**. Do not redeploy/change existing Hub functions.
4. Merge the Control Room UI code only after the Edge Function is active and authorization tests pass. GitHub Pages will deploy the static UI after merge.
5. Signed-in admin tests: matched private/parent athlete; unmatched profile; St George's school; negative authorization for a non-admin signed-in account; unauthenticated rejection; closed-origin rejection; expiry/revocation; no production writes.
6. Inspect output accuracy. St George's Airtable relationship notes currently contain older commercial information and must not override paid-school status in Supabase. CRM sync timestamps may lag.
7. Rollback by reverting the Control Room UI commit or disabling/deleting only `control-room-crm`. Preserve other Edge Functions and all Supabase/Airtable data.

## API / matching
- POST `/functions/v1/control-room-crm`: `{"type":"athlete","id":"<supabase athlete UUID>"}` or `{"type":"school","id":"<supabase cohort UUID>"}`.
- Requires a valid Supabase user and verified membership in `public.admin_profiles`; authenticated alone is insufficient.
- Athlete matching uses an **exact** `Supabase Athlete ID` value in Airtable `ATHLETE PROGRAMME CONTROL`. More than one match is a conflict, not an arbitrary selection.
- School matching uses an explicit verified Supabase organization UUID→Airtable Account record mapping. Initially St George's only. Do not guess from similar school names.
- Only a selected set of textual coaching/relationship fields is returned; token is never returned.
- Airtable requests are on demand and not automatically polled. This keeps free-tier request usage low.

## Open items
- Secure server secret cannot be added by the available GitHub/Airtable connector tools, and does not exist in this repository. User must configure it in Supabase Dashboard, not share the value with the assistant.
- 11 Airtable `ATHLETE PROGRAMME CONTROL` records (10 with exact athlete IDs and one separate professional training record) exist. Current private/parent athlete roster also has QA and non-CRM profiles, which should display a safe `Not linked` state rather than create duplicates.
- Airtable data may be stale. Live week labels and feedback must always come from Supabase.

## Release gates
Keep this PR unmerged until the secure secret is configured and cross-role tests pass. Never hide credential or authorization failures behind success states.
