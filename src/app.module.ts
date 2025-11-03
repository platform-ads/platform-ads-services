import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/passport/jwt-auth.guard';
import { RolesGuard } from './modules/auth/passport/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { VideosModule } from './modules/videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Main database connection for users, auth, etc.
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // Separate database connection for videos
    MongooseModule.forRootAsync({
      connectionName: 'videosdb',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_VIDEOS_URI_MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    UsersModule,
    AuthModule,
    VideosModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    AppService,
  ],
})
export class AppModule {}
