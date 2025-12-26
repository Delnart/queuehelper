import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubjectDocument = Subject & Document;

@Schema({ timestamps: true })
export class Subject {
  @Prop({ required: true })
  title: string; // Назва (напр. "Основи Програмування")

  @Prop()
  teacher: string; // Викладач (необов'язково)

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  group: Types.ObjectId; // Прив'язка до групи
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);