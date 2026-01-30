
import React from 'react';
import { Note } from '../types';
import { NOTE_COLORS } from '../constants';

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick }) => {
  const createdDate = new Date(note.createdAt);
  const dateStr = createdDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  const fullDateStr = createdDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const daysPassed = Math.floor((Date.now() - note.createdAt) / (1000 * 60 * 60 * 24));
  const isCurrentProject = note.type === 'Current Project';
  const latestBlock = isCurrentProject && note.blocks && note.blocks.length > 0 ? note.blocks[0] : null;

  return (
    <div 
      onClick={() => onClick(note)}
      className={`glass p-5 rounded-3xl border-white/5 hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer group relative overflow-hidden ${isCurrentProject ? 'border-cyan-500/20 bg-cyan-500/[0.02]' : ''}`}
    >
      {isCurrentProject && (
        <div className="absolute top-0 right-0 px-4 py-1.5 bg-cyan-600 text-white text-[10px] font-black mono rounded-bl-2xl shadow-lg flex items-center gap-2">
          <span>DAY {daysPassed + 1}</span>
          {note.blocks && note.blocks.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px]">{note.blocks.length}</span>
          )}
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span 
            className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest text-white/80"
            style={{ backgroundColor: `${NOTE_COLORS[note.type]}33`, border: `1px solid ${NOTE_COLORS[note.type]}55` }}
          >
            {note.type}
          </span>
          {note.project && (
            <span className="text-[9px] mono font-bold text-gray-600 lowercase tracking-tighter">
              #{note.project}
            </span>
          )}
        </div>
        {!isCurrentProject && (
          <span className="text-[10px] mono text-gray-600 font-bold uppercase">{dateStr}</span>
        )}
      </div>

      <h3 className="text-lg font-black text-white leading-tight mb-2 group-hover:text-blue-400 transition-colors">
        {note.title}
      </h3>

      {isCurrentProject && (
        <div className="mb-3 flex flex-col gap-2">
          <div className="text-[10px] mono text-cyan-500/80 font-bold uppercase tracking-tighter">
            Initiated: {fullDateStr}
          </div>
          {latestBlock ? (
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 border-dashed">
               <div className="text-[9px] font-black text-cyan-500 uppercase mb-1">Latest Topic</div>
               <div className="text-xs font-bold text-gray-300 truncate">{latestBlock.topic || 'Untitled Topic'}</div>
               <div className="text-[10px] text-gray-600 mono mt-0.5 line-clamp-1">{latestBlock.content}</div>
            </div>
          ) : (
            <div className="text-[9px] text-gray-600 italic">
              {daysPassed === 0 ? "Project launched today" : `${daysPassed} full days in cycle`}
            </div>
          )}
        </div>
      )}

      {!isCurrentProject && (
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mono opacity-80">
          {note.content}
        </p>
      )}
    </div>
  );
};

export default NoteCard;
