import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db } from './db/client';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-me';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

export const authService = {
  async register(username: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO User (username, password) VALUES (?, ?)');
    const info = stmt.run(username, hashedPassword);
    return { id: Number(info.lastInsertRowid), username };
  },

  async login(username: string, password: string) {
    const stmt = db.prepare('SELECT * FROM User WHERE username = ?');
    const user: any = stmt.get(username);
    
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
    return { token, user: { id: user.id, username: user.username } };
  }
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    (req as AuthRequest).user = user;
    next();
  });
};