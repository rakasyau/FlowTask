import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  db 
} from './lib/firebase';
import { 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from './lib/calendarService';
import { Task, CalendarEvent } from './types';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import CalendarPanel from './components/CalendarPanel';
import ConfirmationDialog from './components/ConfirmationDialog';
import { 
  CalendarCheck2, 
  LogOut, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // UI states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Notification states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Auto-set selectedDate to today
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken); // may be null if page was refreshed without cached token
        setLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch tasks in real-time from Firestore when authenticated
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user) {
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const taskList: Task[] = [];
        snapshot.forEach((doc) => {
          taskList.push({ id: doc.id, ...doc.data() } as Task);
        });
        
        // Sort on client side to avoid composite index requirements
        taskList.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
          }
          const timeA = a.time || '';
          const timeB = b.time || '';
          return timeA.localeCompare(timeB);
        });

        setTasks(taskList);
      }, (err) => {
        console.error('Firestore snapshot error:', err);
        showError('Gagal memuat tugas Anda dari database cloud.');
      });
    } else {
      setTasks([]);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Toast Helpers
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // Auth Handlers
  const handleLogin = async () => {
    setActionLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showSuccess(`Selamat datang kembali, ${result.user.displayName || 'Pengguna'}!`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup')) {
        showError('Masuk Google gagal: Popup diblokir. Silakan klik tombol "Buka di Tab Baru" di kanan atas halaman.');
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network')) {
        showError('Masuk gagal: Silakan buka aplikasi di Tab Baru untuk otentikasi Google yang aman.');
      } else {
        showError('Gagal masuk Google Auth. Harap buka aplikasi di Tab Baru jika masalah terus berlanjut.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    try {
      await logout();
      setUser(null);
      setToken(null);
      showSuccess('Berhasil keluar akun.');
    } catch (err) {
      console.error('Logout error:', err);
      showError('Gagal keluar akun.');
    } finally {
      setActionLoading(false);
    }
  };

  // Task Handlers
  const handleCreateOrUpdateTask = async (
    taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>
  ) => {
    if (!user) return;
    setActionLoading(true);

    try {
      if (editingTask && editingTask.id) {
        // --- EDITING EXISTING TASK ---
        const taskDocRef = doc(db, 'tasks', editingTask.id);
        let calendarEventId = editingTask.calendarEventId || null;

        // Sync with Google Calendar if enabled
        if (taskData.synced && token) {
          if (calendarEventId) {
            // Already synced, update calendar event
            await updateCalendarEvent(token, calendarEventId, taskData);
          } else {
            // Not synced before, create new calendar event
            calendarEventId = await createCalendarEvent(token, taskData);
          }
        } else if (!taskData.synced && calendarEventId && token) {
          // Sync disabled, delete existing calendar event
          await deleteCalendarEvent(token, calendarEventId);
          calendarEventId = null;
        }

        await updateDoc(taskDocRef, {
          ...taskData,
          calendarEventId,
        });

        showSuccess('Tugas berhasil diperbarui.');
        setEditingTask(null);
      } else {
        // --- CREATING NEW TASK ---
        let calendarEventId: string | null = null;

        if (taskData.synced && token) {
          calendarEventId = await createCalendarEvent(token, taskData);
        }

        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          userId: user.uid,
          calendarEventId,
          createdAt: Date.now(),
        });

        showSuccess('Tugas baru berhasil ditambahkan.');
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
      const taskDocRef = doc(db, 'tasks', task.id);
      await updateDoc(taskDocRef, {
        completed: !task.completed,
      });
      showSuccess(task.completed ? 'Tugas ditandai aktif kembali.' : 'Tugas selesai dilakukan!');
    } catch (err) {
      console.error('Toggle complete error:', err);
      showError('Gagal memperbarui status tugas.');
    }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    // Scroll smoothly to form
    const formElement = document.getElementById('task-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeleteClick = (task: Task) => {
    if (task.synced && task.calendarEventId && token) {
      // Show confirmation dialog before deleting calendar event (as per safety guidelines)
      setConfirmState({
        isOpen: true,
        title: 'Hapus Tugas & Kalender?',
        message: `Tugas "${task.title}" tersinkronisasi dengan Google Calendar. Apakah Anda yakin ingin menghapusnya? Tindakan ini juga akan menghapus acara tersebut dari Google Calendar Anda.`,
        isDestructive: true,
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          setActionLoading(true);
          try {
            if (task.calendarEventId) {
              await deleteCalendarEvent(token, task.calendarEventId);
            }
            await deleteDoc(doc(db, 'tasks', task.id));
            showSuccess('Tugas dan acara kalender berhasil dihapus.');
            if (editingTask?.id === task.id) setEditingTask(null);
          } catch (err: any) {
            console.error('Delete error:', err);
            showError('Gagal menghapus tugas dari Google Calendar.');
          } finally {
            setActionLoading(false);
          }
        }
      });
    } else {
      // Local-only task delete confirmation (simplified)
      setConfirmState({
        isOpen: true,
        title: 'Hapus Tugas',
        message: `Apakah Anda yakin ingin menghapus tugas "${task.title}"?`,
        isDestructive: true,
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          setActionLoading(true);
          try {
            await deleteDoc(doc(db, 'tasks', task.id));
            showSuccess('Tugas berhasil dihapus.');
            if (editingTask?.id === task.id) setEditingTask(null);
          } catch (err) {
            console.error('Delete error:', err);
            showError('Gagal menghapus tugas.');
          } finally {
            setActionLoading(false);
          }
        }
      });
    }
  };

  // Import event from Google Calendar to creation form
  const handleImportEvent = (event: CalendarEvent) => {
    // Parse times
    let date = selectedDate;
    let time = '09:00';
    let duration = 30;

    if (event.start && event.start.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = (event.end && event.end.dateTime) ? new Date(event.end.dateTime) : null;
      
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      date = `${yyyy}-${mm}-${dd}`;

      const hours = String(start.getHours()).padStart(2, '0');
      const minutes = String(start.getMinutes()).padStart(2, '0');
      time = `${hours}:${minutes}`;

      if (end) {
        const diffMs = end.getTime() - start.getTime();
        duration = Math.round(diffMs / 60000);
      }
    } else if (event.start && event.start.date) {
      date = event.start.date;
      time = '00:00';
      duration = 1440;
    }

    // Set editingTask state to a skeleton with prefilled details
    // We pass a dummy Task skeleton but with no Firestore id, so the form treats it as new task prepopulation!
    const prefilledData: Task = {
      id: '', // Empty means new task creation
      userId: user?.uid || '',
      title: event.summary || '',
      description: event.description || '',
      date,
      time,
      duration,
      category: 'Pekerjaan',
      completed: false,
      synced: true,
      calendarEventId: event.id, // reference existing calendar event if we want to bind
      createdAt: Date.now()
    };

    setEditingTask(prefilledData);
    showSuccess(`Data acara "${event.summary}" diimpor ke formulir tugas!`);
    
    // Scroll smoothly to form container
    const formElement = document.getElementById('task-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle Google Calendar Token Expiration
  const handleTokenExpired = () => {
    setToken(null);
    try {
      sessionStorage.removeItem('google_calendar_access_token');
    } catch (e) {
      console.warn('Failed to clear expired token from sessionStorage:', e);
    }
    showError('Sesi sinkronisasi Google Calendar kedaluwarsa atau tidak valid. Silakan masuk akun kembali.');
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Menyiapkan Pengelola Tugas...</p>
        </div>
      </div>
    );
  }

  // Welcome Screen (Login Screen) if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-4 font-sans selection:bg-indigo-100">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-8 shadow-xl text-center space-y-8 relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-indigo-50/60 text-indigo-600 mb-2">
              <CalendarCheck2 className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
              Pengelola Tugas
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
              Atur agenda harian Anda dan sinkronisasikan secara real-time dengan akun Google Calendar Anda.
            </p>
          </div>

          {/* Benefits Bullet Points */}
          <div className="text-left bg-slate-50 p-5 rounded-2xl space-y-3 border border-slate-100/60">
            <div className="flex gap-2.5 items-start">
              <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                <strong>Sinkronisasi Dua Arah</strong>: Buat tugas di sini dan buat acaranya otomatis di Kalender Google Anda.
              </p>
            </div>
            <div className="flex gap-2.5 items-start">
              <Calendar className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                <strong>Pantau Agenda Google</strong>: Lihat seluruh acara kalender hari ini secara langsung di samping daftar tugas Anda.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Custom Google Sign-In Button complying with brand style */}
            <button
              id="google-signin-btn"
              onClick={handleLogin}
              disabled={actionLoading}
              className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 bg-slate-950 hover:bg-slate-900 active:bg-black text-white font-semibold text-sm rounded-2xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#ffffff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#ffffff"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#ffffff"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#ffffff"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </button>
            
            <p className="text-[10px] text-slate-400">
              Aplikasi ini hanya mengakses Google Calendar Anda berdasarkan izin eksplisit yang diberikan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Indonesian local day and date string
  const todayIndonesian = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-800 font-sans flex selection:bg-blue-100">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 shrink-0 hidden md:flex">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">F</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">FlowTask</h1>
        </div>
        <nav className="space-y-1 flex-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-slate-300"></span> Kalender
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-slate-300"></span> Kategori
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-slate-300"></span> Statistik
          </a>
        </nav>
        
        {/* Dynamic Sync Status Card */}
        <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2 mb-2">
            {token ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Google Sync Active</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sync Inactive</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            {token ? 'Sinkronisasi real-time dengan Google Calendar aktif.' : 'Masuk dengan Google untuk sinkronisasi.'}
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-5 sm:p-8 flex flex-col overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* NOTIFICATION TOASTS */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {successMsg && (
            <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-start gap-3 border border-emerald-500/30 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">{successMsg}</p>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg flex items-start gap-3 border border-red-500/30 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Header Area */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <p className="text-slate-500 font-bold text-xs mb-1 uppercase tracking-wider">
              Halo, {user.displayName || 'Pengguna'}
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              {todayIndonesian}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const formElement = document.getElementById('task-form-container');
                if (formElement) {
                  formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-lg shadow-slate-200 transition-all cursor-pointer"
            >
              + Tugas Baru
            </button>
            
            {/* User Avatar Slot with dynamic Sign Out */}
            <div className="relative group">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-600 text-white font-bold text-sm rounded-full border-2 border-white shadow-md flex items-center justify-center">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
              <button
                onClick={handleLogout}
                title="Keluar"
                className="absolute -bottom-1 -right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-colors cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
          
          {/* Card 1: Agenda Hari Ini (Large list) - col-span-8 */}
          <div className="lg:col-span-8 bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/60 shadow-xs flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <span>Agenda Hari Ini</span>
                <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full border border-blue-100 font-extrabold font-sans">
                  {tasks.length}
                </span>
              </h3>
              {editingTask && (
                <button
                  id="exit-edit-mode"
                  onClick={() => setEditingTask(null)}
                  className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline"
                >
                  Batal Edit / Tambah Baru
                </button>
              )}
            </div>
            
            <TaskList
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              isGoogleSignedIn={!!token}
            />
          </div>

          {/* Right Bento items - col-span-4 */}
          <div className="lg:col-span-4 space-y-5 w-full">
            
            {/* Form container Bento Card */}
            <div id="task-form-container" className="scroll-mt-6">
              <TaskForm
                initialTask={editingTask}
                onSubmit={handleCreateOrUpdateTask}
                onCancel={editingTask ? () => setEditingTask(null) : undefined}
                isGoogleSignedIn={!!token}
              />
            </div>

            {/* Productivity Score card (Bento Stat) */}
            <div className="bg-emerald-500 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-100/50 flex items-center gap-4 transition-all hover:scale-[1.02] duration-300">
              <div className="text-4xl font-extrabold font-display">
                {(() => {
                  const total = tasks.length;
                  if (total === 0) return '0%';
                  const completed = tasks.filter(t => t.completed).length;
                  return `${Math.round((completed / total) * 100)}%`;
                })()}
              </div>
              <div className="text-[11px] font-semibold leading-relaxed opacity-95">
                <span className="font-extrabold text-xs block tracking-widest uppercase text-emerald-100 mb-0.5">Productivity Score</span>
                Skor produktivitas dihitung dari perbandingan tugas yang telah diselesaikan.
              </div>
            </div>

            {/* Google Calendar Widget */}
            <CalendarPanel
              accessToken={token}
              selectedDate={selectedDate}
              onImportEvent={handleImportEvent}
              onTokenExpired={handleTokenExpired}
            />

            {/* Quick Date Picker Selector Bento Card */}
            <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 shadow-xs space-y-4">
              <label htmlFor="calendar-date-select" className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Pilih Tanggal Agenda
              </label>
              <input
                id="calendar-date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-800 font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-sm cursor-pointer"
              />
              <div className="flex gap-2 pt-1">
                <button
                  id="set-date-today"
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setSelectedDate(todayStr);
                  }}
                  className="flex-1 py-2 text-center text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/80 border border-blue-100/60 rounded-xl transition-colors cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  id="set-date-tomorrow"
                  type="button"
                  onClick={() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    setSelectedDate(tom.toISOString().split('T')[0]);
                  }}
                  className="flex-1 py-2 text-center text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Besok
                </button>
              </div>
            </div>

            {/* Category Stats widget (Projects Mini) */}
            <div className="bg-slate-900 rounded-[32px] p-6 text-white flex flex-col gap-4 shadow-xl shadow-slate-900/10">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Kategori Aktif</h4>
                <p className="text-[11px] text-slate-300 font-medium">Distribusi tugas harian berdasarkan kategori</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {['Pekerjaan', 'Pribadi', 'Belajar', 'Kesehatan'].map((cat) => {
                  const count = tasks.filter(t => t.category === cat).length;
                  const emojiMap: Record<string, string> = {
                    Pekerjaan: '💼',
                    Pribadi: '🏠',
                    Belajar: '📚',
                    Kesehatan: '❤️'
                  };
                  return (
                    <div key={cat} className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-3 flex flex-col justify-between h-18">
                      <span className="text-lg">{emojiMap[cat] || '📋'}</span>
                      <div className="flex justify-between items-end mt-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate mr-1">{cat}</span>
                        <span className="text-xs font-extrabold text-blue-400 shrink-0">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tips / Info Box */}
            <div className="bg-blue-50/50 rounded-[32px] border border-blue-100/50 p-5 flex gap-3.5 items-start">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">Petunjuk Integrasi</h4>
                <p className="text-[11px] text-blue-700/80 leading-relaxed font-medium">
                  Gunakan tombol <strong className="text-blue-900 font-bold">Impor</strong> pada agenda Google Calendar di atas untuk menyalin rapat/acara menjadi tugas harian Anda secara otomatis tanpa perlu mengetik ulang!
                </p>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* CONFIRMATION DIALOG MODAL */}
      <ConfirmationDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        isDestructive={confirmState.isDestructive}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
