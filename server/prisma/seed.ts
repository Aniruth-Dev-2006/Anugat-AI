/**
 * SAMAYAK — DATABASE SEED
 *
 * Seeds ONLY the minimum required to log in and use the system.
 * All timetable data (rooms, courses, faculty, slots) is populated
 * via the PDF ingestion pipeline (Upload → BullMQ worker → DB).
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Seeding Samayak — minimal bootstrap only...\n');

  // ── 1. Root Department ────────────────────────────────────
  // Just the root entity — actual data comes from PDF imports
  const cse = await prisma.department.upsert({
    where:  { shortCode: 'CSE' },
    update: {},
    create: {
      name:      'Computer Science & Engineering',
      shortCode: 'CSE',
    },
  });
  console.log('✅ Department created:', cse.shortCode);

  // ── 2. Demo Admin ─────────────────────────────────────────
  // The one account needed to log in and trigger PDF uploads
  const demoEmail    = process.env.DEMO_ADMIN_EMAIL    ?? 'admin@samayak.demo';
  const demoPassword = process.env.DEMO_ADMIN_PASSWORD ?? 'demo1234';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const admin = await prisma.faculty.upsert({
    where:  { email: demoEmail },
    update: { passwordHash },
    create: {
      name:         'Demo Admin',
      email:        demoEmail,
      role:         Role.ADMIN,
      passwordHash,
      departmentId: cse.id,
    },
  });
  console.log('✅ Demo Admin created:', admin.email);

  // ────────────────────────────────────────────────────────
  // NOTE: Rooms, Courses, Faculty, Semesters, and TimetableSlots
  // are NOT seeded here. They are extracted from the uploaded
  // timetable PDF by the BullMQ worker (see src/workers/pdfWorker.ts)
  // and pushed into the database automatically.
  // ────────────────────────────────────────────────────────

  console.log('\n🎉 Bootstrap complete!\n');
  console.log('─────────────────────────────────────────────────────');
  console.log('  Demo Login');
  console.log('  Email   :', demoEmail);
  console.log('  Password:', demoPassword);
  console.log('  Role    : ADMIN');
  console.log('─────────────────────────────────────────────────────');
  console.log('\n  Next step: Upload a timetable PDF from the dashboard');
  console.log('  to populate rooms, courses, faculty and slots.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
