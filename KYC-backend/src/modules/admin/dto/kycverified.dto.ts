import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import IsDid from "../../tnt/dto/validators/IsDid.js";
import { Type } from "class-transformer";


export class PersonalDataObject {
  
  firstName: string | undefined;
  lastName:string | undefined;
  nationality:string | undefined;
  birthDate:string | undefined;
  personalId:string | undefined;
  address:string | undefined;
  salary:string | undefined;
  employer:string | undefined;
  telephone:string | undefined;
  email:string | undefined;
}

export class KYCVerifiedDto {


  @IsString()
  documentId!: string;

  @IsString()
  eventId!: string;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => PersonalDataObject)
  personalData!: PersonalDataObject;

  @IsString()
  customerName!: string;
 
}




export default KYCVerifiedDto;
