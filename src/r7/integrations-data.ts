// Tenant IT → Integrations. Shapes mirror the validated SDV contract
// (IngestionSourceAdminService, MetadataFieldDefinitionService, IngestionSourceOperationalSummary).
// Nothing here talks to a backend; every save is simulated.
import { ago } from './data'

export type AuthType = 'OAUTH2_CLIENT_CREDENTIALS' | 'JWT_BEARER' | 'MTLS'
export type SourceStatus = 'ACTIVE' | 'DISABLED'
export type FieldType = 'TEXT' | 'INTEGER' | 'DECIMAL' | 'DATE' | 'DATETIME' | 'BOOLEAN' | 'EMAIL' | 'UUID'
export type Normalization = 'NONE' | 'TRIM' | 'UPPERCASE' | 'LOWERCASE' | 'DIGITS_ONLY'

export type Limits = {
  maxPdfBytes: number | null
  maxPagesPerPdf: number | null
  maxDocumentsPerSubmission: number | null
  maxAggregateSubmissionBytes: number | null
  incompleteAttentionHours: number | null
}
export type Integration = {
  sourceId: string; sourceKey: string; displayName: string; status: SourceStatus
  authType: AuthType; credentialReference: string; limits: Limits; createdAt: string; updatedAt: string
}
export type Rules = { exactLength?: number; minLength?: number; maxLength?: number; pattern?: string; min?: number; max?: number }
export type SourceField = {
  fieldKey: string; version: number; displayLabel: string; fieldType: FieldType; required: boolean
  normalization: Normalization; rules: Rules; effectiveAt: string
  // Owned by Business Administration (CONFIGURE_METADATA_SEARCH); shown read-only here.
  searchable: boolean; businessIdentifier: boolean; searchMode: 'EXACT' | 'PREFIX' | 'PARTIAL' | null
}
export type OpsSummary = {
  submissionCount: number; documentCount: number
  lastActivityAt: string | null; lastDocumentAvailableAt: string | null; lastProcessingFailureAt: string | null
}

export const AUTH_TYPES: { value: AuthType; label: string; credential: string; example: string }[] = [
  { value: 'OAUTH2_CLIENT_CREDENTIALS', label: 'OAuth 2.0 client credentials', credential: 'Reference to the client registration in your secret store. SDV matches the token’s client to this reference; the client secret stays with the producer.', example: 'vault://northwind/ingest/<source-key>' },
  { value: 'JWT_BEARER', label: 'Signed JWT bearer', credential: 'Reference to the producer’s trusted signing key or JWKS entry. SDV never stores the private key.', example: 'vault://northwind/ingest/<source-key>-jwks' },
  { value: 'MTLS', label: 'Mutual TLS', credential: 'Reference to the client certificate identity issued by your PKI. The certificate and key stay on the producer.', example: 'pki://northwind/<source-key>' },
]
export const authLabel = (a: AuthType) => AUTH_TYPES.find((x) => x.value === a)!.label

export const FIELD_TYPES: { value: FieldType; label: string; hint: string }[] = [
  { value: 'TEXT', label: 'Text', hint: 'Any string.' },
  { value: 'INTEGER', label: 'Integer', hint: 'Whole number, e.g. 42.' },
  { value: 'DECIMAL', label: 'Decimal', hint: 'Number with optional fraction, e.g. 12.50.' },
  { value: 'DATE', label: 'Date', hint: 'ISO date, e.g. 2026-10-15.' },
  { value: 'DATETIME', label: 'Date and time', hint: 'ISO date-time with offset, e.g. 2026-10-15T09:00:00Z.' },
  { value: 'BOOLEAN', label: 'Boolean', hint: 'true or false.' },
  { value: 'EMAIL', label: 'Email', hint: 'name@domain.tld' },
  { value: 'UUID', label: 'UUID', hint: '8-4-4-4-12 hexadecimal identifier.' },
]
export const typeLabel = (t: FieldType) => FIELD_TYPES.find((x) => x.value === t)!.label

