import { BadRequestException, Body, Controller, Get, Header, Headers, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { CheckResult, NewPinResult } from "../../shared/interfaces.js";
import { AdminService } from "./admin.service.js";
import paginateDto, { paginateActorsDto, ProductsDto } from "./dto/paginate.dto.js";
import pkg  from "jsonwebtoken";
import { hash } from "bcrypt";
import { UserService } from "../users/user.service.js";

import { walletdidDto } from "../tnt/dto/walletdid.dto.js";
import ReqOnBoardDto from "./dto/reqonboard.dto.js";
import DecryptDto, { MockDecryptDto } from "./dto/decrypt.dto.js";
import  { ReqEventsDto } from "./dto/reqevents.dto.js";
import KYCVerifiedDto from "./dto/kycverified.dto.js";


const { sign } = pkg;

@Controller("/admin")
export class AdminController {
  constructor(private adminService: AdminService, private userService: UserService) {}

  @HttpCode(200)
  @Get("/newwallet")
  async newWallet(): Promise<Object> {
    return await this.adminService.newWallet();
  }

  @HttpCode(200)
  @Get("/walletcab")
  async walletCab(): Promise<Object> {
    return await this.adminService.walletCab();
  }


     @HttpCode(200)
     @Get("/genPin")
     async genPin(
       @Query() walletDidDto:walletdidDto
     ): Promise<CheckResult | NewPinResult> {
       return await this.adminService.genPin(walletDidDto);
     }

  //called from bank admin to initiate onBoard process with CBC using pre-authorized-code
    @HttpCode(200)
    @Get("/reqOnBoard")
    async reqOnBoard(
      @Query() reqonboardDto:ReqOnBoardDto
    ): Promise<CheckResult> {
      return await this.adminService.reqOnBoard(reqonboardDto);
    }

    //called from bank admin to decrypt a doc in off-chain. mock version
    @HttpCode(200)
    @Get("/mock_decrypt_docs")
  
    async mockDecryptDocs(
      @Query() mockDecryptDto:MockDecryptDto
    ): Promise<CheckResult|Buffer> {
      return await this.adminService.mockDecryptDocs(mockDecryptDto);
    }

    @HttpCode(200)
    @Post("/decrypt_docs")
   // @Header('Content-Type', 'application/octet-stream')
    async decryptDocs(
      @Body() decryptDto:DecryptDto
    ): Promise<Buffer> {
      
      return await this.adminService.decryptDocs(decryptDto);
    
    }

    @HttpCode(200)
    @Post("/kyc_verified")
   // @Header('Content-Type', 'application/octet-stream')
    async kyc_verified(
      @Body() kycVerified:KYCVerifiedDto
    ): Promise<CheckResult> {
      
     
     // return {success:true}
     return await this.adminService.kyc_verified(kycVerified);
    
    }


    
  //called from bank admin to get events submitted by wallets to local events db
  @HttpCode(200)
  @Get("/events")
  async events(
    @Query() reqEventsDto:ReqEventsDto
  ): Promise<object> {
    return await this.adminService.localEvents(reqEventsDto);
  }

 





  @HttpCode(200)
  @Post('changepwd',)
  async changePWD(
    @Body() newpwd: {newpwd:string},
    @Req() req: Request, 
    
  ) {
   
    if (!newpwd || !newpwd.newpwd) {
      throw new BadRequestException('new password not specified');
    }
    const headers = req.headers as unknown as {email:string};
  
    const email= headers.email;
    const newpassword = await hash(newpwd.newpwd, 10)
    const user = await this.userService.findOne(email)
 
    // if (!user) {
    //   res.code(401).send('user not found');
    //   return;
    // }

    if (!user) throw new BadRequestException('user not found');

    await this.userService.update(user._id, { password: newpassword })

   


      return {
        'message': 'pwd changed Successfully',
        'name': user.nickname,
        'token': sign({ _id: user._id, nickname: user.nickname, email:user.email },
          `${process.env['JWT_SECRET_PASSWORD']}`,
          { 'expiresIn': '15m', 'algorithm': 'HS256' })
      }
    
  }

}

export default AdminController;
