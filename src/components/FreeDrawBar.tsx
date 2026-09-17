// 自由进牌(演绎模式): 轮到人类摸牌时, 从剩余牌墙中自由选一张摸入
import { useMemo } from 'react';
import { Tile } from './Tile';
import { t, tileLabel } from '../i18n';
import type { Tile as TileType } from '../game/types';
import { sortHand } from '../game/sort';

interface Props {
  deck: TileType[];
  onPick: (tileId: number) => void;
}

export function FreeDrawBar({ deck, onPick }: Props) {
  const sorted = useMemo(() => sortHand(deck), [deck]);

  return (
    <div className="freedraw">
      <div className="freedraw-title">
        {t('freedraw.title', { n: deck.length })}
      </div>
      <div className="freedraw-tiles">
        {sorted.map((tl) => (
          <div key={tl.id} className="freedraw-tile" onClick={() => onPick(tl.id)} title={t('freedraw.pick', { tile: tileLabel(tl) })}>
            <Tile tile={tl} size={30} />
          </div>
        ))}
      </div>
    </div>
  );
}