import React, { useState } from "react"
import axios, { AxiosError } from 'axios'
import fs from 'fs'
import { decryptEncryptionKey, encryptEncryptionKey, generateEncKey, } from "./encryptPublic";
import { getBankJwk, getDID_ES256,getDID_ES256K, getKeysPairJwk_ES256, getKeysPairJwk_ES256_Encryption, getKeysPairJwk_ES256K, getPublicKeyJWK_fromDID } from "./keysUtil";
// import { getResolver  } from "@cef-ebsi/ebsi-did-resolver";
import { Resolver } from "did-resolver";
import { getResolver as getEbsiDidResolver } from "@cef-ebsi/ebsi-did-resolver";
import { getResolver as getKeyDidResolver } from "@cef-ebsi/key-did-resolver";

window.Buffer = window.Buffer || require('buffer').Buffer;


const walletprivateKeyHex = "0x48bf9c1b9624f06795ae4f4111e4d3595ffe3205ea37869327e772bfbf78ca4e"

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
let encKey: string;
 async function generateKey(): Promise<CryptoKey> {

    const key = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
          
        },
        true,
        ["encrypt", "decrypt"],
      );
    
    //const privateKey = new Uint8Array(Buffer.from(password));
    // const privateKey = crypto.subtle.generateKey()

    // //console.log('privkay->'+privateKey.toString());
    // const key = await crypto.subtle.importKey(
    //   'raw',
    //   privateKey,
    //   {
    //     name: 'AES-GCM',
    //   },
    //   true,
    //   ['encrypt', 'decrypt']
    // );
    enckey = key;
    return key;
  }



function App() {
  const [file, setFile] = useState<File>()
  const [downloadfile, setDownloadFile] = useState<string>()

  const upload1 = async () => {

   
    console.log('file to upload->'+file?.name);
  
    
    const formData = new FormData()
 
    const blob = file ? new Blob([file], { type: 'application/octet-stream' }) : null;
    if (blob && file) {
       
        formData.append('file',  blob, file.name );
        try {
        const result=await axios.post('http://localhost:3000/upload',formData )
        console.log('off-chain FileName->'+result.data.path);
        } catch (err) {
            console.log('axios error->'+err);
        }
    }
    
  }

//   const download1 = async () => {
//     let encdata;
//     if (downloadfile) {
//       let result;
//       try {
//       result=await axios.get(`http://localhost:3000/download?file=${downloadfile}`,
   
//        );
       
 
    
//       console.log('length of downloaded file->'+result.data.length);
//       } catch (err) {
//         console.log('axios error->'+err);
//         if (err instanceof AxiosError) {
//             console.log(err.response?.data);
//         }
        
//       }

//       if (result && result?.data.length>0) {
      
//         // let cleartext;
//         // const iv = Buffer.from("KYC-encryption");
//         // const cipher = Buffer.from(result.data);
//          try {
//         // cleartext = await crypto.subtle.decrypt(
//         //     { name: "AES-GCM", iv },
//         //     enckey,
//         //     cipher,
//         //   );
       
//         //   console.log('decrypted->'+cleartext.byteLength);
//         const a = document.createElement('a');
//         a.download = 'my-file.bin';
//         const raw = new Uint8Array(result.data.length); 
//         for (let i = 0; i < result.data.length; i++) 
//             { raw[i] = result.data[i].charCodeAt(0); }
//         const blob = new Blob([raw],  {type : 'application/pdf'} );
//         a.href = URL.createObjectURL(blob);
//         a.click();
//        // URL.revokeObjectURL(fileDownloadUrl);
//        }   catch (err) {
//         console.log('decryption error->'+err);
//       }
//     }  
//   }
// }
  
const download2 = async () => {
   
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
          console.log('decryption completed');
        //   console.log('decrypted->'+cleartext.byteLength);
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
  }
}
  
  const upload = async () => {

   
    console.log('file to upload->'+file?.name);
    const algorithm = "aes-256-gcm";
    const key = await generateKey();
    console.log('key->'+key);
   //const key = scryptSync("12345678", 'salt', 32);//crypto.randomBytes(32);
  //  const key = crypto.randomBytes(32);
  //  const iv = scryptSync("KYC-encryption", 'salt', 16);;//crypto.randomBytes(16);
    
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
            key,
            fileBuffer
          );
     //   let encrypted = cipher.update(fileBuffer);
      // encrypted = cipher.final();
        blob= new Blob([ciphertext], { type: 'application/octet-stream' })
        formData.append('file',  blob, file.name+".enc");
        try {
        const result=await axios.post('http://localhost:3000/upload',formData )
        console.log('off-chain FileName->'+result.data.path);
        } catch (err) {
            console.log('axios error->'+err);
        }
    }
    
  }

