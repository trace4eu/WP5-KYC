import { ArrayNotEmpty, IsArray, IsJSON, IsJWT,  IsObject,  IsString,  MaxLength,  MinLength, ValidateNested } from "class-validator";


import { Type } from "class-transformer";
import IsDid from "./validators/IsDid.js";



export class InitKYCShareDto {
  // @IsString()
  // did!: string;

  @IsString()
  @MinLength(66)
  @MaxLength(66)
  documentHash!: string;

  @IsDid()
  didKey!: string;


  @IsString()
  customerName!: string;

  @IsString()
  vp_token!: string;
}

export default InitKYCShareDto;