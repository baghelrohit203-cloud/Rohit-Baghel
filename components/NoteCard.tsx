
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
  
  return (
    <div 
      onClick={() => onClick(note)}
      className="glass p-5 rounded-[24px] border-stone-200/40 hover:border-stone-300/80 transition-all active:scale-[0.98] cursor-pointer group relative overflow-hidden bg-white/95"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span 
            className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest text-[#2b2925]"
            style={{ backgroundColor: `${NOTE_COLORS[note.type]}22`, border: `1px solid ${NOTE_COLORS[note.type]}55`, color: NOTE_COLORS[note.type] }}
          >
            {note.type}
          </span>
          {note.project && (
            <span className="text-[9px] mono font-bold text-stone-500 lowercase tracking-tighter">
              #{note.project}
            </span>
          )}
        </div>
        <span className="text-[10px] mono text-stone-400 font-bold uppercase">{dateStr}</span>
      </div>

      <h3 className="text-lg font-black text-[#2b2925] leading-tight mb-2 group-hover:text-[#c25e2d] transition-colors">
        {note.title}
      </h3>

      <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed mono opacity-90">
        {note.content}
      </p>
    </div>
  );
};

export default NoteCard;
