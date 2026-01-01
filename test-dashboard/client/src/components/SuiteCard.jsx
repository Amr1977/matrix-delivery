import React from 'react';
import { Play, Loader2 } from 'lucide-react';

const SuiteCard = ({ suite, isRunning, disabled, onRun }) => {
    return (
        <div className={`
      relative group p-4 rounded-xl border transition-all duration-200
      ${isRunning
                ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
            }
      ${disabled ? 'opacity-50 grayscale' : 'opacity-100'}
    `}>
            <div className="flex items-start justify-between">
                <div>
                    <h3 className={`font-semibold text-lg ${isRunning ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {suite.name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                        {suite.description}
                    </p>
                    <div className="mt-3 flex gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-900 border border-slate-700 text-slate-400">
                            {suite.features.length} Features
                        </span>
                    </div>
                </div>

                <button
                    onClick={onRun}
                    disabled={disabled || isRunning}
                    className={`
            p-3 rounded-lg transition-all
            ${isRunning
                            ? 'bg-emerald-500/20 text-emerald-500 cursor-wait'
                            : 'bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-300'
                        }
          `}
                >
                    {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
            </div>

            {isRunning && (
                <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/50 animate-pulse w-full rounded-b-xl" />
            )}
        </div>
    );
};

export default SuiteCard;
