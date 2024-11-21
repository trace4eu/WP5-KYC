
import type { IPresentation, IVerifiableCredential } from "@sphereon/ssi-types";
import { decodeJWT } from "did-jwt";
import Multihash from "multihashes";
import { ethers } from "ethers";
import { webcrypto } from "crypto";
import {
  //CACHE_MANAGER,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ReadonlyDeep } from "type-fest";


import {
  base64url,
  decodeJwt,
  decodeProtectedHeader,
  importJWK,
  SignJWT,
  
} from "jose";
import type { JWK, JWTPayload, ProtectedHeaderParameters } from "jose";
import { DIDDocument, Resolver, VerificationMethod } from "did-resolver";
//import { getResolver as getEbsiDidResolver, getResolver } from "@cef-ebsi/ebsi-did-resolver";
import { getResolver ,util, } from "@cef-ebsi/key-did-resolver";
import {
  
  ValidationError,
  verifyCredentialJwt,
} from "@cef-ebsi/verifiable-credential";
import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
  EbsiVerifiableAccreditation,
  EbsiVerifiableAttestation,
  EbsiVerifiableAttestation20221101,
  EbsiVerifiableAttestation202401,
  VcJwtPayload,
  VerifyCredentialOptions,
} from "@cef-ebsi/verifiable-credential";
//import { Level } from "level";
import { NotFoundError, InternalServerError, BadRequestError } from "@cef-ebsi/problem-details-errors";

import { z } from "zod";

import type { ApiConfig } from "../../config/configuration.js";
import type {
 
  CredentialOffer,
  CredentialOfferPayload,
  CredentialResponse,
  DeferredCredentialResponse,
  VerifyResponse,
} from "./tnt.interface.js";


import {
  formatZodError,
  getErrorDetails,
  getErrorMessage,
  validateCredentialStatus,
  validateCredentialStatusLocal,
 

} from "../../shared/utils/index.js";

import { EBSIAuthorisationService } from "../ebsi/authorisation.service.js";
import { DataStoreService } from "../data-store/data-store.service.js";
import { LogsService } from "../logs/logs.service.js";


import type {
  BankInfo,
  BanksInfo,
  CheckResult,
 
  CredentialIssuerMetadata,

  JsonWebKeySet,

  KnownIssuersMetadata,
} from "../../shared/interfaces.js";




import { InjectModel } from "@nestjs/mongoose";

import type { Model } from "mongoose";
import { EbsiVerifiablePresentation, VerifyPresentationJwtOptions, VpJwtPayload, verifyPresentationJwt } from "@cef-ebsi/verifiable-presentation";
//import type { EbsiVerifiableAttestation } from "@cef-ebsi/verifiable-credential";
import type { AuthenticationErrorResponse, PresentationDefinition } from "../../shared/interfaces2.js";
import { PRESENTATION_DEFINITION_TEMPLATE } from "../../shared/constants2.js";
import type { PresentationSubmission } from "@sphereon/pex-models";
import { Checked, PEXv2 } from "@sphereon/pex";
import { directPostVpTokenSchema } from "./validators/direct-post-vp-token.validator.js";
import presentationSubmissionSchema from "./validators/presentation-submission.validator.js";
import type { Cache } from "cache-manager";
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import getLicenseDto from "./dto/getlicense.dto.js";
import { credential_offer } from "./tnt.constants.js";
import { getKeyPair, getPublicKeyHex, KeyPair } from "../../shared/utils/getKeyPair.js";
import validatePostCredential from "../../shared/credential-issuer/validatePostCredential.js";
import { RevList, RevListDocument } from "../../shared/models/revList.model.js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import issueCredential from "../../shared/credential-issuer/issueCredential.js";
import NewBatchDto, { InitKYCShareDto } from "./dto/initKYCshare.dto.js";
import { Product, ProductDocument } from "../../shared/models/products.model.js";
import axios, { AxiosError, AxiosResponse } from "axios";
import { logAxiosRequestError, signAndSendTransaction, waitToBeMined } from "../../shared/credential-issuer/utils.js";
import { Alg, BatchAll, CompletedBatch, CompletedTask, KYC_SHARED, KYCEvent, PaginatedList, PDOdocument, PDOEvent, PendingBatch, PendingBatchAll, PendingTask, RequiredEvent, TnTDocument, TnTEvent, UnknownObject, UnsignedTransaction } from "./interfaces/index.js";
import { fromHexString, multibaseEncode, removePrefix0x } from "./utils/utils.js";
import createVPJwt from "./utils/verifiablePresentation.js";
import Client from "./utils/Client.js";
import crypto from "node:crypto";
import UpdateBatchDto from "./dto/updatebatch.dto.js";
import TnTqueryDto from "./dto/tntquery.dto.js";
import TnTdocumentDto from "./dto/tntdocument.dto.js";
import { walletdidDto } from "./dto/walletdid.dto.js";
import { Bank, BanksDocument } from "../../shared/models/banks.model.js";
import qs from "qs";
import { OPMetadata, TokenResponse } from "../../shared/auth-server/interfaces.js";
import { PostTokenPreAuthorizedCodeDto } from "src/shared/auth-server/index.js";
import DecryptDto, { MockDecryptDto } from "../admin/dto/decrypt.dto.js";
import { getPublicKeyJWK_fromDID } from "./utils/didresolver.js";
import { getResolver as getEbsiDidResolver } from "@cef-ebsi/ebsi-did-resolver";
import { getResolver as getKeyDidResolver } from "@cef-ebsi/key-did-resolver";

type EbsiVerifiableAttestations = EbsiVerifiableAttestation20221101 | EbsiVerifiableAttestation202401;
//type LevelIssuer = Level<LevelDbKeyIssuer, LevelDbObjectIssuer>;



@Injectable()
export class TntService /*implements OnModuleInit, OnModuleDestroy*/ {

  private readonly logger = new Logger(TntService.name);
 // private ebsiEnvConfig: EbsiEnvConfiguration;

 // private db: Level<LevelDbKeyIssuer, LevelDbObjectIssuer>;

  //private admindb: Level<LevelDbKey, LevelDbObject>

  private readonly authUri: string;
  private readonly  StatusListID: string;
  private readonly IsVCRevokable: Boolean;
  private readonly issuerUri: string;
  private readonly serverUrl: string;

  private readonly backEndUrl: string;
  private readonly opMode: string;
  private readonly orgName: string;
   frontEndURL: string;

  LoginRequired: boolean;
  LoginRequiredOpenID: boolean;
  IdentificationRequired: boolean;
  WalletUrl: string;
  //private readonly IssuerUrl: string;
  SupportedVC: string;
  vcins_mode: string;
  //private readonly RequiredVCs: Array<string>;

  /**
   * Auth  ES256 private key (hex)
   */
  private readonly authPrivateKeyHex: string;


  /**
   * Issuer  ES256 private key (hex)
   */
  private readonly issuerPrivateKeyHex: string;


  private issuerKeyPair: Record<"ES256" | "ES256K", KeyPair | undefined>;

  /**
   * Issuer  DID (as registered in the DIDR and TIR)
   */
  private readonly issuerDid: string;

  /**
   * Issuer  kid (must refer to a verification method in the DID Document)
   */
  private readonly issuerKid: string;
  private readonly issuerKides256k: string;

  /**
   * Issuer  accreditation (URL of the attribute in TIR v4)
   */
  private readonly issuerAccreditationUrl: string;

   /**
   * Issuer  proxy URL
   */
   private readonly issuerProxyUrl: string;

  /**
   * EBSI DID v1 Resolver
   */
  private readonly ebsiResolver: Resolver;
  private readonly didkeyResolver: Resolver;
  /**
   * Key DID v1 Resolver
   */
  private readonly keyResolver: Resolver;

  /**
   * Request timeout
   */
  private readonly timeout: number;

  /**
   * EBSI Authority
   */
  private readonly ebsiAuthority: string;

  /**
   * EBSI VA schema URI
   */
  private readonly authorisationCredentialSchema: string;

  /**
   * PDA1 schema URI
   */
  private readonly pda1CredentialSchema: string;

  /**
   * Status List 2021 schema UIR
   */
  private readonly statusList2021CredentialSchemaUrl: string;

  /**
   * DIDR API /identifiers endpoint
   */
  private readonly didRegistryApiUrl: string;

  /**
   * DIDR API /jsonrpc endpoint
   */
  private readonly didRegistryApiJsonrpcUrl: string;

  /**
   * TIR API /issuers endpoint
   */
  private readonly trustedIssuersRegistryApiUrl: string;


  private readonly authorisationApiUrl: string;

  /**
   * TIR API /jsonrpc endpoint
   */
  private readonly trustedIssuersRegistryApiJsonrpcUrl: string;

  /**
   * TPR API /users endpoint
   */
  private readonly trustedPoliciesRegistryApiUrl: string;

  /**
   * Ledger API /besu endpoint
   */
  private readonly ledgerApiUrl: string;

  /**
   * Issuer 's authorization_endpoint when acting as a client
   */
  private clientAuthorizationEndpoint: string;
  private readonly domain: string;
  
  private readonly pex: PEXv2;

  private authKeyPair?: KeyPair;

