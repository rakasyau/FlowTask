import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, AlertCircle, ExternalLink, Import, CalendarCheck, Calendar } from 'lucide-react';
import { CalendarEvent } from '../types';

interface CalendarPanelProps {
  accessToken: string | null;
  onImportEvent: (event: CalendarEvent) => void;
  selectedDate: string;
  onTokenExpired?: () => void;
  onReconnect?: () => void;
  reconnecting?: boolean;
}

export default function CalendarPanel({
  accessToken, onImportEvent, selectedDate, onTokenExpired, onReconnect, reconnecting,
}: CalendarPanelProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendarEvents = useCallback(async () => {
    if (!accessToken || !selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      const startOfDay = new Date(`${selectedDate}T00:00:00`);
      const endOfDay = new Date(`${selectedDate}T23:59:59`);
      if (isNaN(startOfDay.getTime())) { setEvents([]); return; }

      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('timeMin', startOfDay.toISOString());
      url.searchParams.set('timeMax', endOfDay.toISOString());
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        // Parse error body for specific Google API error codes
        let errorReason = '';
        try {
          const errJson = await response.clone().json();
          errorReason = errJson?.error?.errors?.[0]?.reason || errJson?.error?.message || '';
        } catch (_) {}

        if (response.status === 401) {
          if (onTokenExpired) onTokenExpired();
          setError('Sesi Google Calendar kadaluarsa. Klik "Hubungkan Ulang" untuk melanjutkan.');
          return;
        }
        if (response.status === 403) {
          if (errorReason === 'accessNotConfigured' || errorReason === 'SERVICE_DISABLED' || errorReason.includes('disabled')) {
            setError('Google Calendar API belum diaktifkan. Buka Google Cloud Console → APIs & Services → aktifkan "Google Calendar API" untuk project ini.');
          } else if (errorReason === 'forbidden' || errorReason === 'insufficientPermissions') {
            if (onTokenExpired) onTokenExpired();
            setError('Akses Google Calendar ditolak. Hubungkan ulang akun untuk memberikan izin yang diperlukan.');
          } else {
            setError(`Akses ditolak oleh Google Calendar (403${errorReason ? ': ' + errorReason : ''}). Pastikan Google Calendar API sudah diaktifkan.`);
          }
          return;
        }
        throw new Error(`Gagal mengambil jadwal (HTTP ${response.status})`);
      }
      const data = await response.json();
      setEvents(data.items || []);
    } catch (err: any) {
      console.error('[CalendarPanel] fetch error:', err);
      setError(err.message || 'Terjadi kesalahan saat menghubungi Google Calendar.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedDate, onTokenExpired]);

  useEffect(() => {
    if (accessToken) fetchCalendarEvents();
    else setEvents([]);
  }, [accessToken, selectedDate, fetchCalendarEvents]);

  const formatEventTime = (event: CalendarEvent) => {
    try {
      if (event.start?.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
        const fmt = (d: Date) => isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', hour12:false });
        return `${fmt(start)}${end ? ` – ${fmt(end)}` : ''}`;
      }
      if (event.start?.date) return 'Sepanjang hari';
      return 'Waktu tidak ditentukan';
    } catch { return 'Waktu tidak valid'; }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' });
    } catch { return dateStr; }
  };

  if (!accessToken) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 p-5 text-center shadow-xs space-y-3">
        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
          <CalendarCheck className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-700">Google Calendar Terputus</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Hubungkan ulang untuk melihat jadwal dan mensinkronkan tugas.
          </p>
        </div>
        {onReconnect && (
          <button onClick={onReconnect} disabled={reconnecting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 cursor-pointer">
            <RefreshCw className={`h-3.5 w-3.5 ${reconnecting ? 'animate-spin' : ''}`} />
            {reconnecting ? 'Menghubungkan...' : 'Hubungkan Ulang Kalender'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-5 shadow-xl shadow-blue-200/50 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">Google Calendar</span>
          </div>
          <p className="text-sm font-bold">{formatDate(selectedDate)}</p>
        </div>
        <button onClick={fetchCalendarEvents} disabled={loading}
          className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50 cursor-pointer" title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error state with reconnect option */}
      {error ? (
        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 space-y-3 shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
            <div>
              <p className="text-xs font-bold">
                {error.includes('belum diaktifkan') ? '⚙️ Google Calendar API Belum Aktif' : 'Gagal Memuat Kalender'}
              </p>
              <p className="text-[11px] text-blue-200 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
          {error.includes('belum diaktifkan') ? (
            <a
              href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-amber-400/80 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-xl transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Aktifkan Google Calendar API →
            </a>
          ) : onReconnect && (
            <button onClick={onReconnect} disabled={reconnecting}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 cursor-pointer">
              <RefreshCw className={`h-3 w-3 ${reconnecting ? 'animate-spin' : ''}`} />
              {reconnecting ? 'Menghubungkan...' : 'Hubungkan Ulang'}
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="py-10 text-center flex-1 flex flex-col justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto mb-2" />
          <p className="text-xs text-blue-200">Memuat jadwal...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center bg-white/10 rounded-2xl border border-dashed border-white/20 flex-1 flex flex-col justify-center">
          <Calendar className="h-7 w-7 text-blue-200 mx-auto mb-2" />
          <p className="text-xs font-bold">Tidak Ada Acara</p>
          <p className="text-[10px] text-blue-300 mt-0.5">Tidak ada jadwal untuk tanggal ini.</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
          {events.map((event) => (
            <div key={event.id}
              className="group p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{event.summary || '(Tanpa Judul)'}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 text-blue-300" />
                    <span className="text-[10px] text-blue-200 font-medium">{formatEventTime(event)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onImportEvent(event)}
                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-all cursor-pointer" title="Impor ke Tugas">
                    <Import className="h-3.5 w-3.5" />
                  </button>
                  {event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-all" title="Buka di Google Calendar">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
              {event.description && (
                <p className="text-[10px] text-blue-200 mt-1.5 line-clamp-1 leading-relaxed">{event.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
