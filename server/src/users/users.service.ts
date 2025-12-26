import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findOrCreate(tgId: number, username: string, fullName: string) {
    let user = await this.userModel.findOne({ telegramId: tgId });

    if (user) {
      return { user, isNew: false };
    }

    const count = await this.userModel.countDocuments();
    const role = count === 0 ? 'owner' : 'user';

    const newUser = new this.userModel({
      telegramId: tgId,
      username,
      fullName,
      globalRole: role,
    });

    await newUser.save();
    return { user: newUser, isNew: true };
  }

  // Новий метод
  async findByTelegramId(tgId: number) {
    return this.userModel.findOne({ telegramId: tgId });
  }
}