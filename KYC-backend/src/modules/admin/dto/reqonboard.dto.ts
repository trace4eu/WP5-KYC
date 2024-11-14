import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class ReqOnBoardDto {
  // @IsString()
  // did!: string;

  @IsString()
  CBCurl!: string;

  @IsString()
  pin!: string;

 
}

export default ReqOnBoardDto;
