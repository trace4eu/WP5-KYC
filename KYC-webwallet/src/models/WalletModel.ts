//import crypto from "node:crypto";
import {JWK, base64url, exportJWK, type KeyLike, generateKeyPair} from 'jose';

import {util} from '@cef-ebsi/key-did-resolver';
//import elliptic from 'elliptic';
import jwt_decode from 'jwt-decode';
import {saveAs} from 'file-saver';
import DataStorageModel from './DataStorageModel';

import {generatePrivKeyHex, getKeysPairJwk_ES256, getKeysPairJwk_ES256K} from "../helpers/keysUtil"

window.Buffer = window.Buffer || require('buffer').Buffer;


interface KeyPairJwk {
  id: string;
  kid: string;
  privateKeyJwk: JWK;
  publicKeyJwk: JWK;
  publicKeyEncryptionJwk: JWK;
  privateKeyEncryptionJwk: JWK;
}

interface PublicKeyPair {
  publicKeyJWK_ES256: JWK;
  publicKeyJWK_ES256K: JWK;
}




export default class WalletModel extends DataStorageModel {
  keys: {
    ES256K?: KeyPairJwk;
    ES256?: KeyPairJwk;
    RS256?: KeyPairJwk;
    EdDSA?: KeyPairJwk;
  };
  
  constructor() {
    super();
    this.keys = {};
    console.log('walletmodel init');
  }

  private createDIDes256(key: JWK): void {
    const did = util.createDid(key);
    this.storeDIDes256(did);
    console.log('WE are in createDIDes256 and did is: ', did);
  }

  private createDIDes256k(key: JWK): void {
    const did = util.createDid(key);
    this.storeDIDes256k(did);
    console.log('WE are in createDIDes256k and did is: ', did);
  }

  
  async createRandomKeys(): Promise<PublicKeyPair> {

    const privKeyHex = generatePrivKeyHex();
   // const privKeyHex = "0x48bf9c1b9624f06795ae4f4111e4d3595ffe3205ea37869327e772bfbf78ca4e"
    const {privateKeyJWK_ES256K, publicKeyJWK_ES256K} = getKeysPairJwk_ES256K(privKeyHex);
    const {privateKeyJWK_ES256, publicKeyJWK_ES256} = getKeysPairJwk_ES256(privKeyHex)
   // const { privateKeyJwk } = await generateKeys(alg);
   // await this.setJwk(alg, privateKeyJwk);
   this.storeKeysES256(JSON.stringify(privateKeyJWK_ES256));
   this.storeKeysES256K(JSON.stringify(privateKeyJWK_ES256K));
   this.storeHexKey(privKeyHex);
    return {publicKeyJWK_ES256,publicKeyJWK_ES256K};
  }
  


  public async initWithRandomPrivKey(password: string): Promise<void> {
    if (!password) {
      throw new Error('Password needs to be provided');
    }

    this.initStorage(password);
    this.storeJWT('success!');
   // console.log('privateKey' + privateKey);
    // const privateKey = this.createKeyFromMnemonic(mnemonic as string | null);
    const {publicKeyJWK_ES256,publicKeyJWK_ES256K} = await this.createRandomKeys();
    // const privateKey = this.generateKeys(ES256);
    this.createDIDes256(publicKeyJWK_ES256);
    this.createDIDes256k(publicKeyJWK_ES256K);
  }

 

  private readFileContent(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target && event.target.result) {
          const content = event.target.result as string;
          resolve(content);
        } else {
          reject(new Error('Error reading file content.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error occurred while reading the file.'));
      };

      reader.readAsText(file);
    });
  }



  public openWallet(password: string) {
    if (!password) {
      throw new Error('Please insert your password');
    }
    this.initStorage(password);
    const decodedToken = this.getJWT();
    console.log('decodetoken->' + decodedToken);

    if (!decodedToken || decodedToken !== 'success!') {
      throw new Error('Password is incorrect');
    }
  }



  public verifyToken() {
    const token = this.getJWT();

    if (token !== null) {
      return token;
    } else {
      throw new Error('Token not found');
    }
  }
}
