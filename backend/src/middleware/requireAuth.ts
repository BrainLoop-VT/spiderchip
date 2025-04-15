import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors';
import { Role } from '../config/roles';

interface JWTPayload {
    id: string;
    email: string;
    role?: string;
    exp?: number;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        console.log('Auth header in middleware:', authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;
        
        // Check if token is about to expire (e.g., in 1 hour)
        const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;
        if (expiresIn < 3600) { // Less than 1 hour left
            // Generate new token
            const newToken = jwt.sign(
                { id: decoded.id, email: decoded.email, role: decoded.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            res.setHeader('New-Token', `Bearer ${newToken}`);
        }

        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role as Role
        };
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new UnauthorizedError('Token expired. Please log in again.'));
        }
        console.error('Auth error:', error);
        next(new UnauthorizedError('Invalid token'));
    }
}; 