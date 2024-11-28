
import { exportJWK, type JWK, type KeyLike, generateKeyPair } from "jose";
import { Resolver } from "did-resolver";
import { validate as validateEbsiDid } from "@cef-ebsi/ebsi-did-resolver";
import { util as keyDidMethodHelpers } from "@cef-ebsi/key-did-resolver";
import { CheckResult } from "src/shared/interfaces.js";
import axios, { AxiosResponse } from "axios";
import { z } from "zod";

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



export async function getBankJwkFromSenderDID(bankDID:string):Promise<CheckResult|JWK> {

  type Bank = {

    bankName: string;
    bankDID: string;
    bankUrl: string;
 
 }

   const banks = await getBanks() as Bank[];
   const banksf = banks.filter((bank=> bank.bankDID == bankDID))
   if (!banksf || !banksf[0]) {
    return {success:false,errors:[`bank not found`]}
   }
   const bankurl = banksf[0].bankUrl;
   return await getBankJwk(bankurl);

}


export async function getBankJwk(bankUrl:string):Promise<CheckResult|JWK> {

    const jwks_uri=`${bankUrl}/jwks`.replace('tnt','auth')

    console.log('sender bank jwks url->'+jwks_uri);
    let clientJwksRequest: AxiosResponse;
    try {
      clientJwksRequest = await axios.get<unknown>(jwks_uri);
    } catch (e) {
      return {success:false,errors:[`Can't get bank's JWKS ${e}`]}
     
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
       
        return {success:false,errors:[`invalid bank jwks: ${errorDesc}`]}
        
    }
  
    const jwks = clientJwks.data;
    if (!jwks.keys || !jwks.keys[0]) {
      return {success:false,errors:[`jwks key not found`]}
    }
    console.log('bank-keys->'+JSON.stringify(jwks));
    try {
     const jwk = jwks.keys[0] as JWK
     return jwk
    } catch (e) {
      return {success:false,errors:[`jwk conversion error`]}
    }
 

}

export async function getBanks() {

  
  let response: AxiosResponse;
  try {
    const cbcUrl = process.env['CBC_URL'];
    response = await axios.get<unknown>(`${cbcUrl}/banks`);
  } catch (e) {
    console.log(`Can't get banks ${e}`);
    return []
  }


  return response.data

}

