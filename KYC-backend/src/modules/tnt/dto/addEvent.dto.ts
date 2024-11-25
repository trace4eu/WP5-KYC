import { ArrayNotEmpty, IsArray, IsIn, IsJSON, IsJWT,  IsObject,  IsString,  MaxLength,  MinLength, ValidateNested } from "class-validator";


import { Type } from "class-transformer";
import IsDid from "./validators/IsDid.js";



export class AddEventDto {
  // @IsString()
  // did!: string;

  @IsString()
  documentId!: string;

  @IsString()
  eventId!: string;


  @IsString()
  @IsIn(['KYC_docs_shared','personal_data_shared'])
  eventType!: string;

  @IsString()
  customerName!: string;
}

export default AddEventDto;