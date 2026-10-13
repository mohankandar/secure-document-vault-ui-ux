// Mirrors frontend/sdv-ui/src/api.ts contracts so the prototype maps 1:1 onto production data.

export type SearchField = {
  fieldKey: string
  displayLabel: string
  fieldType: string
  businessIdentifier: boolean
  normalization: string
  searchMode: 'EXACT' | 'PREFIX' | 'PARTIAL'
}

export type SearchSource = {
  sourceId: string
  sourceKey: string
  displayName: string
  fields: SearchField[]
}

export type FieldValue = {
  fieldKey: string
  displayLabel: string
  value: string
  businessIdentifier: boolean
}

export type RecordSummary = {
  recordRef: string
  identifiers: FieldValue[]
  metadataPreview: FieldValue[]
  submissionCount: number
  availableDocumentCount: number
  latestSubmissionAt: string
  incomplete: boolean
}

export type RecordDocument = {
  documentId: string
  submissionId: string
  sourceDocumentId: string | null
  originalFilename: string
  ingestedAt: string
  availableAt: string | null
  expiresAt: string | null
}

export type BusinessRecord = {
  recordRef: string
  sourceId: string
  sourceKey: string
  sourceDisplayName: string
  identifiers: FieldValue[]
  metadata: FieldValue[]
  submissionCount: number
  latestSubmissionAt: string
  documents: RecordDocument[]
}

export type DocumentTag = { tagId: string; documentId: string; tag: string; createdBy: string; createdAt: string }
export type DocumentComment = { commentId: string; documentId: string; comment: string; createdBy: string; createdAt: string }

export type DocumentActivity = {
  auditEventId: string
  actorType: string
  actorId: string
  action: string
  occurredAt: string
  outcome: string
  documentId: string
}

export type RedactionMark = { id: string; pageNumber: number; x: number; y: number; width: number; height: number }

export type DocumentPage = { heading: string; blocks: string[] }

export type DocumentState = {
  comments: DocumentComment[]
  tags: DocumentTag[]
  redactions: RedactionMark[]
}

export type Capability =
  | 'SEARCH_RECORDS'
  | 'VIEW_PDF'
  | 'DOWNLOAD_CURRENT_PDF'
  | 'PRINT_DOCUMENT'
  | 'ADD_DOCUMENT_TAG'
  | 'ADD_DOCUMENT_COMMENT'
  | 'PERMANENT_REDACTION'

export type WorkflowTab = 'search' | 'results' | 'viewer' | 'activity'
