
import { exportJWK, type JWK, type KeyLike, generateKeyPair } from "jose";
import { Resolver } from "did-resolver";
import { validate as validateEbsiDid } from "@cef-ebsi/ebsi-did-resolver";
import { util as keyDidMethodHelpers } from "@cef-ebsi/key-did-resolver";

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
