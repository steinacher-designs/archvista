import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { cellOf } from "../../core/analysis/spatial";
import { doorwayZone, type Zone, type ZoneKind } from "../../core/zones";

type Tool = "room" | "draw" | "door";

export function AreasEditor() {
  const { t, scene, project, update, lang } = useStore();
  const a = scene!.analysis;
  const [level, setLevel] = useState(0);
  const [tool, setTool] = useState<Tool>("room");
  const [kind, setKind] = useState<Exclude<ZoneKind, "green">>("red");
  const [pts, setPts] = useState<[number, number][]>([]);
  const cv = useRef<HTMLCanvasElement>(null);
  const plan = a.plans[level];
  const lv = a.levels[level];
  const yRange = (): [number, number] => (lv ? [lv.elevation - 0.15, lv.elevation + lv.height - 0.15] : [scene!.bbox.min[1] - 1, scene!.bbox.max[1] + 1]);

  // view transform: building bbox (+1 m) fitted into the canvas
  const view = useMemo(() => {
    const b = scene!.bbox;
    return { x0: b.min[0] - 1, z0: b.min[2] - 1, w: b.max[0] - b.min[0] + 2, h: b.max[2] - b.min[2] + 2 };
  }, [scene]);
  const xf = (c: HTMLCanvasElement) => {
    const s = Math.min(c.width / view.w, c.height / view.h);
    const ox = (c.width - view.w * s) / 2, oy = (c.height - view.h * s) / 2;
    return { s, toPx: (x: number, z: number): [number, number] => [ox + (x - view.x0) * s, oy + (z - view.z0) * s], toPlan: (px: number, py: number): [number, number] => [view.x0 + (px - ox) / s, view.z0 + (py - oy) / s] };
  };

  // base plan image (cells) — rebuilt per level only
  const base = useMemo(() => {
    if (!plan) return null;
    const g = a.grid;
    const img = new ImageData(g.nx, g.nz);
    for (let c = 0; c < g.nx * g.nz; c++) {
      const o = c * 4;
      const r = plan.room[c];
      let col: [number, number, number, number];
      if (plan.blocked[c]) col = [40, 38, 36, 255];
      else if (r >= 0) col = [255, 255, 255, 255];
      else if (plan.walkable[c]) col = [238, 236, 231, 255];
      else col = [0, 0, 0, 0];
      img.data.set(col, o);
    }
    const off = document.createElement("canvas");
    off.width = g.nx; off.height = g.nz;
    off.getContext("2d")!.putImageData(img, 0, 0);
    return off;
  }, [plan]);

  const zonesHere = project!.zones.filter((z) => z.level === level || (z.level === undefined && lv && z.yMin <= lv.elevation + 1 && z.yMax >= lv.elevation + 1));

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, c.width, c.height);
    const T = xf(c);
    if (base) {
      const g = a.grid;
      const [px, py] = T.toPx(g.x0, g.z0);
      x.imageSmoothingEnabled = false;
      x.drawImage(base, px, py, g.nx * g.cell * T.s, g.nz * g.cell * T.s);
    }
    const poly = (p: [number, number][], fill: string, stroke: string, dash = false) => {
      x.beginPath();
      p.forEach(([a1, b1], i) => { const [u, v] = T.toPx(a1, b1); if (i) x.lineTo(u, v); else x.moveTo(u, v); });
      x.closePath(); x.fillStyle = fill; x.fill(); x.setLineDash(dash ? [6 * dpr, 4 * dpr] : []); x.strokeStyle = stroke; x.lineWidth = 2 * dpr; x.stroke(); x.setLineDash([]);
    };
    for (const z of zonesHere) poly(z.polygon, z.kind === "red" ? "rgba(214,69,65,.32)" : "rgba(90,94,100,.55)", z.kind === "red" ? "#d64541" : "#4b4f55", z.kind === "grey");
    // room numbers
    x.font = `${12 * dpr}px Inter, system-ui, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
    for (const r of a.rooms.filter((r) => r.level === level && r.covered)) {
      const [u, v] = T.toPx(r.centroid[0], r.centroid[1]);
      x.fillStyle = "#1c1b1a"; x.fillText(`${r.id + 1}`, u, v - 7 * dpr);
      x.fillStyle = "#9a958d"; x.fillText(`${r.area.toLocaleString(lang === "de" ? "de-AT" : "en-GB")} m²`, u, v + 8 * dpr);
    }
    if (a.entrance && a.entrance.level === level) {
      const [u, v] = T.toPx(a.entrance.position[0], a.entrance.position[2]);
      x.fillStyle = "#2f9e6d"; x.beginPath(); x.arc(u, v, 6 * dpr, 0, Math.PI * 2); x.fill();
    }
    if (pts.length) {
      x.strokeStyle = tool === "door" ? "#d64541" : kind === "red" ? "#d64541" : "#4b4f55"; x.lineWidth = 2 * dpr; x.beginPath();
      pts.forEach(([a1, b1], i) => { const [u, v] = T.toPx(a1, b1); if (i) x.lineTo(u, v); else x.moveTo(u, v); });
      x.stroke();
      for (const [a1, b1] of pts) { const [u, v] = T.toPx(a1, b1); x.fillStyle = "#fff"; x.beginPath(); x.arc(u, v, 4 * dpr, 0, Math.PI * 2); x.fill(); x.stroke(); }
    }
  });

  const toPlanEv = (e: React.MouseEvent) => {
    const c = cv.current!;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return xf(c).toPlan((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
  };

  const onClick = (e: React.MouseEvent) => {
    const [px, pz] = toPlanEv(e);
    if (tool === "room") {
      if (!plan) return;
      const cell = cellOf(a.grid, px, pz);
      const rid = cell >= 0 ? plan.room[cell] : -1;
      if (rid < 0) return;
      const room = a.rooms.find((r) => r.id === rid)!;
      update((p) => {
        const i = p.zones.findIndex((z) => z.roomId === rid && z.level === level);
        if (i >= 0 && p.zones[i].kind === kind) p.zones.splice(i, 1);
        else if (i >= 0) p.zones[i].kind = kind;
        else { const [y0, y1] = yRange(); p.zones.push({ id: `z${Date.now().toString(36)}`, kind, polygon: room.outline, yMin: y0, yMax: y1, source: "room", roomId: rid, level, label: `${lang === "de" ? "Raum" : "Room"} ${rid + 1}` }); }
      });
    } else if (tool === "draw") {
      setPts([...pts, [px, pz]]);
    } else {
      const next = [...pts, [px, pz] as [number, number]];
      if (next.length === 2) {
        const [y0, y1] = yRange();
        const z = doorwayZone(`d${Date.now().toString(36)}`, next[0], next[1], y0, y1, 0.4);
        update((p) => { p.zones.push({ ...z, level, label: lang === "de" ? "Gesperrte Tür" : "Blocked door" }); });
        setPts([]);
      } else setPts(next);
    }
  };
  const onDbl = () => {
    if (tool !== "draw" || pts.length < 3) return;
    const [y0, y1] = yRange();
    const poly = pts.slice(0, -1).length >= 3 ? pts.slice(0, -1) : pts; // dblclick also fired a click
    update((p) => { p.zones.push({ id: `z${Date.now().toString(36)}`, kind, polygon: poly, yMin: y0, yMax: y1, source: "drawn", level, label: lang === "de" ? "Gezeichneter Bereich" : "Drawn area" }); });
    setPts([]);
  };
  const floorZone = project!.zones.find((z) => z.source === "floor" && z.level === level);
  const setFloor = (k: ZoneKind) => update((p) => {
    p.zones = p.zones.filter((z) => !(z.source === "floor" && z.level === level));
    if (k === "green") return;
    const b = scene!.bbox; const [y0, y1] = yRange();
    p.zones.push({ id: `f${level}`, kind: k, source: "floor", level, label: lv ? (lang === "de" ? lv.name.de : lv.name.en) : "", yMin: y0, yMax: y1,
      polygon: [[b.min[0] - 0.5, b.min[2] - 0.5], [b.max[0] + 0.5, b.min[2] - 0.5], [b.max[0] + 0.5, b.max[2] + 0.5], [b.min[0] - 0.5, b.max[2] + 0.5]] });
  });

  const name = (z: Zone) => z.label ?? z.id;
  return (
    <>
      <p className="intro">{t.areasIntro}</p>
      {a.levels.length === 0 && <div className="note warn">{t.noLevels}</div>}
      {a.levels.length > 1 && <div className="chips">{a.levels.map((l, i) => <button key={i} className={i === level ? "on" : ""} onClick={() => { setLevel(i); setPts([]); }}>{lang === "de" ? l.name.de : l.name.en}</button>)}</div>}
      <div className="zk">
        <button className={kind === "red" ? "on" : ""} onClick={() => setKind("red")} title={t.zoneRedD}><i style={{ background: "var(--red)" }} />{t.zoneRed}</button>
        <button className={kind === "grey" ? "on" : ""} onClick={() => setKind("grey")} title={t.zoneGreyD}><i style={{ background: "var(--grey)" }} />{t.zoneGrey}</button>
        <button disabled title={t.zoneGreenD} style={{ opacity: .7 }}><i style={{ background: "var(--green)" }} />{t.zoneGreen}</button>
      </div>
      <div className="chips">
        {(["room", "draw", "door"] as Tool[]).map((k) => <button key={k} className={tool === k ? "on" : ""} onClick={() => { setTool(k); setPts([]); }} data-testid={`tool-${k}`}>{k === "room" ? t.toolRoom : k === "draw" ? t.toolDraw : t.toolDoor}</button>)}
      </div>
      <div className="plan"><canvas ref={cv} onClick={onClick} onDoubleClick={onDbl} data-testid="plan" /></div>
      <small style={{ color: "var(--ink3)", display: "block", marginTop: 6 }}>{tool === "room" ? t.toolRoomHint : tool === "draw" ? t.toolDrawHint : t.toolDoorHint}</small>
      {lv && (
        <div className="field">
          <label>{t.wholeFloor}: {lang === "de" ? lv.name.de : lv.name.en}</label>
          <div className="chips">
            <button className={!floorZone ? "on" : ""} onClick={() => setFloor("green")}>{t.zoneGreen}</button>
            <button className={floorZone?.kind === "red" ? "on" : ""} onClick={() => setFloor("red")}>{t.zoneRed}</button>
            <button className={floorZone?.kind === "grey" ? "on" : ""} onClick={() => setFloor("grey")}>{t.zoneGrey}</button>
          </div>
        </div>
      )}
      <div className="field">
        <label>{t.zonesList}</label>
        {project!.zones.length === 0 ? <small>{t.noZones}</small> : (
          <ul className="zlist">
            {project!.zones.map((z) => (
              <li key={z.id}>
                <span style={{ width: 10, height: 10, borderRadius: 3, flex: "none", background: z.kind === "red" ? "var(--red)" : "var(--grey)" }} />
                <span>{name(z)}{z.level !== undefined && a.levels[z.level] ? ` · ${lang === "de" ? a.levels[z.level].name.de : a.levels[z.level].name.en}` : ""}</span>
                <select className="select" style={{ width: "auto", padding: "4px 8px" }} value={z.kind} onChange={(e) => update((p) => { p.zones.find((q) => q.id === z.id)!.kind = e.target.value as ZoneKind; })}>
                  <option value="red">{t.zoneRed}</option><option value="grey">{t.zoneGrey}</option>
                </select>
                <button className="iconbtn" onClick={() => update((p) => { p.zones = p.zones.filter((q) => q.id !== z.id); })}>{t.delete}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="note">{t.roomUncertain}</div>
      <div className="note">{t.greyNote}</div>
    </>
  );
}
