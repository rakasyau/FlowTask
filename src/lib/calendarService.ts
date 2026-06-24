import { Task } from '../types';

// Format a local Date to ISO 8601 without UTC conversion
const toLocalISO = (dt: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
};

const buildEventDates = (date: string, time: string, durationMinutes: number) => {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  return {
    start: { dateTime: toLocalISO(start), timeZone },
    end: { dateTime: toLocalISO(end), timeZone },
  };
};

type TaskPayload = Pick<Task, 'title' | 'description' | 'date' | 'time' | 'duration'>;

async function calendarFetch(
  accessToken: string,
  path: string,
  method: string,
  body?: object
): Promise<Response> {
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

/** Parse Google API error from response body */
async function parseGoogleError(response: Response): Promise<string> {
  try {
    const json = await response.clone().json();
    return json?.error?.errors?.[0]?.reason || json?.error?.message || '';
  } catch (_) { return ''; }
}

/** Throw a typed error based on HTTP status and Google error reason */
async function throwCalendarError(response: Response, context: string): Promise<never> {
  const reason = await parseGoogleError(response);
  console.error(`[Calendar] ${context} failed — HTTP ${response.status}, reason: ${reason}`);

  if (response.status === 401) throw new Error('TOKEN_EXPIRED');
  if (response.status === 403) {
    if (reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED' || reason.includes('disabled')) {
      throw new Error('API_DISABLED');
    }
    throw new Error('TOKEN_EXPIRED'); // insufficient permissions → reconnect
  }
  throw new Error(`${context} gagal (HTTP ${response.status})`);
}

/** Creates a Google Calendar event. Returns the new event ID. */
export async function createCalendarEvent(
  accessToken: string,
  task: TaskPayload
): Promise<string> {
  const { start, end } = buildEventDates(task.date, task.time, task.duration);

  const response = await calendarFetch(accessToken, '', 'POST', {
    summary: task.title,
    description: task.description || 'Dibuat dari FlowTask.',
    start,
    end,
    reminders: { useDefault: true },
  });

  if (!response.ok) {
    await throwCalendarError(response, 'createCalendarEvent');
  }

  const data = await response.json();
  return data.id as string;
}

/** Updates an existing Google Calendar event. */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  task: TaskPayload
): Promise<void> {
  const { start, end } = buildEventDates(task.date, task.time, task.duration);

  const response = await calendarFetch(accessToken, `/${eventId}`, 'PUT', {
    summary: task.title,
    description: task.description || 'Dibuat dari FlowTask.',
    start,
    end,
  });

  if (!response.ok) {
    await throwCalendarError(response, 'updateCalendarEvent');
  }
}

/** Deletes a Google Calendar event. 404 is silently ignored. */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await calendarFetch(accessToken, `/${eventId}`, 'DELETE');

  if (!response.ok && response.status !== 404) {
    await throwCalendarError(response, 'deleteCalendarEvent');
  }
}
