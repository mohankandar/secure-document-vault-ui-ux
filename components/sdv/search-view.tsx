'use client'

import type { FormEvent } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { searchHint } from '@/lib/sdv/format'
import type { SearchCriteria } from '@/lib/sdv/search'
import type { SearchSource } from '@/lib/sdv/types'
import { Button, Input, SectionLabel, Select } from './primitives'

type Props = {
  sources: SearchSource[]
  source: SearchSource | undefined
  search: SearchCriteria
  error: string
  onSourceChange: (sourceId: string) => void
  onChange: (next: SearchCriteria) => void
  onSubmit: () => void
  onClear: () => void
}

function DateRange({ legend, from, to, onFrom, onTo, idPrefix }: { legend: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; idPrefix: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[13px] font-medium text-strong">{legend}</legend>
      <div className="flex items-center gap-2">
        <label htmlFor={`${idPrefix}-from`} className="sr-only">{legend} from</label>
        <Input id={`${idPrefix}-from`} type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="min-w-0 tabular-nums" />
        <span className="text-[13px] text-muted-foreground" aria-hidden="true">to</span>
        <label htmlFor={`${idPrefix}-to`} className="sr-only">{legend} to</label>
        <Input id={`${idPrefix}-to`} type="date" value={to} onChange={(e) => onTo(e.target.value)} className="min-w-0 tabular-nums" />
      </div>
    </fieldset>
  )
}

export function SearchView({ sources, source, search, error, onSourceChange, onChange, onSubmit, onClear }: Props) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6 lg:py-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-strong">Search documents</h1>
        <p className="text-[13px] text-secondary-text">Find source-aware business records and securely open the documents associated with them.</p>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-border bg-card shadow-xs" aria-label="Search criteria">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-end md:gap-6">
          <label className="block w-full md:w-72">
            <span className="mb-1.5 block text-[13px] font-medium text-strong">Source</span>
            <Select value={source?.sourceId ?? ''} onChange={(e) => onSourceChange(e.target.value)}>
              {sources.map((item) => (
                <option key={item.sourceId} value={item.sourceId}>{item.displayName}</option>
              ))}
            </Select>
          </label>
          <p className="pb-2 text-[12.5px] text-muted-foreground">
            {source?.fields.length ?? 0} searchable fields are configured for this source. Fields change automatically when the source changes.
          </p>
        </div>

        <div className="space-y-5 px-5 py-5">
          <section aria-labelledby="record-fields-label">
            <SectionLabel className="mb-3 block">
              <span id="record-fields-label">Record fields</span>
            </SectionLabel>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {source?.fields.map((field) => (
                <label key={field.fieldKey} className="block min-w-0">
                  <span className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-strong">
                      {field.displayLabel}
                      {field.businessIdentifier && <span className="rounded-sm bg-selected px-1 text-[10px] leading-4 font-semibold text-accent-foreground">Identifier</span>}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">{searchHint(field)}</span>
                  </span>
                  <Input
                    value={search.criteria[field.fieldKey] ?? ''}
                    inputMode={field.normalization === 'DIGITS_ONLY' ? 'numeric' : undefined}
                    autoComplete="off"
                    onChange={(e) => onChange({ ...search, criteria: { ...search.criteria, [field.fieldKey]: e.target.value } })}
                    className="tabular-nums"
                  />
                </label>
              ))}
            </div>
          </section>

          <section aria-labelledby="date-filters-label" className="border-t border-border-soft pt-5">
            <SectionLabel className="mb-3 block">
              <span id="date-filters-label">Dates</span>
            </SectionLabel>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              <DateRange idPrefix="date-range" legend="Date Range" from={search.dateFrom} to={search.dateTo} onFrom={(v) => onChange({ ...search, dateFrom: v })} onTo={(v) => onChange({ ...search, dateTo: v })} />
              <DateRange idPrefix="last-updated" legend="Last Updated" from={search.updatedFrom} to={search.updatedTo} onFrom={(v) => onChange({ ...search, updatedFrom: v })} onTo={(v) => onChange({ ...search, updatedTo: v })} />
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 rounded-b-lg border-t border-border bg-muted px-5 py-3 sm:flex-row sm:items-center">
          <div className="min-h-5 flex-1 text-[13px]" aria-live="polite">
            {error ? (
              <span className="flex items-center gap-1.5 text-destructive"><AlertCircle className="size-4" aria-hidden="true" />{error}</span>
            ) : (
              <span className="text-muted-foreground">Enter at least one field, Date Range, or Last Updated filter.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClear}>Clear</Button>
            <Button type="submit" variant="primary" disabled={!source} className="min-w-28"><Search aria-hidden="true" />Search</Button>
          </div>
        </div>
      </form>

      <p className="mt-3 text-[12px] text-muted-foreground">
        Prototype data: try Service Entity <span className="font-medium text-secondary-text tabular-nums">001</span> on LexaVault, or First Name <span className="font-medium text-secondary-text">Jordan</span> on Member Services.
      </p>
    </div>
  )
}
