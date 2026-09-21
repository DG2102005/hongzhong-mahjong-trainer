// 根组件: 麻将桌面布局与交互
// 顶部导航: 对弈 / 收藏复盘; 侧栏: 信息 / 辅助
import { useMemo, useState, useCallback } from 'react';
import { useGame } from './hooks/useGame';
import { HUMAN_SEAT } from './game/constants';
import { tileCode, tileName } from './game/types';
import { useLocale, setLocale, t, seatName } from './i18n';
import { PlayerSeat } from './components/PlayerSeat';
import { CenterTable } from './components/CenterTable';
import { HandRow } from './components/HandRow';
import { MeldArea } from './components/MeldArea';
import { ActionPanel } from './components/ActionPanel';
import { GameInfo } from './components/GameInfo';
import { AdvisorTab } from './components/AdvisorTab';
import { HandPicker } from './components/HandPicker';
import { ReviewReplay } from './components/ReviewReplay';
import { FreeDrawBar } from './components/FreeDrawBar';
import { loadSavedRounds } from './game/savedRounds';
import type { SavedRound } from './game/savedRounds';
import { saveRound } from './game/savedRounds';
import { isPro, tryProFeature, getTrialUsed, TRIAL_LIMIT } from './pay/license';
import { PaywallModal } from './pay/PaywallModal';

type View = 'game' | 'review';
type SideTab = 'info' | 'advisor';

