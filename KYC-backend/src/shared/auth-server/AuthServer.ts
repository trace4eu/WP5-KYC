import { PEXv2 } from "@sphereon/pex";
import { importJWK, KeyLike } from "jose";
import { Resolver } from "did-resolver";
import { getResolver as getEbsiDidResolver } from "@cef-ebsi/ebsi-did-resolver";
import { getResolver as getKeyDidResolver } from "@cef-ebsi/key-did-resolver";
import type { Level } from "level";
import type { GetAuthorizeDto, GetAuthorizeHolderWallerDto } from "./dto/index.js";
import {  getKeyPair, JWKWithKid} from "../utils/index.js";
import type { JsonWebKeySet } from "../interfaces.js";
import type {
  TokenResponse,
  OPMetadata,
  LevelDbKeyAuth,
  LevelDbObjectAuth,
  CachedCodeResponse,
} from "./interfaces.js";
import {
  authorize,
  directPost,
  getOPMetadata,
  getPrivateJwks,
  getPrivateKeyJwk,
  getPublicJwks,
  getRequestById,
  token,
} from "./utils.js";
import { v4 as uuidv4 } from 'uuid';
import type { Cache } from "cache-manager";
//import type { EventGateway } from "../../gateways/event.gateway.js";
//import type { ReceivedVCDocument } from "../models/receivedvcs.model.js";
import type { Model } from "mongoose";
import type GetBeTokenDto from "./dto/get-betoken.dto.js";
import type GetBeAuthDto from "./dto/get-beauthorize.dto.js";
import OAuth2TokenError from "../errors/OAuth2TokenError.js";
import { AuthPINDocument } from "../models/authpins.model.js";
//import { IssuedVCDocument } from "../models/issuedvcs.model.js";
import { BanksDocument } from "../models/banks.model.js";

export class AuthServer {
  private privateJwks?: JWKWithKid[];

  private privateKey?: Uint8Array | KeyLike;

  private privateKeyJwk?: JWKWithKid;

  private readonly privateKeyHex: string;

 // private db: Level<LevelDbKeyAuth, LevelDbObjectAuth>;

  /**
   * EBSI DID Resolver (did:ebsi v1)
   */
  private readonly ebsiResolver: Resolver;

  /**
   * Key DID Resolver (did:key)
   */
  private readonly keyResolver: Resolver;

  /**
   * Request timeout
   */
  private readonly timeout?: number;

  /**
   * Presentation exchange
   */
  private readonly pex: PEXv2;

  private readonly ebsiAuthority: string;

  private readonly didRegistryApiUrl: string;

  private readonly trustedIssuersRegistryApiUrl: string;

  private readonly trustedPoliciesRegistryApiUrl: string;

  url: string;

  private readonly did: string;

  /**
   * Issuer Mock public key JWK (to verify the signature of issuer_state)
   * Note: in practice, the Auth Server would load the JWKS from the Issuer Mock in order to get the public key.
   */
  private issuerPrivateKey: string;
  private issuerUrl: string;
  //private receivedVCModel: Model<ReceivedVCDocument>;
 // private issuedVCModel: Model<IssuedVCDocument>;
  private bankModel: Model<BanksDocument>;

  // private cacheManager: {
  //   interval: ReturnType<typeof setInterval>;
  //   keys: { key: LevelDbKeyAuth; expiration: number }[];
  // };

