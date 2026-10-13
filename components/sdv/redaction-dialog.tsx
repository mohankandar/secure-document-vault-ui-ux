'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { RedactionMark } from '@/lib/sdv/types'
import { Button } from './primitives'

type Props = {
  open: boolean
  filename: string
  marks: RedactionMark[]
  onCancel: () => void
  onConfirm: (reason: string) => void
}

export function RedactionDialog({ open, filename, marks, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  // Native <dialog> provides focus trapping, Escape handling, and inert background; it must be opened imperatively.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setReason('')
      setAcknowledged(false)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const byPage = marks.reduce<Record<number, number>>((acc, mark) => ({ ...acc, [mark.pageNumber]: (acc[mark.pageNumber] ?? 0) + 1 }), {})
  const pages = Object.keys(byPage).map(Number).sort((a, b) => a - b)
  const valid = reason.trim().length >= 10 && acknowledged

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      aria-labelledby="redaction-dialog-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-[#101828]/50"
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid) onConfirm(reason.trim())
        }}
      >
        <div className="flex gap-3 border-b border-border px-5 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger-bg text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="redaction-dialog-title" className="text-[15px] font-semibold text-strong">Apply permanent redaction?</h2>
            <p className="mt-0.5 text-[13px] text-secondary-text">
              Content under {marks.length} {marks.length === 1 ? 'area' : 'areas'} will be removed from <span className="font-medium text-strong">{filename}</span>. The stored PDF is replaced and the original content cannot be recovered.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Staged areas</p>
            <ul className="divide-y divide-border-soft rounded-md border border-border">
              {pages.map((page) => (
                <li key={page} className="flex justify-between px-3 py-1.5 text-[13px]">
                  <span className="text-strong">Page {page}</span>
                  <span className="text-secondary-text tabular-nums">
                    {byPage[page]} {byPage[page] === 1 ? 'area' : 'areas'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-strong">
              Reason for redaction <span className="font-normal text-muted-foreground">(recorded in audit)</span>
            </span>
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Corrective redaction of SSN captured on page 1 in error — ticket CR-4821"
              className="w-full resize-none rounded-md border border-input bg-card px-2.5 py-2 text-[13px] text-strong shadow-xs placeholder:text-[#98a2b3] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:outline-none"
            />
            <span className="mt-1 block text-[11.5px] text-muted-foreground">Minimum 10 characters.</span>
          </label>

          <label className="flex items-start gap-2.5 rounded-md border border-[#f3c4bf] bg-danger-bg px-3 py-2.5">
            <input type="checkbox" className="mt-0.5 size-4 accent-[#b42318]" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
            <span className="text-[13px] text-[#7a271a]">I understand this permanently removes the content for every user and cannot be undone.</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 rounded-b-lg border-t border-border bg-muted px-5 py-3">
          <Button variant="secondary" onClick={onCancel} autoFocus>Back to editing</Button>
          <Button type="submit" variant="danger" disabled={!valid}>Permanently redact</Button>
        </div>
      </form>
    </dialog>
  )
}
