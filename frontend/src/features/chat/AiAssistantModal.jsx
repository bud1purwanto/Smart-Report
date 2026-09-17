import React, { useState } from 'react';
import { X, Sparkles, Send, Check, ArrowRight, Table, GitBranch, Filter } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { chatAi } from '../../services/api';

export const AiAssistantModal = () => {
  const { aiModalOpen, setAiModalOpen, showNotification } = useAppStore();
  const { loadQueryDefinition } = useCanvasStore();

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  if (!aiModalOpen) return null;

  const quickPrompts = [
    'Analisa PO Header & Item dari tabel EKKO dan EKPO',
    'Laporan Pembelian Vendor dari EKKO dan LFA1',
    'Analisa Sales Order Item dari VBAK dan VBAP',
    'Master Material beserta Deskripsi dari MARA dan MAKT',
  ];

  const handleSendPrompt = async (textToSend = null) => {
    const queryText = textToSend || prompt;
    if (!queryText.trim()) return;

    setIsLoading(true);
    setAiResult(null);
    try {
      const res = await chatAi(queryText.trim());
      setAiResult(res.data);
      showNotification('AI berhasil menyusun visual query.', 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      showNotification(`Gagal terjemah prompt AI: ${msg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToCanvas = async () => {
    if (!aiResult) return;
    try {
      await loadQueryDefinition(aiResult);
      showNotification('Visual query berhasil diterapkan ke kanvas!', 'success');
      setAiModalOpen(false);
    } catch (err) {
      showNotification('Gagal menerapkan ke kanvas: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-100">AI Query Assistant (Natural Language to Query)</h3>
              <p className="text-[11px] text-slate-400">Didukung oleh model lokal Ollama (qwen2.5:3b)</p>
            </div>
          </div>
          <button
            onClick={() => setAiModalOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat / Prompt Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Quick Prompts */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">Pilih contoh perintah cepat:</span>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(qp);
                    handleSendPrompt(qp);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 text-[11px] transition text-left"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Box */}
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tuliskan kebutuhan laporan Anda dalam bahasa sehari-hari..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
            />
            <button
              onClick={() => handleSendPrompt()}
              disabled={isLoading || !prompt.trim()}
              className="absolute right-2.5 bottom-2.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 transition shadow"
            >
              <Send className="w-3 h-3" />
              <span>{isLoading ? 'Memproses...' : 'Kirim'}</span>
            </button>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                <span className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Hasil Rekomendasi Query</span>
                </span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">
                  READY
                </span>
              </div>

              {aiResult.explanation && (
                <p className="text-slate-300 text-xs leading-relaxed italic">
                  "{aiResult.explanation}"
                </p>
              )}

              {/* Tables & Joins Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800 space-y-1">
                  <span className="font-bold text-sky-400 flex items-center gap-1">
                    <Table className="w-3 h-3" />
                    <span>Tabel Terpilih ({aiResult.tables?.length || 0}):</span>
                  </span>
                  <div className="text-slate-300">
                    {aiResult.tables?.map((t) => t.table).join(', ')}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    <span>Relasi Join ({aiResult.joins?.length || 0}):</span>
                  </span>
                  <div className="text-slate-300">
                    {aiResult.joins?.map((j) => `${j.sourceField} = ${j.targetField}`).join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* Selected Fields Preview */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">Kolom Output Terpilih ({aiResult.selectedFields?.length || 0}):</span>
                <div className="flex flex-wrap gap-1">
                  {aiResult.selectedFields?.map((sf, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono"
                    >
                      {sf.table}.{sf.field}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => setAiModalOpen(false)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
          >
            Tutup
          </button>
          {aiResult && (
            <button
              onClick={handleApplyToCanvas}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Terapkan ke Kanvas Visual</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