  constructor(opts: {
   // db: Level<LevelDbKeyAuth, LevelDbObjectAuth>;
    privateKeyHex: string;
    did: string; //empty string
    url: string;
    didRegistryApiUrl: string;
    trustedIssuersRegistryApiUrl: string;
    trustedPoliciesRegistryApiUrl: string;
    ebsiAuthority: string;
    issuerPrivateKey: string;
    issuerUrl:string;
   // receivedVCModel: Model<ReceivedVCDocument>
    bankModel: Model<BanksDocument>
    timeout?: number;
  }) {
    //this.db = opts.db;
    this.privateKeyHex = opts.privateKeyHex;
    this.did = opts.did;
    this.url = opts.url;
    this.ebsiResolver = new Resolver(
      getEbsiDidResolver({ registry: opts.didRegistryApiUrl })
    );
    this.keyResolver = new Resolver(getKeyDidResolver());
    this.timeout = opts.timeout;
    this.pex = new PEXv2();
    this.ebsiAuthority = opts.ebsiAuthority;
    this.didRegistryApiUrl = opts.didRegistryApiUrl;
    this.trustedIssuersRegistryApiUrl = opts.trustedIssuersRegistryApiUrl;
    this.trustedPoliciesRegistryApiUrl = opts.trustedPoliciesRegistryApiUrl;
    this.issuerPrivateKey = opts.issuerPrivateKey;
    this.issuerUrl = opts.issuerUrl;
   // this.receivedVCModel = opts.receivedVCModel;
    this.bankModel = opts.bankModel;
    
    // this.cacheManager = {
    //   interval: setInterval(() => {
    //     this.manageCache().catch(() => {});
    //   }, 120_000),
    //   keys: [],
    // };

   
  }

  // private addKeyToCacheManager(
  //   key: LevelDbKeyAuth,
  //   ttl: number = Number.MAX_SAFE_INTEGER
  // ) {
  //   this.cacheManager.keys.push({ key, expiration: Date.now() + ttl });
  //   // sort by expiration: The first ones to
  //   // expire are at the beginning of the list
  //   this.cacheManager.keys.sort((a, b) => a.expiration - b.expiration);
  // }

  // private async manageCache() {
  //   const now = Date.now();
  //   // search which ID has not expired yet
  //   const id = this.cacheManager.keys.findIndex((a) => now < a.expiration);
  //   // remove the expired keys (from 0 until id-1)
  //   const expiredKeys = this.cacheManager.keys.splice(0, id);
  //   // remove data from database
  //   await this.db.batch(
  //     expiredKeys.map((k) => ({
  //       type: "del",
  //       key: k.key,
  //     }))
  //   );
  // }

  // async close() {
  //   clearInterval(this.cacheManager.interval);
  //   // remove data from cache
  //   try {
  //     await this.db.batch(
  //       this.cacheManager.keys.map((k) => ({
  //         type: "del",
  //         key: k.key,
  //       }))
  //     );
  //   } catch {
  //     // empty
  //   }
  // }

  private async getPrivateKey() {
    if (!this.privateJwks) {
   //   this.privateJwks = await getPrivateJwks(this.db, this.did);
      const { privateKeyJwk } = await getKeyPair(this.privateKeyHex);
      this.privateJwks = [privateKeyJwk];
    }
      this.privateKeyJwk = getPrivateKeyJwk(this.privateJwks);
    return importJWK(this.privateKeyJwk);
  }

  getOPMetadata(): OPMetadata {
    return getOPMetadata(this.url);
  }

  /**
   * Expose Auth Mock's public keys.
   *
   * @returns Auth Mock's JWKS
   */
  async getPublicJwks(): Promise<JsonWebKeySet> {
    if (!this.privateJwks) {
     // this.privateJwks = await getPrivateJwks(this.db, this.did);
      const { privateKeyJwk } = await getKeyPair(this.privateKeyHex);
      this.privateJwks = [privateKeyJwk];
    }
    return getPublicJwks(this.privateJwks);
  }

