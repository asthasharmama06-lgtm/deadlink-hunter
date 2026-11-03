import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelScan, getScan, startScan } from '../services/scanService';
import type { ScanJob } from '../types/scan';

export function useScan() {
  const [job, setJob] = useState<ScanJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<number | undefined>(undefined);
  const busy = useRef(false);
  const polling = useRef(false);

  const stop = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearInterval(timer.current);
      timer.current = undefined;
    }
    polling.current = false;
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const start = useCallback(async (url: string) => {
    // Prevent duplicate scan requests.
    if (busy.current) return;

    busy.current = true;
    stop();
    setError(null);

    try {
      const first = await startScan({ url });
      setJob(first);

      if (first.status !== 'running' && first.status !== 'queued') {
        busy.current = false;
        return;
      }

      timer.current = window.setInterval(async () => {
        if (polling.current) return;

        polling.current = true;

        try {
          const next = await getScan(first.id);
          setJob(next);

          if (next.status !== 'running' && next.status !== 'queued') {
            stop();
            busy.current = false;
          }
        } catch (e) {
          setError((e as Error).message);
          stop();
          busy.current = false;
        } finally {
          polling.current = false;
        }
      }, 1500);
    } catch (e) {
      setError((e as Error).message);
      busy.current = false;
    }
  }, [stop]);

  const cancel = useCallback(async () => {
    if (!job || !busy.current) return;

    stop();

    try {
      await cancelScan(job.id);
      setJob({ ...job, status: 'cancelled', progress: undefined });
    } finally {
      busy.current = false;
    }
  }, [job, stop]);

  const reset = useCallback(() => {
    stop();
    busy.current = false;
    setJob(null);
    setError(null);
  }, [stop]);

  const running = busy.current ||
    job?.status === 'running' ||
    job?.status === 'queued';

  return { job, error, running, start, cancel, reset };
}