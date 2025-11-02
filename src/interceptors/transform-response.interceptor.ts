import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { successResponse, SuccessResponse } from '../helpers/response';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<any>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<any>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data): SuccessResponse<any> => {
        // Nếu data đã có format chuẩn (có success field), return nguyên
        if (data && typeof data === 'object' && 'success' in data) {
          return data as SuccessResponse<any>;
        }

        // Nếu data đã có message và data field (format cũ)
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          'data' in data
        ) {
          const oldFormat = data as { message: string; data: any };
          return successResponse(
            oldFormat.data,
            oldFormat.message,
            response.statusCode,
          );
        }

        // Mặc định wrap data vào format chuẩn
        return successResponse(data, 'Success', response.statusCode);
      }),
    );
  }
}
