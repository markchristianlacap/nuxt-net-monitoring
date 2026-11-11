import packageJson from '../../package.json' with { type: 'json' }

const RELEASE_API_URL = 'https://api.github.com/repos/markchristianlacap/nuxt-net-monitoring/releases/latest'
const RELEASES_URL = 'https://github.com/markchristianlacap/nuxt-net-monitoring/releases'
const CACHE_TTL_MS = 60 * 60 * 1000
const ERROR_CACHE_TTL_MS = 2 * 60 * 1000
const MIN_MANUAL_REFRESH_INTERVAL_MS = 60 * 1000

type UpdateStatusName = 'update-available' | 'up-to-date' | 'no-releases' | 'unavailable'

export interface SoftwareUpdateStatus {
  currentVersion: string
  latestVersion: string | null
  releaseUrl: string | null
  checkedAt: string
  status: UpdateStatusName
  message: string | null
}

interface ParsedVersion {
  major: bigint
  minor: bigint
  patch: bigint
  prerelease: string[] | null
}

interface GitHubRelease {
  tag_name?: unknown
}

const versionPattern = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

let cachedStatus: SoftwareUpdateStatus | null = null
let cacheExpiresAt = 0
let lastRequestAt = 0
let inFlightCheck: Promise<SoftwareUpdateStatus> | null = null

function parseVersion(version: string): ParsedVersion | null {
  const match = versionPattern.exec(version)
  if (!match)
    return null

  const [, major, minor, patch, prereleaseValue] = match
  if (!major || !minor || !patch)
    return null

  const prerelease = prereleaseValue?.split('.') ?? null
  if (prerelease?.some(identifier => /^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0')))
    return null

  return {
    major: BigInt(major),
    minor: BigInt(minor),
    patch: BigInt(patch),
    prerelease,
  }
}

function comparePrerelease(left: string[] | null, right: string[] | null): number {
  if (!left && !right)
    return 0
  if (!left)
    return 1
  if (!right)
    return -1

  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index++) {
    const leftIdentifier = left[index]
    const rightIdentifier = right[index]

    if (leftIdentifier === undefined)
      return -1
    if (rightIdentifier === undefined)
      return 1
    if (leftIdentifier === rightIdentifier)
      continue

    const leftIsNumeric = /^\d+$/.test(leftIdentifier)
    const rightIsNumeric = /^\d+$/.test(rightIdentifier)
    if (leftIsNumeric && rightIsNumeric) {
      const leftNumber = BigInt(leftIdentifier)
      const rightNumber = BigInt(rightIdentifier)
      if (leftNumber < rightNumber)
        return -1
      return 1
    }
    if (leftIsNumeric !== rightIsNumeric) {
      if (leftIsNumeric)
        return -1
      return 1
    }
    if (leftIdentifier < rightIdentifier)
      return -1
    return 1
  }

  return 0
}

function compareVersions(leftVersion: string, rightVersion: string): number | null {
  const left = parseVersion(leftVersion)
  const right = parseVersion(rightVersion)
  if (!left || !right)
    return null

  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) {
      if (left[key] < right[key])
        return -1
      return 1
    }
  }

  return comparePrerelease(left.prerelease, right.prerelease)
}

function makeStatus(
  status: UpdateStatusName,
  options: Pick<SoftwareUpdateStatus, 'latestVersion' | 'releaseUrl' | 'message'> = {
    latestVersion: null,
    releaseUrl: null,
    message: null,
  },
): SoftwareUpdateStatus {
  return {
    currentVersion: packageJson.version,
    checkedAt: new Date().toISOString(),
    status,
    ...options,
  }
}

async function fetchSoftwareUpdateStatus(): Promise<SoftwareUpdateStatus> {
  try {
    const response = await fetch(RELEASE_API_URL, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'nuxt-net-monitoring',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (response.status === 404) {
      return makeStatus('no-releases', {
        latestVersion: null,
        releaseUrl: RELEASES_URL,
        message: 'No GitHub releases have been published yet.',
      })
    }

    if (!response.ok)
      throw new TypeError(`GitHub returned ${response.status}`)

    const release = await response.json() as GitHubRelease
    if (typeof release.tag_name !== 'string')
      throw new TypeError('GitHub release is missing a version tag')

    const versionComparison = compareVersions(release.tag_name, packageJson.version)
    if (versionComparison === null)
      throw new TypeError('GitHub release tag is not a valid semantic version')

    const status = versionComparison > 0
      ? 'update-available'
      : 'up-to-date'

    return makeStatus(status, {
      latestVersion: release.tag_name,
      releaseUrl: `${RELEASES_URL}/tag/${encodeURIComponent(release.tag_name)}`,
      message: null,
    })
  }
  catch {
    return makeStatus('unavailable', {
      latestVersion: null,
      releaseUrl: null,
      message: 'Could not check GitHub for updates. Check your connection and try again.',
    })
  }
}

export async function getSoftwareUpdateStatus(forceRefresh = false): Promise<SoftwareUpdateStatus> {
  const now = Date.now()
  if (inFlightCheck)
    return inFlightCheck

  if (cachedStatus && now < cacheExpiresAt && (!forceRefresh || now - lastRequestAt < MIN_MANUAL_REFRESH_INTERVAL_MS))
    return cachedStatus

  lastRequestAt = now
  inFlightCheck = fetchSoftwareUpdateStatus()
    .then((status) => {
      cachedStatus = status
      const cacheTtl = status.status === 'unavailable'
        ? ERROR_CACHE_TTL_MS
        : CACHE_TTL_MS
      cacheExpiresAt = Date.now() + cacheTtl
      return status
    })
    .finally(() => {
      inFlightCheck = null
    })

  return inFlightCheck
}
