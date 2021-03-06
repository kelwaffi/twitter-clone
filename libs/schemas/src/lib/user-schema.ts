import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Collections, CreateUser } from '@project/core';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: Collections.USERS })
export class UserEntity implements CreateUser {
  @Prop({ trim: true, required: true })
  name: string;

  @Prop({ required: false, trim: true })
  username: string;

  @Prop({ required: false })
  bio?: string;

  @Prop({ type: Boolean, default: false })
  emailVerified?: boolean;

  @Prop({ required: false, default: false })
  verified?: boolean;

  @Prop({
    trim: true,
    required: true,
    unique: true,
    lowercase: true,
  })
  email: string;

  @Prop({ required: false, trim: true })
  password: string;

  @Prop({ type: String, required: false })
  profilePicture: string;

  @Prop({ type: String, required: false })
  provider?: string;

  @Prop({ default: 0, type: Number, required: false })
  followersCount?: number;

  @Prop({ default: 0, type: Number, required: false })
  followingCount?: number;
}

export type UserDocument = Document & UserEntity;

export const UserSchema = SchemaFactory.createForClass(UserEntity);
