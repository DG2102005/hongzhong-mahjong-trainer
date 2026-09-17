// 复盘回放面板: 浏览收藏牌局的人类决策时间线 + 页内自由演绎(从任意节点继续)
import { useState } from 'react';
import type { GameState } from '../game/types';
import type { SavedRound } from '../game/savedRounds';
import { buildReplayNodes } from '../game/savedRounds';
import { deleteSavedRound, clearSavedRounds } from '../game/savedRounds';
import type { Tile as TileType } from '../game/types';
import { Tile } from './Tile';
import { ReviewPlayground } from './ReviewPlayground';
import { sortHand } from '../game/sort';
import { t, seatName, tileLabel } from '../i18n';

interface Props {
  rounds: SavedRound[];
  onReload: () => void;
}

const TYPE_KEY: Record<string, string> = {
  hu: 'label.hu',
  peng: 'label.peng',
  gang: 'label.gang',
  minggang: 'label.minggang',
  angang: 'label.angang',
  bugang: 'label.bugang',
  discard: 'label.discard',
};

const CODE_RE = /\b(m[1-9]|p[1-9]|s[1-9]|z[1-7])\b/g;

// 历史动作标签中的牌代号 → 具体牌名(兼容历史收藏数据); 动作类型 → 本地化文案
function prettyLabel(label: string): string {
  let s = label;
  for (const [k, key] of Object.entries(TYPE_KEY)) {
    s = s.replace(new RegExp(`\\b${k}\\b`, 'g'), t(key));
  }
  return s.replace(CODE_RE, (m) =>
    tileLabel({ suit: m[0] as TileType['suit'], rank: parseInt(m.slice(1), 10) }),
  );
}

export function ReviewReplay({ rounds, onReload }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nodeIdx, setNodeIdx] = useState(0);
  const [playground, setPlayground] = useState<{ state: GameState; label: string } | null>(null);

  const selected = rounds.find((r) => r.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setNodeIdx(0);
    setPlayground(null);
  };

  const handleDelete = (id: string) => {
    deleteSavedRound(id);
    if (selectedId === id) {
      setSelectedId(null);
      setNodeIdx(0);
      setPlayground(null);
    }
    onReload();
  };

  const handleClear = () => {
    clearSavedRounds();
    setSelectedId(null);
    setNodeIdx(0);
    setPlayground(null);
    onReload();
  };

  const nodes = selected ? buildReplayNodes(selected) : [];

  const renderHand = (tiles: TileType[]) => (
    <div className="replay-hand">
      {sortHand(tiles).map((t, i) => (
        <Tile key={i} tile={t} size={24} />
      ))}
    </div>
  );

  return (
    <div className="review-replay">
      <div className="replay-head">
        <span>{t('replay.title', { n: rounds.length })}</span>
        {rounds.length > 0 && (
          <button className="replay-btn danger" onClick={handleClear}>{t('replay.clear')}</button>
        )}
      </div>

      {rounds.length === 0 && (
        <div className="replay-empty">{t('replay.empty')}</div>
      )}

      {rounds.length > 0 && (
        <div className="replay-list">
          {rounds.map((r) => (
            <div key={r.id} className={`replay-item${selectedId === r.id ? ' active' : ''}`} onClick={() => handleSelect(r.id)}>
              <div className="replay-item-head">
                <span>{t('replay.round', { n: r.round, label: r.resultLabel })}</span>
                <span className="replay-time">{new Date(r.savedAt).toLocaleTimeString()}</span>
                <button className="replay-btn danger" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}>✕</button>
              </div>
              {selectedId === r.id && (
                <div className="replay-detail">
                  {/* 时间线 */}
                  <div className="replay-timeline">
                    {nodes.map((n, i) => (
                      <button
                        key={i}
                        className={`timeline-node${nodeIdx === i ? ' active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setNodeIdx(i); setPlayground(null); }}
                      >
                        {i === 0 ? t('replay.start') : prettyLabel(n.label)}
                      </button>
                    ))}
                  </div>

                  {/* 当前节点牌面 */}
                  {nodes[nodeIdx] && (() => {
                    const n = nodes[nodeIdx];
                    const st = n.state;
                    const human = st.players[1];
                    return (
                      <div className="replay-node-state">
                        <div className="replay-node-label">
                          {t('replay.step', { n: nodeIdx + 1, label: prettyLabel(n.label) })}
                        </div>
                        {human && (
                          <>
                            <div className="replay-row">
                              <span className="replay-label">{t('replay.hand')}</span>
                              {renderHand(human.hand)}
                            </div>
                            {human.melds.length > 0 && (
                              <div className="replay-row">
                                <span className="replay-label">{t('replay.meld')}</span>
                                {human.melds.map((m, mi) => (
                                  <span key={mi} className="meld-tag">{tileLabel(m.tiles[0])}×{m.tiles.length}</span>
                                ))}
                              </div>
                            )}
                            <div className="replay-row">
                              <span className="replay-label">{t('replay.discard')}</span>
                              <span className="replay-discards">
                                {human.discards.map((t) => tileLabel(t)).join(' ') || t('replay.none')}
                              </span>
                            </div>
                          </>
                        )}
                        {st.phase === 'gameover' && (
                          <div className="replay-result">
                            {st.isDraw ? t('phase.draw2') : t('phase.win', { seat: seatName(st.winner!) })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 页内自由演绎 */}
                  <div className="replay-actions">
                    <button
                      className="replay-btn primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        const n = nodes[nodeIdx];
                        if (n && selected) {
                          setPlayground({ state: n.state, label: t('replay.round', { n: selected.round, label: prettyLabel(n.label) }) });
                        }
                      }}
                      title={t('replay.btn.title')}
                    >
                      {t('replay.btn')}
                    </button>
                  </div>
                  {playground && (
                    <ReviewPlayground state={playground.state} label={playground.label} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