  /**
   * Process client's auth request.
   *
   * @returns The redirect location.
   */
  async authorize(
    query: GetAuthorizeDto, 
    cacheManager: Cache, 
    //eventGateway: EventGateway, 
    //requiredVCs?: Array<string>,
    //verifierRequiredVCs?: Array<string>,
    

    ): Promise<string> {

    if (!this.privateKey) {
      this.privateKey = await this.getPrivateKey();
    }
    const { kid } = this.privateKeyJwk as JWKWithKid;

    const issuerKeyPair = await getKeyPair(this.issuerPrivateKey);

    let issuerState: string | undefined;  //patch for CT issuer
    // if (query.redirect_uri.includes('redirect'))
    //   issuerState = 'issuer_state'   //expected issuerState

    return authorize(
     // this.db,
      cacheManager,
 
      this.did,
      this.url,
      kid,
      this.privateKey,
      query,
      issuerKeyPair.publicKeyJwk,
      issuerState,
   
      
    );
  }

async directPost(cacheManager: Cache, query: unknown): Promise<string> {

  return directPost(

  cacheManager,
  this.did,
  this.url,
  this.ebsiAuthority,
  this.didRegistryApiUrl,
  this.trustedIssuersRegistryApiUrl,
  this.trustedPoliciesRegistryApiUrl,
  this.pex,
  this.ebsiResolver,
  this.keyResolver,
  this.timeout,
  query,


  );
}







  // async getBeTokenForOpenId(body: GetBeTokenDto, cacheManager: Cache, clientid:string, clientSecret:string): Promise<object> {

  
  //   if (!this.privateKey) {
  //     this.privateKey = await this.getPrivateKey();
  //   }
  //   const { kid } = this.privateKeyJwk as JWKWithKid;
    
  //   const beaccesstoken= await getBeTokenForOpenId(
  //     cacheManager,
  //     kid,
  //     this.privateKey,
  //     this.url,
  //   // this.issuerUrl,
  //     body,
  //     clientid,
  //     clientSecret,
  //     );

  //     return {beaccess_token: beaccesstoken}

  // }

  /**
   * Get Authorization Request by ID.
   */
  async getRequestById(cacheManager: Cache, requestId: string): Promise<string> {
    return getRequestById(/*this.db,*/ cacheManager , requestId);
  }

  /**
   * Process /direct_post request.
   *
   * @returns The location URI based on the Authentication Request `redirect_uri`, with `code` and `state` params.
   */
  // async directPost(cacheManager: Cache, query: unknown, 
  //                  requiredVCs?: Array<string>,verifierRequiredVCs?: Array<string>, requiredLogin?: boolean,
  //                   loginUrl?: string, systemUpdateUrl?:string, systemSecret?:string): Promise<string> {
  //   return directPost(
  //   //  this.db,
  //     // (key: LevelDbKeyAuth, ttl: number = Number.MAX_SAFE_INTEGER) => {
  //     //   this.addKeyToCacheManager(key, ttl);
  //     // },
  //     cacheManager,
  //     this.did,
  //     this.url,
  //     this.ebsiAuthority,
  //     this.didRegistryApiUrl,
  //     this.trustedIssuersRegistryApiUrl,
  //     this.trustedPoliciesRegistryApiUrl,
  //     this.pex,
  //     this.ebsiResolver,
  //     this.keyResolver,
  //     this.receivedVCModel,
  //     this.timeout,
  //     query,
  //     requiredVCs,
  //     verifierRequiredVCs,
  //     requiredLogin,
  //     loginUrl,
  //     systemUpdateUrl,
  //     systemSecret

  //   );
  // }

  /**
   * Process /token request.
   * Access Token is delivered as a response payload from a successful Token Endpoint initiation.
   * `c_nonce` (Challenge Nonce) must be stored until a new one is given.
   *
   * @see https://www.rfc-editor.org/rfc/rfc6749#section-4.1.4
   *
   * @param body The POST /token request payload
   * @returns A token response.
   */
  async token(cacheManager: Cache, query: unknown): Promise<TokenResponse> {
    if (!this.privateKey) this.privateKey = await this.getPrivateKey();
    const { kid } = this.privateKeyJwk as JWKWithKid;
    
    return token(
     // this.db,
      cacheManager,
      this.did,
      this.url,
      kid,
      this.privateKey,
      query,
     // this.receivedVCModel,
      this.bankModel,
      this.timeout,
      //requiredLogin,
    );
  }
}

export default AuthServer;
