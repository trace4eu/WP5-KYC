import { IsIn,  IsString,  } from "class-validator";

export class ReqEventsDto {
  // @IsString()
  // did!: string;

  @IsString()
  @IsIn(['pending','completed','all'])
  status!: string;


 
}

export default ReqEventsDto;
