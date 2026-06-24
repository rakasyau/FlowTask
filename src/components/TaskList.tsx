import React, { useState } from 'react';
import { Search, Calendar, Clock, Edit2, Trash2, CheckCircle2, Tag } from 'lucide-react';
import { Task, TaskCategory } from '../types';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isGoogleSignedIn: boolean;
}

const CATEGORY_STYLES: Record<TaskCategory, { dot: string; badge: string }> = {
  Pekerjaan: { dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  Pribadi:   { dot: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  Belajar:   { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  Kesehatan: { dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Lainnya:   { dot: 'bg-slate-400',  badge: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export default function TaskList({ tasks, onToggleComplete, onEdit, onDelete, isGoogleSignedIn }: TaskListProps) {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Selesai'>('Semua');
  const [catFilter, setCatFilter]     = useState<string>('Semua');
  const [dateFilter, setDateFilter]   = useState<'Semua' | 'Hari Ini' | 'Besok' | 'Minggu Ini'>('Semua');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })();
  const next7Str = (() => { const d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0]; })();

  const filtered = tasks.filter(task => {
    const q = search.toLowerCase();
    const matchSearch = !q || (task.title||'').toLowerCase().includes(q) || (task.description||'').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'Semua' || (statusFilter === 'Aktif' ? !task.completed : task.completed);
    const matchCat = catFilter === 'Semua' || task.category === catFilter;
    const d = task.date || '';
    const matchDate =
      dateFilter === 'Semua' ? true :
      dateFilter === 'Hari Ini' ? d === todayStr :
      dateFilter === 'Besok' ? d === tomorrowStr :
      d >= todayStr && d <= next7Str;
    return matchSearch && matchStatus && matchCat && matchDate;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' });
    } catch { return dateStr; }
  };

  const selectClass = "bg-transparent font-bold text-blue-600 focus:outline-none cursor-pointer text-xs";

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Search & filters */}
      <div className="space-y-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Cari tugas..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Status', value: statusFilter, onChange: (v: string) => setStatusFilter(v as any), opts: ['Semua','Aktif','Selesai'] },
            { label: 'Waktu', value: dateFilter, onChange: (v: string) => setDateFilter(v as any), opts: ['Semua','Hari Ini','Besok','Minggu Ini'] },
            { label: 'Kategori', value: catFilter, onChange: (v: string) => setCatFilter(v), opts: ['Semua','Pekerjaan','Pribadi','Belajar','Kesehatan','Lainnya'] },
          ].map(({ label, value, onChange, opts }) => (
            <div key={label} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}:</span>
              <select value={value} onChange={e => onChange(e.target.value)} className={selectClass}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable list content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-600">Tidak Ada Tugas</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {search || statusFilter !== 'Semua' || catFilter !== 'Semua' || dateFilter !== 'Semua'
                ? 'Tidak ada tugas yang cocok dengan filter. Coba ubah filter pencarian.'
                : 'Belum ada tugas. Buat tugas baru dengan tombol di atas!'}
            </p>
          </div>
        ) : (
          filtered.map(task => {
            const style = CATEGORY_STYLES[task.category] || CATEGORY_STYLES.Lainnya;
            return (
              <div key={task.id}
                className={`group flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  task.completed
                    ? 'bg-slate-50 border-slate-100 opacity-60'
                    : 'bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-sm'
                }`}>

                {/* Toggle */}
                <button onClick={() => onToggleComplete(task)}
                  className="shrink-0 cursor-pointer focus:outline-none"
                  title={task.completed ? 'Tandai Aktif' : 'Tandai Selesai'}>
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-blue-400 transition-colors" />
                  )}
                </button>

                {/* Category dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className={`text-sm font-bold text-slate-800 ${task.completed ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wide ${style.badge}`}>
                      {task.category}
                    </span>
                    {task.synced && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wide bg-blue-50 text-blue-600 border-blue-200">
                        GCal
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className={`text-xs text-slate-500 mb-1 truncate ${task.completed ? 'line-through' : ''}`}>
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" /> {formatDate(task.date)}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {task.time}
                    </span>
                    <span>·</span>
                    <span>{task.duration < 60 ? `${task.duration}m` : `${task.duration/60}j`}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(task)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="Edit">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDelete(task)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Hapus">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
