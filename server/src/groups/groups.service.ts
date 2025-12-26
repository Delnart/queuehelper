import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from './group.schema';
import { UsersService } from '../users/users.service';
import { Queue, QueueDocument } from '../queues/queue.schema';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(Queue.name) private queueModel: Model<QueueDocument>,
    private usersService: UsersService,
  ) {}
    async getActive(subjectId: string) {
       return await this.queueModel
         .findOne({ subject: new Types.ObjectId(subjectId) })
         .sort({ createdAt: -1 }) // <--- БЕРЕМО НАЙНОВІШУ, навіть якщо вона закрита
         .populate('entries.user', 'fullName username telegramId'); 
     }
  async createGroupFromChat(chatId: number, title: string, adminTgId: number) {
    const user = await this.usersService.findByTelegramId(adminTgId);
    if (!user) throw new BadRequestException('User not found');

    const existingGroup = await this.groupModel.findOne({ telegramChatId: chatId });
    if (existingGroup) return existingGroup;

    const newGroup = new this.groupModel({
      name: title,
      telegramChatId: chatId,
      createdBy: user._id,
      members: [{ user: user._id, role: 'headman' }],
    });

    return await newGroup.save();
  }

  async addMember(chatId: number, userTgId: number) {
    const group = await this.groupModel.findOne({ telegramChatId: chatId });
    if (!group) throw new BadRequestException('Group not found');

    const user = await this.usersService.findByTelegramId(userTgId);
    if (!user) throw new BadRequestException('User not registered');

    // Перевіряємо, чи юзер вже є в групі
    const isMember = group.members.some(m => m.user.toString() === user._id.toString());
    if (isMember) return group;

    group.members.push({ user: user._id, role: 'student' });
    return await group.save();
  }

  async getMyGroups(telegramId: number) {
    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return [];

    return await this.groupModel.find({ 'members.user': user._id });
  }
  
}