export const NORMALIZATIONS: { value: Normalization; label: string; hint: string }[] = [
  { value: 'NONE', label: 'None', hint: 'Value is stored exactly as sent.' },
  { value: 'TRIM', label: 'Trim whitespace', hint: 'Leading and trailing spaces removed.' },
  { value: 'UPPERCASE', label: 'Uppercase', hint: 'Converted to upper case before rules are checked.' },
  { value: 'LOWERCASE', label: 'Lowercase', hint: 'Converted to lower case before rules are checked.' },
  { value: 'DIGITS_ONLY', label: 'Digits only', hint: 'All non-digit characters removed, e.g. 100-245 → 100245.' },
]
export const normLabel = (n: Normalization) => NORMALIZATIONS.find((x) => x.value === n)!.label

export const MB = 1024 * 1024
export const PLATFORM_DEFAULTS: Record<keyof Limits, number> = {
  maxPdfBytes: 250 * MB, maxPagesPerPdf: 2000, maxDocumentsPerSubmission: 100,
  maxAggregateSubmissionBytes: 2048 * MB, incompleteAttentionHours: 24,
}
export const LIMIT_META: { key: keyof Limits; label: string; unit: 'MB' | 'pages' | 'documents' | 'hours'; hint: string }[] = [
  { key: 'maxPdfBytes', label: 'Maximum PDF size', unit: 'MB', hint: 'Larger PDFs are rejected at upload.' },
  { key: 'maxPagesPerPdf', label: 'Maximum pages per PDF', unit: 'pages', hint: 'Longer PDFs are rejected at upload.' },
  { key: 'maxDocumentsPerSubmission', label: 'Documents per submission', unit: 'documents', hint: 'Upper bound for expectedDocumentCount.' },
  { key: 'maxAggregateSubmissionBytes', label: 'Total submission size', unit: 'MB', hint: 'All documents in one submission combined.' },
  { key: 'incompleteAttentionHours', label: 'Incomplete-submission alert', unit: 'hours', hint: 'Open submissions older than this are flagged to operations.' },
]
export const EMPTY_LIMITS: Limits = { maxPdfBytes: null, maxPagesPerPdf: null, maxDocumentsPerSubmission: null, maxAggregateSubmissionBytes: null, incompleteAttentionHours: null }
export const fmtLimit = (key: keyof Limits, v: number) => {
  const m = LIMIT_META.find((x) => x.key === key)!
  if (m.unit === 'MB') return v >= 1024 * MB ? `${+(v / (1024 * MB)).toFixed(2)} GB` : `${+(v / MB).toFixed(1)} MB`
  return `${v.toLocaleString()} ${m.unit}`
}

// ---------- Validation (mirrors backend rules; UI adds the duplicate-key and BOOLEAN guards) ----------
export const SOURCE_KEY_RE = /^[a-z][a-z0-9-]{1,79}$/
export const FIELD_KEY_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,99}$/
export type Errors = Partial<Record<string, string>>

export function validateIntegration(v: { sourceKey: string; displayName: string; credentialReference: string; limits: Limits }, opts: { isNew: boolean; takenKeys: string[] }): Errors {
  const e: Errors = {}
  if (opts.isNew) {
    if (!v.sourceKey) e.sourceKey = 'Source key is required.'
    else if (!SOURCE_KEY_RE.test(v.sourceKey)) e.sourceKey = 'Use 2–80 characters: start with a lowercase letter, then lowercase letters, digits or hyphens.'
    else if (opts.takenKeys.includes(v.sourceKey)) e.sourceKey = `“${v.sourceKey}” is already used by another integration in this tenant.`
  }
  if (!v.displayName.trim()) e.displayName = 'Display name is required.'
  else if (v.displayName.trim().length > 200) e.displayName = 'Display name must be 200 characters or fewer.'
  if (!v.credentialReference.trim()) e.credentialReference = 'Credential reference is required. Store the secret elsewhere and reference it here.'
  else if (v.credentialReference.trim().length > 500) e.credentialReference = 'Credential reference must be 500 characters or fewer.'
  for (const m of LIMIT_META) {
    const n = v.limits[m.key]
    if (n != null && (!Number.isFinite(n) || n <= 0)) e[`limit.${m.key}`] = `${m.label} must be greater than zero, or left blank for the platform default.`
  }
  return e
}

