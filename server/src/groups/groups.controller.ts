import { Controller, Get, Param } from '@nestjs/common';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('my/:tgId')
  async findMyGroups(@Param('tgId') tgId: string) {
    // Конвертуємо в число
    return this.groupsService.getMyGroups(Number(tgId));
  }
}