import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module'; 

@Module({
  imports: [UsersModule, GroupsModule],
  providers: [BotService],
})
export class BotModule {}