export const NUMERIC_TYPES: FieldType[] = ['INTEGER', 'DECIMAL']
export const rulesFor = (t: FieldType): (keyof Rules)[] => (NUMERIC_TYPES.includes(t) ? ['min', 'max', 'exactLength', 'minLength', 'maxLength', 'pattern'] : ['exactLength', 'minLength', 'maxLength', 'pattern'])
export const ruleLabel: Record<keyof Rules, string> = { exactLength: 'Exact length', minLength: 'Minimum length', maxLength: 'Maximum length', pattern: 'Pattern', min: 'Minimum value', max: 'Maximum value' }

export function validateField(f: Omit<SourceField, 'version' | 'effectiveAt' | 'searchable' | 'businessIdentifier' | 'searchMode'>, opts: { isNew: boolean; takenKeys: string[]; integrationName: string }): Errors {
  const e: Errors = {}
  if (opts.isNew) {
    if (!f.fieldKey) e.fieldKey = 'Field key is required.'
    else if (!FIELD_KEY_RE.test(f.fieldKey)) e.fieldKey = 'Start with a letter; then up to 99 letters, digits, “.”, “_” or “-”.'
    else if (opts.takenKeys.some((k) => k.toLowerCase() === f.fieldKey.toLowerCase())) e.fieldKey = `${opts.integrationName} already has a field “${f.fieldKey}”. Revise that field instead of adding a duplicate.`
  }
  if (!f.displayLabel.trim()) e.displayLabel = 'Display label is required.'
  else if (f.displayLabel.trim().length > 200) e.displayLabel = 'Display label must be 200 characters or fewer.'
  if (f.fieldType === 'BOOLEAN' && f.normalization === 'DIGITS_ONLY') e.normalization = 'Digits only cannot be used with a Boolean field: “true”/“false” would become empty.'
  const r = f.rules
  const intRule = (k: 'exactLength' | 'minLength' | 'maxLength') => { const v = r[k]; if (v != null && (!Number.isInteger(v) || v < 0)) e[`rule.${k}`] = `${ruleLabel[k]} must be a whole number of 0 or more.` }
  intRule('exactLength'); intRule('minLength'); intRule('maxLength')
  if (r.minLength != null && r.maxLength != null && r.minLength > r.maxLength) e['rule.maxLength'] = 'Maximum length must be at least the minimum length.'
  if (r.exactLength != null && (r.minLength != null || r.maxLength != null)) e['rule.exactLength'] = 'Use either exact length or a min/max length range, not both.'
  if (NUMERIC_TYPES.includes(f.fieldType) && r.min != null && r.max != null && r.min > r.max) e['rule.max'] = 'Maximum value must be at least the minimum value.'
  if (r.pattern != null) { try { new RegExp(r.pattern) } catch { e['rule.pattern'] = 'This pattern is not a valid regular expression.' } }
  return e
}

export const cleanRules = (r: Rules, t: FieldType): Rules => {
  const allowed = rulesFor(t)
  return Object.fromEntries(Object.entries(r).filter(([k, v]) => allowed.includes(k as keyof Rules) && v !== undefined && v !== '' && v !== null)) as Rules
}
export const rulesSummary = (r: Rules) => {
  const parts: string[] = []
  if (r.exactLength != null) parts.push(`exactly ${r.exactLength} chars`)
  if (r.minLength != null && r.maxLength != null) parts.push(`${r.minLength}–${r.maxLength} chars`)
  else if (r.minLength != null) parts.push(`≥ ${r.minLength} chars`)
  else if (r.maxLength != null) parts.push(`≤ ${r.maxLength} chars`)
  if (r.min != null && r.max != null) parts.push(`${r.min} to ${r.max}`)
  else if (r.min != null) parts.push(`≥ ${r.min}`)
  else if (r.max != null) parts.push(`≤ ${r.max}`)
  if (r.pattern) parts.push(`matches /${r.pattern}/`)
  return parts.join(' · ')
}

