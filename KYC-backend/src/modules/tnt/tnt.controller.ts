import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Response,
} from "@nestjs/common";

import type { FastifyReply } from "fastify";
import { OAuth2Error } from "../../shared/errors/index.js";
import { TntService } from "./tnt.service.js";
import type {
 
  BanksInfo,
  CheckResult,
  CredentialIssuerMetadata,
  JsonWebKeySet,
  KnownIssuersMetadata,
} from "../../shared/interfaces.js";

import type { CredentialOfferPayload, CredentialResponse, DeferredCredentialResponse, VerifyResponse } from "./tnt.interface.js";

import { verifyVCDto } from "./dto/verify-vc.dto.js";
import { BadRequestError, ProblemDetailsError } from "@cef-ebsi/problem-details-errors";
import { deleteForDto } from "./dto/deletefor.dto.js";
import getLicenseDto from "./dto/getlicense.dto.js";
import availActorsDto from "./dto/availactors.dto.js";
import NewBatchDto, { InitKYCShareDto } from "./dto/initKYCshare.dto.js";
import UpdateBatchDto from "./dto/updatebatch.dto.js";
import { ProductsDto } from "../admin/dto/paginate.dto.js";
import TnTqueryDto from "./dto/tntquery.dto.js";
import TnTdocumentDto from "./dto/tntdocument.dto.js";
import { walletdidDto } from "./dto/walletdid.dto.js";
import DecryptDto, { MockDecryptDto } from "../admin/dto/decrypt.dto.js";

@Controller("/tnt")
export class TnTController {
  constructor(private tntService: TntService) {}

  
  @HttpCode(200)
  @Get("/jwks")
  @Header("Content-type", "application/jwk-set+json")
  async getJwks(): Promise<JsonWebKeySet> {
    return this.tntService.getJwks();
  }


  
  @HttpCode(200)
  @Get("/.well-known/openid-credential-issuer")
  getCredentialIssuerMetadata(): CredentialIssuerMetadata {
    return this.tntService.getCredentialIssuerMetadata();
  }



  //offered by CBC. called by other banks wishing to onBoard
  @Get('/getOnBoard')
  @HttpCode(200)
  @Header("content-type", "text/plain; charset=utf-8")
  
  async getOnBoard(
    @Query() walletDIDdto: walletdidDto,
  ): Promise<string> {
  
    const queryurl = await this.tntService.getOnBoard(walletDIDdto);
    
    return queryurl 
  }

   //offered by CBC. called by web wallets to get a list of available banks
   @Get('/banks')
   @HttpCode(200)
   @Header("content-type", "application/json")
   
   async banks(): Promise<BanksInfo> {
   
     return await this.tntService.banks();
     
   }

   //remove this
   @HttpCode(200)
    @Post("/mock_decrypt_docs")
   // @Header('Content-Type', 'application/octet-stream')
    async mockDecryptDocs(
      @Body() mockDecryptDto:MockDecryptDto
    ): Promise<Buffer> {

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

      //remove this
    @HttpCode(200)
    @Post("/decrypt_docs")
   // @Header('Content-Type', 'application/octet-stream')
    async decryptDocs(
      @Body() decryptDto:DecryptDto
    ): Promise<Buffer> {
      
      const result= await this.tntService.adminDecryptDocs(decryptDto);
     
     if ('success' in result) {
       let error;
       if ('errors' in result) error = result.errors[0]; else error='no error description'
       throw new OAuth2Error("invalid_request", {
          errorDescription: error,
        });
      }
      return result;
    
    }



  @HttpCode(200)
  @Post("/credential")
  postCredential(
    @Headers("content-type") contentType: string | undefined,
    @Headers("authorization") authorizationHeader: string,
    @Body() body: unknown
  ): Promise<CredentialResponse | DeferredCredentialResponse> {
    // Only accept application/json
    // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-11.html#section-7.2
    if (
      !contentType ||
       !contentType.toLowerCase().includes("application/json")) {
      throw new OAuth2Error("invalid_request", {
        errorDescription: "Content-type must be application/json",
      });
    }

    return this.tntService.postCredential(authorizationHeader, body);
  }


   @Get("/document")
   @HttpCode(200)
   async document(
     //@Req() req: Request,
     @Query() params:TnTdocumentDto
     ): Promise<object> {
   
     console.log('params->'+JSON.stringify(params));
 
     return await this.tntService.document(params);
   }

  @HttpCode(201)
  @Post("/init_KYC_share")
  async init_KYC_share(
    @Headers("content-type") contentType: string | undefined,
  //  @Headers("authorization") authorizationHeader: string,
    @Body() body: InitKYCShareDto
  ): Promise<CheckResult> {
    // Only accept application/json
    
    if (!contentType ||
      !contentType.toLowerCase().includes("application/json")) {
      throw new OAuth2Error("invalid_request", {
        errorDescription: "Content-type must be application/json",
      });
    }

    return await this.tntService.init_KYC_share( body);
  }


   
   @HttpCode(200)
   @Post("/verifyVC")
   @Header("Cache-Control", "no-store")
   @Header("Pragma", "no-cache")
   async verifyVC(
     @Headers("content-type") contentType: string,
     @Body() body: verifyVCDto // Validate DTO within the service method so we can properly handle the error response
   ): Promise<VerifyResponse> {
    
     if (!contentType.toLowerCase().includes("application/json")) {
      throw new OAuth2Error("invalid_request", {
        errorDescription: "Content-type must be application/json",
      });
     }
 
     return await this.tntService.verifyVC(body.jwtvc);
   }


  

 
}

export default TnTController;
