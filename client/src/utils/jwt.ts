import { jwtDecode } from "jwt-decode";

export interface JWTPayload {
  exp: number;
  id: number;
  role: string;
  username: string;
}

export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function validateTokenFormat(token: string): boolean {
  // Allow for more flexible JWT formats while maintaining basic structure
  const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
  if (!jwtRegex.test(token)) {
    throw new TokenValidationError('Invalid token format');
  }
  return true;
}

export function isJWTPayload(decoded: unknown): decoded is JWTPayload {
  if (!decoded || typeof decoded !== 'object') {
    throw new TokenValidationError('Token malformato: payload non valido');
  }

  const requiredFields = ['exp', 'id', 'role', 'username'] as const;
  for (const field of requiredFields) {
    if (!(field in decoded)) {
      throw new TokenValidationError(`Token malformato: campo ${field} mancante`);
    }
  }

  const payload = decoded as Record<string, unknown>;

  // Type checking for specific fields
  if (typeof payload.exp !== 'number') {
    throw new TokenValidationError('Token malformato: campo exp non valido');
  }
  if (typeof payload.id !== 'number') {
    throw new TokenValidationError('Token malformato: campo id non valido');
  }
  if (typeof payload.role !== 'string') {
    throw new TokenValidationError('Token malformato: campo role non valido');
  }
  if (typeof payload.username !== 'string') {
    throw new TokenValidationError('Token malformato: campo username non valido');
  }

  // Check token expiration
  if (payload.exp * 1000 < Date.now()) {
    throw new TokenValidationError('Token scaduto');
  }

  return true;
}

export function validateAndDecodeToken(token: string): JWTPayload {
  try {
    validateTokenFormat(token);
    const decoded = jwtDecode(token);
    
    if (!decoded || typeof decoded !== 'object') {
      throw new TokenValidationError('Invalid token payload');
    }

    if (isJWTPayload(decoded)) {
      return decoded;
    }
    
    throw new TokenValidationError('Invalid token structure');
  } catch (error) {
    if (error instanceof TokenValidationError) {
      throw error;
    }
    throw new TokenValidationError(
      error instanceof Error 
        ? `Token validation failed: ${error.message}`
        : 'Token validation failed'
    );
  }
}
