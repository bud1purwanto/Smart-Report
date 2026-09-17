import React, { useEffect, useState } from 'react';
import { Code2, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { validateQuery } from '../../services/api';

export const AbapValidatorPanel = () => {
  const { getQueryDefinition } = useCanvasStore();
  const [validation, setValidation] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(validation.open_sql || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/95 p-3 space-y-2 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-xs text-slate-200">ABAP Smart Validator & Open SQL Preview</span>
          {validation.is_valid ? (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>JOIN VALID</span>
            </span>
          ) : (
            <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>INVALID JOIN / TIMEOUT RISK</span>
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Tersalin!' : 'Copy SQL'}</span>
        </button>
      </div>

      {/* Errors or Warnings */}
      {validation.errors?.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((err, idx) => (
            <div key={idx} className="p-2 rounded bg-red-950/40 border border-red-800/80 text-red-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* SQL Code Block */}
      <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-300 font-mono text-[11px] overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {validation.open_sql || 'SELECT * FROM ...'}
      </pre>
    </div>
  );
};

