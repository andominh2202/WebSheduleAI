import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper to get authenticated user id
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

// Helper to require auth and return user id
export async function requireAuth(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

// Get active semester for user
export async function getActiveSemester(userId: string) {
  let semester = await prisma.semester.findFirst({
    where: { userId, isActive: true },
  });

  if (!semester) {
    semester = await prisma.semester.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  return semester;
}

// Generate course sessions from a schedule
export async function generateSessions(scheduleId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { course: true },
  });

  if (!schedule) return;

  // Delete existing auto-generated sessions for this schedule
  await prisma.courseSession.deleteMany({
    where: {
      scheduleId,
      type: 'regular',
    },
  });

  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  const sessions: {
    date: Date;
    startTime: string;
    endTime: string;
    room: string | null;
    location: string | null;
    courseId: string;
    scheduleId: string;
    type: string;
    status: string;
  }[] = [];

  // Iterate through each day from start to end
  const current = new Date(startDate);
  let weekCount = 0;

  // Find the first occurrence of the target day
  while (current.getDay() !== schedule.dayOfWeek && current <= endDate) {
    current.setDate(current.getDate() + 1);
  }

  while (current <= endDate) {
    weekCount++;
    const weekNumber = getWeekNumberFromStart(current, startDate);

    let shouldAdd = true;
    if (schedule.weekType === 'even' && weekNumber % 2 !== 0) shouldAdd = false;
    if (schedule.weekType === 'odd' && weekNumber % 2 === 0) shouldAdd = false;

    if (shouldAdd) {
      sessions.push({
        date: new Date(current),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        room: schedule.room,
        location: schedule.location,
        courseId: schedule.courseId,
        scheduleId: schedule.id,
        type: 'regular',
        status: current < new Date() ? 'completed' : 'upcoming',
      });
    }

    current.setDate(current.getDate() + 7);
  }

  if (sessions.length > 0) {
    await prisma.courseSession.createMany({
      data: sessions,
    });
  }

  return sessions.length;
}

function getWeekNumberFromStart(date: Date, startDate: Date): number {
  const diff = date.getTime() - startDate.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

// Check for schedule conflicts
export async function checkScheduleConflicts(
  userId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
) {
  const userCourses = await prisma.course.findMany({
    where: { userId },
    select: { id: true },
  });

  const courseIds = userCourses.map((c) => c.id);

  const existingSchedules = await prisma.schedule.findMany({
    where: {
      courseId: { in: courseIds },
      dayOfWeek,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
    include: { course: true },
  });

  const conflicts = existingSchedules.filter((s) => {
    return timeOverlaps(startTime, endTime, s.startTime, s.endTime);
  });

  return conflicts;
}

function timeOverlaps(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  return s1 < e2 && s2 < e1;
}
