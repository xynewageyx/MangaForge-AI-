import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PlugZap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { validateProject, type Issue } from "@/lib/store";
import type { Project, Character, MangaPage, Panel, Bubble } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getLayout, layoutCount, areaName } from "@/lib/layouts";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border bg-card p-4", className)}>{children}</div>;
}

export function ProviderNotice({ what }: { what: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-warn/50 bg-warn/10 p-3 text-sm">
      <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
      <p>
        <b>{what}: kein Provider verbunden.</b> MangaForge erzeugt hier nichts Künstliches und täuscht keine
        Ergebnisse vor. Aufträge werden nur vorbereitet.{" "}
        <Link to="/integrationen" className="underline text-warn">Integrationshinweise</Link>
      </p>
    </div>
  );
}

const bubbleShape: Record<Bubble["type"], string> = {
  sprechen: "rounded-[50%] border-2",
  denken: "rounded-[50%] border-2 border-dashed",
  schrei: "border-[3px] font-black uppercase [clip-path:polygon(0_10%,10%_0,30%_8%,50%_0,70%_8%,90%_0,100%_15%,95%_50%,100%_85%,90%_100%,70%_92%,50%_100%,30%_92%,10%_100%,0_88%,5%_50%)]",
  erzaehler: "rounded-none border-2",
};

export function PanelView({ panel, lang, chars, highlightEmpty, onClick, active, onBubbleMove }: {
  panel: Panel; lang: "DE" | "EN"; chars: Character[]; highlightEmpty?: boolean; onClick?: () => void; active?: boolean; onBubbleMove?: (bubbleId: string, x: number, y: number) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn("relative overflow-hidden border-[3px] border-ink bg-paper", active && "outline outline-4 outline-primary", onClick && "cursor-pointer")}
    >
      {panel.image ? (
        <img src={panel.image} alt={panel.description} className={cn("absolute inset-0 h-full w-full object-cover", panel.bw && "grayscale contrast-125")} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-[10px] leading-tight text-ink/60">
          <span>{panel.description || "Leeres Panel"}{highlightEmpty && <b className="mt-1 block text-destructive">⚠ kein Bild</b>}</span>
        </div>
      )}
      {panel.fx === "screentone" && <div className="screentone pointer-events-none absolute inset-0 opacity-40" />}
      {panel.fx === "speedlines" && <div className="speedlines pointer-events-none absolute inset-0 opacity-50" />}
      {panel.fx === "magie" && (
        <div className="magic-glow pointer-events-none absolute inset-0" style={{ ["--fx" as string]: panel.fxColor }} />
      )}
      {panel.eyeColor && (
        <div className="pointer-events-none absolute left-1/2 top-[38%] flex -translate-x-1/2 gap-6">
          {[0, 1].map((i) => (
            <span key={i} className="block h-2 w-5 rounded-full" style={{ background: panel.eyeColor, boxShadow: `0 0 12px 4px ${panel.eyeColor}` }} />
          ))}
        </div>
      )}
      {panel.bubbles.map((b) => {
        const text = lang === "DE" ? b.textDe : b.textEn;
        const empty = !text.trim();
        const speaker = chars.find((c) => c.id === b.speakerId);
        return (
          <div
            key={b.id}
            title={speaker?.name}
            onPointerDown={onBubbleMove ? (e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); } : undefined}
            onPointerUp={onBubbleMove ? (e) => { e.stopPropagation(); const rect = e.currentTarget.parentElement?.getBoundingClientRect(); if (!rect) return; const x = Math.max(0, Math.min(85, Math.round((e.clientX - rect.left) / rect.width * 100))); const y = Math.max(0, Math.min(85, Math.round((e.clientY - rect.top) / rect.height * 100))); onBubbleMove(b.id, x, y); } : undefined}
            className={cn(
              "absolute max-w-[60%] border-ink bg-paper px-2 py-1 text-center text-[10px] leading-tight text-ink",
              bubbleShape[b.type],
              onBubbleMove && "touch-none cursor-grab",
              empty && highlightEmpty && "border-destructive bg-destructive/20",
            )}
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            {empty ? (highlightEmpty ? "⚠ leer" : "") : text}
          </div>
        );
      })}
    </div>
  );
}

export function PageView({ page, lang, chars, activePanel, onPanel, onBubbleMove, highlightEmpty, className }: {
  page: MangaPage; lang: "DE" | "EN"; chars: Character[]; activePanel?: string; onPanel?: (id: string) => void; onBubbleMove?: (panelId: string, bubbleId: string, x: number, y: number) => void; highlightEmpty?: boolean; className?: string;
}) {
  const l = getLayout(page.layout);
  return (
    <div
      className={cn("grid aspect-[1/1.414] w-full gap-2 bg-paper p-3", className)}
      style={{ gridTemplateColumns: l.cols, gridTemplateRows: l.rows, gridTemplateAreas: l.areas.map((r) => `"${r}"`).join(" ") }}
    >
      {page.panels.map((p, i) => (
        <div key={p.id} className="grid min-h-0" style={{ gridArea: areaName(i) }}>
          <PanelView panel={p} lang={lang} chars={chars} highlightEmpty={highlightEmpty} active={activePanel === p.id} onClick={onPanel ? () => onPanel(p.id) : undefined} onBubbleMove={onBubbleMove ? (bubbleId, x, y) => onBubbleMove(p.id, bubbleId, x, y) : undefined} />
        </div>
      ))}
    </div>
  );
}

