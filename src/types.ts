export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  category: TaskCategory;
  completed: boolean;
  synced: boolean;
  calendarEventId?: string | null;
  createdAt: number;
}

export type TaskCategory = 'Pekerjaan' | 'Pribadi' | 'Belajar' | 'Kesehatan' | 'Lainnya';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}