  constructor(
    configService: ConfigService<ApiConfig, true>,
   
    private ebsiAuthorisationService: EBSIAuthorisationService,
    // private dataStoreService: DataStoreService,
    // private logsService: LogsService,
    
   
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  
    @InjectModel(Bank.name) private bankModel: Model<BanksDocument>,

  ) {

    this.pex = new PEXv2();
    this.domain = configService.get<string>("domain");
    //this.ebsiEnvConfig = configService.get("ebsiEnvConfig", { infer: true });
    this.IdentificationRequired = configService.get<boolean>("identificationRequired");
    this.LoginRequired = configService.get<boolean>("loginRequired");
    this.LoginRequiredOpenID = configService.get<boolean>("loginRequiredOpenID");
    this.WalletUrl = configService.get<string>("walletUrl");
    this.SupportedVC = configService.get<string>("supportedVC");
    this.IsVCRevokable = configService.get<boolean>("isVCRevokable");
    this.StatusListID = configService.get<string>("statusListId");
   
    this.frontEndURL = configService.get<string>("frontEndUrl");
    this.vcins_mode = configService.get<string>("vcins_mode");
    this.backEndUrl = configService.get<string>("backEndUrl");
    this.opMode = configService.get<string>("opMode");
    this.orgName = configService.get<string>("orgName");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    this.authUri = `${this.backEndUrl}${apiUrlPrefix}/auth`;
    this.issuerUri = `${this.backEndUrl}${apiUrlPrefix}/tnt`;
    this.serverUrl = `${this.backEndUrl}${apiUrlPrefix}/tnt`;
    this.authPrivateKeyHex =
      configService.get<string>("authPrivateKey");
    this.issuerPrivateKeyHex = configService.get<string>(
      "issuerPrivateKey"
    );
    this.issuerKid = configService.get<string>("issuerKid");
    this.issuerKides256k = configService.get<string>("issuerKides256k");
    [this.issuerDid] = this.issuerKid.split("#") as [string];
    this.issuerAccreditationUrl = configService.get<string>(
      "issuerAccreditationUrl"
    );
    this.issuerProxyUrl = configService.get<string>("issuerProxyUrl");
    this.didRegistryApiUrl = configService.get<string>("didRegistryApiUrl");
    this.didRegistryApiJsonrpcUrl = configService.get<string>(
      "didRegistryApiJsonrpcUrl"
    );
    this.trustedIssuersRegistryApiUrl = configService.get<string>(
      "trustedIssuersRegistryApiUrl"
    );

    this.authorisationApiUrl = configService.get<string>(
      "authorisationApiUrl"
    );
    this.trustedIssuersRegistryApiJsonrpcUrl = configService.get<string>(
      "trustedIssuersRegistryApiJsonrpcUrl"
    );
    this.trustedPoliciesRegistryApiUrl = configService.get<string>(
      "trustedPoliciesRegistryApiUrl"
    );
    this.ledgerApiUrl = configService.get<string>("ledgerApiUrl");
    // this.ebsiResolver = new Resolver(
    //   getResolver()  // getEbsiDidResolver({ registry: this.didRegistryApiUrl })
    // );
    this.keyResolver = new Resolver();  //new Resolver(getKeyDidResolver());
    this.timeout = configService.get<number>("requestTimeout");
    this.ebsiAuthority = configService
      .get<string>("domain")
      .replace(/^https?:\/\//, ""); // remove http protocol scheme
    this.authorisationCredentialSchema = configService.get<string>(
      "authorisationCredentialSchema"
    );
    this.pda1CredentialSchema = configService.get<string>(
      "pda1CredentialSchema"
    );
    this.statusList2021CredentialSchemaUrl = configService.get<string>(
      "statusList2021CredentialSchemaUrl"
    );
    this.clientAuthorizationEndpoint = "openid:";

    this.issuerKeyPair = {
      ES256: undefined,
      ES256K: undefined,
    };

    const resolverConfig = {
      registry: "https://api-pilot.ebsi.eu/did-registry/v5/identifiers",
    };
    
    this.ebsiResolver = new Resolver(getEbsiDidResolver(resolverConfig));
    this.didkeyResolver = new Resolver(getKeyDidResolver());

  }

   /**
   * Load Auth 's key pair from environment.
   *
   * @returns The private and public key JWKs (including "kid")
   */
   async getAuthKeyPair() {
    if (!this.authKeyPair) {
      this.authKeyPair = await getKeyPair(this.authPrivateKeyHex);
    }

    return this.authKeyPair;
  }

  async  getIssuerKeyPair(alg: "ES256" | "ES256K"): Promise<KeyPair> {
    let keyPair = this.issuerKeyPair[alg];
    if (keyPair === undefined) {
      keyPair = await getKeyPair(this.issuerPrivateKeyHex, alg);
      this.issuerKeyPair[alg] = keyPair;
    }
    //YC remove this
   // console.log(`issuer key pair->${JSON.stringify(keyPair)}`);
    console.log(`issuer key pair->`);
    return keyPair;
  }

  async getJwks(): Promise<JsonWebKeySet> {
    const { publicKeyJwk } = await this.getIssuerKeyPair("ES256");

    // Return JWKS
    return {
      keys: [publicKeyJwk],
    };
  }

  async adminWalletCab(): Promise<Object> {
    //throw new Error("Method not implemented.");
    //update config with new did and privatekeyHex and reload
    //or manually update config and restart server
    let verification: { id: string; alg:string|undefined }[] | undefined;
    let verificationMethod;
    let authentication:(string | VerificationMethod)[] | undefined;
    let assertionMethod: (string | VerificationMethod)[] | undefined;
    let capabilityInvocation: (string | VerificationMethod)[] | undefined;
    let DIDdocument;
    let diddocument: AxiosResponse<DIDDocument>;
    try {
      const did = this.issuerDid;
      diddocument = await axios.get(
        `${this.didRegistryApiUrl}/${did}`
      );
      ({ verificationMethod,authentication,assertionMethod,capabilityInvocation}  = diddocument.data);
     
    } catch (error) {
      //console.error(error); 
      // return {
      //   success: false,
      //   errors: [`Error connecting to EBSI DIR: ${getErrorMessage(error)}`],
      // };
    
    }

   
   verification = verificationMethod && verificationMethod.map((item)=>( {
    id: item.id,
    alg:  item.publicKeyJwk?.crv 
    }));
   
   
    if (!verification) verification = [];
    if (!authentication) authentication = [];
    if (!assertionMethod) assertionMethod = [];
    if (!capabilityInvocation) capabilityInvocation =[];

    DIDdocument = {verificationMethod:verification,authentication,assertionMethod,capabilityInvocation}

    type TIRAttributes = {
      attributes: {hash:string, issuerType:string, tao:string, rootTao:string, body:string}[]
    }
    let tirResponse: AxiosResponse<TIRAttributes>;
    let attributes: {hash:string,issuerType:string, tao:string, rootTao:string,body:string}[] = [];
    try {
      const did = this.issuerDid;
      tirResponse = await axios.get(
        `${this.trustedIssuersRegistryApiUrl}/${did}`
      );
      ({attributes}  = tirResponse.data  );
     
    } catch (error) {
      //console.error(error); 
      // return {
      //   success: false,
      //   errors: [`Error connecting to EBSI TIR: ${getErrorMessage(error)}`],
      // };
    
    }

    const getResAttribute =(vcjwt: string|undefined) => {

      if (vcjwt) {
        
        try{
        const VerifiableAccreditationToAccreditPayload = decodeJwt(vcjwt) ;
        const VerifiableAccreditationToAccreditvc = VerifiableAccreditationToAccreditPayload['vc'] as EbsiVerifiableAccreditation;
     //   const verifiableAccreditationToAccreditReservedAttributeId = VerifiableAccreditationToAccreditvc.credentialSubject.reservedAttributeId;
       const accreditedFor= VerifiableAccreditationToAccreditvc.credentialSubject.accreditedFor ?
                          VerifiableAccreditationToAccreditvc.credentialSubject.accreditedFor[0]?.types : null ;
        const termsOfUse = VerifiableAccreditationToAccreditvc.termsOfUse as {id:String;type:string};
       // console.log('reservedAtttrId->'+verifiableAccreditationToAccreditReservedAttributeId);
        return { 
          accreditedFor: accreditedFor ? accreditedFor : [],
          termsOfUse: termsOfUse ? termsOfUse.id : null,
         // reservedAttributeId: verifiableAccreditationToAccreditReservedAttributeId ? verifiableAccreditationToAccreditReservedAttributeId : null
        }
        } catch(e) {
          console.log("error decoding accrVC"+e);
          return null;
        } 
        
      } else
      return null;
    }

    const fileteredAttr = attributes.map((item)=>( {
      attributeId: item.hash, 
      issuerType:item.issuerType,
      tao: item.tao,
      rootTao: item.rootTao,
     // accreditationVCexists: item.body ? 'yes' : 'no',
      accreditationVC: getResAttribute(item.body)
    }));
    
    return {
      Domain:  this.domain,
      DID: this.issuerDid,
      DIDKid_ES256: this.issuerKid,
      DIDKid_ES256K: this.issuerKides256k,
      DID_Registry_API_Url: this.didRegistryApiUrl,
      TIR_Registry_API_Url: this.trustedIssuersRegistryApiUrl,
      Accreditation_Url: this.issuerAccreditationUrl,
      DID_Registry:DIDdocument,
      TIR_Registry: fileteredAttr,
    }
  }


  async getOnBoard(walletDIDdto: walletdidDto){

    if (!walletDIDdto.walletDID) {
      this.logger.error('walletDID must be set for PRE-AUTH');
      throw new BadRequestError(
       'walletDID must be set for PRE-AUTH'
      );
     }

     if (this.opMode !== "CBC") {
      this.logger.error('only available to CBC');
      throw new BadRequestError(
       'only available to CBC'
      );
     }
 
    let walletDID = walletDIDdto.walletDID;

    let credentialoffer = JSON.parse(JSON.stringify(credential_offer)) as CredentialOfferPayload;

    credentialoffer.credential_issuer = this.issuerUri;


    if (credentialoffer.credentials[0]) {
     credentialoffer.credentials[0].types.push("VerifiableAuthorisationToOnboard");
    }
  
    //const wallet_didkey = walletDID;
    const keyPair = await this.getIssuerKeyPair("ES256");
    const signingKey = await importJWK(keyPair.privateKeyJwk, "ES256");

 
      // const pin = getUserPin(wallet_didkey);
      // console.log(`pin->${pin}`);

      const preAuthorizedCode = await new SignJWT({
        client_id: walletDID,
        authorization_details: [
          {
            type: "openid_credential",
            format: "jwt_vc",
            locations: [this.issuerUri],
            types: credentialoffer.credentials[0]?.types
            // types: [
            //   "VerifiableCredential",
            //   "VerifiableAttestation",
            //   "VerifiableAuthorisationToOnboard"
            // ],
          },
        ],
      })
        .setProtectedHeader({
          typ: "JWT",
          alg: "ES256",
          kid: keyPair.publicKeyJwk.kid,
        })
        .setIssuedAt()
        .setExpirationTime("5m")
        .setIssuer(this.issuerUri)
        .setAudience(this.authUri)
        .setSubject(walletDID)
        .sign(signingKey);

      credentialoffer.grants=
       {
        "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
          "pre-authorized_code": preAuthorizedCode,
          user_pin_required: true,
        },
      };
   

   const ttl = 180_000;
   
  

   const credentialOfferEndpoint = 'openid-credential-offer://'; 

 

    const location = `${credentialOfferEndpoint}?${new URLSearchParams({
      credential_offer: JSON.stringify(credentialoffer),
    } satisfies CredentialOffer).toString()}`;

   

   //const location = await this.createOfferFor(walletDID,"onboard");
   return location

  }

  
 async banks(): Promise<BanksInfo> {
  
  if (this.opMode !== "CBC") {
    this.logger.error('only available to CBC');
    throw new BadRequestError(
     'only available to CBC'
    )
  }

  const data = await this.bankModel.find({bankName : {$exists: true},bankUrl : {$exists: true}}).exec();
  if (!data || data.length == 0) {
    return [];
  }

  const result:BanksInfo = [];
  data.map((element: Bank)=> {
 
   result.push(
       
              {
              bankName: element.bankName,
              bankDID: element.bankDID,
              bankUrl: element.bankUrl
              }
           
             )
           
 
  });

return result;



  
}
  
