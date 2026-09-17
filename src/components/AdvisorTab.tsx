// 侧栏辅助决策面板 — 基于 skill 引擎（轻量，非 advisor）
// 可视化：打哪张 → 计算结果(几进听) → 可听/可进 N 门 N 张 → 进张牌面
import { useMemo } from 'react';
import type { Tile } from '../game/types';
import { tileCode, isHongZhong } from '../game/types';
import {
  analyzeHand, analyzePartialHand, codeName, toSkillCode,
  drawProbability, simulatePeng,
  type SkillAnalysis, type SkillScenario,
} from '../game/skillEngine';
import { Tile as TileComp } from './Tile';
import { t } from '../i18n';

// ─── 工具 ──────────────────────────────────

export function codeToTile(code: string): Tile {
  const suit = code[0] as Tile['suit'];
  const rank = parseInt(code.slice(1), 10);
  return { id: -1, suit, rank };
}

export function shantenText(s: number): string {
  if (s < 0) return t('adv.wonWord');
  if (s === 0) return t('adv.tingWord');
  return `${s}${t('adv.away')}`;
}

// 概率展示: 百分比一位小数, 无数据显示占位
export function fmtPct(p: number | null): string {
  if (p === null || !Number.isFinite(p)) return '—';
  return (p * 100).toFixed(1) + '%';
}

// ─── 场景卡片列表（供侧栏 / Simulator 弹层复用） ──

interface ScenariosProps {
  analysis: SkillAnalysis;
  onPick?: (discardCode: string) => void; // 点击"打出此牌"
  probFor?: (tileCount: number) => number | null; // 摸牌概率计算器(tileCount → 概率)
}

