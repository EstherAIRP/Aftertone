import { afterEach, describe, expect, it } from 'vitest'
import { getSession, setSessionCookie } from './_auth.js'

const previous = {
  APP_ORIGIN: process.env.APP_ORIGIN,
  SESSION_SECRET: process.env.SESSION_SECRET,
  ALLOWED_GITHUB_LOGIN: process.env.ALLOWED_GITHUB_LOGIN,
  ALLOWED_GITHUB_ID: process.env.ALLOWED_GITHUB_ID,
}

afterEach(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('private session', () => {
  it('accepts only a signed session for the allowed account', () => {
    process.env.APP_ORIGIN = 'https://aftertone.example'
    process.env.SESSION_SECRET = 'a-long-random-secret-for-this-test-only'
    process.env.ALLOWED_GITHUB_LOGIN = 'owner'
    process.env.ALLOWED_GITHUB_ID = '42'
    const headers = {}
    setSessionCookie({ setHeader: (key, value) => (headers[key] = value) }, { login: 'Owner', id: 42 })
    const cookie = headers['Set-Cookie'].split(';')[0]
    expect(getSession({ headers: { cookie } })?.login).toBe('Owner')
    expect(getSession({ headers: { cookie: cookie.replace(/.$/, 'x') } })).toBeNull()
    process.env.ALLOWED_GITHUB_LOGIN = 'another-user'
    expect(getSession({ headers: { cookie } })).toBeNull()
    process.env.ALLOWED_GITHUB_LOGIN = 'owner'
    process.env.ALLOWED_GITHUB_ID = '43'
    expect(getSession({ headers: { cookie } })).toBeNull()
  })
})
