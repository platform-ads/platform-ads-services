import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VideoDocument = HydratedDocument<Video>;

@Schema()
export class Video {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  thumbnail: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true })
  views: number;

  @Prop({ required: true })
  likes: number;

  @Prop({ required: true })
  dislikes: number;

  @Prop({ required: true })
  points: number;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const VideoSchema = SchemaFactory.createForClass(Video);
