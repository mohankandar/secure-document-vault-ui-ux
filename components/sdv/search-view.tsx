'use client'

import type { FormEvent } from 'react'
import { AlertCircle, Database, Search } from 'lucide-react'
import { searchHint } from '@/lib/sdv/format'
import type { SearchCriteria } from '@/lib/sdv/search'
import type { SearchSource } from '@/lib/sdv/types'
import { Button, Input, PageHeader, SectionLabel } from './primitives'

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

function SourceSwitcher({ sources, source, onSourceChange }: Pick<Props, 'sources' | 'source' | 'onSourceChange'>) {
  return (
    <label className="flex h-12 items-center gap-3 rounded-lg bg-muted pr-1 pl-3 ring-1 ring-border ring-inset focus-within:ring-2 focus-within:ring-primary">
      <Database className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">Searching in</span>
        <select
          value={source?.sourceId ?? ''}
          onChange={(e) => onSourceChange(e.target.value)}
          aria-label="Source"
          className="-ml-0.5 cursor-pointer appearance-none bg-transparent pr-6 text-sm font-semibold text-strong focus:outline-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%232a55d4%27 stroke-width=%272.25%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_0.1rem_center] bg-no-repeat"
        >
          {sources.map((item) => (
            <option key={item.sourceId} value={item.sourceId}>{item.displayName}</option>
          ))}
        </select>
      </span>
      <span className="ml-2 hidden rounded-md bg-card px-2 py-1 text-[11.5px] font-medium text-secondary-text tabular-nums ring-1 ring-border sm:inline">
        {source?.fields.length ?? 0} fields
      </span>
    </label>
  )
}

function DateRange({ legend, hint, from, to, onFrom, onTo, idPrefix }: { legend: string; hint: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; idPrefix: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-strong">{legend}</span>
        <span className="text-[11.5px] text-muted-foreground">{hint}</span>
      </legend>
      <div className="flex items-center gap-2">
        <label htmlFor={`${idPrefix}-from`} className="sr-only">{legend} from</label>
        <Input id={`${idPrefix}-from`} type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="min-w-0 tabular-nums" />
        <span className="text-[13px] text-muted-foreground" aria-hidden="true">–</span>
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
    <>
      <PageHeader
        eyebrow="Business search"
        title="Find a business record"
        description="Search by any identifier or detail below, then open the record's documents in the secure viewer."
        aside={<SourceSwitcher sources={sources} source={source} onSourceChange={onSourceChange} />}
      />

      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-8 md:py-8">
        <form onSubmit={submit} className="panel max-w-5xl" aria-label="Search criteria">
          <section aria-labelledby="record-fields-label" className="px-5 pt-5 pb-6 md:px-7 md:pt-6">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 id="record-fields-label" className="text-[15px] font-semibold text-strong">
                {source?.displayName} record
              </h2>
              <span className="text-[12px] text-muted-foreground">Fields shown match the selected source</span>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
              {source?.fields.map((field) => (
                <label key={field.fieldKey} className="block min-w-0">
                  <span className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-strong">
                      {field.displayLabel}
                      {field.businessIdentifier && (
                        <span className="rounded bg-selected px-1.5 text-[10.5px] leading-[18px] font-semibold text-accent-foreground">ID</span>
                      )}
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

          <section aria-labelledby="date-filters-label" className="border-t border-border-soft px-5 pt-5 pb-6 md:px-7">
            <SectionLabel className="mb-4 block">
              <span id="date-filters-label">Narrow by date</span>
            </SectionLabel>
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
              <DateRange idPrefix="date-range" legend="Date Range" hint="Document date" from={search.dateFrom} to={search.dateTo} onFrom={(v) => onChange({ ...search, dateFrom: v })} onTo={(v) => onChange({ ...search, dateTo: v })} />
              <DateRange idPrefix="last-updated" legend="Last Updated" hint="Latest submission" from={search.updatedFrom} to={search.updatedTo} onFrom={(v) => onChange({ ...search, updatedFrom: v })} onTo={(v) => onChange({ ...search, updatedTo: v })} />
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 rounded-b-[inherit] border-t border-border-soft bg-muted/70 px-5 py-4 sm:flex-row sm:items-center md:px-7">
            <div className="min-h-5 flex-1 text-[13px]" aria-live="polite">
              {error ? (
                <span className="flex items-center gap-1.5 font-medium text-destructive"><AlertCircle className="size-4" aria-hidden="true" />{error}</span>
              ) : (
                <span className="text-muted-foreground">Any one field or date filter is enough to search.</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClear}>Clear</Button>
              <Button type="submit" variant="primary" size="lg" disabled={!source} className="min-w-36 flex-1 sm:flex-none"><Search aria-hidden="true" />Search records</Button>
            </div>
          </div>
        </form>

        <p className="mt-4 max-w-5xl text-[12px] text-muted-foreground">
          Prototype data: try Service Entity <span className="font-medium text-secondary-text tabular-nums">001</span> on LexaVault, or First Name <span className="font-medium text-secondary-text">Jordan</span> on Member Services.
        </p>
      </div>
    </>
  )
}
