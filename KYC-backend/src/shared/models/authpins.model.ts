import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { Document, Types } from 'mongoose';

export type AuthPINDocument = AuthPIN & Document;

@Schema()
export class AuthPIN {
  _id!: Types.ObjectId;

  @Prop({
    required: true,
    maxlength: 20,
    minlength: 6,
    unique: true, 
  })
  authpin!: string;

  @Prop({required: true})
  type!: string;

  @Prop({required: false})
  accrFortype!: string;
  
  @Prop({
    default: Date.now,
    expires: 259200, //3 days
  })
  createdAt!: Date;

  
}

export const AuthPINSchema = SchemaFactory.createForClass(AuthPIN);