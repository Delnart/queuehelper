import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QueueDocument = Queue & Document;

@Schema({ _id: false })
export class QueueEntry {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true })
  labNumber: number; // Номер лаби (для правила Min+2)

  @Prop({ default: Date.now })
  joinedAt: Date;
}

@Schema({ timestamps: true })
export class Queue {
  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subject: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean; // Чи відкрита черга

  @Prop({ type: [QueueEntry], default: [] })
  entries: QueueEntry[];
}

export const QueueSchema = SchemaFactory.createForClass(Queue);