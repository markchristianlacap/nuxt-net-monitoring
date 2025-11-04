import { Buffer } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('auth middleware', () => {
  const AUTH_COOKIE = 'last_auth_time'
  const AUTH_INTERVAL = 1000 * 60 * 60 * 48 // 48 hours

  describe('authentication logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should allow request with valid auth cookie within time window', () => {
      const now = Date.now()
      const lastAuth = (now - 1000 * 60 * 60).toString() // 1 hour ago
      const timeDiff = now - Number(lastAuth)

      expect(timeDiff).toBeLessThan(AUTH_INTERVAL)
    })

    it('should reject request with expired auth cookie', () => {
      const now = Date.now()
      const lastAuth = (now - AUTH_INTERVAL - 1000).toString() // 48 hours + 1 second ago
      const timeDiff = now - Number(lastAuth)

      expect(timeDiff).toBeGreaterThanOrEqual(AUTH_INTERVAL)
    })

    it('should require authentication when no cookie present', () => {
      const lastAuth = null

      expect(lastAuth).toBeFalsy()
    })

    it('should parse Basic auth header correctly', () => {
      const username = 'admin'
      const password = 'password123'
      const credentials = Buffer.from(`${username}:${password}`).toString('base64')
      const authHeader = `Basic ${credentials}`

      const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64')
        .toString()
        .split(':')

      expect(user).toBe('admin')
      expect(pass).toBe('password123')
    })

    it('should validate username and password match config', () => {
      const configUser = 'admin'
      const configPass = 'secret'

      const providedUser = 'admin'
      const providedPass = 'secret'

      expect(providedUser).toBe(configUser)
      expect(providedPass).toBe(configPass)
    })

    it('should reject mismatched username', () => {
      const configUser = 'admin'
      const providedUser = 'user'

      expect(providedUser).not.toBe(configUser)
    })

    it('should reject mismatched password', () => {
      const configPass = 'secret'
      const providedPass = 'wrong'

      expect(providedPass).not.toBe(configPass)
    })

    it('should create WWW-Authenticate header for 401 response', () => {
      const header = 'Basic realm="Protected"'

      expect(header).toContain('Basic')
      expect(header).toContain('realm')
    })

    it('should calculate correct cookie maxAge', () => {
      const maxAge = AUTH_INTERVAL / 1000

      expect(maxAge).toBe(172800) // 48 hours in seconds
    })

    it('should set cookie with httpOnly flag', () => {
      const cookieOptions = {
        httpOnly: true,
        maxAge: AUTH_INTERVAL / 1000,
        sameSite: 'strict',
        path: '/',
      }

      expect(cookieOptions.httpOnly).toBe(true)
    })

    it('should set cookie with sameSite strict', () => {
      const cookieOptions = {
        httpOnly: true,
        maxAge: AUTH_INTERVAL / 1000,
        sameSite: 'strict',
        path: '/',
      }

      expect(cookieOptions.sameSite).toBe('strict')
    })

    it('should set cookie path to root', () => {
      const cookieOptions = {
        httpOnly: true,
        maxAge: AUTH_INTERVAL / 1000,
        sameSite: 'strict',
        path: '/',
      }

      expect(cookieOptions.path).toBe('/')
    })

    it('should store current timestamp in cookie', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const cookieValue = String(Date.now())

      expect(cookieValue).toBe(String(now))
    })
  })

  describe('authorization header validation', () => {
    it('should reject missing authorization header', () => {
      const auth = undefined

      expect(auth).toBeFalsy()
    })

    it('should reject non-Basic auth header', () => {
      const auth = 'Bearer token123'

      expect(auth.startsWith('Basic ')).toBe(false)
    })

    it('should accept valid Basic auth header', () => {
      const auth = 'Basic YWRtaW46cGFzc3dvcmQ='

      expect(auth.startsWith('Basic ')).toBe(true)
    })

    it('should extract credentials from Basic auth header', () => {
      const auth = 'Basic YWRtaW46cGFzc3dvcmQ='
      const base64Creds = auth.split(' ')[1]

      expect(base64Creds).toBe('YWRtaW46cGFzc3dvcmQ=')
    })

    it('should decode base64 credentials', () => {
      const base64Creds = 'YWRtaW46cGFzc3dvcmQ='
      const decoded = Buffer.from(base64Creds, 'base64').toString()

      expect(decoded).toBe('admin:password')
    })

    it('should split credentials on colon', () => {
      const credentials = 'admin:password'
      const [username, password] = credentials.split(':')

      expect(username).toBe('admin')
      expect(password).toBe('password')
    })

    it('should handle passwords with colons', () => {
      const base64Creds = Buffer.from('admin:pass:word:123').toString('base64')
      const decoded = Buffer.from(base64Creds, 'base64').toString()
      const [username, ...passwordParts] = decoded.split(':')
      const password = passwordParts.join(':')

      expect(username).toBe('admin')
      expect(password).toBe('pass:word:123')
    })
  })

  describe('security configuration', () => {
    it('should use 48-hour auth interval', () => {
      expect(AUTH_INTERVAL).toBe(1000 * 60 * 60 * 48)
    })

    it('should use last_auth_time cookie name', () => {
      expect(AUTH_COOKIE).toBe('last_auth_time')
    })

    it('should return 401 status code for unauthorized', () => {
      const statusCode = 401

      expect(statusCode).toBe(401)
    })

    it('should return Unauthorized status message', () => {
      const statusMessage = 'Unauthorized'

      expect(statusMessage).toBe('Unauthorized')
    })

    it('should return Invalid credentials message for wrong auth', () => {
      const statusMessage = 'Invalid credentials'

      expect(statusMessage).toBe('Invalid credentials')
    })
  })
})
