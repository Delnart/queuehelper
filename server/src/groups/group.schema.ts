import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupDocument = Group & Document;

@Schema({ _id: false })
export class GroupMember {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ default: 'student' })
  role: string;
}

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  telegramChatId: number; // ID чату в телеграмі

  @Prop()
  scheduleId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: [GroupMember], default: [] })
  members: GroupMember[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);