import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { Document, Types } from 'mongoose';

export type TnTInfoDocument = TnTInfo & Document;

@Schema()
export class TnTInfo {
  _id!: Types.ObjectId;

  
  @Prop({required: true})
  customerName!: string;

  @Prop({required: true})
  walletDID!: string;

  
  @Prop({required: false})
  documentHash!: string;


  
}

export const TnTInfoSchema = SchemaFactory.createForClass(TnTInfo);