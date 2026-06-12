// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../lib/prisma';

const router = Router();

// ============================================================
//  TIMETABLES (SEMESTERS)
// ============================================================

router.get('/timetables', requireAuth, async (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch timetables' });
  }
});

router.delete('/timetables/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.timetableSlot.deleteMany({ where: { semesterId: id } });
    await prisma.semester.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

// ============================================================
//  DEPARTMENTS
// ============================================================

router.get('/departments', requireAuth, async (req, res) => {
  try {
    const { semesterId } = req.query;

    const deps = await prisma.department.findMany({
      include: {
        _count: { 
          select: { 
            rooms: semesterId ? { where: { slots: { some: { semesterId: String(semesterId) } } } } : true, 
            faculty: semesterId ? { where: { primarySlots: { some: { semesterId: String(semesterId) } } } } : true, 
            branches: true 
          } 
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(deps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/departments', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, shortCode } = req.body;
    const dept = await prisma.department.create({
      data: { name, shortCode }
    });
    res.status(201).json(dept);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create department. Short code might not be unique.' });
  }
});

router.delete('/departments/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const id = req.params.id;
    
    // To cleanly delete a department, we must aggressively cascade delete everything inside it:
    // 1. Find all rooms
    const rooms = await prisma.room.findMany({ where: { departmentId: id }});
    const roomIds = rooms.map(r => r.id);
    
    // 2. Find all branches -> courses
    const branches = await prisma.branch.findMany({ where: { departmentId: id }});
    const branchIds = branches.map(b => b.id);
    const courses = await prisma.course.findMany({ where: { branchId: { in: branchIds } }});
    const courseIds = courses.map(c => c.id);
    
    // 3. Delete TimetableSlots tied to these rooms or courses
    await prisma.timetableSlot.deleteMany({
      where: {
        OR: [
          { roomId: { in: roomIds } },
          { courseId: { in: courseIds } }
        ]
      }
    });

    // 3b. Cleanup Faculty associations (since a faculty might teach courses in other departments)
    const faculty = await prisma.faculty.findMany({ where: { departmentId: id } });
    const facultyIds = faculty.map(f => f.id);
    await prisma.timetableSlotFaculty.deleteMany({ where: { facultyId: { in: facultyIds } } });
    await prisma.timetableSlot.updateMany({
      where: { facultyId: { in: facultyIds } },
      data: { facultyId: null }
    });
    
    // 4. Delete the entities
    await prisma.course.deleteMany({ where: { branchId: { in: branchIds } }});
    await prisma.branch.deleteMany({ where: { departmentId: id }});
    await prisma.room.deleteMany({ where: { departmentId: id }});
    await prisma.faculty.deleteMany({ where: { departmentId: id }});
    
    // 5. Delete Department
    await prisma.department.delete({ where: { id } });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});


// ============================================================
//  ROOMS
// ============================================================

router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const { semesterId } = req.query;
    let whereClause: any = {};
    if (semesterId) {
      whereClause.slots = {
        some: { semesterId: String(semesterId) }
      };
    }

    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: { department: { select: { name: true, shortCode: true } } },
      orderBy: { roomNumber: 'asc' }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.post('/rooms', requireAuth, requireRole('ADMIN', 'COORDINATOR'), async (req, res) => {
  try {
    const { roomNumber, type, capacity, departmentId } = req.body;
    const room = await prisma.room.create({
      data: {
        roomNumber,
        type,
        capacity: capacity ? parseInt(capacity) : null,
        departmentId,
      }
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create room.' });
  }
});

router.delete('/rooms/:id', requireAuth, requireRole('ADMIN', 'COORDINATOR'), async (req, res) => {
  try {
    // Manually cascade delete timetable slots to prevent foreign key errors
    await prisma.timetableSlot.deleteMany({ where: { roomId: req.params.id } });
    await prisma.room.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});


// ============================================================
//  COURSES
// ============================================================

router.get('/courses', requireAuth, async (req, res) => {
  try {
    const { branchId, semester, semesterId } = req.query;
    
    let whereClause: any = {};
    if (semesterId) {
      // Instead of just showing all courses in the branch/semester,
      // show only courses that are ACTUALLY scheduled in this specific semester ID.
      whereClause.slots = {
        some: { semesterId: String(semesterId) }
      };
    } else {
      if (branchId) whereClause.branchId = String(branchId);
      if (semester) whereClause.semester = parseInt(String(semester));
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: { branch: true },
      orderBy: { code: 'asc' }
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.post('/courses', requireAuth, requireRole('ADMIN', 'COORDINATOR'), async (req, res) => {
  try {
    const { code, name, credits, type, branchId, semester } = req.body;
    const c = parseFloat(credits);
    
    const course = await prisma.course.create({
      data: {
        code,
        name,
        credits: c,
        type,
        branchId,
        semester: parseInt(semester),
        isZeroCredit: c === 0
      }
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create course.' });
  }
});

router.delete('/courses/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    // Manually cascade delete timetable slots to prevent foreign key errors
    await prisma.timetableSlot.deleteMany({ where: { courseId: req.params.id } });
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});


// ============================================================
//  FACULTY
// ============================================================

router.get('/faculty', requireAuth, async (req, res) => {
  try {
    const { semesterId } = req.query;
    let whereClause: any = { isDeleted: false };
    if (semesterId) {
      whereClause.primarySlots = {
        some: { semesterId: String(semesterId) }
      };
    }

    const faculty = await prisma.faculty.findMany({
      where: whereClause,
      include: { department: { select: { name: true, shortCode: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

router.delete('/faculty/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    // Soft Delete
    await prisma.faculty.update({
      where: { id: req.params.id },
      data: { isDeleted: true }
    });
    
    // Also cascade delete timetable slots for this faculty
    await prisma.timetableSlot.deleteMany({
      where: { facultyId: req.params.id }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete faculty' });
  }
});

// Restore soft deleted faculty
router.post('/faculty/:id/restore', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.faculty.update({
      where: { id: req.params.id },
      data: { isDeleted: false }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore faculty' });
  }
});


// ============================================================
//  BRANCHES (Helper)
// ============================================================
router.get('/branches', requireAuth, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: { department: { select: { shortCode: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

export default router;
