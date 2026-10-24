# R7 · Tenant IT → Integrations: UX exploration

Branch: `v0/vero-r7-integrations-ux-exploration`. Everything is simulated: no request leaves the browser. Saves resolve after about 0.75 s with the response picked under **Prototype controls**.

## Files

| File | Purpose |
| --- | --- |
| `src/r7/Integrations.tsx` | The full Integrations experience (list, detail, drawers, dialogs) |
| `src/r7/integrations-data.ts` | Contract-shaped types, enums, validation mirrored from the backend, sample data, simulated save |
| `src/r7/integrations.css` | Module styles. Blue is the ordinary primary action; green is reserved for success and Active |
| `src/r7/store.tsx` | Adds `integrations`, `igFields`, `igOps` and `igLab` state |
| `src/r7/TenantAdmin.tsx` | Swaps the old table and drawer for `IntegrationsTab`. Other tabs untouched |

## Structure

- **Master–detail.** The list (name, key, status, auth method, field count) sits on the left and the selected integration on the right. Below a 900 px container width it becomes list → detail with a back control.
- **Detail sections** (an ARIA tablist with arrow, Home and End keys):
  1. **Configuration.** Read view by default. "Edit configuration" switches to an inline form with a sticky save bar.
  2. **Monitoring.** A read-only operational summary.
  3. **Metadata contract.** A field table with Add field and Revise for each row.
- Creating an integration, adding a field and revising a field use focused drawers. Disable and enable use a confirmation dialog.

## Functional-parity checklist

| Capability (backend) | UI | Status |
| --- | --- | --- |
| List sources (`GET /ingestion-sources`) | List with filter (shown when there are more than 3) | Done |
| Create source: `sourceKey`, `displayName`, `authType`, `credentialReference`, limits | Add integration drawer | Done |
| `sourceKey` immutable after create | Read-only field with lock note | Done |
| `sourceKey` format and uniqueness | Inline validation, live once the key has been typed | Done |
| Update `displayName`, `authType`, `credentialReference`, limits | Inline edit form | Done |
| `status` ACTIVE / DISABLED | Disable and Enable dialog with impact list and acknowledgement | Done |
| New sources always ACTIVE | Explained in the create drawer | Done |
| Four optional limits that can only tighten platform defaults | Unit inputs with defaults and an "Effective" column | Done |
| Operational summary: counts, last activity, last available, last failure | Monitoring section, with null and never-used states | Done |
| Operational summary failure | Error callout with retry | Done |
| List fields (latest version per key) | Contract table | Done |
| Create field: key, label, type, required, normalization, rules | Add field drawer | Done |
| Field key immutable and unique per source | Read-only on revise; duplicate offers "Revise instead" | Done |
| Revise creates version N+1 | Diff table "vN → vN+1" with a breaking-change acknowledgement | Done |
| No field deletion | Stated in the contract footer | Done |
| Rules allowed per type (min and max only for numeric types) | Rule inputs filtered by type; dropped rules warned | Done |
| DIGITS_ONLY allowed only on TEXT | Validation error | Done |
| Searchable, business identifier and mode owned by Business Admin | Shown read-only; carried over on revise | Done |
| `CONFIGURE_INGESTION_SOURCES` gate | All mutations disabled with the reason given; monitoring stays visible | Done |
| 400 / 403 / 503 responses | Inline error with the server message; input kept | Done |
| Save succeeds but refresh fails | Warning notice with Reload | Done |
| Unsaved-change protection | Discard dialog on navigation, section change, drawer close and Escape | Done |
| Loading / empty / error scenario | Global scenario switch | Done |
| Audit events | `INGESTION_SOURCE_*` and `METADATA_FIELD_*` recorded (simulated) | Done |

## Accessibility

Each label is linked to its input, and errors are announced through `aria-invalid` and `aria-describedby`. Saves show an error summary in a `role="alert"`. Focus moves to the detail heading when an integration is selected, to the first input when a drawer opens, and back to the trigger when it closes. The save state is announced politely. Status is never shown by colour alone. Touch targets are at least 40 px.

## Known backend dependencies

- `GET/POST/PUT /api/admin/ingestion-sources[/{id}]`
- `GET /api/admin/ingestion-sources/{id}/operations`
- `GET/POST /api/admin/ingestion-sources/{id}/fields`, `POST …/fields/{key}/revisions`
- Platform default limits are hard-coded here. The UI needs an endpoint that exposes them.

## Proposed enhancements (not supported by current contracts)

1. **Optimistic concurrency.** The backend has no version or ETag, so the last save wins. The UI only warns about this. Proposal: add `If-Match` with a 409 response on mismatch.
2. **Expose platform default limits** to the admin UI.
3. **Count of open submissions** on the operations summary, so the disable dialog can quantify the impact.
4. **Server-side "validate sample value"** endpoint. The sample tester currently mirrors server rules on the client.
5. **Field version history** endpoint, so earlier versions can be listed.
6. **Credential connectivity test** for a credential reference.
