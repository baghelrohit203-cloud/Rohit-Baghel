
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ActivityEntry, ActivityType, ActivityStatus, AppState, ReportInterval } from './types';
import { ACTIVITY_TYPES, ACTIVITY_COLORS } from './constants';
import ActivityItem from './components/ActivityItem';
import ActivityModal from './components/ActivityModal';
import { getProductivityAnalysis } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const App: React.FC = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [currentView, setCurrentView] = useState<AppState['currentView']>('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportInterval, setReportInterval] = useState<ReportInterval>('Daily');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [coachResponse, setCoachResponse] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAlarmTask, setActiveAlarmTask] = useState<ActivityEntry | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('karma_chakra_v6_tracking');
    if (saved) setActivities(JSON.parse(saved));
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('karma_chakra_v6_tracking', JSON.stringify(activities));
  }, [activities]);

  // Alarm checking logic
  useEffect(() => {
    const todayStr = currentTime.toISOString().split('T')[0];
    const currentHM = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Check for any task scheduled for NOW that hasn't been started/completed and has alarm enabled
    const trigger = activities.find(a => 
      a.date === todayStr && 
      a.startTime === currentHM && 
      a.alarmEnabled && 
      a.status === 'Pending' &&
      !a.timer?.isActive
    );

    if (trigger && activeAlarmTask?.id !== trigger.id) {
      setActiveAlarmTask(trigger);
      playAlarmTone();
    }
  }, [currentTime, activities]);

  const playAlarmTone = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      };

      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = window.setInterval(playBeep, 1000);
      playBeep();
    } catch (e) {
      console.warn("Audio Context failed to start (interaction required).");
    }
  };

  const stopAlarmTone = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  const dismissAlarm = () => {
    stopAlarmTone();
    setActiveAlarmTask(null);
  };

  const startTaskFromAlarm = () => {
    if (activeAlarmTask) {
      handleUpdateTimer(activeAlarmTask.id, activeAlarmTask.timer?.totalElapsed || 0, true);
      dismissAlarm();
    }
  };

  const stats = useMemo(() => {
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const totalMins = 24 * 60;
    const remainingMins = totalMins - currentMins;
    const format = (m: number) => `${Math.floor(m/60).toString().padStart(2, '0')}:${(m%60).toString().padStart(2, '0')}`;
    return {
      total: '24:00',
      current: format(currentMins),
      remaining: format(remainingMins),
      percentPassed: (currentMins / totalMins) * 100
    };
  }, [currentTime]);

  const activeTask = useMemo(() => activities.find(a => a.timer?.isActive), [activities]);

  const handleAddOrEditActivity = (
    type: ActivityType, 
    description: string, 
    duration: number, 
    overtime: number, 
    repeatMode: 'none' | 'weekdays' | 'weekends',
    startTime?: string,
    alarmEnabled?: boolean
  ) => {
    const datesToSync: string[] = [selectedDate];
    if (repeatMode !== 'none') {
      const baseDate = new Date(selectedDate);
      const dayOfWeek = baseDate.getDay();
      const diff = baseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(baseDate.setDate(diff));
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr === selectedDate) continue;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        if ((repeatMode === 'weekdays' && !isWeekend) || (repeatMode === 'weekends' && isWeekend)) datesToSync.push(dateStr);
      }
    }

    if (editingActivity) {
      setActivities(prev => {
        const updated = prev.map(a => {
          if (a.id === editingActivity.id) {
            return { ...a, type, description, estimatedDuration: duration, overtime, startTime, alarmEnabled };
          }
          if (repeatMode !== 'none' && datesToSync.includes(a.date) && a.description === editingActivity.description && a.type === editingActivity.type) {
            return { ...a, type, description, estimatedDuration: duration, overtime, startTime, alarmEnabled };
          }
          return a;
        });
        return updated;
      });
      setEditingActivity(null);
    } else {
      const newEntries: ActivityEntry[] = datesToSync.map(date => ({
        id: Math.random().toString(36).substr(2, 9),
        date, type, description, timestamp: Date.now(),
        estimatedDuration: duration, overtime: overtime, status: 'Pending',
        timer: { isActive: false, lastStartTime: null, totalElapsed: 0 },
        startTime, alarmEnabled
      }));
      setActivities(prev => [...prev, ...newEntries]);
    }
    setIsModalOpen(false);
  };

  const updateActivityStatus = (id: string, status: ActivityStatus) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleMoveToDate = (id: string, newDate: string) => {
    setActivities(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          date: newDate, 
          status: 'Rescheduled', 
          movedFromDate: a.date, 
          movedAt: Date.now() 
        };
      }
      return a;
    }));
  };

  const handleUpdateTimer = (id: string, elapsed: number, isActive: boolean) => {
    setActivities(prev => prev.map(a => {
      if (isActive && a.id !== id && a.timer?.isActive) {
        const othersElapsed = (a.timer.totalElapsed || 0) + (Date.now() - (a.timer.lastStartTime || 0));
        return { ...a, timer: { isActive: false, totalElapsed: othersElapsed, lastStartTime: null }};
      }
      if (a.id === id) {
        return {
          ...a, timer: { 
            isActive, 
            totalElapsed: elapsed, 
            lastStartTime: isActive ? Date.now() : null 
          }
        };
      }
      return a;
    }));
  };

  const dashboardActivities = useMemo(() => activities.filter(a => a.date === selectedDate), [activities, selectedDate]);
  const completionRate = useMemo(() => {
    if (dashboardActivities.length === 0) return 0;
    const completed = dashboardActivities.filter(a => a.status === 'Completed').length;
    return Math.round((completed / dashboardActivities.length) * 100);
  }, [dashboardActivities]);

  const backlogStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const pending = activities.filter(a => a.status === 'Pending' && a.date === todayStr);
    const backlog = activities.filter(a => a.status === 'Pending' && a.date < todayStr);
    const moved = activities.filter(a => a.status === 'Rescheduled');
    const sumMins = [...pending, ...backlog].reduce((acc, curr) => acc + curr.estimatedDuration, 0);
    return { pending, backlog, moved, totalHrsNeeded: (sumMins / 60).toFixed(1) };
  }, [activities]);

  const reportData = useMemo(() => {
    const now = new Date(selectedDate);
    const intervalActivities = activities.filter(a => {
      const actDate = new Date(a.date);
      if (reportInterval === 'Daily') return a.date === selectedDate;
      if (reportInterval === 'Weekly') return (now.getTime() - actDate.getTime()) / 86400000 < 7;
      if (reportInterval === 'Monthly') return actDate.getMonth() === now.getMonth() && actDate.getFullYear() === now.getFullYear();
      if (reportInterval === 'Yearly') return actDate.getFullYear() === now.getFullYear();
      return false;
    });
    const summary = intervalActivities.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + (curr.estimatedDuration + curr.overtime);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).map(([name, value]) => ({ name, value }));
  }, [activities, selectedDate, reportInterval]);

  const getCoachAdvice = async () => {
    setIsAnalyzing(true);
    setCoachResponse(await getProductivityAnalysis(dashboardActivities));
    setIsAnalyzing(false);
  };

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto pb-32 selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* Alarm Full-Screen Overlay */}
      {activeAlarmTask && (
        <div className="fixed inset-0 z-[200] bg-blue-600 flex flex-col items-center justify-center p-8 text-white animate-in fade-in duration-500">
           <div className="absolute top-1/4 animate-bounce">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
           </div>
           <div className="text-center space-y-4 mt-20">
              <span className="text-sm font-black uppercase tracking-[0.5em] opacity-70">Karma Alert</span>
              <h2 className="text-4xl font-black tracking-tighter leading-none">{activeAlarmTask.description}</h2>
              <div className="flex items-center justify-center gap-3 py-4">
                 <div className="px-4 py-2 bg-white/10 rounded-full border border-white/20 text-xl font-black mono">{activeAlarmTask.startTime}</div>
              </div>
           </div>
           <div className="flex flex-col w-full gap-4 mt-12 max-w-[280px]">
              <button 
                onClick={startTaskFromAlarm}
                className="w-full py-6 bg-white text-blue-600 font-black rounded-3xl text-lg shadow-2xl active:scale-95 transition-all"
              >
                START NOW
              </button>
              <button 
                onClick={dismissAlarm}
                className="w-full py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all text-sm uppercase tracking-widest"
              >
                Dismiss Alarm
              </button>
           </div>
        </div>
      )}

      {/* Running Activity Notification Sticky (Top) */}
      {activeTask && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 px-4 py-2 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase text-blue-100 leading-none mb-0.5">Running Activity</span>
                 <span className="text-xs font-bold text-white truncate max-w-[200px]">{activeTask.description}</span>
              </div>
           </div>
           <div className="bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <span className="text-sm font-black mono text-white">
                {formatMs((activeTask.timer?.totalElapsed || 0) + (Date.now() - (activeTask.timer?.lastStartTime || 0)))}
              </span>
           </div>
        </div>
      )}

      <header className="p-6 pt-14 sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white leading-none">KARMA CHAKRA</h1>
            <p className="text-[10px] text-blue-500 font-black tracking-[0.2em] uppercase mt-2">Dharma Real-Time</p>
          </div>
          <div className="text-right flex flex-col items-end">
             <div className="flex items-center gap-4 text-xs mono text-gray-500 font-bold uppercase tracking-widest">
                <div>Now: <span className="text-white">{stats.current}</span></div>
                <div>Left: <span className="text-orange-400">{stats.remaining}</span></div>
             </div>
          </div>
        </div>
        <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
           <div className="absolute top-0 left-0 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" style={{ width: `${stats.percentPassed}%` }} />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {currentView === 'dashboard' && (
          <>
            <div className="glass p-4 rounded-3xl flex items-center justify-between border-white/10 group transition-all hover:border-blue-500/30">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/5 rounded-xl text-blue-500 border border-white/10"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-lg font-black uppercase text-white outline-none cursor-pointer tracking-tighter" />
              </div>
              <button onClick={() => { setEditingActivity(null); setIsModalOpen(true); }} className="p-3 bg-white text-black rounded-2xl shadow-xl active:scale-95"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            </div>

            <div className="p-1">
               <div className="flex justify-between items-end mb-2">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Daily Completion Path</h2>
                  <span className="text-xl font-black text-white italic">{completionRate}%</span>
               </div>
               <div className="h-4 w-full bg-white/5 rounded-full p-1 border border-white/5 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]" style={{ width: `${completionRate}%` }} />
               </div>
            </div>

            <div className="space-y-4">
              {dashboardActivities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} onUpdateStatus={updateActivityStatus} onMoveDate={handleMoveToDate} onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }} onUpdateTimer={handleUpdateTimer} />
              ))}
              {dashboardActivities.length === 0 && <div className="py-20 text-center glass rounded-3xl border-dashed border-white/5 opacity-50 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">No records for this date</div>}
            </div>
          </>
        )}

        {currentView === 'backlog' && (
          <div className="space-y-6">
            <div className="glass p-6 rounded-3xl border border-blue-500/20">
               <h2 className="text-2xl font-black text-white mb-2 italic">CYCLE OVERDUE</h2>
               <div className="flex items-center justify-between p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Total Intensity Needed</span>
                  <span className="text-2xl font-black text-white">{backlogStats.totalHrsNeeded} <span className="text-xs text-gray-500 italic">Hrs</span></span>
               </div>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-3 px-2">Backlog ({backlogStats.backlog.length})</h3>
                <div className="space-y-2">
                  {backlogStats.backlog.map(a => <ActivityItem key={a.id} activity={a} onUpdateStatus={updateActivityStatus} onMoveDate={handleMoveToDate} onEdit={(act) => { setEditingActivity(act); setIsModalOpen(true); }} onUpdateTimer={handleUpdateTimer} />)}
                </div>
              </section>
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-3 px-2">Pending Today ({backlogStats.pending.length})</h3>
                <div className="space-y-2">
                  {backlogStats.pending.map(a => <ActivityItem key={a.id} activity={a} onUpdateStatus={updateActivityStatus} onMoveDate={handleMoveToDate} onEdit={(act) => { setEditingActivity(act); setIsModalOpen(true); }} onUpdateTimer={handleUpdateTimer} />)}
                </div>
              </section>
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-3 px-2">Moved ({backlogStats.moved.length})</h3>
                <div className="space-y-2">
                  {backlogStats.moved.map(a => <ActivityItem key={a.id} activity={a} onUpdateStatus={updateActivityStatus} onMoveDate={handleMoveToDate} onEdit={(act) => { setEditingActivity(act); setIsModalOpen(true); }} onUpdateTimer={handleUpdateTimer} />)}
                </div>
              </section>
            </div>
          </div>
        )}

        {currentView === 'stats' && (
          <div className="glass p-6 rounded-3xl border border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 italic">Chakra Reports</h2>
              <select value={reportInterval} onChange={(e) => setReportInterval(e.target.value as ReportInterval)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white outline-none cursor-pointer">
                <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option><option value="Yearly">Yearly</option>
              </select>
            </div>
            {reportData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                      {reportData.map((e, i) => <Cell key={`c-${i}`} fill={ACTIVITY_COLORS[e.name as ActivityType]} stroke="none" />)}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '16px' }} 
                      itemStyle={{ color: '#fff', fontSize: '12px' }} 
                      formatter={(v: any) => [`${v} mins`, 'Intensity']} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="py-20 text-center text-xs tracking-widest text-gray-600 uppercase">Cycle empty for this interval</div>}
          </div>
        )}

        {currentView === 'coach' && (
          <div className="glass p-6 rounded-3xl border border-blue-500/30">
            <h2 className="text-xl font-black italic text-white mb-2 uppercase tracking-tighter">Dharma Counsel</h2>
            {!coachResponse && !isAnalyzing && <button onClick={getCoachAdvice} className="w-full py-6 bg-white text-black font-black rounded-2xl transition-all uppercase tracking-widest text-[11px] hover:bg-gray-200">Consult Soul Intelligence</button>}
            {isAnalyzing && <div className="py-20 text-center text-blue-400 animate-pulse font-black uppercase tracking-[0.5em]">Synchronizing Karma...</div>}
            {coachResponse && !isAnalyzing && <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-sm text-gray-300 font-medium leading-relaxed whitespace-pre-wrap">{coachResponse}</div>}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-[#0a0a0a]/95 backdrop-blur-3xl border-t border-white/5 flex items-center justify-around px-4 z-50">
        <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-2 transition-all ${currentView === 'dashboard' ? 'text-blue-500 scale-110' : 'text-gray-700'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Karma</span>
        </button>
        <button onClick={() => setCurrentView('backlog')} className={`flex flex-col items-center gap-2 transition-all ${currentView === 'backlog' ? 'text-orange-500 scale-110' : 'text-gray-700'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Backlog</span>
        </button>
        <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-2 transition-all ${currentView === 'stats' ? 'text-emerald-500 scale-110' : 'text-gray-700'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="m17 17 5-5-5-5"/><path d="m7 7-5 5 5 5"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Chakra</span>
        </button>
        <button onClick={() => setCurrentView('coach')} className={`flex flex-col items-center gap-2 transition-all ${currentView === 'coach' ? 'text-purple-500 scale-110' : 'text-gray-700'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Dharma</span>
        </button>
      </nav>

      {(isModalOpen || editingActivity) && (
        <ActivityModal 
          initialData={editingActivity}
          onClose={() => { setIsModalOpen(false); setEditingActivity(null); }} 
          onSave={handleAddOrEditActivity} 
        />
      )}
    </div>
  );
};

export default App;
