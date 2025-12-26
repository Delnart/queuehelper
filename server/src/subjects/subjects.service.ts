import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subject, SubjectDocument } from './subject.schema';

@Injectable()
export class SubjectsService {
  constructor(@InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>) {}

  async create(title: string, groupId: string, teacher?: string) {
    const newSubject = new this.subjectModel({
      title,
      group: new Types.ObjectId(groupId),
      teacher,
    });
    return await newSubject.save();
  }

  async findAllByGroup(groupId: string) {
    return await this.subjectModel.find({ group: new Types.ObjectId(groupId) }).exec();
  }
}