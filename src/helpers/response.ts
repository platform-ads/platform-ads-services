/**
 * Chuẩn hóa format response cho FE (optimized cho Axios + React Query)
 */

// Metadata cho pagination
export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Interface cho success response
export interface ApiResponse<T = any> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

// Interface cho error response
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  timestamp: string;
  path?: string;
}

// Type alias cho backward compatibility
export type SuccessResponse<T = any> = ApiResponse<T>;
export type ErrorResponse = ApiErrorResponse;

// Helper function cho success response
export const successResponse = <T = any>(
  data: T,
  message = 'Success',
  statusCode = 200,
): ApiResponse<T> => {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

// Helper function cho paginated response
export const paginatedResponse = <T = any>(
  data: T,
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  },
  message = 'Success',
  statusCode = 200,
): ApiResponse<T> => {
  return {
    success: true,
    statusCode,
    message,
    data,
    meta: {
      ...pagination,
      hasNextPage: pagination.currentPage < pagination.totalPages,
      hasPreviousPage: pagination.currentPage > 1,
    },
    timestamp: new Date().toISOString(),
  };
};

// Helper function cho error response
export const errorResponse = (
  message: string,
  statusCode = 500,
  error?: string,
  errors?: any[],
  path?: string,
): ApiErrorResponse => {
  // Chuẩn hóa validation errors
  const formattedErrors = errors?.map((err) => {
    if (typeof err === 'string') {
      return { message: err };
    }
    if (
      typeof err === 'object' &&
      err !== null &&
      'property' in err &&
      'constraints' in err
    ) {
      // Class-validator error format
      const validationErr = err as {
        property: string;
        constraints: Record<string, string>;
      };
      return {
        field: validationErr.property,
        message: Object.values(validationErr.constraints).join(', '),
      };
    }
    return { message: String(err) };
  });

  return {
    success: false,
    statusCode,
    message,
    error,
    errors: formattedErrors,
    timestamp: new Date().toISOString(),
    path,
  };
};
