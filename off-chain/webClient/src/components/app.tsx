import React, { useState } from "react"
import axios, { AxiosError } from 'axios'
import fs from 'fs'
import { cryptoKeyToHexString, decryptEncryptionKey, encryptEncryptionKey, generateEncKey, } from "./encryptPublic";
import { getBankJwk, getDID_ES256,getDID_ES256K, getKeysPairJwk_ES256, getKeysPairJwk_ES256K, getPublicKeyJWK_fromDID } from "./keysUtil";
// import { getResolver  } from "@cef-ebsi/ebsi-did-resolver";
import { Resolver } from "did-resolver";
import { getResolver as getEbsiDidResolver } from "@cef-ebsi/ebsi-did-resolver";
import { getResolver as getKeyDidResolver } from "@cef-ebsi/key-did-resolver";
import { addeventTnT, Hash, } from "./tntUtil";
import { ethers } from "ethers";



window.Buffer = window.Buffer || require('buffer').Buffer;


export const walletprivateKeyHex = "0x48bf9c1b9624f06795ae4f4111e4d3595ffe3205ea37869327e772bfbf78ca4e"

const privateKeyJwkBankP256= {
  kty: "EC",
  crv: "P-256",
  x: "hBP5baWo1f6TCVihXPBsHwD74VZP-0kLPedVGo4dbK8",
  y: "fbrt2t7p6_6vvPYqvQeCYeRcBGArh3up-28qIcwKSRo",
  d: "S0OhBEVrUe8jhzmKRvuRAGJVZpPV3ZhFYtBb0RRpFfA"
}


// const publicKeyEncryptionJwkIssuer= {
//   kty: "EC",
//   crv: "P-256",
//   x: "hBP5baWo1f6TCVihXPBsHwD74VZP-0kLPedVGo4dbK8",
//   y: "fbrt2t7p6_6vvPYqvQeCYeRcBGArh3up-28qIcwKSRo"
// } 

const resolverConfig = {
  registry: "https://api-pilot.ebsi.eu/did-registry/v5/identifiers",
};

const ebsiResolver = new Resolver(getEbsiDidResolver(resolverConfig));
const didkeyResolver = new Resolver(getKeyDidResolver());

export function removePrefix0x(key: string): string {
  if (key=='error')
    return 'error';
  return key.startsWith("0x") ? key.slice(2) : key;
}

export function fromHexString(hexString: string): Buffer {
  return Buffer.from(removePrefix0x(hexString), "hex");
}

export function toHexString(bytes: Uint8Array): string {
  return bytes.reduce(
    (str, byte) => str + byte.toString(16).padStart(2, "0"),
    "",
  );
}


  //ES256 wallet encryption keys. different from ES256 wallet keys. do not depend on privateHex or did
  //works
  // const privateKeykWallet= {
  //   kty: "EC",
    
  //   x: "LIKXSdged6d-HDdWZq6HqG4VxbstVN1Gl0frhqxJJms",
  //   y: "xHJ7RVZ-TlYDq9q5cP16zRJYhT-blNHY8y8GTRR1Rrs",
  //   crv: "P-256",
  //   d: "O1JpBy9V3ShZElL41aGK8OrUee4LLn5jRLo2UVbkkFY"
  // } 

 

  // const publicKeyEncryptionJwkWallet= {
  //   kty: "EC",
  //   x: "LIKXSdged6d-HDdWZq6HqG4VxbstVN1Gl0frhqxJJms",
  //   y: "xHJ7RVZ-TlYDq9q5cP16zRJYhT-blNHY8y8GTRR1Rrs",
  //   crv: "P-256"
  // }

    //ES256 wallet keys with  encryption key = ES256 public key. 
    // works
  // const privateKeykWallet= {
  //   kty: "EC",
  //   crv: "P-256",
  //   x: "RyfQuZrn6tBdqPUoRocPZ1fqPYhbqjIWO0MECnYuAXc",
  //   y: "a_2UT93k3eeBE4MMGID5ldA8XWJbT1wtcsuBAYGuILY",
  //   d: "SL-cG5Yk8GeVrk9BEeTTWV_-MgXqN4aTJ-dyv794yk4"
  // } 

 

  // const publicKeyEncryptionJwkWallet= {
  //   kty: "EC",
  //   crv: "P-256",
  //   x: "RyfQuZrn6tBdqPUoRocPZ1fqPYhbqjIWO0MECnYuAXc",
  //   y: "a_2UT93k3eeBE4MMGID5ldA8XWJbT1wtcsuBAYGuILY"
  // }

