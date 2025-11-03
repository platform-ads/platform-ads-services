import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { VideoSchema, Video } from './schema/video.schema';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Video.name, schema: VideoSchema }],
      'videosdb',
    ),
  ],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
