// @ts-nocheck
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { pdfQueue } from '../lib/queue';

const router = Router();

// Store files in memory for processing
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/import/timetable
 * Upload a PDF, create an ImportJob, and push to BullMQ.
 */
router.post(
  '/timetable',
  requireAuth,
  requireRole('ADMIN', 'COORDINATOR'), // Only admins/coordinators can import
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    try {
      // 1. Create job record in DB
      const jobRecord = await prisma.importJob.create({
        data: {
          filename: req.file.originalname,
          status: 'QUEUED',
        },
      });

      // 2. Add to Redis BullMQ
      // We pass the PDF buffer. In a real highly-scaled app, we'd save to S3 and pass a URL.
      // Since it's a small PDF and we have Redis, passing the buffer base64 string works.
      const bufferStr = req.file.buffer.toString('base64');
      const semesterId = req.body.semesterId;
      const semesterInfo = {
        semesterNumber: req.body.semesterNumber,
        section: req.body.section,
        branchName: req.body.branchName,
        branchShort: req.body.branchShort,
        program: req.body.program,
        deptName: req.body.deptName,
        deptShort: req.body.deptShort,
      };
      
      const bullJob = await pdfQueue.add('parse-pdf', {
        importJobId: jobRecord.id,
        pdfBase64: bufferStr,
        semesterId: semesterId,
        semesterInfo: semesterInfo,
      });

      res.status(202).json({
        message: 'Timetable uploaded and queued for processing',
        jobId: jobRecord.id,
        bullJobId: bullJob.id,
      });
    } catch (error) {
      console.error('[Import] Error:', error);
      res.status(500).json({ error: 'Failed to queue PDF for processing' });
    }
  }
);

/**
 * GET /api/import/status/:id
 * Check the status of an ImportJob
 */
router.get(
  '/status/:id',
  requireAuth,
  async (req, res) => {
    try {
      const job = await prisma.importJob.findUnique({
        where: { id: req.params.id },
      });

      if (!job) {
        return res.status(404).json({ error: 'Import job not found' });
      }

      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch job status' });
    }
  }
);

/**
 * GET /api/import/history
 * List recent import jobs
 */
router.get(
  '/history',
  requireAuth,
  async (req, res) => {
    try {
      const jobs = await prisma.importJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch import history' });
    }
  }
);

export default router;
