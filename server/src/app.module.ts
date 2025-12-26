import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { BotModule } from './bot/bot.module';
import { GroupsModule } from './groups/groups.module'; // <--- Додав імпорт
import { SubjectsModule } from './subjects/subjects.module';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    BotModule,
    GroupsModule, 
    SubjectsModule,
    QueuesModule,
  ],
})
export class AppModule {}