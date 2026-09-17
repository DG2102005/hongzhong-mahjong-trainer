// 复盘演绎台: 在复盘页内直接自由演绎
// 人类每回合可自由选摸进(FreeDrawBar)与自由舍出(手牌点击), 也可碰/杠/胡
import { useEffect } from 'react';
import type { GameState } from '../game/types';
import { HUMAN_SEAT } from '../game/constants';
import { useGame } from '../hooks/useGame';
import { HandRow } from './HandRow';
import { MeldArea } from './MeldArea';
import { ActionPanel } from './ActionPanel';
import { FreeDrawBar } from './FreeDrawBar';
import { t, seatName } from '../i18n';

interface Props {
  state: GameState;   // 起始节点状态(开局/某一步)
  label: string;      // 节点描述
}

export function ReviewPlayground({ state, label }: Props) {
  const game = useGame(true); // 演绎不结算真实积分

  useEffect(() => {
    game.loadRound(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = game.state;
  const human = s.players[HUMAN_SEAT];

  const canDiscard =
    s.phase !== 'idle' && s.phase !== 'gameover' &&
    s.currentSeat === HUMAN_SEAT && s.phase === 'discard';

  const selfOptions =
    s.currentSeat === HUMAN_SEAT && s.phase === 'discard' && s.selfActions.length > 0
      ? s.selfActions
      : [];
  const reactOptions = s.phase === 'react' ? s.pendingOptions : [];

  const started = s.phase !== 'idle';

  return (
    <div className="review-sandbox" onClick={(e) => e.stopPropagation()}>
      <div className="sandbox-head">
        <span>{t('sandbox.title', { label })}</span>
        <span className="sandbox-phase">
          {s.phase === 'gameover'
            ? s.isDraw ? t('phase.draw2') : t('phase.win', { seat: seatName(s.winner!) })
            : s.phase === 'idle'
              ? t('sandbox.phase.idle')
              : `${seatName(s.currentSeat)} · ${t('phase.' + s.phase) ?? s.phase} · ${t('sandbox.phase.wall', { n: s.deck.length })}`}
        </span>
      </div>

      {started && human && (
        <div className="sandbox-board">
          <div className="sandbox-seat">
            <span className="seat-name">{seatName(HUMAN_SEAT)} · {human.name}</span>
            {s.currentSeat === HUMAN_SEAT && s.phase === 'discard' && (
              <span className="turn-indicator">{t('sandbox.turn.discard')}</span>
            )}
            {game.freeDraw && s.currentSeat === HUMAN_SEAT && s.phase === 'draw' && (
              <span className="turn-indicator gold">{t('sandbox.turn.draw')}</span>
            )}
          </div>

          <MeldArea melds={human.melds} size={26} />

          {/* 轮到摸牌: 从牌墙点击选牌摸入 */}
          {game.freeDraw && s.phase === 'draw' && s.currentSeat === HUMAN_SEAT && (
            <FreeDrawBar deck={s.deck} onPick={game.humanChooseDraw} />
          )}

          {/* 手牌: 轮到出牌时点击任意张自由舍出 */}
          <HandRow
            hand={human.hand}
            melds={human.melds}
            onDiscard={game.humanDiscard}
            interactive={canDiscard}
            drawnTileId={s.drawnTileId}
          />

          {reactOptions.length > 0 && (
            <ActionPanel
              options={reactOptions}
              mode={s.reactMode === 'qianggang' ? 'qianggang' : 'react'}
              onChoose={game.humanReact}
              onPass={game.humanPass} />
          )}
          {selfOptions.length > 0 && (
            <ActionPanel
              options={selfOptions}
              mode="self"
              onChoose={game.humanSelfAction}
              onPass={game.humanPassSelf} />
          )}

          {(s.historyIndex > 0 || s.historyIndex < s.history.length - 1) && (
            <div className="action-undo-redo">
              {s.historyIndex > 0 && (
                <button className="action-btn action-undo" onClick={game.undo} title={t('undo.title')}>{t('undo.btn')}</button>
              )}
              {s.historyIndex < s.history.length - 1 && (
                <button className="action-btn action-redo" onClick={game.redo} title={t('redo.title')}>{t('redo.btn')}</button>
              )}
            </div>
          )}

          {s.phase === 'gameover' && (
            <div className="sandbox-result">
              {t('sandbox.end', { result: s.isDraw ? t('phase.draw2') : t('phase.win', { seat: seatName(s.winner!) }) })}
            </div>
          )}
        </div>
      )}

      {!started && (
        <div className="sandbox-tip">{t('sandbox.tip')}</div>
      )}
    </div>
  );
}