export function LayoutThumb({ id }: { id: string }) {
  const l = getLayout(id);
  return (
    <div className="grid h-10 w-7 gap-[2px] bg-paper p-[2px]"
      style={{ gridTemplateColumns: l.cols, gridTemplateRows: l.rows, gridTemplateAreas: l.areas.map((r) => `"${r}"`).join(" ") }}>
      {Array.from({ length: layoutCount(id) }, (_, i) => <span key={i} className="bg-ink" style={{ gridArea: areaName(i) }} />)}
    </div>
  );
}

const providers = [["Bild-KI"], ["Video-KI"], ["TTS"], ["MP4-Render"]] as const;
/** Always-visible status strip: no AI provider is connected yet. */
export function ProviderStrip() {
  return (
    <Link to="/integrationen" className="flex items-center gap-2 overflow-x-auto border-b border-warn/30 bg-warn/10 px-4 py-1.5 text-[11px] text-warn">
      <PlugZap className="h-3.5 w-3.5 shrink-0" />
      {providers.map(([l]) => <span key={l} className="shrink-0 rounded border border-warn/50 px-1.5">{l}: nicht verbunden</span>)}
    </Link>
  );
}

export function CastChips({ ids, chars }: { ids: string[]; chars: Character[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const c = chars.find((x) => x.id === id);
        return (
          <span key={id} className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold", c ? "bg-secondary" : "bg-destructive/30")}>
            {c ? `${c.code} ${c.name}` : "Figur gelöscht"}
          </span>
        );
      })}
    </div>
  );
}

/** Toggleable cast picker with large touch targets; shows each character's ref thumbnails for the given medium. */
export function CastPicker({ value, chars, use, onChange }: { value: string[]; chars: Character[]; use: "manga" | "anime"; onChange: (v: string[]) => void }) {
  if (!chars.length) return <p className="text-xs text-muted-foreground">Noch keine Figuren angelegt.</p>;
  return (
    <div className="space-y-2">
      {chars.map((c) => {
        const on = value.includes(c.id);
        const refs = c.refImages.filter((r) => r.use === use || r.use === "beide");
        return (
          <button key={c.id} type="button" onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}
            className={cn("flex min-h-12 w-full items-center gap-3 rounded border px-3 py-2 text-left", on ? "border-primary bg-primary/10" : "")}>
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: c.eyeColor }} />
            <span className="flex-1 text-sm"><b>{c.code}</b> {c.name}</span>
            {refs.slice(0, 3).map((r) => <img key={r.id} src={r.src} alt={r.kind} className="h-9 w-7 rounded object-cover" />)}
            {!refs.length && <span className="text-[11px] text-warn">keine {use === "manga" ? "Manga" : "Anime"}-Referenz</span>}
          </button>
        );
      })}
    </div>
  );
}

export function CoverView({ p, lang }: { p: Project; lang: "DE" | "EN" }) {
  return (
    <div className="relative aspect-[1/1.414] w-full overflow-hidden bg-ink text-paper">
      {p.cover.image && <img src={p.cover.image} alt="" className="absolute inset-0 h-full w-full object-cover grayscale contrast-125" />}
      <div className="screentone absolute inset-0 opacity-20" />
      <div className="absolute inset-x-0 top-0 h-3" style={{ background: p.cover.accent }} />
      <div className="absolute inset-x-4 bottom-6">
        <p className="mb-1 inline-block px-2 text-xs font-bold" style={{ background: p.cover.accent }}>{p.cover.subtitle}</p>
        <h2 className="break-words text-2xl leading-tight text-paper [text-shadow:0_2px_0_var(--ink)]">{lang === "DE" ? p.cover.titleDe : p.cover.titleEn}</h2>
      </div>
    </div>
  );
}

export function ValidationList({ project, area }: { project: Project; area?: Issue["area"] }) {
  const issues = validateProject(project).filter((i) => !area || i.area === area);
  const errors = issues.filter((i) => i.level === "fehler").length;
  if (!issues.length) return <p className="flex items-center gap-2 text-sm text-ok"><CheckCircle2 className="h-4 w-4" /> Prüfung{area ? ` ${area}` : ""}: alles vollständig.</p>;
  return (
    <details className={cn("rounded-lg border p-3 text-sm", errors ? "border-destructive/60 bg-destructive/10" : "border-warn/50 bg-warn/10")}>
      <summary className="flex min-h-8 cursor-pointer items-center gap-2 font-bold">
        <AlertTriangle className="h-4 w-4" /> Prüfung{area ? ` ${area}` : ""}: {errors} Fehler, {issues.length - errors} Hinweise
      </summary>
      <ul className="mt-2 space-y-1 text-xs">
        {issues.map((i, k) => <li key={k} className={i.level === "fehler" ? "text-destructive" : "text-muted-foreground"}>{i.level === "fehler" ? "✗" : "!"} {i.message}</li>)}
      </ul>
    </details>
  );
}