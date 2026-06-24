import React, { useState, useEffect, useCallback } from 'react';
import { ref, push, update, remove, onValue, off } from 'firebase/database';
import { User as FirebaseUser } from 'firebase/auth';
import { initAuth, googleSignIn, reconnectCalendar, handleRedirectResult, logout, db } from './lib/firebase';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './lib/calendarService';
import { Task, CalendarEvent } from './types';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import CalendarPanel from './components/CalendarPanel';
import ConfirmationDialog from './components/ConfirmationDialog';
import KalenderView from './components/KalenderView';
import KategoriView from './components/KategoriView';
import StatistikView from './components/StatistikView';
import {
  CalendarCheck2, LogOut, AlertCircle, CheckCircle, Calendar,
  Sparkles, Info, RefreshCw, LayoutDashboard, Tag, BarChart2,
  Plus, Menu, X,
} from 'lucide-react';

type TabId = 'dashboard' | 'kalender' | 'kategori' | 'statistik';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string;
    isDestructive: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', isDestructive: false, onConfirm: () => {} });

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  useEffect(() => { setSelectedDate(todayStr()); }, []);

  useEffect(() => {
    // Handle redirect-based sign-in result FIRST, before auth state fires
    handleRedirectResult().then((result) => {
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showSuccess(`Selamat datang, ${result.user.displayName || 'Pengguna'}!`);
      }
    });

    return initAuth(
      (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken);
        setLoading(false);
      },
      () => { setUser(null); setToken(null); setLoading(false); }
    );
  }, []);

  useEffect(() => {
    if (!user) { setTasks([]); return; }
    const tasksRef = ref(db, `tasks/${user.uid}`);
    const handleValue = (snap: any) => {
      const data = snap.val();
      const list: Task[] = data
        ? Object.entries(data).map(([id, val]) => ({ id, ...(val as Omit<Task,'id'>) }))
        : [];
      list.sort((a, b) => {
        if (a.date !== b.date) return (a.date||'').localeCompare(b.date||'');
        return (a.time||'').localeCompare(b.time||'');
      });
      setTasks(list);
    };
    onValue(tasksRef, handleValue, (err) => {
      console.error('DB error:', err);
      showError('Gagal memuat tugas dari database.');
    });
    return () => off(tasksRef, 'value', handleValue);
  }, [user]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // Handle TOKEN_EXPIRED and API_DISABLED errors from calendarService
  const handleCalendarError = useCallback((err: any): boolean => {
    const msg = err?.message || '';
    if (msg === 'API_DISABLED') {
      showError('Google Calendar API belum diaktifkan. Buka console.cloud.google.com → APIs & Services → aktifkan "Google Calendar API" untuk project 476206050700.');
      return true;
    }
    if (msg === 'TOKEN_EXPIRED' || msg.includes('TOKEN_EXPIRED')) {
      setToken(null);
      try { sessionStorage.removeItem('google_calendar_access_token'); } catch(_) {}
      showError('Sesi Google Calendar kadaluarsa. Klik "Hubungkan Ulang Kalender" untuk melanjutkan sinkronisasi.');
      return true;
    }
    return false;
  }, []);

  const handleLogin = async () => {
    setActionLoading(true);
    try {
      const result = await googleSignIn();
      // If redirect was triggered, page reloads — result will be empty object
      if (result?.accessToken) {
        setUser(result.user);
        setToken(result.accessToken);
        showSuccess(`Selamat datang, ${result.user.displayName || 'Pengguna'}!`);
      }
      // else: redirect in progress, page is reloading
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // Silent — user intentionally closed popup
      } else if (code === 'auth/unauthorized-domain') {
        showError('Domain ini belum diizinkan di Firebase. Tambahkan domain ini di Firebase Console → Authentication → Authorized domains.');
      } else if (code === 'auth/network-request-failed') {
        showError('Gagal masuk: tidak ada koneksi internet. Periksa jaringan Anda.');
      } else if (code === 'auth/too-many-requests') {
        showError('Terlalu banyak percobaan masuk. Tunggu beberapa menit lalu coba lagi.');
      } else if (code === 'auth/user-disabled') {
        showError('Akun ini telah dinonaktifkan.');
      } else {
        showError(`Gagal masuk (${code || err.message || 'unknown'}). Coba lagi.`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconnectCalendar = async () => {
    setReconnecting(true);
    try {
      const newToken = await reconnectCalendar();
      if (newToken) {
        setToken(newToken);
        showSuccess('Google Calendar berhasil terhubung kembali!');
      }
      // else: redirect triggered, page reloading
    } catch (err: any) {
      console.error('Reconnect error:', err);
      const code = err.code || '';
      if (code === 'auth/unauthorized-domain') {
        showError('Domain ini belum diizinkan di Firebase Console → Authentication → Authorized domains.');
      } else if (code === 'auth/network-request-failed') {
        showError('Tidak ada koneksi internet saat mencoba terhubung ke Google.');
      } else {
        showError('Gagal menghubungkan ulang Google Calendar. Coba lagi.');
      }
    } finally {
      setReconnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
    } catch { showError('Gagal keluar akun.'); }
  };

  const handleCreateOrUpdateTask = async (taskData: Omit<Task,'id'|'userId'|'createdAt'>) => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (editingTask && editingTask.id) {
        let calendarEventId = editingTask.calendarEventId || null;
        if (taskData.synced && token) {
          try {
            if (calendarEventId) await updateCalendarEvent(token, calendarEventId, taskData);
            else calendarEventId = await createCalendarEvent(token, taskData);
          } catch (calErr: any) {
            if (handleCalendarError(calErr)) { setActionLoading(false); return; }
            throw calErr;
          }
        } else if (!taskData.synced && calendarEventId && token) {
          try { await deleteCalendarEvent(token, calendarEventId); } catch (_) {}
          calendarEventId = null;
        }
        await update(ref(db, `tasks/${user.uid}/${editingTask.id}`), { ...taskData, calendarEventId });
        showSuccess('Tugas berhasil diperbarui.');
        setEditingTask(null);
      } else {
        let calendarEventId: string | null = null;
        if (taskData.synced && token) {
          try { calendarEventId = await createCalendarEvent(token, taskData); }
          catch (calErr: any) {
            if (handleCalendarError(calErr)) { setActionLoading(false); return; }
            throw calErr;
          }
        }
        await push(ref(db, `tasks/${user.uid}`), {
          ...taskData, userId: user.uid, calendarEventId, createdAt: Date.now(),
        });
        showSuccess('Tugas baru berhasil ditambahkan!');
      }
    } catch (err: any) {
      console.error('Task save error:', err);
      showError(err.message || 'Terjadi kesalahan saat menyimpan tugas.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      await update(ref(db, `tasks/${user!.uid}/${task.id}`), { completed: !task.completed });
      showSuccess(task.completed ? 'Tugas aktif kembali.' : 'Tugas selesai!');
    } catch { showError('Gagal memperbarui status tugas.'); }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setActiveTab('dashboard');
    setTimeout(() => {
      document.getElementById('task-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleDeleteClick = (task: Task) => {
    const hasCalendar = task.synced && task.calendarEventId && token;
    setConfirmState({
      isOpen: true,
      title: hasCalendar ? 'Hapus Tugas & Acara Kalender?' : 'Hapus Tugas?',
      message: hasCalendar
        ? `Tugas "${task.title}" tersinkronisasi dengan Google Calendar. Menghapus ini juga akan menghapus acaranya dari Google Calendar.`
        : `Hapus tugas "${task.title}"? Tindakan ini tidak bisa dibatalkan.`,
      isDestructive: true,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setActionLoading(true);
        try {
          if (hasCalendar && task.calendarEventId) {
            try { await deleteCalendarEvent(token!, task.calendarEventId); } catch (_) {}
          }
          await remove(ref(db, `tasks/${user!.uid}/${task.id}`));
          showSuccess('Tugas berhasil dihapus.');
          if (editingTask?.id === task.id) setEditingTask(null);
        } catch { showError('Gagal menghapus tugas.'); }
        finally { setActionLoading(false); }
      },
    });
  };

  const handleImportEvent = (event: CalendarEvent) => {
    let date = selectedDate, time = '09:00', duration = 60;
    if (event.start?.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
      date = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
      time = `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`;
      if (end) duration = Math.max(15, Math.round((end.getTime()-start.getTime())/60000));
    } else if (event.start?.date) {
      date = event.start.date; time = '00:00'; duration = 1440;
    }
    setEditingTask({
      id: '', userId: user?.uid||'', title: event.summary||'',
      description: event.description||'', date, time, duration,
      category: 'Pekerjaan', completed: false, synced: !!token,
      calendarEventId: event.id, createdAt: Date.now(),
    });
    showSuccess(`Acara "${event.summary}" diimpor ke formulir!`);
    setActiveTab('dashboard');
    setTimeout(() => {
      document.getElementById('task-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleTokenExpired = () => {
    setToken(null);
    try { sessionStorage.removeItem('google_calendar_access_token'); } catch(_) {}
    showError('Sesi Google Calendar kadaluarsa. Klik "Hubungkan Ulang Kalender" untuk melanjutkan.');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto"></div>
        <p className="text-sm font-medium text-slate-500">Memuat FlowTask...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 p-8 shadow-2xl shadow-slate-200/60 text-center space-y-7 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="space-y-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-2xl font-display">F</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">FlowTask</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Kelola tugas harian dan sinkronkan langsung dengan Google Calendar Anda.
          </p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 text-left border border-slate-100">
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Sinkronisasi otomatis</strong> — tugas yang dibuat langsung muncul di Google Calendar
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Pantau agenda</strong> — lihat semua jadwal Google Calendar langsung di dashboard
            </p>
          </div>
        </div>
        <button
          onClick={handleLogin} disabled={actionLoading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
        >
          {actionLoading ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          )}
          <span>{actionLoading ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
        </button>
        <p className="text-[10px] text-slate-400">
          Hanya mengakses Google Calendar berdasarkan izin yang Anda berikan.
        </p>
      </div>
    </div>
  );

  const todayIndonesian = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const completedCount = tasks.filter(t => t.completed).length;
  const productivityScore = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen w-full bg-slate-100 font-sans flex">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col p-5 shrink-0 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 font-display">FlowTask</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1 flex-1">
          {([
            { id: 'dashboard' as TabId, icon: LayoutDashboard, label: 'Dashboard'  },
            { id: 'kalender'  as TabId, icon: Calendar,         label: 'Kalender'   },
            { id: 'kategori'  as TabId, icon: Tag,              label: 'Kategori'   },
            { id: 'statistik' as TabId, icon: BarChart2,        label: 'Statistik'  },
          ]).map(({ id, icon: Icon, label }) => (
            <button key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}>
              <Icon className={`h-4 w-4 ${activeTab === id ? 'text-blue-600' : 'text-slate-400'}`} />
              {label}
            </button>
          ))}
        </nav>

        {/* Calendar sync status */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2.5">
          <div className="flex items-center gap-2">
            {token ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)] animate-pulse" />
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Calendar Aktif</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Calendar Terputus</span>
              </>
            )}
          </div>
          {!token && (
            <button onClick={handleReconnectCalendar} disabled={reconnecting}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-60 cursor-pointer">
              <RefreshCw className={`h-3 w-3 ${reconnecting ? 'animate-spin' : ''}`} />
              {reconnecting ? 'Menghubungkan...' : 'Hubungkan Ulang Kalender'}
            </button>
          )}
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {token ? 'Sinkronisasi Google Calendar aktif.' : 'Masuk ulang untuk mengaktifkan sinkronisasi.'}
          </p>
        </div>

        {/* User info */}
        <div className="mt-3 flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
          {user.photoURL
            ? <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
            : <div className="w-8 h-8 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">{user.displayName?.charAt(0) || 'U'}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{user.displayName || 'Pengguna'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
          <button onClick={handleLogout} title="Keluar"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Top bar (mobile) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <span className="font-bold text-slate-900 font-display">FlowTask</span>
          </div>
          {user.photoURL
            ? <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" />
            : <div className="w-8 h-8 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">{user.displayName?.charAt(0)||'U'}</div>
          }
        </div>

        {/* ── Toasts (always visible regardless of tab) ── */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
          {successMsg && (
            <div className="flex items-start gap-3 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl border border-emerald-500/30 pointer-events-auto">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">{successMsg}</p>
            </div>
          )}
          {errorMsg && (
            <div className="flex items-start gap-3 p-4 bg-red-600 text-white rounded-2xl shadow-xl border border-red-500/30 pointer-events-auto">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6">

          {/* ── Shared header ── */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Halo, {user.displayName?.split(' ')[0] || 'Pengguna'} 👋
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                {todayIndonesian}
              </h2>
            </div>
            <button
              onClick={() => {
                setEditingTask(null);
                setActiveTab('dashboard');
                setTimeout(() => {
                  document.getElementById('task-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" /> Tugas Baru
            </button>
          </header>

          {/* ── Calendar reconnect banner (all tabs) ── */}
          {!token && (
            <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Google Calendar Terputus</p>
                  <p className="text-xs text-amber-600 mt-0.5">Sinkronisasi tidak aktif. Hubungkan ulang untuk mengaktifkan fitur kalender.</p>
                </div>
              </div>
              <button onClick={handleReconnectCalendar} disabled={reconnecting}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 cursor-pointer">
                <RefreshCw className={`h-3.5 w-3.5 ${reconnecting ? 'animate-spin' : ''}`} />
                {reconnecting ? 'Menghubungkan...' : 'Hubungkan Ulang'}
              </button>
            </div>
          )}

          {/* ══════════════════ TAB: DASHBOARD ══════════════════ */}
          {activeTab === 'dashboard' && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Tugas',   value: tasks.length,                    textColor: 'text-slate-900',   bg: 'bg-white'      },
                  { label: 'Selesai',        value: completedCount,                  textColor: 'text-emerald-600', bg: 'bg-white'      },
                  { label: 'Aktif',          value: tasks.length - completedCount,   textColor: 'text-blue-600',    bg: 'bg-white'      },
                  { label: 'Produktivitas',  value: `${productivityScore}%`,         textColor: 'text-white',       bg: 'bg-blue-600'   },
                ].map(({ label, value, textColor, bg }) => (
                  <div key={label} className={`${bg} rounded-2xl p-4 border border-slate-200/60 shadow-xs`}>
                    <p className={`text-2xl font-extrabold font-display ${textColor}`}>{value}</p>
                    <p className={`text-[11px] font-semibold mt-0.5 ${bg === 'bg-blue-600' ? 'text-blue-200' : 'text-slate-400'}`}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Main bento grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

                {/* Task list */}
                <div className="xl:col-span-8 bg-white rounded-3xl border border-slate-200/60 shadow-xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      Semua Tugas
                      <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-extrabold border border-blue-100">{tasks.length}</span>
                    </h3>
                    {editingTask && (
                      <button onClick={() => setEditingTask(null)}
                        className="text-xs font-bold text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                        <X className="h-3.5 w-3.5" /> Batal Edit
                      </button>
                    )}
                  </div>
                  <TaskList tasks={tasks} onToggleComplete={handleToggleComplete} onEdit={handleEditClick} onDelete={handleDeleteClick} isGoogleSignedIn={!!token} />
                </div>

                {/* Right column */}
                <div className="xl:col-span-4 space-y-4">
                  <div id="task-form-container" className="scroll-mt-6">
                    <TaskForm initialTask={editingTask} onSubmit={handleCreateOrUpdateTask} onCancel={editingTask ? () => setEditingTask(null) : undefined} isGoogleSignedIn={!!token} />
                  </div>

                  <CalendarPanel accessToken={token} selectedDate={selectedDate} onImportEvent={handleImportEvent} onTokenExpired={handleTokenExpired} onReconnect={handleReconnectCalendar} reconnecting={reconnecting} />

                  {/* Date picker */}
                  <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-xs space-y-3">
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Pilih Tanggal
                    </p>
                    <input id="calendar-date-select" type="date" value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm cursor-pointer" />
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedDate(todayStr())}
                        className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors cursor-pointer">
                        Hari Ini
                      </button>
                      <button onClick={() => { const t = new Date(); t.setDate(t.getDate()+1); setSelectedDate(t.toISOString().split('T')[0]); }}
                        className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer">
                        Besok
                      </button>
                    </div>
                  </div>

                  {/* Category mini stats */}
                  <div className="bg-slate-900 rounded-3xl p-5 text-white space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Distribusi Kategori</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[{l:'Pekerjaan',e:'💼'},{l:'Pribadi',e:'🏠'},{l:'Belajar',e:'📚'},{l:'Kesehatan',e:'❤️'}].map(({l,e})=>(
                        <div key={l} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-3">
                          <span className="text-base">{e}</span>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{l}</span>
                            <span className="text-sm font-extrabold text-blue-400">{tasks.filter(t=>t.category===l).length}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-3xl border border-blue-100 p-4 flex gap-3">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Gunakan tombol <strong>Impor</strong> pada panel kalender untuk menyalin acara Google Calendar menjadi tugas secara otomatis.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════ TAB: KALENDER ══════════════════ */}
          {activeTab === 'kalender' && (
            <KalenderView
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditClick}
              onAddTask={(date) => {
                setEditingTask(null);
                setSelectedDate(date);
                setActiveTab('dashboard');
                setTimeout(() => {
                  document.getElementById('task-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
            />
          )}

          {/* ══════════════════ TAB: KATEGORI ══════════════════ */}
          {activeTab === 'kategori' && (
            <KategoriView
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onAddTask={() => {
                setEditingTask(null);
                setActiveTab('dashboard');
                setTimeout(() => {
                  document.getElementById('task-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
            />
          )}

          {/* ══════════════════ TAB: STATISTIK ══════════════════ */}
          {activeTab === 'statistik' && (
            <StatistikView tasks={tasks} />
          )}

        </div>
      </main>

      <ConfirmationDialog
        isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message}
        isDestructive={confirmState.isDestructive} confirmLabel="Hapus" cancelLabel="Batal"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