function App() {
  const game = useGame();
  const locale = useLocale();
  const [view, setView] = useState<View>('game');
  const [sideTab, setSideTab] = useState<SideTab>('info');
  const [savedRounds, setSavedRounds] = useState<SavedRound[]>(() => loadSavedRounds());
  const [replayHint, setReplayHint] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pro, setPro] = useState<boolean>(() => isPro());
  const [payFeature, setPayFeature] = useState<string | null>(null);

  // 切回对弈时同步最新积分; 切到复盘时刷新收藏列表
  const switchView = (v: View) => {
    if (v === 'review' && !tryProFeature()) { setPayFeature('replay'); return; }
    if (v === 'game') game.scoreReload();
    if (v === 'review') setSavedRounds(loadSavedRounds());
    setView(v);
  };

  // 收藏任意牌局(对弈中可随时收藏当前牌型 / 终局收藏本局; label 可选自定义)
  const handleSaveRound = useCallback((label?: string) => {
    const rec = saveRound(game.state, label);
    if (rec) {
      setSavedRounds(loadSavedRounds());
      setReplayHint(t('hint.saved', { round: rec.round, label: label ? t('save.handLabel') : rec.resultLabel }));
    } else {
      setReplayHint(t('hint.notStarted'));
    }
    setTimeout(() => setReplayHint(''), 2500);
  }, [game.state]);

  const {
    state, freeDraw, startGame, startCustomGame, newRound, humanDiscard, humanChooseDraw, humanReact, humanPass, humanSelfAction, humanPassSelf,
    scoreState, scoreResult, scoreGangEvent, scoreResetRound, scoreResetAll,
  } = game;

  const human = state.players[HUMAN_SEAT];
  const started = state.phase !== 'idle';
  const gameOver = state.phase === 'gameover';

  const canDiscard =
    started && !gameOver &&
    state.currentSeat === HUMAN_SEAT &&
    state.phase === 'discard';

  const reactOptions = state.phase === 'react' ? state.pendingOptions : [];
  const selfOptions =
    state.currentSeat === HUMAN_SEAT && state.phase === 'discard' && state.selfActions.length > 0
      ? state.selfActions
      : [];

  // 已见牌 = 各家已舍出 + 副露明牌(扣除剩余张数用)
  const seenTiles = useMemo(() => {
    const tiles: import('./game/types').Tile[] = [];
    for (const p of state.players) {
      for (const d of p.discards) tiles.push(d);
      for (const m of p.melds) for (const mt of m.tiles) tiles.push(mt);
    }
    return tiles;
  }, [state]);

  // 其他3家手里的牌的总和(摸牌概率分母一部分)
  const opponentsHeld = state.players.reduce(
    (sum, p) => sum + (p.seat === HUMAN_SEAT ? 0 : p.hand.length),
    0,
  );

  // 当前可碰的牌(仅在响应他人出牌、且人类持有对子时)
  const pendingPeng = useMemo(() => {
    if (state.phase !== 'react' || state.reactMode === 'qianggang') return null;
    const opt = state.pendingOptions.find((o) => o.type === 'peng');
    return opt?.tile ? { code: tileCode(opt.tile), name: tileName(opt.tile) } : null;
  }, [state.phase, state.reactMode, state.pendingOptions]);

  // 撤销/重do 状态
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="brand">
          <span className="brand-mark">中</span>
          <span className="brand-name">{t('brand.name')}</span>
          <span className="brand-sub">{t('brand.sub')}</span>
        </h1>
        <div className="header-controls">
          <nav className="nav-switch">
            <button
              className={`nav-btn ${view === 'game' ? 'active' : ''}`}
              onClick={() => switchView('game')}
            >
              {t('nav.game')}
            </button>
            <button
              className={`nav-btn ${view === 'review' ? 'active' : ''}`}
              onClick={() => switchView('review')}
            >
              {t('nav.review')}
            </button>
          </nav>
          <div className="lang-switch" title="Language">
            <button
              className={locale === 'zh' ? 'active' : ''}
              onClick={() => setLocale('zh')}
            >中</button>
            <button
              className={locale === 'en' ? 'active' : ''}
              onClick={() => setLocale('en')}
            >EN</button>
          </div>
          <button
            className={`pro-badge${pro ? ' on' : ''}`}
            onClick={() => setPayFeature('')}
            title={pro ? 'Pro' : t('pay.title.gen')}
          >
            {pro ? '★ Pro' : 'Pro'}
          </button>
          {view === 'game' && !started && (
            <>
              <button className="start-btn" onClick={startGame}>{t('btn.start')}</button>
              <button className="start-btn ghost" onClick={() => { if (!tryProFeature()) { setPayFeature('custom'); return; } setShowPicker(true); }}>{t('btn.custom')}</button>
            </>
          )}
          {view === 'game' && started && !gameOver && (
            <button className="start-btn ghost" onClick={() => { if (!tryProFeature()) { setPayFeature('save'); return; } handleSaveRound(t('save.ongoing')); }}>
              {t('btn.saveHand')}
            </button>
          )}
          {view === 'game' && gameOver && (
            <>
              <button className="start-btn" onClick={newRound}>{t('btn.newRound')}</button>
              <button className="start-btn ghost" onClick={() => { if (!tryProFeature()) { setPayFeature('custom'); return; } setShowPicker(true); }}>{t('btn.custom')}</button>
              <button className="start-btn ghost" onClick={() => { if (!tryProFeature()) { setPayFeature('save'); return; } handleSaveRound(); }}>{t('btn.saveRound')}</button>
            </>
          )}
        </div>
      </header>

      {replayHint && <div className="replay-hint">{replayHint}</div>}

      {view === 'review' ? (
        <div className="review-page">
          <ReviewReplay
            rounds={savedRounds}
            onReload={() => setSavedRounds(loadSavedRounds())}
          />
        </div>
      ) : (
        <div className="main-layout">
          {/* 牌桌区 */}
          <div className="table-area">
            {freeDraw && <div className="freedraw-banner">{t('freedraw.banner', { n: state.deck.length })}</div>}
            {started && state.players[3] && (
              <div className="seat-zone zone-top">
                <PlayerSeat player={state.players[3]} state={state} position="top" />
              </div>
            )}
            <div className="seat-row">
              <div className="seat-zone zone-left">
                {started && state.players[2] && (
                  <PlayerSeat player={state.players[2]} state={state} position="left" />
                )}
              </div>
              <div className="center-area">
                {started ? (
                  <CenterTable state={state} />
                ) : (
                  <div className="welcome">
                    <div className="welcome-title">{t('welcome.title')}</div>
                    <div className="welcome-desc">{t('welcome.desc')}</div>
                    <div className="welcome-features">
                      {t('welcome.features')}
                    </div>
                    <div className="welcome-actions">
                      <button className="start-btn big" onClick={startGame}>{t('btn.start')}</button>
                      <button className="start-btn big ghost" onClick={() => { if (!tryProFeature()) { setPayFeature('custom'); return; } setShowPicker(true); }}>{t('btn.custom')}</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="seat-zone zone-right">
                {started && state.players[0] && (
                  <PlayerSeat player={state.players[0]} state={state} position="right" />
                )}
              </div>
            </div>
            <div className="seat-zone zone-bottom">
              {started && human && (
                <div className="human-seat">
                  <div className="seat-header">
                    <span className="seat-name">{seatName(HUMAN_SEAT)} · {human.name}</span>
                    {human.isDealer && <span className="dealer-mark">{t('seat.dealer')}</span>}
                    {state.currentSeat === HUMAN_SEAT && state.phase === 'discard' && (
                      <span className="turn-indicator">{t('turn.discard')}</span>
                    )}
                  </div>
                  <MeldArea melds={human.melds} size={30} />
                  {freeDraw && state.phase === 'draw' && state.currentSeat === HUMAN_SEAT && (
                    <FreeDrawBar deck={state.deck} onPick={humanChooseDraw} />
                  )}
                  <HandRow
                    hand={human.hand}
                    melds={human.melds}
                    onDiscard={humanDiscard}
                    interactive={canDiscard}
                    drawnTileId={state.drawnTileId}
                  />
                  {selfOptions.length > 0 && (
                    <ActionPanel
                      options={selfOptions}
                      mode="self"
                      onChoose={humanSelfAction}
                      onPass={humanPassSelf} />
                  )}
                  {reactOptions.length > 0 && (
                    <ActionPanel
                      options={reactOptions}
                      mode={state.reactMode === 'qianggang' ? 'qianggang' : 'react'}
                      onChoose={humanReact}
                      onPass={humanPass} />
                  )}
                  {/* 撤销/重do 按钮 */}
                  {(canUndo || canRedo) && (
                    <div className="action-undo-redo">
                      {canUndo && (
                        <button
                          className="action-btn action-undo"
                          onClick={game.undo}
                          title={t('undo.title')}
                        >
                          {t('undo.btn')}
                        </button>
                      )}
                      {canRedo && (
                        <button
                          className="action-btn action-redo"
                          onClick={game.redo}
                          title={t('redo.title')}
                        >
                          {t('redo.btn')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 侧栏: 信息 / 辅助 */}
          <aside className="side-panel">
            <div className="tab-bar">
              <button className={`tab ${sideTab === 'info' ? 'active' : ''}`} onClick={() => setSideTab('info')}>
                {t('tab.info')}
              </button>
              <button className={`tab ${sideTab === 'advisor' ? 'active' : ''}`} onClick={() => { if (!tryProFeature()) { setPayFeature('advisor'); return; } setSideTab('advisor'); }}>
                {t('tab.advisor')}
              </button>
            </div>
            <div className="tab-content">
              {sideTab === 'info' ? (
                started ? (
                  <GameInfo
                    state={state}
                    onNewRound={newRound}
                    scoreState={scoreState}
                    scoreResult={scoreResult}
                    scoreGangEvent={scoreGangEvent}
                    onResetRound={scoreResetRound}
                    onResetAll={scoreResetAll}
                  />
                ) : (
                  <div className="game-idle-card">
                    <div className="idle-card-title">{t('idle.title')}</div>
                    <ul className="idle-card-list">
                      <li>{t('idle.r1')}</li>
                      <li>{t('idle.r2')}</li>
                      <li>{t('idle.r3')}</li>
                    </ul>
                    <button className="start-btn" onClick={startGame}>{t('btn.start')}</button>
                  </div>
                )
              ) : (
                started && human ? (
                  <AdvisorTab
                    hand={human.hand}
                    meldCount={human.melds.length}
                    canDiscard={canDiscard}
                    onDiscard={humanDiscard}
                    seenTiles={seenTiles}
                    deckRemaining={state.deck.length}
                    opponentsHeld={opponentsHeld}
                    pendingPeng={pendingPeng}
                  />
                ) : (
                  <div className="empty-panel">{t('advisor.empty')}</div>
                )
              )}
            </div>
          </aside>
        </div>
      )}

      {showPicker && (
        <HandPicker
          onClose={() => setShowPicker(false)}
          onStart={(codes) => {
            startCustomGame(codes);
            setShowPicker(false);
          }}
        />
      )}

      <PaywallModal
        feature={payFeature}
        pro={pro}
        onActivated={() => setPro(true)}
        onDeactivated={() => setPro(false)}
        onClose={() => setPayFeature(null)}
      />
    </div>
  );
}

export default App;