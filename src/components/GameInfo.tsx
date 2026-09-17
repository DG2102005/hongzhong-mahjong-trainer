// 游戏信息面板
import type { GameState } from '../game/types';
import { t, seatName } from '../i18n';
import { Tile } from './Tile';
import { sortHand } from '../game/sort';
import { ScorePanel } from '../quiz/ScorePanel';
import type { ScoreState, ScoreSettleKind } from '../game/scoring';
import type { ScoreDraw } from '../game/scoring';
import type { GangEvent } from '../game/types';

interface Props {
  state: GameState;
  onNewRound: () => void;
  scoreState: ScoreState;
  scoreResult?: { draw: ScoreDraw; kind: ScoreSettleKind } | null;
  scoreGangEvent?: GangEvent | null;
  onResetRound: () => void;
  onResetAll: () => void;
}

export function GameInfo({ state, onNewRound, scoreState, scoreResult, scoreGangEvent, onResetRound, onResetAll }: Props) {
  const remaining = state.deck.length;
  const phaseText = {
    idle: t('phase.idle'),
    dealing: t('phase.dealing'),
    draw: t('phase.draw'),
    discard: t('phase.discard'),
    action: t('phase.action'),
    react: t('phase.react'),
    gameover: state.isDraw ? t('phase.draw2') : (state.winner !== null ? t('phase.win', { seat: seatName(state.winner) }) : t('phase.draw2')),
  }[state.phase];

  // 局终: 剩余牌墙翻开(横向排列, 与AI翻牌布局一致)
  const wall = state.phase === 'gameover' && state.deck.length > 0
    ? sortHand(state.deck)
    : null;

  return (
    <div className="game-info">
      {/* 积分(累计+当轮) */}
      <ScorePanel
        score={scoreState}
        result={scoreResult}
        gangEvent={scoreGangEvent}
        onResetRound={onResetRound}
        onResetAll={onResetAll}
      />

      <div className="info-row"><span>{t('info.round')}</span><b>{state.round}</b></div>
      <div className="info-row"><span>{t('info.banker')}</span><b>{state.players.length ? seatName(state.banker) : '-'}</b></div>
      <div className="info-row"><span>{t('info.current')}</span><b>{state.players.length ? seatName(state.currentSeat) : '-'}</b></div>
      <div className="info-row"><span>{t('info.phase')}</span><b>{phaseText}</b></div>
      <div className="info-row"><span>{t('info.deck')}</span><b>{remaining}</b></div>
      {state.phase === 'gameover' && (
        <button className="new-round-btn" onClick={onNewRound}>{t('btn.newRound')}</button>
      )}
      {wall && (
        <div className="wall-remain">
          <div className="wall-remain-title">{t('wall.title', { n: wall.length })}</div>
          <div className="wall-remain-tiles">
            {wall.map((t) => (
              <Tile key={t.id} tile={t} size={22} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