export function AdvisorScenarios({ analysis, onPick, probFor }: ScenariosProps) {
  // 红中不可打出（与游戏规则一致），排除后按引擎排序展示
  const scenarios = useMemo(
    () => analysis.scenarios.filter((s) => s.discardCode !== 'z5'),
    [analysis],
  );

  return (
    <div className="adv">
      {/* 手牌预览 */}
      <div className="adv-hand">
        <div className="adv-hand-label">{t('adv.hand', { n: analysis.handCodes.length })}</div>
        <div className="adv-hand-tiles">
          {analysis.handCodes.map((c, i) => (
            <TileComp key={i} tile={codeToTile(c)} size={26} />
          ))}
        </div>
      </div>

      {/* 场景卡片 */}
      <div className="adv-scenarios">
        {scenarios.length === 0 && (
          <div className="adv-empty">{t('adv.empty')}</div>
        )}
        {scenarios.slice(0, 6).map((s, i) => (
          <ScenarioCard key={s.discardCode} scenario={s} best={i === 0} onPick={onPick} probFor={probFor} />
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario, best, onPick, probFor,
}: {
  scenario: SkillScenario;
  best: boolean;
  onPick?: (code: string) => void;
  probFor?: (tileCount: number) => number | null;
}) {
  const { discardCode, discardName, shantenAfter, isTenpai, tiles, categoryCount, tileCount } = scenario;
  const prob = probFor ? probFor(tileCount) : null;
  return (
    <div className={`adv-card ${best ? 'adv-card-best' : ''}`}>
      {/* 左侧: 打出的牌 */}
      <div className="adv-card-left">
        <div className="adv-card-label">{best ? t('adv.discardBest') : t('adv.discard')}</div>
        <TileComp tile={codeToTile(discardCode)} size={40} />
        <div className="adv-card-name">{discardName}</div>
      </div>

      {/* 右侧: 分析结果 */}
      <div className="adv-card-right">
        <div className="adv-card-result">
          {t('adv.result')}<b className={shantenAfter === 0 ? 'adv-ting' : ''}>{shantenText(shantenAfter)}</b>
        </div>
        <div className="adv-card-ting">
          {isTenpai ? t('adv.waitPrefix') : t('adv.improvePrefix')}
          <b>{categoryCount}</b>{t('adv.unitTypes')}<b>{tileCount}</b>{t('adv.unitTiles')}
        </div>
        <div className="adv-card-prob">
          {t('adv.prob')}<b>{fmtPct(prob)}</b>
        </div>
        <div className="adv-card-tiles">
          {tiles.map((t, j) => (
            <div key={j} className="adv-card-tile">
              <TileComp tile={codeToTile(t.code)} size={26} />
              <span className="adv-card-remain">{t.remain}</span>
            </div>
          ))}
        </div>
        {onPick && (
          <button className="adv-card-btn" onClick={() => onPick(discardCode)}>
            {t('adv.playBtn')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 侧栏面板（绑定对弈局人类手牌） ──

interface Props {
  hand: Tile[];            // 人类手牌
  meldCount: number;       // 副露数
  canDiscard: boolean;     // 当前可出牌
  onDiscard: (tileId: number) => void;
  seenTiles?: Tile[];      // 已见牌(各家舍牌/副露), 用于扣除剩余张数
  deckRemaining?: number;  // 剩余牌(墙内), 用于摸牌概率
  opponentsHeld?: number;  // 其他3家手里的牌的总和, 用于摸牌概率
  pendingPeng?: { code: string; name: string } | null; // 当前可碰的牌(可能无)
}

export function AdvisorTab({ hand, meldCount, canDiscard, onDiscard, seenTiles, deckRemaining, opponentsHeld, pendingPeng }: Props) {
  const expectLen = 14 - 3 * meldCount;

  // 已见牌计数(skill码): 各家已舍出的 + 副露明牌; 自己手牌已含在分析中
  const seenCounts = useMemo(() => {
    const sc: Record<number, number> = {};
    if (!seenTiles) return sc;
    for (const t of seenTiles) {
      const k = toSkillCode(tileCode(t));
      sc[k] = (sc[k] ?? 0) + 1;
    }
    return sc;
  }, [seenTiles]);

  // 摸牌概率计算器: 可进张数/(剩余牌+其他3家手里的牌) —— 有效进张均匀分布在隐藏牌池
  const probFor = (tileCount: number): number | null => {
    if (deckRemaining == null || opponentsHeld == null) return null;
    return drawProbability(tileCount, deckRemaining, opponentsHeld);
  };

  const { status, analysis, partial } = useMemo(() => {
    const codes = hand.map((t) => (isHongZhong(t) ? 'z5' : tileCode(t)));
    if (codes.length === expectLen) {
      try {
        const a = analyzeHand(codes, meldCount, seenCounts);
        return { status: 'full' as const, analysis: a, partial: null };
      } catch {
        return { status: 'empty' as const, analysis: null, partial: null };
      }
    }
    if (codes.length === expectLen - 1) {
      const p = analyzePartialHand(codes, meldCount, seenCounts);
      return { status: 'partial' as const, analysis: null, partial: p };
    }
    return { status: 'empty' as const, analysis: null, partial: null };
  }, [hand, expectLen, meldCount, seenCounts]);

  // 碰牌推演: 持有对子且他人打出 → 碰掉2张后(melds+1)对各候选舍牌推演, 取最优
  const pengBest = useMemo(() => {
    if (status !== 'partial' || !pendingPeng) return null;
    const codes = hand.map((t) => (isHongZhong(t) ? 'z5' : tileCode(t)));
    try {
      const a = simulatePeng(codes, pendingPeng.code, meldCount, seenCounts);
      return a.scenarios[0] ?? null;
    } catch {
      return null;
    }
  }, [status, pendingPeng, hand, meldCount, seenCounts]);

  const handlePick = (discardCode: string): void => {
    if (!canDiscard) return;
    const tile = hand.find((t) => (isHongZhong(t) ? 'z5' : tileCode(t)) === discardCode);
    if (tile) onDiscard(tile.id);
  };

  // 推荐展示取第一个非红中候选（红中不可打出）
  const recommendCode = useMemo(
    () => analysis?.scenarios.find((s) => s.discardCode !== 'z5')?.discardCode ?? null,
    [analysis],
  );

  return (
    <div className="adv-tab">
      <div className="adv-tab-title">
        {t('adv.title')}
        <span className="adv-tab-note">{t('adv.note')}</span>
      </div>

      {status === 'empty' && (
        <div className="empty-panel">{t('adv.emptyPanel')}</div>
      )}

      {status === 'full' && analysis && (
        <>
          <div className="adv-summary">
            <span>
              {t('adv.current')}<b className={analysis.isWinNow ? 'adv-win-txt' : ''}>{analysis.isWinNow ? t('adv.won') : shantenText(analysis.currentShanten)}</b>
            </span>
            {!analysis.isWinNow && recommendCode && (
              <span className="adv-summary-rec">
                {t('adv.rec', { tile: codeName(recommendCode) })}
              </span>
            )}
          </div>
          {analysis.isWinNow ? (
            <div className="adv-win">{t('adv.winMsg')}</div>
          ) : (
            <AdvisorScenarios analysis={analysis} onPick={canDiscard ? handlePick : undefined} probFor={probFor} />
          )}
        </>
      )}

      {status === 'partial' && partial && (
        <>
          <div className="adv-summary">
            <span>
              {t('adv.partialCurrent')}<b className={partial.isTenpai ? 'adv-ting' : ''}>{shantenText(partial.shanten)}</b>
            </span>
            <span className="adv-summary-rec">
              {partial.isTenpai ? t('adv.huPrefix') : t('adv.improvePrefix')}
              <b>{partial.tiles.length}</b>{t('adv.unitTypes')}<b>{partial.tileCount}</b>{t('adv.unitTiles')}
              {' · '}{t('adv.prob')}{fmtPct(probFor(partial.tileCount))}
            </span>
            <div className="adv-card-tiles" style={{ marginTop: 6 }}>
              {partial.tiles.map((t, j) => (
                <div key={j} className="adv-card-tile">
                  <TileComp tile={codeToTile(t.code)} size={26} />
                  <span className="adv-card-remain">{t.remain}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 碰牌推演对比 */}
          {pendingPeng && pengBest && (
            <PengCompareBlock
              pengName={pendingPeng.name}
              partial={partial}
              pengBest={pengBest}
              probFor={probFor}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── 碰牌推演对比块 ─────────────────────────

function PengCompareBlock({
  pengName, partial, pengBest, probFor,
}: {
  pengName: string;
  partial: { shanten: number; isTenpai: boolean; tileCount: number };
  pengBest: SkillScenario;
  probFor: (tileCount: number) => number | null;
}) {
  // 对比: 向听更低 或同向听但进张更多 → 碰牌占优
  const pongProb = probFor(pengBest.tileCount);
  const stayProb = probFor(partial.tileCount);
  const improved = pengBest.shantenAfter < partial.shanten;
  const sameBetter =
    !improved &&
    pengBest.shantenAfter === partial.shanten &&
    pengBest.tileCount > partial.tileCount;
  const verdict = improved
    ? t('adv.peng.betterLower', { tile: pengName, from: shantenText(partial.shanten), to: shantenText(pengBest.shantenAfter) })
    : sameBetter
      ? t('adv.peng.betterSame', { tile: pengName })
      : t('adv.peng.noadv', { tile: pengName });

  return (
    <div className="adv-peng">
      <div className="adv-peng-title">{t('adv.peng.title', { tile: pengName })}</div>

      <div className="adv-peng-row">
        <div className="adv-peng-head">{t('adv.peng.head', { tile: pengName })}<b>{pengBest.discardName}</b></div>
        <div className="adv-peng-line">
          {t('adv.result')}<b className={pengBest.shantenAfter === 0 ? 'adv-ting' : ''}>{shantenText(pengBest.shantenAfter)}</b>
          {' · '}
          {pengBest.isTenpai ? t('adv.waitPrefix') : t('adv.improvePrefix')}
          <b>{pengBest.categoryCount}</b>{t('adv.unitTypes')}<b>{pengBest.tileCount}</b>{t('adv.unitTiles')}
          {' · '}{t('adv.prob')}<b>{fmtPct(pongProb)}</b>
        </div>
      </div>

      <div className="adv-peng-row adv-peng-alt">
        <div className="adv-peng-head">{t('adv.peng.stay')}</div>
        <div className="adv-peng-line">
          {t('adv.current')}<b className={partial.isTenpai ? 'adv-ting' : ''}>{shantenText(partial.shanten)}</b>
          {' · '}{t('adv.stayTiles', { n: partial.tileCount })}
          {' · '}{t('adv.prob')}<b>{fmtPct(stayProb)}</b>
        </div>
      </div>

      <div className="adv-peng-verdict">{verdict}</div>
    </div>
  );
}
