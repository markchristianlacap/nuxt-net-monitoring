import type { H3Event } from 'h3'
import { Buffer } from 'node:buffer'
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import process from 'node:process'
import { promisify } from 'node:util'
import { and, eq, gt, lt } from 'drizzle-orm'
import { deleteCookie, getCookie, setCookie } from 'h3'
import { db } from '../db'
import { adminSessions } from '../db/schema/admin-sessions'
import { adminUsers } from '../db/schema/admin-users'

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const PASSWORD_KEY_LENGTH = 64

export interface AuthenticatedAdmin {
  id: number
  username: string
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH) as Buffer
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltHex, keyHex] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !saltHex || !keyHex)
    return false

  const expected = Buffer.from(keyHex, 'hex')
  if (expected.length !== PASSWORD_KEY_LENGTH)
    return false

  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length) as Buffer
  return timingSafeEqual(actual, expected)
}

export function verifySecret(candidate: string, expected: string | undefined): boolean {
  if (!expected)
    return false
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)
  return candidateBuffer.length === expectedBuffer.length
    && timingSafeEqual(candidateBuffer, expectedBuffer)
}

export async function getAuthenticatedAdmin(event: H3Event): Promise<AuthenticatedAdmin | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token)
    return null

  const now = new Date()
  const [session] = await db.select({
    id: adminUsers.id,
    username: adminUsers.username,
    sessionId: adminSessions.id,
  })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(and(
      eq(adminSessions.tokenHash, hashSessionToken(token)),
      gt(adminSessions.expiresAt, now),
    ))
    .limit(1)

  return session
    ? { id: session.id, username: session.username }
    : null
}

export async function createAdminSession(event: H3Event, adminUserId: number) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()))
  await db.insert(adminSessions).values({
    tokenHash: hashSessionToken(token),
    adminUserId,
    expiresAt,
  })

  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function destroyAdminSession(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashSessionToken(token)))
  }
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function hasAdminAccount(): Promise<boolean> {
  const [admin] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1)
  return !!admin
}
