import axios, { AxiosResponse } from "axios";
import { ethers } from "ethers";
//import { randomUUID } from "crypto";
import {v4 as uuidv4} from 'uuid';
import createVPJwt  from "./verifiablePresentation";
import { walletprivateKeyHex } from "./app";
import { getDID_ES256, getDID_ES256K, getKeysPairJwk_ES256, getKeysPairJwk_ES256K } from "./keysUtil";
import elliptic from "elliptic";
import { base64url } from "multiformats/bases/base64";
import { DIDDocument, Resolver, JsonWebKey as JWK,VerificationMethod } from "did-resolver";
import { getResolver ,util, } from "@cef-ebsi/key-did-resolver";
import { createHash } from "crypto";

const authorisationApiUrl = "https://api-pilot.ebsi.eu/authorisation/v4"
const ledgerApiUrl= "https://api-pilot.ebsi.eu/ledger/v4/blockchains/besu"
const ebsiAuthority = "https://api-pilot.ebsi.eu"

const EC = elliptic.ec;

export interface UnsignedTransaction {
    from: string;
    to: string;
    data: string;
    nonce: string;
    chainId: string;
    gasLimit: string;
    gasPrice: string;
    value: string;
  }


  export interface BesuTransactionReceipt {
    status: string;
    revertReason: string;
  }

  export type CheckResult =
  | {
      success: true;
    }
  | {
      success: false;
      errors: string[];
    };

  export type Alg = "ES256K" | "ES256" | "RS256" | "EdDSA";

  export interface UnknownObject {
    [x: string]: unknown;
  }
  

  export type EventMetaData = {
    eventType:string,
    docsVerifedEventId?: string
  }

  export async function addeventTnT(
    hush: string, 
    eventMetadataObj:  EventMetaData,
    externalHash:string
    ) {

    
    if (eventMetadataObj.eventType == 'personal_data_shared' && eventMetadataObj.docsVerifedEventId ) {
      return {
        success:false,
        errors: ['docsVerifedEventId must be provided']
      }

    }

    const authToken = await authorisationAuth('tnt_write', "empty", "ES256K");
    console.log('auhtToken->'+authToken);
    if (authToken) {
    if (typeof authToken !== 'string') {
     return {
       success:false,
       errors: ['error from authorization API '+authToken.error]
     }
    }
    } else {
      console.log('error');
      return;
    }
 
   
   const wallet = new ethers.Wallet(walletprivateKeyHex);
 
    
  const eventMetadata = JSON.stringify(eventMetadataObj)
 
    //console.log('documentMeta->'+documentMetadata);
    const keys =  getKeysPairJwk_ES256K(walletprivateKeyHex);
        const es256k_did =  getDID_ES256K(keys.publicKeyJWK_ES256K);
        console.log('es256kdid->'+es256k_did);
        const es256k_kid = `${es256k_did}#${es256k_did.split(':')[2]}`
 
    const documentId = '0xd36981def879f834658e89d0ba02fe4cd2bb9d0f9a1181214b7e7995a557c2b5'
    const params = [{
      from: wallet.address,
      eventParams: {
      documentHash:hush,
      externalHash,
      sender: await didToHex(es256k_did),
     // sender: getPublicKeyHex(keys.publicKeyJWK_ES256K as JWK),//`0x${Buffer.from(es256k_did).toString("hex")}`,
      origin:"my origin",
      metadata:eventMetadata
      }
      
    }]
 
     return await jsonrpcCall("writeEvent",params,authToken);

  }

  async function Hex(msgUint8: Uint8Array) {

    var hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    var hashArray = Array.from(new Uint8Array(hashBuffer))
  
    // convert bytes to hex string
    var hash=hashArray.map(function(b) {
      return b.toString(16).padStart(2, '0')
    }).join('');
    return `0x${hash}`
  }

  export async function Hash( data: Blob|string) {
  
    if (data instanceof Blob) {
      var arrayBuffer = await data.arrayBuffer()
      var msgUint8 = new Uint8Array(arrayBuffer)
      
      return await Hex(msgUint8)
    }
    
    //string or stringify jason
    var encoder = new TextEncoder()
    var msgUint8 = encoder.encode(data)
    
    return await Hex( msgUint8)
  }

  // export function sha256(data: string|object) {

   
  //   if (typeof data === 'string') {
  //     //does not work
  //     let hash = createHash("sha256");
  //     if (data.startsWith("0x")) {
  //       hash = hash.update(removePrefix0x(data), "hex");
  //     } else {
  //       hash = hash.update(data, "utf8");
  //     }
  //     return hash.digest().toString("hex");

  //   } else {
  //     return sha256(JSON.stringify(data));
  //   }
  // }
  