  async adminReqOnboard(CBCurl: string, pin: string): Promise<CheckResult> {

    const response = await this.getAuthVC(CBCurl,pin);
    if (!(typeof response === 'string'))
      return response;
   
      const credential = response;
     // const credential = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRpZDplYnNpOnoyMml3YUZIRnJBYWpSanlvRmN6dEY5WiN6RVpHRFNKcHlIYzJtTjNBUEJSdldoZG5QZE1ZcWFTQ1J4ME5tRkk1c0hFIiwidHlwIjoiSldUIn0.eyJleHAiOjE3MjYwNjE5NDYsImlhdCI6MTcyNTk3NTU0NiwiaXNzIjoiZGlkOmVic2k6ejIyaXdhRkhGckFhalJqeW9GY3p0RjlaIiwianRpIjoidXJuOnV1aWQ6OWM2NmQ3ZTItMjZjOC00NDQ2LTkyM2YtMWQ2NWE3ZDA0MjQ3IiwibmJmIjoxNzI1OTc1NTQ2LCJzdWIiOiJkaWQ6ZWJzaTp6MjZEbnhUbjFUS1Z6cTNqMXBzeGhpTkQiLCJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJjcmVkZW50aWFsU2NoZW1hIjp7ImlkIjoiaHR0cHM6Ly9hcGktcGlsb3QuZWJzaS5ldS90cnVzdGVkLXNjaGVtYXMtcmVnaXN0cnkvdjIvc2NoZW1hcy96M01nVUZVa2I3MjJ1cTR4M2R2NXlBSm1uTm16REZlSzVVQzh4ODNRb2VMSk0iLCJ0eXBlIjoiRnVsbEpzb25TY2hlbWFWYWxpZGF0b3IyMDIxIn0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmVic2k6ejI2RG54VG4xVEtWenEzajFwc3hoaU5EIn0sImV4cGlyYXRpb25EYXRlIjoiMjAyNC0wOS0xMVQxMzozOTowNi4yMzM5MjMzMDJaIiwiaWQiOiJ1cm46dXVpZDo5YzY2ZDdlMi0yNmM4LTQ0NDYtOTIzZi0xZDY1YTdkMDQyNDciLCJpc3N1YW5jZURhdGUiOiIyMDI0LTA5LTEwVDEzOjM5OjA2LjIzMzkyMzMwMloiLCJpc3N1ZWQiOiIyMDI0LTA5LTEwVDEzOjM5OjA2LjIzMzkyMzMwMloiLCJpc3N1ZXIiOiJkaWQ6ZWJzaTp6MjJpd2FGSEZyQWFqUmp5b0ZjenRGOVoiLCJ0ZXJtc09mVXNlIjp7ImlkIjoiaHR0cHM6Ly9hcGktcGlsb3QuZWJzaS5ldS90cnVzdGVkLWlzc3VlcnMtcmVnaXN0cnkvdjQvaXNzdWVycy9kaWQ6ZWJzaTp6MjJpd2FGSEZyQWFqUmp5b0ZjenRGOVovYXR0cmlidXRlcy8weGExOTk3MmQwODdkNWU4NTFlY2JjNjEyMWZmM2FjMmZkNjk5NWUxZTliZThiNGQ2OWMzNDMwZWEzODEyMzYxMWUiLCJ0eXBlIjoiSXNzdWFuY2VDZXJ0aWZpY2F0ZSJ9LCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF0dGVzdGF0aW9uIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb25Ub09uYm9hcmQiXSwidmFsaWRGcm9tIjoiMjAyNC0wOS0xMFQxMzozOTowNi4yMzM5MjMzMDJaIiwidmFsaWRVbnRpbCI6IjIwMjQtMDktMTFUMTM6Mzk6MDYuMjMzOTIzMzAyWiJ9fQ.Y0yfj6-qShBSLo-W7q32t_Fq7gbbJog-3X7uQxCVdJqhGwDmoflx-CMtKVgmJZ8ND_nsaURyD-M-zpRCT15K0g";
      console.log('vconboard->'+credential);

      let verifiedCredential: EbsiVerifiableAttestations
      const options: VerifyCredentialOptions = {
        ebsiAuthority:this.ebsiAuthority,
        timeout: this.timeout,
        ebsiEnvConfig: {
          didRegistry:this.didRegistryApiUrl,
          trustedIssuersRegistry:this.trustedIssuersRegistryApiUrl,
          trustedPoliciesRegistry:this.trustedPoliciesRegistryApiUrl
        },
      };
      try {
        verifiedCredential = (await verifyCredentialJwt(credential, options)) ;
      } catch (err) {
        return {
          success: false,
          errors: [
            `OnBoard Auth Credential is not valid: ${getErrorMessage(err)}`,
            ...getErrorDetails(err, "Credential"),
          ],
        };
      }

      if (verifiedCredential.type[2]!=='VerifiableAuthorisationToOnboard') {
        return {
          success: false,
          errors: [
            'received VC not of type VerifiableAuthorizationToOnboard'
          ],
        };
      }
      const result = await this.registerDID(credential);  //register DIDdocument
      return result;
 

   
  }


  async adminMockDecryptDocs(mockDecryptDto: MockDecryptDto): Promise<CheckResult|Buffer> {

    const {offchainFile,encEncKey,walletDID} = mockDecryptDto;

    //decrypt encrypted encryption key

    const publicKeyJwkWallet = await getPublicKeyJWK_fromDID(walletDID,this.didkeyResolver,this.ebsiResolver);

    if (!publicKeyJwkWallet) {
      console.log('could not get publickey from did');
      return {
        success: false,
        errors: [
          'could not get publickey from did'
        ],
      };
    }

    console.log('public wallet->'+JSON.stringify(publicKeyJwkWallet));

    let decryptionKey;
    const {privateKeyJwk} = await this.getIssuerKeyPair("ES256");
    if (privateKeyJwk) {
      
      decryptionKey = await this.decryptEncryptionKey(
        encEncKey,
        publicKeyJwkWallet,
        privateKeyJwk
      )
    } else {
      console.log('no issuer key pair');
    }
    console.log('decryption Key->'+decryptionKey);

    //use decryptionKey to decrypt the encrypted docs in off-chain
    //import key first
    let docsDecryptionKey;

    if (decryptionKey) {
        docsDecryptionKey = await crypto.subtle.importKey(
          "raw",
          decryptionKey,
      
          "AES-GCM",
          true,
          ["decrypt"]
        );
    } else {

      return {
        success: false,
        errors: [
          'could not get decryption key'
        ],
      };
    }

    //get encrypted doc from off-chain

  let encryptedDoc;
   try {
    
    //changed from axios.get
     encryptedDoc = await fetch(`http://localhost:3000/download?file=${offchainFile}`);
     //console.log('encypted doc data length->'+encryptedDoc.length);
     
   } catch (e) {
    console.log('error doesnling file ');
    return {
      success: false,
      errors: [
        `error downloading encrypted doc ${e}`
      ],
    };
   }

   if (encryptedDoc && !encryptedDoc.ok) {
    console.log('fetch error->'+JSON.stringify(await encryptedDoc.json()));
    return {
      success: false,
      errors: [
        `error downloading encrypted doc`
      ],
    };
   }

   if (encryptedDoc && encryptedDoc.ok ) {
      
    console.log('starting decryption');
    const dataBuffer = await encryptedDoc.arrayBuffer();
    //const dataBuffer = await encryptedDoc.data.arrayBuffer();
   // const dataBuffer = this.stringToArrayBuffer(encryptedDoc.data);
  //  console.log('encypted doc data length->'+dataBuffer.length);
    let cleartext: ArrayBuffer;
    const iv = Buffer.from("KYC-encryption");
    const cipher = Buffer.from(dataBuffer);
    try {
     cleartext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        docsDecryptionKey,
        cipher,
      );
      console.log('decryption completed');
    //   console.log('decrypted->'+cleartext.byteLength);
    } catch (e) {

      return {
        success: false,
        errors: [ 
          `could not decrypt KYC doc ${e}`
        ],
      };
    }
    if (cleartext) {
    const clearDataBuffer = Buffer.from(cleartext);
   // const clearText = clearDataBuffer.toString('binary');
   //console.log('clearTExt->'+clearDataBuffer);
    return clearDataBuffer;

    }
    
   }

