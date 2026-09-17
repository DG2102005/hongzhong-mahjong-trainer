// 选牌开局: 自由选14张手牌 → 直接与AI对弈(复用 startCustomGame)
import { useMemo, useState } from 'react';
import { Tile } from './Tile';
import { indexToTile, tileCode } from '../game/types';
import type { Tile as TileType, Suit } from '../game/types';
import { sortHand } from '../game/sort';
import { t, tileLabel } from '../i18n';

interface Props {
  onClose: () => void;
  onStart: (codes: string[]) => void;
}

const ALL_CODES: string[] = (() => {
  const codes: string[] = [];
  for (let i = 0; i < 34; i++) codes.push(tileCode(indexToTile(i)));
  return codes;
})();

const ROWS: { label: Suit; codes: string[] }[] = [
  { label: 'm', codes: ALL_CODES.slice(0, 9) },
  { label: 'p', codes: ALL_CODES.slice(9, 18) },
  { label: 's', codes: ALL_CODES.slice(18, 27) },
  { label: 'z', codes: ALL_CODES.slice(27, 34) },
];

function tileOf(code: string): TileType {
  return { id: -1, suit: code[0] as Suit, rank: parseInt(code.slice(1), 10) };
}

export function HandPicker({ onClose, onStart }: Props) {
  const [codes, setCodes] = useState<string[]>([]);

  const handTiles = useMemo(() => sortHand(codes.map(tileOf)), [codes]);
  const handCount = codes.length;

  const used = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of codes) m[c] = (m[c] ?? 0) + 1;
    return m;
  }, [codes]);

  const poolAvail = (code: string): number => 4 - (used[code] ?? 0);

  const addTile = (code: string) => {
    if (handCount >= 14 || poolAvail(code) <= 0) return;
    setCodes((prev) => [...prev, code]);
  };

  const removeTile = (tile: TileType) => {
    const code = tileCode(tile);
    setCodes((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i] === code) return prev.filter((_, k) => k !== i);
      }
      return prev;
    });
  };

  const clearAll = () => setCodes([]);

  const randomFill = () => {
    const need = 14 - handCount;
    if (need <= 0) return;
    const pool: string[] = [];
    for (const c of ALL_CODES) {
      for (let i = 0; i < poolAvail(c); i++) pool.push(c);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setCodes((prev) => [...prev, ...pool.slice(0, need)]);
  };

  return (
    <div className="quiz-analysis-overlay" onClick={onClose}>
      <div className="adv-overlay-card picker-card" onClick={(e) => e.stopPropagation()}>
        <div className="adv-overlay-head">
          <span>{t('picker.title')}</span>
          <button className="adv-overlay-close" onClick={onClose}>✕</button>
        </div>

        <div className="picker-tip">{t('picker.tip')}</div>

        <div className="tile-pool" style={{ marginBottom: 14 }}>
          {ROWS.map((row) => (
            <div key={row.label} className="tile-pool-row">
              <span className="picker-suit">{t('suit.' + row.label)}</span>
              {row.codes.map((code) => {
                const avail = poolAvail(code);
                const disabled = avail <= 0 || handCount >= 14;
                return (
                  <div
                    key={code}
                    className={`tile-pool-item ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && addTile(code)}
                    title={tileLabel(tileOf(code))}
                  >
                    <Tile tile={tileOf(code)} size={32} />
                    <div className={`tile-pool-count ${avail === 0 ? 'zero' : ''}`}>{avail}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="simulator-section-title">{t('picker.hand', { n: handCount })}</div>
        <div className="simulator-hand" style={{ minHeight: 76, marginBottom: 14 }}>
          {handTiles.length === 0 ? (
            <span className="simulator-hand-empty">{t('picker.empty')}</span>
          ) : (
            handTiles.map((tl, i) => (
              <div
                key={`${tileCode(tl)}-${i}`}
                className="picker-hand-tile"
                onClick={() => removeTile(tl)}
                title={t('picker.remove', { tile: tileLabel(tl) })}
              >
                <Tile tile={tl} size={40} />
              </div>
            ))
          )}
        </div>

        <div className="simulator-toolbar">
          <button className="quiz-toolbar-btn" onClick={clearAll} disabled={handCount === 0}>{t('picker.clear')}</button>
          <button className="quiz-toolbar-btn" onClick={randomFill} disabled={handCount >= 14}>{t('picker.random')}</button>
          <button className="quiz-toolbar-btn" onClick={onClose}>{t('picker.cancel')}</button>
          <button
            className="quiz-toolbar-btn primary"
            disabled={handCount !== 14}
            onClick={() => onStart(codes)}
          >
            {t('picker.start')}
          </button>
        </div>
      </div>
    </div>
  );
}