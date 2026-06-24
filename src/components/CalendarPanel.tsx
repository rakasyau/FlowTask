import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink,
  Import,
  CalendarCheck
} from 'lucide-react';
import { CalendarEvent } from '../types';

interface CalendarPanelProps {
  accessToken: string | null;
  onImportEvent: (event: CalendarEvent) => void;
  selectedDate: string; // YYYY-MM-DD
  onTokenExpired?: () => void;
}

export default function CalendarPanel({
  accessToken,
  onImportEvent,
  selectedDate,
  onTokenExpired,
}: CalendarPanelProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch events from Google Calendar
  const fetchCalendarEvents = async () => {
    if (!accessToken || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate start and end of selectedDate in ISO format
      const startOfDay = new Date(`${selectedDate}T00:00:00`);
      const endOfDay = new Date(`${selectedDate}T23:59:59`);

      if (isNaN(startOfDay.getTime()) || isNaN(endOfDay.getTime())) {
        console.warn('Invalid date:', selectedDate);
        setEvents([]);
        setLoading(false);
        return;
      }

      const timeMin = startOfDay.toISOString();
      const timeMax = endOfDay.toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (onTokenExpired) onTokenExpired();
          throw new Error('Sesi Google Auth telah berakhir. Silakan masuk kembali.');
        }
        throw new Error('Gagal mengambil jadwal dari Google Calendar');
      }

      const data = await response.json();
      setEvents(data.items || []);
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      setError(err.message || 'Terjadi kesalahan saat menghubungi Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch when accessToken or selectedDate changes
  useEffect(() => {
    if (accessToken) {
      fetchCalendarEvents();
    } else {
      setEvents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedDate]);

  // Helper to format event time
  const formatEventTime = (event: CalendarEvent) => {
    try {
      if (event.start && event.start.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = (event.end && event.end.dateTime) ? new Date(event.end.dateTime) : null;
        
        const formatTime = (date: Date) => {
          if (isNaN(date.getTime())) return '--:--';
          return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        };

        return `${formatTime(start)} - ${end ? formatTime(end) : 'Selesai'}`;
      } else if (event.start && event.start.date) {
        return 'Sepanjang hari';
      }
      return 'Waktu tidak ditentukan';
    } catch {
      return 'Waktu tidak valid';
    }
  };

  // Get date in Indonesian readable format
  const formatIndonesianDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (!accessToken) {
    return (
      <div className="bg-slate-800 text-white rounded-[32px] p-6 text-center border border-slate-700/50 shadow-md">
        <CalendarCheck className="h-10 w-10 text-blue-400 mx-auto mb-3" />
        <h4 className="text-sm font-bold tracking-tight">Google Calendar Belum Terhubung</h4>
        <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
          Hubungkan akun Google Anda di bagian atas untuk melihat jadwal hari ini langsung dari Google Calendar dan mensinkronisasikan tugas Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-600 text-white rounded-[32px] p-6 shadow-xl shadow-blue-200/50 space-y-4 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-blue-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse"></span>
            Google Calendar
          </h3>
          <p className="text-sm font-bold tracking-tight">
            {formatIndonesianDate(selectedDate)}
          </p>
        </div>
        <button
          id="refresh-calendar-button"
          type="button"
          onClick={fetchCalendarEvents}
          disabled={loading}
          className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          title="Perbarui Kalender"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div className="p-4 bg-white/10 border border-white/20 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-white shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-white">Gagal Memuat Kalender</p>
            <p className="text-[11px] text-blue-100 leading-relaxed">{error}</p>
          </div>
        </div>
      ) : loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto mb-2"></div>
          <p className="text-xs text-blue-100 font-medium">Menghubungkan ke Google Calendar...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center bg-white/10 rounded-2xl border border-dashed border-white/20">
          <Clock className="h-8 w-8 text-blue-100 mx-auto mb-2" />
          <h4 className="text-xs font-bold">Tidak Ada Acara</h4>
          <p className="text-[10px] text-blue-100 mt-0.5 max-w-[200px] mx-auto leading-normal">
            Tidak ada agenda Google Calendar untuk tanggal ini.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {events.map((event) => (
            <div
              key={event.id}
              id={`calendar-event-${event.id}`}
              className="group p-3.5 rounded-2xl border border-white/10 bg-white/10 hover:bg-white/15 transition-all flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-blue-100 transition-colors">
                    {event.summary || '(Tanpa Judul)'}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-100/90">
                    <Clock className="h-3 w-3 text-blue-200" />
                    <span>{formatEventTime(event)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id={`import-event-${event.id}`}
                    type="button"
                    onClick={() => onImportEvent(event)}
                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-all cursor-pointer"
                    title="Impor ke Tugas Harian"
                  >
                    <Import className="h-3.5 w-3.5" />
                  </button>
                  {event.htmlLink && (
                    <a
                      id={`link-event-${event.id}`}
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-all cursor-pointer"
                      title="Buka di Google Calendar"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
              {event.description && (
                <p className="text-[10px] text-blue-100 line-clamp-2 leading-relaxed opacity-90">
                  {event.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
