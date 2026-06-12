// @ts-nocheck
import { prisma } from '../lib/prisma';

export async function computeDashboardAnalytics(semesterId?: string) {
  const rooms = await prisma.room.findMany();
  
  const slotWhere = semesterId ? { semesterId } : {};
  const slots = await prisma.timetableSlot.findMany({
    where: slotWhere,
    include: {
      course: true,
      room: true,
    }
  });

  let courseWhere = {};
  if (semesterId) {
     const sem = await prisma.semester.findUnique({ where: { id: semesterId } });
     if (sem) {
         courseWhere = { semester: sem.number, branchId: sem.branchId };
     }
  }

  const courses = await prisma.course.findMany({
    where: courseWhere,
    include: {
      slots: true,
    }
  });

  // Constants
  const DAYS = 6; // MON-SAT
  const PERIODS = 9; // I-IX
  const TOTAL_SLOTS_PER_WEEK = DAYS * PERIODS;

  // 1. Room Utilisation %
  // Total occupied slots / (Total rooms * slots per week)
  const totalAvailableSlots = rooms.length * TOTAL_SLOTS_PER_WEEK;
  const occupiedSlots = slots.length;
  const roomUtilisation = totalAvailableSlots === 0 
    ? 0 
    : (occupiedSlots / totalAvailableSlots) * 100;

  // 2. Probability of Empty Room (avg per slot) & Heatmap Data
  let totalPEmpty = 0;
  
  // Initialize 6x9 matrix with 0s
  const heatmapData: number[][] = Array(DAYS).fill(0).map(() => Array(PERIODS).fill(0));
  
  if (rooms.length > 0) {
    const dayMap: Record<string, number> = { 'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5 };
    const periodMap: Record<string, number> = { 'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6, 'VIII': 7, 'IX': 8 };

    // Fill slot counts
    slots.forEach(slot => {
      const d = dayMap[slot.day as string];
      const p = periodMap[slot.period as string];
      if (d !== undefined && p !== undefined) {
        heatmapData[d][p] += 1; // count occupied rooms
      }
    });

    // Convert counts to ratios (0..1)
    for (let d = 0; d < DAYS; d++) {
      for (let p = 0; p < PERIODS; p++) {
        heatmapData[d][p] = heatmapData[d][p] / rooms.length;
      }
    }

    totalPEmpty = 1 - (roomUtilisation / 100);
  }

  // 3. Under-running courses
  // courses where scheduled contact slots < credit hours
  const underRunningCourses = courses.filter(c => {
    if (c.isZeroCredit || c.credits === 0) return false;
    const scheduledSlots = c.slots.length;
    return scheduledSlots < c.credits;
  }).map(c => ({
    code: c.code,
    name: c.name,
    scheduled: c.slots.length,
    required: c.credits
  }));

  // 4. Avg Empty Room-Hours per Day
  // (unscheduled slots * 1 hr) / DAYS
  // unscheduled slots = totalAvailableSlots - occupiedSlots
  const unscheduledSlots = totalAvailableSlots - occupiedSlots;
  const avgEmptyRoomHrsPerDay = rooms.length === 0 ? 0 : (unscheduledSlots / rooms.length) / DAYS;

  // 5. Current Classes / Up Next (Dynamic based on IST)
  const PERIODS_DEF = [
    { id: 'I', start: 8*60 + 0, end: 8*60 + 50, label: '08:00 AM - 08:50 AM' },
    { id: 'II', start: 9*60 + 0, end: 9*60 + 50, label: '09:00 AM - 09:50 AM' },
    { id: 'III', start: 10*60 + 0, end: 10*60 + 50, label: '10:00 AM - 10:50 AM' },
    { id: 'IV', start: 11*60 + 0, end: 11*60 + 50, label: '11:00 AM - 11:50 AM' },
    { id: 'V', start: 12*60 + 0, end: 12*60 + 50, label: '12:00 PM - 12:50 PM' },
    { id: 'VI', start: 13*60 + 30, end: 14*60 + 20, label: '01:30 PM - 02:20 PM' },
    { id: 'VII', start: 14*60 + 30, end: 15*60 + 20, label: '02:30 PM - 03:20 PM' },
    { id: 'VIII', start: 15*60 + 30, end: 16*60 + 20, label: '03:30 PM - 04:20 PM' },
    { id: 'IX', start: 16*60 + 30, end: 17*60 + 20, label: '04:30 PM - 05:20 PM' }
  ];
  
  const now = new Date();
  // Ensure we are comparing in IST since the timetable is for India
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5));
  
  const currentMs = istTime.getHours() * 60 + istTime.getMinutes();
  const dayMapNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayStr = dayMapNames[istTime.getDay()];

  let currentPeriod: any = null;
  let nextPeriod: any = null;

  for (let i = 0; i < PERIODS_DEF.length; i++) {
    const p = PERIODS_DEF[i];
    if (currentMs >= p.start && currentMs <= p.end) {
      currentPeriod = p;
      nextPeriod = PERIODS_DEF[i + 1] || null;
      break;
    } else if (currentMs < p.start) {
      nextPeriod = p;
      break;
    }
  }

  const currentSlots = currentPeriod ? slots.filter(s => s.day === todayStr && s.period === currentPeriod.id) : [];
  const nextSlots = nextPeriod ? slots.filter(s => s.day === todayStr && s.period === nextPeriod.id) : [];

  const currentClasses = currentSlots.map(s => ({
    courseCode: s.course?.code,
    courseName: s.course?.name,
    room: s.room?.roomNumber,
    time: currentPeriod?.label
  }));

  const nextClasses = nextSlots.map(s => ({
    courseCode: s.course?.code,
    courseName: s.course?.name,
    room: s.room?.roomNumber,
    time: nextPeriod?.label
  }));

  return {
    roomUtilisation: Math.round(roomUtilisation),
    pEmpty: totalPEmpty.toFixed(2),
    underRunning: underRunningCourses,
    underRunningCount: underRunningCourses.length,
    avgEmptyRoomHrsPerDay: avgEmptyRoomHrsPerDay.toFixed(1),
    occupiedRatio: Math.round(roomUtilisation),
    emptyRatio: 100 - Math.round(roomUtilisation),
    heatmapData,
    currentClasses,
    nextClasses
  };
}
