import { Request, Response, NextFunction } from 'express';
import { apiKeyRepo } from '../../db/repositories/api-key.repo';

// Extend Express Request to include authenticated API key
declare global {
  namespace Express {
    interface Request {
      apiKeyId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' });
    return;
  }

  const key = authHeader.substring(7);
  const apiKey = apiKeyRepo.validateKey(key);

  if (!apiKey) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  apiKeyRepo.updateLastUsed(apiKey.id);
  req.apiKeyId = apiKey.id;
  next();
}

// Optional auth - allows unauthenticated requests but attaches key if present
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const key = authHeader.substring(7);
    const apiKey = apiKeyRepo.validateKey(key);
    if (apiKey) {
      apiKeyRepo.updateLastUsed(apiKey.id);
      req.apiKeyId = apiKey.id;
    }
  }

  next();
}
