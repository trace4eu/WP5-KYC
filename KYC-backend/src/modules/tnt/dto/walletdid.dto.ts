import { IsNotEmpty, IsString } from "class-validator";
import IsDid from "./validators/IsDid.js";


export class walletdidDto {

  
  @IsString()
  walletDID!: string;

}