//   const download = async () => {
//     let encdata;
//     if (downloadfile) {
//       let result;
//       try {
//       result=await axios.get(`http://localhost:3000/download?file=${downloadfile}`,
   
//         {responseType: 'stream'},
//        );
//         const stream = result.data;
//         stream.on('data', (data: string) => { 
//         encdata = data;
//         console.log('legth of doanloaded data->'+data.length) 
//       })
    
//       console.log('length of downloaded file->'+result.data.length);
//       } catch (err) {
//         console.log('axios error->'+err);
//         if (err instanceof AxiosError) {
//             console.log(err.response?.data);
//         }
        
//       }

//       if (result && result?.data.length>0) {
      
//         let cleartext;
//         const iv = Buffer.from("KYC-encryption");
//         const cipher = Buffer.from(result.data);
//         try {
//         cleartext = await crypto.subtle.decrypt(
//             { name: "AES-GCM", iv },
//             enckey,
//             cipher,
//           );
       
//           console.log('decrypted->'+cleartext.byteLength);
//         const a = document.createElement('a');
//         a.download = 'my-file.pdf';
//         const blob = new Blob([cleartext], {type : 'application/pdf'});
//         a.href = URL.createObjectURL(blob);
//         a.click();
//        // URL.revokeObjectURL(fileDownloadUrl);
//        }   catch (err) {
//         console.log('decryption error->'+err);
//       }
//     }  
//   }
// }

  let encryptedEncKey:string;

  const encryptKey = async ()=> {

    //we are in web wallet
    const bankDID = "did:ebsi:zg4w51ujVxcVbok59meAUhK"
    const clearEncKey = await generateEncKey();
    //save clearEncKey in local storage
    //use it to encrypt KYC docs before sending them to off-chain storage
    //create encryptedEncKey for a bank using bank's public key
    const privateKeyJwkWallet = getKeysPairJwk_ES256(walletprivateKeyHex).privateKeyJWK_ES256;
    //we don't know bank's kid to use it to get its public key from bank's DIDdocument. 
    //just get its public key  directly from the bank's url
   // const publicKeyEncryptionJwkIssuer = await getPublicKeyJWK_fromDID(bankDID,didkeyResolver,ebsiResolver);
    const publicKeyJwkBank = await getBankJwk("http://localhost:7002/v3/auth/jwks");

    if (!publicKeyJwkBank) {
      console.log('could not get bank publickey from its jwks api');
      return;
     }
    encryptedEncKey= await encryptEncryptionKey(
      clearEncKey, 
      publicKeyJwkBank, 
      privateKeyJwkWallet);

    //send encryptedEncKey with the KYC_docs_shared event

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
      encryptedEncKey,
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
  
    //generate wallet's ES256 and ES256K key pairs using wallets' privateKeyHex
   const {privateKeyJWK_ES256K, publicKeyJWK_ES256K} = getKeysPairJwk_ES256K(walletprivateKeyHex);
   const {privateKeyJWK_ES256, publicKeyJWK_ES256} = getKeysPairJwk_ES256(walletprivateKeyHex);
   //ES256 encryption keys do not depend on privatekeyHex. not used in this project
   const {privateKeyJWK_ES256_Encryption,publicKeyJWK_ES256_Encryption} = await getKeysPairJwk_ES256_Encryption();
   //get wallet DIDs associated with public keys
   const didES256 = getDID_ES256(publicKeyJWK_ES256);
   const didES256K = getDID_ES256K(publicKeyJWK_ES256K);

   console.log('didEs256->'+didES256);
   console.log('didEs256k->'+didES256K);
   console.log('public ES256->'+JSON.stringify(publicKeyJWK_ES256));
   console.log('public ES256K->'+JSON.stringify(publicKeyJWK_ES256K));
   console.log('public ES256 Encryption->'+JSON.stringify(publicKeyJWK_ES256_Encryption));

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
          <button type="button" onClick={download2}>Download</button>
        </div>

        <div>
        <button type="button" onClick={encryptKey}>Encrypt Encryption key</button>
        </div>

        <div>
        <button type="button" onClick={decryptKey}>Decrypt Encryption key</button>
        </div>
        
    </>
  )
}

export default App;