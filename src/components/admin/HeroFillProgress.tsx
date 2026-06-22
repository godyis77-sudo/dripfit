import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, RotateCcw, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Snapshot = {
  startedAt: number;
  baselineIds: string[];
};

const STORAGE_KEY = "admin:hero-fill-progress";
const POLL_MS = 5_000;
const STUCK_AFTER_MS = 3 * 60_000; // outfits still missing after 3 min count as "possibly failed"

export function HeroFillProgress({ autoStartTrigger }: { autoStartTrigger?: number }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Snapshot) : null;
    } catch {
      return null;
    }
  });
  const [stillMissing, setStillMissing] = useState<Set<string>>(new Set());
  const [totalMissing, setTotalMissing] = useState<number | null>(null);
  const [polling, setPolling] = useState(false);
  const [lastTick, setLastTick] = useState<number>(Date.now());
  const [retrying, setRetrying] = useState(false);
  const lastAutoTriggerRef = useRef<number | undefined>(autoStartTrigger);
  const { toast } = useToast();

  const persist = useCallback((snap: Snapshot | null) => {
    if (snap) localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const fetchMissing = useCallback(async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from("weekly_outfits")
      .select("id")
      .is("hero_image_url", null);
    if (error) throw error;
    return (data ?? []).map((r) => r.id);
  }, []);

  const startTracking = useCallback(async () => {
    setPolling(true);
    try {
      const ids = await fetchMissing();
      const snap: Snapshot = { startedAt: Date.now(), baselineIds: ids };
      setSnapshot(snap);
      setStillMissing(new Set(ids));
      setTotalMissing(ids.length);
      persist(snap);
    } finally {
      setPolling(false);
    }
  }, [fetchMissing, persist]);

  const reset = useCallback(() => {
    setSnapshot(null);
    setStillMissing(new Set());
    setTotalMissing(null);
    persist(null);
  }, [persist]);

  const retryFailed = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setRetrying(true);
    try {
      const { error } = await supabase.functions.invoke("trigger-catalog-ops", {
        body: { job: "retry-hero-ids", outfit_ids: ids },
      });
      if (error) throw error;
      toast({ title: "RETRY DISPATCHED", description: `Re-firing ${ids.length} hero job${ids.length === 1 ? "" : "s"}.` });
    } catch (e) {
      toast({ title: "RETRY FAILED", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setRetrying(false);
    }
  }, [toast]);

  // Auto-start when parent fires a hero-fill job
  useEffect(() => {
    if (autoStartTrigger && autoStartTrigger !== lastAutoTriggerRef.current) {
      lastAutoTriggerRef.current = autoStartTrigger;
      startTracking();
    }
  }, [autoStartTrigger, startTracking]);

  // Poll loop
  useEffect(() => {
    if (!snapshot) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const ids = await fetchMissing();
        if (cancelled) return;
        const set = new Set(ids);
        const baselineStillMissing = new Set(snapshot.baselineIds.filter((id) => set.has(id)));
        setStillMissing(baselineStillMissing);
        setTotalMissing(ids.length);
        setLastTick(Date.now());
      } catch {
        // ignore transient errors
      }
    };
    tick();
    const handle = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [snapshot, fetchMissing]);

  if (!snapshot) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-wider text-foreground">HERO FILL PROGRESS</div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Snapshot the current missing-hero set, then watch live progress.
            </div>
          </div>
          <button
            onClick={startTracking}
            disabled={polling}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono px-3 py-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            {polling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            TRACK
          </button>
        </div>
      </div>
    );
  }

  const baselineCount = snapshot.baselineIds.length;
  const remaining = stillMissing.size;
  const completed = baselineCount - remaining;
  const pct = baselineCount === 0 ? 100 : Math.round((completed / baselineCount) * 100);
  const elapsedMs = Date.now() - snapshot.startedAt;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedLabel = elapsedSec < 60 ? `${elapsedSec}s` : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;
  const done = remaining === 0;
  const stuckCount = elapsedMs > STUCK_AFTER_MS ? remaining : 0;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            HERO FILL PROGRESS
            {done && <CheckCircle2 className="w-4 h-4 text-primary" />}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
            Started {elapsedLabel} ago · last check {Math.max(0, Math.floor((Date.now() - lastTick) / 1000))}s
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stuckCount > 0 && (
            <button
              onClick={() => retryFailed([...stillMissing])}
              disabled={retrying}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono px-3 py-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              RETRY {stuckCount}
            </button>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono px-3 py-1.5 rounded-full border border-border text-foreground hover:border-foreground/40"
          >
            <RotateCcw className="w-3 h-3" />
            RESET
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="DONE" value={`${completed}`} sub={`of ${baselineCount}`} />
        <Stat label="REMAINING" value={`${remaining}`} sub={`${pct}% complete`} />
        <Stat
          label={stuckCount > 0 ? "POSSIBLY FAILED" : "PENDING"}
          value={`${stuckCount > 0 ? stuckCount : remaining}`}
          sub={stuckCount > 0 ? ">3 min stuck" : "in flight"}
          warn={stuckCount > 0}
        />
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="text-[10px] font-mono text-muted-foreground">
        Catalog-wide missing hero count: {totalMissing ?? "—"}
      </div>

      {remaining > 0 && (
        <details className="mt-3">
          <summary className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground cursor-pointer">
            {stuckCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-foreground">
                <AlertTriangle className="w-3 h-3" /> SHOW {remaining} STUCK IDS
              </span>
            ) : (
              `SHOW ${remaining} PENDING IDS`
            )}
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto font-mono text-[10px] text-muted-foreground space-y-0.5">
            {[...stillMissing].map((id) => (
              <div key={id} className="truncate">{id}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${warn ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"}`}>
      <div className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold font-mono ${warn ? "text-destructive" : "text-foreground"}`}>{value}</div>
      <div className="text-[10px] font-mono text-muted-foreground">{sub}</div>
    </div>
  );
}
