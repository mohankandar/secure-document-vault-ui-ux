import type {
  BusinessRecord,
  Capability,
  DocumentActivity,
  DocumentComment,
  DocumentPage,
  DocumentState,
  DocumentTag,
  FieldValue,
  SearchSource,
} from './types'

export const PROTOTYPE_NOW = '2026-10-12T15:00:00Z'

export const SOURCES: SearchSource[] = [
  {
    sourceId: 'src-lexavault',
    sourceKey: 'lexaVault',
    displayName: 'LexaVault',
    fields: [
      { fieldKey: 'contractNumber', displayLabel: 'Contract Number', fieldType: 'STRING', businessIdentifier: true, normalization: 'DIGITS_ONLY', searchMode: 'EXACT' },
      { fieldKey: 'memberNumber', displayLabel: 'Member Number', fieldType: 'STRING', businessIdentifier: true, normalization: 'DIGITS_ONLY', searchMode: 'EXACT' },
      { fieldKey: 'serviceEntity', displayLabel: 'Service Entity', fieldType: 'STRING', businessIdentifier: true, normalization: 'TRIM', searchMode: 'EXACT' },
    ],
  },
  {
    sourceId: 'src-member-services',
    sourceKey: 'memberServices',
    displayName: 'Member Services',
    fields: [
      { fieldKey: 'contractNumber', displayLabel: 'Contract Number', fieldType: 'STRING', businessIdentifier: true, normalization: 'DIGITS_ONLY', searchMode: 'EXACT' },
      { fieldKey: 'memberNumber', displayLabel: 'Member Number', fieldType: 'STRING', businessIdentifier: true, normalization: 'DIGITS_ONLY', searchMode: 'EXACT' },
      { fieldKey: 'serviceEntity', displayLabel: 'Service Entity', fieldType: 'STRING', businessIdentifier: true, normalization: 'TRIM', searchMode: 'EXACT' },
      { fieldKey: 'firstName', displayLabel: 'First Name', fieldType: 'STRING', businessIdentifier: false, normalization: 'TRIM', searchMode: 'PREFIX' },
      { fieldKey: 'lastName', displayLabel: 'Last Name', fieldType: 'STRING', businessIdentifier: false, normalization: 'TRIM', searchMode: 'PREFIX' },
    ],
  },
]

type Seed = {
  sourceId: string
  values: Record<string, string>
  updated: string
  ingested: string
  files: { name: string; pages: number }[]
}

const SEEDS: Seed[] = [
  { sourceId: 'src-lexavault', values: { contractNumber: '100000000001', memberNumber: '20000000001', serviceEntity: '001' }, ingested: '2026-07-14T13:22:00Z', updated: '2026-10-09T16:41:00Z', files: [{ name: 'Member Agreement.pdf', pages: 4 }, { name: 'Identity Verification.pdf', pages: 2 }, { name: 'Terms and Conditions.pdf', pages: 6 }] },
  { sourceId: 'src-lexavault', values: { contractNumber: '100000000002', memberNumber: '20000000002', serviceEntity: '002' }, ingested: '2026-08-02T10:05:00Z', updated: '2026-09-28T11:12:00Z', files: [{ name: 'Application Form.pdf', pages: 3 }] },
  { sourceId: 'src-lexavault', values: { contractNumber: '100000000003', memberNumber: '20000000003', serviceEntity: '003' }, ingested: '2026-08-19T09:30:00Z', updated: '2026-09-30T14:02:00Z', files: [{ name: 'Member Correspondence.pdf', pages: 2 }] },
  { sourceId: 'src-lexavault', values: { contractNumber: '100000000014', memberNumber: '20000000014', serviceEntity: '001' }, ingested: '2026-06-03T15:45:00Z', updated: '2026-10-02T08:20:00Z', files: [{ name: 'Member Agreement.pdf', pages: 4 }, { name: 'Application Form.pdf', pages: 3 }] },
  { sourceId: 'src-lexavault', values: { contractNumber: '100000000027', memberNumber: '20000000027', serviceEntity: '001' }, ingested: '2026-05-21T12:10:00Z', updated: '2026-09-11T17:55:00Z', files: [{ name: 'Member Correspondence.pdf', pages: 2 }, { name: 'Identity Verification.pdf', pages: 2 }] },
  { sourceId: 'src-lexavault', values: { contractNumber: '100000000031', memberNumber: '20000000031', serviceEntity: '002' }, ingested: '2026-04-11T10:00:00Z', updated: '2026-08-15T09:40:00Z', files: [{ name: 'Terms and Conditions.pdf', pages: 6 }] },
  { sourceId: 'src-member-services', values: { contractNumber: '100000000001', memberNumber: '20000000001', serviceEntity: '001', firstName: 'Avery', lastName: 'Lindqvist' }, ingested: '2026-07-14T13:22:00Z', updated: '2026-10-06T10:18:00Z', files: [{ name: 'Member Correspondence.pdf', pages: 2 }] },
  { sourceId: 'src-member-services', values: { contractNumber: '100000000045', memberNumber: '20000000045', serviceEntity: '004', firstName: 'Jordan', lastName: 'Okafor' }, ingested: '2026-09-02T14:00:00Z', updated: '2026-10-01T15:30:00Z', files: [{ name: 'Application Form.pdf', pages: 3 }, { name: 'Identity Verification.pdf', pages: 2 }] },
  { sourceId: 'src-member-services', values: { contractNumber: '100000000046', memberNumber: '20000000046', serviceEntity: '004', firstName: 'Jordan', lastName: 'Lindgren' }, ingested: '2026-09-04T09:12:00Z', updated: '2026-09-29T12:44:00Z', files: [{ name: 'Member Agreement.pdf', pages: 4 }] },
]

