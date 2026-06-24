import { Task } from '../types';

// Helper to format local Date objects to ISO string without converting to UTC
const formatLocalDateTime = (dt: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
};

// Calculate event start and end date-time in local timezone
const getEventDates = (date: string, time: string, durationMinutes: number) => {
  const startDateTime = new Date(`${date}T${time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
  
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';

  return {
    start: {
      dateTime: formatLocalDateTime(startDateTime),
      timeZone,
    },
    end: {
      dateTime: formatLocalDateTime(endDateTime),
      timeZone,
    },
  };
};

/**
 * Creates an event on the user's primary Google Calendar.
 * Returns the created event ID.
 */
export async function createCalendarEvent(
  accessToken: string,
  task: { title: string; description: string; date: string; time: string; duration: number }
): Promise<string> {
  const { start, end } = getEventDates(task.date, task.time, task.duration);

  const eventBody = {
    summary: task.title,
    description: task.description || 'Dibuat dari aplikasi Pengelola Tugas Harian.',
    start,
    end,
    reminders: {
      useDefault: true,
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error('Failed to create event in Google Calendar:', errorDetails);
    throw new Error('Gagal menyinkronkan acara baru ke Google Calendar');
  }

  const createdEvent = await response.json();
  return createdEvent.id;
}

/**
 * Updates an existing event on the user's primary Google Calendar.
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  task: { title: string; description: string; date: string; time: string; duration: number }
): Promise<void> {
  const { start, end } = getEventDates(task.date, task.time, task.duration);

  const eventBody = {
    summary: task.title,
    description: task.description || 'Dibuat dari aplikasi Pengelola Tugas Harian.',
    start,
    end,
  };

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error('Failed to update event in Google Calendar:', errorDetails);
    throw new Error('Gagal memperbarui acara di Google Calendar');
  }
}

/**
 * Deletes an event on the user's primary Google Calendar.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorDetails = await response.text();
    console.error('Failed to delete event from Google Calendar:', errorDetails);
    throw new Error('Gagal menghapus acara dari Google Calendar');
  }
}
