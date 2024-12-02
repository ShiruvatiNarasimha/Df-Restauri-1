import { Response } from 'express';
import { db } from '@db/index';
import { sql } from 'drizzle-orm';
import { performanceMonitor } from './monitoring';
import { ResponseFormatter } from './response-formatter';
import { dbCircuitBreaker } from './circuit-breaker';

interface ErrorContext {
  timestamp: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
}

class ErrorHandler {
  private static getErrorSeverity(errorCode: string): 'critical' | 'high' | 'medium' | 'low' {
    const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      '57P01': 'critical', // admin_shutdown
      '57P02': 'critical', // crash_shutdown
      '57P03': 'critical', // cannot_connect_now
      '42703': 'high',     // undefined_column
      '42P01': 'high',     // undefined_table
      '23505': 'medium',   // unique_violation
      '23503': 'medium',   // foreign_key_violation
      '57014': 'low',      // query_canceled
    };
    
    return severityMap[errorCode] || 'medium';
  }

  private static isErrorRecoverable(errorCode: string): boolean {
    const recoverableErrors = [
      '57014', // query_canceled
      '57P01', // admin_shutdown
      '57P02', // crash_shutdown
      '57P03', // cannot_connect_now
      '40001', // serialization_failure
      '40P01'  // deadlock_detected
    ];
    
    return recoverableErrors.includes(errorCode);
  }

  private static async attemptDatabaseRecovery(errorCode: string): Promise<boolean> {
    try {
      switch (errorCode) {
        case '57014': // query_canceled
        case '40001': // serialization_failure
        case '40P01': // deadlock_detected
          await new Promise(resolve => setTimeout(resolve, 1000));
          await db.execute(sql`SELECT 1`);
          return true;
          
        case '57P01': // admin_shutdown
        case '57P02': // crash_shutdown
        case '57P03': // cannot_connect_now
          await new Promise(resolve => setTimeout(resolve, 5000));
          await db.execute(sql`SELECT 1`);
          return true;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Database recovery attempt failed:', {
        originalErrorCode: errorCode,
        recoveryError: error,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  public static async handleError(error: unknown, res: Response, context: Partial<ErrorContext> = {}): Promise<void> {
    const endOperation = performanceMonitor.startOperation('error-handler');
    
    try {
      const errorContext: ErrorContext = {
        timestamp: new Date().toISOString(),
        ...context
      };

      console.error('API Error:', {
        ...errorContext,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });

      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as { code: string; detail?: string; message: string };
        
        performanceMonitor.recordError('database', {
          code: pgError.code,
          context: {
            ...errorContext,
            severity: this.getErrorSeverity(pgError.code),
            recoverable: this.isErrorRecoverable(pgError.code)
          }
        });
        
        switch (pgError.code) {
          case '42703': // undefined_column
          case '42P01': // undefined_table
          case '42P02': // undefined_parameter
            return ResponseFormatter.error(
              res,
              500,
              "Errore schema database",
              'SCHEMA_ERROR',
              { 
                detail: pgError.detail || pgError.message,
                code: pgError.code,
                recommendation: 'Verificare la struttura del database'
              }
            );

          case '23505': // unique_violation
            return ResponseFormatter.error(
              res,
              409,
              "Risorsa già esistente",
              'DUPLICATE_ERROR',
              { 
                detail: pgError.detail,
                code: pgError.code,
                recommendation: 'Utilizzare un identificatore univoco'
              }
            );

          case '23503': // foreign_key_violation
            return ResponseFormatter.error(
              res,
              400,
              "Riferimento non valido",
              'REFERENCE_ERROR',
              { 
                detail: pgError.detail,
                code: pgError.code,
                recommendation: 'Verificare l\'esistenza della risorsa riferita'
              }
            );

          case '57014': // query_canceled
          case '57P01': // admin_shutdown
          case '57P02': // crash_shutdown
          case '57P03': // cannot_connect_now
            try {
              const recovered = await dbCircuitBreaker.execute(async () => {
                await this.attemptDatabaseRecovery(pgError.code);
                return true;
              });
              
              if (recovered) {
                return ResponseFormatter.error(
                  res,
                  503,
                  "Servizio temporaneamente non disponibile",
                  'SERVICE_UNAVAILABLE',
                  { 
                    detail: 'Riprova tra qualche istante',
                    code: pgError.code,
                    retryAfter: 30
                  }
                );
              }
            } catch (recoveryError) {
              console.error('Recovery failed:', {
                originalError: pgError,
                recoveryError,
                context: errorContext
              });
            }
            
            return ResponseFormatter.error(
              res,
              500,
              "Errore di connessione al database",
              'CONNECTION_ERROR',
              { 
                detail: 'Impossibile completare l\'operazione',
                code: pgError.code,
                retryAfter: 60
              }
            );

          default:
            console.error('Unhandled database error:', {
              code: pgError.code,
              message: pgError.message,
              detail: pgError.detail,
              context: errorContext,
              timestamp: new Date().toISOString()
            });
            
            return ResponseFormatter.error(
              res,
              500,
              "Errore database",
              'DB_ERROR',
              { 
                detail: pgError.detail,
                code: pgError.code,
                recommendation: 'Si prega di riprovare più tardi'
              }
            );
        }
      }

      if (error instanceof Error) {
        performanceMonitor.recordError('application', {
          name: error.name,
          message: error.message,
          context: errorContext
        });
        
        return ResponseFormatter.serverError(res, error);
      }

      performanceMonitor.recordError('unknown', {
        error,
        context: errorContext
      });
      
      return ResponseFormatter.serverError(
        res, 
        new Error("Si è verificato un errore imprevisto")
      );
    } finally {
      endOperation();
    }
  }
}

export const handleError = ErrorHandler.handleError.bind(ErrorHandler);