// ---------- Prototype lab ----------
export type IgServer = 'accept' | 'reject400' | 'forbidden403' | 'error500' | 'refreshFails'
export type IgLab = { server: IgServer; ops: 'available' | 'unavailable'; canConfigure: boolean }
export const SERVER_OPTIONS: { value: IgServer; label: string }[] = [
  { value: 'accept', label: 'Accept the save' },
  { value: 'reject400', label: '400 · server-side validation' },
  { value: 'forbidden403', label: '403 · permission denied' },
  { value: 'error500', label: '500 · server unavailable' },
  { value: 'refreshFails', label: 'Save succeeds, refresh fails' },
]
export type SaveKind = 'createSource' | 'updateSource' | 'field'
export type SaveError = { status: number; message: string; kind: 'validation' | 'forbidden' | 'server' }
const SERVER_400: Record<SaveKind, string> = {
  createSource: 'sourceKey already exists for this tenant.',
  updateSource: 'credentialReference exceeds 500 characters.',
  field: 'fieldKey must start with a letter and use at most 100 letters, numbers, ".", "_" or "-".',
}
export function simulateSave(lab: IgLab, kind: SaveKind): Promise<{ refreshFailed: boolean }> {
  return new Promise((resolve, reject) => window.setTimeout(() => {
    if (lab.server === 'reject400') reject({ status: 400, kind: 'validation', message: SERVER_400[kind] } satisfies SaveError)
    else if (lab.server === 'forbidden403') reject({ status: 403, kind: 'forbidden', message: 'Access denied: CONFIGURE_INGESTION_SOURCES is required.' } satisfies SaveError)
    else if (lab.server === 'error500') reject({ status: 500, kind: 'server', message: 'The configuration service did not respond.' } satisfies SaveError)
    else resolve({ refreshFailed: lab.server === 'refreshFails' })
  }, 750))
}

// ---------- Fixtures ----------
const f = (fieldKey: string, displayLabel: string, fieldType: FieldType, required: boolean, normalization: Normalization, rules: Rules, version: number, days: number, biz: Partial<Pick<SourceField, 'searchable' | 'businessIdentifier' | 'searchMode'>> = {}): SourceField => ({
  fieldKey, displayLabel, fieldType, required, normalization, rules, version, effectiveAt: ago(days), searchable: false, businessIdentifier: false, searchMode: null, ...biz,
})

export const INTEGRATIONS: Integration[] = [
  { sourceId: 'src-contracts', sourceKey: 'member-contracts', displayName: 'Member Contracts', status: 'ACTIVE', authType: 'OAUTH2_CLIENT_CREDENTIALS', credentialReference: 'vault://northwind/ingest/member-contracts', limits: { ...EMPTY_LIMITS, maxPdfBytes: 50 * MB, maxDocumentsPerSubmission: 12 }, createdAt: ago(412), updatedAt: ago(18) },
  { sourceId: 'src-claims', sourceKey: 'claims-intake', displayName: 'Claims Intake', status: 'ACTIVE', authType: 'MTLS', credentialReference: 'pki://northwind/claims-gateway', limits: { ...EMPTY_LIMITS, maxPagesPerPdf: 400, incompleteAttentionHours: 4 }, createdAt: ago(301), updatedAt: ago(4) },
  { sourceId: 'src-cred', sourceKey: 'provider-credentialing', displayName: 'Provider Credentialing', status: 'DISABLED', authType: 'JWT_BEARER', credentialReference: 'vault://northwind/ingest/credentialing-jwks', limits: { ...EMPTY_LIMITS }, createdAt: ago(190), updatedAt: ago(33) },
]

