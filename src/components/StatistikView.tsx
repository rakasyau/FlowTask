import React, { useMemo } from 'react';
import { TrendingUp, CheckCircle2, Clock, Target, Award, Flame } from 'lucide-react';
import { Task, TaskCategory } from '../types';

interface StatistikViewProps {
  tasks: Task[];
}

const CATEGORIES: { key: TaskCategory; emoji: string; color: string; bg: string; text: string }[] = [
  { key: 'Pekerjaan', emoji: '💼', color: 'bg-blue-500 dark:bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30',    text: 'text-blue-700 dark:text-blue-400'   },
  { key: 'Pribadi',   emoji: '🏠', color: 'bg-rose-500 dark:bg-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',    text: 'text-rose-700 dark:text-rose-400'   },
  { key: 'Belajar',   emoji: '📚', color: 'bg-violet-500 dark:bg-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/30',  text: 'text-violet-700 dark:text-violet-400' },
  { key: 'Kesehatan', emoji: '❤️', color: 'bg-emerald-500 dark:bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400'},
  { key: 'Lainnya',   emoji: '📋', color: 'bg-slate-400 dark:bg-slate-500',   bg: 'bg-slate-50 dark:bg-slate-800/50',   text: 'text-slate-600 dark:text-slate-400'  },
];

function formatDateLabel(dateStr: string) {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

export default function StatistikView({ tasks }: StatistikViewProps) {
  const stats = useMemo(() => {
    const total     = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active    = total - completed;
    const synced    = tasks.filter(t => t.synced).length;
    const score     = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Total duration completed tasks (minutes)
    const totalMinutes = tasks.filter(t => t.completed).reduce((s, t) => s + (t.duration || 0), 0);
    const totalHours   = Math.round(totalMinutes / 60 * 10) / 10;

    // Tasks per category
    const perCategory = CATEGORIES.map(c => ({
      ...c,
      total:     tasks.filter(t => t.category === c.key).length,
      completed: tasks.filter(t => t.category === c.key && t.completed).length,
    }));

    // Tasks per day (last 14 days)
    const today = new Date();
    const days14: { date: string; label: string; total: number; completed: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      days14.push({
        date: dateStr,
        label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        total:     tasks.filter(t => t.date === dateStr).length,
        completed: tasks.filter(t => t.date === dateStr && t.completed).length,
      });
    }

    // Current streak (consecutive days with at least 1 completed task, ending today/yesterday)
    let streak = 0;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const hasCompletedSet = new Set(tasks.filter(t => t.completed).map(t => t.date));
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (hasCompletedSet.has(ds)) streak++;
      else break;
    }

    // Most productive category
    const topCat = [...perCategory].sort((a, b) => b.completed - a.completed)[0];

    // Average tasks per day (only days that have tasks)
    const daysWithTasks = Object.keys(
      tasks.reduce((acc, t) => { acc[t.date] = true; return acc; }, {} as Record<string,boolean>)
    ).length;
    const avgPerDay = daysWithTasks > 0 ? Math.round((total / daysWithTasks) * 10) / 10 : 0;

    return { total, completed, active, synced, score, totalHours, perCategory, days14, streak, topCat, avgPerDay, daysWithTasks };
  }, [tasks]);

  const maxDay = Math.max(...stats.days14.map(d => d.total), 1);

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display">Statistik</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Pantau produktivitas dan perkembangan Anda</p>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Target,      label: 'Produktivitas',    value: `${stats.score}%`,        sub: `${stats.completed} dari ${stats.total} tugas`, color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/40'    },
          { icon: CheckCircle2,label: 'Total Selesai',    value: stats.completed,           sub: `${stats.active} masih aktif`,                  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { icon: Clock,       label: 'Jam Produktif',   value: `${stats.totalHours}j`,    sub: 'dari tugas yang selesai',                      color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-950/40'  },
          { icon: Flame,       label: 'Streak Harian',   value: `${stats.streak} hari`,    sub: streak_label(stats.streak),                     color: 'text-orange-500 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-950/40'  },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs p-4">
            <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className={`text-2xl font-extrabold font-display ${color}`}>{value}</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-555 mt-0.5 leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* ── Activity chart (14 days) ── */}
        <div className="xl:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Aktivitas 14 Hari Terakhir</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Jumlah tugas per hari</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Total</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Selesai</span>
            </div>
          </div>

          {stats.total === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp className="h-8 w-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Belum ada data aktivitas</p>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-36">
              {stats.days14.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex flex-col items-center justify-end h-28">
                    {/* Total bar */}
                    <div
                      className="w-full bg-blue-100 dark:bg-blue-950/40 rounded-t-lg transition-all duration-500 relative overflow-hidden"
                      style={{ height: `${(day.total / maxDay) * 100}%`, minHeight: day.total > 0 ? '4px' : '0' }}
                    >
                      {/* Completed overlay */}
                      {day.completed > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-emerald-400 dark:bg-emerald-500 rounded-t-lg transition-all"
                          style={{ height: `${(day.completed / day.total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-16 bg-slate-900 dark:bg-slate-800 text-white text-[9px] px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap z-10">
                    {day.label}: {day.total} tugas, {day.completed} selesai
                  </div>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-medium text-center leading-tight">
                    {day.label.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* X-axis labels */}
          <div className="flex justify-between mt-1 px-0.5">
            <span className="text-[9px] text-slate-350 dark:text-slate-600">{stats.days14[0]?.label}</span>
            <span className="text-[9px] text-slate-350 dark:text-slate-600">{stats.days14[13]?.label}</span>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="xl:col-span-4 space-y-4">

          {/* Productivity score ring */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white text-center space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">Skor Produktivitas</p>
            <div className="relative w-24 h-24 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.score / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-extrabold font-display">{stats.score}%</span>
              </div>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed">
              {stats.score >= 80 ? '🏆 Luar biasa!' : stats.score >= 50 ? '👍 Terus semangat!' : '💪 Ayo tingkatkan!'}
            </p>
          </div>

          {/* Quick stats */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs p-4 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ringkasan</h4>
            {[
              { label: 'Hari aktif',         value: stats.daysWithTasks },
              { label: 'Rata-rata per hari',  value: `${stats.avgPerDay} tugas` },
              { label: 'Tersinkron GCal',     value: stats.synced },
              { label: 'Total tugas',         value: stats.total },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-slate-505 dark:text-slate-400">{label}</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category breakdown ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Distribusi per Kategori</h3>
        <div className="space-y-3">
          {stats.perCategory.map(({ key, emoji, color, bg, text, total, completed }) => {
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center shrink-0 text-base`}>{emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${text}`}>{key}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-555 font-medium">{completed}/{total} selesai</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 w-10 text-right shrink-0">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top performer ── */}
      {stats.total > 0 && stats.topCat.completed > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/15 dark:to-orange-950/10 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">
            {stats.topCat.emoji}
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-550 uppercase tracking-widest flex items-center gap-1">
              <Award className="h-3 w-3" /> Kategori Terproduktif
            </p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.topCat.key}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{stats.topCat.completed} tugas selesai dari {stats.topCat.total}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function streak_label(n: number): string {
  if (n === 0) return 'Mulai hari ini!';
  if (n === 1) return 'Hari pertama 🔥';
  if (n < 7)  return `${n} hari berturut-turut`;
  if (n < 30) return `${n} hari — hebat! 🏆`;
  return `${n} hari — luar biasa! 🌟`;
}
