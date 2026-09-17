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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">AI Query Assistant (Natural Language to Query)</h3>
              <p className="text-[11px] text-slate-400">Didukung oleh model lokal Ollama (qwen2.5:3b)</p>
            </div>
          </div>
          <button
            onClick={() => setAiModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat / Prompt Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Quick Prompts */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 block mb-2">Pilih contoh perintah cepat:</span>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(qp);
                    handleSendPrompt(qp);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-[11px] font-medium transition text-left shadow-2xs"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 text-xs focus:bg-white transition"
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
              className="absolute right-2.5 bottom-2.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Send className="w-3 h-3" />
              <span>{isLoading ? 'Memproses...' : 'Kirim'}</span>
            </button>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3 font-sans shadow-2xs">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Hasil Rekomendasi Query</span>
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-mono font-bold">
                  READY
                </span>
              </div>

              {aiResult.explanation && (
                <p className="text-slate-600 text-xs leading-relaxed italic bg-white/70 p-2.5 rounded-xl border border-indigo-100">
                  "{aiResult.explanation}"
                </p>
              )}

              {/* Tables & Joins Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="rounded-xl bg-white p-2.5 border border-slate-200 space-y-1 shadow-2xs">
                  <span className="font-bold text-sky-700 flex items-center gap-1">
                    <Table className="w-3 h-3" />
                    <span>Tabel Terpilih ({aiResult.tables?.length || 0}):</span>
                  </span>
                  <div className="text-slate-800 font-bold">
                    {aiResult.tables?.map((t) => t.table).join(', ')}
                  </div>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-slate-200 space-y-1 shadow-2xs">
                  <span className="font-bold text-amber-700 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    <span>Relasi Join ({aiResult.joins?.length || 0}):</span>
                  </span>
                  <div className="text-slate-800 font-bold">
                    {aiResult.joins?.map((j) => `${j.sourceField} = ${j.targetField}`).join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* Selected Fields Preview */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600">Kolom Output Terpilih ({aiResult.selectedFields?.length || 0}):</span>
                <div className="flex flex-wrap gap-1">
                  {aiResult.selectedFields?.map((sf, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-mono shadow-2xs"
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <button
            onClick={() => setAiModalOpen(false)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 font-semibold transition"
          >
            Tutup
          </button>
          {aiResult && (
            <button
              onClick={handleApplyToCanvas}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
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