export const FIELDS: Record<string, SourceField[]> = {
  'src-contracts': [
    f('contractNumber', 'Contract number', 'TEXT', true, 'DIGITS_ONLY', { exactLength: 6 }, 2, 120, { searchable: true, businessIdentifier: true, searchMode: 'EXACT' }),
    f('memberNumber', 'Member number', 'TEXT', true, 'DIGITS_ONLY', { exactLength: 8 }, 1, 412, { searchable: true, businessIdentifier: true, searchMode: 'EXACT' }),
    f('lastName', 'Member last name', 'TEXT', false, 'UPPERCASE', { maxLength: 80 }, 1, 412, { searchable: true, searchMode: 'PREFIX' }),
    f('serviceEntity', 'Service entity', 'TEXT', false, 'TRIM', { maxLength: 120 }, 3, 18, { searchable: true, searchMode: 'PARTIAL' }),
    f('region', 'Region', 'TEXT', false, 'UPPERCASE', { pattern: '^(NORTH|SOUTH|EAST|WEST|CENTRAL)$' }, 1, 412, { searchable: true, searchMode: 'EXACT' }),
    f('effectiveDate', 'Effective date', 'DATE', false, 'NONE', {}, 1, 412),
    f('premiumAmount', 'Monthly premium', 'DECIMAL', false, 'NONE', { min: 0, max: 100000 }, 1, 200),
  ],
  'src-claims': [
    f('claimNumber', 'Claim number', 'TEXT', true, 'UPPERCASE', { pattern: '^CLM-[0-9]{5}$' }, 1, 301, { searchable: true, businessIdentifier: true, searchMode: 'EXACT' }),
    f('memberNumber', 'Member number', 'TEXT', true, 'DIGITS_ONLY', { exactLength: 8 }, 1, 301, { searchable: true, businessIdentifier: true, searchMode: 'EXACT' }),
    f('providerName', 'Provider', 'TEXT', false, 'TRIM', { maxLength: 160 }, 2, 4, { searchable: true, searchMode: 'PARTIAL' }),
    f('serviceDate', 'Date of service', 'DATE', true, 'NONE', {}, 1, 301),
    f('urgent', 'Urgent review', 'BOOLEAN', false, 'LOWERCASE', {}, 1, 120),
  ],
  'src-cred': [
    f('npi', 'NPI', 'TEXT', true, 'DIGITS_ONLY', { exactLength: 10 }, 1, 190, { searchable: true, businessIdentifier: true, searchMode: 'EXACT' }),
    f('providerName', 'Provider name', 'TEXT', false, 'TRIM', {}, 1, 190, { searchable: true, searchMode: 'PREFIX' }),
    f('contactEmail', 'Credentialing contact', 'EMAIL', false, 'LOWERCASE', {}, 1, 190),
  ],
}

export const OPS: Record<string, OpsSummary> = {
  'src-contracts': { submissionCount: 48211, documentCount: 131904, lastActivityAt: ago(0.01), lastDocumentAvailableAt: ago(0.012), lastProcessingFailureAt: ago(0.3) },
  'src-claims': { submissionCount: 202447, documentCount: 388120, lastActivityAt: ago(0.003), lastDocumentAvailableAt: ago(0.004), lastProcessingFailureAt: ago(0.05) },
  'src-cred': { submissionCount: 3120, documentCount: 9804, lastActivityAt: ago(33), lastDocumentAvailableAt: ago(33), lastProcessingFailureAt: null },
}
export const EMPTY_OPS: OpsSummary = { submissionCount: 0, documentCount: 0, lastActivityAt: null, lastDocumentAvailableAt: null, lastProcessingFailureAt: null }