const fieldValues = (source: SearchSource, values: Record<string, string>): FieldValue[] =>
  source.fields
    .filter((field) => values[field.fieldKey])
    .map((field) => ({ fieldKey: field.fieldKey, displayLabel: field.displayLabel, value: values[field.fieldKey], businessIdentifier: field.businessIdentifier }))

export const PAGE_COUNTS: Record<string, number> = {}

export const RECORDS: BusinessRecord[] = SEEDS.map((seed, index) => {
  const source = SOURCES.find((item) => item.sourceId === seed.sourceId)!
  const all = fieldValues(source, seed.values)
  const recordRef = `rec-${seed.sourceId.replace('src-', '')}-${seed.values.contractNumber}`
  return {
    recordRef,
    sourceId: source.sourceId,
    sourceKey: source.sourceKey,
    sourceDisplayName: source.displayName,
    identifiers: all.filter((value) => value.businessIdentifier),
    metadata: all,
    submissionCount: 1,
    latestSubmissionAt: seed.updated,
    documents: seed.files.map((file, fileIndex) => {
      const documentId = `doc-${index + 1}-${fileIndex + 1}`
      PAGE_COUNTS[documentId] = file.pages
      const available = new Date(new Date(seed.ingested).getTime() + (fileIndex * 7 + 3) * 60_000).toISOString()
      return {
        documentId,
        submissionId: `sub-${seed.values.contractNumber}`,
        sourceDocumentId: `r3-demo-doc-${seed.values.contractNumber}-${fileIndex + 1}`,
        originalFilename: file.name,
        ingestedAt: seed.ingested,
        availableAt: available,
        expiresAt: null,
      }
    }),
  }
})

export const recordIngestedAt = (record: BusinessRecord) => record.documents[0]?.ingestedAt ?? record.latestSubmissionAt

const BODY_TEXT: Record<string, string[]> = {
  'Member Agreement.pdf': [
    'This Member Agreement ("Agreement") sets out the terms under which the Member is admitted to the program and the obligations of each party during the life of the contract.',
    'The Member agrees to provide accurate and complete information at enrollment and to notify the Service Entity of any material change within thirty (30) days of that change occurring.',
    'Contributions are payable on the schedule elected at enrollment. Late contributions may be subject to the administrative fee described in Schedule B of this Agreement.',
    'The Service Entity will maintain records relating to the Member in accordance with applicable regulatory retention requirements and the retention policy in force for this source.',
    'Either party may terminate this Agreement by written notice. Termination does not affect obligations accrued before the effective date of termination.',
    'Any dispute arising under this Agreement shall first be referred to the internal resolution process before any external proceeding is initiated.',
  ],
  'Identity Verification.pdf': [
    'Identity verification was completed using two independent forms of documentary evidence presented by the Member at the time of enrollment.',
    'Primary evidence: government-issued photo identification. Secondary evidence: utility statement dated within ninety (90) days of verification.',
    'The verifying officer confirmed that the name, date of birth, and residential address match across all evidence presented.',
    'Verification outcome: PASSED. No adverse findings were recorded against the Member during sanctions and watch-list screening.',
  ],
  'Terms and Conditions.pdf': [
    'These Terms and Conditions apply to all accounts administered under the contract referenced above and supplement the Member Agreement.',
    'Statements are issued quarterly. The Member is responsible for reviewing each statement and reporting discrepancies within sixty (60) days.',
    'Fees are disclosed in the fee schedule. The Service Entity may amend fees upon at least thirty (30) days written notice to the Member.',
    'Electronic communications delivered to the address on file are deemed received on the business day following transmission.',
    'Personal information is processed in accordance with the privacy notice provided to the Member at enrollment.',
    'The governing law of these Terms and Conditions is the law of the jurisdiction in which the Service Entity is registered.',
  ],
  'Application Form.pdf': [
    'Section 1 — Applicant details. Full legal name, residential address, and contact information as provided by the applicant.',
    'Section 2 — Program election. The applicant elects the standard contribution schedule with annual review.',
    'Section 3 — Declarations. The applicant declares that the information provided is true and complete to the best of their knowledge.',
    'Section 4 — Authorization. The applicant authorizes the Service Entity to verify the information supplied in this application.',
  ],
  'Member Correspondence.pdf': [
    'Thank you for contacting Member Services regarding your contract. We have reviewed your request and updated your records accordingly.',
    'Your updated mailing address will be used for all future correspondence and statements beginning with the next quarterly cycle.',
    'If you did not request this change, please contact Member Services immediately using the number printed on your most recent statement.',
  ],
}

