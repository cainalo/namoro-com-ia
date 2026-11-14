import { useCallback, useEffect, useRef, useState } from "react";
import { useOnlineGame } from "@/components/OnlineGameHost";
import { drawPile, loadPrivate, setPrivate } from "@/lib/online-game";

type PrivateHand<T> = { dealId?: string; hand?: T[] };

/**
 * Mão privada da pessoa atual numa partida online. Nunca contém a mão da outra
 * pessoa: as peças/cartas vêm do monte embaralhado no servidor.
 */
export function useOnlineHand<T>(dealId: string | null, dealCount: number) {
  const ctx = useOnlineGame();
  const matchId = ctx?.match.id ?? null;
  const userId = ctx?.userId ?? null;
  const [hand, setHandState] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dealing = useRef<string | null>(null);

  useEffect(() => {
    if (!matchId || !userId || !dealId) return;
    let alive = true;
    void (async () => {
      const stored = await loadPrivate<PrivateHand<T>>(matchId, userId);
      if (!alive) return;
      if (stored.data?.dealId === dealId && Array.isArray(stored.data.hand)) {
        setHandState(stored.data.hand);
        return;
      }
      if (dealing.current === dealId) return;
      dealing.current = dealId;
      setHandState(null);
      const drawn = await drawPile(matchId, dealCount, dealId, true);
      if (!alive) return;
      if (drawn.error) {
        dealing.current = null;
        setError("Não foi possível receber suas peças. Reabra a partida.");
        return;
      }
      setHandState(((drawn.data as PrivateHand<T>)?.hand ?? []) as T[]);
    })();
    return () => {
      alive = false;
    };
  }, [dealCount, dealId, matchId, userId]);

  const setHand = useCallback(
    async (next: T[]) => {
      if (!matchId || !dealId) return false;
      const saved = await setPrivate(matchId, { dealId, hand: next });
      if (saved.error) {
        setError("Não foi possível salvar sua mão.");
        return false;
      }
      setHandState(next);
      return true;
    },
    [dealId, matchId],
  );

  const draw = useCallback(
    async (count: number) => {
      if (!matchId || !dealId) return null;
      const drawn = await drawPile(matchId, count, dealId, true);
      if (drawn.error) {
        setError("Não foi possível comprar agora.");
        return null;
      }
      const next = ((drawn.data as PrivateHand<T>)?.hand ?? []) as T[];
      setHandState(next);
      return next;
    },
    [dealId, matchId],
  );

  return { hand, setHand, draw, error };
}
