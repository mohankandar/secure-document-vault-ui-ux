import type { BusinessRecord } from '@/lib/sdv/types'

export function RecordContext({ record }: { record: BusinessRecord }) {
  const pairs = [...record.identifiers.map((value) => ({ label: value.displayLabel, value: value.value })), { label: 'Source', value: record.sourceDisplayName }]

  return (
    <dl aria-label="Selected business record" className="flex min-w-0 items-center">
      {pairs.map((pair, index) => (
        <div
          key={pair.label}
          className={
            index === 0
              ? 'min-w-0 shrink-0 px-3'
              : index === pairs.length - 1
                ? 'hidden min-w-0 overflow-hidden border-l border-border px-3 md:block'
                : 'hidden min-w-0 overflow-hidden border-l border-border px-3 lg:block'
          }
        >
          <dt className="truncate text-[10px] leading-3 font-semibold tracking-wide text-muted-foreground uppercase">{pair.label}</dt>
          <dd className="truncate text-[13px] leading-5 font-semibold text-strong tabular-nums">{pair.value}</dd>
        </div>
      ))}
    </dl>
  )
}
