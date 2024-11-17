import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { Document, Types } from 'mongoose';

export type BanksDocument = Bank & Document;

@Schema()
export class Bank {
  _id!: Types.ObjectId;

  
  @Prop({required: true})
  pin!: string;

  @Prop({required: true})
  bankDID!: string;

  
  @Prop({required: false})
  bankName!: string;

  
  @Prop({required: false})
  bankUrl!: string;

  @Prop({required: false})
  access_token!: string;
  
}

export const BanksSchema = SchemaFactory.createForClass(Bank);