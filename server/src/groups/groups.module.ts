import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group, GroupSchema } from './group.schema'; 
import { Queue, QueueSchema } from '../queues/queue.schema'; 
import { UsersModule } from '../users/users.module'; 
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Queue.name, schema: QueueSchema }, 
    ]),
    UsersModule, 
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService]
})
export class GroupsModule {}