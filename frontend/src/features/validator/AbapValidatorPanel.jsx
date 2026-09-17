import React, { useEffect, useState } from 'react';
import { Code2, CheckCircle2, AlertTriangle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { validateQuery } from '../../services/api';

export const AbapValidatorPanel = () => {
  const { getQueryDefinition } = useCanvasStore();
  const [validation, setValidation] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkValidation = async () => {
    const q = getQueryDefinition();
    if (!q.tables || q.tables.length === 0) {
      setValidation(null);
      return;
    }
    try {
      const res = await validateQuery(q);
      setValidation(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkValidation();
  }, [useCanvasStore.getState().nodes, useCanvasStore.getState().edges, useCanvasStore.getState().selectedFields]);

  if (!validation) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(validation.open_sql || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 space-y-2 select-none backdrop-blur-sm transition-all duration-200 shrink-0">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer py-0.5"
      >
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">ABAP Smart Validator & Open SQL</span>
          {validation.is_valid ? (
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.2 rounded font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>JOIN VALID</span>
            </span>
          ) : (
            <span className="text-[10px] bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-0.2 rounded font-mono font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>INVALID JOIN</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700 transition"
            title="Salin Syntax Open SQL"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
            <span>{copied ? 'Tersalin!' : 'Copy SQL'}</span>
          </button>
          <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expandable Section: Errors & SQL Code Block */}
      {isExpanded && (
        <div className="space-y-2 pt-1 pb-1 animate-in fade-in duration-150">
          {validation.errors?.length > 0 && (
            <div className="space-y-1">
              {validation.errors.map((err, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          <pre className="p-2.5 max-h-48 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-sky-300 font-mono text-[11px] overflow-auto leading-relaxed whitespace-pre-wrap">
            {validation.open_sql || 'SELECT * FROM ...'}
          </pre>
        </div>
      )}
    </div>
  );
};