export function buildPages(record: BusinessRecord, filename: string, pageCount: number): DocumentPage[] {
  const body = BODY_TEXT[filename] ?? BODY_TEXT['Member Correspondence.pdf']
  const title = filename.replace(/\.pdf$/i, '')
  const ids = record.identifiers.map((value) => `${value.displayLabel}: ${value.value}`)
  return Array.from({ length: pageCount }, (_, index) => {
    const offset = (index * 3) % body.length
    const blocks = [body[offset], body[(offset + 1) % body.length], body[(offset + 2) % body.length], body[(offset + 3) % body.length]]
    return {
      heading: index === 0 ? title : `${title} — continued`,
      blocks: index === 0 ? [ids.join('   ·   '), ...blocks] : blocks,
    }
  })
}

const COMMENT_AUTHORS = ['m.reyes@northbridge.example', 'a.chen@northbridge.example', 'd.patel@northbridge.example', 'j.alvarez@northbridge.example']

const MEMBER_AGREEMENT_COMMENTS = [
  'Signature on page 3 verified against enrollment record.',
  'Schedule B fee reference confirmed with Member Services.',
  'Member called to confirm contribution schedule — no change requested.',
  'Address on page 1 differs from correspondence dated Aug 2026; flagged for review.',
  'Review complete. Address discrepancy resolved via Member Correspondence.pdf.',
  'QC sampling: document legible and complete.',
  'Added to quarterly compliance review set.',
]

function seedComments(documentId: string, texts: string[], start: string): DocumentComment[] {
  return texts
    .map((comment, index) => ({
      commentId: `${documentId}-c${index + 1}`,
      documentId,
      comment,
      createdBy: COMMENT_AUTHORS[index % COMMENT_AUTHORS.length],
      createdAt: new Date(new Date(start).getTime() + index * 26 * 3_600_000).toISOString(),
    }))
    .reverse()
}

function seedTags(documentId: string, tags: string[], at: string): DocumentTag[] {
  return tags.map((tag, index) => ({ tagId: `${documentId}-t${index + 1}`, documentId, tag, createdBy: COMMENT_AUTHORS[index % 2], createdAt: at }))
}

export function initialDocumentState(): Record<string, DocumentState> {
  const state: Record<string, DocumentState> = {}
  for (const record of RECORDS) {
    for (const document of record.documents) {
      state[document.documentId] = { comments: [], tags: [], redactions: [] }
    }
  }
  state['doc-1-1'] = {
    comments: seedComments('doc-1-1', MEMBER_AGREEMENT_COMMENTS, '2026-10-01T14:10:00Z'),
    tags: seedTags('doc-1-1', ['Verified', 'Compliance review Q4'], '2026-10-03T09:00:00Z'),
    redactions: [],
  }
  state['doc-1-2'] = {
    comments: seedComments('doc-1-2', ['Secondary evidence date within 90 days — acceptable.'], '2026-09-20T11:00:00Z'),
    tags: seedTags('doc-1-2', ['KYC'], '2026-09-20T11:05:00Z'),
    redactions: [{ id: 'r-seed', pageNumber: 1, x: 0.1, y: 0.42, width: 0.5, height: 0.035 }],
  }
  state['doc-2-1'] = { comments: seedComments('doc-2-1', ['Application received complete.', 'Section 4 authorization signed.'], '2026-09-10T09:00:00Z'), tags: [], redactions: [] }
  return state
}

const ACTORS = ['m.reyes@northbridge.example', 'a.chen@northbridge.example', 'd.patel@northbridge.example', 'svc-lexavault-producer']

