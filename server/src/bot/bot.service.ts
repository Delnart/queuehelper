import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import { UsersService } from '../users/users.service';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Bot;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private groupsService: GroupsService,
  ) {}

  onModuleInit() {
    this.initBot();
  }

  private initBot() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env');
    }

    this.bot = new Bot(token);

    this.bot.command('start', async (ctx) => {
      if (!ctx.from) return;
      const { id, username, first_name, last_name } = ctx.from;
      const fullName = `${first_name} ${last_name || ''}`.trim();
      
      await this.usersService.findOrCreate(id, username || '', fullName);
      
      if (ctx.chat.type === 'private') {
        await ctx.reply(`Привіт! Щоб почати роботу, додай мене в групу своєї групи (чат) і напиши /register.`);
      }
    });

    this.bot.command('register', async (ctx) => {
      if (ctx.chat.type === 'private') return ctx.reply('Ця команда працює тільки в групах!');
      if (!ctx.from) return;
      
      const admins = await ctx.getChatAdministrators();
      const isAdmin = admins.some(a => a.user.id === ctx.from?.id);

      if (!isAdmin) return ctx.reply('Тільки адміністратори можуть реєструвати групу.');

      try {
        await this.groupsService.createGroupFromChat(ctx.chat.id, ctx.chat.title, ctx.from.id);
        await ctx.reply(`✅ Група "${ctx.chat.title}" успішно підключена!\n\nСтуденти, натисніть /join щоб отримати доступ до Mini App.`);
      } catch (e) {
        console.error(e);
        await ctx.reply('Помилка реєстрації.');
      }
    });

    this.bot.command('join', async (ctx) => {
      if (ctx.chat.type === 'private') return;
      if (!ctx.from) return;
      
      try {
        const { id, username, first_name, last_name } = ctx.from;
        const fullName = `${first_name} ${last_name || ''}`.trim();
        await this.usersService.findOrCreate(id, username || '', fullName);

        await this.groupsService.addMember(ctx.chat.id, id);
        await ctx.reply(`👋 ${first_name}, ти успішно доданий до системи групи! Тепер можеш відкривати додаток.`);
      } catch (e) {
        await ctx.reply('Група ще не зареєстрована. Староста має написати /register');
      }
    });

    this.bot.start();
    console.log('Bot started');
  }
}