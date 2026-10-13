# Real SDV Current Reference

This folder is a snapshot of the validated real Secure Document Vault frontend from:

- Source repo: `mohankandar/secure-document-vault`
- Source branch: `ui/premium-business-workspace`
- Snapshot purpose: give v0 the current real implementation as the source of truth for the next visual refinement pass.

## Important

The app at the repository root is still the v0 design prototype. Do not treat its mock state, framework choices, or mock data as production behavior.

For the next design pass, inspect the files under:

`real-sdv-current/frontend/sdv-ui/`

The real SDV frontend is React 18 + Vite. Preserve its existing:
- APIs and backend contracts
- permissions and capability gates
- authentication/authorization behavior
- secure viewer rendering
- download and print behavior
- comments and tags
- permanent corrective redaction
- business search behavior
- activity/audit semantics
- routes and data relationships

Do not migrate frameworks and do not replace the real viewer with mock PDF behavior.

Use the real implementation as the behavioral source of truth and the existing v0 premium-polish work only as a visual reference.
