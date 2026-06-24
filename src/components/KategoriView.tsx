import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, Edit2, Plus } from 'lucide-react';
import { Task, TaskCategory } from '../types';

interface KategoriViewProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddTask: () => void;
}

const CATEGORIES: { key: TaskCategory; emoji: string; color: string; bg: string; border: string; text: string; ring: string }[] = [
  { key: 'Pekerjaan', emoji: '💼', color: 'bg-blue-500',    bg: 'bg-blue-50',    border: 'border-blue-200', text: 'text-blue-700',   ring: 'ring-blue-200'   },
  { key: 'Pribadi',   emoji: '🏠', color: 'bg-rose-500',    bg: 'bg-rose-50',    border: 'border-rose-200', text: 'text-rose-700',   ring: 'ring-rose-200'   },
  { key: 'Belajar',   emoji: '📚', color: 'bg-violet-500',  bg: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700', ring: 'ring-violet-200' },
  { key: 'Kesehatan', emoji: '❤️', color: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  { key: 'Lainnya',   emoji: '📋', color: 'bg-slate-400',   bg: 'bg-slate-50',   border: 'border-slate-200', text: 'text-slate-600',  ring: 'ring-slate-200'  },
];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

export default function KategoriView({ tasks, onToggleComplete, onEdit, onDelete, onAddTask }: KategoriViewProps) {
  const [openCat, setOpenCat] = useState<TaskCategory | null>('Pekerjaan');

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display">Kategori</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Kelola tugas berdasarkan kategori</p>
        </div>
        <button onClick={onAddTask}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all cursor-pointer">
          <Plus className="h-4 w-4" /> Tugas Baru
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map(({ key, emoji, color, bg, border, text, ring }) => {
          const catTasks = tasks.filter(t => t.category === key);
          const done = catTasks.filter(t => t.completed).length;
          const pct  = catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0;
          const isSelected = openCat === key;

          return (
            <button key={key}
              onClick={() => setOpenCat(isSelected ? null : key)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? `${bg} dark:bg-blue-950/20 ${border} dark:border-blue-900/60 ring-2 ring-offset-1 dark:ring-offset-slate-950 ${text} dark:text-blue-400`
                  : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <p className="text-sm font-extrabold mt-2 leading-tight">{key}</p>
              <p className="text-xs text-slate-400 dark:text-slate-555 font-medium mt-0.5">{catTasks.length} tugas</p>
              {/* Progress bar */}
              <div className="mt-2.5 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
              </div>
              <p className={`text-[10px] font-bold mt-1 ${pct === 100 && catTasks.length > 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                {pct}% selesai
              </p>
            </button>
          );
        })}
      </div>

      {/* Task list per category */}
      {openCat && (() => {
        const cat = CATEGORIES.find(c => c.key === openCat)!;
        const catTasks = tasks.filter(t => t.category === openCat);
        const activeTasks = catTasks.filter(t => !t.completed);
        const doneTasks   = catTasks.filter(t => t.completed);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs p-5 sm:p-6 space-y-5">
            {/* Category header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <div className={`w-10 h-10 ${cat.bg} dark:bg-slate-800 ${cat.border} dark:border-slate-700 border rounded-2xl flex items-center justify-center text-xl`}>
                {cat.emoji}
              </div>
              <div>
                <h3 className={`text-base font-extrabold ${cat.text} dark:text-blue-400`}>{openCat}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">{catTasks.length} tugas · {doneTasks.length} selesai</p>
              </div>
              <div className="ml-auto flex gap-2 text-center">
                <div>
                  <p className={`text-xl font-extrabold ${cat.text} dark:text-blue-400`}>{activeTasks.length}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Aktif</p>
                </div>
                <div className="w-px bg-slate-100 dark:bg-slate-800" />
                <div>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{doneTasks.length}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Selesai</p>
                </div>
              </div>
            </div>

            {catTasks.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-4xl">{cat.emoji}</span>
                <p className="text-sm font-bold text-slate-500 mt-3">Belum ada tugas di kategori ini</p>
                <button onClick={onAddTask}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Tambah Tugas
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Active tasks */}
                {activeTasks.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-555 uppercase tracking-widest mb-2.5">Belum Selesai ({activeTasks.length})</p>
                    <div className="space-y-2">
                      {activeTasks.map(task => (
                        <div key={task.id}
                          className="flex items-center gap-3 p-3.5 bg-slate-55/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
                          <button onClick={() => onToggleComplete(task)} className="shrink-0 cursor-pointer focus:outline-none">
                            <Circle className="h-4 w-4 text-slate-300 dark:text-slate-650 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {formatDate(task.date)} · {task.time}
                              </span>
                              {task.synced && <span className="text-[9px] font-bold text-blue-550 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30">GCal</span>}
                            </div>
                          </div>
                          <button onClick={() => onEdit(task)}
                            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 rounded-lg transition-all cursor-pointer shrink-0">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Done tasks */}
                {doneTasks.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-555 uppercase tracking-widest mb-2.5">Selesai ({doneTasks.length})</p>
                    <div className="space-y-2">
                      {doneTasks.map(task => (
                        <div key={task.id}
                          className="flex items-center gap-3 p-3.5 bg-slate-50/50 dark:bg-slate-950/10 border border-slate-100/60 dark:border-slate-800/40 rounded-2xl opacity-60 group">
                          <button onClick={() => onToggleComplete(task)} className="shrink-0 cursor-pointer focus:outline-none">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-through truncate">{task.title}</p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(task.date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
