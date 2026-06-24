import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Circle, Plus } from 'lucide-react';
import { Task, TaskCategory } from '../types';

interface KalenderViewProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onAddTask: (date: string) => void;
}

const CATEGORY_DOT: Record<TaskCategory, string> = {
  Pekerjaan: 'bg-blue-500',
  Pribadi:   'bg-rose-500',
  Belajar:   'bg-violet-500',
  Kesehatan: 'bg-emerald-500',
  Lainnya:   'bg-slate-400',
};

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_ID   = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

export default function KalenderView({ tasks, onToggleComplete, onEdit, onAddTask }: KalenderViewProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  });

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const toDateStr = (d: number) =>
    `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const tasksForDay = (dateStr: string) => tasks.filter(t => t.date === dateStr);

  const selectedTasks = tasksForDay(selectedDay);

  const formatTime = (time: string) => time || '--:--';

  const formatSelectedDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  // Build calendar grid: blanks + days
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 font-display">Kalender</h2>
        <p className="text-sm text-slate-500 mt-0.5">Lihat dan kelola tugas berdasarkan tanggal</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

        {/* ── Calendar grid ── */}
        <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200/60 shadow-xs p-5 sm:p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-base font-extrabold text-slate-900">
              {MONTHS_ID[month]} {year}
            </h3>
            <button onClick={nextMonth}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_ID.map(d => (
              <div key={d} className="text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`blank-${i}`} />;
              const dateStr = toDateStr(day);
              const dayTasks = tasksForDay(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;
              const hasCompleted = dayTasks.some(t => t.completed);
              const hasActive   = dayTasks.some(t => !t.completed);

              return (
                <button key={dateStr}
                  onClick={() => setSelectedDay(dateStr)}
                  className={`relative flex flex-col items-center py-2 px-1 rounded-2xl transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : isToday
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className={`text-xs font-bold leading-none ${isSelected ? 'text-white' : ''}`}>{day}</span>

                  {/* Task dots */}
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[28px]">
                      {dayTasks.slice(0, 3).map((t, idx) => (
                        <span key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : CATEGORY_DOT[t.category]}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-slate-100">
            {Object.entries(CATEGORY_DOT).map(([cat, dot]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-[10px] text-slate-500 font-medium">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Day detail panel ── */}
        <div className="xl:col-span-5 bg-white rounded-3xl border border-slate-200/60 shadow-xs p-5 sm:p-6 space-y-4">
          {/* Day header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Jadwal</p>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5 leading-tight">{formatSelectedDate(selectedDay)}</h3>
            </div>
            <button
              onClick={() => onAddTask(selectedDay)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-200">
              <Plus className="h-3.5 w-3.5" /> Tambah
            </button>
          </div>

          {selectedTasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Clock className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">Tidak ada tugas</p>
              <p className="text-xs text-slate-400 mt-0.5">Klik "+ Tambah" untuk membuat tugas di hari ini</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
              {selectedTasks.map(task => (
                <div key={task.id}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                    task.completed
                      ? 'bg-slate-50 border-slate-100 opacity-60'
                      : 'bg-white border-slate-200/60 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                  onClick={() => onEdit(task)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
                    className="shrink-0 mt-0.5 cursor-pointer focus:outline-none">
                    {task.completed
                      ? <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      : <Circle className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold text-slate-800 ${task.completed ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatTime(task.time)}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${CATEGORY_DOT[task.category].replace('bg-','bg-').replace('-500','-100')} text-slate-600`}>
                        {task.category}
                      </span>
                    </div>
                  </div>
                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${CATEGORY_DOT[task.category]}`} />
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {selectedTasks.length > 0 && (
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <div className="flex-1 text-center">
                <p className="text-lg font-extrabold text-slate-900">{selectedTasks.length}</p>
                <p className="text-[10px] text-slate-400 font-medium">Total</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-lg font-extrabold text-emerald-600">{selectedTasks.filter(t => t.completed).length}</p>
                <p className="text-[10px] text-slate-400 font-medium">Selesai</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-lg font-extrabold text-blue-600">{selectedTasks.filter(t => !t.completed).length}</p>
                <p className="text-[10px] text-slate-400 font-medium">Aktif</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