export function getErrorMessage(err: unknown): string {
    if (!(err instanceof Error)) return "Unknown error";
  
    if (axios.isAxiosError(err)) {
      const data: unknown = err.response?.data;
  
      if (!data) return "Unknown error";
  
      if (typeof data === "string") return data;
  
      return JSON.stringify(data);
    }
  
    return err.message;
  }
  

export async function  authorisationAuth(scope: string, vc:string ,alg:string) {
   
    //const alg =  "ES256";
    const apiUrl = authorisationApiUrl;
  
 
    const response = await axios.get(
      `${apiUrl}/.well-known/openid-configuration`,
      
    );
  
    const openIdConfig = response.data as {issuer: string};

    const vpJwt = (await compute(
      "createPresentationJwt",
      [vc || "empty", alg, openIdConfig.issuer],
      
    )) as string;
  
    console.log('jwtvp->'+vpJwt);

    return authorisationToken(scope,vpJwt);
  }

async function authorisationToken(scope:string, vpJwt:string) {
  const apiUrl = authorisationApiUrl;
  
  const validScopes = ["tnt_create","tnt_write"];

  if (!validScopes.some(vscope => vscope==scope)) {
   return {
    error: 'invalid authorization scope'
   }
  }

  const httpOpts = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    
    },
  };

  const presentationSubmission = {
    id: uuidv4(), //'presentationID',
    definition_id: `${scope}_presentation`,
    descriptor_map: [],
  };

  try {
  const response = await axios.post(
    `${apiUrl}/token`,
    new URLSearchParams({
      grant_type: "vp_token",
      scope: `openid ${scope}`,
      vp_token: vpJwt,
      presentation_submission: JSON.stringify(presentationSubmission),
    }).toString(),
    httpOpts,
  );

  const accessToken = (
    response.data as {
      access_token: string;
    }
  ).access_token;
  return accessToken;
} catch (e) {
  console.log('post error->'+e);
}
}


export async function jsonrpcCall(method: string, params: unknown[], accessToken:string):Promise<CheckResult> {

  const wallet = new ethers.Wallet(walletprivateKeyHex);
  const jsonrpcUrl = 'https://api-pilot.ebsi.eu/track-and-trace/v1/jsonrpc'

  let responseBuild: AxiosResponse<{
    result: UnsignedTransaction;
  }>;

  try {
    responseBuild = await axios.post(
      jsonrpcUrl,
      {
        jsonrpc: "2.0",
        method,
        params,
        
       id: Math.ceil(Math.random() * 1000),
      },
      {
        headers: { authorization: `Bearer ${accessToken}` },
      }
    );
  } catch (error) {
 
    return {
      success: false,
      errors: [
        `Unable to build the transaction for ${method}: ${getErrorMessage(
          error
        )}`,
      ],
    };
  }
  let unsignedTransaction = responseBuild.data.result;

  let transactionResult = await signAndSendTransaction(
    unsignedTransaction,
    wallet,
    jsonrpcUrl,
    accessToken
  );

  if (!transactionResult.success) {
    return {
      success: false,
      errors: [
        `Unable to send the transaction for ${method}: ${getErrorMessage(
          transactionResult.error
        )}`,
      ],
    };
  }

  let { txId } = transactionResult;

  console.log('txId->'+txId);

  let miningResult = await waitToBeMined(
    ledgerApiUrl,
    txId
  );

  console.log('mining result->'+JSON.stringify(miningResult));


  if (!miningResult.success) {
    console.log('mining result->'+miningResult.error.message);
    return {
      success: false,
      errors: [miningResult.error.message],
    };
  }

  
  return { success: true };

}


