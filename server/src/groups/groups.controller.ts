import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupRole } from './group.schema';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async create(@Body() body: { title: string; ownerTgId: number }) {
    return this.groupsService.create(body.title, body.ownerTgId);
  }

  @Post('join')
  async join(@Body() body: { groupId: string; telegramId: number }) {
    return this.groupsService.joinGroup(body.groupId, body.telegramId);
  }

  @Get('my/:telegramId')
  async getMyGroups(@Param('telegramId') telegramId: string) {
    return this.groupsService.getMyGroups(Number(telegramId));
  }

  @Get(':groupId')
  async getOne(@Param('groupId') groupId: string) {
    return this.groupsService.getGroupInfo(groupId);
  }

  @Post('role')
  // Важливо: тут має бути @Body(), а не Body
  async changeRole(@Body() body: { groupId: string; adminTgId: number; targetUserId: string; newRole: GroupRole }) {
    return this.groupsService.changeRole(body.groupId, body.adminTgId, body.targetUserId, body.newRole);
  }
}