import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    path?: string;
    duration?: number;
  };
}

export class ResponseFormatter {
  static success<T>(res: Response, data: T, metadata?: Record<string, unknown>) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
    return res.json(response);
  }

  static error(
    res: Response, 
    status: number, 
    message: string, 
    code?: string,
    details?: unknown
  ) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message,
        code,
        details
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    };
    return res.status(status).json(response);
  }

  static notFound(res: Response, message = 'Resource not found') {
    return this.error(res, 404, message, 'NOT_FOUND');
  }

  static badRequest(res: Response, message: string, details?: unknown) {
    return this.error(res, 400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(res: Response, message = 'Unauthorized access') {
    return this.error(res, 401, message, 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message = 'Access forbidden') {
    return this.error(res, 403, message, 'FORBIDDEN');
  }

  static serverError(res: Response, error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const details = process.env.NODE_ENV === 'development' ? error : undefined;
    return this.error(res, 500, message, 'SERVER_ERROR', details);
  }
}
