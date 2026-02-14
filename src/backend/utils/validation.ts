import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string()
});

export const entrySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  moodTags: z.array(z.string()).optional().default([]),
  moodEmoji: z.string().optional()
});

export const entryUpdateSchema = entrySchema.partial();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EntryInput = z.infer<typeof entrySchema>;
export type EntryUpdateInput = z.infer<typeof entryUpdateSchema>;
