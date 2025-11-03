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
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { VideosModule } from './modules/videos/videos.module';
import { join } from 'path';

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

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = process.env.NODE_ENV === 'production';
        const mailPort = configService.get<number>('MAIL_PORT') || 587;
        const mailSecure = configService.get<string>('MAIL_SECURE');

        const secure =
          mailSecure !== undefined ? mailSecure === 'true' : mailPort === 465;

        return {
          transport: {
            host: configService.get<string>('MAIL_HOST'),
            port: mailPort,
            secure: secure,
            auth: {
              user: configService.get<string>('MAIL_USER'),
              pass: configService.get<string>('MAIL_PASS'),
            },
            // Timeout settings for production to avoid connection issues
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000, // 10 seconds
            socketTimeout: 20000, // 20 seconds
            // Pool settings to reuse connections
            pool: true,
            maxConnections: 5,
            maxMessages: 10,
            ...(isProduction ? {} : { ignoreTLS: true }),
          },
          defaults: {
            from:
              configService.get<string>('MAIL_FROM') ||
              '"No Reply" <no-reply@localhost>',
          },
          preview: !isProduction,
          template: {
            dir: join(__dirname, '..', 'template'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
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
