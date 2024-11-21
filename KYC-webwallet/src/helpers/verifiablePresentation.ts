import { randomUUID } from "crypto";
import {v4 as uuidv4} from 'uuid';
import {
  EbsiIssuer,
  EbsiVerifiablePresentation,
  createVerifiablePresentationJwt,
  
} from "@cef-ebsi/verifiable-presentation";

import { Alg } from "./tntUtil";

export interface JWK {
  /** JWK "alg" (Algorithm) Parameter. */
  alg?: string
  crv?: string
  d?: string
  dp?: string
  dq?: string
  e?: string
  /** JWK "ext" (Extractable) Parameter. */
  ext?: boolean
  k?: string
  /** JWK "key_ops" (Key Operations) Parameter. */
  key_ops?: string[]
  /** JWK "kid" (Key ID) Parameter. */
  kid?: string
  /** JWK "kty" (Key Type) Parameter. */
  kty?: string
  n?: string
  oth?: Array<{
    d?: string
    r?: string
    t?: string
  }>
  p?: string
  q?: string
  qi?: string
  /** JWK "use" (Public Key Use) Parameter. */
  use?: string
  x?: string
  y?: string
  /** JWK "x5c" (X.509 Certificate Chain) Parameter. */
  x5c?: string[]
  /** JWK "x5t" (X.509 Certificate SHA-1 Thumbprint) Parameter. */
  x5t?: string
  /** "x5t#S256" (X.509 Certificate SHA-256 Thumbprint) Parameter. */
  'x5t#S256'?: string
  /** JWK "x5u" (X.509 URL) Parameter. */
  x5u?: string

  [propName: string]: unknown
}

export async function createVPJwt(
  did: string,
  kid:string,
  keys: {
    publicKeyJwk: JWK;
    privateKeyJwk: JWK;
  },
  alg: Alg,
  vc: string | string[],
  audience: string,
  domain:string,
): Promise<{ jwtVp: string; payload: { [x: string]: unknown } }> {
  //const keys = client.keys[alg];
 // const keys = await getIssuerKeyPair("ES256"); 
  if (!keys) throw new Error(`No keys defined for alg ${alg}`);

  const issuer: EbsiIssuer = {
    did: did,
    kid: kid,
    privateKeyJwk: keys.privateKeyJwk,
    publicKeyJwk: keys.publicKeyJwk,
    alg: alg as "ES256K",
  };

  let verifiableCredential: string[];
  if (vc === "empty") {
    verifiableCredential = [];
  } else if (Array.isArray(vc)) {
    verifiableCredential = vc;
  } else {
    verifiableCredential = [vc];
  }

  const payload = {
    id: `urn:did:${uuidv4()}`, //uuidv4(), //`urn:did:randomUUID`, //`urn:did:${randomUUID()}`,
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    holder: did,
    verifiableCredential,
  } as EbsiVerifiablePresentation;

  const jwtVp = await createVerifiablePresentationJwt(
    payload,
    issuer,
    audience,
    {
      skipValidation: true,
      ebsiAuthority: domain
        .replace("http://", "")
        .replace("https://", ""),
      nonce:  uuidv4(),//'nonce', //randomUUID(),
      nbf: Math.floor(Date.now() / 1000) - 60, // 1 minute in the past
      exp: Math.floor(Date.now() / 1000) + 120, // 2 minutes in the future
    },
  );
  return { jwtVp, payload };
}

export default createVPJwt;
