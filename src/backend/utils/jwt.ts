import jwt from 'jsonwebtoken';

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: string;
      email: string;
    };
  } catch {
    return null;
  }
}
