import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import IsDid from "../../tnt/dto/validators/IsDid.js";

export class DecryptDto {
  // @IsString()
  // did!: string;

  @IsString()
  documentId!: string;

  @IsString()
  eventId!: string;


 
}

export class MockDecryptDto {
  // @IsString()
  // did!: string;

  @IsString()
  offchainFile!: string;

  @IsString()
  encEncKey!: string;

  @IsDid()
  walletDID!: string;
}


export default DecryptDto;
