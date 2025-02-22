import {   IsNotEmpty, IsOptional, IsString } from 'class-validator';




export class TnTdocumentDto {

 
  @IsString()
  documentId!: string;

 
}


export class TnTEventDto {

 
  @IsString()
  documentId!: string;
  @IsString()
  eventId!: string;
 
}

export default TnTdocumentDto;