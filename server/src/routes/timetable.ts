// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { semesterId } = req.query;
    const whereClause = semesterId ? { semesterId: String(semesterId) } : {};
    
    const slots = await prisma.timetableSlot.findMany({
      where: whereClause,
      include: {
        course: { select: { code: true, name: true, credits: true } },
        room: { select: { roomNumber: true, type: true } },
        semester: { include: { branch: true } }
      },
      orderBy: [
        { day: 'asc' },
        { period: 'asc' }
      ]
    });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

router.get('/semesters', requireAuth, async (req, res) => {
  try {
    const semesters = await prisma.semester.findMany({
      include: {
        branch: { include: { department: true } }
      },
      orderBy: [
        { branch: { program: 'asc' } },
        { branch: { name: 'asc' } },
        { number: 'asc' }
      ]
    });
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
});

router.get('/metadata', requireAuth, async (req, res) => {
  try {
    const { semesterId } = req.query;
    const whereClause = semesterId ? { id: String(semesterId) } : {};
    
    const semester = await prisma.semester.findFirst({
      where: whereClause,
      include: {
        branch: {
          include: { department: true }
        }
      }
    });
    res.json(semester || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

router.delete('/semesters/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.timetableSlot.deleteMany({ where: { semesterId: id } });
    await prisma.semester.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete semester' });
  }
});

export default router;
