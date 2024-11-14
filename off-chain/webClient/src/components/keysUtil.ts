import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { exportJWK, type JWK, type KeyLike, generateKeyPair } from "jose";
import elliptic from "elliptic";
import { base64url } from "multiformats/bases/base64";
import { Resolver } from "did-resolver";
import { validate as validateEbsiDid } from "@cef-ebsi/ebsi-did-resolver";
import { util as keyDidMethodHelpers } from "@cef-ebsi/key-did-resolver";
import axios, { AxiosResponse } from "axios";
import { z } from "zod";

const EC = elliptic.ec;

export interface KeyPairJwk {
    id: string;
    kid: string;
    privateKeyJwk: JWK;
    publicKeyJwk: JWK;
    publicKeyEncryptionJwk: JWK;
    privateKeyEncryptionJwk: JWK;
  }

export function prefixWith0x(key: string): string {
    return key.startsWith("0x") ? key : `0x${key}`;
  }
  
  export function removePrefix0x(key: string): string {
    return key.startsWith("0x") ? key.slice(2) : key;
  }

  export function getKeysPairJwk_ES256K(privateKeyHex: string) {

    const ethWallet = new ethers.Wallet(prefixWith0x(privateKeyHex));

    const publicKeyJWK_ES256K = new EbsiWallet(ethWallet.privateKey).getPublicKey({
      format: "jwk",
    }) as JWK;
    const d = Buffer.from(removePrefix0x(privateKeyHex), "hex")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return {privateKeyJWK_ES256K: { ...publicKeyJWK_ES256K, d}, publicKeyJWK_ES256K };
  }

  export function getKeysPairJwk_ES256(privateKeyHex: string) {
    const ec = new EC("p256");
    const privateKey = removePrefix0x(privateKeyHex);
    const keyPair = ec.keyFromPrivate(privateKey, "hex");
    const validation = keyPair.validate();
    if (validation.result === false) {
      throw new Error(validation.reason);
    }
    const pubPoint = keyPair.getPublic();
    const publicKeyJWK_ES256 = 
     {
      kty: "EC",
      crv: "P-256",
      x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
      y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
    //  d: base64url.baseEncode(Buffer.from(privateKey, "hex")),
    };
    const d = base64url.baseEncode(Buffer.from(privateKey, "hex"));
    const privateKeyJWK_ES256 = {...publicKeyJWK_ES256, d}
    return {privateKeyJWK_ES256, publicKeyJWK_ES256}
  }

  //encryption keys for ES256K are the same

  export async function getKeysPairJwk_ES256_Encryption() {

    let keys: {
        publicKey: KeyLike 
        privateKey: KeyLike 
      };

    keys = await generateKeyPair('ES256',{extractable:true});

    const publicKeyJWK_ES256_Encryption= await exportJWK(keys.publicKey);
    const privateKeyJWK_ES256_Encryption= await exportJWK(keys.privateKey);

    return {
        publicKeyJWK_ES256_Encryption,
        privateKeyJWK_ES256_Encryption
    }
 }

 export function getDID_ES256(publicKeyJWK_ES256: JWK) {

  return EbsiWallet.createDid("NATURAL_PERSON",publicKeyJWK_ES256);

 }

 export function getDID_ES256K(publicKeyJWK_ES256K: JWK) {

    return EbsiWallet.createDid("NATURAL_PERSON",publicKeyJWK_ES256K);
  
   }

   export async function getPublicKeyJWK_fromDID(

    did: string, //did:key or did:ebsi. did:ebsi is not used as we don't know the kid in DIDdodument
    didKeyResolver: Resolver, 
    didEbsiResolver: Resolver
   ): Promise<JWK | null> {

    let resolver: Resolver;  
    let kid: string;
  

    try {
        if (did.startsWith("did:ebsi:")) {
          const version = validateEbsiDid(did);
          if (version !== 1) {
            throw new Error(`EBSI DID version ${version} is not supported`);
          }
          resolver = didEbsiResolver;
        } else if (did.startsWith("did:key:")) {
          keyDidMethodHelpers.validateDid(did);
          resolver = didKeyResolver;
          kid = `${did}#${did.split(":")[2]}`;
        } else {
          throw new Error("the DID is not a valid EBSI DID v1 or Key DID");
        }
      } catch (err) {
        throw new Error(`resolver error ${err}`);
      }

      const didDoc = await resolver.resolve(did, { timeout:10000 });
 
    // The kid must be a valid EBSI DID v1 or v2
    if (didDoc.didResolutionMetadata.error === "invalidDid") {
        throw new Error(
        "invalid ID Token: kid doesn't refer to a valid DID"
      );
    }

   
      const { didDocument } = didDoc;
      // DID document must be registered
      if (!didDocument) {
        throw new Error(
          `invalid ID Token: DID ${did} not found in the DID Registry`
        );
      }

      // Verify ID Token signature: signed by DID document's authentication key
      const verificationMethods = (didDocument.authentication ?? [])
        .map((authMethod) => {
          if (typeof authMethod !== "string") {
            return authMethod;
          }

          // Find verification method corresponding to authMethod
          return didDocument.verificationMethod?.find(
            (method) => method.id === authMethod
          );
        })
        // Remove undefined
        .filter(Boolean);

    //   const matchingVerificationMethod = verificationMethods.find(
    //     (method) => method && method.id === kid
    //   );

    //   if (!matchingVerificationMethod) {
    //     throw new Error(
    //       `invalid ID Token: no authentication method matching ${kid} found in the DID document`
    //     );
    //   }

    //   if (!matchingVerificationMethod.publicKeyJwk) {
    //     throw new Error(
    //       `invalid ID Token: the authentication method matching ${kid} doesn't have a publicKeyJwk`
    //     );
    //   }

     // const { publicKeyJwk } = matchingVerificationMethod;

    
     if (did.startsWith("did:key:")) {
     
     if (verificationMethods && verificationMethods[0] && verificationMethods[0].publicKeyJwk) 
        return verificationMethods[0].publicKeyJwk ;
     }

     if (did.startsWith("did:ebsi:")) {
     
        if (verificationMethods && verificationMethods[2] && verificationMethods[2].publicKeyJwk) 
           return verificationMethods[2].publicKeyJwk ;
        }
    
      return null;

   
}

export const jwkSchema = z
  .object({
    // Only validate that `kty` is present
    kty: z.string(),
    kid: z.optional(z.string()),
    crv: z.optional(z.string()),
  })
  .passthrough(); // Allow extra properties

export const jwksSchema = z.object({
    keys: z.array(jwkSchema).nonempty(),
  });
  
  export type JWKS = z.infer<typeof jwksSchema>;

export async function getBankJwk(jwks_uri:string) {

  
    let clientJwksRequest: AxiosResponse;
    try {
      clientJwksRequest = await axios.get<unknown>(jwks_uri);
    } catch (e) {
      throw new Error(`Can't get bank's JWKS ${e}`);
    }
  
    // Validate JWKS
    const clientJwks = jwksSchema.safeParse(clientJwksRequest.data);
  
    if (!clientJwks.success) {
      const errorDesc = clientJwks.error.issues
        .map(
          (issue) =>
            `[${issue.code}] in '${issue.path.join(".")}': ${issue.message}`
        )
        .join("\n");
  
        throw new Error(`invalid bank jwks: ${errorDesc}`);
    }
  
    const jwks = clientJwks.data;
    return jwks.keys[0] as JWK;

}

