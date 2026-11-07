# History and feedback companion — branch only

Adds the athlete/cohort History tab and clarifies existing feedback triage. Depends on Eliteacademy PR #81 plus the stacked assignment-history migration/RPC. Not deployed.

History loads a scoped, paginated summary for the exact workspace subject; details are lazy. Responses cannot replace another workspace after navigation. Missing backend support has a distinct state, read failures can retry, and empty history does not claim no programmes/feedback exist. The viewer only reads data; existing publishing, setup, access and review writes are unchanged.

The SQL status `reviewed` is an automatic “needs review” classification, not proof of human review. The timestamp remains authoritative for human completion. The UI changes the label to “Needs review” while pending and “Reviewed” after the timestamp exists. Adjustment flags remain visible after review. No existing rows should be auto-cleared or backfilled.

Database/service writes without a verified authenticated subject are labelled honestly. Saved text uses DOM text nodes; demo links allow HTTPS YouTube hosts only. Programme snapshots are historical database content, not a claim the athlete viewed the content or that the demo footage was checked.

Validation: existing admin tests plus new DOM tests for exact context, lazy details, pagination, late responses, unavailable backend, retry, escaping, safe links, attribution and review semantics. DOM testing is not visual/mobile or real-session browser QA. Backend migration and authenticated staging must precede deployment. Professional workspaces do not expose a misleading individual History tab; professional-specific history remains separate work.

History restore/reuse actions and immutable feedback/version binding are not implemented by this viewer. Use the existing protected publishing workflow for content changes.

Independent review fixes: unassigned athletes and schools retain History access without weakening ordinary editor assignment guards; all projected assignment/override fields are distinguishable, including references and cleared fields; captured equipment and alternative movement choices remain visible. Tier-specific referenced weeks are selected server-side and identified in the viewer. These fixes have RED→GREEN database/DOM regressions.
