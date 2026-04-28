import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { appConfig } from '../config';

function unauthorized(res: Response) {
  res.setHeader('WWW-Authenticate', 'Basic realm="KoInsight"');
  res.status(401).json({ error: 'Unauthorized' });
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function basicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    unauthorized(res);
    return;
  }

  const base64Credentials = authHeader.slice('Basic '.length).trim();
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const separatorIndex = credentials.indexOf(':');

  if (separatorIndex < 0) {
    unauthorized(res);
    return;
  }

  const username = credentials.slice(0, separatorIndex);
  const password = credentials.slice(separatorIndex + 1);

  if (safeEquals(username, appConfig.auth.username) && safeEquals(password, appConfig.auth.password)) {
    next();
    return;
  }

  unauthorized(res);
}
