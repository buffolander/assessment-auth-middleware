import axios from 'axios'
import * as express from 'express'
import jwt, { Algorithm, JwtPayload } from 'jsonwebtoken'
import { JSONWebKey } from 'jwks-rsa'
import jwkToPem from 'jwk-to-pem'

declare module 'express' {
  interface Request {
    user?: JwtPayload
  }
}

export interface Options {
  issuer: string
  audience: string
  algorithms: Algorithm[]
}

class Authorizer {
  private jwksURL: string
  private jwks: [JSONWebKey]
  private publicKeys: { [key: string]: string }

  constructor(jwksURL: string) {
    this.jwksURL = jwksURL
  }

  init = async (): Promise<void> => {
    try {
      const response = await axios.get(this.jwksURL)
      this.jwks = response.data.keys
      this.publicKeys = this.jwks.reduce(
        (acc, jwk) => ({
          ...acc,
          [jwk.kid]: jwkToPem(jwk),
        }),
        {},
      )
    } catch (err) {
      console.error(err)
    }
  }

  verifyToken =
    (options: Options) =>
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ): Promise<void | express.Response> => {
      const token = req.headers.authorization?.replace('Bearer ', '')
      const decoded = jwt.decode(token, { complete: true, json: true })
      const kid = decoded?.header?.kid
      const publicKey = this.publicKeys[kid]
      try {
        const tokenClaims = jwt.verify(token, publicKey, {
          algorithms: options.algorithms,
          audience: options.audience,
          issuer: options.issuer,
        })
        req.user = tokenClaims as JwtPayload
        next()
      } catch (err) {
        console.error(JSON.stringify(err))
        res.sendStatus(401)
      }
    }
}

export default Authorizer