export async function waitToBeMined(
    ledgerApiUrl: string,
 
    txId: string
  ): Promise<{ success: true } | { success: false; error: Error }> {
    try {
      let mined = false;
  
      /* eslint-disable no-await-in-loop */
      for (let i = 0; i < 40; i += 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, 500);
        });
  
        console.log('waiting to be mined...');
  
        const { data } = await axios.post<{
          result: BesuTransactionReceipt;
        }>(ledgerApiUrl, {
          jsonrpc: "2.0",
          method: "eth_getTransactionReceipt",
          params: [txId],
        });
  
        mined = !!data.result;
        if (mined) {
          console.log('mined');
          if (Number(data.result.status) !== 1) {
            
            const revertReason = data.result.revertReason
              ? Buffer.from(data.result.revertReason.slice(2), "hex")
                  .toString()
                  .replace(/[^a-zA-Z0-9:\-' ]/g, "")
              : "";
              console.log('status not 1->'+revertReason);
            return {
              success: false,
              error: new Error(
                `Transaction failed: Status ${data.result.status}. Revert reason: ${revertReason}`
              ),
            };
          }
          console.log('getting out of the loop');
          
          break;
        }
      }
  
      if (!mined) {
        return {
          success: false,
          error: new Error(`Timeout exceeded for transaction ID ${txId}`),
        };
      }
    } catch (error) {
    
      return {
        success: false,
        error: new Error(`Transaction not mined: ${getErrorMessage(error)}`),
      };
    }
  
    return { success: true };
  }
  
  /**
   * Helper function to sign and send a transaction.
   */
  export async function signAndSendTransaction(
    unsignedTransaction: UnsignedTransaction,
    wallet: ethers.Wallet,
    jsonrpcEndpoint: string,
   
    accessToken: string
  ): Promise<
    { success: true; txId: string } | { success: false; error: unknown }
  > {
    const sgnTx = await wallet.signTransaction({
      to: unsignedTransaction.to,
      data: unsignedTransaction.data,
      value: unsignedTransaction.value,
      nonce: Number(unsignedTransaction.nonce),
      chainId: Number(unsignedTransaction.chainId),
      gasLimit: unsignedTransaction.gasLimit,
      gasPrice: unsignedTransaction.gasPrice,
    });
   const { r, s, v } = ethers.utils.parseTransaction(sgnTx);
  
  
    let txId = "";
    try {
      const responseSend = await axios.post<{
        result: string;
      }>(
        jsonrpcEndpoint,
        {
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
          id: 1,
        },
        {
          headers: { authorization: `Bearer ${accessToken}` },
        }
      );
      txId = responseSend.data.result;
    } catch (error) {
     
      return { success: false, error };
    }
  
    return { success: true, txId };
  }

  export async function  compute(
    method: string,
    inputs: (UnknownObject |string)[],
    
  ): Promise<unknown> {
   // const { config, client } = context;
  
   
  
    switch (method) {
  
      case "createPresentationJwt": {
        const verifiableCredential = inputs[0] as string | string[];
        const alg = (inputs[1] as Alg) || "ES256K";
        const audience = inputs[2] as string;
        
        const keys =  getKeysPairJwk_ES256K(walletprivateKeyHex);
        const es256_did =  getDID_ES256K(keys.publicKeyJWK_ES256K);
        const es256_kid = `${es256_did}#${es256_did.split(':')[2]}`
       
        if (!verifiableCredential)
          throw new Error("Verifiable Credential not defined");
        const { jwtVp, payload } = await createVPJwt(
          es256_did,
          es256_kid,
          {
            publicKeyJwk: keys.publicKeyJWK_ES256K ,
            privateKeyJwk: keys.privateKeyJWK_ES256K
          },
          alg,
          verifiableCredential,
          audience,
          ebsiAuthority
        );
       
        return jwtVp;
      }
      default:
        
        return 0;
    }
  }

  export function getPublicKeyHex(jwk: JWK): string {
    if (jwk.x && jwk.y) {
    if (jwk.crv === "secp256k1") {
      const ec = new EC("secp256k1");
      const publicKey = ec.keyFromPublic({
        x: Buffer.from(base64url.baseDecode(jwk.x)).toString("hex"),
        y: Buffer.from(base64url.baseDecode(jwk.y)).toString("hex"),
      });
      return `0x${publicKey.getPublic().encode("hex", false)}`;
    }
    return `0x${Buffer.from(JSON.stringify(jwk)).toString("hex")}`;
  }
  return 'error'
  }
  export function removePrefix0x(key: string): string {
    if (key=='error')
      return 'error';
    return key.startsWith("0x") ? key.slice(2) : key;
  }

  export async function didToHex(did: string) {
    if (did.startsWith("did:key")) {
      const didResolver = new Resolver(getResolver());
      const result = await didResolver.resolve(did);
     // console.log('didresolver->'+JSON.stringify(result));

      const publicKeyJwk =
        result.didDocument?.verificationMethod ? result.didDocument.verificationMethod[0]?.publicKeyJwk : 
         'error';
  
      if (!publicKeyJwk || publicKeyJwk == 'error') {
        throw new Error(`DID ${did} can't be resolved`);
      }
  
      if (publicKeyJwk.crv !== "secp256k1") {
        throw new Error(
          `The DID ${did} must use secp256k1 curve. Received: ${publicKeyJwk.crv}`,
        );
      }
  
      const publicKeyHex = removePrefix0x(getPublicKeyHex(publicKeyJwk).slice(2));

      if (publicKeyHex == 'error') {
        throw new Error(
          `publicKeyHex error`,
        );
      }
  
  
      if (Buffer.from(publicKeyHex, "hex").byteLength === 65) {
        return `0x${publicKeyHex.slice(2)}`; // Remove first byte "04"
      }
  
      return `0x${publicKeyHex}`;
    }
    return `0x${Buffer.from(did).toString("hex")}`;
  }