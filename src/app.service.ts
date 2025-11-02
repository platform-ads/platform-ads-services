import { Injectable } from '@nestjs/common';
import { successResponse } from './helpers/response';

@Injectable()
export class AppService {
  getHello() {
    return successResponse(
      { app: 'Platform Ads API', version: '1.0.0' },
      'Welcome to Platform Ads API',
      200,
    );
  }
}
