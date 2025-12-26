import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueuesService } from './queues.service';
import { QueuesController } from './queues.controller';
import { Queue, QueueSchema } from './queue.schema';
import { Group, GroupSchema } from '../groups/group.schema'; // <--- Додали
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
        { name: Queue.name, schema: QueueSchema },
        { name: Group.name, schema: GroupSchema }, // <--- Додали
    ]),
    UsersModule,
  ],
  controllers: [QueuesController],
  providers: [QueuesService],
})
export class QueuesModule {}