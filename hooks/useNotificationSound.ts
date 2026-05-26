"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "fb_admin_sound_enabled";

/**
 * Som de notificacao gerado via Web Audio API.
 * Nao precisa baixar arquivo .mp3 - geramos o beep dinamicamente.
 *
 * Preferencia (ligado/desligado) eh persistida em localStorage.
 */
export function useNotificationSound() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "0") setEnabled(false);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((cur) => {
      const next = !cur;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (kind: "default" | "money" | "alert" = "default") => {
      if (!enabled || typeof window === "undefined") return;
      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          if (!Ctx) return;
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        // Browsers (Chrome especialmente) suspendem o context ate o primeiro gesto.
        // Tenta resumir best-effort.
        if (ctx.state === "suspended") {
          void ctx.resume().catch(() => undefined);
        }

        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        const playTone = (
          freq: number,
          start: number,
          duration: number
        ) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          osc.connect(gain);
          osc.start(now + start);
          osc.stop(now + start + duration);
        };

        if (kind === "money") {
          // 3 notas crescentes (cha-ching)
          playTone(880, 0, 0.1);
          playTone(1175, 0.08, 0.12);
          playTone(1568, 0.18, 0.18);
        } else if (kind === "alert") {
          // 2 beeps urgentes
          playTone(660, 0, 0.12);
          playTone(660, 0.18, 0.12);
        } else {
          // Beep simples (cadastro/sala/mensagem)
          playTone(880, 0, 0.12);
          playTone(1175, 0.1, 0.12);
        }
      } catch {
        // ignore - som eh best-effort
      }
    },
    [enabled]
  );

  return { enabled, toggle, play };
}
