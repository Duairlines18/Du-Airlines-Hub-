# Secure workout publishing integration — QA and rollback

## Scope
- Existing Control Room sign-in remains Supabase Auth plus `admin_profiles`.
- On a **published current week**, Edit Workout Block → Save Workout Update uses `admin-workout-publish`: preview, explicit target confirmation, shared-recipient warning, optimistic content match, protected database RPC, readback.
- Draft-week block edits remain on the existing direct path.
- Published-week direct exercise add/remove and Quick Write replacement are **temporarily disabled** until equivalent secure atomic endpoints are built. Draft Quick Write remains unchanged.
- The protected endpoint edits **content only**; published block titles and athlete notes are not yet supported.
- Other existing programme/week administration controls were not rewritten in this surgical integration.

## Backend
- Supabase project: `hiktwkdfvlujszczthdu`
- Function: `admin-workout-publish` (JWT verification on)
- SQL function: `public.admin_update_workout_block`
- Server-only Edge Function secret: `DU_ADMIN_USER_IDS` (set in Supabase dashboard, never in public GitHub).
- No service-role key or admin user token in browser source.

## Required authenticated QA (not yet completed)
1. Sign into the existing Control Room with an authorized Coach Du account.
2. Open a **non-athlete-facing dedicated QA published programme/week** with one active QA athlete assigned. If none exists, create an isolated QA fixture through the normal admin workflow before attempting any write. Do not test against a real athlete.
3. Open an existing QA workout block; change a harmless content field. Save and verify the preview identifies the exact athlete, programme, week, block and recipient count.
4. Confirm publish; expect `WORKOUT_BLOCK_VERIFIED`, reload, verify the exact content in Supabase and the QA Hub.
5. Restore the original content through the same protected preview/publish workflow, reload, verify restoration.
6. Try a stale preview and confirm the write is rejected without modifying content.
7. Try a non-admin login and confirm denial. Try a shared QA programme and confirm the shared-recipient warning.
8. Confirm Quick Write works for a draft week and cannot replace a published week via the old direct RPC.
9. Confirm current athlete/parent/staff logins and published programme views are unchanged.

## Risks / limitations
- Browser E2E and rollback have **not** been tested from this connector: no authenticated browser session or HTTP test connection was available.
- Existing `admin_replace_training_day_blocks` remains a separate invoker RPC; published-week Quick Write is blocked by this UI but other clients and existing RLS should be reviewed before wider rollout.
- Shared programme block content is programme-wide, not individualized.
- Only published workout **content** edits use the new protected endpoint. Extending this gate to all mutation types requires separate scoped work.
- Browser origin is not used as authorization; server requires a verified JWT and allowlisted admin UUID. CORS permits bearer-token requests, without cookies.

## Rollback
1. Do not merge the feature branch; production Control Room remains unchanged.
2. To revert a future merge, restore the prior `index.html` from the previous commit or revert the feature commit.
3. For a QA edit, use the stored pre-edit `currentContent` and the protected editor to restore it; verify readback.
4. Backend Edge Function version 3 adds only browser CORS handling. Previous version can be redeployed if needed; leave the SQL function in place unless a reviewed database rollback is required.
