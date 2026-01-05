import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Queue, QueueDocument, QueueStatus } from './queue.schema';
import { UsersService } from '../users/users.service';
import { Group, GroupDocument } from '../groups/group.schema';

@Injectable()
export class QueuesService {
  constructor(
    @InjectModel(Queue.name) private queueModel: Model<QueueDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>, 
    private usersService: UsersService,
  ) {}


  private sortQueueEntries(queue: QueueDocument) {
    if (!queue.entries || queue.entries.length === 0) return;

    const activeEntries = queue.entries.filter(e => 
      [QueueStatus.WAITING, QueueStatus.PREPARING, QueueStatus.DEFENDING].includes(e.status as QueueStatus)
    );
    
    if (activeEntries.length === 0) return;

    const minLab = Math.min(...activeEntries.map(e => e.labNumber));

    const minLabStudents = activeEntries.filter(e => e.labNumber === minLab);
    const shouldPrioritizeMin = (queue.config?.priorityMinLab ?? true) && minLabStudents.length <= 11;

    queue.entries.sort((a, b) => {
      const statusOrder: Record<string, number> = { 
        [QueueStatus.DEFENDING]: 0, 
        [QueueStatus.PREPARING]: 1, 
        [QueueStatus.WAITING]: 2 
      };
      const statA = statusOrder[a.status] ?? 99;
      const statB = statusOrder[b.status] ?? 99;
      
      if (statA !== statB) return statA - statB;

      if (statA === 2 && shouldPrioritizeMin) {
        const isPriorityA = a.labNumber === minLab && (a.attemptsUsed || 0) < 2;
        const isPriorityB = b.labNumber === minLab && (b.attemptsUsed || 0) < 2;

        if (isPriorityA && !isPriorityB) return -1; 
        if (!isPriorityA && isPriorityB) return 1; 
      }

      const posA = a.position || 9999;
      const posB = b.position || 9999;

      if (posA !== posB) return posA - posB;
      
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
  }


  async create(subjectId: string) {
    await this.queueModel.updateMany({ subject: new Types.ObjectId(subjectId) }, { isActive: false });
    
    const newQueue = new this.queueModel({ 
        subject: new Types.ObjectId(subjectId), 
        isActive: true, 
        config: { maxSlots: 35, minMaxRule: true, priorityMinLab: true }
    });
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
    
    // Перевірка чи юзер вже в черзі
    const exists = queue.entries.some(e => e.user.toString() === user._id.toString());
    if (exists) throw new BadRequestException('Ти вже в черзі!');

    // Логіка Мін+2 (тільки якщо в черзі вже хтось є)
    if (queue.config?.minMaxRule) {
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

    // Додаємо користувача
    queue.entries.push({ 
        user: user._id, 
        labNumber, 
        joinedAt: new Date(),
        status: QueueStatus.WAITING,
        position: position,
        attemptsUsed: 0
    } as any);

    // Сортуємо чергу
    this.sortQueueEntries(queue);

    return await queue.save();
  }

  async leaveQueue(queueId: string, telegramId: number) {
    const queue = await this.queueModel.findById(queueId);
    const user = await this.usersService.findByTelegramId(telegramId);
    if (!queue || !user) throw new BadRequestException('Not found');

    // Видаляємо користувача
    queue.entries = queue.entries.filter(e => e.user.toString() !== user._id.toString());
    
    // Пересортовуємо (бо мін. лаба могла змінитись)
    this.sortQueueEntries(queue);
    
    return await queue.save();
  }

  async updateStatus(queueId: string, userId: string, newStatus: string) {
    const queue = await this.queueModel.findById(queueId);
    if (!queue) throw new BadRequestException('Queue not found');

    const entry = queue.entries.find(e => e.user.toString() === userId);
    if (!entry) throw new BadRequestException('User not in queue');

    // Якщо статус змінився на FAILED (не здав), збільшуємо лічильник спроб
    if (newStatus === QueueStatus.FAILED && entry.status !== QueueStatus.FAILED) {
        entry.attemptsUsed = (entry.attemptsUsed || 0) + 1;
    }

    entry.status = newStatus;
    
    // Пересортовуємо, бо зміна статусу впливає на порядок (наприклад, Preparing піднімається вгору)
    this.sortQueueEntries(queue);

    return await queue.save();
  }

  async kickUser(queueId: string, adminTgId: number, targetUserId: string) {
    const queue = await this.queueModel.findById(queueId);
    if (!queue) throw new BadRequestException('Queue not found');

    queue.entries = queue.entries.filter(e => e.user.toString() !== targetUserId);
    this.sortQueueEntries(queue);
    
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