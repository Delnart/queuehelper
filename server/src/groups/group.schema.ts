import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';

export type GroupDocument = Group & Document;

// Повертаємо ENUM для ролей, щоб працював сайт
export enum GroupRole {
  OWNER = 'owner',
  STAROSTA = 'starosta',
  DEPUTY = 'deputy',
  ADMIN = 'admin',
  STUDENT = 'student',
}

@Schema({ _id: false })
export class GroupMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: GroupRole, default: GroupRole.STUDENT })
  role: string;
}

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  telegramChatId: number; 

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: [SchemaFactory.createForClass(GroupMember)], default: [] })
  members: GroupMember[];

  @Prop({ default: '' })
  scheduleUrl: string;
}

export const GroupSchema = SchemaFactory.createForClass(Group);