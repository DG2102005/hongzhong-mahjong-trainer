// 轻量级 i18n: 零依赖, 支持中/英即时切换(language 记忆存 localStorage)
// 本 fork(redcenter-en) 默认英文, 中文为全量兜底
import { useEffect, useState } from 'react';
import { zhDict, enDict } from './dicts';

export type Locale = 'zh' | 'en';

const LOCALE_KEY = 'redcenter.locale';
export const DEFAULT_LOCALE: Locale = 'en';

let current: Locale = (() => {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    return saved === 'zh' || saved === 'en' ? saved : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
})();

const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(l: Locale) {
  if (l === current) return;
  current = l;
  try {
    localStorage.setItem(LOCALE_KEY, l);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

// 语言切换时触发全组件重渲染的唯一订阅入口
export function useLocale(): Locale {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((x) => x + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return current;
}

const dicts: Record<Locale, Record<string, string>> = { zh: zhDict, en: enDict };

// 取译文; 缺失时回退中文/键名
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = dicts[current] ?? enDict;
  let out = dict[key] ?? zhDict[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      out = out.split(`{${k}}`).join(String(vars[k]));
    }
  }
  return out;
}

// 座位方位名: 东南西北 / East South West North
const SEAT_ZH = ['东', '南', '西', '北'];
const SEAT_EN = ['East', 'South', 'West', 'North'];

export function seatName(seatIdx: number): string {
  const list = current === 'en' ? SEAT_EN : SEAT_ZH;
  return list[seatIdx] ?? String(seatIdx);
}

// 单张牌名(本地化, 用于提示/列表展示)
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CN_SUIT: Record<string, string> = { m: '万', p: '筒', s: '条' };
const CN_HONOR = ['东', '南', '西', '北', '中', '发', '白'];
const EN_SUIT: Record<string, string> = { m: 'Characters', p: 'Dots', s: 'Bamboo' };
const EN_HONOR = ['East', 'South', 'West', 'North', 'Zhong (wild)', 'Green Dragon', 'White Dragon'];

export function tileLabel(tile: { suit: string; rank: number }): string {
  if (tile.suit === 'z') {
    const list = current === 'en' ? EN_HONOR : CN_HONOR;
    return list[tile.rank - 1] ?? String(tile.rank);
  }
  if (current === 'en') {
    const s = EN_SUIT[tile.suit] ?? tile.suit;
    return `${tile.rank} ${s}`;
  }
  return `${CN_NUM[tile.rank - 1] ?? tile.rank}${CN_SUIT[tile.suit] ?? tile.suit}`;
}