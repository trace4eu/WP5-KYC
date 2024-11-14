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
import { SharedVC, SharedVCDocument } from "../../shared/models/sharedvcs.model.js";
import { SupportedVCType, getVCdata } from "./issuer.vcdata.js";
import issueVCDto from "./dto/issuevc.dto.js";
import { IssuedVC, IssuedVCDocument } from "../../shared/models/issuedvcs.model.js";
import { Product, ProductDocument } from "../../shared/models/products.model.js";
import NewProductDto from "./dto/newproduct.dto.js";
import EventDetailsDto from "./dto/eventdetails.dto.js";
import { walletdidDto } from "../tnt/dto/walletdid.dto.js";
import { Bank, BanksDocument } from "../../shared/models/banks.model.js";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import ReqOnBoardDto from "./dto/reqonboard.dto.js";
import { randomBytes } from "node:crypto";





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
    @InjectModel(IssuedVC.name) private IssuedVCModel: Model<IssuedVCDocument>,
   @InjectModel(SharedVC.name) private SharedVCModel: Model<SharedVCDocument>,
   @InjectModel(Product.name) private ProductModel: Model<ProductDocument>,
   @InjectModel(Bank.name) private BankModel: Model<BanksDocument>,
    
  ) {
    this.opMode = configService.get<string>("opMode");
    this.orgName = configService.get<string>("orgName");
  }

  // async issue_vc(
  //   issuevcDto : issueVCDto
  // ): Promise<CheckResult | NewPinResult> {

  //   const pin = Math.floor(100000 + Math.random() * 900000).toString();

  //   // const newpin = {
  //   //   authpin: pin,
  //   //   type: genpinDto.type,
  //   //   accrFortype: genpinDto.accrForType,

  //   // } as IssuedVC;


  //   const existingpin = await this.IssuedVCModel.findOne({authpin:pin}).exec();
  //   if (existingpin) 
  //     return {
  //      success: false,
  //      errors:['pin already exists. try again']
  //     }


  //   //check if productName and event are pre-defined

  //   const product = await this.ProductModel.findOne({productName:issuevcDto.productName}).exec() as Product;
  //   if (!product) {
  //     return {
  //       success: false,
  //       errors:[`${issuevcDto.productName} is not valid`]
  //   }}

  //   if (!(product.requiredEvents.some(event => event==issuevcDto.allowedEvent))) {
  //     return {
  //       success: false,
  //       errors:[`${issuevcDto.allowedEvent} is not valid`]
  //   }
  //   }

  //   //issue vc

  //   const newvcreq = {
      
  //     actorDID: issuevcDto.actorDID,
  //     productName: issuevcDto.productName,
  //     legalName: issuevcDto.legalName,
  //     allowedEvent: issuevcDto.allowedEvent,
  //     lastInChain: issuevcDto.allowedEvent == product.lastInChainEvent ? true : false,
     

  //   } as IssuedVC

  //   const jwtvc = await this.tntService.adminIssuePreAuthVC(newvcreq);

  //   const now = new Date();
  //   const newvc = {
  //     authpin: pin,
  //     actorDID: issuevcDto.actorDID,
  //     productName: issuevcDto.productName,
  //     legalName: issuevcDto.legalName,
  //     allowedEvent: issuevcDto.allowedEvent,
  //     lastInChain: issuevcDto.allowedEvent == product.lastInChainEvent ? true : false,
  //     vcjwt: jwtvc,
  //     status: 'active',
  //     downloaded: false,
  //     issuedDate: new Date(now.getTime() - now.getTimezoneOffset()*60000)

  //   } as IssuedVC

  //   await new this.IssuedVCModel(newvc).save();


   
  //   return {
  //     pin,
  //   }

  // }

  
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

    const existingpin = await this.BankModel.findOne({authpin:pin}).exec();
    if (existingpin) 
      return {
       success: false,
       errors:['pin already exists. try again']
      }


    const existingDID = await this.BankModel.findOne({bankDID:walletDidDto.walletDID}).exec();
    if (existingDID) 
     await this.BankModel.findByIdAndRemove(existingDID._id).exec();
      
    const newBank = {
      authpin: pin,
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



  async newProduct(
    //authorizationHeader: string,
    newProductBody: NewProductDto
  ): Promise<CheckResult> {

    const {productName, requiredEvents, lastInChainEvent} = newProductBody;

    if (! requiredEvents.some(e => e == lastInChainEvent)) {
      return {
        success:false,
        errors: ['last in chain event must be one of required events']
      }
    }

  try {
    await new this.ProductModel({productName,requiredEvents,lastInChainEvent}).save();
  } catch (e) {
    return {
      success:false,
      errors: [`${e}`]
    }
  } 

    return {success:true}

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

  

  async actors(productName:string, page: number =1, limit: number =5, ): Promise<object> {

    type MetaData ={total:number;pageNumber:number; totalPages:number};
    type resElement = {issuedDate: Date;actorDID:string;legalName:string;allowedEvent:string;lastInChain:boolean;status:string }
    let result: {metadata: MetaData,data: resElement[]} = {metadata:{total:0,pageNumber:0,totalPages:0},data:[]}
  
    const pagevcs = await this.IssuedVCModel.aggregate([
      {
        $match: {
          productName: productName,
          //issued:true,
          // deferred:true,
          // acceptancetoken: {$exists: true},
          downloaded: true
       
        },
        
      },
      {
        $sort: {issuedDate: -1}
      },
      {
        $facet: {
          metaData: [
            {
              $count: "total",
            },
            {
              $addFields: {
                pageNumber: page,
                totalPages: {$ceil: {$divide: ["$total",limit]}},
              } 
            }
          ],
          data: [
            {
              $skip: (page-1)*limit,
            },
            {
              $limit: limit,
            }

          ]
        }
      }
      
    ])

    result.metadata = pagevcs[0].metaData[0];

    if (pagevcs && pagevcs[0] && pagevcs[0].data.length > 0)

     {
      pagevcs[0].data.map((element: IssuedVC)=> {
       
          if ((result.data.some(e =>e.actorDID== element.actorDID) && 
               result.data.some(e=>e.allowedEvent==element.allowedEvent))) {
                result.metadata.total =  result.metadata.total -1;
               } else {
          result.data.push({
                   //   shared_id: element._id,
                      issuedDate: element.issuedDate,
                      actorDID: element.actorDID,
                      legalName: element.legalName,
                      allowedEvent: element.allowedEvent,
                      lastInChain: element.lastInChain,
                      status: element.status,
                    })
                  };
        
      });
    }
    return result;
    
  }
  

  async getsharedvcs(email:string, page: number =1, limit: number =5, searchtext?:string, order?:string ): Promise<object> {

    let result: {metadata: object,data: object[]} = {metadata:{},data:[]}

    // const deferredvcs = await this.IssuedVCModel.find({
    //   issued:false,
    //   deferred:true
    // });

    const ordertype = (order && order.includes('oldest')) ? 1 : -1;
    //console.log('order->'+order +' '+ordertype);
  
    const pagevcs = await this.SharedVCModel.aggregate([
      {
        $match: {
          verifier_email: email,
          //issued:true,
          // deferred:true,
          // acceptancetoken: {$exists: true},
          walletDID: {$exists: true},
         ... (searchtext && 
           {$and:[ 
             {$or:[
              
                { firstname: { "$regex": searchtext, "$options": "i" }},
                { familyname: { "$regex": searchtext, "$options": "i" }},
             ]}      
            ]}
           ),
          // ...(searchtext && {userid: searchtext}),
        },
        
      },
      {
        $sort: {submittedDate: ordertype}
      },
      {
        $facet: {
          metaData: [
            {
              $count: "total",
            },
            {
              $addFields: {
                pageNumber: page,
                totalPages: {$ceil: {$divide: ["$total",limit]}},
              } 
            }
          ],
          data: [
            {
              $skip: (page-1)*limit,
            },
            {
              $limit: limit,
            }

          ]
        }
      }
      
    ])

    result.metadata = pagevcs[0].metaData[0];

    if (pagevcs && pagevcs[0] && pagevcs[0].data.length > 0)

     {
      pagevcs[0].data.map((element: SharedVC)=> {
       
          result.data.push({
                      shared_id: element._id,
                      sharedDate: element.submittedDate,
                      vctype: element.type,
                
                      firstName: element.firstname,
                      familyName: element.familyname,
                    });
        
      });
    }
    return result;
    
  }

 
  async sharedvc(shared_id:string): Promise<object> {

    try {
    const result = await this.SharedVCModel.findById(shared_id).exec() as SharedVC;
    if (result && result.vcjwt) {
      const {status} = await this.tntService.verifyVC(result.vcjwt);
      const vctype = result.type as SupportedVCType;
      const vcdata = getVCdata(result.vcjwt,vctype,result.walletDID);
      return {
        sharedDate: result.submittedDate,
    
        status,
        vcdata : vcdata
      }

    }
    else return {error: 'not found'}
    
    
    } catch (e) {
      console.log('findbyid exec->'+e);
      return {error: `${e}`}
    }

  }

}
export default AdminService;
