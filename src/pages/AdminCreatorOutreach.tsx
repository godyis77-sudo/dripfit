import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Plus,
  X,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  ExternalLink,
  Trash2,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AdminNav } from "@/components/admin/AdminNav";

type Lead = {
  id: string;
  name: string;
  email: string;
  platform: string;
  audience_size: string;
  message: string | null;
  status: string;
  source: string;
  handle: string | null;
  profile_url: string | null;
  follower_count: number | null;
  last_contacted_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

type OutreachNote = {
  id: string;
  lead_id: string;
  author_id: string;
  kind: string;
  body: string;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  { value: "contacted", label: "Contacted", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { value: "replied", label: "Replied", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { value: "approved", label: "Approved", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "active", label: "Active", color: "bg-primary/15 text-primary border-primary/30" },
  { value: "declined", label: "Declined", color: "bg-muted text-muted-foreground border-border" },
];

const KIND_ICON: Record<string, any> = {
  note: StickyNote,
  email: Mail,
  dm: MessageSquare,
  call: Phone,
  status_change: StickyNote,
};

function statusBadge(status: string) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${opt.color}`}>
      {opt.label}
    </Badge>
  );
}

export default function AdminCreatorOutreach() {
  usePageMeta({ title: "Admin — Creator Outreach" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["admin-creator-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_leads" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user && isAdmin === true,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.name, l.email, l.handle, l.platform]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(q));
    });
  }, [leads, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    STATUS_OPTIONS.forEach((s) => (c[s.value] = 0));
    leads.forEach((l) => {
      c[l.status] = (c[l.status] ?? 0) + 1;
    });
    return c;
  }, [leads]);

  const updateLead = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Lead> }) => {
      const { error } = await supabase.from("creator_leads" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-creator-leads"] });
      if (activeLead?.id === vars.id) {
        setActiveLead((p) => (p ? ({ ...p, ...vars.patch } as Lead) : p));
      }
    },
  });

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    if (newStatus === lead.status) return;
    await updateLead.mutateAsync({
      id: lead.id,
      patch: { status: newStatus, ...(newStatus === "contacted" ? { last_contacted_at: new Date().toISOString() } : {}) },
    });
    if (user) {
      await supabase.from("creator_outreach_notes" as any).insert({
        lead_id: lead.id,
        author_id: user.id,
        kind: "status_change",
        body: `Status: ${lead.status} → ${newStatus}`,
      });
      qc.invalidateQueries({ queryKey: ["outreach-notes", lead.id] });
    }
    toast({ title: `Marked ${newStatus}` });
  };

  const handleExport = () => {
    const headers = [
      "name",
      "email",
      "platform",
      "audience_size",
      "follower_count",
      "handle",
      "profile_url",
      "status",
      "source",
      "last_contacted_at",
      "created_at",
      "admin_notes",
    ];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...filtered.map((l) => headers.map((h) => escape((l as any)[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `creator-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (roleLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center gap-4">
        <h1 className="text-xl font-bold text-foreground">Admin Required</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-foreground flex-1 uppercase tracking-wider">
          Creator Outreach
        </h1>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" /> CSV
        </Button>
      </div>

      <AdminNav />

      <div className="px-4 pt-4 space-y-4">
        {/* Stat strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[{ value: "all", label: "Total" }, ...STATUS_OPTIONS].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                statusFilter === opt.value
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {opt.label}
              </div>
              <div className="font-display text-xl font-bold text-foreground">
                {counts[opt.value] ?? 0}
              </div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, handle, platform…"
            className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
          />
        </div>

        {/* Leads list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No leads match the current filter.
            </div>
          ) : (
            filtered.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setActiveLead(lead)}
                className="w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{lead.name}</span>
                      {statusBadge(lead.status)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{lead.email}</div>
                    <div className="text-[11px] text-muted-foreground/80 mt-1 font-mono">
                      {lead.platform} · {lead.audience_size}
                      {lead.handle ? ` · @${lead.handle}` : ""}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 whitespace-nowrap font-mono">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {activeLead && (
        <LeadDetailDrawer
          lead={activeLead}
          userId={user!.id}
          onClose={() => setActiveLead(null)}
          onStatusChange={(s) => handleStatusChange(activeLead, s)}
          onPatch={(patch) => updateLead.mutate({ id: activeLead.id, patch })}
        />
      )}

      {addOpen && (
        <AddLeadDrawer
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["admin-creator-leads"] });
            setAddOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Lead detail drawer                                          */
/* ────────────────────────────────────────────────────────── */

function LeadDetailDrawer({
  lead,
  userId,
  onClose,
  onStatusChange,
  onPatch,
}: {
  lead: Lead;
  userId: string;
  onClose: () => void;
  onStatusChange: (s: string) => void;
  onPatch: (patch: Partial<Lead>) => void;
}) {
  const qc = useQueryClient();
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState<"note" | "email" | "dm" | "call">("note");
  const [handle, setHandle] = useState(lead.handle ?? "");
  const [profileUrl, setProfileUrl] = useState(lead.profile_url ?? "");
  const [followers, setFollowers] = useState(lead.follower_count?.toString() ?? "");
  const [adminNotes, setAdminNotes] = useState(lead.admin_notes ?? "");

  const { data: notes = [], isLoading: notesLoading } = useQuery<OutreachNote[]>({
    queryKey: ["outreach-notes", lead.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_outreach_notes" as any)
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!noteBody.trim()) return;
      const { error } = await supabase.from("creator_outreach_notes" as any).insert({
        lead_id: lead.id,
        author_id: userId,
        kind: noteKind,
        body: noteBody.trim(),
      });
      if (error) throw error;
      if (noteKind !== "note") {
        await supabase
          .from("creator_leads" as any)
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", lead.id);
      }
    },
    onSuccess: () => {
      setNoteBody("");
      qc.invalidateQueries({ queryKey: ["outreach-notes", lead.id] });
      qc.invalidateQueries({ queryKey: ["admin-creator-leads"] });
      toast({ title: "Logged" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("creator_outreach_notes" as any).delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach-notes", lead.id] }),
  });

  const saveDetails = () => {
    onPatch({
      handle: handle.trim() || null,
      profile_url: profileUrl.trim() || null,
      follower_count: followers ? parseInt(followers, 10) || null : null,
      admin_notes: adminNotes.trim() || null,
    });
    toast({ title: "Saved" });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-background border-l border-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wider">Lead</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Identity */}
          <div>
            <div className="font-display text-xl font-bold text-foreground">{lead.name}</div>
            <a
              href={`mailto:${lead.email}`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              {lead.email} <ExternalLink className="w-3 h-3" />
            </a>
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              {lead.platform} · {lead.audience_size} · {new Date(lead.created_at).toLocaleDateString()}
            </div>
            {lead.message && (
              <div className="text-xs text-muted-foreground mt-3 p-3 rounded-lg bg-secondary border border-border whitespace-pre-wrap">
                {lead.message}
              </div>
            )}
          </div>

          {/* Status pills */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Status</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onStatusChange(s.value)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider border transition-colors ${
                    lead.status === s.value
                      ? s.color
                      : "border-border bg-card text-muted-foreground hover:border-border/60"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editable details */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Details</div>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Social handle (no @)"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <input
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="Profile URL"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <input
              value={followers}
              onChange={(e) => setFollowers(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Follower count"
              inputMode="numeric"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes (priority, vibe, fit)"
              rows={3}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <Button size="sm" onClick={saveDetails} className="w-full">
              Save Details
            </Button>
          </div>

          {/* Outreach log */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Log Activity
            </div>
            <div className="flex gap-1.5 mb-2">
              {(["note", "email", "dm", "call"] as const).map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <button
                    key={k}
                    onClick={() => setNoteKind(k)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider border inline-flex items-center justify-center gap-1 ${
                      noteKind === k
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {k}
                  </button>
                );
              })}
            </div>
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="What happened?"
              rows={2}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <Button
              size="sm"
              onClick={() => addNote.mutate()}
              disabled={!noteBody.trim() || addNote.isPending}
              className="w-full mt-2"
            >
              Log {noteKind === "note" ? "Note" : noteKind.toUpperCase()}
            </Button>
          </div>

          {/* Activity feed */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Activity
            </div>
            {notesLoading ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : notes.length === 0 ? (
              <div className="text-xs text-muted-foreground">No activity yet.</div>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => {
                  const Icon = KIND_ICON[n.kind] ?? StickyNote;
                  return (
                    <div
                      key={n.id}
                      className="rounded-lg border border-border bg-card p-3 flex items-start gap-2"
                    >
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                          {n.kind} · {new Date(n.created_at).toLocaleString()}
                        </div>
                        <div className="text-xs text-foreground whitespace-pre-wrap mt-0.5">
                          {n.body}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteNote.mutate(n.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Manual lead add drawer                                      */
/* ────────────────────────────────────────────────────────── */

function AddLeadDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    platform: "Instagram",
    audience_size: "1-10K",
    handle: "",
    profile_url: "",
    follower_count: "",
    admin_notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name || !form.email) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("creator_leads" as any).insert({
      name: form.name.trim(),
      email: form.email.toLowerCase().trim(),
      platform: form.platform,
      audience_size: form.audience_size,
      handle: form.handle.trim() || null,
      profile_url: form.profile_url.trim() || null,
      follower_count: form.follower_count ? parseInt(form.follower_count, 10) : null,
      admin_notes: form.admin_notes.trim() || null,
      source: "manual_outreach",
      status: "new",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to add lead", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lead added" });
    onCreated();
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-background border-l border-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wider">Add Lead</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-2">
          <input
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className={inputClass}
            >
              {["TikTok", "Instagram", "YouTube", "Other"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              value={form.audience_size}
              onChange={(e) => setForm({ ...form, audience_size: e.target.value })}
              className={inputClass}
            >
              {["<1K", "1-10K", "10-50K", "50K+"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <input
            placeholder="Handle (no @)"
            value={form.handle}
            onChange={(e) => setForm({ ...form, handle: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Profile URL"
            value={form.profile_url}
            onChange={(e) => setForm({ ...form, profile_url: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Follower count"
            inputMode="numeric"
            value={form.follower_count}
            onChange={(e) => setForm({ ...form, follower_count: e.target.value.replace(/[^0-9]/g, "") })}
            className={inputClass}
          />
          <textarea
            placeholder="Internal notes"
            rows={3}
            value={form.admin_notes}
            onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
            className={inputClass}
          />
          <Button onClick={submit} disabled={saving} className="w-full mt-2">
            {saving ? "Saving…" : "Add Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
