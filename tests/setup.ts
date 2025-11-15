import { webcrypto } from "node:crypto"

if (!process.env.NODE_ENV) {
  Reflect.set(process.env, "NODE_ENV", "test")
}
process.env.TZ = "UTC"

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto
}

Error.stackTraceLimit = 50
