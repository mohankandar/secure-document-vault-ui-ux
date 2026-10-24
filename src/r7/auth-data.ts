// Mirrors the real SDV contract (GET /api/v1/admin/enterprise-identity → Overview).
// Field names match frontend/sdv-ui/src/r7/liveApi.ts at e81d49f so the design can be ported without reshaping data.
import { NOW } from './data'

export type TestStatus = 'PASSED' | 'FAILED' | null
export type IdentityConnection = {
  connectionId: string
  displayName: string
  providerId: string
  providerType: 'OIDC'
  issuerUri: string
  browserClientId: string
  apiAudience: string
  status: 'ACTIVE' | 'STAGED' | 'KNOWN_GOOD'
  configurationVersion: number
  updatedAt: string | null
  lastTestedAt: string | null
  lastTestStatus: TestStatus
  lastTestMessage: string | null
}
export type IdentityOverview = {
  active: IdentityConnection | null
  staged: IdentityConnection | null
  rollbackCandidates: IdentityConnection[]
  activationSupported: boolean
  activationMaxTestAgeSeconds: number
}

export type AuthScenario = 'untested' | 'passed' | 'failed' | 'stale' | 'noDraft' | 'noRollback' | 'long'
export type ServerResponse = 'accept' | 'versionMismatch' | 'permission'

export const AUTH_SCENARIOS: { value: AuthScenario; label: string; hint: string }[] = [
  { value: 'untested', label: 'Untested draft', hint: 'Draft saved, never tested' },
  { value: 'passed', label: 'Test passed', hint: 'Fresh passing test' },
  { value: 'failed', label: 'Test failed', hint: 'Discovery returned an error' },
  { value: 'stale', label: 'Test older than window', hint: 'Passed, but outside the server freshness window' },
  { value: 'noDraft', label: 'No staged draft', hint: 'Only the live binding exists' },
  { value: 'noRollback', label: 'No rollback target', hint: 'No known-good configuration recorded' },
  { value: 'long', label: 'Long values', hint: 'Long issuer, client and connection IDs' },
]
export const SERVER_RESPONSES: { value: ServerResponse; label: string }[] = [
  { value: 'accept', label: 'Accept' },
  { value: 'versionMismatch', label: 'Version mismatch' },
  { value: 'permission', label: 'Permission revoked' },
]

const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
/** Prototype clock: the fixed sample "now" advanced by real elapsed time, so ages grow naturally. */
export const simNow = () => NOW + Math.round(performance.now())
const daysAgo = (d: number) => minsAgo(d * 1440)

const ENTRA = 'https://login.microsoftonline.com/7f3c2a91-4d0e-4b6a-9c1e-2f8d5b7a3e10/v2.0'

const live: IdentityConnection = {
  connectionId: 'c4a1e2f0-6b3d-4f7a-9e21-08d4b5c6a7f1', displayName: 'Northwind Entra ID', providerId: 'customer-oidc', providerType: 'OIDC',
  issuerUri: ENTRA, browserClientId: 'sdv-web-7c21', apiAudience: 'api://sdv-northwind', status: 'ACTIVE', configurationVersion: 4,
  updatedAt: daysAgo(26), lastTestedAt: daysAgo(26), lastTestStatus: 'PASSED', lastTestMessage: null,
}
const draft: IdentityConnection = {
  ...live, connectionId: '9f2b7c11-0e5a-4d83-b6f4-3a1c9e8d2b55', status: 'STAGED', configurationVersion: 5, browserClientId: 'sdv-web-9d40',
  updatedAt: minsAgo(12), lastTestedAt: null, lastTestStatus: null, lastTestMessage: null,
}
const candidates: IdentityConnection[] = [
  { ...live, connectionId: '5e8d3a20-7c41-4b9f-a2e6-1f0b8c7d6e43', status: 'KNOWN_GOOD', configurationVersion: 3, browserClientId: 'sdv-web-55aa', updatedAt: daysAgo(140), lastTestedAt: daysAgo(140) },
  { ...live, connectionId: '1b6f9e74-2d08-4c5a-8e3b-7a9c0d1e2f36', status: 'KNOWN_GOOD', configurationVersion: 2, displayName: 'Northwind Okta', issuerUri: 'https://northwind.okta.com/oauth2/default', browserClientId: '0oa8sdv4k2LmNq7x5d7', apiAudience: 'api://sdv', updatedAt: daysAgo(390), lastTestedAt: daysAgo(390) },
]

export function authFixture(s: AuthScenario): IdentityOverview {
  const base: IdentityOverview = { active: live, staged: draft, rollbackCandidates: candidates, activationSupported: true, activationMaxTestAgeSeconds: 900 }
  switch (s) {
    case 'untested': return base
    case 'passed': return { ...base, staged: { ...draft, lastTestedAt: minsAgo(3), lastTestStatus: 'PASSED', lastTestMessage: 'OIDC discovery document matched the configured issuer.' } }
    case 'failed': return { ...base, staged: { ...draft, issuerUri: 'https://login.microsoftonline.com/7f3c2a91-4d0e-4b6a-9c1e-2f8d5b7a3e10/v2', lastTestedAt: minsAgo(2), lastTestStatus: 'FAILED', lastTestMessage: 'OIDC discovery returned HTTP 404.' } }
    case 'stale': return { ...base, staged: { ...draft, lastTestedAt: minsAgo(42), lastTestStatus: 'PASSED', lastTestMessage: 'OIDC discovery document matched the configured issuer.' } }
    case 'noDraft': return { ...base, staged: null }
    case 'noRollback': return { ...base, staged: null, rollbackCandidates: [] }
    case 'long': {
      const issuer = 'https://identity.eu-central.northwind-health-enterprise.example.com/tenants/northwind-health-plan-production/oauth2/v2.0'
      return {
        ...base,
        active: { ...live, issuerUri: issuer, browserClientId: 'sdv-browser-client-northwind-health-plan-production-eu-central-01', apiAudience: 'api://secure-document-vault/northwind-health-plan/production' },
        staged: { ...draft, displayName: 'Northwind Health Enterprise Identity (EU Central Production)', issuerUri: issuer, browserClientId: 'sdv-browser-client-northwind-health-plan-production-eu-central-02', apiAudience: 'api://secure-document-vault/northwind-health-plan/production' },
      }
    }
  }
}
