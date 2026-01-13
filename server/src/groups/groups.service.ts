import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument, GroupRole } from './group.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    private usersService: UsersService,
  ) {}

  async create(title: string, ownerTgId: number) {
    const user = await this.usersService.findByTelegramId(ownerTgId);
    if (!user) throw new BadRequestException('User not found');

    const fakeChatId = -Math.floor(Math.random() * 1000000000);

    const newGroup = new this.groupModel({
      title,
      telegramChatId: fakeChatId,
      owner: user._id,
      members: [{ user: user._id, role: GroupRole.OWNER }]
    });
    return await newGroup.save();
  }

  async joinGroup(groupId: string, telegramId: number) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) throw new BadRequestException('User not found');

    const exists = group.members.find(m => m.user.toString() === user._id.toString());
    if (exists) throw new BadRequestException('User already in group');

    group.members.push({ user: user._id, role: GroupRole.STUDENT } as any);
    return await group.save();
  }

  async getMyGroups(telegramId: number) {
    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return [];
    return await this.groupModel.find({ 'members.user': user._id }).exec();
  }

  async getGroupInfo(groupId: string) {
     return await this.groupModel.findById(groupId).populate('members.user', 'fullName username telegramId');
  }

  async changeRole(groupId: string, adminTgId: number, targetUserId: string, newRole: GroupRole) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    
    const adminUser = await this.usersService.findByTelegramId(adminTgId);
    if (!adminUser) throw new BadRequestException('Admin not found');
    
    const adminMember = group.members.find(m => m.user.toString() === adminUser._id.toString());
    
    if (!adminMember || (adminMember.role !== GroupRole.OWNER && adminMember.role !== GroupRole.STAROSTA)) {
        throw new BadRequestException('Тільки Овнер або Староста можуть міняти ролі');
    }

    const targetMember = group.members.find(m => m.user.toString() === targetUserId);
    if (!targetMember) throw new BadRequestException('User not in group');

    targetMember.role = newRole;
    return await group.save();
  }
  
  async checkPermission(groupId: string, telegramId: number, requiredRoles: GroupRole[]) {
     const group = await this.groupModel.findById(groupId);
     if (!group) return false;

     const user = await this.usersService.findByTelegramId(telegramId);
     if (!user) return false;

     const member = group.members.find(m => m.user.toString() === user._id.toString());
     
     if (!member || !requiredRoles.includes(member.role as GroupRole)) {
         return false;
     }
     return true;
  }


  async createGroupFromChat(chatId: number, title: string, ownerTgId: number) {
    const existingGroup = await this.groupModel.findOne({ telegramChatId: chatId });
    if (existingGroup) {
      throw new BadRequestException('Група вже зареєстрована!');
    }

    const user = await this.usersService.findByTelegramId(ownerTgId);
    if (!user) throw new BadRequestException('User not found. Write /start to bot first.');

    const newGroup = new this.groupModel({
      title, 
      telegramChatId: chatId,
      owner: user._id,
      members: [{ user: user._id, role: GroupRole.OWNER }] 
    });
    
    return await newGroup.save();
  }

  async addMember(chatId: number, telegramId: number) {
    const group = await this.groupModel.findOne({ telegramChatId: chatId });
    if (!group) throw new NotFoundException('Group not registered yet');

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) throw new BadRequestException('User not found');

    const exists = group.members.find(m => m.user.toString() === user._id.toString());
    if (exists) {
        return group;
    }

    group.members.push({ user: user._id, role: GroupRole.STUDENT } as any);
    return await group.save();
  }
}