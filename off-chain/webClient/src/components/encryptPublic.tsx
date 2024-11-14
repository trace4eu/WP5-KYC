import { JWK } from "jose";

window.Buffer = window.Buffer || require('buffer').Buffer;



  const privateKeyJwkIssuerP256= {
    kty: "EC",
    crv: "P-256",
    x: "hBP5baWo1f6TCVihXPBsHwD74VZP-0kLPedVGo4dbK8",
    y: "fbrt2t7p6_6vvPYqvQeCYeRcBGArh3up-28qIcwKSRo",
    d: "S0OhBEVrUe8jhzmKRvuRAGJVZpPV3ZhFYtBb0RRpFfA"
  }

 


 const publicKeyEncryptionJwkIssuer= {
    kty: "EC",
    crv: "P-256",
    x: "hBP5baWo1f6TCVihXPBsHwD74VZP-0kLPedVGo4dbK8",
    y: "fbrt2t7p6_6vvPYqvQeCYeRcBGArh3up-28qIcwKSRo"
} 


  //ES256 wallet encryption keys. different from ES256 wallet keys. do not depend on privateHex or did
  //works
  const privateKeykWallet= {
    kty: "EC",
    
    x: "LIKXSdged6d-HDdWZq6HqG4VxbstVN1Gl0frhqxJJms",
    y: "xHJ7RVZ-TlYDq9q5cP16zRJYhT-blNHY8y8GTRR1Rrs",
    crv: "P-256",
    d: "O1JpBy9V3ShZElL41aGK8OrUee4LLn5jRLo2UVbkkFY"
  } 

 

  const publicKeyEncryptionJwkWallet= {
    kty: "EC",
    x: "LIKXSdged6d-HDdWZq6HqG4VxbstVN1Gl0frhqxJJms",
    y: "xHJ7RVZ-TlYDq9q5cP16zRJYhT-blNHY8y8GTRR1Rrs",
    crv: "P-256"
  }

  //ES256K wallet keys. depend on privateHex. different did from ES256 did
  // does not work
  // const privateKeykWallet= {
  //   kty: "EC",
  //   crv: "secp256k1",
  //   x: "svkU4oZSNZaIfFuuS6j6LLWMinuRas1AmwNXos4o6a8",
  //   y: "LdSxMUn-ZQidLtS5PHsqnLPOmvJrqQsGcm3ASsrnxyQ",
  //   d: "SL-cG5Yk8GeVrk9BEeTTWV_-MgXqN4aTJ-dyv794yk4"
  // } 

 

  // const publicKeyEncryptionJwkWallet= {
  //   kty: "EC",
  //   crv: "secp256k1",
  //   x: "svkU4oZSNZaIfFuuS6j6LLWMinuRas1AmwNXos4o6a8",
  //   y: "LdSxMUn-ZQidLtS5PHsqnLPOmvJrqQsGcm3ASsrnxyQ"
  // }

    //ES256 wallet keys with  encryption key = ES256 public key
    //does not work
  // const privateKeykWallet= {
  //   kty: "EC",
    
  //   x: "LIKXSdged6d-HDdWZq6HqG4VxbstVN1Gl0frhqxJJms",
  //   y: "xHJ7RVZ-TlYDq9q5cP16zRJYhT-blNHY8y8GTRR1Rrs",
  //   crv: "P-256",
  //   d: "O1JpBy9V3ShZElL41aGK8OrUee4LLn5jRLo2UVbkkFY"
  // } 

 

  // const publicKeyEncryptionJwkWallet= {
  //   kty: "EC",
  //   crv: "P-256",
  //   x: "RyfQuZrn6tBdqPUoRocPZ1fqPYhbqjIWO0MECnYuAXc",
  //   y: "a_2UT93k3eeBE4MMGID5ldA8XWJbT1wtcsuBAYGuILY"
  // }

 //issuer  did: did:ebsi:zg4w51ujVxcVbok59meAUhK
  //issuer key privateKeyHex = "0x4b43a104456b51ef2387398a46fb910062556693d5dd984562d05bd1146915f0";

  export async function generateEncKey(): Promise<string> {

    const key = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
          
        },
        true,
        ["encrypt", "decrypt"],
      );
    
      let exportedKey1 = await crypto.subtle.exportKey('raw', key);
  
      console.log('exportedkey buffer->'+exportedKey1);
      const decoder = new TextDecoder();

      const str = Buffer.from(exportedKey1).toString('binary');
    
      console.log('exportedkey decode->'+str);
      

    return str;
  }

  export async function encryptEncryptionKey(
    clearEncryptionKey:string,
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



const uint8Array = Buffer.from(clearEncryptionKey,'binary');
//const uint8Array = new TextEncoder().encode(clearEncKey)

const encrypted = await crypto.subtle.encrypt({
    "name": "AES-GCM",
    "iv": iv
}, key, uint8Array) //new TextEncoder().encode(encryptionKey));  //Buffer.from(encryptionKey)

//encryptedKeyInTnT = new TextDecoder().decode(encrypted);
//encryptedKeyInTnT = Array.prototype.map.call(encrypted, (c) => String.fromCharCode(c)).join('');
   //send this with update_event
   const encryptedKeyInTnT = Buffer.from(encrypted).toString('binary');
   return encryptedKeyInTnT;
  }


  export async function decryptEncryptionKey(
    cipherEncKey:string,
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
const uint8Array = Buffer.from(cipherEncKey, 'binary');

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

