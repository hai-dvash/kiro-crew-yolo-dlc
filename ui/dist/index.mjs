import { jsxs as o, Fragment as Ae, jsx as e } from "react/jsx-runtime";
import { useAppApi as je, useChatLauncher as Oe } from "@kirocrew/app-sdk";
import { PageHeader as De, StatCard as we } from "@kirocrew/app-sdk/ui";
import { useState as A, useRef as ce, useCallback as J, useMemo as ie, useEffect as Se } from "react";
const Le = "~/.dlc-yolo/state.json", _e = "/tmp/dlc-yolo/state.json";
let ne = Le;
const be = [
  { id: "investigate", name: "Investigate", type: "agent", agent: { name: "spec-agent", role: "Classify the issue: summarize, propose labels, write a triage note (human-aided)" } },
  { id: "requirements", name: "Requirements", type: "agent", agent: { name: "spec-agent", role: "Produce requirements.md" } },
  { id: "gate-spec", name: "Gate: Spec", type: "gate" },
  { id: "design", name: "Design", type: "agent", agent: { name: "design-agent", role: "Produce design.md" } },
  { id: "tasks", name: "Tasks", type: "agent", agent: { name: "impl-agent", role: "Break design into tasks" } },
  { id: "gate-impl", name: "Gate: Impl", type: "gate" },
  { id: "implement", name: "Implement", type: "agent", agent: { name: "impl-agent", role: "Write code + tests" } },
  { id: "review", name: "Review", type: "agent", agent: { name: "review-agent", role: "Severity-ranked review" } },
  { id: "gate-review", name: "Gate: Review", type: "gate" },
  { id: "pr", name: "PR", type: "agent", agent: { name: "orchestrator", role: "Open/update PR" } }
], Ee = /* @__PURE__ */ new Set([
  "hai-dvash/webapp",
  "hai-dvash/dashboard",
  "hai-dvash/api-core"
]), Me = {
  intake: "orchestrator",
  requirements: "spec-agent",
  "gate-spec": "human",
  design: "design-agent",
  tasks: "impl-agent",
  "gate-impl": "human",
  implement: "impl-agent",
  review: "review-agent",
  "gate-review": "human",
  pr: "orchestrator",
  done: "done"
}, ue = ["manual", "assisted", "autonomous"], he = ["quick", "standard", "deep"], xe = { trust: "assisted", depth: "standard" }, Re = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, $e = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function ge({ color: s, children: b, title: v, onClick: x, active: D }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      title: v,
      onClick: x,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: s,
        background: `color-mix(in srgb, ${s} 14%, transparent)`,
        boxShadow: D ? `inset 0 0 0 1px color-mix(in srgb, ${s} 55%, transparent)` : "none",
        opacity: x && !D ? 0.85 : 1,
        cursor: x ? "pointer" : "default"
      },
      children: b
    }
  );
}
const ke = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Ie({ steps: s, cardsByStage: b, onNodeClick: v }) {
  const x = ce(null), D = ce(null), I = ce(0), E = ce(null), N = ce(s), $ = ce(b), f = ce([]);
  N.current = s, $.current = b;
  const u = 3, k = 116, m = k / u, z = m - 26, [O, G] = A(880);
  Se(() => {
    const R = D.current;
    if (!R) return;
    const j = new ResizeObserver((h) => {
      const w = Math.max(360, Math.floor(h[0].contentRect.width));
      G(w);
    });
    return j.observe(R), () => j.disconnect();
  }, []);
  const W = (R) => R.type === "gate" || R.id.startsWith("gate-");
  return Se(() => {
    const R = x.current;
    if (!R) return;
    const j = Math.floor(O / u);
    R.width = j * u, R.height = m * u;
    const h = R.getContext("2d");
    if (!h) return;
    const w = (y, B, V, K, H) => {
      h.fillStyle = H, h.fillRect(y * u, B * u, V * u, K * u);
    }, _ = () => {
      const y = I.current, B = N.current, V = $.current, K = Math.max(1, B.length);
      Math.max(1, ...B.map((d) => {
        var g;
        return ((g = V[d.id]) == null ? void 0 : g.length) || 0;
      })), w(0, 0, j, z, "#0f172a");
      for (let d = 0; d < j / 5; d++) {
        const g = d * 37 % j, C = d * 13 % (z - 4);
        Math.sin(y * 0.03 + d * 2.1) > 0.35 && w(g, C, 1, 1, "#e2e8f0");
      }
      w(j - 26, 8, 10, 10, "#fde68a"), w(j - 24, 7, 8, 8, "#0f172a");
      for (let d = 0; d < j; d += 16)
        for (let g = z; g < m; g += 16)
          w(d, g, 16, 16, d / 16 + g / 16 & 1 ? "#33261a" : "#2a1f14");
      w(0, z - 2, j, 2, "#4a3520");
      const H = j / K, te = [];
      for (let d = 0; d < B.length; d++) {
        const g = B[d], C = Math.round(H * (d + 0.5)), re = (V[g.id] || []).length, Y = re > 0, oe = ke[d % ke.length], me = W(g), X = z - 2;
        if (te.push({ x: C - Math.floor(H / 2), w: Math.floor(H), id: g.id }), d < B.length - 1) {
          const M = Math.round(H * (d + 1.5));
          for (let F = C + 8; F < M - 8; F += 4) w(F, z - 1, 2, 1, "#4a3520");
        }
        if (me) {
          const M = X - 20, F = Y ? "#f39c12" : "#3a3222";
          w(C - 3, M, 6, 20, Y ? "#5c4a2a" : "#2a2418");
          for (let T = 0; T < 5; T++) w(C - T, M - 5 + T, T * 2 + 1, 1, F);
          for (let T = 0; T < 5; T++) w(C - (4 - T), M - T, (4 - T) * 2 + 1, 1, F);
          if (Y) {
            const T = (Math.sin(y * 0.08) + 1) / 2;
            h.globalAlpha = 0.35 + T * 0.4, w(C - 1, M - 6, 2, 2, "#ffd27a"), h.globalAlpha = 1;
          }
        } else {
          const M = X - 14;
          if (w(C - 10, M, 20, 3, "#7a5c47"), w(C - 10, M - 1, 20, 1, oe), w(C - 9, M + 3, 2, 8, "#5c4033"), w(C + 7, M + 3, 2, 8, "#5c4033"), w(C - 5, M - 9, 10, 9, "#333"), w(C - 4, M - 8, 8, 7, Y ? "#0a2a0a" : "#1a1a1a"), Y)
            for (let F = 0; F < 3; F++) {
              const T = 2 + (y + F * 7) % 5;
              w(C - 3, M - 7 + F * 2, T, 0.8, "#33ff33");
            }
        }
        const se = Math.min(re, 5);
        for (let M = 0; M < se; M++) {
          const F = se > 1 ? (M - (se - 1) / 2) * 8 : 0, T = Math.round(C + F) - 3, Z = X - (me ? 2 : 4), le = ke[(d + M) % ke.length], ae = Math.sin(y * 0.08 + d + M) > 0 ? 1 : 0;
          h.fillStyle = "rgba(0,0,0,0.18)", h.fillRect(T * u, (Z + 8) * u, 6 * u, u), w(T, Z + ae, 6, 6, le), w(T + 1, Z - 4 + ae, 4, 4, "#fdd"), w(T + 1, Z - 5 + ae, 4, 1, "#333"), (y + d * 9 + M * 5) % 120 >= 3 && (w(T + 2, Z - 3 + ae, 1, 1, "#333"), w(T + 4, Z - 3 + ae, 1, 1, "#333")), w(T + 1, Z + 6, 1, 2, le), w(T + 4, Z + 6, 1, 2, le);
        }
        re > 5 && (h.fillStyle = oe, h.font = `${3 * u}px monospace`, h.fillText(`+${re - 5}`, (C + 10) * u, (X - 6) * u)), re > 0 && (h.fillStyle = oe, h.fillRect((C + 6) * u, (X - 30) * u, 9 * u, 9 * u), h.fillStyle = "#0f172a", h.font = `bold ${5 * u}px monospace`, h.textAlign = "center", h.fillText(String(re), (C + 10.5) * u, (X - 24) * u), h.textAlign = "left"), h.fillStyle = Y ? "#e2e8f0" : "#6b7280", h.font = `${3.4 * u}px monospace`, h.textAlign = "center";
        const Q = g.name.length > 12 ? g.name.slice(0, 11) + "…" : g.name;
        h.fillText(Q, C * u, (m - 4) * u), h.textAlign = "left";
      }
      f.current = te;
      const i = B.reduce((d, g) => {
        var C;
        return d + (((C = V[g.id]) == null ? void 0 : C.length) || 0);
      }, 0);
      h.fillStyle = "#f90", h.font = `bold ${3.6 * u}px monospace`, h.fillText(`${i} card${i !== 1 ? "s" : ""} · ${K} milestone${K !== 1 ? "s" : ""}`, 4 * u, 8 * u);
    }, P = () => {
      I.current++, _(), E.current = requestAnimationFrame(P);
    };
    return E.current = requestAnimationFrame(P), () => {
      E.current && cancelAnimationFrame(E.current);
    };
  }, [O, m, z]), /* @__PURE__ */ e("div", { ref: D, className: "w-full mb-5", children: /* @__PURE__ */ e(
    "canvas",
    {
      ref: x,
      onClick: (R) => {
        const j = x.current;
        if (!j) return;
        const h = j.getBoundingClientRect(), w = (R.clientX - h.left) / h.width * (j.width / u), _ = f.current.find((P) => w >= P.x && w <= P.x + P.w);
        _ && v(_.id);
      },
      style: {
        width: "100%",
        height: k + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function Be({ active: s, onChange: b, counts: v }) {
  return /* @__PURE__ */ e(
    "div",
    {
      className: "flex gap-0.5 p-0.5 rounded-lg w-fit",
      style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" },
      children: [
        { id: "pipeline", label: "Pipeline" },
        { id: "workspace", label: "Workspace" },
        { id: "crew", label: "Crew" },
        { id: "status", label: "Status" },
        { id: "backlog", label: "Backlog" }
      ].map((D) => {
        const I = s === D.id, E = v[D.id];
        return /* @__PURE__ */ o(
          "button",
          {
            onClick: () => b(D.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: I ? "var(--accent)" : "transparent",
              color: I ? "var(--bg)" : "var(--muted)"
            },
            children: [
              D.label,
              E > 0 && /* @__PURE__ */ e(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: I ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: I ? "var(--bg)" : "var(--muted)" },
                  children: E
                }
              )
            ]
          },
          D.id
        );
      })
    }
  );
}
function Ne({ card: s, config: b, onApprove: v, onReject: x, onCycleTrust: D, onCycleDepth: I }) {
  var k, m, z;
  const E = s.stage.startsWith("gate-"), N = E ? "var(--warn)" : "var(--border-strong, var(--border))", $ = s.trust || b.trust, f = s.depth || b.depth, u = ((k = s.parked) == null ? void 0 : k.length) || 0;
  return /* @__PURE__ */ o(
    "div",
    {
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${N}`
      },
      children: [
        /* @__PURE__ */ e("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: s.title }),
        ((m = s.source) == null ? void 0 : m.repo) && /* @__PURE__ */ o(
          "a",
          {
            href: s.source.url || void 0,
            target: "_blank",
            rel: "noreferrer",
            className: "text-[11px] mt-0.5 inline-block truncate max-w-full hover:underline",
            style: { color: "var(--muted)" },
            children: [
              s.source.repo,
              s.source.issue ? `#${s.source.issue}` : ""
            ]
          }
        ),
        /* @__PURE__ */ o("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ e(
            ge,
            {
              color: Re[$],
              active: !!s.trust,
              onClick: D,
              title: `trust: ${$}${s.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: $
            }
          ),
          /* @__PURE__ */ e(
            ge,
            {
              color: $e[f],
              active: !!s.depth,
              onClick: I,
              title: `depth: ${f}${s.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: f
            }
          ),
          u > 0 && /* @__PURE__ */ o(ge, { color: "var(--warn)", title: `${u} parked idea(s)`, children: [
            "⏸ ",
            u
          ] }),
          typeof ((z = s.effort) == null ? void 0 : z.total) == "number" && s.effort.total > 0 && /* @__PURE__ */ o(ge, { color: "var(--info)", title: `estimated effort: ${s.effort.total} points`, children: [
            "⚡ ",
            s.effort.total
          ] }),
          s.backstep_history && s.backstep_history.length > 0 && /* @__PURE__ */ o(
            ge,
            {
              color: "var(--danger)",
              title: `stepped back ${s.backstep_history.length}× — last: ${s.backstep_history[s.backstep_history.length - 1].reason}`,
              children: [
                "↩ ",
                s.backstep_history.length
              ]
            }
          ),
          s.decisions && s.decisions.length > 0 && (() => {
            const O = s.decisions[s.decisions.length - 1];
            return /* @__PURE__ */ o(
              ge,
              {
                color: "var(--accent)",
                title: `${s.decisions.length} decision${s.decisions.length === 1 ? "" : "s"} — last: ${O.question || O.kind || ""}${O.action ? ` → ${O.action}` : ""}${O.rationale ? `
${O.rationale}` : ""}`,
                children: [
                  "⚖ ",
                  s.decisions.length
                ]
              }
            );
          })()
        ] }),
        E && v && x && /* @__PURE__ */ o("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          /* @__PURE__ */ e(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--ok)", color: "var(--bg)" },
              onClick: v,
              children: "Approve"
            }
          ),
          /* @__PURE__ */ e(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--danger)", color: "var(--bg)" },
              onClick: x,
              children: "Reject"
            }
          ),
          (s.stage === "gate-review" || /review/i.test(s.stage || "")) && (() => {
            var R, j, h;
            const O = (R = s.source) == null ? void 0 : R.repo;
            if (!O) return null;
            const G = (j = s.artifacts) == null ? void 0 : j.pr_url, W = G && ((h = /\/pull\/(\d+)/.exec(G)) == null ? void 0 : h[1]), q = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + O)}` + (W ? `&pr=${W}` : "");
            return /* @__PURE__ */ o(
              "a",
              {
                href: q,
                title: G ? `Deep-review PR #${W} in Code Review Sage` : `Open Code Review Sage for ${O}`,
                className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
                style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: [
                  /* @__PURE__ */ o("svg", { width: "11", height: "11", viewBox: "0 0 16 16", fill: "none", children: [
                    /* @__PURE__ */ e("circle", { cx: "7", cy: "7", r: "4.5", stroke: "currentColor", strokeWidth: "1.5" }),
                    /* @__PURE__ */ e("path", { d: "M10.5 10.5L14 14", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                  ] }),
                  "Review in Sage"
                ]
              }
            );
          })()
        ] })
      ]
    }
  );
}
function Ce({ title: s, count: b, children: v, id: x }) {
  return /* @__PURE__ */ o("div", { id: x, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ o("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
      /* @__PURE__ */ e("span", { className: "text-[11px] font-semibold uppercase tracking-wide truncate", style: { color: "var(--muted-strong, var(--muted))" }, children: s }),
      /* @__PURE__ */ e(
        "span",
        {
          className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
          children: b
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "flex flex-col gap-2", children: b === 0 ? /* @__PURE__ */ e(
      "div",
      {
        className: "text-[11px] rounded-lg py-3 px-2 text-center",
        style: { color: "var(--muted)", border: "1px dashed var(--border)" },
        children: "empty"
      }
    ) : v })
  ] });
}
function We({ config: s, onSet: b }) {
  function v({ label: x, value: D, options: I, tokens: E, onPick: N }) {
    return /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: x }),
      /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: I.map(($) => {
        const f = D === $;
        return /* @__PURE__ */ e(
          "button",
          {
            onClick: () => N($),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: f ? E[$] : "var(--muted)",
              background: f ? `color-mix(in srgb, ${E[$]} 16%, transparent)` : "transparent",
              boxShadow: f ? `inset 0 0 0 1px color-mix(in srgb, ${E[$]} 45%, transparent)` : "none"
            },
            children: $
          },
          $
        );
      }) })
    ] });
  }
  return /* @__PURE__ */ o(
    "div",
    {
      className: "flex items-center gap-5 flex-wrap mb-4 px-3 py-2 rounded-lg",
      style: { background: "var(--card)", border: "1px solid var(--border)" },
      children: [
        /* @__PURE__ */ e("span", { className: "text-xs font-semibold", style: { color: "var(--muted-strong, var(--muted))" }, children: "Defaults" }),
        /* @__PURE__ */ e(v, { label: "Trust", value: s.trust, options: ue, tokens: Re, onPick: (x) => b({ trust: x }) }),
        /* @__PURE__ */ e(v, { label: "Depth", value: s.depth, options: he, tokens: $e, onPick: (x) => b({ depth: x }) }),
        /* @__PURE__ */ e("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function Ge({ cards: s }) {
  const b = s.flatMap(
    (v) => (v.parked || []).map((x) => {
      var D;
      return { ...x, cardTitle: v.title, repo: (D = v.source) == null ? void 0 : D.repo };
    })
  ).sort((v, x) => (x.at || "").localeCompare(v.at || ""));
  return b.length === 0 ? /* @__PURE__ */ o("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ o("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ e("div", { className: "flex flex-col gap-2 max-w-2xl", children: b.map((v) => /* @__PURE__ */ o("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: v.note }),
    /* @__PURE__ */ o("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ o("span", { children: [
        "from ",
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: v.cardTitle })
      ] }),
      v.phase && /* @__PURE__ */ o("span", { children: [
        "· parked at ",
        v.phase
      ] }),
      v.repo && /* @__PURE__ */ o("span", { children: [
        "· ",
        v.repo
      ] }),
      v.issue_url && /* @__PURE__ */ e("a", { href: v.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, v.id)) });
}
function ze({ repos: s, selected: b, onToggle: v, onClear: x, onAddWorkspace: D, onEdit: I }) {
  const E = s.reduce((f, u) => f + u.count, 0), N = b.size === 0, $ = ({ name: f, count: u, label: k, checked: m, onClick: z, isAll: O }) => {
    const [G, W] = A(!1);
    return /* @__PURE__ */ o(
      "div",
      {
        onMouseEnter: () => W(!0),
        onMouseLeave: () => W(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: m ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: m ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ o(
            "button",
            {
              onClick: z,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                O ? /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: m ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ e(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: m ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${m ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: m && /* @__PURE__ */ e("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ e("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: m ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: k
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    children: u
                  }
                )
              ]
            }
          ),
          !O && f && /* @__PURE__ */ e(
            "button",
            {
              onClick: (q) => {
                q.stopPropagation(), I(f);
              },
              title: `Edit pipeline "${k}"`,
              "aria-label": `Edit pipeline ${k}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: G ? 1 : 0,
                pointerEvents: G ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (q) => {
                const R = q.currentTarget;
                R.style.color = "var(--accent)", R.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (q) => {
                const R = q.currentTarget;
                R.style.color = "var(--text-strong, var(--text))", R.style.borderColor = "var(--border-strong, var(--border))";
              },
              children: /* @__PURE__ */ e("svg", { width: "13", height: "13", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ e("path", { d: "M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) })
            }
          )
        ]
      }
    );
  };
  return /* @__PURE__ */ o(
    "div",
    {
      className: "flex-shrink-0 w-52 flex flex-col gap-1 pr-3 border-r self-stretch overflow-y-auto",
      style: { borderColor: "var(--border)" },
      children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between px-2.5 mb-1", children: [
          /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspaces" }),
          b.size > 0 && /* @__PURE__ */ e("button", { onClick: x, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ e($, { isAll: !0, count: E, label: "All repos", checked: N, onClick: x }),
        s.map((f) => /* @__PURE__ */ e(
          $,
          {
            name: f.name,
            count: f.count,
            label: (Ee.has(f.name) ? "Example: " : "") + (f.name.includes("/") ? f.name.split("/")[1] : f.name),
            checked: b.has(f.name),
            onClick: () => v(f.name)
          },
          f.name
        )),
        /* @__PURE__ */ o(
          "button",
          {
            onClick: D,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        b.size > 1 && /* @__PURE__ */ o("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          b.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const Fe = [
  "read",
  "write",
  "shell",
  "grep",
  "code",
  "ask_question",
  "spawn_run",
  "task_run",
  "send_message"
];
function Ue({ initial: s, knownAgents: b, crews: v, repo: x, stepName: D, onSave: I, onClose: E }) {
  var te;
  const { openChat: N } = Oe(), [$, f] = A(s.name || ""), [u, k] = A(s.role || ""), [m, z] = A(s.tools || ["read"]), [O, G] = A(s.model || "auto"), [W, q] = A(s.crew || ""), [R, j] = A(s.addenda || []), [h, w] = A(s.trust || ""), [_, P] = A(s.depth || ""), y = (i) => z((d) => d.includes(i) ? d.filter((g) => g !== i) : [...d, i]), B = () => j((i) => {
    var d;
    return i.length >= 3 ? i : [...i, { crew: ((d = v[0]) == null ? void 0 : d.name) || "", when: "always", writes: "" }];
  }), V = (i, d) => j((g) => g.map((C, de) => de === i ? { ...C, ...d } : C)), K = (i) => j((d) => d.filter((g, C) => C !== i)), H = $.trim().length > 0;
  return /* @__PURE__ */ o("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ e("button", { onClick: E, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ o("div", { className: "ml-1", children: [
        /* @__PURE__ */ e("div", { className: "text-sm font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Configure Agent" }),
        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "This step's agent (KiroCrew agent config)" })
      ] }),
      /* @__PURE__ */ e(
        "button",
        {
          onClick: () => N({
            message: `/dlc-yolo

Help me design a NEW agent for a custom pipeline step.
Pipeline repo: ${x || "(unset)"}
Step: ${D || "(unnamed)"}

Ask me what the step should do, then propose an agent config (name, role/prompt, tools, model). When I'm happy, write it into this pipeline's step in the DLC-YOLO state file (~/.dlc-yolo/state.json, or /tmp/dlc-yolo/state.json if that's what exists) — the step's agent {name, role, tools} and any trust/depth — keeping GitHub as the source of truth.`
          }),
          className: "ml-auto text-[11px] px-2.5 py-1 rounded-md font-semibold flex items-center gap-1",
          style: { background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" },
          title: "Author this agent in a /dlc-yolo chat session",
          children: "✨ Draft with /dlc-yolo"
        }
      )
    ] }),
    /* @__PURE__ */ o("div", { className: "px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto", children: [
      b.length > 0 && /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Reuse an existing agent" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: b.map((i) => /* @__PURE__ */ e(
          "button",
          {
            onClick: () => f(i),
            className: "text-[11px] px-2 py-1 rounded-md font-medium",
            style: {
              background: $ === i ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: $ === i ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: $ === i ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: i
          },
          i
        )) })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: $,
            onChange: (i) => f(i.target.value),
            placeholder: "e.g. impl-agent",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Role / prompt" }),
        /* @__PURE__ */ e(
          "textarea",
          {
            value: u,
            onChange: (i) => k(i.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: Fe.map((i) => {
          const d = m.includes(i);
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => y(i),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: d ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: d ? "var(--accent)" : "var(--muted)",
                boxShadow: d ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: i
            },
            i
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: O,
            onChange: (i) => G(i.target.value),
            placeholder: "auto",
            className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Crew" }),
          /* @__PURE__ */ o(
            "select",
            {
              value: W,
              onChange: (i) => q(i.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "— none (use step agent) —" }),
                v.map((i) => /* @__PURE__ */ e("option", { value: i.name, children: i.name }, i.name))
              ]
            }
          )
        ] }),
        W && /* @__PURE__ */ e("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: ((te = v.find((i) => i.name === W)) == null ? void 0 : te.description) || "Runs this step via select_crew → spawn_run(agent=" + W + ")" })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: B,
              disabled: R.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        R.length === 0 && /* @__PURE__ */ e("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        R.map((i, d) => /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ e(
            "select",
            {
              value: i.crew,
              onChange: (g) => V(d, { crew: g.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: v.map((g) => /* @__PURE__ */ e("option", { value: g.name, children: g.name }, g.name))
            }
          ),
          /* @__PURE__ */ o(
            "select",
            {
              value: i.when || "always",
              onChange: (g) => V(d, { when: g.target.value }),
              title: "Integration trigger — when this addendum runs",
              className: "px-1.5 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "always", children: "always" }),
                /* @__PURE__ */ e("option", { value: "depth:deep", children: "depth:deep" }),
                /* @__PURE__ */ e("option", { value: "kind:bug", children: "kind:bug" }),
                /* @__PURE__ */ e("option", { value: "manual", children: "manual" })
              ]
            }
          ),
          /* @__PURE__ */ e(
            "input",
            {
              value: i.writes || "",
              onChange: (g) => V(d, { writes: g.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ e("button", { onClick: () => K(d), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ e("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ e("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, d))
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...ue].map((i) => {
          const d = h === i;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => w(i),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: d ? i ? Re[i] : "var(--text)" : "var(--muted)", background: d ? "var(--bg-hover, var(--border))" : "transparent" },
              children: i || "inherit"
            },
            i || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...he].map((i) => {
          const d = _ === i;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => P(i),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: d ? i ? $e[i] : "var(--text)" : "var(--muted)", background: d ? "var(--bg-hover, var(--border))" : "transparent" },
              children: i || "inherit"
            },
            i || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ e("button", { onClick: E, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ e(
        "button",
        {
          disabled: !H,
          onClick: () => I({
            name: $.trim(),
            role: u.trim() || void 0,
            tools: m,
            model: O.trim() && O.trim() !== "auto" ? O.trim() : void 0,
            crew: W || void 0,
            addenda: R.length ? R.filter((i) => i.crew) : void 0,
            trust: h || void 0,
            depth: _ || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save Agent"
        }
      )
    ] })
  ] });
}
function Te({ candidates: s, existingRepos: b, defaults: v, knownAgents: x, crews: D, onCreate: I, onClose: E, editPipeline: N, cardCount: $, isExample: f, onDelete: u }) {
  var F, T, Z, le, ae, fe, ve, ye, pe, t, a, n, c, p;
  const k = !!N, [m, z] = A((N == null ? void 0 : N.repo) || ""), [O, G] = A((N == null ? void 0 : N.source) || "manual"), [W, q] = A((N == null ? void 0 : N.trust) || v.trust), [R, j] = A((N == null ? void 0 : N.depth) || v.depth), [h, w] = A((N == null ? void 0 : N.backlog_intake) ?? !0), [_, P] = A(() => {
    var r;
    return (r = N == null ? void 0 : N.steps) != null && r.length ? N.steps.map((l) => ({ ...l })) : be.map((l) => ({ ...l }));
  }), [y, B] = A(null), [V, K] = A(""), [H, te] = A("settings"), i = (r) => r.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", d = (r, l) => P((L) => L.map((U, S) => S === r ? { ...U, ...l } : U)), g = (r) => P((l) => l.filter((L, U) => U !== r)), C = (r, l) => P((L) => {
    const U = r + l;
    if (U < 0 || U >= L.length) return L;
    const S = [...L];
    return [S[r], S[U]] = [S[U], S[r]], S;
  }), de = (r) => P((l) => [...l, {
    id: `${r}-${Math.random().toString(36).slice(2, 6)}`,
    name: r === "gate" ? "New Gate" : "New Step",
    type: r,
    agent: r === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), re = (r) => {
    z(r.repo), G(r.source);
  }, Y = (r) => {
    let l = (r || "").trim();
    if (!l) return "";
    const L = l.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return L && (l = L[1]), l.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, oe = (r) => {
    const l = /github\.com|gitlab\.com/i.test(r);
    z(l ? Y(r) : r), G("manual");
  }, me = /^[^/\s]+\/[^/\s]+$/.test(Y(m)) || s.some((r) => r.repo === m), X = !k && b.has(Y(m)), se = ({ value: r, options: l, tokens: L, onPick: U }) => /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: l.map((S) => {
    const ee = r === S;
    return /* @__PURE__ */ e(
      "button",
      {
        onClick: () => U(S),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: ee ? L[S] : "var(--muted)",
          background: ee ? `color-mix(in srgb, ${L[S]} 16%, transparent)` : "transparent",
          boxShadow: ee ? `inset 0 0 0 1px color-mix(in srgb, ${L[S]} 45%, transparent)` : "none"
        },
        children: S
      },
      S
    );
  }) }), Q = { "issue-radar": [], workspace: [], manual: [] };
  s.forEach((r) => {
    var l;
    (Q[l = r.source] || (Q[l] = [])).push(r);
  });
  const M = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: E,
      children: /* @__PURE__ */ e(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (r) => r.stopPropagation(),
          children: y !== null ? /* @__PURE__ */ e(
            Ue,
            {
              initial: {
                name: ((T = (F = _[y]) == null ? void 0 : F.agent) == null ? void 0 : T.name) || "",
                role: (le = (Z = _[y]) == null ? void 0 : Z.agent) == null ? void 0 : le.role,
                tools: (fe = (ae = _[y]) == null ? void 0 : ae.agent) == null ? void 0 : fe.tools,
                model: (ye = (ve = _[y]) == null ? void 0 : ve.agent) == null ? void 0 : ye.model,
                crew: (t = (pe = _[y]) == null ? void 0 : pe.agent) == null ? void 0 : t.crew,
                addenda: (a = _[y]) == null ? void 0 : a.addenda,
                trust: (n = _[y]) == null ? void 0 : n.trust,
                depth: (c = _[y]) == null ? void 0 : c.depth
              },
              knownAgents: x,
              crews: D,
              repo: m,
              stepName: ((p = _[y]) == null ? void 0 : p.name) || "",
              onClose: () => B(null),
              onSave: (r) => {
                d(y, {
                  agent: { name: r.name, role: r.role, tools: r.tools, model: r.model, crew: r.crew },
                  addenda: r.addenda,
                  trust: r.trust,
                  depth: r.depth
                }), B(null);
              }
            }
          ) : /* @__PURE__ */ o(Ae, { children: [
            /* @__PURE__ */ o("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ o("div", { children: [
                /* @__PURE__ */ e("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: k ? "Edit Pipeline" : "New Pipeline" }),
                /* @__PURE__ */ e("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: k ? m.includes("/") ? m.split("/")[1] : m : "Configure a pipeline for a repository or workspace" })
              ] }),
              /* @__PURE__ */ e("button", { onClick: E, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
            ] }),
            k && /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: ["settings", "danger"].map((r) => {
              const l = H === r, L = r === "danger";
              return /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => te(r),
                  className: "text-[12px] px-3 py-2 font-semibold transition-all",
                  style: {
                    color: l ? L ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                    borderBottom: `2px solid ${l ? L ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                    marginBottom: "-1px"
                  },
                  children: r === "settings" ? "Settings" : "Danger Zone"
                },
                r
              );
            }) }),
            /* @__PURE__ */ o(
              "div",
              {
                className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                style: { display: k && H === "danger" ? "none" : "flex" },
                children: [
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: m,
                        onChange: (r) => oe(r.target.value),
                        onPaste: (r) => {
                          const l = r.clipboardData.getData("text");
                          /github\.com|gitlab\.com/i.test(l) && (r.preventDefault(), oe(l));
                        },
                        placeholder: "https://github.com/owner/name  ·  or  owner/name",
                        disabled: k,
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                        style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${X ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                      }
                    ),
                    !k && m && Y(m) !== m && /* @__PURE__ */ o("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                      "→ ",
                      /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: Y(m) })
                    ] }),
                    X && /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                    /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((r) => Q[r].length > 0 && /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: M[r] }),
                      /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1.5", children: Q[r].map((l) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => re(l),
                          disabled: b.has(l.repo),
                          title: l.detail || l.repo,
                          className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                          style: {
                            background: m === l.repo ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                            color: m === l.repo ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                            boxShadow: m === l.repo ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                          },
                          children: l.repo.includes("/") ? l.repo.split("/")[1] : l.repo
                        },
                        l.repo
                      )) })
                    ] }, r)) })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                    /* @__PURE__ */ e(se, { value: W, options: ue, tokens: Re, onPick: q })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                    /* @__PURE__ */ e(se, { value: R, options: he, tokens: $e, onPick: j })
                  ] }),
                  /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Backlog auto-intake" }),
                      /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Back-feed open ",
                        /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
                        " issues as cards"
                      ] })
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => w((r) => !r),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: h ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: h ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1.5", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                      /* @__PURE__ */ o("div", { className: "flex gap-1", children: [
                        /* @__PURE__ */ e(
                          "button",
                          {
                            onClick: () => de("agent"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                            children: "+ agent"
                          }
                        ),
                        /* @__PURE__ */ e(
                          "button",
                          {
                            onClick: () => de("gate"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                            children: "+ gate"
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: _.map((r, l) => {
                      var L, U;
                      return /* @__PURE__ */ o(
                        "div",
                        {
                          className: "rounded-md p-2",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${r.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                          children: [
                            /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5", children: [
                              /* @__PURE__ */ o("div", { className: "flex flex-col", children: [
                                /* @__PURE__ */ e("button", { onClick: () => C(l, -1), disabled: l === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                /* @__PURE__ */ e("button", { onClick: () => C(l, 1), disabled: l === _.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                              ] }),
                              /* @__PURE__ */ e(
                                "input",
                                {
                                  value: r.name,
                                  onChange: (S) => d(l, { name: S.target.value, id: i(S.target.value) }),
                                  className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                }
                              ),
                              /* @__PURE__ */ e(
                                "span",
                                {
                                  className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                  style: { color: r.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${r.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                  children: r.type
                                }
                              ),
                              /* @__PURE__ */ e("button", { onClick: () => g(l), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                            ] }),
                            r.type === "agent" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                              /* @__PURE__ */ o(
                                "button",
                                {
                                  onClick: () => B(l),
                                  className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                  children: [
                                    "⚙ ",
                                    (L = r.agent) != null && L.name ? `Agent: ${r.agent.name}` : "Configure agent"
                                  ]
                                }
                              ),
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: r.trigger || "ask",
                                  onChange: (S) => d(l, { trigger: S.target.value === "ask" ? void 0 : S.target.value }),
                                  title: "Which engine runs this phase (ask = prompt at runtime)",
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ e("option", { value: "ask", children: "ask" }),
                                    /* @__PURE__ */ e("option", { value: "spec-builder", children: "Spec Builder" }),
                                    /* @__PURE__ */ e("option", { value: "task-runner", children: "Task Runner" }),
                                    /* @__PURE__ */ e("option", { value: "inline", children: "inline" }),
                                    /* @__PURE__ */ e("option", { value: "skip", children: "skip" })
                                  ]
                                }
                              ),
                              (r.trust || r.depth) && /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [r.trust, r.depth].filter(Boolean).join(" · ") }),
                              r.addenda && r.addenda.length > 0 && /* @__PURE__ */ o("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                "+",
                                r.addenda.length,
                                " addendum",
                                r.addenda.length === 1 ? "" : "s"
                              ] }),
                              ((U = r.agent) == null ? void 0 : U.role) && /* @__PURE__ */ e("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: r.agent.role })
                            ] }),
                            r.type === "gate" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: r.trust || "",
                                  onChange: (S) => d(l, { trust: S.target.value || void 0 }),
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ e("option", { value: "", children: "inherit" }),
                                    ue.map((S) => /* @__PURE__ */ e("option", { value: S, children: S }, S))
                                  ]
                                }
                              )
                            ] })
                          ]
                        },
                        r.id
                      );
                    }) })
                  ] })
                ]
              }
            ),
            k && H === "danger" && u && (() => {
              const r = m.includes("/") ? m.split("/")[1] : m, l = V.trim() === r;
              return /* @__PURE__ */ e("div", { className: "px-5 pb-4 pt-4", children: f ? /* @__PURE__ */ o(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                  children: [
                    /* @__PURE__ */ o("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "This is a bundled ",
                      /* @__PURE__ */ e("strong", { children: "example" }),
                      " pipeline (",
                      $ ?? 0,
                      " sample card",
                      ($ ?? 0) === 1 ? "" : "s",
                      "). Remove it any time — it's demo data, not real work."
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => {
                          u(m), E();
                        },
                        className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Remove Example"
                      }
                    )
                  ]
                }
              ) : /* @__PURE__ */ o(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))", background: "color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)" },
                  children: [
                    /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold uppercase tracking-wide", style: { color: "var(--danger, #ef4444)" }, children: "Danger Zone" }),
                    /* @__PURE__ */ o("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "Deleting removes this pipeline and its ",
                      $ ?? 0,
                      " card",
                      ($ ?? 0) === 1 ? "" : "s",
                      " from DLC-YOLO's local state. It does ",
                      /* @__PURE__ */ e("strong", { children: "not" }),
                      " touch GitHub issues or labels. This cannot be undone."
                    ] }),
                    /* @__PURE__ */ o("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                      "Type ",
                      /* @__PURE__ */ e("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: r }),
                      " to confirm:"
                    ] }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: V,
                        onChange: (L) => K(L.target.value),
                        placeholder: r,
                        className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        disabled: !l,
                        onClick: () => {
                          u(m), E();
                        },
                        className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                        style: {
                          background: l ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                          color: l ? "#fff" : "var(--muted)",
                          cursor: l ? "pointer" : "not-allowed"
                        },
                        children: "Delete pipeline"
                      }
                    )
                  ]
                }
              ) });
            })(),
            /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
              /* @__PURE__ */ e("button", { onClick: E, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Cancel" }),
              !(k && H === "danger") && /* @__PURE__ */ e(
                "button",
                {
                  disabled: !me || !k && X,
                  onClick: () => I({
                    repo: Y(m),
                    source: O,
                    trust: W,
                    depth: R,
                    backlog_intake: h,
                    steps: _.map((r) => ({ ...r, label: `dlc:${r.id}` }))
                  }),
                  className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: k ? "Save Pipeline" : "Create Pipeline"
                }
              )
            ] })
          ] })
        }
      )
    }
  );
}
function Ke() {
  const s = je(), [b, v] = A([]), [x, D] = A([]), [I, E] = A(xe), [N, $] = A(!0), [f, u] = A("pipeline"), [k, m] = A(/* @__PURE__ */ new Set()), [z, O] = A(!1), [G, W] = A(null), [q, R] = A([]), [j, h] = A([]), w = ce(null), _ = J(async () => {
    try {
      let t;
      try {
        t = await s.get("/api/file-read?path=" + encodeURIComponent(ne));
      } catch (a) {
        if (ne !== _e)
          ne = _e, t = await s.get("/api/file-read?path=" + encodeURIComponent(ne));
        else
          throw a;
      }
      v(t.cards || []), D(t.pipelines || []), E({ ...xe, ...t.config || {} });
    } catch (t) {
      console.error("Failed to fetch cards:", t);
    } finally {
      $(!1);
    }
  }, [s]), P = ie(() => {
    const t = /* @__PURE__ */ new Map();
    return x.forEach((a) => {
      t.has(a.repo) || t.set(a.repo, 0);
    }), b.forEach((a) => {
      var c;
      const n = ((c = a.source) == null ? void 0 : c.repo) || "unlinked";
      t.set(n, (t.get(n) || 0) + 1);
    }), [...t.entries()].map(([a, n]) => ({ name: a, count: n })).sort((a, n) => n.count - a.count);
  }, [b, x]), y = ie(
    () => k.size === 0 ? b : b.filter((t) => {
      var a;
      return k.has(((a = t.source) == null ? void 0 : a.repo) || "unlinked");
    }),
    [b, k]
  ), B = ie(() => {
    var p;
    let t;
    if (k.size === 1) {
      const r = [...k][0];
      t = (p = x.find((l) => l.repo === r)) == null ? void 0 : p.steps;
    } else x.length === 1 && (t = x[0].steps);
    const a = (t && t.length ? t : be).map((r) => ({ ...r })), n = new Set(a.map((r) => r.id)), c = [];
    return n.has("intake") || c.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), c.push(...a), n.has("done") || c.push({ id: "done", name: "Done", type: "agent" }), c;
  }, [k, x]), V = ie(() => B.map((t) => t.id), [B]), K = J((t) => {
    var a;
    return ((a = B.find((n) => n.id === t)) == null ? void 0 : a.type) === "gate" || t.startsWith("gate-");
  }, [B]), H = J((t) => {
    var a, n;
    return ((n = (a = B.find((c) => c.id === t)) == null ? void 0 : a.agent) == null ? void 0 : n.name) || Me[t] || "unknown";
  }, [B]);
  Se(() => {
    _();
    const t = setInterval(_, 1e4);
    return () => clearInterval(t);
  }, [_]), Se(() => {
    (async () => {
      try {
        const t = await s.get("/api/file-read?path=~/.kiro/crew/config.json"), a = (t == null ? void 0 : t.agents) || {}, n = Object.entries(a).map(([c, p]) => ({
          name: c,
          description: (p == null ? void 0 : p.description) || void 0
        }));
        h(n);
      } catch (t) {
        console.warn("crew roster (config.json) unreadable:", t);
      }
    })();
  }, [s]);
  const te = (t, a) => {
    const n = (t.pipelines || []).find((r) => r.id === a.pipeline_id) || (t.pipelines || []).find((r) => {
      var l;
      return r.repo === ((l = a.source) == null ? void 0 : l.repo);
    }), p = ["intake", ...(n != null && n.steps && n.steps.length ? n.steps : be).map((r) => r.id).filter((r) => r !== "intake" && r !== "done"), "done"];
    return [...new Set(p)];
  }, i = J(async (t) => {
    var a;
    try {
      const n = await s.get("/api/file-read?path=" + encodeURIComponent(ne)), c = (a = n.cards) == null ? void 0 : a.find((L) => L.id === t);
      if (!c) return;
      const p = te(n, c), r = p.indexOf(c.stage);
      if (r < 0 || r >= p.length - 1) return;
      const l = c.stage;
      c.stage = p[r + 1], c.updated_at = (/* @__PURE__ */ new Date()).toISOString(), c.gate_history = c.gate_history || [], c.gate_history.push({ gate: l, decision: "approved", at: c.updated_at, notes: "" }), c.history = c.history || [], c.history.push({ from: l, to: c.stage, at: c.updated_at, agent: "human" }), await s.post("/api/file-write", { path: ne, content: JSON.stringify(n, null, 2) }), _();
    } catch (n) {
      console.error("Failed to advance card:", n);
    }
  }, [s, _]), d = J(async (t) => {
    var a, n;
    try {
      const c = await s.get("/api/file-read?path=" + encodeURIComponent(ne)), p = (a = c.cards) == null ? void 0 : a.find((ee) => ee.id === t);
      if (!p) return;
      const r = te(c, p), l = new Set((((n = (c.pipelines || []).find((ee) => ee.id === p.pipeline_id)) == null ? void 0 : n.steps) || be).filter((ee) => ee.type === "gate").map((ee) => ee.id)), L = r.indexOf(p.stage);
      if (L <= 0) return;
      const U = p.stage;
      let S = L - 1;
      for (; S > 0 && (l.has(r[S]) || r[S].startsWith("gate-")); ) S--;
      p.stage = r[S], p.updated_at = (/* @__PURE__ */ new Date()).toISOString(), p.gate_history = p.gate_history || [], p.gate_history.push({ gate: U, decision: "rejected", at: p.updated_at, notes: "" }), p.history = p.history || [], p.history.push({ from: U, to: p.stage, at: p.updated_at, agent: "human" }), await s.post("/api/file-write", { path: ne, content: JSON.stringify(c, null, 2) }), _();
    } catch (c) {
      console.error("Failed to reject card:", c);
    }
  }, [s, _]), g = J(async (t) => {
    try {
      const a = await s.get("/api/file-read?path=" + encodeURIComponent(ne));
      a.cards = a.cards || [], t(a), await s.post("/api/file-write", { path: ne, content: JSON.stringify(a, null, 2) }), _();
    } catch (a) {
      console.error("Failed to mutate state:", a);
    }
  }, [s, _]), C = J((t) => {
    E((a) => ({ ...a, ...t })), g((a) => {
      a.config = { ...xe, ...a.config || {}, ...t };
    });
  }, [g]), de = J((t) => {
    g((a) => {
      var p;
      const n = a.cards.find((r) => r.id === t);
      if (!n) return;
      const c = n.trust || ((p = a.config) == null ? void 0 : p.trust) || xe.trust;
      n.trust = ue[(ue.indexOf(c) + 1) % ue.length], n.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [g]), re = J((t) => {
    g((a) => {
      var p;
      const n = a.cards.find((r) => r.id === t);
      if (!n) return;
      const c = n.depth || ((p = a.config) == null ? void 0 : p.depth) || xe.depth;
      n.depth = he[(he.indexOf(c) + 1) % he.length], n.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [g]), Y = J((t) => {
    m((a) => {
      const n = new Set(a);
      return n.has(t) ? n.delete(t) : n.add(t), n;
    });
  }, []), oe = J(() => m(/* @__PURE__ */ new Set()), []), me = J(async () => {
    const t = [];
    try {
      const a = await s.get("/api/file-read?path=~/.kiro/crew/config.json"), n = (a == null ? void 0 : a.workspaces) || {};
      Object.entries(n).forEach(([c, p]) => t.push({ repo: c, source: "workspace", detail: (p == null ? void 0 : p.dir) || c }));
    } catch (a) {
      console.warn("workspaces registry unreadable:", a);
    }
    try {
      const a = await s.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((a == null ? void 0 : a.repos) || []).forEach((n) => {
        n != null && n.owner && (n != null && n.repo) && t.push({ repo: `${n.owner}/${n.repo}`, source: "issue-radar", detail: `${n.provider || "github"} · ${n.host || "github.com"}` });
      });
    } catch (a) {
      console.warn("issue-radar config unreadable (app may not be installed):", a);
    }
    R(t), O(!0);
  }, [s]), X = J(async (t) => {
    const a = (/* @__PURE__ */ new Date()).toISOString(), n = "pl-" + Math.random().toString(36).slice(2, 10);
    await g((c) => {
      c.pipelines = c.pipelines || [];
      const p = c.pipelines.find((r) => r.repo === t.repo);
      p ? (p.source = t.source, p.trust = t.trust, p.depth = t.depth, p.backlog_intake = t.backlog_intake, p.steps = t.steps) : c.pipelines.push({
        id: n,
        repo: t.repo,
        source: t.source,
        trust: t.trust,
        depth: t.depth,
        backlog_intake: t.backlog_intake,
        sot: "github",
        steps: t.steps,
        created_at: a
      });
    }), O(!1), W(null), m(/* @__PURE__ */ new Set([t.repo]));
  }, [g]), se = J(async (t) => {
    await g((a) => {
      a.pipelines = (a.pipelines || []).filter((n) => n.repo !== t), a.cards = (a.cards || []).filter((n) => {
        var c;
        return (((c = n.source) == null ? void 0 : c.repo) || "unlinked") !== t;
      });
    }), m((a) => {
      const n = new Set(a);
      return n.delete(t), n;
    });
  }, [g]), Q = ie(() => V.reduce((t, a) => (t[a] = y.filter((n) => n.stage === a), t), {}), [y, V]), M = J((t) => {
    var a;
    (a = document.getElementById(`stage-col-${t}`)) == null || a.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), F = ie(() => {
    const t = {};
    return y.forEach((a) => {
      var c;
      const n = ((c = a.source) == null ? void 0 : c.repo) || "unlinked";
      (t[n] || (t[n] = [])).push(a);
    }), t;
  }, [y]), T = ie(() => {
    const t = {};
    return y.forEach((a) => {
      const n = H(a.stage);
      (t[n] || (t[n] = [])).push(a);
    }), t;
  }, [y, H]), Z = ie(() => {
    const t = [], a = [], n = [];
    return y.forEach((c) => {
      c.stage === "done" ? n.push(c) : K(c.stage) ? t.push(c) : a.push(c);
    }), { "Blocked at Gate": t, "In-Flight (Auto)": a, Done: n };
  }, [y, K]), le = y.filter((t) => t.stage !== "done").length, ae = y.filter((t) => K(t.stage)).length, fe = y.filter((t) => t.stage === "done").length, ve = y.reduce((t, a) => {
    var n;
    return t + (((n = a.parked) == null ? void 0 : n.length) || 0);
  }, 0), ye = {
    pipeline: y.length,
    workspace: Object.keys(F).length,
    crew: Object.keys(T).length,
    status: y.length,
    backlog: ve
  }, pe = (t) => ({
    card: t,
    config: I,
    onApprove: K(t.stage) ? () => i(t.id) : void 0,
    onReject: K(t.stage) ? () => d(t.id) : void 0,
    onCycleTrust: () => de(t.id),
    onCycleDepth: () => re(t.id)
  });
  return /* @__PURE__ */ o(Ae, { children: [
    /* @__PURE__ */ e(De, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    z && /* @__PURE__ */ e(
      Te,
      {
        candidates: q,
        existingRepos: new Set(x.map((t) => t.repo)),
        defaults: I,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: j,
        onCreate: X,
        onClose: () => O(!1)
      }
    ),
    G && /* @__PURE__ */ e(
      Te,
      {
        candidates: q,
        existingRepos: new Set(x.map((t) => t.repo)),
        defaults: I,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: j,
        editPipeline: x.find((t) => t.repo === G) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + G, repo: G, source: "manual", trust: I.trust, depth: I.depth, backlog_intake: !0, sot: "github", steps: be.map((t) => ({ ...t })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: b.filter((t) => {
          var a;
          return (((a = t.source) == null ? void 0 : a.repo) || "unlinked") === G;
        }).length,
        isExample: Ee.has(G),
        onCreate: X,
        onDelete: se,
        onClose: () => W(null)
      }
    ),
    /* @__PURE__ */ o("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ e(Ie, { steps: B, cardsByStage: Q, onNodeClick: M }),
      /* @__PURE__ */ o("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5", children: [
        /* @__PURE__ */ e(we, { label: "Active", value: String(le), accent: !0 }),
        /* @__PURE__ */ e(we, { label: "Gated", value: String(ae) }),
        /* @__PURE__ */ e(we, { label: "Done", value: String(fe) }),
        /* @__PURE__ */ e(we, { label: "Parked", value: String(ve) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ e(
          ze,
          {
            repos: P,
            selected: k,
            onToggle: Y,
            onClear: oe,
            onAddWorkspace: me,
            onEdit: W
          }
        ),
        /* @__PURE__ */ o("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ o("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ e(Be, { active: f, onChange: u, counts: ye }),
            k.size > 0 && /* @__PURE__ */ o(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  k.size === 1 ? [...k][0] : `${k.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ e("button", { onClick: oe, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ e(We, { config: I, onSet: C }),
          N ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : f === "backlog" ? /* @__PURE__ */ e(Ge, { cards: y }) : /* @__PURE__ */ o("div", { ref: w, className: "flex gap-3 overflow-x-auto pb-4", children: [
            f === "pipeline" && B.map((t) => /* @__PURE__ */ e(Ce, { id: `stage-col-${t.id}`, title: t.name, count: (Q[t.id] || []).length, children: (Q[t.id] || []).map((a) => /* @__PURE__ */ e(Ne, { ...pe(a) }, a.id)) }, t.id)),
            f === "workspace" && Object.entries(F).map(([t, a]) => /* @__PURE__ */ e(Ce, { title: t, count: a.length, children: a.map((n) => /* @__PURE__ */ e(Ne, { ...pe(n) }, n.id)) }, t)),
            f === "crew" && Object.entries(T).map(([t, a]) => /* @__PURE__ */ e(Ce, { title: t, count: a.length, children: a.map((n) => /* @__PURE__ */ e(Ne, { ...pe(n) }, n.id)) }, t)),
            f === "status" && Object.entries(Z).map(([t, a]) => /* @__PURE__ */ e(Ce, { title: t, count: a.length, children: a.map((n) => /* @__PURE__ */ e(Ne, { ...pe(n) }, n.id)) }, t))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  Ke as default
};
