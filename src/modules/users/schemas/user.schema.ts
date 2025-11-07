import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop()
  username: string;

  @Prop({ unique: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ unique: true })
  phoneNumber: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ enum: ['admin', 'user'], required: true, default: 'user' })
  role: 'admin' | 'user';

  @Prop()
  avatarUrl: string;

  @Prop()
  avatarLink: string;

  @Prop({ default: 100 })
  points: number;

  @Prop()
  lastLoginAt: Date;

  @Prop()
  lastLogoutAt: Date;

  @Prop()
  refreshToken: string;

  @Prop({ default: Date.now })
  createdAt?: Date;

  @Prop({ default: Date.now })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
