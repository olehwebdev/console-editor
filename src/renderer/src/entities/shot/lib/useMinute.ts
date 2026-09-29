import { useSyncExternalStore } from 'react';

/** A minute, in milliseconds: how often "15 min ago" can change. */
const MINUTE = 60_000;

/** A clock that ticks every minute (while something shows ages), read as now to the minute: stable between ticks. */
const minuteClock = {
  subscribe(tick: () => void): () => void {
    const timer = setInterval(tick, MINUTE);
    return () => clearInterval(timer);
  },
  now(): number {
    return Math.floor(Date.now() / MINUTE) * MINUTE;
  },
};

/** The current time to the minute, re-rendering as it moves on: for ages such as "15 min ago". */
export function useMinute(): number {
  return useSyncExternalStore(minuteClock.subscribe, minuteClock.now);
}
