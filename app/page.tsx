import { SdvWorkspace } from '@/components/sdv/sdv-workspace'
import type { WorkflowTab } from '@/lib/sdv/types'

const TABS: WorkflowTab[] = ['search', 'results', 'viewer', 'activity']

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const initialTab = TABS.includes(tab as WorkflowTab) ? (tab as WorkflowTab) : 'search'
  return <SdvWorkspace key={initialTab} initialTab={initialTab} />
}
