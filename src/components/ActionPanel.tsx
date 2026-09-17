// 操作面板: 碰/杠/胡/放弃 + 暗杠/补杠 + 抢杠
import type { ActionOption } from '../game/types';
import { t } from '../i18n';

interface Props {
  options: ActionOption[];
  mode: 'react' | 'self' | 'qianggang'; // react=他人出牌反应, self=自摸操作, qianggang=抢杠反应
  onChoose: (option: ActionOption) => void;
  onPass: () => void;
}

const ACTION_LABEL: Record<string, string> = {
  peng: 'act.peng',
  minggang: 'act.minggang',
  angang: 'act.angang',
  bugang: 'act.bugang',
  hu: 'act.hu',
};

export function ActionPanel({ options, mode, onChoose, onPass }: Props) {
  if (options.length === 0) return null;
  // 去重(同类型只显示一个按钮)
  const seen = new Set<string>();
  const unique = options.filter((o) => {
    const k = o.type;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // self 模式下, 若包含 hu 选项(摸到能胡的牌), 也显示"放弃胡"按钮
  // 让玩家选择不胡继续打牌(可多次放弃后胡)
  const showSelfPass = mode === 'self' && options.some((o) => o.type === 'hu');

  return (
    <div className="action-panel">
      <div className="action-prompt">
        {mode === 'qianggang' ? t('act.prompt.qianggang') : mode === 'react' ? t('act.prompt.react') : t('act.prompt.self')}
      </div>
      <div className="action-buttons">
        {unique.map((o, i) => (
          <button
            key={i}
            className={`action-btn action-${o.type}`}
            onClick={() => onChoose(o)}
          >
            {o.type === 'hu' && mode === 'qianggang' ? t('act.rob') : t(ACTION_LABEL[o.type] || o.type)}
          </button>
        ))}
        {(mode === 'react' || mode === 'qianggang' || showSelfPass) && (
          <button className="action-btn action-pass" onClick={onPass}>
            {t('act.pass')}
          </button>
        )}
      </div>
    </div>
  );
}
