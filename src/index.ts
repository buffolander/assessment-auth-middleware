import { Jwt } from 'jsonwebtoken'
import * as express from 'express'

declare module 'express' {
  interface Request {
    user?: Jwt
  }
}

export interface Options {
  issuer: string
  audience: string
  algorithms: string
}

const authorize =
  (options: Options) =>
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): Promise<void | express.Response> => Promise.reject('Not implemented')

export default authorize
