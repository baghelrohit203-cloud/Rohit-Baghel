
import React, { useState, useEffect } from 'react';
import { Note, NoteType, ProjectBlock } from '../types';
import { NOTE_TYPES, NOTE_COLORS } from '../constants';

interface NoteModalProps {
  initialData?: Note | null;
  onClose: () => void;
  onSave: (title: string, content: string, type: NoteType, project?: string, blocks?: ProjectBlock[]) => void;
  onDelete?: (id: string) => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ initialData, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [project, setProject] = useState('');
  const [type, setType] = useState<NoteType>('Journal');
  const [blocks, setBlocks] = useState<ProjectBlock[]>([]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setType(initialData.type);
      setProject(initialData.project || '');
      setBlocks(initialData.blocks || []);
    }
  }, [initialData]);

  const isCurrentProject = type === 'Current Project';
  const creationTime = initialData?.createdAt || Date.now();
  const createdDate = new Date(creationTime);
  const totalDaysPassed = Math.floor((Date.now() - creationTime) / (1000 * 60 * 60 * 24));
  
  const initiationStr = createdDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const addBlock = () => {
    const newBlock: ProjectBlock = {
      id: Math.random().toString(36).substr(2, 9),
      topic: '',
      content: '',
      timestamp: Date.now()
    };
    setBlocks([newBlock, ...blocks]);
  };

  const updateBlock = (id: string, field: keyof ProjectBlock, value: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleSave = () => {
    onSave(title, content, type, project, isCurrentProject ? blocks : undefined);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-in fade-in duration-300">
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        <div className="flex gap-2">
           {initialData && onDelete && (
             <button 
               onClick={() => { if(confirm('Delete entire project?')) onDelete(initialData.id); }}
               className="px-4 py-2 text-xs font-black text-red-500 hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest"
             >
               Delete
             </button>
           )}
           <button 
             onClick={handleSave}
             disabled={!title.trim() || (isCurrentProject ? blocks.length === 0 : !content.trim())}
             className="px-6 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest disabled:opacity-30"
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
                    : 'bg-white/5 border-white/5 text-gray-500'
                }`}
                style={type === t ? { backgroundColor: NOTE_COLORS[t] } : {}}
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
              className="bg-white/5 border border-white/5 px-4 py-1.5 rounded-full text-xs mono font-bold text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-800 lowercase tracking-widest text-center"
            />
            
            {isCurrentProject && (
              <div className="flex flex-col items-center gap-1 animate-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                  <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Initiated:</span>
                  <span className="text-[10px] mono font-bold text-gray-300">{initiationStr}</span>
                </div>
                <div className="text-[11px] font-black text-white mono uppercase">
                  Current Cycle: <span className="text-cyan-400">Day {totalDaysPassed + 1}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project Master Title..."
          className="w-full bg-transparent text-3xl font-black text-white outline-none placeholder:text-gray-800 tracking-tighter text-center"
        />

        {isCurrentProject ? (
          <div className="space-y-6">
            <button 
              onClick={addBlock}
              className="w-full py-4 border-2 border-dashed border-cyan-500/20 rounded-3xl text-cyan-500 font-black uppercase text-[10px] tracking-widest hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add New Topic Card
            </button>

            <div className="space-y-4">
              {blocks.map((block) => {
                const blockDate = new Date(block.timestamp);
                const blockDaysPassed = Math.floor((block.timestamp - creationTime) / (1000 * 60 * 60 * 24));
                return (
                  <div key={block.id} className="glass p-6 rounded-3xl border-white/5 relative group animate-in slide-in-from-bottom-4 duration-300">
                    <button 
                      onClick={() => removeBlock(block.id)}
                      className="absolute top-4 right-4 text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 bg-cyan-600 rounded-full text-[9px] font-black text-white uppercase mono">
                        Day {blockDaysPassed + 1}
                      </div>
                      <div className="text-[10px] mono text-gray-500 font-bold uppercase">
                        {blockDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    <input 
                      type="text" 
                      value={block.topic}
                      onChange={(e) => updateBlock(block.id, 'topic', e.target.value)}
                      placeholder="Topic Name..."
                      className="w-full bg-transparent text-lg font-black text-white outline-none placeholder:text-gray-900 tracking-tight mb-2"
                    />

                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
                      placeholder="Write your topic details here..."
                      className="w-full bg-transparent text-gray-400 outline-none resize-none mono text-sm leading-relaxed placeholder:text-gray-900 min-h-[100px]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pour your thoughts into the Dharma void..."
            className="w-full flex-1 min-h-[50vh] bg-transparent text-gray-300 outline-none resize-none mono text-lg leading-relaxed placeholder:text-gray-900"
          />
        )}
      </div>
    </div>
  );
};

export default NoteModal;