let enckey: CryptoKey;

 async function generateKey(): Promise<CryptoKey> {

    const key = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
          
        },
        true,
        ["encrypt", "decrypt"],
      );
    
 
    enckey = key;
    return key;
  }



function App() {
  const [file, setFile] = useState<File>()
  const [downloadfile, setDownloadFile] = useState<string>()

 
  
const download = async () => {
   
    if (downloadfile) {
      let result;
      let data;
      try {
      result=await fetch(`http://localhost:3000/download?file=${downloadfile}`, );
       
 
      } catch (error) {
        console.log('fetch error->'+error);
    
      }

      if (result && !result.ok) {
        console.log('fetch error->'+JSON.stringify(await result.json()));
      }
      if (result && result.ok ) {
      
        console.log('starting decryption');
        data = await result.arrayBuffer();
        let cleartext;
        const iv = Buffer.from("KYC-encryption");
        const cipher = Buffer.from(data);
        try {
         cleartext = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            enckey,
            cipher,
          );
          console.log('downloaded decrypted doc from mock');
        console.log('decrypted->'+cleartext.byteLength);
        console.log('decrypted->'+cleartext);
        const a = document.createElement('a');
        a.download = 'my-file.pdf';
        // const raw = new Uint8Array(result.data.length); 
        // for (let i = 0; i < result.data.length; i++) 
        //     { raw[i] = result.data[i].charCodeAt(0); }
        const blob = new Blob([cleartext],  {type : 'application/pdf'} );
        a.href = URL.createObjectURL(blob);
        a.click();
       // URL.revokeObjectURL(fileDownloadUrl);
       }   catch (err) {
        console.log('decryption error->'+err);
      }
    }  
  } else {
    console.log('no file selected');
  }
}

