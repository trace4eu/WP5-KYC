import { Inject, Injectable, Logger } from "@nestjs/common";
import { Resolver } from "did-resolver";
import { getResolver, util } from "@cef-ebsi/ebsi-did-resolver";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import type { ApiConfig } from "../../config/configuration.js";
import { DataStoreService } from "../data-store/data-store.service.js";
import { formatZodError } from "../../shared/utils/index.js";



import type {
  CheckResult,
  IntentName,
  IssuerAttribute,
  NewPinResult,
} from "../../shared/interfaces.js";
import {
  accreditAuthoriseParamsSchema,
  didSchema,
  requestSchema,
} from "./validators/index.js";
import { TntService } from "../tnt/tnt.service.js";


// import { createHash, randomBytes } from "node:crypto";
// import type { UpdateListDto } from "./dto/index.js";

// import { HOLDER_WALLET_AUTHORIZATION_CODE_CREDENTIAL_TYPES } from "src/shared/constants.js";
// import { array } from "joi";
// import { Type } from "class-transformer";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { Product, ProductDocument } from "../../shared/models/products.model.js";
import NewProductDto from "./dto/newproduct.dto.js";
import EventDetailsDto from "./dto/eventdetails.dto.js";
import { walletdidDto } from "../tnt/dto/walletdid.dto.js";
import { Bank, BanksDocument } from "../../shared/models/banks.model.js";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import ReqOnBoardDto from "./dto/reqonboard.dto.js";
import { randomBytes } from "node:crypto";
import { MockDecryptDto } from "./dto/decrypt.dto.js";
import OAuth2Error from "../../shared/errors/OAuth2Error.js";





@Injectable()
export class AdminService {
  
  private readonly logger = new Logger(AdminService.name);
 // private db: Level<LevelDbKey, LevelDbObject>

 private readonly opMode: string;
 private readonly orgName: string;

  constructor(
    // private dataStoreService: DataStoreService,
    @Inject(TntService) private tntService: TntService,
  
    // @Inject(ConfigService)
    private configService: ConfigService<ApiConfig, true>,
    
   @InjectModel(Product.name) private ProductModel: Model<ProductDocument>,
   @InjectModel(Bank.name) private BankModel: Model<BanksDocument>,
    
  ) {
    this.opMode = configService.get<string>("opMode");
    this.orgName = configService.get<string>("orgName");
  }


  
  async newWallet(): Promise<Object> {

    const Did = util.createDid(randomBytes(16));
    console.log("new DID->"+Did);
    const privateKeyHex = randomBytes(32).toString("hex");
    console.log("new privkey->"+privateKeyHex);
    return {Did, privateKeyHex};
  

  }

  async walletCab(): Promise<Object> {

   const walletCababilities = await this.tntService.adminWalletCab();
   return walletCababilities;
  

  }


  async genPin(
    walletDidDto : walletdidDto
  ): Promise<CheckResult | NewPinResult> {

    if (this.opMode !== "CBC") {
      this.logger.error('only available to CBC');
      throw new BadRequestError(
       'only available to CBC'
      );
     }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const existingpin = await this.BankModel.findOne({pin:pin}).exec();
    if (existingpin) 
      return {
       success: false,
       errors:['pin already exists. try again']
      }


    const existingDID = await this.BankModel.findOne({bankDID:walletDidDto.walletDID}).exec();
    if (existingDID) 
     await this.BankModel.findByIdAndRemove(existingDID._id).exec();
      
    const newBank = {
      pin: pin,
      bankDID: walletDidDto.walletDID
    } as Bank;

    await new this.BankModel(newBank).save();

   
    return {
      pin,
    }

  }

  async reqOnBoard(
    reqonboardDto : ReqOnBoardDto
  ): Promise<CheckResult> {

    if (this.opMode !== "BANK") {
      this.logger.error('only available to Banks');
      throw new BadRequestError(
       'only available to banks'
      );
     }

  
    const result = await this.tntService.adminReqOnboard(
      reqonboardDto.CBCurl,reqonboardDto.pin);

    return result;

  }

  async mockDecryptDocs(
    mockDecryptDto : MockDecryptDto
  ): Promise<Buffer> {

    if (this.opMode !== "BANK") {
      this.logger.error('only available to Banks');
      throw new BadRequestError(
       'only available to banks'
      );
     }


    const result= await this.tntService.adminMockDecryptDocs(mockDecryptDto);
     
    if ('success' in result) {
      let error;
      if ('errors' in result) error = result.errors[0]; else error='no error description'
      throw new OAuth2Error("invalid_request", {
         errorDescription: error,
       });
     }
     return result;

  }



  async eventDetails(
    //authorizationHeader: string,
    eventsDetailsBody: EventDetailsDto
  ): Promise<CheckResult> {

    const {productName, eventsDetails, } = eventsDetailsBody;

   const product = await this.ProductModel.findOne({productName}).exec();
   if (!product) {
    return {
      success:false,
      errors: ['product not found']
    }
   }

   const {requiredEvents} = product;
   const invalidEvents: string[]=[];
   eventsDetails.map(eventEntry=> {
    if (!requiredEvents.some(event => event== eventEntry.type)) {
      invalidEvents.push(eventEntry.type);
    }
   })

   if (invalidEvents.length > 0) {
    return {
      success:false,
      errors: [`following event types are invalid: ${invalidEvents}`]
    }
   }

  try {
    await this.ProductModel.findByIdAndUpdate(product._id,{eventsDetails}).exec();
  } catch (e) {
    return {
      success:false,
      errors: [`${e}`]
    }
  } 

    return {success:true}

  }

 
  

  }


export default AdminService;
