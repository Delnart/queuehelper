import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Queue, QueueDocument } from './queue.schema';
import { UsersService } from '../users/users.service';
import { Group, GroupDocument } from '../groups/group.schema';
import { QueueStatus } from './queue.schema';

@Injectable()
export class QueuesService {
  constructor(
    @InjectModel(Queue.name) private queueModel: Model<QueueDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>, 
    private usersService: UsersService,
  ) {}

  async create(subjectId: string) {
    await this.queueModel.updateMany({ subject: new Types.ObjectId(subjectId) }, { isActive: false });
    const newQueue = new this.queueModel({ subject: new Types.ObjectId(subjectId), isActive: true, config: { maxSlots: 30 }});
    return await newQueue.save();
  }

  async getActive(subjectId: string) {
    return await this.queueModel
      .findOne({ subject: new Types.ObjectId(subjectId), isActive: true })
      .populate('entries.user', 'fullName username telegramId');
  }

  async joinQueue(queueId: string, telegramId: number, labNumber: number, position?: number) {
    const queue = await this.queueModel.findById(queueId);
    if (!queue || !queue.isActive) throw new BadRequestException('Черга закрита');
    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) throw new BadRequestException('User not found');
    const exists = queue.entries.some(e => e.user.toString() === user._id.toString());
    if (exists) throw new BadRequestException('Ти вже в черзі!');
    if (queue.config?.minMaxRule && queue.entries.length > 0) {
      const activeEntries = queue.entries.filter(e => 
        [QueueStatus.WAITING, QueueStatus.PREPARING, QueueStatus.DEFENDING].includes(e.status as QueueStatus)
      );
      
      if (activeEntries.length > 0) {
        const minLab = Math.min(...activeEntries.map(e => e.labNumber));
        const maxAllowed = minLab + 2;

        if (labNumber > maxAllowed) {
            throw new BadRequestException(`Зараз можна здавати максимум ${maxAllowed}-ту лабу (мін: ${minLab})`);
        }
      }
    }
    queue.entries.push({ 
        user: user._id, 
        labNumber, 
        joinedAt: new Date(),
        status: QueueStatus.WAITING,
        position: position 
    } as any);

    if (position) {
        queue.entries.sort((a, b) => (a.position || 999) - (b.position || 999));
    }

    return await queue.save();
  }

  async leaveQueue(queueId: string, telegramId: number) {
    const queue = await this.queueModel.findById(queueId);
    const user = await this.usersService.findByTelegramId(telegramId);
    if (!queue || !user) throw new BadRequestException('Not found');

    queue.entries = queue.entries.filter(e => e.user.toString() !== user._id.toString());
    return await queue.save();
  }
  async updateStatus(queueId: string, userId: string, newStatus: string) {
    const queue = await this.queueModel.findById(queueId);
    
    if (!queue) {
        throw new BadRequestException('Queue not found');
    }

    const entry = queue.entries.find(e => e.user.toString() === userId);
    if (!entry) throw new BadRequestException('User not in queue');

    entry.status = newStatus;
    return await queue.save();
  }
  async kickUser(queueId: string, adminTgId: number, targetUserId: string) {
    const queue = await this.queueModel.findById(queueId).populate('subject');
    if (!queue) throw new BadRequestException('Queue not found');

    queue.entries = queue.entries.filter(e => e.user.toString() !== targetUserId);
    return await queue.save();
  }

  async toggleStatus(queueId: string) {
    const queue = await this.queueModel.findById(queueId);
    if (!queue) throw new BadRequestException('Queue not found');
    
    queue.isActive = !queue.isActive;
    return await queue.save();
  }
  async getBySubject(subjectId: string) {
    return await this.queueModel
      .findOne({ subject: new Types.ObjectId(subjectId) })
      .sort({ _id: -1 }) 
      .populate('entries.user', 'fullName username telegramId');
  }
}