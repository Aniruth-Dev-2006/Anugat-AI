// @ts-nocheck
import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { redisConnection, PDF_QUEUE } from '../lib/queue';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

/**
 * Update the status of the ImportJob in the DB.
 */
async function updateJobStatus(jobId: string, status: any, summary?: any) {
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status,
      summary: summary || undefined,
      ...(status === 'DONE' || status === 'FAILED' ? { completedAt: new Date() } : {}),
    },
  });
}

/**
 * BullMQ Worker for PDF Ingestion
 */
export const pdfWorker = new Worker(
  PDF_QUEUE,
  async (job: Job) => {
    const { importJobId, pdfBase64 } = job.data;

    try {
      // 1. Parsing Phase
      await updateJobStatus(importJobId, 'PARSING');
      
      // Write base64 to temp PDF file
      const tempPdfPath = path.join(process.cwd(), `temp_${importJobId}.pdf`);
      const buffer = Buffer.from(pdfBase64, 'base64');
      await fs.writeFile(tempPdfPath, buffer);

      // Call Python OCR script
      const scriptPath = path.join(process.cwd(), 'src/workers/extract_timetable.py');
      
      // We will parse the python script output (HTML tables -> JSON data)
      // Since PP-Structure output can vary, we will simulate the exact parsing of the output here 
      // based on standard timetable structures.
      // Wait, since PaddleOCR is downloading 1GB of models and will take a minute per page,
      // and we don't want to freeze the backend on every upload, we'll run it and catch the output.
      
      let parsedCourses: any[] = [];
      let parsedRooms: any[] = [];
      let parsedSlots: any[] = [];
      let extractedOcrMeta: any = {};  // will be populated after OCR, used in integration phase
      
      try {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const { stdout } = await execFileAsync(pythonCmd, [scriptPath, tempPdfPath], {
          env: { ...process.env, PYTHONPATH: path.join(process.cwd(), '.python_packages') }
        });
        // The script returns JSON {"tables_html": ["<html>..."]}
        const result = JSON.parse(stdout);
        
        if (result.error) {
          throw new Error(`OCR Python Error: ${result.error}`);
        }
        
        const htmlTables = result.tables_html;
        
        // For demonstration, since parsing the exact arbitrary HTML layout of `cse(8).pdf` from raw OCR 
        // into perfect relational entities without an LLM is extremely brittle in production,
        // we map the expected structure out of the OCR result.
        
        // Parse structured data from Gemini OCR
        if (result.course_details && result.schedule) {
           console.log("Gemini OCR Extracted Schedule format:", typeof result.schedule, Array.isArray(result.schedule));
           
           // Extract metadata from OCR — stored in local variable (job.data is immutable in BullMQ)
           extractedOcrMeta = result.metadata || {};
           console.log('[OCR] Extracted metadata:', JSON.stringify(extractedOcrMeta));
           
           parsedCourses = result.course_details.map((c: any) => ({
               code: c.course_code || c.code,
               name: c.course_name || c.name,
               credits: c.credit === 'NC' ? 0 : Number(c.credit) || 3,
               faculty: c.teacher || c.faculty
           }));
           
           const periodOrder = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
           
           // Normalize schedule events into a flat array of events with a 'day' property
           let allEvents: any[] = [];
           
           if (Array.isArray(result.schedule)) {
               // Could be [ { day: 'Monday', events: [...] } ] or [ { day: 'Monday', course: ... } ]
               result.schedule.forEach((item: any) => {
                   if (item.events && Array.isArray(item.events)) {
                       item.events.forEach((e: any) => {
                           e.day = e.day || item.day;
                           allEvents.push(e);
                       });
                   } else {
                       allEvents.push(item);
                   }
               });
           } else if (result.schedule && typeof result.schedule === 'object') {
               // Could be { events: [ { day: 'Monday', course: ... } ] } or { Monday: [...], Tuesday: [...] }
               if (result.schedule.events && Array.isArray(result.schedule.events)) {
                   allEvents = result.schedule.events;
               } else {
                   Object.keys(result.schedule).forEach(key => {
                       const val = result.schedule[key];
                       if (Array.isArray(val)) {
                           val.forEach((e: any) => {
                               e.day = e.day || key;
                               allEvents.push(e);
                           });
                       }
                   });
               }
           }
           
           allEvents.forEach((event: any) => {
               // Normalise day to MON, TUE, WED, THU, FRI, SAT
               if (!event.day) return;
               const dayStr = event.day.toUpperCase().substring(0, 3);
                    const startIdx = periodOrder.indexOf(event.start_period);
                    const endIdx = periodOrder.indexOf(event.end_period);
                    
                    // The user specified that "group" contains the room if "room" is empty
                    let roomStr = event.room || event.group || "TBD";
                    
                    if (startIdx !== -1 && endIdx !== -1) {
                        for (let i = startIdx; i <= endIdx; i++) {
                            const periodStr = periodOrder[i];
                            
                            // Match course_code to a valid code in parsedCourses
                            let courseCode = event.course_code || event.code;
                            if (!courseCode && event.course) {
                                // Try to find course code from course name
                                const match = parsedCourses.find(c => c.name.includes(event.course) || event.course.includes(c.name) || (event.course.includes(c.code)));
                                if (match) courseCode = match.code;
                            }
                            if (courseCode) {
                                // Handle split rooms like "G2/G3" or "G2, G3"
                                let roomsList = [roomStr];
                                if (roomStr.includes('/')) {
                                    roomsList = roomStr.split('/').map((r: string) => r.trim());
                                } else if (roomStr.includes(',')) {
                                    roomsList = roomStr.split(',').map((r: string) => r.trim());
                                }
                                
                                roomsList.forEach((r: string) => {
                                    parsedSlots.push({
                                        day: dayStr,
                                        period: periodStr,
                                        courseCode: courseCode,
                                        roomNumber: r
                                    });
                                });
                            }
                        }
                    }
           });
           console.log('allEvents length:', allEvents.length);
           console.log('parsedSlots length:', parsedSlots.length);
           
           // Automatically infer rooms from slots
           const roomSet = new Set<string>();
           parsedSlots.forEach((slot: any) => {
              if (slot.roomNumber && slot.roomNumber !== "TBD") {
                  roomSet.add(slot.roomNumber);
              }
           });
           
           parsedRooms = Array.from(roomSet).map(r => ({
              number: r,
              type: r.toLowerCase().includes('lab') ? 'LAB' : 'CLASSROOM',
              capacity: 60
           }));
        } else {
           throw new Error("OCR extracted no data from the image.");
        }
      } finally {
        // Cleanup temp file
        await fs.unlink(tempPdfPath).catch(() => {});
      }

      // 2. Integrating Phase
      await updateJobStatus(importJobId, 'INTEGRATING');

      // ── Resolve Department, Branch, Semester ────────────────────────────────
      // Priority: 1) user-provided semesterId  2) form semesterInfo  3) OCR-extracted metadata
      const ocrMeta   = extractedOcrMeta;  // from OCR parse phase above
      const semInfo   = job.data.semesterInfo || {};

      // Determine labels
      const deptName    = semInfo.deptName     || ocrMeta.department_full || 'Computer Science and Engineering';
      const deptShort   = semInfo.deptShort    || ocrMeta.department      || 'CSE';
      const branchName  = semInfo.branchName   || ocrMeta.branch          || 'B.Tech CSE';
      const branchShort = semInfo.branchShort  || ocrMeta.branch_short    || 'CS';
      const program     = (semInfo.program     || ocrMeta.program         || 'BTECH').toUpperCase();
      const semNum      = parseInt(String(semInfo.semesterNumber || ocrMeta.semester_number || 6));
      // Normalize section: empty string or whitespace-only -> null
      const rawSection  = semInfo.section || ocrMeta.section || null;
      const section     = (rawSection && String(rawSection).trim()) ? String(rawSection).trim().toUpperCase() : null;

      console.log(`[Worker] Resolving: dept=${deptShort}, branch=${branchShort}, program=${program}, sem=${semNum}, section=${section}`);
      console.log(`[Worker] semInfo from job:`, JSON.stringify(semInfo));

      // Find-or-create Department
      let dept = await prisma.department.findFirst({ where: { shortCode: deptShort } });
      if (!dept) {
        dept = await prisma.department.create({
          data: { name: deptName, shortCode: deptShort }
        });
      }

      // Find-or-create Branch
      let branch = await prisma.branch.findFirst({ where: { shortCode: branchShort, departmentId: dept.id } });
      if (!branch) {
        branch = await prisma.branch.create({
          data: {
            name: branchName,
            shortCode: branchShort,
            program: program as any,
            departmentId: dept.id
          }
        });
      }

      // Find-or-create Semester (unique by number + section + branchId)
      let semester;
      if (job.data.semesterId) {
        semester = await prisma.semester.findUnique({ where: { id: job.data.semesterId } });
      }
      if (!semester) {
        // Always upsert based on exact identity — never fall back to findFirst()
        semester = await prisma.semester.upsert({
          where: { number_section_branchId: { number: semNum, section: section, branchId: branch.id } },
          create: { number: semNum, section: section, branchId: branch.id },
          update: {}
        });
      }

      let createdRooms = 0;
      let matchedRooms = 0;
      let createdCourses = 0;
      let matchedCourses = 0;
      let slotsCreated = 0;

      // Integrate Rooms
      for (const pr of parsedRooms) {
        const existing = await prisma.room.findUnique({
          where: { roomNumber_departmentId: { roomNumber: pr.number, departmentId: dept.id } }
        });
        if (!existing) {
          await prisma.room.create({
            data: {
              roomNumber: pr.number,
              type: pr.type as any,
              capacity: pr.capacity,
              departmentId: dept.id,
            }
          });
          createdRooms++;
        } else {
          matchedRooms++;
        }
      }

      // Integrate Courses and Faculty
      const courseFacultyMap = new Map<string, string[]>(); // courseCode -> array of facultyIds
      for (const pc of parsedCourses) {
        // Faculty processing
        let facultyIds: string[] = [];
        if (pc.faculty) {
           // Clean faculty name a bit, remove parenthesis info like '(Group 1)', and split by 'and', '&', or ','
           const facNames = pc.faculty
             .replace(/[\[\]]/g, '')
             .replace(/\([^)]+\)/g, '')
             .split(/\s+and\s+|\s*&\s*|\s*,\s*/i)
             .map((n: string) => n.trim())
             .filter((n: string) => n.length > 0);
           
           for (const facName of facNames) {
               const email = facName.toLowerCase().replace(/[^a-z]/g, '') + '@bitmesra.ac.in';
               
               let fac = await prisma.faculty.findUnique({ where: { email } });
               if (!fac) {
                   fac = await prisma.faculty.create({
                       data: {
                          name: facName,
                          email: email,
                          role: 'PROFESSOR',
                          passwordHash: 'dummy',
                          departmentId: dept.id
                       }
                   });
               }
               facultyIds.push(fac.id);
           }
           courseFacultyMap.set(pc.code, facultyIds);
        }

        const existing = await prisma.course.findUnique({ where: { code: pc.code } });
        if (!existing) {
          await prisma.course.create({
            data: {
              code: pc.code,
              name: pc.name,
              credits: pc.credits,
              branchId: branch.id,
              semester: semester.number,
            }
          });
          createdCourses++;
        } else {
          matchedCourses++;
        }
      }

      // Clear old slots for this semester if any exist (to avoid duplicates since we dropped unique constraint)
      await prisma.timetableSlot.deleteMany({ where: { semesterId: semester.id } });

      // Integrate Slots
      console.log(`[Worker] Starting slot integration: ${parsedSlots.length} slots, semester=${semester.id}`);
      for (const ps of parsedSlots) {
        if (!ps.courseCode) {
          console.warn(`[Worker] Skipping slot: courseCode is missing. Slot details:`, JSON.stringify(ps));
          continue;
        }

        // Case-insensitive course lookup as fallback
        let course = await prisma.course.findUnique({ where: { code: ps.courseCode } });
        if (!course) {
          course = await prisma.course.findFirst({ where: { code: { equals: ps.courseCode, mode: 'insensitive' } } });
        }
        const room = await prisma.room.findUnique({
          where: { roomNumber_departmentId: { roomNumber: ps.roomNumber, departmentId: dept.id } }
        });

        if (!course) {
          console.warn(`[Worker] Skipping slot: course not found for code=${ps.courseCode}`);
        }
        if (course) {
          const facultyIds = courseFacultyMap.get(ps.courseCode) || [];
          const primaryFacultyId = facultyIds.length > 0 ? facultyIds[0] : null;

          // Create slot
          const upsertedSlot = await prisma.timetableSlot.create({
            data: {
              day: ps.day as any,
              period: ps.period as any,
              semesterId: semester.id,
              courseId: course.id,
              roomId: room ? room.id : null,
              facultyId: primaryFacultyId,
            }
          });
          
          if (facultyIds.length > 1) {
             for (let i = 1; i < facultyIds.length; i++) {
                await prisma.timetableSlotFaculty.upsert({
                   where: { slotId_facultyId: { slotId: upsertedSlot.id, facultyId: facultyIds[i] } },
                   create: { slotId: upsertedSlot.id, facultyId: facultyIds[i] },
                   update: {}
                });
             }
          }
          
          slotsCreated++;
        }
      }

      // 3. Done Phase
      const summary = {
        createdRooms,
        matchedRooms,
        createdCourses,
        matchedCourses,
        slotsCreated,
        failedRows: 0,
        failReasons: [],
      };

      await updateJobStatus(importJobId, 'DONE', summary);

      // (Optional) Trigger Analytics Recompute here.
      // In a real system, you'd invalidate cache or queue an analytics compute job.

    } catch (error: any) {
      console.error('[pdfWorker] Error processing job:', error);
      await updateJobStatus(importJobId, 'FAILED', { error: error.message });
      throw error;
    }
  },
  { connection: redisConnection as any }
);

pdfWorker.on('completed', job => {
  console.log(`✅ [BullMQ] Job ${job.id} completed successfully.`);
});

pdfWorker.on('failed', (job, err) => {
  console.log(`❌ [BullMQ] Job ${job?.id} failed:`, err);
});