export function initialActivity(): DocumentActivity[] {
  const events: DocumentActivity[] = []
  let counter = 0
  const push = (documentId: string, action: string, occurredAt: string, actorId: string, outcome = 'SUCCESS') => {
    counter += 1
    events.push({ auditEventId: `evt-${counter}`, actorType: actorId.startsWith('svc-') ? 'SOURCE' : 'USER', actorId, action, occurredAt, outcome, documentId })
  }
  for (const record of RECORDS) {
    for (const document of record.documents) {
      push(document.documentId, 'DOCUMENT_RECEIVED', document.ingestedAt, 'svc-lexavault-producer')
      push(document.documentId, 'DOCUMENT_AVAILABLE', document.availableAt ?? document.ingestedAt, 'svc-lexavault-producer')
    }
  }
  const t = (iso: string) => iso
  push('doc-1-1', 'DOCUMENT_VIEW_OPENED', t('2026-10-01T14:02:00Z'), ACTORS[0])
  push('doc-1-1', 'DOCUMENT_PAGE_VIEWED', t('2026-10-01T14:04:00Z'), ACTORS[0])
  MEMBER_AGREEMENT_COMMENTS.forEach((_, index) => {
    push('doc-1-1', 'DOCUMENT_COMMENT_ADDED', new Date(new Date('2026-10-01T14:10:00Z').getTime() + index * 26 * 3_600_000).toISOString(), COMMENT_AUTHORS[index % COMMENT_AUTHORS.length])
  })
  push('doc-1-1', 'DOCUMENT_TAG_ADDED', t('2026-10-03T09:00:00Z'), ACTORS[0])
  push('doc-1-1', 'DOCUMENT_TAG_ADDED', t('2026-10-03T09:00:30Z'), ACTORS[1])
  push('doc-1-1', 'DOCUMENT_DOWNLOADED', t('2026-10-04T16:22:00Z'), ACTORS[1])
  push('doc-1-1', 'DOCUMENT_PRINTED', t('2026-10-05T10:47:00Z'), ACTORS[2])
  push('doc-1-1', 'DOCUMENT_TEXT_SEARCHED', t('2026-10-08T13:15:00Z'), ACTORS[2])
  push('doc-1-1', 'DOCUMENT_VIEW_OPENED', t('2026-10-09T16:40:00Z'), ACTORS[1])
  push('doc-1-2', 'DOCUMENT_VIEW_OPENED', t('2026-09-20T10:55:00Z'), ACTORS[0])
  push('doc-1-2', 'DOCUMENT_COMMENT_ADDED', t('2026-09-20T11:00:00Z'), ACTORS[0])
  push('doc-1-2', 'DOCUMENT_TAG_ADDED', t('2026-09-20T11:05:00Z'), ACTORS[0])
  push('doc-1-2', 'DOCUMENT_REDACTION_FAILED', t('2026-09-21T08:30:00Z'), ACTORS[2], 'FAILURE')
  push('doc-1-2', 'DOCUMENT_PERMANENTLY_REDACTED', t('2026-09-21T08:34:00Z'), ACTORS[2])
  push('doc-1-3', 'DOCUMENT_VIEW_OPENED', t('2026-09-25T09:12:00Z'), ACTORS[0])
  push('doc-1-3', 'DOCUMENT_DOWNLOADED', t('2026-09-25T09:14:00Z'), ACTORS[1])
  push('doc-2-1', 'DOCUMENT_COMMENT_ADDED', t('2026-09-10T09:00:00Z'), COMMENT_AUTHORS[0])
  push('doc-2-1', 'DOCUMENT_COMMENT_ADDED', t('2026-09-11T11:00:00Z'), COMMENT_AUTHORS[1])
  push('doc-2-1', 'DOCUMENT_PRINTED', t('2026-09-28T11:12:00Z'), ACTORS[0])
  return events
}

export type Persona = 'business' | 'steward'

export const PERSONAS: { value: Persona; label: string; user: string; capabilities: Capability[] }[] = [
  {
    value: 'business',
    label: 'Business User',
    user: 'm.reyes@northbridge.example',
    capabilities: ['SEARCH_RECORDS', 'VIEW_PDF', 'DOWNLOAD_CURRENT_PDF', 'PRINT_DOCUMENT', 'ADD_DOCUMENT_TAG', 'ADD_DOCUMENT_COMMENT'],
  },
  {
    value: 'steward',
    label: 'Document Steward',
    user: 'd.patel@northbridge.example',
    capabilities: ['SEARCH_RECORDS', 'VIEW_PDF', 'DOWNLOAD_CURRENT_PDF', 'PRINT_DOCUMENT', 'ADD_DOCUMENT_TAG', 'ADD_DOCUMENT_COMMENT', 'PERMANENT_REDACTION'],
  },
]

export const CAPABILITY_LABELS: Record<Capability, string> = {
  SEARCH_RECORDS: 'Search business records',
  VIEW_PDF: 'View documents',
  DOWNLOAD_CURRENT_PDF: 'Download current PDF',
  PRINT_DOCUMENT: 'Print document',
  ADD_DOCUMENT_TAG: 'Add document tag',
  ADD_DOCUMENT_COMMENT: 'Add document comment',
  PERMANENT_REDACTION: 'Permanent corrective redaction',
}
