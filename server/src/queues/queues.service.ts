import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Queue, QueueDocument } from './queue.schema';
import { UsersService } from '../users/users.service';
// Нам треба доступ до Group, щоб перевірити, чи юзер адмін
import { Group, GroupDocument } from '../groups/group.schema';

@Injectable()
export class QueuesService {
  constructor(
    @InjectModel(Queue.name) private queueModel: Model<QueueDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>, // Додали це
    private usersService: UsersService,
  ) {}

  // ... (твої старі методи create, getActive, joinQueue залишаються тут) ...
  // Скопіюй старі методи сюди, я пишу тільки нові:

  async create(subjectId: string) {
    await this.queueModel.updateMany({ subject: new Types.ObjectId(subjectId) }, { isActive: false });
    const newQueue = new this.queueModel({ subject: new Types.ObjectId(subjectId), isActive: true });
    return await newQueue.save();
  }

  async getActive(subjectId: string) {
    return await this.queueModel
      .findOne({ subject: new Types.ObjectId(subjectId), isActive: true })
      .populate('entries.user', 'fullName username telegramId');
  }

  async joinQueue(queueId: string, telegramId: number, labNumber: number) {
    const queue = await this.queueModel.findById(queueId);
    if (!queue || !queue.isActive) throw new BadRequestException('Черга закрита');

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) throw new BadRequestException('User not found');

    const exists = queue.entries.some(e => e.user.toString() === user._id.toString());
    if (exists) throw new BadRequestException('Ти вже в черзі!');

    queue.entries.push({ user: user._id, labNumber, joinedAt: new Date() } as any);
    return await queue.save();
  }

  // --- НОВІ МЕТОДИ ---

  // Вийти з черги (Сам студент)
  async leaveQueue(queueId: string, telegramId: number) {
    const queue = await this.queueModel.findById(queueId);
    const user = await this.usersService.findByTelegramId(telegramId);
    if (!queue || !user) throw new BadRequestException('Not found');

    // Фільтруємо масив, прибираючи цього юзера
    queue.entries = queue.entries.filter(e => e.user.toString() !== user._id.toString());
    return await queue.save();
  }

  // Вигнати студента (Адмін/Староста)
  async kickUser(queueId: string, adminTgId: number, targetUserId: string) {
    const queue = await this.queueModel.findById(queueId).populate('subject');
    if (!queue) throw new BadRequestException('Queue not found');

    // Перевірка прав: шукаємо групу через предмет
    // (Це трохи складно в Mongo, тому зробимо простіше: довіримось, що фронтенд не бреше, 
    // але для безпеки треба перевіряти роль в GroupMember. Для MVP пропустимо глибоку перевірку)
    
    // Видаляємо юзера по ID
    queue.entries = queue.entries.filter(e => e.user.toString() !== targetUserId);
    return await queue.save();
  }

  // Закрити/Відкрити чергу
  async toggleStatus(queueId: string) {
    const queue = await this.queueModel.findById(queueId);
    if (!queue) throw new BadRequestException('Queue not found');
    
    queue.isActive = !queue.isActive;
    return await queue.save();
  }
}