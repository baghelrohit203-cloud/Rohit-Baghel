
import React, { useState, useEffect } from 'react';
import { Note, NoteType } from '../types';
import { NOTE_TYPES, NOTE_COLORS } from '../constants';

interface NoteModalProps {
  initialData?: Note | null;
  onClose: () => void;
  onSave: (title: string, content: string, type: NoteType, project?: string) => void;
  onDelete?: (id: string) => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ initialData, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [project, setProject] = useState('');
  const [type, setType] = useState<NoteType>('Journal');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setType(initialData.type);
      setProject(initialData.project || '');
    }
  }, [initialData]);

  const handleSave = () => {
    onSave(title, content, type, project || undefined);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#f5f2ea] flex flex-col animate-in fade-in duration-300">
      <header className="p-6 border-b border-stone-200/60 flex items-center justify-between bg-[#faf8f5]">
        <button onClick={onClose} className="text-stone-500 hover:text-stone-800 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        <div className="flex gap-2">
           {initialData && onDelete && (
             <button 
               onClick={() => { if(confirm('Delete this note?')) onDelete(initialData.id); }}
               className="px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest"
             >
               Delete
             </button>
           )}
           <button 
             onClick={handleSave}
             disabled={!title.trim() || !content.trim()}
             className="px-6 py-2 bg-[#c25e2d] text-white text-xs font-black rounded-xl hover:bg-[#b05023] transition-all uppercase tracking-widest disabled:opacity-30 shadow-md shadow-[#c25e2d]/10"
           >
             Save Entry
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-2xl mx-auto w-full pb-20">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {NOTE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 text-[10px] font-black rounded-full border transition-all uppercase tracking-tighter ${
                  type === t 
                    ? 'text-white border-transparent' 
                    : 'bg-stone-100 border-stone-200/60 text-stone-500 hover:bg-stone-200 hover:text-stone-700'
                }`}
                style={type === t ? { backgroundColor: NOTE_COLORS[t], boxShadow: `0 4px 10px ${NOTE_COLORS[t]}33` } : {}}
              >
                {t}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col items-center gap-3 w-full">
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="#project-tag"
              className="bg-stone-50 border border-stone-200/80 px-4 py-1.5 rounded-full text-xs mono font-bold text-stone-600 focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/20 placeholder:text-stone-400 lowercase tracking-widest text-center"
            />
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title..."
          className="w-full bg-transparent text-3xl font-black text-[#2b2925] outline-none placeholder:text-stone-300 tracking-tighter text-center"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Pour your thoughts into the Dharma void..."
          className="w-full flex-1 min-h-[50vh] bg-transparent text-stone-700 outline-none resize-none mono text-lg leading-relaxed placeholder:text-stone-300"
        />
      </div>
    </div>
  );
};

export default NoteModal;