   return {
    success: false,
    errors: [
      `something went wrong`
    ],
   }
    
  }
  
  

  async adminDecryptDocs(decryptDto: DecryptDto): Promise<CheckResult|Buffer> {

    const {documentId, eventId} = decryptDto;

    const {sender, kycEvent, success} = await this.getEvent(documentId, eventId);

    //event sender is the wallet es256k did
    //encryption was perfromed with es256 wallet private key. -> Need wallet es256 public key for decryption

    if (!sender || !success) {
      return {
        success: false,
        errors: [
          'could not get event data'
        ],
      };
    }

    if (kycEvent.eventType != "KYC_docs_shared") {

      return {
        success: false,
        errors: [
          `invalid event type -> ${kycEvent.eventType}`
        ],
      };
    }

    //decrypt encrypted encryption key

    const kycSharedEvent = kycEvent as KYC_SHARED;

    if (!kycSharedEvent.encryptedEncryptionKey) {
      return {
        success: false,
        errors: [
          `encr encr key is missing from event`
        ],
      };
    }

    if (!kycSharedEvent.offchainFilepath) {
      return {
        success: false,
        errors: [
          `offchain file path is missing from event`
        ],
      };
    }

    if (!kycSharedEvent.es256Did) {
      return {
        success: false,
        errors: [
          `es256 did is missing from event`
        ],
      };
    }
    const publicKeyJwkWallet = await getPublicKeyJWK_fromDID(kycSharedEvent.es256Did,this.didkeyResolver,this.ebsiResolver);

    if (!publicKeyJwkWallet) {
      console.log('could not get publickey from did');
      return {
        success: false,
        errors: [
          'could not get publickey from did'
        ],
      };
    }

    console.log('public wallet->'+JSON.stringify(publicKeyJwkWallet));

    let decryptionKey;
    const {privateKeyJwk} = await this.getIssuerKeyPair("ES256");
    if (privateKeyJwk) {
      
      decryptionKey = await this.decryptEncryptionKey(
        kycSharedEvent.encryptedEncryptionKey,
        publicKeyJwkWallet,
        privateKeyJwk
      )
    } else {
      console.log('no issuer key pair');
    }
    console.log('decryption Key->'+decryptionKey);

    //use decryptionKey to decrypt the encrypted docs in off-chain
    //import key first
    let docsDecryptionKey;

    if (decryptionKey) {
        docsDecryptionKey = await crypto.subtle.importKey(
          "raw",
          decryptionKey,
      
          "AES-GCM",
          true,
          ["decrypt"]
        );
    } else {

      return {
        success: false,
        errors: [
          'could not get decryption key'
        ],
      };
    }

    //get encrypted doc from off-chain

  let encryptedDoc;
   try {
    
    //changed from axios.get
     encryptedDoc = await fetch(`http://localhost:3000/download?file=${kycSharedEvent.offchainFilepath}`);
     //console.log('encypted doc data length->'+encryptedDoc.length);
     
   } catch (e) {
    console.log('error doesnling file ');
    return {
      success: false,
      errors: [
        `error downloading encrypted doc ${e}`
      ],
    };
   }

   if (encryptedDoc && !encryptedDoc.ok) {
    console.log('fetch error->'+JSON.stringify(await encryptedDoc.json()));
    return {
      success: false,
      errors: [
        `error downloading encrypted doc`
      ],
    };
   }

   if (encryptedDoc && encryptedDoc.ok ) {
      
    console.log('starting decryption');
    const dataBuffer = await encryptedDoc.arrayBuffer();
    //const dataBuffer = await encryptedDoc.data.arrayBuffer();
   // const dataBuffer = this.stringToArrayBuffer(encryptedDoc.data);
  //  console.log('encypted doc data length->'+dataBuffer.length);
    let cleartext: ArrayBuffer;
    const iv = Buffer.from("KYC-encryption");
    const cipher = Buffer.from(dataBuffer);
    try {
     cleartext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        docsDecryptionKey,
        cipher,
      );
      console.log('decryption completed');
    //   console.log('decrypted->'+cleartext.byteLength);
    } catch (e) {

      return {
        success: false,
        errors: [ 
          `could not decrypt KYC doc ${e}`
        ],
      };
    }
    if (cleartext) {
    const clearDataBuffer = Buffer.from(cleartext);
   // const clearText = clearDataBuffer.toString('binary');
   //console.log('clearTExt->'+clearDataBuffer);
    return clearDataBuffer;

    }
    
   }

   return {
    success: false,
    errors: [
      `something went wrong`
    ],
   }
    
  }
  

  async  decryptEncryptionKey(
    cipherEncHexKey:string,
    publicEncryptionKeyJWK: JWK,
    privateEncryptionKeyJWK: JWK
  ): Promise<ArrayBuffer> {

    const iv = Buffer.from("KYC-encryption");

    console.log('before import keyWalletPublic');
    const keyWalletPublic = await crypto.subtle.importKey(
        "jwk",
        publicEncryptionKeyJWK,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
       // ['sign']
       []
      ) 

      console.log('after keyWalletPublic');

    const keyIssuerPrivate = await crypto.subtle.importKey(
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
const decryptedEncKey = await crypto.subtle.decrypt({
    "name": "AES-GCM",
    "iv": iv
}, key, uint8Array);

console.log('decrypted key buffer->'+decryptedEncKey);
// // The humans decode the message into human readable text...
// var decoded = new TextDecoder().decode(decryptedEncKey);

// // // The humans output the message to the console and gasp!
//  console.log('decrypted key decoded->'+decoded);

 //use decrypted enckey to decrypt the off-chain docs
 console.log('key length='+Buffer.from(decryptedEncKey).length);


 return decryptedEncKey;

  }


  //returns error checkresult or vc
  async getAuthVC(CBCurl:string,pin:string) 
  : Promise<CheckResult | string>
  
  {

     
        let offer;
        let response: AxiosResponse<unknown>;
        try {
         
          response = await axios.get(`${CBCurl}?walletDID=${this.issuerDid}`, 
            {timeout: 8000,})
        
        } catch (err) {
      
          return {
            success: false,
            errors: [`error from CBC: ${getErrorMessage(err)}`],
          };
        }

        if (!response.data) {
          return {
            success: false,
            errors: ["empty response from CBC."],
          };
        }

    offer = response.data as string;
  
    if (!offer.startsWith('openid-credential-offer'))
      return {
        success: false,
        errors: ['response from CBC is not a credenial-offer'],
      };

    
      const { search } = new URL(offer);

      const parsedCredentialOffer = qs.parse(
        search.slice(1)
      ) as unknown as CredentialOffer;

      let credentialOfferPayload;
   //   let response: AxiosResponse<unknown>;

      if (parsedCredentialOffer.credential_offer) {
          credentialOfferPayload = JSON.parse(
          parsedCredentialOffer.credential_offer
        ) as CredentialOfferPayload;
      } else if (parsedCredentialOffer.credential_offer_uri) {
        //get it
        const offerUri = JSON.parse(parsedCredentialOffer.credential_offer_uri) as unknown as {credential_offer_uri:string};
        console.log('offeruri->'+offerUri.credential_offer_uri);

        try {
          response = await axios.get(offerUri.credential_offer_uri, 
            {timeout: 8000,}
          );
          credentialOfferPayload = response.data as CredentialOfferPayload;;
        } catch (err) {
        //  console.log(err);
          //logAxiosRequestError(err, logger);
          return {
            success: false,
            errors: [`error from CBC: ${getErrorMessage(err)}`],
          };
        }
    
      } else {
        return   {
          success: false,
          errors: ['response from CBC not a valid credential-offer'],
        };
      }

      console.log('credential-offer-payload->'+JSON.stringify(credentialOfferPayload));

      let issuerUri = credentialOfferPayload.credential_issuer;
      let offeredCredentials = credentialOfferPayload.credentials[0]?.types;
      console.log("cretype->"+offeredCredentials);
      if ( !offeredCredentials?.includes('VerifiableAuthorisationToOnboard')) {
        return   {
          success: false,
          errors: ['VC Offered should be VerifiableAuthorisationToOnboard'],
        };
      };

   

      let grants = credentialOfferPayload.grants as unknown as {
        "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
          "pre-authorized_code": string,
          user_pin_required: true,
        },
      };

      if (!grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"]["pre-authorized_code"]) {
        return   {
          success: false,
          errors: ['VC Offered not pre-authorized'],
        };
      }

   

      // GET /issuer-mock/.well-known/openid-credential-issuer
      response = await axios.get(
        `${issuerUri}/.well-known/openid-credential-issuer`
      );

     
      const credentialIssuerConfig = response.data as CredentialIssuerMetadata;

      // GET AUthorization Server (Auth Mock) /.well-known/openid-configuration
      if (!credentialIssuerConfig.authorization_server)
        return   {
          success: false,
          errors: ['could not get authorization_server uri'],
        };
      const authorizationServerUri = 
        credentialIssuerConfig.authorization_server
    
      response = await axios.get(
        `${authorizationServerUri}/.well-known/openid-configuration`
      );

    
      const authConfig = response.data as OPMetadata;

      // POST /auth-mock/token
      const preAuthorizedCode = grants[
        "urn:ietf:params:oauth:grant-type:pre-authorized_code"
      ]?.["pre-authorized_code"] as string;

      const tokenRequestQueryParams = {
        grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
        "pre-authorized_code": preAuthorizedCode,
        user_pin: pin,
      } satisfies PostTokenPreAuthorizedCodeDto;

      try {
      response = await axios.post(
        authConfig.token_endpoint,
        new URLSearchParams(tokenRequestQueryParams).toString(),
        {
          timeout: 16000,
          headers: { "content-type": "application/x-www-form-urlencoded" },
        
        }
      
      )
    } catch (err) {
     const axioserr = err as AxiosError;
     let message = 'error from token endpoint';
     console.log(axioserr.response?.data);
     if (axioserr.response?.data) {
      message = message+ JSON.stringify(axioserr.response?.data)
     }
     return   {
      success: false,
      errors: [message],
    };
    }
       

     
      const { access_token: accessToken, c_nonce: cNonce } =
        response.data as TokenResponse;
      
        const keyPair = await this.getIssuerKeyPair("ES256");
        const signingKey = await importJWK(keyPair.privateKeyJwk, "ES256");
        const kid =  keyPair.publicKeyJwk.kid;
      // POST /issuer-mock/credential
      const proofJwt = await new SignJWT({
        nonce: cNonce,
      })
        .setProtectedHeader({
          typ: "openid4vci-proof+jwt",
          alg: "ES256",
          kid: this.issuerKid,
        })
        .setIssuer(this.issuerDid)
        .setAudience(issuerUri)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(signingKey);

      const credentialRequestParams = {
        types: offeredCredentials,
        // types: [
        //   "VerifiableCredential",
        //   "VerifiableAttestation",
        //   "VerifiableAuthorisationToOnboard",
        // ],
        format: "jwt_vc",
        proof: {
          proof_type: "jwt",
          jwt: proofJwt,
        },
      };

      try {
      response = await axios.post(
        credentialIssuerConfig.credential_endpoint,
        credentialRequestParams,
        {
          timeout: 16000,
          headers: { authorization: `Bearer ${accessToken}` },
        }
      
      )
    } catch (err) {

      const axioserr = err as AxiosError;
      let message = 'error from credential endpoint';
      console.log(axioserr.response?.data);
      if (axioserr.response?.data) {
       message = message + JSON.stringify(axioserr.response?.data)
      }
      return   {
       success: false,
       errors: [message],
     };

    }

      const { credential } = response.data as CredentialResponse;
     

      return credential;

  }

    
  async registerDID(onboardVC:string): Promise<CheckResult> {

 
    let jwtvc;
   
    jwtvc = onboardVC
   
    const keyPairES256 = await this.getIssuerKeyPair("ES256");
   // const publicKeyHex256 = getPublicKeyHex(keyPairES256.publicKeyJwk);
    const keyPairES256K = await this.getIssuerKeyPair("ES256K"); 

     const signerES256K: EbsiIssuer = {
      did: this.issuerDid,
      kid: this.issuerKides256k,
      alg: "ES256K",
      publicKeyJwk: keyPairES256K.publicKeyJwk,
      privateKeyJwk: keyPairES256K.privateKeyJwk,
    };

    let accessToken: string;
    try {
      accessToken = await this.ebsiAuthorisationService.getAccessToken(
      "didr_invite",
      signerES256K,
      [jwtvc]
    );
  } catch (err) {
    const error = getErrorMessage(err);
    if (error.includes('already registered')) {
      console.log('failed to get didr-invite auth token. already registered in DID'); //continue
      accessToken = '';
    } else 
    return {
      success: false,
      errors: [
        `Failed to get DID Registry invite access token: ${error}`,
      ],
    };
  
  }

    // Build unsigned transaction
    const wallet = new ethers.Wallet(this.issuerPrivateKeyHex);
    const now = Math.floor(Date.now() / 1000);
    const in6months = now + 6 * 30 * 24 * 3600;
    let responseBuild: AxiosResponse<{
      result: UnsignedTransaction;
    }>;

    if (accessToken!='') {
    console.log('inserting DID ES256K. public key->'+wallet.publicKey+"<-");
    console.log('jsonUrl->'+this.didRegistryApiJsonrpcUrl);
    console.log('from->'+wallet.address);
    try {
      responseBuild = await axios.post(
        this.didRegistryApiJsonrpcUrl,
        {
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [
            {
              from: wallet.address,
              did: this.issuerDid,
              baseDocument: JSON.stringify({
                "@context": [
                  "https://www.w3.org/ns/did/v1",
                  "https://w3id.org/security/suites/jws-2020/v1",
                ],
              }),
              vMethodId: "keys-1",
              publicKey: wallet.publicKey,
              // publicKey: `0x${Buffer.from(
              //   JSON.stringify(keyPairES256K.publicKeyJwk)
              // ).toString("hex")}`,
              isSecp256k1: true,
              notBefore: now,
              notAfter: in6months,
            },
          ],
         id: 1,
        },
        {
          headers: { authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error) {
      logAxiosRequestError(error, this.logger);
      return {
        success: false,
        errors: [
          `Unable to build the transaction to register the DID document: ${getErrorMessage(
            error
          )}`,
        ],
      };
    }

    
    let unsignedTransaction = responseBuild.data.result;

    let transactionResult = await signAndSendTransaction(
      unsignedTransaction,
      wallet,
      this.didRegistryApiJsonrpcUrl,
      this.logger,
      accessToken
    );

    if (!transactionResult.success) {
      return {
        success: false,
        errors: [
          `Unable to send the transaction to register the DID document: ${getErrorMessage(
            transactionResult.error
          )}`,
        ],
      };
    }

    let { txId } = transactionResult;

    let miningResult = await waitToBeMined(
      this.ledgerApiUrl,
      this.logger,
      txId
    );

    if (!miningResult.success) {
      return {
        success: false,
        errors: [miningResult.error.message],
      };
    }
  }

    // Add ES256 verification method to DID document

    // Get "didr_write" access token
    try {
      accessToken = await this.ebsiAuthorisationService.getAccessToken(
        "didr_write",
        signerES256K
      );
    } catch (err) {
      return {
        success: false,
        errors: [
          `Failed to get DID Registry write access token: ${getErrorMessage(
            err
          )}`,
        ],
      };
    }

    console.log('adding ES256 Verification Method');
    try {
      responseBuild = await axios.post(
        this.didRegistryApiJsonrpcUrl,
        {
          jsonrpc: "2.0",
          method: "addVerificationMethod",
          params: [
            {
              from: wallet.address,
              did: this.issuerDid,
              vMethodId: "keys-3", //only checks the part after last # if it exists.
                                   //if not it appends did at the front
             // publickey: publicKeyHex256,
              publicKey: `0x${Buffer.from(
                JSON.stringify(keyPairES256.publicKeyJwk)
              ).toString("hex")}`,
              isSecp256k1: false,
            },
          ],
          id: 1,
        },
        {
          headers: { authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error) {
      logAxiosRequestError(error, this.logger);
      return {
        success: false,
        errors: [
          `Unable to build the transaction to add an ES256 verification method to the DID document: ${getErrorMessage(
            error
          )}`,
        ],
      };
    }

    let unsignedTransaction2 = responseBuild.data.result;

    let transactionResult2 = await signAndSendTransaction(
      unsignedTransaction2,
      wallet,
      this.didRegistryApiJsonrpcUrl,
      this.logger,
      accessToken
    );

    if (!transactionResult2.success) {
      return {
        success: false,
        errors: [
          `Unable to send the transaction to add an ES256 verification method to the DID document: ${getErrorMessage(
            transactionResult2.error
          )}`,
        ],
      };
    }

    let txId2 = transactionResult2.txId;

    let miningResult2 = await waitToBeMined(this.ledgerApiUrl, this.logger, txId2);

    if (!miningResult2.success) {
      return {
        success: false,
        errors: ['mining error2: '+miningResult2.error.message],
      };
    }

    // Register ES256 verification method as authentication method
    console.log('adding ES256 Verification Relationship -authentication');
    try {
      responseBuild = await axios.post(
        this.didRegistryApiJsonrpcUrl,
        {
          jsonrpc: "2.0",
          method: "addVerificationRelationship",
          params: [
            {
              from: wallet.address,
              did: this.issuerDid,
              name: "authentication",
              vMethodId: "keys-3",
              notBefore: now,
              notAfter: in6months,
            },
          ],
          id: 1,
        },
        {
          headers: { authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error) {
      logAxiosRequestError(error, this.logger);
      return {
        success: false,
        errors: [
          `Unable to build the transaction to register the ES256 verification method as an authentication method: ${getErrorMessage(
            error
          )}`,
        ],
      };
    }

    let unsignedTransaction3 = responseBuild.data.result;

    let transactionResult3 = await signAndSendTransaction(
      unsignedTransaction3,
      wallet,
      this.didRegistryApiJsonrpcUrl,
      this.logger,
      accessToken
    );

    if (!transactionResult3.success) {
      return {
        success: false,
        errors: [
          `Unable to send the transaction to register the ES256 verification method as an authentication method: ${getErrorMessage(
            transactionResult3.error
          )}`,
        ],
      };
    }

    let txId3 = transactionResult3.txId;

    let miningResult3 = await waitToBeMined(this.ledgerApiUrl, this.logger, txId3);

    if (!miningResult3.success) {
      return {
        success: false,
        errors: ['mining error3: '+miningResult3.error.message],
      };
    }

    // Register ES256 verification method as assertionMethod method
    console.log('adding Verification Relationship -assertion method');
    try {
      responseBuild = await axios.post(
        this.didRegistryApiJsonrpcUrl,
        {
          jsonrpc: "2.0",
          method: "addVerificationRelationship",
          params: [
            {
              from: wallet.address,
              did: this.issuerDid,
              name: "assertionMethod",
              vMethodId: "keys-3",
              notBefore: now,
              notAfter: in6months,
            },
          ],
          id: 1,
        },
        {
          headers: { authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error) {
      logAxiosRequestError(error, this.logger);
      return {
        success: false,
        errors: [
          `Unable to build the transaction to register the ES256 verification method as an assertion method: ${getErrorMessage(
            error
          )}`,
        ],
      };
    }

    let unsignedTransaction4 = responseBuild.data.result;

    let transactionResult4 = await signAndSendTransaction(
      unsignedTransaction4,
      wallet,
      this.didRegistryApiJsonrpcUrl,
      this.logger,
      accessToken
    );

    if (!transactionResult4.success) {
      return {
        success: false,
        errors: [
          `Unable to send the transaction to register the ES256 verification method as an assertion method: ${getErrorMessage(
            transactionResult4.error
          )}`,
        ],
      };
    }

    let txId4 = transactionResult4.txId;

    let miningResult4 = await waitToBeMined(this.ledgerApiUrl, this.logger, txId4);

    if (!miningResult4.success) {
      return {
        success: false,
        errors: ['mining error4: '+miningResult4.error.message],
      };
    }

    //await this.cacheManager.del(credentialId);

    return { success: true };

  }

  async postCredential(
    authorizationHeader: string,
    rawRequestBody: unknown
  ): Promise<CredentialResponse | DeferredCredentialResponse> {
   
    const { credentialRequest, accessTokenPayload } =
      await validatePostCredential(
       // this.db as LevelIssuer,
        this.cacheManager,
        this.issuerDid,
        this.issuerUri,
        (
          await this.getAuthKeyPair()
        ).publicKeyJwk,
        this.ebsiResolver,
        this.keyResolver,
        this.timeout,
        authorizationHeader,
        rawRequestBody
      );

      console.log('proof verified ok');

   

    // Store c_nonce to prevent replay attacks
    
    const now = Math.floor(Date.now() / 1000);
   // this.addKeyToCacheManager(dbKey, accessTokenPayload.exp - now); // TTL = remaining time before AT expires

    await this.cacheManager.set(accessTokenPayload.claims.c_nonce, 
      { nonce: accessTokenPayload.claims.c_nonce },
      accessTokenPayload.exp - now);

   const accessToken = authorizationHeader.replace("Bearer ", "");
   const bank = await this.bankModel.findOne({access_token: accessToken }).exec() as Bank;
   if (!bank) {
   
        throw new BadRequestError(
          'invalid access token'
         );
     }

     //issue VerifiableAuthorisationToOnboard vc

     const keyPair = await this.getIssuerKeyPair("ES256"); //YC256
    const {  vcJwt } = await issueCredential(
      this.issuerDid,
      'Central Bank Of Cyprus',
      this.issuerKid,
      keyPair.privateKeyJwk,
      this.issuerAccreditationUrl,
      this.authorisationCredentialSchema,
      {
        ebsiAuthority: this.ebsiAuthority,
        timeout: this.timeout,
        skipAccreditationsValidation: true,
        ebsiEnvConfig: {
          didRegistry: this.didRegistryApiUrl,
          trustedIssuersRegistry: this.trustedIssuersRegistryApiUrl,
          trustedPoliciesRegistry: this.trustedPoliciesRegistryApiUrl,
        },
      },
   
      credentialRequest,
      bank.bankDID,
    
    );

    return {
      format: "jwt_vc",
      credential: vcJwt
    }

  }


  async init_KYC_share(
   
    newKYCBody: InitKYCShareDto
  ): Promise<CheckResult> {

    if (this.opMode !== "BANK") {
      this.logger.error('only available to Banks');
      throw new BadRequestError(
       'only available to Banks'
      );
     }

    const {documentHash, didKey, customerName, vp_token} = newKYCBody;
  
    console.log('documentid->'+documentHash);

    const {kycMeta} = await this.getDocument2(documentHash);
    if (kycMeta) {
      console.log('kycMetae->'+kycMeta);
      return {
        success: false,
        errors: ['document already exists']
      }
    }

 
  //check if I have TnT create access

  if (!(await this.checkCreateAccess(this.issuerDid))) {
    return {
      success: false,
      errors:['bank has no TnT create access']
    }
  }

  //check did:key ownership

   //create TNT doc

   const tempHash= `0x${crypto.randomBytes(32).toString("hex")}`

   const authToken = await this.authorisationAuth('tnt_create', "empty", "ES256");
   console.log('auhtToken->'+authToken);

   if (typeof authToken !== 'string') {
    return {
      success:false,
      errors: ['error from authorization API '+authToken.error]
    }
   }

  
   const wallet = new ethers.Wallet(this.issuerPrivateKeyHex);
   //const documentHash = this.getDocHash(productName,batchId);
   console.log('hash->'+documentHash);

  

   const documentMetadata = `KYC doc created by ${this.orgName}`;
   

   //console.log('documentMeta->'+documentMetadata);

   const params = [{
     from: wallet.address,
     documentHash,
     documentMetadata,
     didEbsiCreator: this.issuerDid,
   }]

    const rpcresponse =  await this.jsonrpcCall("createDocument",params,authToken);

    if (!rpcresponse.success) {
      console.log('could not create tnt doc');
      return rpcresponse
    }

    console.log('tnt doc created');
    //deligate access to didkey

    const authTokenWrite = await this.authorisationAuth('tnt_write', "empty", "ES256");
    console.log('auhtTokenWrite->'+authTokenWrite);
 
    if (typeof authTokenWrite !== 'string') {
     return {
       success:false,
       errors: ['error from authorization API '+authTokenWrite.error]
     }
    }

    const grantedByAccount = await this.didToHex(this.issuerDid);
    const subjectAccount = await this.didToHex(didKey);
    const grantedByAccType = 0 
    const subjectAccType =  1;
    const permission =  0 ;
 
    const paramsGrant = [{
      from: wallet.address,
      documentHash,
      grantedByAccount,
      subjectAccount,
      grantedByAccType,
      subjectAccType,
      permission,
    
    }]
 
    const rpcresponse2= await this.jsonrpcCall("grantAccess",paramsGrant,authTokenWrite);

    if (!rpcresponse2.success) {
      console.log('could not grant delegate access');
      return rpcresponse2
    }

    console.log('granted delegate access');
    //grant write access

  
  
 
    const paramsGrant2 = [{
      from: wallet.address,
      documentHash,
      grantedByAccount,
      subjectAccount,
      grantedByAccType,
      subjectAccType,
      permission:1,
    
    }]
 
    return await this.jsonrpcCall("grantAccess",paramsGrant2,authTokenWrite);

    //add in tntdocs db

   // return {success:true}

  }




  async getDocument(hash:string) {

    const docUrl = 'https://api-pilot.ebsi.eu/track-and-trace/v1/documents'

    try {
    const response = await axios.get(
      `${docUrl}/${hash}`,
      
    )
    const tntDocument = response.data as TnTDocument;
    const pdodocument = JSON.parse(tntDocument.metadata) as PDOdocument;
    const events = tntDocument.events;
    const createdAt = tntDocument.timestamp.datetime;
    const requiredEvents = pdodocument.requiredEvents;
    return {pdodocument,requiredEvents,events,createdAt};

    } catch (error) {
      console.log('getdocument error->'+error);
      return {pdodocument: null, requiredEvents:null, events:null, createdAt:null}
    } 
  
   

  }

  async getDocument2(hash:string) {

    const docUrl = 'https://api-pilot.ebsi.eu/track-and-trace/v1/documents'

    try {
    const response = await axios.get(
      `${docUrl}/${hash}`,
      
    )
    const tntDocument = response.data as TnTDocument;
    const kycMeta = tntDocument.metadata as string;
    const events = tntDocument.events;
    const createdAt = tntDocument.timestamp.datetime;
   
    return {kycMeta,events,createdAt};

    } catch (error) {
      console.log('getdocument error->'+error);
      return {kycMeta: null, events:null, createdAt:null}
    } 
  
   

  }

  async getEvent(hash:string, eventId: string) {

    const docUrl = 'https://api-pilot.ebsi.eu/track-and-trace/v1/documents'

    //let kycEvent: KYCEvent ={} ;
    let success:boolean = true;



        try {
          const response = await axios.get(
            `${docUrl}/${hash}/events/${eventId}`,
            
          )
          console.log('event->'+response.data);
          const tntEvent = response.data as TnTEvent;
          const kycEvent = JSON.parse(tntEvent.metadata) as KYCEvent;
          return {sender: tntEvent.sender, kycEvent, success}
          //kycEvent.createdAt = tntEvent.timestamp.datetime;
         // pdoEvents.push(pdoEvent)
          
      
          } catch (error) {
           // console.log('getdocument error->'+error);
            success = false;
          // return {pdoEvents: []}
          } 
        
      
   

    return { success}

  }


  async getEvents(hash:string, events: string[]) {

    const docUrl = 'https://api-pilot.ebsi.eu/track-and-trace/v1/documents'

    let pdoEvents: PDOEvent[] = [] ;
    let success:boolean = true;

    await Promise.all(
      events.map(async event => {

        try {
          const response = await axios.get(
            `${docUrl}/${hash}/events/${event}`,
            
          )
          console.log('event->'+response.data);
          const tntEvent = response.data as TnTEvent;
          const pdoEvent = JSON.parse(tntEvent.metadata) as PDOEvent;
          pdoEvent.createdAt = tntEvent.timestamp.datetime;
          pdoEvents.push(pdoEvent)
          
      
          } catch (error) {
           // console.log('getdocument error->'+error);
            success = false;
          // return {pdoEvents: []}
          } 
        
      })
   )

    return {pdoEvents, success}

  }

  getDocHash(productName:string,batchId:string):string {

    const padding= '123456789012345';
    const mainpart = `PDO-${productName}-${batchId}-`
    const productId = `${mainpart}${padding.substring(0,32-mainpart.length)}`
    
    return `0x${Buffer.from(productId,'utf8').toString('hex')}`;
  }

  isTnTdocument(productName:string,hash:string):boolean {

    const mainpart = `PDO-${productName}-`
   
    const productIdName = Buffer.from(hash.substring(2),'hex').toString('utf-8');
    if (productIdName.startsWith(mainpart) ) return true;
    return false;
  }


  
  async pendingBatches(tntQuery: TnTqueryDto): Promise<object> {

    const {productName, actordid, allowedEvent} = tntQuery;

    const accessesUrl = `https://api-pilot.ebsi.eu/track-and-trace/v1/accesses?subject=${this.issuerDid}&page[size]=10`

    const previous: BatchAll[] = [];

    const results= await this.batchAll(productName,accessesUrl,previous) as BatchAll[];



     if (actordid && allowedEvent) {
      console.log("PendingTasks")
      //get pending tasks for actor in pending batches

      const pendingTasks: PendingTask[] = [];

      results.map( batch => {
        const {requiredEvents, pdoEvents} = batch;
        const batchCompleted = pdoEvents.some(event => (event.lastInChain));

        if (!batchCompleted) { 

            requiredEvents.map(reqEvent => {
            if (reqEvent.from == actordid && reqEvent.type == allowedEvent) {
              if (!(pdoEvents.some(pdoEvent => 
                pdoEvent.from == actordid && pdoEvent.type == allowedEvent
              )))
              pendingTasks.push({
                documentId:batch.documentId,
                createdAt:batch.createdAt,
                batchId:batch.batchId,
                createdOnBehalfOfName: batch.createdOnBehalfOfName,
                type:reqEvent.type,
                notesToActor: reqEvent.notesToActor})

            }
            })
          }
      })
      return pendingTasks;
     }

     //return pendingBatch

     console.log("PendingBatch")

     const pendingBatch: PendingBatch[] = [];

     results.map( batch => {
       const {requiredEvents, pdoEvents} = batch;
       const pendingRequiredEvents: string[] = []
       const batchCompleted = pdoEvents.some(event => (event.lastInChain));

       if (!batchCompleted) { 

          requiredEvents.map(reqEvent => {
          
              if (!(pdoEvents.some(pdoEvent => 
                pdoEvent.type == reqEvent.type
              )))
              pendingRequiredEvents.push(
                reqEvent.type
           //   type: reqEvent.type,
           //   from: reqEvent.from,
           //   fromName: reqEvent.fromName,
           //   notesToActor: reqEvent.notesToActor}
              )

              })
              pendingBatch.push({
                documentId: batch.documentId,
                createdAt: batch.createdAt,
                batchId: batch.batchId,
                createdOnBehalfOfName: batch.createdOnBehalfOfName,
                requiredEvents: batch.requiredEvents,
                pendingRequiredEvents 
              })
        }
      })
      
     return pendingBatch;


  }

  
  

  async completedBatches(tntQuery: TnTqueryDto): Promise<object> {

    const {productName, actordid, allowedEvent} = tntQuery;

    const accessesUrl = `https://api-pilot.ebsi.eu/track-and-trace/v1/accesses?subject=${this.issuerDid}&page[size]=10`

    const previous: BatchAll[] = [];

     const results= await this.batchAll(productName,accessesUrl,previous) as BatchAll[];



     if (actordid && allowedEvent) {
      //find completed tasks for actor in completed batches. called from lastInchain actor for qrcode
      console.log("for qrcode")

      const completedTasks: CompletedTask[] = [];

      results.map( batch => {

        const {pdoEvents} = batch;
          if (pdoEvents.some(pdoEvent => pdoEvent.lastInChain && pdoEvent.from == actordid && pdoEvent.type == allowedEvent)) {
            
             {
            
              completedTasks.push({
                documentId:batch.documentId,
                createdAt:batch.createdAt,
                batchId:batch.batchId,
                createdOnBehalfOfName: batch.createdOnBehalfOfName,
                type:allowedEvent,
                eventDetails: {},
                batchCompleted: true
                //notesToActor:''
                })

            }
            
          }

      })
      return completedTasks;
     }

     //return completedBatch

     const completedBatches: CompletedBatch[] = [];

     results.map( batch => {

       const {requiredEvents,pdoEvents} = batch;
         if (pdoEvents.some(pdoEvent => pdoEvent.lastInChain)) {
           
          completedBatches.push({
               documentId:batch.documentId,
               createdAt:batch.createdAt,
               batchId:batch.batchId,
               createdOnBehalfOfName: batch.createdOnBehalfOfName,
               completedEvents: pdoEvents
               })

           }
           
         }

     )


     console.log("completedBatch")

     return completedBatches;


  }
    
  async completedTasks(tntQuery: TnTqueryDto): Promise<object> {

    const {productName, actordid, allowedEvent} = tntQuery;

   //find completed events from actor in either pending or completed batches
  

   const accessesUrl = `https://api-pilot.ebsi.eu/track-and-trace/v1/accesses?subject=${this.issuerDid}&page[size]=10`

   const previous: BatchAll[] = [];

    const results= await this.batchAll(productName,accessesUrl,previous) as BatchAll[];



    if (actordid && allowedEvent) {
     

     const completedTasks: CompletedTask[] = [];

     results.map( batch => {

       const {pdoEvents} = batch;
         
           const completed = pdoEvents.some(event => (event.lastInChain));
           pdoEvents.map(pdoEvent2 => {
           
           if (pdoEvent2.from == actordid && pdoEvent2.type == allowedEvent) {
           
             completedTasks.push({
               documentId:batch.documentId,
               createdAt:batch.createdAt,
               batchId:batch.batchId,
               createdOnBehalfOfName: batch.createdOnBehalfOfName,
               type:pdoEvent2.type,
               eventDetails: pdoEvent2.eventDetails,
               batchCompleted: completed ? true : false
               })

           }
           })
         

     })
     return completedTasks;
    }

     return [];


  }

    
  async document(tntQuery: TnTdocumentDto): Promise<object> {

    const {documentId, fromCustomer} = tntQuery;
    const {pdodocument,requiredEvents, events, createdAt} = await this.getDocument(documentId);
   

   
    if (!pdodocument) 
      return {
          success:false,
          errors:['error getting tnt document']
      }



    const {pdoEvents,success} = await this.getEvents(documentId,events);

    if (!success) 
      return {
          success:false,
          errors:['error getting tnt document events']
      }

    console.log('pdoevents->'+JSON.stringify(pdoEvents));

    if (fromCustomer=="false") {

      console.log('not from customer');


        const batchCompleted = pdoEvents.some(event => (event.lastInChain));
        const pendingRequiredEvents: RequiredEvent[] = [];
        const completedEvents = pdoEvents;

        if (!batchCompleted) {
     
           requiredEvents.map(reqEvent => {
           
               if (!(pdoEvents.some(pdoEvent => 
                 pdoEvent.type == reqEvent.type
               )))
               pendingRequiredEvents.push({
               type: reqEvent.type,
               from: reqEvent.from,
               fromName: reqEvent.fromName,
               notesToActor: reqEvent.notesToActor})
 
               })
       
          }
      
       
          return {
            documentId,
            createdAt,
            batchId: pdodocument.batchId,
            createdOnBehalfOfName: pdodocument.createdOnBehalfOfName,
            batchCompleted,
            pendingRequiredEvents,
            completedEvents
          }


    } else  if (fromCustomer=="true") {

      const batchCompleted = pdoEvents.some(event => (event.lastInChain));
      if (!batchCompleted) {
        return {
          success: false,
          errors: ['batch not completed yet']
        }
      }

      type EventWithStatus =   Partial<PDOEvent> & {licenseStatus:string};
      const completedEventsWithStatus: EventWithStatus[] = [];
      //validate vcs is pdoEvents and add status property
      
      await Promise.all(
        pdoEvents.map(async event => {
         // console.log('vc->'+event.vcJwt);
          const response = await this.verifyVC(event.vcJwt);
          const tempEvent = {...event, licenseStatus: response.status}; //add licenseStatus key
          const  {vcJwt, ...newEvent} = tempEvent;  //remove vcJwt key
          completedEventsWithStatus.push(newEvent)
        }));
      //return a formatted html page

      return {
        documentId,
        createdAt,
        batchId: pdodocument.batchId,
        createdOnBehalfOfName: pdodocument.createdOnBehalfOfName,
        batchCompleted,
        completedEventsWithStatus
      }


    }

    return    {
      success: false,
      errors: ['fromCustomer must be true or false']
    }

  }

  
    

  
    async batchAll(productName: string, url: string, prevresults: BatchAll[] ): Promise<object> {

      console.log('calling batch All');
      
        const newresults = [...prevresults];
    
        try {
        const response = await axios.get(
          url,
          
        )
        const allDocuments = response.data as PaginatedList;
        const items = allDocuments.items;
    
        await Promise.all(
          items.map(async item => {
            
             if (this.isTnTdocument(productName,item.documentId)) {
               const {pdodocument,requiredEvents, events, createdAt, } = await this.getDocument(item.documentId);
               if (pdodocument) {
                const {pdoEvents,success} = await this.getEvents(item.documentId, events);
                if (success) {
                
                    newresults.push({
                      documentId: item.documentId,
                      createdAt,
                      batchId: pdodocument.batchId,
                      createdOnBehalfOfName: pdodocument.createdOnBehalfOfName,
                      requiredEvents,
                      pdoEvents
                    })
                  
                }
               }
               
               
             }
            
          })
       )
    
       if (allDocuments.links.next !== allDocuments.self ) {
          return await this.batchAll(productName,allDocuments.links.next, newresults);
          
       } else
         return newresults;
    
        } catch (error) {
          console.log('BatchAll error->'+error);
          return [];
        } 
      
     
    
      }
      
  
  async  authorisationAuth(scope: string, vc:string ,alg:string) {
   
    //const alg =  "ES256";
    const apiUrl = this.authorisationApiUrl;
  
 
    const response = await axios.get(
      `${apiUrl}/.well-known/openid-configuration`,
      
    );
  
    const openIdConfig = response.data as {issuer: string};

    const vpJwt = (await this.compute(
      "createPresentationJwt",
      [vc || "empty", alg, openIdConfig.issuer],
      
    )) as string;

    console.log('vp->'+vpJwt);
  
    return this.authorisationToken(scope,vpJwt);
  }

async  authorisationToken(scope:string, vpJwt:string) {
  const apiUrl = this.authorisationApiUrl;
  
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
    id: randomUUID(),
    definition_id: `${scope}_presentation`,
    descriptor_map: [],
  };

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
}


async jsonrpcCall(method: string, params: unknown[], accessToken:string):Promise<CheckResult> {

  const wallet = new ethers.Wallet(this.issuerPrivateKeyHex);
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
    logAxiosRequestError(error, this.logger);
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
    this.logger,
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
    this.ledgerApiUrl,
    this.logger,
    txId
  );

  console.log('mining result->'+JSON.stringify(miningResult));

  if (!miningResult.success) {
    return {
      success: false,
      errors: [miningResult.error.message],
    };
  }

  
  return { success: true };

}


async checkCreateAccess(did:string): Promise<boolean> {

   const tntUrl = 'https://api-pilot.ebsi.eu/track-and-trace/v1'

  const response = await axios.head(
    `${tntUrl}/accesses?creator=${did}`,

  );

  if (response.status == 204) {
   return true;
 }

 return false;

}


async  compute(
  method: string,
  inputs: (UnknownObject |string)[],
  
): Promise<unknown> {
 // const { config, client } = context;

 

  switch (method) {
    // case "signTransaction": {
    //   const unsignedTransaction = inputs[0] as unknown as ethers.Transaction;
    //   const uTx = formatEthersUnsignedTransaction(
    //     JSON.parse(JSON.stringify(unsignedTransaction)) as ethers.Transaction,
    //   );
    //   const sgnTx = await client.ethWallet.signTransaction(
    //     uTx as ethers.Transaction,
    //   );
    //   yellow(sgnTx);
    //   return sgnTx;
    // }
    case "createPresentationJwt": {
      const verifiableCredential = inputs[0] as string | string[];
      const alg = (inputs[1] as Alg) || "ES256K";
      const audience = inputs[2] as string;
      
      const keys = await this.getIssuerKeyPair(alg as "ES256K");
      if (!verifiableCredential)
        throw new Error("Verifiable Credential not defined");
      const { jwtVp, payload } = await createVPJwt(
        this.issuerDid,
        this.issuerKid,
        keys,
        alg,
        verifiableCredential,
        audience,
        this.ebsiAuthority
      );
     
      return jwtVp;
    }
    case "createVcJwt": {
      const payloadVc = inputs[0] as {
        id?: string;
        credentialSubject?: {
          id?: string;
        };
        [x: string]: unknown;
      };
      const payloadJwt = inputs[1] as UnknownObject;
      const alg = (inputs[2] || "ES256K") as Alg;
      const keys = await this.getIssuerKeyPair(alg as "ES256K");
  
      if (!keys)
        throw new Error(`There is no key defined for alg ${alg}`);
      const privateKey = await importJWK(keys.privateKeyJwk, alg);
      const iat = Math.floor(Date.now() / 1000) - 10;
      const exp = iat + 5 * 365 * 24 * 3600;
      const issuanceDate = `${new Date(iat * 1000)
        .toISOString()
        .slice(0, -5)}Z`;
      const expirationDate = `${new Date(exp * 1000)
        .toISOString()
        .slice(0, -5)}Z`;
      const jti = payloadVc.id || `urn:uuid:${randomUUID()}`;
      const sub = payloadVc.credentialSubject?.id;
      const payload = {
        iat,
        jti,
        nbf: iat,
        exp,
        sub,
        vc: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          id: jti,
          type: ["VerifiableCredential"],
          issuer: this.issuerDid,
          issuanceDate,
          issued: issuanceDate,
          validFrom: issuanceDate,
          expirationDate,
          ...payloadVc,
        },
        ...payloadJwt,
      };
      const vc = await new SignJWT(payload)
        .setProtectedHeader({
          alg,
          typ: "JWT",
          kid: this.issuerKid,
        })
        .setIssuer(this.issuerDid)
        .sign(privateKey);
      
      return vc;
    }
    case "signJwt": {
      const [payload, alg, headers] = inputs as [
        UnknownObject,
        Alg,
        UnknownObject,
      ];
      const keys = await this.getIssuerKeyPair(alg as "ES256K");
      const privateKey = await importJWK(keys.privateKeyJwk, alg);
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({
          alg,
          typ: "JWT",
          kid: this.issuerKid,
          ...headers,
        })
        .sign(privateKey);
      
      return jwt;
    }
    case "wait": {
      const [seconds] = inputs as [string];
      const milliseconds = Math.round(Number(seconds) * 1000);
      console.log(`waiting ${milliseconds / 1000} seconds`);
      await new Promise((r) => {
        setTimeout(r, milliseconds);
      });
      return 0;
    }
    // case "userPin": {
    //   const [did] = inputs as [string];
    //   const userPin = getUserPin(did);
      
    //   return userPin;
    // }
    // case "schemaId": {
    //   const [schema, base] = inputs as [UnknownObject, "base16" | "base58btc"];
    //   const schemaId = await computeSchemaId(schema, base);
      
    //   return schemaId;
    // }
    // case "checkStatusList2021CredentialSchema": {
    //   const [credential] = inputs as [UnknownObject];
    //   try {
    //     Joi.assert(
    //       credential,
    //       Joi.object({
    //         "@context": Joi.array()
    //           .ordered(
    //             Joi.string()
    //               .valid("https://www.w3.org/2018/credentials/v1")
    //               .required(),
    //             Joi.string()
    //               .valid("https://w3id.org/vc/status-list/2021/v1")
    //               .required(),
    //           )
    //           .items(Joi.string().uri())
    //           .required(),
    //         type: Joi.array()
    //           .ordered(
    //             // First item must be "VerifiableCredential"
    //             Joi.string().valid("VerifiableCredential").required(),
    //           )
    //           .items(
    //             // "StatusList2021Credential" must be present
    //             Joi.string().valid("StatusList2021Credential").required(),
    //             Joi.string(),
    //           )
    //           .required(),
    //         credentialSubject: Joi.object({
    //           id: Joi.string().uri().required(),
    //           type: Joi.string().valid("StatusList2021").required(),
    //           statusPurpose: Joi.string()
    //             .valid("revocation", "suspension")
    //             .required(),
    //           encodedList: Joi.string().required(),
    //         })
    //           .unknown(true)
    //           .required(),
    //       })
    //         // Allow additional properties
    //         .unknown(true),
    //     );
    //     yellow("StatusList2021 Credential Schema correct");
    //     return true;
    //   } catch (error) {
    //     red(error);
    //     throw error;
    //   }
    // }
    // case "verifyVcJwt": {
    //   try {
    //     const result = await computeVerifyVcJwt(inputs, context);
    //     yellow(result);
    //     return result;
    //   } catch (error) {
    //     if (error instanceof ValidationError) {
    //       red(error.toJSON());
    //     } else {
    //       red(error);
    //     }
    //     throw error;
    //   }
    // }
    // case "verifyVpJwt": {
    //   try {
    //     const result = await computeVerifyVpJwt(inputs as string[], context);
    //     yellow(result);
    //     return result;
    //   } catch (error) {
    //     if (error instanceof ValidationError) {
    //       red(error.toJSON());
    //     } else {
    //       red(error);
    //     }
    //     throw error;
    //   }
    // }
    // case "verifyAuthenticationRequest": {
    //   const request = inputs[0] as {
    //     client_id: string;
    //     request: string;
    //   };
    //   Joi.assert(
    //     request,
    //     Joi.object({
    //       client_id: Joi.string(),
    //       request: Joi.string(),
    //     }).unknown(),
    //   );
    //   await verifyJwtTar(request.request, {
    //     trustedAppsRegistry: `${config.api.tar.url}/apps`,
    //   });
    //   yellow("Authentication request OK");
    //   return request.client_id;
    // }
    // case "verifySessionResponse": {
    //   const nr = inputs[0] as {
    //     alg: string;
    //     nonce: string;
    //     response: AkeResponse;
    //   };
    //   Joi.assert(
    //     nr,
    //     Joi.object({
    //       alg: Joi.string(),
    //       nonce: Joi.string(),
    //       response: Joi.object(),
    //     }).unknown(),
    //   );
    //   const key = client.keys[nr.alg] as KeyPairJwk;
    //   if (!key) throw new Error(`There is no key defined for alg ${nr.alg}`);
    //   const accessToken = await SiopAgent.verifyAkeResponse(nr.response, {
    //     nonce: nr.nonce,
    //     privateEncryptionKeyJwk: key.privateKeyEncryptionJwk,
    //     trustedAppsRegistry: `${config.api.tar.url}/apps`,
    //     alg: nr.alg,
    //   });
    //   yellow(`Session Response OK. Access token: ${accessToken}`);
    //   return accessToken;
    // }
    // case "did2": {
    //   const [jwk] = inputs as [UnknownObject];
    //   const did = EbsiWallet.createDid("NATURAL_PERSON", jwk);
    //   yellow(did);
    //   return did;
    // }
    case "sha256": {
      const [data] = inputs as [UnknownObject | string];
      if (typeof data === "object") {
        return this.sha256(JSON.stringify(data));
      }
      return this.sha256(data);
    }
    case "decodeJWT": {
      const jwt = inputs[0] as string;
      //Joi.assert(jwt, Joi.string());
      const decoded = decodeJWT(jwt) as unknown;
     
      return decoded;
    }
    case "encodeBase64": {
      const dec = inputs[0] as string;
      //Joi.assert(dec, Joi.string());
      const encoded = Buffer.from(removePrefix0x(dec), "hex").toString(
        "base64",
      );
     
      return encoded;
    }
    case "encodeBase64url": {
      const dec = inputs[0] as string;
      //Joi.assert(dec, Joi.string());
      const encoded = base64url.encode(Buffer.from(removePrefix0x(dec), "hex"));
    //  yellow(encoded);
      return encoded;
    }
    case "timestampId": {
      const hash = inputs[0] as string;
     // Joi.assert(hash, Joi.string());
      const bufferSha256 = Buffer.from(this.sha256(hash), "hex");
      const multihash = Multihash.encode(bufferSha256, "sha2-256", 32);
      const timestampId = `u${base64url.encode(multihash)}`;
     
      return timestampId;
    }
    case "recordId": {
      const [address, blockNumber, hashValue] = inputs as [
        string,
        string,
        string,
      ];
      
      const abiEncoded = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [address, blockNumber, hashValue],
      );
      const bufferSha256 = Buffer.from(this.sha256(abiEncoded), "hex");
      const recordId = multibaseEncode("base64url", bufferSha256);
     
      return recordId;
    }
    case "decodeBase64": {
      const enc = inputs[0] as string;
      const type = (inputs[1] as string) || "utf8";
     
      const buffer = Buffer.from(enc, "base64");
      if (type === "buffer") {
        console.log(buffer);
        return buffer;
      }

      const decoded = buffer.toString("utf8");
      
      return decoded;
    }
    case "decodeBase64url": {
      const enc = inputs[0] as string;
 
      const decoded = base64url.decode(enc);
      
      return decoded;
    }
    case "decodeHex": {
      const enc = inputs[0] as string;
    
      const decoded = Buffer.from(removePrefix0x(enc), "hex").toString("utf8");
     
      return decoded;
    }
    case "randomID": {
      return randomBytes(32).toString("hex");
    }
    // case "subaccountDid": {
    //   const [did] = inputs as [string];
     
    //   const subaccountMsiBytes = createHash("sha256")
    //     .update(did, "utf8")
    //     .digest()
    //     .slice(0, 16);
    //   const subaccount = util.createDid(subaccountMsiBytes);
     
    //   return subaccount;
    // }
    case "statusListIndex": {
      const [did] = inputs as [string];
      
      const statusListIndex = (
        createHash("sha256")
          .update(did, "utf8")
          .digest()
          .slice(0, 6)
          .readUInt32BE() % 131072
      ).toString();
     
      return statusListIndex;
    }
    // case "thumbprint": {
    //   const [hexOrJwk] = inputs as [string | UnknownObject];
    //   let publicKeyJwk: JWK;
    //   if (typeof hexOrJwk === "string") {
    //     publicKeyJwk = getPublicKeyJwk(hexOrJwk);
    //   } else {
    //     publicKeyJwk = hexOrJwk;
    //   }
    //   const thumbprint = await calculateJwkThumbprint(publicKeyJwk, "sha256");
    //   yellow(thumbprint);
    //   return thumbprint;
    // }
    default:
      
      return 0;
  }
}

sha256(data: string) {
  let hash = createHash("sha256");
  if (data.startsWith("0x")) {
    hash = hash.update(removePrefix0x(data), "hex");
  } else {
    hash = hash.update(data, "utf8");
  }
  return hash.digest().toString("hex");
}


  getCredentialIssuerMetadata(): CredentialIssuerMetadata {
    return {
      credential_issuer: this.issuerUri,
      authorization_server: this.authUri,
      credential_endpoint: `${this.issuerUri}/credential`,
      deferred_credential_endpoint: `${this.issuerUri}/credential_deferred`,
      credentials_supported: [
        {
          format: "jwt_vc",
          types: [
            "VerifiableCredential",
            "VerifiableAttestation",
            "VerifiableAuthorisationToOnboard",
          ],
          trust_framework: {
            name: "ebsi",
            type: "Accreditation",
            uri: "TIR link towards accreditation",
          },
          display: [
            {
              name: "Verifiable Attestation Conformance",
              locale: "en-GB",
            },
          ],
        },
        
      ],
    };
  }



  


  
  async verifyVC(
    jwtvc: string,
    
  ): Promise<VerifyResponse> {

    //remove this
  //   let sumPromise = new Promise(function (resolve, reject) {
  //     setTimeout(function () {
  //        resolve("The sum of all data is 100.");
  //     }, 10000);
  //  });
  //  let result = await sumPromise;
    console.log('validAt->'+Math.floor(Date.now()/1000));
    console.log('axios timeout->'+this.timeout);
   
    let verifiedCredential: EbsiVerifiableAttestation202401 | EbsiVerifiableAttestation20221101;
    const options: VerifyCredentialOptions = {
    //  ...this.ebsiEnvConfig,
      ebsiAuthority:this.ebsiAuthority,
      timeout: this.timeout,
      skipAccreditationsValidation: true,
      skipStatusValidation:true,  //always true if using my own routine
      skipCredentialSubjectValidation: false,
      validAt: Math.floor(Date.now()/1000),
      ebsiEnvConfig: {
        didRegistry:this.didRegistryApiUrl,
        trustedIssuersRegistry:this.trustedIssuersRegistryApiUrl,
        trustedPoliciesRegistry:this.trustedPoliciesRegistryApiUrl
      },
    };
    console.log('skipAccreditation->'+options.skipAccreditationsValidation);
    console.log('skipStatusVal->'+options.skipStatusValidation);
    console.log('sckipCredentialSubVal->'+options.skipCredentialSubjectValidation);
    try {

      verifiedCredential = await verifyCredentialJwt(jwtvc, options);
     // console.log("calling my ValidateStatusLocal");
    //  await validateCredentialStatus(verifiedCredential,options);
    //  await validateCredentialStatusLocal(verifiedCredential as EbsiVerifiableAttestation202401,this.IssuedVCModel);

    } catch (err) {
      console.log('err->'+err);
      console.log('verification error->'+JSON.stringify(err)); 
      let errobj = err as {name: string; message:string};
      console.log('verification error name->'+errobj.name);
      console.log('verification error message->'+errobj.message);
      if (errobj.message.includes('not valid after'))
        return {status: 'expired'};
      else if (errobj.message.includes('revoked'))
        return {status: 'revoked'};
      return {
        status: 'invalid',
     
      };
    }
  
    return {status: 'active'}

  }


  async  didToHex(did: string) {
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






validatePresentationSubmissionObject(
  presentationSubmission: PresentationSubmission,
  presentationDefinition: ReadonlyDeep<PresentationDefinition>
) {
  const validationResult = PEXv2.validateSubmission(presentationSubmission);

  const checkedArray = Array.isArray(validationResult)
    ? validationResult
    : [validationResult];

  const errors = checkedArray
    .map((checked) => {
      if (checked.status === "error") {
        return checked;
      }
      return null;
    })
    .filter(Boolean);

  if (errors.length > 0) {
    throw new Error(
      `\n${errors
        .map((err) => `- [${err.tag}] ${err.message ?? "Unknown error"}`)
        .join("\n")}`
    );
  }

  /**
   * The presentation_submission object MUST contain a definition_id property.
   * The value of this property MUST be the id value of a valid Presentation Definition.
   *
   * @see https://identity.foundation/presentation-exchange/#presentation-submission
   */
  if (presentationSubmission.definition_id !== presentationDefinition.id) {
    throw new Error(
      "definition_id doesn't match the expected Presentation Definition ID for the requested scope"
    );
  }

  /**
   * Make sure every descriptor_map[x].id of the Presentation Submission
   * matches an existing input_descriptors[x].id of the Presentation Definition
   */
  // presentationSubmission.descriptor_map.forEach((descriptor) => {
  //   const matchingDescriptor = presentationDefinition.input_descriptors.find(
  //     (inputDescriptor) => inputDescriptor.id === descriptor.id
  //   );

  //   if (!matchingDescriptor) {
  //     throw new Error(
  //       `The presentation definition doesn't contain any input descriptor with the ID ${descriptor.id}`
  //     );
  //   }
  // });

  /**
   * Make sure every input_descriptors[x] of the Presentation Definition is
   * satisfied, i.e. there's at least 1 descriptor_map[x] with the same id.
   */
  presentationDefinition.input_descriptors.forEach((inputDescriptor) => {
    const matchingDescriptor = presentationSubmission.descriptor_map.find(
      (descriptor) => descriptor.id === inputDescriptor.id
    );

    if (!matchingDescriptor) {
      throw new Error(`Input descriptor ${inputDescriptor.id} is missing`);
    }
  });
}

validatePresentationExchange(
  pex: PEXv2,
  vp: EbsiVerifiablePresentation,
  presentationDefinition: ReadonlyDeep<PresentationDefinition>,
  presentationSubmission: PresentationSubmission
) {
  const errors: Checked[] = [];

  // Evaluate each descriptor_map[x] individually
  presentationSubmission.descriptor_map.forEach((descriptor) => {
    // Trim presentation definition: keep only the constraints related to descriptor.id
    // Reason: the PEX library tries to apply every constraint to every input
    const trimmedPresentationDefinition = {
      ...presentationDefinition,
      input_descriptors: presentationDefinition.input_descriptors.filter(
        (inputDescriptor) => inputDescriptor.id === descriptor.id
      ),
    } as const;

    const presentation = {
      "@context": vp["@context"],
      type: vp.type,
      holder: vp.holder,
      presentation_submission: presentationSubmission,
      verifiableCredential:
        vp.verifiableCredential as unknown as IVerifiableCredential[],
    } satisfies IPresentation;

    const result = pex.evaluatePresentation(
      trimmedPresentationDefinition as PresentationDefinition,
      presentation
    );

    if (result.errors) {
      errors.push(...result.errors);
    }
  });

  if (errors && errors.length > 0) {
    throw new Error(
      errors
        .map(
          (error) => `${error.tag} tag: ${error.message ?? "Unknown error"};`
        )
        .join()
    );
  }
}

formatAuthErrorResponse(
  redirectUri: string,
  state: string | undefined,
  errorTitle: AuthenticationErrorResponse["error"],
  description: string,
  err?: unknown
) {
  const sanitizedRedirectUri = redirectUri.endsWith(":")
    ? `${redirectUri}//`
    : redirectUri;
  let errorDescription = description;
  if (err && err instanceof Error && err.message)
    errorDescription += `: ${err.message}`;
  else if (err && !(err instanceof Error))
    errorDescription += `: unknown error`;
  return `${sanitizedRedirectUri}?${new URLSearchParams({
    error: errorTitle,
    error_description: errorDescription,
    ...(state && { state }),
  } satisfies AuthenticationErrorResponse).toString()}`;
}


}
 
 

export default TntService;
