import type { SearchField } from './types'

const dateTimeFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })

export const formatDateTime = (value?: string | null) => (value ? dateTimeFormat.format(new Date(value)) : '—')
export const formatDate = (value?: string | null) => (value ? dateFormat.format(new Date(value)) : '—')

export const searchHint = (field: SearchField) =>
  field.searchMode === 'PREFIX' ? 'Starts with' : field.searchMode === 'PARTIAL' ? 'Contains' : 'Exact match'

const ACTION_LABELS: Record<string, string> = {
  DOCUMENT_DOWNLOADED: 'Download',
  DOCUMENT_PRINTED: 'Print',
  DOCUMENT_TAG_ADDED: 'Tag added',
  DOCUMENT_COMMENT_ADDED: 'Comment added',
  DOCUMENT_PERMANENTLY_REDACTED: 'Permanent redaction',
  DOCUMENT_REDACTION_FAILED: 'Redaction failed',
  DOCUMENT_RECEIVED: 'Document uploaded',
  DOCUMENT_AVAILABLE: 'Document available',
  DOCUMENT_VIEW_OPENED: 'Document viewed',
  DOCUMENT_PAGE_VIEWED: 'Page viewed',
  DOCUMENT_TEXT_SEARCHED: 'Document searched',
}

export const actionLabel = (action: string) =>
  ACTION_LABELS[action] ?? action.replaceAll('_', ' ').toLowerCase().replace(/^./, (m) => m.toUpperCase())

export const VIEW_EVENT_ACTIONS = new Set(['DOCUMENT_VIEW_OPENED', 'DOCUMENT_PAGE_VIEWED', 'DOCUMENT_TEXT_SEARCHED'])

export const ACTIVITY_ACTION_OPTIONS = [
  'DOCUMENT_DOWNLOADED',
  'DOCUMENT_PRINTED',
  'DOCUMENT_TAG_ADDED',
  'DOCUMENT_COMMENT_ADDED',
  'DOCUMENT_PERMANENTLY_REDACTED',
  'DOCUMENT_AVAILABLE',
]

export const normalize = (value: string, normalization: string) =>
  normalization === 'DIGITS_ONLY' ? value.replace(/\D/g, '') : value.trim().toLowerCase()
