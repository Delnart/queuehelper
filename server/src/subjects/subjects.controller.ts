import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SubjectsService } from './subjects.service';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  async create(@Body() body: { title: string; groupId: string; teacher?: string }) {
    return this.subjectsService.create(body.title, body.groupId, body.teacher);
  }

  @Get('group/:groupId')
  async findByGroup(@Param('groupId') groupId: string) {
    return this.subjectsService.findAllByGroup(groupId);
  }
}