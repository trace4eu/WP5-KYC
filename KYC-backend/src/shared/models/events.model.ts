import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { Document, Types } from 'mongoose';

export type EventsDocument = Event & Document;

@Schema()
export class Event {
  _id!: Types.ObjectId;

  
  @Prop({required: true})
  documentId!: string;

  @Prop({required: true})
  eventId!: string;

  
  @Prop({required: false})
  eventType!: string;

  
  @Prop({required: true})
  customerName!: string;

  @Prop({required: false, enum: ['pending','completed']})
  status!: string;
  
  @Prop({required: false})
  randomEncKey!: string;

  @Prop({required: true})
  submittedDate!: Date;
}

export const EventsSchema = SchemaFactory.createForClass(Event);
EventsSchema.index({documentId:1,eventId:1,eventType:1}, {unique:true})