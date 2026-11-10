import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ReaderSnapshot, StoryBundle } from "../../contracts/story.ts";
import { CloseButton } from "../../shared/CloseButton.tsx";
import { rewardChanges } from "./rewards.ts";
import type { Reward } from "./rewards.ts";

type Entry = { id: number; reward: Reward };
type Player = Parameters<typeof rewardChanges>[0];

/**
 * Rewards since the last shown state. A fight, a check or a combat ending keeps its window
 * first: what it gave appears once the window closes. Restored pages (load, Back) show nothing.
 */
export function useRewards(state: ReaderSnapshot, bundle: StoryBundle) {
  const shown = useRef<Player | null>(null);
  const next = useRef(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const { character, game, restored } = state;
  useEffect(() => {
    if (!character || !game) {
      shown.current = null;
      return;
    }
    const windowOpen = game.combat || game.pendingCheck || game.lastResult?.outcome;
    if (restored || !shown.current) shown.current = { character, game };
    else if (!windowOpen) {
      const fresh = rewardChanges(shown.current, { character, game }, bundle);
      shown.current = { character, game };
      if (fresh.length)
        setEntries((list) => [...list, ...fresh.map((reward) => ({ id: ++next.current, reward }))]);
    }
  }, [character, game, restored, bundle]);
  const dismiss = (id: number) => setEntries((list) => list.filter((entry) => entry.id !== id));
  return { entries, dismiss };
}

/** Oldest first; CSS shows as many as fit, the others wait (their timer starts when shown). */
export function RewardNotifications({
  entries,
  dismiss,
  style,
}: ReturnType<typeof useRewards> & { style: CSSProperties }) {
  const { t } = useTranslation();
  return (
    <div
      className="reward-notifications"
      role="status"
      aria-label={t("rewards.label")}
      style={style}
    >
      {entries.map(({ id, reward }) => {
        const { icon, title, detail } = describe(reward, t);
        const close = () => dismiss(id);
        return (
          <article key={id} className="reward-card" data-kind={reward.kind}>
            <span className="reward-icon" aria-hidden="true">
              {icon}
            </span>
            <p className="reward-text">
              <strong>{title}</strong>
              <span>{detail}</span>
            </p>
            <CloseButton className="reward-close" label={t("rewards.dismiss")} onClick={close} />
            {/* 10 s, paused on hover and focus (CSS); its end dismisses the card. */}
            <span className="reward-timer" aria-hidden="true" onAnimationEnd={close} />
          </article>
        );
      })}
    </div>
  );
}

const icons = { item: "◆", ability: "✧", rank: "▲", xp: "✦", level: "★", hp: "✚" };

function describe(reward: Reward, t: TFunction) {
  const icon = icons[reward.kind];
  if ("name" in reward)
    return {
      icon,
      title: reward.name,
      detail: t(`rewards.${reward.kind}`, { rank: "rank" in reward ? reward.rank : 0 }),
    };
  return {
    icon,
    title: t(`rewards.${reward.kind}.title`),
    detail: t(`rewards.${reward.kind}.detail`, { count: reward.count }),
  };
}
