//import { JWK } from "node-jose";
//import { JWK } from "jose";

import { JWK } from "./verifiablePresentation";

window.Buffer = window.Buffer || require('buffer').Buffer;

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


  function toArrayBuffer(myBuf:Buffer) {
    var myBuffer = new ArrayBuffer(myBuf.length);
    var res = new Uint8Array(myBuffer);
    for (var i = 0; i < myBuf.length; ++i) {
       res[i] = myBuf[i];
    }
    return myBuffer;
 }



  export async function generateEncKey(): Promise<CryptoKey> {

    const key = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
          
        },
        true,
        ["encrypt", "decrypt"],
      );
    
 
    return key;
  }



  export async function cryptoKeyToHexString(key:CryptoKey): Promise<string> {

 
    
      let exportedKey1 = await crypto.subtle.exportKey('raw', key);
  
      console.log('exportedkey buffer->'+exportedKey1);
     // const decoder = new TextDecoder();

     // const str = Buffer.from(exportedKey1).toString('binary');

      const hexkey = toHexString(new Uint8Array(exportedKey1));
    
      console.log('exportedkey hexkey->'+hexkey);
      

    return hexkey;
  }

  export async function hexStringToCrypto(keyhex:string): Promise<CryptoKey> {

 
    const uint8Array = fromHexString(keyhex);
    const docsDecryptionKey = await crypto.subtle.importKey(
      "raw",
      uint8Array,
  
      "AES-GCM",
      true,
      ["decrypt"]
    );
    

  return docsDecryptionKey;
}


  export async function encryptEncryptionKey(
    clearEncryptionHexKey:string,
    publicEncryptionKeyJWK: JWK,
    privateEncryptionKeyJWK: JWK
  ): Promise<string> {

   

      const keyIssuerPublic = await window.crypto.subtle.importKey(
        "jwk",
        publicEncryptionKeyJWK,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
      //  ['sign']
        []
      ) 

      

      console.log('detivedbits');

  
    const keyWalletPrivate = await window.crypto.subtle.importKey(
        "jwk",
        privateEncryptionKeyJWK,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ['deriveBits']
      );

      console.log('detivedbits 2');
  
      // sharedBits - Both ships can now compute the shared bits.
// The ship's private key is used as the "key", the other ship's public key is used as "public".
var sharedBitsWallet = await crypto.subtle.deriveBits({
    "name": "ECDH",
    "public": keyIssuerPublic,
}, keyWalletPrivate, 256);

// // The first half of the resulting raw bits is used as a salt.
var sharedDS = sharedBitsWallet.slice(0, 16);

// // The second half of the resulting raw bits is imported as a shared derivation key.
var sharedDKWallet = await crypto.subtle.importKey('raw', sharedBitsWallet.slice(16, 32), "PBKDF2", false, ['deriveKey']);

// // A new shared AES-GCM encryption / decryption key is generated using PBKDF2
// // This is computed separately by both parties and the result is always the same.
var key = await crypto.subtle.deriveKey({
    "name": "PBKDF2",
    "salt": sharedDS,
    "iterations": 100000,
    "hash": "SHA-256"
}, sharedDKWallet, {
    "name": "AES-GCM",
    "length": 256
}, true, ['encrypt', 'decrypt']);

// // The raw bits of the actual encryption key can be exported and saved in the ship's computer.
// // These bits should be stored encrypted and should reference the specfic ship you are communicating with.
// var exported = await crypto.subtle.exportKey('raw', key);

// // The alienship can construct a message and encode it.
//var message = new TextEncoder().encode('TO SERVE MAN...');

// // A random iv can be generated and used for encryption
//var iv = crypto.getRandomValues(new Uint8Array(12));
const iv = Buffer.from("KYC-encryption");


const clearEncryptionKey = fromHexString(clearEncryptionHexKey);
//const uint8Array = Buffer.from(clearEncryptionKey,'binary');


const encrypted = await crypto.subtle.encrypt({
    "name": "AES-GCM",
    "iv": iv
}, key, clearEncryptionKey) //new TextEncoder().encode(encryptionKey));  //Buffer.from(encryptionKey)

//encryptedKeyInTnT = new TextDecoder().decode(encrypted);
//encryptedKeyInTnT = Array.prototype.map.call(encrypted, (c) => String.fromCharCode(c)).join('');
   //send this with update_event
  // const encryptedKeyInTnT = Buffer.from(encrypted).toString('binary');
   const encryptedKeyInTnT = toHexString(new Uint8Array(encrypted));
   return encryptedKeyInTnT;
  }


  export async function decryptEncryptionKey(
    cipherEncHexKey:string,
    publicEncryptionKeyJWK: JWK,
    privateEncryptionKeyJWK: JWK
  ): Promise<ArrayBuffer> {

    const iv = Buffer.from("KYC-encryption");

    const keyWalletPublic = await window.crypto.subtle.importKey(
        "jwk",
        publicEncryptionKeyJWK,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
      //  ['sign']
        []
      ) 

      console.log('after keyWalletPublic');

    const keyIssuerPrivate = await window.crypto.subtle.importKey(
        "jwk",
        privateEncryptionKeyJWK,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ['deriveBits']
      );

      console.log('detivedbits 2');

      var sharedBitsIssuer = await crypto.subtle.deriveBits({
        "name": "ECDH",
        "public": keyWalletPublic
    }, keyIssuerPrivate, 256);
  
// // The first half of the resulting raw bits is used as a salt.
var sharedDS = sharedBitsIssuer.slice(0, 16);

// // The second half of the resulting raw bits is imported as a shared derivation key.
var sharedDKIssuer = await crypto.subtle.importKey('raw', sharedBitsIssuer.slice(16, 32), "PBKDF2", false, ['deriveKey']);

// // A new shared AES-GCM encryption / decryption key is generated using PBKDF2
// // This is computed separately by both parties and the result is always the same.
var key = await crypto.subtle.deriveKey({
    "name": "PBKDF2",
    "salt": sharedDS,
    "iterations": 100000,
    "hash": "SHA-256"
}, sharedDKIssuer, {
    "name": "AES-GCM",
    "length": 256
}, true, ['encrypt', 'decrypt']);

console.log('after derive key');


//get it from event data
//const uint8Array = Buffer.from(cipherEncKey, 'binary');
const uint8Array = fromHexString(cipherEncHexKey);
const decrypted = await crypto.subtle.decrypt({
    "name": "AES-GCM",
    "iv": iv
}, key, uint8Array);

console.log('decrypted key buffer->'+decrypted);
// // The humans decode the message into human readable text...
var decoded = new TextDecoder().decode(decrypted);

// // The humans output the message to the console and gasp!
 console.log('decrypted key decoded->'+decoded);

 //use decrypted enckey to decrypt the off-chain docs
 console.log('key length='+Buffer.from(decrypted).length);


 return decrypted;

  }

