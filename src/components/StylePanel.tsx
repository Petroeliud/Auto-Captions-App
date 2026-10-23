import React from 'react';
import { 
  Palette, 
  Type, 
  Sliders, 
  Sparkles, 
  Square, 
  ArrowDown, 
  Minus, 
  ArrowUp,
  Check
} from 'lucide-react';
import { CaptionStyle, PresetId } from '../types/caption';
import { AVAILABLE_FONTS, CAPCUT_PRESETS } from '../utils/presetStyles';

interface StylePanelProps {
  style: CaptionStyle;
  onUpdateStyle: (updated: Partial<CaptionStyle>) => void;
  onApplyPreset: (presetId: PresetId) => void;
}

export const StylePanel: React.FC<StylePanelProps> = ({
  style,
  onUpdateStyle,
  onApplyPreset
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#121217] h-full overflow-hidden border-l border-zinc-800/80 select-none">
      {/* Panel Title */}
      <div className="p-4 border-b border-zinc-800/80 bg-[#15151c] flex items-center gap-2">
        <Palette className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-bold text-white tracking-wide">Caption Style & Animation</h2>
      </div>

      {/* Scrollable Style Customizer */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* 1. CapCut Presets Showcase */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 mb-2 flex items-center justify-between">
            <span>CapCut Style Presets</span>
            <span className="text-[10px] text-zinc-500 font-normal">6 Viral Presets</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CAPCUT_PRESETS.map((p) => {
              const isSelected = style.presetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onApplyPreset(p.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-20 ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/30 shadow-md'
                      : 'border-zinc-800 bg-[#181820] hover:bg-[#1f1f2a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 truncate">{p.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>

                  {/* Preset Preview Box */}
                  <div className={`p-1 rounded text-center truncate ${p.previewBg}`}>
                    <span
                      style={{
                        fontFamily: p.style.fontFamily,
                        fontSize: '11px',
                        color: p.style.fillColor,
                        WebkitTextStroke: p.style.outlineWidth ? `1px ${p.style.outlineColor}` : 'none',
                        textTransform: p.style.uppercase ? 'uppercase' : 'none',
                        fontWeight: 800,
                      }}
                    >
                      CAPCUT
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Word Animation & Pop Effect */}
        <div className="bg-[#181820] p-3 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-xs font-bold text-zinc-200">Word-by-Word Pop</span>
                <p className="text-[10px] text-zinc-500">Active word scales up and changes color</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={style.wordPopEnabled}
              onChange={(e) => onUpdateStyle({ wordPopEnabled: e.target.checked })}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </div>

          {style.wordPopEnabled && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-xs text-zinc-400">Pop Highlight Color:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.highlightColor || '#FFD700'}
                  onChange={(e) => onUpdateStyle({ highlightColor: e.target.value })}
                  className="w-7 h-7 bg-transparent rounded border border-zinc-700 cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-300">{style.highlightColor}</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Typography: Font & Size */}
        <div className="bg-[#181820] p-3 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Type className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-zinc-200">Font & Formatting</span>
          </div>

          {/* Font Selector */}
          <div>
            <label className="text-[11px] text-zinc-400 mb-1 block">Font Family</label>
            <select
              value={style.fontFamily}
              onChange={(e) => onUpdateStyle({ fontFamily: e.target.value })}
              className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size Slider */}
          <div>
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>Font Size</span>
              <span className="font-mono text-indigo-400 font-bold">{style.fontSize}px</span>
            </div>
            <input
              type="range"
              min={24}
              max={96}
              value={style.fontSize}
              onChange={(e) => onUpdateStyle({ fontSize: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Text Color & Uppercase */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.fillColor}
                onChange={(e) => onUpdateStyle({ fillColor: e.target.value })}
                className="w-7 h-7 bg-transparent rounded border border-zinc-700 cursor-pointer"
              />
              <span className="text-xs text-zinc-300">Text Fill</span>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={style.uppercase}
                onChange={(e) => onUpdateStyle({ uppercase: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              <span>UPPERCASE</span>
            </label>
          </div>
        </div>

        {/* 4. Stroke / Outline & Drop Shadow */}
        <div className="bg-[#181820] p-3 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-zinc-200">Outline & Glow</span>
          </div>

          {/* Stroke Width */}
          <div>
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>Outline Width</span>
              <span className="font-mono text-purple-400 font-bold">{style.outlineWidth}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              value={style.outlineWidth}
              onChange={(e) => onUpdateStyle({ outlineWidth: parseInt(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Stroke Color */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Outline Color:</span>
            <input
              type="color"
              value={style.outlineColor}
              onChange={(e) => onUpdateStyle({ outlineColor: e.target.value })}
              className="w-7 h-7 bg-transparent rounded border border-zinc-700 cursor-pointer"
            />
          </div>

          {/* Shadow Blur */}
          <div>
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>Shadow Blur / Glow</span>
              <span className="font-mono text-purple-400 font-bold">{style.shadowBlur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              value={style.shadowBlur}
              onChange={(e) => onUpdateStyle({ shadowBlur: parseInt(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 5. Background Box Settings */}
        <div className="bg-[#181820] p-3 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200">Background Box</span>
            </div>
            <input
              type="checkbox"
              checked={style.boxEnabled}
              onChange={(e) => onUpdateStyle({ boxEnabled: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </div>

          {style.boxEnabled && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Box Color:</span>
                <input
                  type="color"
                  value={style.boxColor.startsWith('rgba') ? '#000000' : style.boxColor}
                  onChange={(e) => onUpdateStyle({ boxColor: e.target.value })}
                  className="w-7 h-7 bg-transparent rounded border border-zinc-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Box Corner Radius</span>
                  <span className="font-mono text-emerald-400 font-bold">{style.boxRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={style.boxRadius}
                  onChange={(e) => onUpdateStyle({ boxRadius: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 6. Vertical Position */}
        <div className="bg-[#181820] p-3 rounded-xl border border-zinc-800 space-y-2">
          <span className="text-xs font-bold text-zinc-200 block mb-2">Vertical Position</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onUpdateStyle({ position: 'top', customYPercent: 12 })}
              className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                (style.customYPercent !== undefined ? style.customYPercent <= 25 : style.position === 'top')
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
              <span>Top</span>
            </button>
            <button
              onClick={() => onUpdateStyle({ position: 'middle', customYPercent: 50 })}
              className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                (style.customYPercent !== undefined ? (style.customYPercent > 25 && style.customYPercent < 70) : style.position === 'middle')
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Minus className="w-4 h-4" />
              <span>Middle</span>
            </button>
            <button
              onClick={() => onUpdateStyle({ position: 'bottom', customYPercent: 80 })}
              className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                (style.customYPercent !== undefined ? style.customYPercent >= 70 : style.position === 'bottom')
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              <span>Bottom</span>
            </button>
          </div>

          {/* Fine Vertical Offset Slider */}
          <div className="pt-2">
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>Vertical Offset (Y%)</span>
              <span className="font-mono text-indigo-400 font-bold">
                {style.customYPercent !== undefined ? style.customYPercent : (style.position === 'top' ? 12 : style.position === 'middle' ? 50 : 80)}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={95}
              value={style.customYPercent !== undefined ? style.customYPercent : (style.position === 'top' ? 12 : style.position === 'middle' ? 50 : 80)}
              onChange={(e) => onUpdateStyle({ customYPercent: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
