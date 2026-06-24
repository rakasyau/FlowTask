import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Tag
} from 'lucide-react';
import { Task, TaskCategory } from '../types';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isGoogleSignedIn: boolean;
}

const CATEGORY_COLORS: Record<TaskCategory, { bg: string }> = {
  Pekerjaan: { bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  Pribadi: { bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  Belajar: { bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  Kesehatan: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Lainnya: { bg: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export default function TaskList({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  isGoogleSignedIn,
}: TaskListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Selesai'>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [dateFilter, setDateFilter] = useState<'Semua' | 'Hari Ini' | 'Besok' | 'Minggu Ini'>('Semua');

  // Format date helper (Indonesian format)
  const formatIndonesianDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search term matching
    const title = task.title || '';
    const description = task.description || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = 
      statusFilter === 'Semua' ||
      (statusFilter === 'Aktif' && !task.completed) ||
      (statusFilter === 'Selesai' && task.completed);

    // Category filter
    const matchesCategory = 
      categoryFilter === 'Semua' || 
      task.category === categoryFilter;

    // Date filter
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get range for this week (today to +7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split('T')[0];

    const taskDate = task.date || '';
    let matchesDate = true;
    if (dateFilter === 'Hari Ini') {
      matchesDate = taskDate === todayStr;
    } else if (dateFilter === 'Besok') {
      matchesDate = taskDate === tomorrowStr;
    } else if (dateFilter === 'Minggu Ini') {
      matchesDate = taskDate >= todayStr && taskDate <= next7DaysStr;
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  return (
    <div className="space-y-5">
      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-[32px] border border-slate-200/60 p-5 shadow-xs space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="search-tasks"
            type="text"
            placeholder="Cari tugas harian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50/70 border border-slate-200/60 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
          />
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap gap-2.5 text-xs">
          {/* Status Select */}
          <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200/60 px-3 py-2 rounded-xl text-slate-500">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">Status:</span>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-bold text-blue-600 focus:outline-hidden cursor-pointer"
            >
              <option value="Semua">Semua</option>
              <option value="Aktif">Aktif</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          {/* Date Select */}
          <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200/60 px-3 py-2 rounded-xl text-slate-500">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">Waktu:</span>
            <select
              id="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent font-bold text-blue-600 focus:outline-hidden cursor-pointer"
            >
              <option value="Semua">Semua Waktu</option>
              <option value="Hari Ini">Hari Ini</option>
              <option value="Besok">Besok</option>
              <option value="Minggu Ini">7 Hari Kedepan</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200/60 px-3 py-2 rounded-xl text-slate-500">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">Kategori:</span>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-bold text-blue-600 focus:outline-hidden cursor-pointer"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Pekerjaan">Pekerjaan</option>
              <option value="Pribadi">Pribadi</option>
              <option value="Belajar">Belajar</option>
              <option value="Kesehatan">Kesehatan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Items */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-200/60 py-16 px-6 text-center shadow-xs">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-base font-bold text-slate-700">Tidak Ada Agenda Cocok</h4>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
            {searchTerm || statusFilter !== 'Semua' || categoryFilter !== 'Semua' || dateFilter !== 'Semua'
              ? 'Tidak ada tugas harian yang cocok dengan filter pencarian Anda.'
              : 'Belum ada tugas hari ini. Silakan buat tugas baru untuk memulai hari Anda!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredTasks.map((task) => {
            const catColor = CATEGORY_COLORS[task.category];
            return (
              <div
                key={task.id}
                id={`task-item-${task.id}`}
                className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                  task.completed 
                    ? 'border-slate-100 bg-slate-50/50 opacity-75' 
                    : 'border-slate-200/60 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Status Toggle Button matching Bento mockup */}
                  <button
                    id={`toggle-complete-${task.id}`}
                    type="button"
                    onClick={() => onToggleComplete(task)}
                    className="shrink-0 cursor-pointer focus:outline-hidden"
                  >
                    {task.completed ? (
                      <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center bg-blue-50">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-scale-in"></div>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-blue-600 transition-colors"></div>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Title and Badge row */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`font-bold text-sm tracking-tight text-slate-800 ${task.completed ? 'line-through text-slate-400 font-medium' : ''}`}>
                        {task.title}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${catColor.bg}`}>
                        {task.category}
                      </span>
                      {task.synced && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100 bg-blue-50 text-blue-600">
                          Google Sync
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className={`text-xs text-slate-500 mb-2 leading-relaxed max-w-xl ${task.completed ? 'text-slate-400 line-through' : ''}`}>
                        {task.description}
                      </p>
                    )}

                    {/* Time meta */}
                    <p className={`text-[11px] font-semibold text-slate-400 flex items-center gap-2 ${task.completed ? 'italic text-slate-300' : ''}`}>
                      <span>{formatIndonesianDate(task.date)}</span>
                      <span>•</span>
                      <span>{task.time} ({task.duration}m)</span>
                    </p>
                  </div>
                </div>

                {/* Actions buttons */}
                <div className="flex items-center gap-1.5 ml-4 shrink-0">
                  <button
                    id={`edit-task-${task.id}`}
                    type="button"
                    onClick={() => onEdit(task)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100/50 rounded-xl transition-all cursor-pointer"
                    title="Edit Tugas"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    id={`delete-task-${task.id}`}
                    type="button"
                    onClick={() => onDelete(task)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    title="Hapus Tugas"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