let clearEncKey:  CryptoKey;
let fileName: string;
let clearEncKeyHexString: string;
let documentId:string;
  
  const upload = async () => {

   
    console.log('file to upload->'+file?.name);
 
    clearEncKey = await generateKey();
    console.log('clearEnckey->'+clearEncKey);
   //const key = scryptSync("12345678", 'salt', 32);//crypto.randomBytes(32);
  //  const key = crypto.randomBytes(32);
  //  const iv = scryptSync("KYC-encryption", 'salt', 16);;//crypto.randomBytes(16);

  clearEncKeyHexString = await cryptoKeyToHexString(clearEncKey);
  console.log('clearEncKeyHexString->'+clearEncKeyHexString);
 //save clearEncKeyHexString in local storage
    
    const formData = new FormData()
   // const cipher = createCipheriv(algorithm, Buffer.from(key),null);
   const iv = Buffer.from("KYC-encryption");

  
  
    let fileBuffer;
    let blob;
    if (file) {
        const arrayBuffer = await file.arrayBuffer()
        fileBuffer = Buffer.from(arrayBuffer)
      //  blob= new Blob([fileBuffer], { type: 'application/octet-stream' })
    }
  

  //  const blob = file ? new Blob(fileBuffer, { type: 'application/octet-stream' }) : null;
    if (fileBuffer && file) {
        const ciphertext = await crypto.subtle.encrypt(
            {
              name: 'AES-GCM',
              iv: iv,
            //  additionalData: aad,
              length: 256,
            },
            clearEncKey,
            fileBuffer
          );
     //   let encrypted = cipher.update(fileBuffer);
      // encrypted = cipher.final();
        blob= new Blob([ciphertext], { type: 'application/octet-stream' })
      
        formData.append('vp_token',  'vptoken');
        formData.append('file',  blob, file.name+".enc");
        try {
          const config = {     
            headers: { 'content-type': 'multipart/form-data' }
        }
        const result=await axios.post('http://localhost:3000/upload',formData, config )
        console.log('off-chain FileName->'+result.data.path);
        fileName = result.data.path;
        documentId = await Hash(blob);
        console.log('documentId->'+documentId);
        //call init_KYC_share

        } catch (err) {
            console.log('axios error->'+err);
        }

        
    }
    
  }



  let encryptedEncHexKey:string;

  const encryptKey = async ()=> {

    //we are in web wallet
    const bankDID = "did:ebsi:zg4w51ujVxcVbok59meAUhK"


    //create encryptedEncHexKey for a bank using bank's public key
    const privateKeyJwkWallet = getKeysPairJwk_ES256(walletprivateKeyHex).privateKeyJWK_ES256;
    //we don't know bank's kid to use it to get its public key from bank's DIDdocument. 
    //just get its public key  directly from the bank's url
   // const publicKeyEncryptionJwkIssuer = await getPublicKeyJWK_fromDID(bankDID,didkeyResolver,ebsiResolver);
    const publicKeyJwkBank = await getBankJwk("http://localhost:7002/v3/auth/jwks");

    if (!publicKeyJwkBank) {
      console.log('could not get bank publickey from its jwks api');
      return;
     }
    encryptedEncHexKey= await encryptEncryptionKey(
      clearEncKeyHexString, 
      publicKeyJwkBank, 
      privateKeyJwkWallet);

    //send encryptedEncHexKey with the KYC_docs_shared event

  } 

  const decryptKey = async ()=> {

    //we are at the bank module
   //convert sender's wallet did:key to publicKeyJWK. did:key is in the tnt event
   
   const didkeyES256 = "did:key:z2dmzD81cgPx8Vki7JbuuMmFYrWPgYoytykUZ3eyqht1j9Kbq4861Ubqe9a3mnSicLzgkQGPDH5cAH6ZnxKfaB5oqxmq5VFMi4QzYNWJVCxNQFQGPTqzw2q5gkBXjoL9ga3HGXcxMdLbQSVWgFctJRxz9H1VtzA5y6S9b8CNM6jpCPcadz"
   
   const publicKeyJwkWallet = await getPublicKeyJWK_fromDID(didkeyES256,didkeyResolver,ebsiResolver);
   if (!publicKeyJwkWallet) {
    console.log('could not get publickey from did');
    return;
   }
   console.log('publicKeyEncryptionJwkWallet->'+JSON.stringify(publicKeyJwkWallet));

    //bank gets encryptedEncKey from event and decrypts it using its private key
    const decryptionKey = await decryptEncryptionKey(
      encryptedEncHexKey,
      publicKeyJwkWallet,
      privateKeyJwkBankP256
    );
    console.log('decryption Key->'+decryptionKey);

    //use decryptionKey to decrypt the encrypted docs in off-chain
    //import key first
    const DocsDecryptionKey = await window.crypto.subtle.importKey(
      "raw",
      decryptionKey,
   
      "AES-GCM",
      true,
      ["decrypt"]
    );

    console.log('DocsDecryptionKey->'+JSON.stringify(DocsDecryptionKey));
    //decrypt the docs after this
  } 

  const genWalletKeys = async ()=> {
  console.log('here');
    //generate wallet's ES256 and ES256K key pairs using wallets' privateKeyHex
   const {privateKeyJWK_ES256K, publicKeyJWK_ES256K} = getKeysPairJwk_ES256K(walletprivateKeyHex);
   const {privateKeyJWK_ES256, publicKeyJWK_ES256} = getKeysPairJwk_ES256(walletprivateKeyHex);
   //ES256 encryption keys do not depend on privatekeyHex. not used in this project
 //  const {privateKeyJWK_ES256_Encryption,publicKeyJWK_ES256_Encryption} = await getKeysPairJwk_ES256_Encryption();
   //get wallet DIDs associated with public keys
   const didES256 = getDID_ES256(publicKeyJWK_ES256);
   const didES256K = getDID_ES256K(publicKeyJWK_ES256K);

   console.log('didEs256->'+didES256);
   console.log('didEs256k->'+didES256K);
   console.log('public ES256->'+JSON.stringify(publicKeyJWK_ES256));
   console.log('public ES256K->'+JSON.stringify(publicKeyJWK_ES256K));
   //console.log('public ES256 Encryption->'+JSON.stringify(publicKeyJWK_ES256_Encryption));

  }


  const mockdecrypt = async () => {

    //choose file option, and upload option -> generate clearEnckey : Cryptokey
    //upload -> // convert clearEnckey to clearEncKeyHexString and save it to localstorag
  
    //proceed with below

    try {
    
    
    // get clearEncKeyHexString from local storage and encrypt it. saved in encryptedEncHexKey

    await encryptKey();
    console.log('to send encEncKey->'+encryptedEncHexKey);
    const {privateKeyJWK_ES256, publicKeyJWK_ES256} = getKeysPairJwk_ES256(walletprivateKeyHex);
    const didES256 = getDID_ES256(publicKeyJWK_ES256);
    const cleartextArrayBuffer=await axios.post(`http://localhost:7002/v3/tnt/mock_decrypt_docs`,
      { 
        offchainFile:fileName,
        encEncKey:encryptedEncHexKey,
        walletDID:didES256,
       
      },
      {responseType: "arraybuffer"}
      
     )
   //console.log('mockdecrypt->'+cleartextArrayBuffer.data);
   const a = document.createElement('a');
   a.download = 'my-file.pdf';

   const blob = new Blob([cleartextArrayBuffer.data],  {type : 'application/pdf'} );
   a.href = URL.createObjectURL(blob);
   a.click();

    } catch (err) {
        console.log('axios error->'+err);
    }
  }

  let eventId:string;
  const addevent = async () => {

    //run upload first

    const documentId = '0xd36981def879f834658e89d0ba02fe4cd2bb9d0f9a1181214b7e7995a557c2b5'
    const sharedForName = "bank Z";
    const sharedForDid = "bankdid";

    await encryptKey();
    console.log('to send encEncKey->'+encryptedEncHexKey);

    const {privateKeyJWK_ES256, publicKeyJWK_ES256} = getKeysPairJwk_ES256(walletprivateKeyHex);

    const didES256 = getDID_ES256(publicKeyJWK_ES256);

    const eventMetadata = 
      {
        eventType: "KYC_docs_shared",
        es256Did: didES256,
        sharedForName,
        sharedForDid,
        offchainFilepath: fileName,
        encryptedEncryptionKey: encryptedEncHexKey
   
    
      }
   
    const externalHash = `KYC_docs_shared to ${sharedForName}`
    const  result = await addeventTnT(documentId,eventMetadata,externalHash);
   
 
   console.log('addevent result->'+JSON.stringify(result));
 
   if (result?.success) {
    eventId = ethers.utils.keccak256(Buffer.from(externalHash))
    console.log('eventid->'+eventId);
   }

   //call addEventBank(documentId, eventId, customerName)
  }

  const eventdecrypt = async () => {

    //choose file option, and upload option -> generate clearEnckey : Cryptokey
    //upload -> // convert clearEnckey to clearEncKeyHexString and save it to localstorag
    

    //proceed with below

    try {
    
    
    // get clearEncKeyHexString from local storage and encrypt it. saved in encryptedEncHexKey

    await encryptKey();
    await addevent();

    console.log('to send encEncKey->'+encryptedEncHexKey);
    const {privateKeyJWK_ES256, publicKeyJWK_ES256} = getKeysPairJwk_ES256(walletprivateKeyHex);
    const didES256 = getDID_ES256(publicKeyJWK_ES256);
    const cleartextArrayBuffer=await axios.post(`http://localhost:7002/v3/tnt/decrypt_docs`,
      { 
        documentId,
        eventId
       
      },
      {responseType: "arraybuffer"}
      
     )
   //console.log('mockdecrypt->'+cleartextArrayBuffer.data);
   const a = document.createElement('a');
   a.download = 'my-file.pdf';

   const blob = new Blob([cleartextArrayBuffer.data],  {type : 'application/pdf'} );
   a.href = URL.createObjectURL(blob);
   a.click();

    } catch (err) {
        console.log('axios error->'+err);
    }
  }


   return (
    <>
      <div>
        <button type="button" onClick={genWalletKeys}>Generate Wallet Keys</button>
      </div>

       <div>
           <input type="file" onChange={(e) => {
               if (e.target.files) setFile(e.target.files[0])
           } } />
           <button type="button" onClick={upload}>Upload</button>
       </div>

       <div>
          <input type="text" onChange={(e) => {
              if (e.target.value) setDownloadFile(e.target.value)
          } } />
          <button type="button" onClick={download}>Download</button>
        </div>

        <div>
        <button type="button" onClick={encryptKey}>Encrypt Encryption key</button>
        </div>

        <div>
        <button type="button" onClick={decryptKey}>Decrypt Encryption key</button>
        </div>

        <div>
     
          <button type="button" onClick={mockdecrypt}>mock decrypt</button>
        </div>

        <div>
     
        <button type="button" onClick={addevent}>add event</button>
        </div>

        <div>
     
     <button type="button" onClick={eventdecrypt}>event decrypt</button>
   </div>
        
    </>
  )
}

export default App;