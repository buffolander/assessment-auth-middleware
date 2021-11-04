import axios from 'axios'
import { Algorithm } from 'jsonwebtoken'
import nock from 'nock'
import { createRequest, createResponse } from 'node-mocks-http'

import Authorizer from './index'
import TokenGenerator from './__tests__/TokenGenerator'

axios.defaults.adapter = require('axios/lib/adapters/http')

const currentTime = Math.round(Date.now() / 1000)
const options = {
  issuer: 'http://issuer.com',
  audience: 'audience',
  algorithms: ['RS256' as Algorithm],
}
const claims = {
  sub: 'foo',
  iss: options.issuer,
  aud: options.audience,
  exp: currentTime + 10,
}

const tokenGenerator = new TokenGenerator()
const auth = new Authorizer(`${options.issuer}/.well-known/jwks.json`)

beforeAll(async () => {
  await tokenGenerator.init()
  nock(options.issuer)
    .persist()
    .get('/.well-known/jwks.json')
    .reply(200, { keys: [tokenGenerator.jwk] })
  await auth.init()
})

describe('A request with a valid access token', () => {
  test('should add a user object containing the token claims to the request', async () => {
    const token = await tokenGenerator.createSignedJWT(claims)
    const res = createResponse()
    const req = createRequest({
      headers: {
        authorization: `${token}`,
      },
    })
    const next = jest.fn()

    await auth.verifyToken(options)(req, res, next)
    expect(req).toHaveProperty('user', claims)
  })
})

describe('A request without an access token', () => {
  test('should return status code 401', async () => {
    const res = createResponse()
    const req = createRequest()
    const next = jest.fn()

    await auth.verifyToken(options)(req, res, next)
    expect(res).toHaveProperty('statusCode', 401)
  })
})

describe('A request without an expired access token', () => {
  test('should return status code 401', async () => {
    const token = await tokenGenerator.createSignedJWT({
      ...claims,
      exp: currentTime - 10,
    })
    const res = createResponse()
    const req = createRequest({
      headers: {
        authorization: `${token}`,
      },
    })
    const next = jest.fn()

    await auth.verifyToken(options)(req, res, next)
    expect(res).toHaveProperty('statusCode', 401)
  })
})

describe('A request without a tampered access token', () => {
  test('should return status code 401', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const res = createResponse()
    const req = createRequest({
      headers: {
        authorization: `${token}`,
      },
    })
    const next = jest.fn()

    await auth.verifyToken(options)(req, res, next)
    expect(res).toHaveProperty('statusCode', 401)
  })
})
