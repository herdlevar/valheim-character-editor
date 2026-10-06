import React, { useState } from 'react';
import { X, Copy, Check, Folder, Info } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface SteamPathModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SteamPathModal: React.FC<SteamPathModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const paths = [
    {
      title: 'Steam Cloud Characters (Default on this PC)',
      path: 'C:\\Program Files (x86)\\Steam\\userdata\\1622853\\892970\\remote\\characters',
      desc: 'Contains knut.fch, redd.fch, and automatic backup files synced to Steam Cloud.',
    },
    {
      title: 'Local Characters Directory',
      path: '%USERPROFILE%\\AppData\\LocalLow\\IronGate\\Valheim\\characters_local',
      desc: 'Used if you choose "Move to Local" inside the Valheim character select screen.',
    },
  ];

  const handleCopy = async (path: string, index: number) => {
    const success = await copyToClipboard(path);
    if (success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-valheim-dark border-2 border-valheim-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-valheim-panel border-b border-valheim-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Folder className="w-5 h-5 text-valheim-gold" />
            <h3 className="font-valheim font-bold text-valheim-gold text-base tracking-wide">
              Valheim Character Save Locations
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-valheim-slot flex items-center justify-center text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto">
          {/* Quick 3-Step Guide */}
          <div className="bg-valheim-slot p-3.5 rounded-lg border border-valheim-brass/50 space-y-2.5">
            <div className="font-valheim font-bold text-valheim-gold text-sm flex items-center gap-2">
              <span>⚡ Quick Guide: Where & How to Put Your Save File</span>
            </div>

            <ol className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-valheim-panel border border-valheim-border text-valheim-gold font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <span className="font-semibold text-gray-200">Download Character File</span>
                  <p className="text-[11px] text-gray-400">
                    Click the <strong className="text-valheim-gold font-normal">"Save Character (.fch)"</strong> button. The modified file will download to your Gaming PC's <code className="text-gray-300">Downloads</code> folder.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-valheim-panel border border-valheim-border text-valheim-gold font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <span className="font-semibold text-gray-200">Open Your Steam Save Folder</span>
                  <p className="text-[11px] text-gray-400">
                    Click the <strong className="text-emerald-400 font-normal">"Copy"</strong> button below for your Steam folder. Then on your keyboard, press <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-valheim-border text-valheim-gold font-mono text-[10px]">Win + R</kbd>, paste with <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-valheim-border text-valheim-gold font-mono text-[10px]">Ctrl + V</kbd>, and hit <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-valheim-border text-valheim-gold font-mono text-[10px]">Enter</kbd>.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-valheim-panel border border-valheim-border text-valheim-gold font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <span className="font-semibold text-gray-200">Move & Replace Save File</span>
                  <p className="text-[11px] text-gray-400">
                    Move your downloaded <code className="text-valheim-gold font-mono">.fch</code> file into that folder (replacing the old one). Next time you launch Valheim, your updated character will load immediately!
                  </p>
                </div>
              </li>
            </ol>

            {/* Pro Tip Callout */}
            <div className="mt-3 p-2.5 rounded bg-amber-950/40 border border-amber-600/50 text-[11px] text-amber-200">
              <span className="font-bold text-valheim-gold">💡 Pro-Tip for Instant 1-Click Saves:</span> In your browser (Chrome/Edge), go to <code className="font-mono text-amber-100">Settings &gt; Downloads</code> and enable <strong className="text-white">"Ask where to save each file before downloading"</strong>. When you click Save, paste this folder path once—every future save will go straight into your Steam folder with zero moving!
            </div>
          </div>

          {/* Folder Paths List */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-valheim-brass uppercase tracking-wider">
              Exact Save Directories on Your Computer:
            </div>
            {paths.map((p, idx) => (
              <div key={idx} className="bg-valheim-slot p-3.5 rounded border border-valheim-border/80">
                <div className="font-semibold text-valheim-gold text-xs">{p.title}</div>
                <p className="text-[11px] text-gray-400 mt-0.5 mb-2">{p.desc}</p>
                <div className="flex items-center gap-2 bg-black/50 p-2 rounded border border-valheim-border/60">
                  <input
                    type="text"
                    readOnly
                    value={p.path}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="bg-transparent border-none text-[11px] font-mono text-gray-200 truncate flex-1 focus:outline-none selection:bg-amber-500/30 selection:text-white cursor-pointer"
                    title="Click to select all"
                  />
                  <button
                    onClick={() => handleCopy(p.path, idx)}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border text-[10px] text-gray-200 font-semibold transition shrink-0"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-valheim-brass" />
                        <span>Copy Path</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-valheim-panel border-t border-valheim-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-valheim-slot hover:bg-valheim-slothover border border-valheim-border text-xs text-gray-300 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
