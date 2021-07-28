import { JWK, JWS } from 'node-jose'

class TokenGenerator {
  #key: JWK.Key

  async init(): Promise<void> {
    const keystore = JWK.createKeyStore()
    this.#key = await keystore.generate('RSA', 2048, {
      alg: 'RS256',
      use: 'sig',
    })
  }

  get jwk(): Record<string, unknown> {
    return this.#key.toJSON() as Record<string, unknown>
  }

  async createSignedJWT(payload: unknown): Promise<string> {
    const payloadJson = JSON.stringify(payload)
    const result = await JWS.createSign(
      { compact: true, fields: { typ: 'jwt' } },
      this.#key,
    )
      .update(payloadJson)
      .final()
    return result as unknown as string
  }
}

export default TokenGenerator
