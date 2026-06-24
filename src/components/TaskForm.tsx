import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Tag, AlignLeft, Check, CalendarCheck } from 'lucide-react';
import { Task, TaskCategory } from '../types';

interface TaskFormProps {
  initialTask?: Task | null;
  onSubmit: (taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>) => void;
  onCancel?: () => void;
  isGoogleSignedIn: boolean;
}

const CATEGORIES: TaskCategory[] = ['Pekerjaan', 'Pribadi', 'Belajar', 'Kesehatan', 'Lainnya'];

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Pekerjaan: 'bg-blue-50 text-blue-700 border-blue-200',
  Pribadi:   'bg-rose-50 text-rose-700 border-rose-200',
  Belajar:   'bg-violet-50 text-violet-700 border-violet-200',
  Kesehatan: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Lainnya:   'bg-slate-50 text-slate-700 border-slate-200',
};

export default function TaskForm({ initialTask, onSubmit, onCancel, isGoogleSignedIn }: TaskFormProps) {
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate]             = useState('');
  const [time, setTime]             = useState('');
  const [duration, setDuration]     = useState(60);
  const [category, setCategory]     = useState<TaskCategory>('Pekerjaan');
  const [synced, setSynced]         = useState(false);
  const [completed, setCompleted]   = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setDate(initialTask.date);
      setTime(initialTask.time);
      setDuration(initialTask.duration);
      setCategory(initialTask.category);
      setSynced(initialTask.synced);
      setCompleted(initialTask.completed);
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      let h = now.getHours(), m = Math.ceil(now.getMinutes() / 5) * 5;
      if (m >= 60) { m = 0; h = (h + 1) % 24; }
      setTime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      setTitle(''); setDescription(''); setDuration(60);
      setCategory('Pekerjaan'); setSynced(isGoogleSignedIn); setCompleted(false);
    }
  }, [initialTask, isGoogleSignedIn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), date, time, duration, category, synced: isGoogleSignedIn ? synced : false, completed });
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all text-sm font-medium [&>option]:bg-white [&>option]:text-slate-800 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-200";
  const labelClass = "block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs space-y-5 text-slate-800 dark:text-slate-200">
      {/* Form header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${initialTask?.id ? 'bg-amber-400 animate-pulse' : 'bg-blue-500'}`} />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{initialTask?.id ? 'Edit Tugas' : 'Tugas Baru'}</h3>
        </div>
        {initialTask?.id && (
          <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Mode Edit</span>
        )}
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="task-title" className={labelClass}>Judul Tugas</label>
          <input id="task-title" type="text" required maxLength={200} placeholder="Apa yang ingin Anda kerjakan?"
            value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="task-date" className={`${labelClass} flex items-center gap-1`}>
              <Calendar className="h-3 w-3" /> Tanggal
            </label>
            <input id="task-date" type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="task-time" className={`${labelClass} flex items-center gap-1`}>
              <Clock className="h-3 w-3" /> Waktu
            </label>
            <input id="task-time" type="time" required value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Duration & Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="task-duration" className={labelClass}>Durasi</label>
            <select id="task-duration" value={duration} onChange={e => setDuration(Number(e.target.value))} className={`${inputClass} cursor-pointer`}>
              {[15,30,45,60,90,120,180].map(v => (
                <option key={v} value={v}>{v < 60 ? `${v} menit` : v === 60 ? '1 jam' : `${v/60} jam`}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-category" className={`${labelClass} flex items-center gap-1`}>
              <Tag className="h-3 w-3" /> Kategori
            </label>
            <select id="task-category" value={category} onChange={e => setCategory(e.target.value as TaskCategory)} className={`${inputClass} cursor-pointer`}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="task-description" className={`${labelClass} flex items-center gap-1`}>
            <AlignLeft className="h-3 w-3" /> Catatan
          </label>
          <textarea id="task-description" rows={2} maxLength={1000} placeholder="Tambahkan detail atau catatan..."
            value={description} onChange={e => setDescription(e.target.value)}
            className={`${inputClass} resize-none`} />
        </div>

        {/* Toggles */}
        <div className="bg-slate-50/70 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800/60 p-4 space-y-3">
          {/* Sync toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5 text-blue-500" /> Sinkron ke Google Calendar
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isGoogleSignedIn ? 'Buat acara otomatis di Google Calendar' : 'Login Google untuk mengaktifkan'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" disabled={!isGoogleSignedIn} checked={synced} onChange={e => setSynced(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-disabled:opacity-40 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 after:border after:border-slate-300 dark:after:border-slate-700" />
            </label>
          </div>

          {/* Completed toggle — only in edit mode */}
          {initialTask?.id && (
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Tandai Selesai
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Centang jika tugas sudah diselesaikan</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-400 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 after:border after:border-slate-300 dark:after:border-slate-700" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Category preview badge */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider ${CATEGORY_COLORS[category]}`}>
          {category}
        </span>
        {synced && isGoogleSignedIn && (
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30">
            Akan Disinkronkan
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer">
            Batal
          </button>
        )}
        <button type="submit"
          className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all cursor-pointer">
          {initialTask?.id ? 'Simpan Perubahan' : 'Tambah Tugas'}
        </button>
      </div>
    </form>
  );
}
