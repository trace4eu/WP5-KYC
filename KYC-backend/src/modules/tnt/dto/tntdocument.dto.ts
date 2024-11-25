import {   IsNotEmpty, IsOptional, IsString } from 'class-validator';




export class TnTdocumentDto {

 
  @IsString()
  documentId!: string;

 
}

export default TnTdocumentDto;