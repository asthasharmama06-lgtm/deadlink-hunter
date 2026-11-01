import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelScan, getScan, startScan } from '../services/scanService';
import type { ScanJob } from '../types/scan';

export function useScan() {
  const [job, setJob] = useState<ScanJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number>();

  const stop = () => { if (timer.current) window.clearInterval(timer.current); };
  useEffect(() => {
  return () => {
    stop();
  };
}, []);
  const start = useCallback(async (url: string) => {
    stop();
    setError(null);
    try {
      const first = await startScan({ url });
      setJob(first);
      timer.current = window.setInterval(async () => {
        try {
          const next = await getScan(first.id);
          setJob(next);
          if (next.status !== 'running' && next.status !== 'queued') stop();
        } catch (e) { setError((e as Error).message); stop(); }
      }, 400);
    } catch (e) { setError((e as Error).message); }
  }, []);

  const cancel = useCallback(async () => {
    if (!job) return;
    stop();
    await cancelScan(job.id);
    setJob({ ...job, status: 'cancelled', progress: undefined });
  }, [job]);

  const reset = useCallback(() => { stop(); setJob(null); setError(null); }, []);
  const running = job?.status === 'running' || job?.status === 'queued';
  return { job, error, running, start, cancel, reset };
}
