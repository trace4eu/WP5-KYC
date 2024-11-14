import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { Document, Types } from 'mongoose';

export type SharedVCDocument = SharedVC & Document;

@Schema()
export class SharedVC {
  _id!: Types.ObjectId;

  @Prop({required: true})
  verifier_name!:string;

  @Prop({required: true})
  verifier_email!:string;

  @Prop({required: true})
  validity_period!:string;

  @Prop({required: true })
  vcjwt!: string;

  @Prop({required: true})
  vcid!:string;

  @Prop({required: true})
  walletDID!:string;

  //@Prop({required: true, unique: true})
  @Prop({required: true})
  type!:string;

  @Prop({required: false})
  firstname!:string;

  @Prop({required: false})
  familyname!:string;
 
  @Prop({required: true})
  submittedDate!: Date;
  
}

export const SharedVCSchema = SchemaFactory.createForClass(SharedVC);