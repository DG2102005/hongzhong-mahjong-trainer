// gameEngine 自由进牌测试(复盘演绎用)
import { describe, it, expect } from 'vitest';
import { drawSpecificTile, drawTile } from '../gameEngine';
import type { GameState, PlayerState, Seat, Suit, Tile } from '../types';

function tile(id: number, code: string): Tile {
  return { id, suit: code[0] as Suit, rank: parseInt(code.slice(1), 10) };
}

function mkPlayer(seat: Seat, isHuman: boolean, handCodes: string[]): PlayerState {
  return {
    seat,
    name: `P${seat}`,
    isHuman,
    hand: handCodes.map((c, i) => ({ id: seat * 100 + i, suit: c[0] as Suit, rank: parseInt(c.slice(1), 10) })),
    melds: [],
    discards: [],
    isDealer: seat === 1,
    isRiichi: false,
  };
}

function mkState(deckCodes: string[], humanHand: string[]): GameState {
  return {
    deck: deckCodes.map((c, i) => tile(1000 + i, c)),
    wallTailIndex: 0,
    players: [
      mkPlayer(0, false, []),
      mkPlayer(1, true, humanHand),
      mkPlayer(2, false, []),
      mkPlayer(3, false, []),
    ],
    currentSeat: 1,
    banker: 1,
    phase: 'draw',
    lastDiscard: null,
    winner: null,
    isDraw: false,
    round: 1,
    log: [],
    pendingOptions: [],
    drawCount: 4,
    isFirstRound: false,
    selfActions: [],
    reactRemaining: [],
    discardSource: null,
    reactMode: null,
    qianggangVictim: null,
    qianggangTile: null,
    gangEvents: [],
    history: [],
    historyIndex: -1,
    drawnTileId: null,
    lastAdvice: null,
    lastMistake: null,
    review: null,
  };
}

describe('自由进牌 drawSpecificTile', () => {
  it('从牌墙任选一张摸入(非牌头), 该牌加入手牌尾并进入出牌阶段', () => {
    const st = mkState(['m1', 'm2', 'm3', 'p5', 'p6'], ['m1', 'p2', 'p3']);
    // 选中间第3张(m3, id=1002), 而非牌头 m1
    const next = drawSpecificTile(st, 1, 1002);
    expect(next.players[1].hand.map((t) => t.id)).toContain(1002);
    expect(next.drawnTileId).toBe(1002);
    expect(next.deck.map((t) => t.id)).toEqual([1000, 1001, 1003, 1004]);
    expect(next.players[1].hand.length).toBe(4);
    expect(next.phase).toBe('discard');
    expect(next.currentSeat).toBe(1);
  });

  it('自动摸牌 drawTile 仍只取牌头', () => {
    const st = mkState(['m1', 'm2', 'm3'], ['p2', 'p3']);
    const next = drawTile(st, 1);
    expect(next.players[1].hand.map((t) => t.id)).toContain(1000);
    expect(next.drawnTileId).toBe(1000);
    expect(next.deck.map((t) => t.id)).toEqual([1001, 1002]);
  });

  it('待选牌不在牌墙中 → 原样返回', () => {
    const st = mkState(['m1', 'm2'], ['p2', 'p3']);
    const next = drawSpecificTile(st, 1, 9999);
    expect(next.deck.length).toBe(2);
    expect(next.players[1].hand.length).toBe(2);
    expect(next.phase).toBe('draw');
  });

  it('非人类座位也可以自由进牌(引擎层通用)', () => {
    const st = mkState(['s5', 's6', 's7'], ['p2', 'p3']);
    st.currentSeat = 0;
    const next = drawSpecificTile(st, 0, 1001);
    expect(next.players[0].hand.map((t) => t.id)).toContain(1001);
    expect(next.drawnTileId).toBe(1001);
    expect(next.deck.length).toBe(2);
  });
});