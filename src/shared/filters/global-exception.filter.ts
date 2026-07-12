import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessException } from '../exceptions/business-exception';
import { ErrorResponse } from '../models/response-model';
import { config } from '../../config/app.config';
import { getTraceId, resolveTraceId } from 'nestjs-shared/core';
import { AppTechnicalError } from '../exceptions/app-tech-error';
import { NotificationError } from '../exceptions/notification-failure';

/**
 * Global exception filter that handles all exceptions in the application.
 * 
 * Behavior:
 * - Business exceptions: Returns the actual error message
 * - HTTP exceptions (4xx): Returns the error message
 * - Server errors (5xx): Returns generic message in production, detailed error in non-production
 * - Unknown errors: Returns generic message in production, detailed error in non-production
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly eventEmitter: EventEmitter2) { }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and extract raw error details
    let status: number;
    let messages: string[] = [];
    let errorCode: string | undefined;
    const stackTrace = exception instanceof Error ? exception.stack : (exception as any)?.stack;

    if (exception instanceof BusinessException) {
      // Handle business exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as {
        message: string | string[];
        errorCode?: string;
      };

      messages = Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message
        : [exceptionResponse.message || 'Business error occurred'];
      errorCode = exceptionResponse.errorCode;

      this.logger.warn(`Business Exception: ${messages.join(', ')}`, stackTrace);
    } else if (exception instanceof HttpException) {
      // Handle HTTP exceptions (4xx, etc.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        messages = [exceptionResponse];
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        if (responseObj.message) {
          messages = Array.isArray(responseObj.message)
            ? responseObj.message
            : [responseObj.message];
        } else {
          messages = ['An error occurred'];
        }
        errorCode = responseObj.errorCode;
      } else {
        messages = ['An error occurred'];
      }

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(`HTTP ${status} Error: ${messages.join(', ')}`, stackTrace);
      } else if (status === HttpStatus.BAD_REQUEST) {
        this.logger.warn(`HTTP ${status} Error: ${messages.join(', ')}`, stackTrace);
      }
    } else {
      // Handle unknown errors (500)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      const error = exception as Error;
      messages = [error?.message || 'An unexpected error occurred'];

      if (error?.name) {
        messages.push(`Error Type: ${error.name}`);
      }

      // ALWAYS log the full unhandled exception for all environments
      this.logger.error(`Unhandled Exception: ${error?.message || 'Unknown error'}`, stackTrace);
    }

    // Prepare the full error response with all details
    const errorResponse = new ErrorResponse();
    errorResponse.messages = [...messages];
    if (errorCode) {
      errorResponse.setErrorCode(errorCode);
    }
    errorResponse.stackTrace = stackTrace;
    errorResponse.traceId = getTraceId() || resolveTraceId(request.headers);
    errorResponse.status = status;

    // Always emit the AppTechnicalError event with FULL details for 5xx errors
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const full = Object.assign(new ErrorResponse(), errorResponse);
      full.messages = [...errorResponse.messages];
      this.eventEmitter.emit(AppTechnicalError.name, new AppTechnicalError(full, exception instanceof NotificationError));
    }

    // Log error details for monitoring
    const logDetails = {
      path: request.url,
      method: request.method,
      statusCode: status,
      traceId: errorResponse.traceId,
      stack: stackTrace,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Exception caught: ${status} - ${messages.join(', ')}`,
        JSON.stringify(logDetails, null, 2),
      );
    } else if (status === HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `Exception caught: ${status} - ${messages.join(', ')}`,
        JSON.stringify(logDetails, null, 2),
      );
    }

    // Sanitise the response before sending it to the end user
    if (config.app.isProd) {
      // In production: hide the stack trace for all errors
      delete errorResponse.stackTrace;

      // In production: obscure the actual error message for 5xx server errors
      // unless it is a explicitly thrown BusinessException
      if (status >= HttpStatus.INTERNAL_SERVER_ERROR && !(exception instanceof BusinessException)) {
        errorResponse.messages = [
          'An internal server error occurred. Please try again later.',
        ];
      }
    }

    response.status(status).json(errorResponse);
  }
}

