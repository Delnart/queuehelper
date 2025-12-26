import { Controller, Post, Get, Body, Param, Delete, Patch } from '@nestjs/common';
import { QueuesService } from './queues.service';

@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  async create(@Body() body: { subjectId: string }) {
    return this.queuesService.create(body.subjectId);
  }

  @Get('active/:subjectId')
  async getActive(@Param('subjectId') subjectId: string) {
    return this.queuesService.getActive(subjectId);
  }

  @Post('join')
  async join(@Body() body: { queueId: string; telegramId: number; labNumber: number }) {
    return this.queuesService.joinQueue(body.queueId, body.telegramId, body.labNumber);
  }

  // --- НОВІ ЕНДПОІНТИ ---

  @Post('leave')
  async leave(@Body() body: { queueId: string; telegramId: number }) {
    return this.queuesService.leaveQueue(body.queueId, body.telegramId);
  }

  @Post('kick')
  async kick(@Body() body: { queueId: string; adminTgId: number; targetUserId: string }) {
    return this.queuesService.kickUser(body.queueId, body.adminTgId, body.targetUserId);
  }

  @Post('toggle')
  async toggle(@Body() body: { queueId: string }) {
    return this.queuesService.toggleStatus(body.queueId);
  }
}