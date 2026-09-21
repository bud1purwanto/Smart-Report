import React, { useEffect, useState } from 'react';
import { Code2, CheckCircle2, AlertTriangle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { validateQuery } from '../../services/api';

export const AbapValidatorPanel = () => {
  const { getQueryDefinition } = useCanvasStore();
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const selectedFields = useCanvasStore((state) => state.selectedFields);
  const filters = useCanvasStore((state) => state.filters);
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
      setValidation({
        is_valid: false,
        errors: [e.normalized?.message || 'Validator tidak dapat dihubungi. Coba lagi sebelum menjalankan query.'],
        open_sql: '',
      });
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(checkValidation, 300);
    return () => window.clearTimeout(timer);
  }, [nodes, edges, selectedFields, filters]);

  if (!validation) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(validation.open_sql || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end pointer-events-auto select-none">
      {/* Expandable Section: Errors & SQL Code Block */}
      {isExpanded && (
        <div className="mb-2 w-96 max-w-[calc(100vw-300px)] p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md space-y-2.5 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-bold text-xs flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Generated ABAP Open SQL</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium transition cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
              <span>{copied ? 'Tersalin!' : 'Copy SQL'}</span>
            </button>
          </div>

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

      {/* Floating Pill Trigger */}
      <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-full px-3 py-1 shadow-lg backdrop-blur-md text-xs font-semibold">
        <Code2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        <span className="text-[11px] text-slate-700 dark:text-slate-200 font-bold">ABAP Validator</span>
        {validation.is_valid ? (
          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>JOIN VALID</span>
          </span>
        ) : (
          <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-800 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>INVALID JOIN</span>
          </span>
        )}

        <button
          onClick={handleCopy}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
          title="Salin Open SQL"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
          title={isExpanded ? "Tutup Preview SQL" : "Buka Preview SQL"}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
