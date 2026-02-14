import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';

const prisma = new PrismaClient();
const router = express.Router();

const createSchema = z.object({
  content: z.string().min(1),
  moodTags: z.array(z.string()).optional(),
  moodEmoji: z.string().optional(),
  createdAt: z.string().optional(),
});

const updateSchema = z.object({
  content: z.string().optional(),
  moodTags: z.array(z.string()).optional(),
  moodEmoji: z.string().optional(),
});

router.use(authMiddleware as any);

router.post('/', async (req, res, next) => {
  try {
    const parsed = createSchema.parse(req.body);
    const userId = req.user!.userId;
    const created = await prisma.entry.create({
      data: {
        userId,
        content: parsed.content,
        moodTags: parsed.moodTags || [],
        moodEmoji: parsed.moodEmoji || null,
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined,
      }
    });
    res.json(created);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { from, to, limit = '20', cursor } = req.query as any;

    const where: any = { userId };
    if (from || to) where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);

    const take = Math.min(100, parseInt(limit, 10) || 20);

    const entries = await prisma.entry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      //@ts-ignore
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });

    let nextCursor = null;
    if (entries.length > take) {
      nextCursor = entries[take].id;
      entries.splice(take, 1);
    }

    res.json({ entries, nextCursor });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const entry = await prisma.entry.findUnique({ where: { id: req.params.id } });
    if (!entry || entry.userId !== userId) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = updateSchema.parse(req.body);
    const userId = req.user!.userId;
    const entry = await prisma.entry.findUnique({ where: { id: req.params.id } });
    if (!entry || entry.userId !== userId) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.entry.update({
      where: { id: req.params.id },
      data: {
        content: parsed.content ?? entry.content,
        moodTags: parsed.moodTags ?? entry.moodTags,
        moodEmoji: parsed.moodEmoji ?? entry.moodEmoji,
      }
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const entry = await prisma.entry.findUnique({ where: { id: req.params.id } });
    if (!entry || entry.userId !== userId) return res.status(404).json({ error: 'Not found' });
    await prisma.entry.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
