'use client';

import React from 'react';
import { AiSparkleIcon } from './SplashView';

interface AiStudioViewProps {
  aiPolishInput: string;
  setAiPolishInput: (v: string) => void;
  aiPolishOutput: string;
  setAiPolishOutput: (v: string) => void;
  isAiThinking: boolean;
  setIsAiThinking: (v: boolean) => void;
  rephraseWithContext: (text: string) => Promise<string>;
}

export function AiStudioView({
  aiPolishInput, setAiPolishInput,
  aiPolishOutput, setAiPolishOutput,
  isAiThinking, setIsAiThinking,
  rephraseWithContext
}: AiStudioViewProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0d0e12]">
      <div className="px-5 h-14 flex items-center bg-[#08090c] border-b border-white/10 shrink-0">
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><AiSparkleIcon size={16} /> AI Studio Workspace</h2>
      </div>
      <div className="p-5 max-w-xl mx-auto w-full space-y-4">
        <div className="matte-card p-5 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2"><AiSparkleIcon size={14} /> Message Polisher & Tone Rephraser</h3>
          <textarea rows={4} value={aiPolishInput} onChange={(e) => setAiPolishInput(e.target.value)} placeholder="Draft rough text..." className="matte-input text-xs resize-none" />
          <button onClick={async () => {
            if (!aiPolishInput.trim()) return;
            setIsAiThinking(true);
            const res = await rephraseWithContext(aiPolishInput);
            setIsAiThinking(false);
            setAiPolishOutput(res);
          }} className="app-btn app-btn-primary px-4 py-2 text-xs">
            {isAiThinking ? 'Thinking...' : '✨ Rephrase Text'}
          </button>
          {aiPolishOutput && <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-white leading-relaxed">{aiPolishOutput}</div>}
        </div>
      </div>
    </div>
  );
}
