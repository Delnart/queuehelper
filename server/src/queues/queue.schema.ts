import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QueueDocument = Queue & Document;

export enum QueueStatus {
  WAITING = 'waiting',     // В черзі
  PREPARING = 'preparing', // Готується
  DEFENDING = 'defending', // Здає
  COMPLETED = 'completed', // Здав
  SKIPPED = 'skipped',     // Пропустив/Відмовився
  FAILED = 'failed'        // Не здав
}

@Schema({ _id: false })
export class QueueEntry {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true })
  labNumber: number; 

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ type: String, enum: QueueStatus, default: QueueStatus.WAITING })
  status: string;

  @Prop({ default: 0 })
  attemptsUsed: number; // Кількість використаних спроб
  
  @Prop()
  position?: number;
}

@Schema({ timestamps: true })
export class Queue {
  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subject: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [QueueEntry], default: [] })
  entries: QueueEntry[];

  @Prop({ type: Object, default: {
    maxSlots: 35,
    minMaxRule: true,       // Правило Мін+2
    priorityMinLab: true,   // Пріоритет для тих, хто здає мінімальну лабу
    maxAttempts: 2          // Макс спроб для пріоритету
  }})
  config: any;
}

export const QueueSchema = SchemaFactory.createForClass(Queue);