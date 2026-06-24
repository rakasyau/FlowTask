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

const CATEGORY_COLORS: Record<TaskCategory, { bg: string; text: string; border: string }> = {
  Pekerjaan: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Pribadi: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Belajar: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  Kesehatan: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Lainnya: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export default function TaskForm({
  initialTask,
  onSubmit,
  onCancel,
  isGoogleSignedIn,
}: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [category, setCategory] = useState<TaskCategory>('Pekerjaan');
  const [synced, setSynced] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Initialize values when initialTask changes or on mount
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
      // Set defaults for a new task
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);

      let h = today.getHours();
      let m = Math.ceil(today.getMinutes() / 5) * 5;
      if (m >= 60) {
        m = 0;
        h = (h + 1) % 24;
      }
      const hours = String(h).padStart(2, '0');
      const minutes = String(m).padStart(2, '0');
      setTime(`${hours}:${minutes}`);

      setTitle('');
      setDescription('');
      setDuration(30);
      setCategory('Pekerjaan');
      setSynced(isGoogleSignedIn); // default to sync if already signed in
      setCompleted(false);
    }
  }, [initialTask, isGoogleSignedIn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title,
      description,
      date,
      time,
      duration,
      category,
      synced: isGoogleSignedIn ? synced : false,
      completed,
    });
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 shadow-xs space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          {initialTask ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              Edit Tugas
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Tugas Baru
            </>
          )}
        </h3>
        {initialTask && (
          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Mode Edit
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="task-title" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Judul Tugas
          </label>
          <input
            id="task-title"
            type="text"
            required
            placeholder="Contoh: Review Prototype Design System..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
          />
        </div>

        {/* Date and Time (Row) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="task-date" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Tanggal
            </label>
            <input
              id="task-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          <div>
            <label htmlFor="task-time" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Waktu Mulai
            </label>
            <input
              id="task-time"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Duration and Category (Row) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="task-duration" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Durasi
            </label>
            <select
              id="task-duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-sm cursor-pointer font-medium"
            >
              <option value={15}>15 Menit</option>
              <option value={30}>30 Menit</option>
              <option value={45}>45 Menit</option>
              <option value={60}>1 Jam</option>
              <option value={90}>1.5 Jam</option>
              <option value={120}>2 Jam</option>
              <option value={180}>3 Jam</option>
            </select>
          </div>
          <div>
            <label htmlFor="task-category" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              Kategori
            </label>
            <select
              id="task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-sm cursor-pointer font-medium"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="task-description" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlignLeft className="h-3.5 w-3.5 text-slate-400" />
            Catatan / Deskripsi
          </label>
          <textarea
            id="task-description"
            rows={2}
            placeholder="Tambahkan detail atau catatan tugas di sini..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-sm resize-none font-medium"
          />
        </div>

        {/* Sync to Google Calendar & Completion Status */}
        <div className="flex flex-col gap-3.5 py-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex flex-col pr-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
                Sinkronisasi Kalender
              </span>
              <span className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                {isGoogleSignedIn 
                  ? 'Otomatis buat acara di Google Calendar' 
                  : 'Masuk dengan Google untuk sinkronisasi'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                disabled={!isGoogleSignedIn}
                checked={synced}
                onChange={(e) => setSynced(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
            </label>
          </div>

          {initialTask && (
            <div className="flex items-center justify-between border-t border-slate-200/40 pt-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Status Selesai
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Tandai jika sudah selesai</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Submit/Cancel Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-full transition-colors cursor-pointer"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-full shadow-lg shadow-slate-100 transition-all flex items-center gap-2 cursor-pointer"
        >
          {initialTask ? 'Simpan Perubahan' : 'Tambah Tugas'}
        </button>
      </div>
    </form>
  );
}
