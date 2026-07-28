'use client';

import { createContext, useContext, useId, useState, type ReactNode } from 'react';

/**
 * Coordinates the inline panels that share an action row (screen C4).
 *
 * Reply and Report each expand *in place*, replacing their trigger with a full-width panel
 * inside the row's flex container. Each owned its own open state and knew nothing of the
 * other, so opening both put two panels in one flex row and squeezed the second off the
 * screen. The same collision existed between the post's two report affordances (report the
 * question / report the handle).
 *
 * The rule: while one panel is open, its siblings' triggers are hidden. Hiding rather than
 * closing-the-other is deliberate — a member part-way through typing a report should not
 * lose it because they brushed "Reply", and a control that silently discards work is worse
 * than one that is briefly absent. The trigger returns as soon as the open panel is
 * cancelled or submitted.
 *
 * Outside a group the hook degrades to plain local state, so a panel used on its own still
 * works and nothing has to know whether it has siblings.
 */
const ExclusiveContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
} | null>(null);

/** Renders no DOM of its own — the row's flex layout is unaffected. */
export function ExclusivePanels({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ExclusiveContext.Provider value={{ openId, setOpenId }}>{children}</ExclusiveContext.Provider>
  );
}

export type ExclusivePanel = {
  /** This panel is the one showing. */
  isOpen: boolean;
  /** A sibling is open, so this panel's trigger should not render. */
  hidden: boolean;
  open: () => void;
  close: () => void;
};

export function useExclusivePanel(): ExclusivePanel {
  const id = useId();
  const group = useContext(ExclusiveContext);
  // Always called, so hook order stays stable; only used when there is no group.
  const [localOpen, setLocalOpen] = useState(false);

  if (!group) {
    return {
      isOpen: localOpen,
      hidden: false,
      open: () => setLocalOpen(true),
      close: () => setLocalOpen(false),
    };
  }

  return {
    isOpen: group.openId === id,
    hidden: group.openId !== null && group.openId !== id,
    open: () => group.setOpenId(id),
    close: () => group.setOpenId(null),
  };
}
