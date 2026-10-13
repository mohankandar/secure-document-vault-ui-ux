import { normalize } from './format'
import { RECORDS, recordIngestedAt } from './mock-data'
import type { BusinessRecord, RecordSummary, SearchSource } from './types'

export type SearchCriteria = {
  criteria: Record<string, string>
  dateFrom: string
  dateTo: string
  updatedFrom: string
  updatedTo: string
}

export const emptyCriteria = (): SearchCriteria => ({ criteria: {}, dateFrom: '', dateTo: '', updatedFrom: '', updatedTo: '' })

const inRange = (iso: string, from: string, to: string) => {
  const time = new Date(iso).getTime()
  if (from && time < new Date(`${from}T00:00:00Z`).getTime()) return false
  if (to && time > new Date(`${to}T23:59:59.999Z`).getTime()) return false
  return true
}

export const toSummary = (record: BusinessRecord): RecordSummary => ({
  recordRef: record.recordRef,
  identifiers: record.identifiers,
  metadataPreview: record.metadata.filter((value) => !value.businessIdentifier),
  submissionCount: record.submissionCount,
  availableDocumentCount: record.documents.length,
  latestSubmissionAt: record.latestSubmissionAt,
  incomplete: false,
})

export function hasCriteria(search: SearchCriteria) {
  return Object.values(search.criteria).some((value) => value.trim()) || Boolean(search.dateFrom || search.dateTo || search.updatedFrom || search.updatedTo)
}

export function runSearch(source: SearchSource, search: SearchCriteria): RecordSummary[] {
  return RECORDS.filter((record) => record.sourceId === source.sourceId)
    .filter((record) =>
      source.fields.every((field) => {
        const raw = search.criteria[field.fieldKey]?.trim()
        if (!raw) return true
        const value = record.metadata.find((item) => item.fieldKey === field.fieldKey)?.value
        if (!value) return false
        const needle = normalize(raw, field.normalization)
        const hay = normalize(value, field.normalization)
        if (field.searchMode === 'PREFIX') return hay.startsWith(needle)
        if (field.searchMode === 'PARTIAL') return hay.includes(needle)
        return hay === needle
      }),
    )
    .filter((record) => inRange(recordIngestedAt(record), search.dateFrom, search.dateTo))
    .filter((record) => inRange(record.latestSubmissionAt, search.updatedFrom, search.updatedTo))
    .sort((a, b) => new Date(b.latestSubmissionAt).getTime() - new Date(a.latestSubmissionAt).getTime())
    .map(toSummary)
}
