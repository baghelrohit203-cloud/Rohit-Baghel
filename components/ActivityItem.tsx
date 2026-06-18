
import React, { useState, useEffect } from 'react';
import { ActivityEntry, ActivityStatus } from '../types';
import { GROUP_COLORS } from '../constants';

interface ActivityItemProps {
  activity: ActivityEntry;
  onUpdateStatus: (id: string, status: ActivityStatus) => void;
  onMoveDate: (id: string, newDate: string) => void;
  onEdit: (activity: ActivityEntry) => void;
  onUpdateTimer: (id: string, elapsed: number, isActive: boolean) => void;
  onAddDistraction?: (id: string) => void;
  onAttachImage?: (id: string, fileOrUrl: File | string | undefined) => Promise<void> | void;
  onDelete?: (id: string) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onUpdateStatus, onMoveDate, onEdit, onUpdateTimer, onAddDistraction, onAttachImage, onDelete }) => {
  const [displayElapsed, setDisplayElapsed] = useState(activity.timer?.totalElapsed || 0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isDone = activity.status === 'Completed';

  useEffect(() => {
    let active = true;
    if (activity.imageUrl) {
      if (activity.imageUrl.startsWith('http') || activity.imageUrl.startsWith('data:')) {
        setSignedUrl(activity.imageUrl);
      } else {
        // It is a Supabase Storage path! Let's get a signed URL
        import('../services/supabaseService')
          .then(({ supabaseGetSignedUrl }) => supabaseGetSignedUrl(activity.imageUrl!))
          .then(url => {
            if (active) setSignedUrl(url);
          })
          .catch(err => {
            console.error('Failed to get signed URL for image:', err);
            // Fallback to empty if failed
            if (active) setSignedUrl(null);
          });
      }
    } else {
      setSignedUrl(null);
    }
    return () => {
      active = false;
    };
  }, [activity.imageUrl]);

  useEffect(() => {
    let interval: number;
    if (activity.timer?.isActive && activity.timer.lastStartTime) {
      interval = window.setInterval(() => {
        const currentSession = Date.now() - (activity.timer?.lastStartTime || 0);
        setDisplayElapsed((activity.timer?.totalElapsed || 0) + currentSession);
      }, 1000);
    } else {
      setDisplayElapsed(activity.timer?.totalElapsed || 0);
    }
    return () => clearInterval(interval);
  }, [activity.timer?.isActive, activity.timer?.lastStartTime, activity.timer?.totalElapsed]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    if (activity.timer?.isActive) {
      const total = activity.timer.totalElapsed + (Date.now() - (activity.timer.lastStartTime || 0));
      onUpdateTimer(activity.id, total, false);
    } else {
      onUpdateTimer(activity.id, activity.timer?.totalElapsed || 0, true);
    }
  };

  const stopTimer = () => {
    let finalElapsed = activity.timer?.totalElapsed || 0;
    if (activity.timer?.isActive && activity.timer.lastStartTime) {
      finalElapsed += Date.now() - activity.timer.lastStartTime;
    }
    onUpdateTimer(activity.id, finalElapsed, false);
    onUpdateStatus(activity.id, 'Completed');
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachImage) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image should be less than 2MB.");
        return;
      }
      setIsUploading(true);
      try {
        await onAttachImage(activity.id, file);
      } catch (error) {
        console.error("Error uploading image:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveImage = async () => {
    if (onAttachImage) {
      setIsUploading(true);
      try {
        await onAttachImage(activity.id, undefined);
      } catch (error) {
        console.error("Error removing image:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className={`p-4 rounded-2xl transition-all duration-300 glass ${isDone ? 'opacity-60 bg-stone-100/40' : 'bg-white/95'} border-stone-200/40`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2 pr-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[activity.group] }} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDone ? 'text-stone-500' : 'text-[#c25e2d]'}`}>
                {activity.group}
              </span>
              {activity.project && (
                <span className="text-[9px] mono font-bold text-stone-500 px-1.5 py-0.5 border border-stone-200/60 rounded lowercase">
                  #{activity.project}
                </span>
              )}
            </div>
            {activity.startTime && (
              <div className="flex items-center gap-1.5 opacity-80">
                <span className={`text-[10px] mono font-bold ${activity.alarmEnabled ? 'text-[#c25e2d]' : 'text-stone-500'}`}>
                  {activity.startTime}
                </span>
                {activity.alarmEnabled && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#c25e2d]"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                )}
              </div>
            )}
          </div>
          <h3 className={`font-bold text-sm ${isDone ? 'line-through text-stone-400' : 'text-[#2b2925]'}`}>
            {activity.description}
          </h3>
          {signedUrl && (
            <div className="mt-2.5 relative inline-block group/img select-none">
              <img 
                src={signedUrl} 
                alt="Task Verification" 
                referrerPolicy="no-referrer"
                className="max-h-28 max-w-[200px] rounded-xl object-cover border border-stone-200/80 shadow-inner hover:brightness-95 hover:scale-[1.01] active:translate-y-0.5 transition-all cursor-pointer"
                onClick={() => {
                  const w = window.open();
                  if (w) {
                    w.document.write(`<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#141312;"><img src="${signedUrl}" style="max-height:95vh;max-width:95vw;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);" /></div>`);
                  }
                }}
              />
              <button 
                onClick={handleRemoveImage} 
                className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all"
                title="Remove image"
                disabled={isUploading}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
          {activity.distractions && activity.distractions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {activity.distractions.map((d, i) => (
                <span key={i} className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-bold uppercase">
                  ⚠️ {d}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {onAttachImage && !isDone && (
            <div className="relative group/upload">
              <button className="p-1.5 hover:bg-stone-100 text-stone-500 rounded-lg transition-all active:scale-95 disabled:opacity-50" title="Attach Completion Proof / Image" disabled={isUploading}>
                {isUploading ? (
                  <svg className="animate-spin text-[#c25e2d]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                )}
              </button>
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer disabled:pointer-events-none" 
                onChange={handleImageChange}
                disabled={isUploading}
              />
            </div>
          )}
          {activity.timer?.isActive && onAddDistraction && (
            <button onClick={() => onAddDistraction(activity.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Log Distraction">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </button>
          )}
          <button onClick={() => onEdit(activity)} className="p-1.5 hover:bg-stone-100 text-stone-500 rounded-lg transition-colors" title="Edit Activity">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          {onDelete && (
            <button onClick={() => { if (confirm("Delete this activity?")) onDelete(activity.id); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete Activity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
            </button>
          )}
          <div className="relative group">
            <button className="p-1.5 hover:bg-stone-100 text-stone-500 rounded-lg transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </button>
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => onMoveDate(activity.id, e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 border-t border-stone-100 pt-3">
        <div className="flex flex-col">
          <span className="text-[10px] mono text-stone-400 uppercase tracking-widest font-bold">Progress</span>
          <span className={`text-lg font-black mono ${activity.timer?.isActive ? 'text-[#c25e2d] animate-pulse' : 'text-[#2b2925]'}`}>
            {formatTime(displayElapsed)}
            <span className="text-[10px] text-stone-400 ml-1">/ {activity.estimatedDuration}m</span>
          </span>
        </div>

        {!isDone && (
          <div className="flex gap-2">
            <button 
              onClick={toggleTimer}
              className={`p-3 rounded-xl transition-all border ${activity.timer?.isActive ? 'bg-[#c25e2d]/10 border-[#c25e2d]/30 text-[#c25e2d]' : 'bg-[#c25e2d] border-[#d87c4f] text-white shadow-md shadow-[#c25e2d]/15 hover:bg-[#b05023]'}`}
            >
              {activity.timer?.isActive ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              )}
            </button>
            <button 
              onClick={stopTimer}
              className="p-3 bg-stone-50 border border-stone-200 text-[#3b6e4c] rounded-xl hover:bg-[#3b6e4c]/15 transition-all"
              title="Complete Task"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityItem;
