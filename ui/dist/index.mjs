import { jsxs as o, Fragment as je, jsx as e } from "react/jsx-runtime";
import { useAppApi as De, useChatLauncher as Le } from "@kirocrew/app-sdk";
import { PageHeader as Me, StatCard as ke } from "@kirocrew/app-sdk/ui";
import { useState as $, useRef as de, useCallback as K, useMemo as ie, useEffect as _e } from "react";
const Ie = "~/.dlc-yolo/state.json", Ae = "/tmp/dlc-yolo/state.json";
let oe = Ie;
const fe = [
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
], Oe = /* @__PURE__ */ new Set([
  "hai-dvash/webapp",
  "hai-dvash/dashboard",
  "hai-dvash/api-core"
]), Be = {
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
}, me = ["manual", "assisted", "autonomous"], ve = ["quick", "standard", "deep"], be = { trust: "assisted", depth: "standard" }, Re = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, $e = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function he({ color: s, children: f, title: v, onClick: x, active: L }) {
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
        boxShadow: L ? `inset 0 0 0 1px color-mix(in srgb, ${s} 55%, transparent)` : "none",
        opacity: x && !L ? 0.85 : 1,
        cursor: x ? "pointer" : "default"
      },
      children: f
    }
  );
}
const Ne = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function We({ steps: s, cardsByStage: f, onNodeClick: v }) {
  const x = de(null), L = de(null), I = de(0), A = de(null), w = de(s), R = de(f), y = de([]);
  w.current = s, R.current = f;
  const u = 3, N = 116, m = N / u, q = m - 26, [j, H] = $(880);
  _e(() => {
    const S = L.current;
    if (!S) return;
    const E = new ResizeObserver((h) => {
      const k = Math.max(360, Math.floor(h[0].contentRect.width));
      H(k);
    });
    return E.observe(S), () => E.disconnect();
  }, []);
  const F = (S) => S.type === "gate" || S.id.startsWith("gate-");
  return _e(() => {
    const S = x.current;
    if (!S) return;
    const E = Math.floor(j / u);
    S.width = E * u, S.height = m * u;
    const h = S.getContext("2d");
    if (!h) return;
    const k = (b, B, W, V, Y) => {
      h.fillStyle = Y, h.fillRect(b * u, B * u, W * u, V * u);
    }, U = () => {
      const b = I.current, B = w.current, W = R.current, V = Math.max(1, B.length);
      Math.max(1, ...B.map((d) => {
        var g;
        return ((g = W[d.id]) == null ? void 0 : g.length) || 0;
      })), k(0, 0, E, q, "#0f172a");
      for (let d = 0; d < E / 5; d++) {
        const g = d * 37 % E, C = d * 13 % (q - 4);
        Math.sin(b * 0.03 + d * 2.1) > 0.35 && k(g, C, 1, 1, "#e2e8f0");
      }
      k(E - 26, 8, 10, 10, "#fde68a"), k(E - 24, 7, 8, 8, "#0f172a");
      for (let d = 0; d < E; d += 16)
        for (let g = q; g < m; g += 16)
          k(d, g, 16, 16, d / 16 + g / 16 & 1 ? "#33261a" : "#2a1f14");
      k(0, q - 2, E, 2, "#4a3520");
      const Y = E / V, ae = [];
      for (let d = 0; d < B.length; d++) {
        const g = B[d], C = Math.round(Y * (d + 0.5)), ee = (W[g.id] || []).length, te = ee > 0, le = Ne[d % Ne.length], re = F(g), Z = q - 2;
        if (ae.push({ x: C - Math.floor(Y / 2), w: Math.floor(Y), id: g.id }), d < B.length - 1) {
          const M = Math.round(Y * (d + 1.5));
          for (let G = C + 8; G < M - 8; G += 4) k(G, q - 1, 2, 1, "#4a3520");
        }
        if (re) {
          const M = Z - 20, G = te ? "#f39c12" : "#3a3222";
          k(C - 3, M, 6, 20, te ? "#5c4a2a" : "#2a2418");
          for (let T = 0; T < 5; T++) k(C - T, M - 5 + T, T * 2 + 1, 1, G);
          for (let T = 0; T < 5; T++) k(C - (4 - T), M - T, (4 - T) * 2 + 1, 1, G);
          if (te) {
            const T = (Math.sin(b * 0.08) + 1) / 2;
            h.globalAlpha = 0.35 + T * 0.4, k(C - 1, M - 6, 2, 2, "#ffd27a"), h.globalAlpha = 1;
          }
        } else {
          const M = Z - 14;
          if (k(C - 10, M, 20, 3, "#7a5c47"), k(C - 10, M - 1, 20, 1, le), k(C - 9, M + 3, 2, 8, "#5c4033"), k(C + 7, M + 3, 2, 8, "#5c4033"), k(C - 5, M - 9, 10, 9, "#333"), k(C - 4, M - 8, 8, 7, te ? "#0a2a0a" : "#1a1a1a"), te)
            for (let G = 0; G < 3; G++) {
              const T = 2 + (b + G * 7) % 5;
              k(C - 3, M - 7 + G * 2, T, 0.8, "#33ff33");
            }
        }
        const pe = Math.min(ee, 5);
        for (let M = 0; M < pe; M++) {
          const G = pe > 1 ? (M - (pe - 1) / 2) * 8 : 0, T = Math.round(C + G) - 3, J = Z - (re ? 2 : 4), ce = Ne[(d + M) % Ne.length], ne = Math.sin(b * 0.08 + d + M) > 0 ? 1 : 0;
          h.fillStyle = "rgba(0,0,0,0.18)", h.fillRect(T * u, (J + 8) * u, 6 * u, u), k(T, J + ne, 6, 6, ce), k(T + 1, J - 4 + ne, 4, 4, "#fdd"), k(T + 1, J - 5 + ne, 4, 1, "#333"), (b + d * 9 + M * 5) % 120 >= 3 && (k(T + 2, J - 3 + ne, 1, 1, "#333"), k(T + 4, J - 3 + ne, 1, 1, "#333")), k(T + 1, J + 6, 1, 2, ce), k(T + 4, J + 6, 1, 2, ce);
        }
        ee > 5 && (h.fillStyle = le, h.font = `${3 * u}px monospace`, h.fillText(`+${ee - 5}`, (C + 10) * u, (Z - 6) * u)), ee > 0 && (h.fillStyle = le, h.fillRect((C + 6) * u, (Z - 30) * u, 9 * u, 9 * u), h.fillStyle = "#0f172a", h.font = `bold ${5 * u}px monospace`, h.textAlign = "center", h.fillText(String(ee), (C + 10.5) * u, (Z - 24) * u), h.textAlign = "left"), h.fillStyle = te ? "#e2e8f0" : "#6b7280", h.font = `${3.4 * u}px monospace`, h.textAlign = "center";
        const se = g.name.length > 12 ? g.name.slice(0, 11) + "…" : g.name;
        h.fillText(se, C * u, (m - 4) * u), h.textAlign = "left";
      }
      y.current = ae;
      const l = B.reduce((d, g) => {
        var C;
        return d + (((C = W[g.id]) == null ? void 0 : C.length) || 0);
      }, 0);
      h.fillStyle = "#f90", h.font = `bold ${3.6 * u}px monospace`, h.fillText(`${l} card${l !== 1 ? "s" : ""} · ${V} milestone${V !== 1 ? "s" : ""}`, 4 * u, 8 * u);
    }, X = () => {
      I.current++, U(), A.current = requestAnimationFrame(X);
    };
    return A.current = requestAnimationFrame(X), () => {
      A.current && cancelAnimationFrame(A.current);
    };
  }, [j, m, q]), /* @__PURE__ */ e("div", { ref: L, className: "w-full mb-5", children: /* @__PURE__ */ e(
    "canvas",
    {
      ref: x,
      onClick: (S) => {
        const E = x.current;
        if (!E) return;
        const h = E.getBoundingClientRect(), k = (S.clientX - h.left) / h.width * (E.width / u), U = y.current.find((X) => k >= X.x && k <= X.x + X.w);
        U && v(U.id);
      },
      style: {
        width: "100%",
        height: N + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function Ge({ active: s, onChange: f, counts: v }) {
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
      ].map((L) => {
        const I = s === L.id, A = v[L.id];
        return /* @__PURE__ */ o(
          "button",
          {
            onClick: () => f(L.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: I ? "var(--accent)" : "transparent",
              color: I ? "var(--bg)" : "var(--muted)"
            },
            children: [
              L.label,
              A > 0 && /* @__PURE__ */ e(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: I ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: I ? "var(--bg)" : "var(--muted)" },
                  children: A
                }
              )
            ]
          },
          L.id
        );
      })
    }
  );
}
function Ce({ card: s, config: f, onApprove: v, onReject: x, onCycleTrust: L, onCycleDepth: I }) {
  var N, m, q;
  const A = s.stage.startsWith("gate-"), w = A ? "var(--warn)" : "var(--border-strong, var(--border))", R = s.trust || f.trust, y = s.depth || f.depth, u = ((N = s.parked) == null ? void 0 : N.length) || 0;
  return /* @__PURE__ */ o(
    "div",
    {
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${w}`
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
            he,
            {
              color: Re[R],
              active: !!s.trust,
              onClick: L,
              title: `trust: ${R}${s.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: R
            }
          ),
          /* @__PURE__ */ e(
            he,
            {
              color: $e[y],
              active: !!s.depth,
              onClick: I,
              title: `depth: ${y}${s.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: y
            }
          ),
          u > 0 && /* @__PURE__ */ o(he, { color: "var(--warn)", title: `${u} parked idea(s)`, children: [
            "⏸ ",
            u
          ] }),
          typeof ((q = s.effort) == null ? void 0 : q.total) == "number" && s.effort.total > 0 && /* @__PURE__ */ o(he, { color: "var(--info)", title: `estimated effort: ${s.effort.total} points`, children: [
            "⚡ ",
            s.effort.total
          ] }),
          s.backstep_history && s.backstep_history.length > 0 && /* @__PURE__ */ o(
            he,
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
            const j = s.decisions[s.decisions.length - 1];
            return /* @__PURE__ */ o(
              he,
              {
                color: "var(--accent)",
                title: `${s.decisions.length} decision${s.decisions.length === 1 ? "" : "s"} — last: ${j.question || j.kind || ""}${j.action ? ` → ${j.action}` : ""}${j.rationale ? `
${j.rationale}` : ""}`,
                children: [
                  "⚖ ",
                  s.decisions.length
                ]
              }
            );
          })()
        ] }),
        A && v && x && /* @__PURE__ */ o("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
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
            var S, E, h;
            const j = (S = s.source) == null ? void 0 : S.repo;
            if (!j) return null;
            const H = (E = s.artifacts) == null ? void 0 : E.pr_url, F = H && ((h = /\/pull\/(\d+)/.exec(H)) == null ? void 0 : h[1]), P = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + j)}` + (F ? `&pr=${F}` : "");
            return /* @__PURE__ */ o(
              "a",
              {
                href: P,
                title: H ? `Deep-review PR #${F} in Code Review Sage` : `Open Code Review Sage for ${j}`,
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
function Se({ title: s, count: f, children: v, id: x }) {
  return /* @__PURE__ */ o("div", { id: x, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ o("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
      /* @__PURE__ */ e("span", { className: "text-[11px] font-semibold uppercase tracking-wide truncate", style: { color: "var(--muted-strong, var(--muted))" }, children: s }),
      /* @__PURE__ */ e(
        "span",
        {
          className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
          children: f
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "flex flex-col gap-2", children: f === 0 ? /* @__PURE__ */ e(
      "div",
      {
        className: "text-[11px] rounded-lg py-3 px-2 text-center",
        style: { color: "var(--muted)", border: "1px dashed var(--border)" },
        children: "empty"
      }
    ) : v })
  ] });
}
function ze({ config: s, onSet: f }) {
  function v({ label: x, value: L, options: I, tokens: A, onPick: w }) {
    return /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: x }),
      /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: I.map((R) => {
        const y = L === R;
        return /* @__PURE__ */ e(
          "button",
          {
            onClick: () => w(R),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: y ? A[R] : "var(--muted)",
              background: y ? `color-mix(in srgb, ${A[R]} 16%, transparent)` : "transparent",
              boxShadow: y ? `inset 0 0 0 1px color-mix(in srgb, ${A[R]} 45%, transparent)` : "none"
            },
            children: R
          },
          R
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
        /* @__PURE__ */ e(v, { label: "Trust", value: s.trust, options: me, tokens: Re, onPick: (x) => f({ trust: x }) }),
        /* @__PURE__ */ e(v, { label: "Depth", value: s.depth, options: ve, tokens: $e, onPick: (x) => f({ depth: x }) }),
        /* @__PURE__ */ e("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function Fe({ cards: s }) {
  const f = s.flatMap(
    (v) => (v.parked || []).map((x) => {
      var L;
      return { ...x, cardTitle: v.title, repo: (L = v.source) == null ? void 0 : L.repo };
    })
  ).sort((v, x) => (x.at || "").localeCompare(v.at || ""));
  return f.length === 0 ? /* @__PURE__ */ o("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ o("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ e("div", { className: "flex flex-col gap-2 max-w-2xl", children: f.map((v) => /* @__PURE__ */ o("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
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
function Ue({ repos: s, selected: f, onToggle: v, onClear: x, onAddWorkspace: L, onEdit: I }) {
  const A = s.reduce((y, u) => y + u.count, 0), w = f.size === 0, R = ({ name: y, count: u, label: N, checked: m, onClick: q, isAll: j }) => {
    const [H, F] = $(!1);
    return /* @__PURE__ */ o(
      "div",
      {
        onMouseEnter: () => F(!0),
        onMouseLeave: () => F(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: m ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: m ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ o(
            "button",
            {
              onClick: q,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                j ? /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: m ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ e(
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
                    children: N
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
          !j && y && /* @__PURE__ */ e(
            "button",
            {
              onClick: (P) => {
                P.stopPropagation(), I(y);
              },
              title: `Edit pipeline "${N}"`,
              "aria-label": `Edit pipeline ${N}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: H ? 1 : 0,
                pointerEvents: H ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (P) => {
                const S = P.currentTarget;
                S.style.color = "var(--accent)", S.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (P) => {
                const S = P.currentTarget;
                S.style.color = "var(--text-strong, var(--text))", S.style.borderColor = "var(--border-strong, var(--border))";
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
          f.size > 0 && /* @__PURE__ */ e("button", { onClick: x, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ e(R, { isAll: !0, count: A, label: "All repos", checked: w, onClick: x }),
        s.map((y) => /* @__PURE__ */ e(
          R,
          {
            name: y.name,
            count: y.count,
            label: (Oe.has(y.name) ? "Example: " : "") + (y.name.includes("/") ? y.name.split("/")[1] : y.name),
            checked: f.has(y.name),
            onClick: () => v(y.name)
          },
          y.name
        )),
        /* @__PURE__ */ o(
          "button",
          {
            onClick: L,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        f.size > 1 && /* @__PURE__ */ o("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          f.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const He = [
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
function qe({ initial: s, knownAgents: f, crews: v, repo: x, stepName: L, onSave: I, onClose: A }) {
  var ae;
  const { openChat: w } = Le(), [R, y] = $(s.name || ""), [u, N] = $(s.role || ""), [m, q] = $(s.tools || ["read"]), [j, H] = $(s.model || "auto"), [F, P] = $(s.crew || ""), [S, E] = $(s.addenda || []), [h, k] = $(s.trust || ""), [U, X] = $(s.depth || ""), b = (l) => q((d) => d.includes(l) ? d.filter((g) => g !== l) : [...d, l]), B = () => E((l) => {
    var d;
    return l.length >= 3 ? l : [...l, { crew: ((d = v[0]) == null ? void 0 : d.name) || "", when: "always", writes: "" }];
  }), W = (l, d) => E((g) => g.map((C, ge) => ge === l ? { ...C, ...d } : C)), V = (l) => E((d) => d.filter((g, C) => C !== l)), Y = R.trim().length > 0;
  return /* @__PURE__ */ o("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ e("button", { onClick: A, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ o("div", { className: "ml-1", children: [
        /* @__PURE__ */ e("div", { className: "text-sm font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Configure Agent" }),
        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "This step's agent (KiroCrew agent config)" })
      ] }),
      /* @__PURE__ */ e(
        "button",
        {
          onClick: () => w({
            message: `/dlc-yolo

Help me design a NEW agent for a custom pipeline step.
Pipeline repo: ${x || "(unset)"}
Step: ${L || "(unnamed)"}

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
      f.length > 0 && /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Reuse an existing agent" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: f.map((l) => /* @__PURE__ */ e(
          "button",
          {
            onClick: () => y(l),
            className: "text-[11px] px-2 py-1 rounded-md font-medium",
            style: {
              background: R === l ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: R === l ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: R === l ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: l
          },
          l
        )) })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: R,
            onChange: (l) => y(l.target.value),
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
            onChange: (l) => N(l.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: He.map((l) => {
          const d = m.includes(l);
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => b(l),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: d ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: d ? "var(--accent)" : "var(--muted)",
                boxShadow: d ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: l
            },
            l
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: j,
            onChange: (l) => H(l.target.value),
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
              value: F,
              onChange: (l) => P(l.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "— none (use step agent) —" }),
                v.map((l) => /* @__PURE__ */ e("option", { value: l.name, children: l.name }, l.name))
              ]
            }
          )
        ] }),
        F && /* @__PURE__ */ e("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: ((ae = v.find((l) => l.name === F)) == null ? void 0 : ae.description) || "Runs this step via select_crew → spawn_run(agent=" + F + ")" })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: B,
              disabled: S.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        S.length === 0 && /* @__PURE__ */ e("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        S.map((l, d) => /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ e(
            "select",
            {
              value: l.crew,
              onChange: (g) => W(d, { crew: g.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: v.map((g) => /* @__PURE__ */ e("option", { value: g.name, children: g.name }, g.name))
            }
          ),
          /* @__PURE__ */ o(
            "select",
            {
              value: l.when || "always",
              onChange: (g) => W(d, { when: g.target.value }),
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
              value: l.writes || "",
              onChange: (g) => W(d, { writes: g.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ e("button", { onClick: () => V(d), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ e("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ e("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, d))
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...me].map((l) => {
          const d = h === l;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => k(l),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: d ? l ? Re[l] : "var(--text)" : "var(--muted)", background: d ? "var(--bg-hover, var(--border))" : "transparent" },
              children: l || "inherit"
            },
            l || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...ve].map((l) => {
          const d = U === l;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => X(l),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: d ? l ? $e[l] : "var(--text)" : "var(--muted)", background: d ? "var(--bg-hover, var(--border))" : "transparent" },
              children: l || "inherit"
            },
            l || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ e("button", { onClick: A, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ e(
        "button",
        {
          disabled: !Y,
          onClick: () => I({
            name: R.trim(),
            role: u.trim() || void 0,
            tools: m,
            model: j.trim() && j.trim() !== "auto" ? j.trim() : void 0,
            crew: F || void 0,
            addenda: S.length ? S.filter((l) => l.crew) : void 0,
            trust: h || void 0,
            depth: U || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save Agent"
        }
      )
    ] })
  ] });
}
function Ee({ candidates: s, existingRepos: f, defaults: v, knownAgents: x, crews: L, onCreate: I, onClose: A, editPipeline: w, cardCount: R, isExample: y, onDelete: u }) {
  var J, ce, ne, ye, xe, we, ue, t, r, n, c, p, _, Q;
  const N = !!w, [m, q] = $((w == null ? void 0 : w.repo) || ""), [j, H] = $((w == null ? void 0 : w.source) || "manual"), [F, P] = $((w == null ? void 0 : w.trust) || v.trust), [S, E] = $((w == null ? void 0 : w.depth) || v.depth), [h, k] = $((w == null ? void 0 : w.backlog_intake) ?? !0), [U, X] = $((w == null ? void 0 : w.results_in_repo) ?? !1), [b, B] = $(() => {
    var a;
    return (a = w == null ? void 0 : w.steps) != null && a.length ? w.steps.map((i) => ({ ...i })) : fe.map((i) => ({ ...i }));
  }), [W, V] = $(null), [Y, ae] = $(""), [l, d] = $("settings"), g = (a) => a.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", C = (a, i) => B((O) => O.map((z, D) => D === a ? { ...z, ...i } : z)), ge = (a) => B((i) => i.filter((O, z) => z !== a)), ee = (a, i) => B((O) => {
    const z = a + i;
    if (z < 0 || z >= O.length) return O;
    const D = [...O];
    return [D[a], D[z]] = [D[z], D[a]], D;
  }), te = (a) => B((i) => [...i, {
    id: `${a}-${Math.random().toString(36).slice(2, 6)}`,
    name: a === "gate" ? "New Gate" : "New Step",
    type: a,
    agent: a === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), le = (a) => {
    q(a.repo), H(a.source);
  }, re = (a) => {
    let i = (a || "").trim();
    if (!i) return "";
    const O = i.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return O && (i = O[1]), i.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, Z = (a) => {
    const i = /github\.com|gitlab\.com/i.test(a);
    q(i ? re(a) : a), H("manual");
  }, pe = /^[^/\s]+\/[^/\s]+$/.test(re(m)) || s.some((a) => a.repo === m), se = !N && f.has(re(m)), M = ({ value: a, options: i, tokens: O, onPick: z }) => /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: i.map((D) => {
    const Te = a === D;
    return /* @__PURE__ */ e(
      "button",
      {
        onClick: () => z(D),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: Te ? O[D] : "var(--muted)",
          background: Te ? `color-mix(in srgb, ${O[D]} 16%, transparent)` : "transparent",
          boxShadow: Te ? `inset 0 0 0 1px color-mix(in srgb, ${O[D]} 45%, transparent)` : "none"
        },
        children: D
      },
      D
    );
  }) }), G = { "issue-radar": [], workspace: [], manual: [] };
  s.forEach((a) => {
    var i;
    (G[i = a.source] || (G[i] = [])).push(a);
  });
  const T = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: A,
      children: /* @__PURE__ */ e(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (a) => a.stopPropagation(),
          children: W !== null ? /* @__PURE__ */ e(
            qe,
            {
              initial: {
                name: ((ce = (J = b[W]) == null ? void 0 : J.agent) == null ? void 0 : ce.name) || "",
                role: (ye = (ne = b[W]) == null ? void 0 : ne.agent) == null ? void 0 : ye.role,
                tools: (we = (xe = b[W]) == null ? void 0 : xe.agent) == null ? void 0 : we.tools,
                model: (t = (ue = b[W]) == null ? void 0 : ue.agent) == null ? void 0 : t.model,
                crew: (n = (r = b[W]) == null ? void 0 : r.agent) == null ? void 0 : n.crew,
                addenda: (c = b[W]) == null ? void 0 : c.addenda,
                trust: (p = b[W]) == null ? void 0 : p.trust,
                depth: (_ = b[W]) == null ? void 0 : _.depth
              },
              knownAgents: x,
              crews: L,
              repo: m,
              stepName: ((Q = b[W]) == null ? void 0 : Q.name) || "",
              onClose: () => V(null),
              onSave: (a) => {
                C(W, {
                  agent: { name: a.name, role: a.role, tools: a.tools, model: a.model, crew: a.crew },
                  addenda: a.addenda,
                  trust: a.trust,
                  depth: a.depth
                }), V(null);
              }
            }
          ) : /* @__PURE__ */ o(je, { children: [
            /* @__PURE__ */ o("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ o("div", { children: [
                /* @__PURE__ */ e("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: N ? "Edit Pipeline" : "New Pipeline" }),
                /* @__PURE__ */ e("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: N ? m.includes("/") ? m.split("/")[1] : m : "Configure a pipeline for a repository or workspace" })
              ] }),
              /* @__PURE__ */ e("button", { onClick: A, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
            ] }),
            N && /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: ["settings", "danger"].map((a) => {
              const i = l === a, O = a === "danger";
              return /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => d(a),
                  className: "text-[12px] px-3 py-2 font-semibold transition-all",
                  style: {
                    color: i ? O ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                    borderBottom: `2px solid ${i ? O ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                    marginBottom: "-1px"
                  },
                  children: a === "settings" ? "Settings" : "Danger Zone"
                },
                a
              );
            }) }),
            /* @__PURE__ */ o(
              "div",
              {
                className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                style: { display: N && l === "danger" ? "none" : "flex" },
                children: [
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: m,
                        onChange: (a) => Z(a.target.value),
                        onPaste: (a) => {
                          const i = a.clipboardData.getData("text");
                          /github\.com|gitlab\.com/i.test(i) && (a.preventDefault(), Z(i));
                        },
                        placeholder: "https://github.com/owner/name  ·  or  owner/name",
                        disabled: N,
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                        style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${se ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                      }
                    ),
                    !N && m && re(m) !== m && /* @__PURE__ */ o("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                      "→ ",
                      /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: re(m) })
                    ] }),
                    se && /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                    /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((a) => G[a].length > 0 && /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: T[a] }),
                      /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1.5", children: G[a].map((i) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => le(i),
                          disabled: f.has(i.repo),
                          title: i.detail || i.repo,
                          className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                          style: {
                            background: m === i.repo ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                            color: m === i.repo ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                            boxShadow: m === i.repo ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                          },
                          children: i.repo.includes("/") ? i.repo.split("/")[1] : i.repo
                        },
                        i.repo
                      )) })
                    ] }, a)) })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                    /* @__PURE__ */ e(M, { value: F, options: me, tokens: Re, onPick: P })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                    /* @__PURE__ */ e(M, { value: S, options: ve, tokens: $e, onPick: E })
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
                        onClick: () => k((a) => !a),
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
                  /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                      /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Also write & commit phase results to ",
                        /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: "docs/dlc/<card>/" }),
                        " in the owned repo (always kept in app data)"
                      ] })
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => X((a) => !a),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: U ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: U ? 20 : 2 }
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
                            onClick: () => te("agent"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                            children: "+ agent"
                          }
                        ),
                        /* @__PURE__ */ e(
                          "button",
                          {
                            onClick: () => te("gate"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                            children: "+ gate"
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: b.map((a, i) => {
                      var O, z;
                      return /* @__PURE__ */ o(
                        "div",
                        {
                          className: "rounded-md p-2",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${a.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                          children: [
                            /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5", children: [
                              /* @__PURE__ */ o("div", { className: "flex flex-col", children: [
                                /* @__PURE__ */ e("button", { onClick: () => ee(i, -1), disabled: i === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                /* @__PURE__ */ e("button", { onClick: () => ee(i, 1), disabled: i === b.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                              ] }),
                              /* @__PURE__ */ e(
                                "input",
                                {
                                  value: a.name,
                                  onChange: (D) => C(i, { name: D.target.value, id: g(D.target.value) }),
                                  className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                }
                              ),
                              /* @__PURE__ */ e(
                                "span",
                                {
                                  className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                  style: { color: a.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${a.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                  children: a.type
                                }
                              ),
                              /* @__PURE__ */ e("button", { onClick: () => ge(i), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                            ] }),
                            a.type === "agent" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                              /* @__PURE__ */ o(
                                "button",
                                {
                                  onClick: () => V(i),
                                  className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                  children: [
                                    "⚙ ",
                                    (O = a.agent) != null && O.name ? `Agent: ${a.agent.name}` : "Configure agent"
                                  ]
                                }
                              ),
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: a.trigger || "ask",
                                  onChange: (D) => C(i, { trigger: D.target.value === "ask" ? void 0 : D.target.value }),
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
                              (a.trust || a.depth) && /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [a.trust, a.depth].filter(Boolean).join(" · ") }),
                              a.addenda && a.addenda.length > 0 && /* @__PURE__ */ o("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                "+",
                                a.addenda.length,
                                " addendum",
                                a.addenda.length === 1 ? "" : "s"
                              ] }),
                              ((z = a.agent) == null ? void 0 : z.role) && /* @__PURE__ */ e("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: a.agent.role })
                            ] }),
                            a.type === "gate" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: a.trust || "",
                                  onChange: (D) => C(i, { trust: D.target.value || void 0 }),
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ e("option", { value: "", children: "inherit" }),
                                    me.map((D) => /* @__PURE__ */ e("option", { value: D, children: D }, D))
                                  ]
                                }
                              )
                            ] })
                          ]
                        },
                        a.id
                      );
                    }) })
                  ] })
                ]
              }
            ),
            N && l === "danger" && u && (() => {
              const a = m.includes("/") ? m.split("/")[1] : m, i = Y.trim() === a;
              return /* @__PURE__ */ e("div", { className: "px-5 pb-4 pt-4", children: y ? /* @__PURE__ */ o(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                  children: [
                    /* @__PURE__ */ o("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "This is a bundled ",
                      /* @__PURE__ */ e("strong", { children: "example" }),
                      " pipeline (",
                      R ?? 0,
                      " sample card",
                      (R ?? 0) === 1 ? "" : "s",
                      "). Remove it any time — it's demo data, not real work."
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => {
                          u(m), A();
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
                      R ?? 0,
                      " card",
                      (R ?? 0) === 1 ? "" : "s",
                      " from DLC-YOLO's local state. It does ",
                      /* @__PURE__ */ e("strong", { children: "not" }),
                      " touch GitHub issues or labels. This cannot be undone."
                    ] }),
                    /* @__PURE__ */ o("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                      "Type ",
                      /* @__PURE__ */ e("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: a }),
                      " to confirm:"
                    ] }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: Y,
                        onChange: (O) => ae(O.target.value),
                        placeholder: a,
                        className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        disabled: !i,
                        onClick: () => {
                          u(m), A();
                        },
                        className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                        style: {
                          background: i ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                          color: i ? "#fff" : "var(--muted)",
                          cursor: i ? "pointer" : "not-allowed"
                        },
                        children: "Delete pipeline"
                      }
                    )
                  ]
                }
              ) });
            })(),
            /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
              /* @__PURE__ */ e("button", { onClick: A, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Cancel" }),
              !(N && l === "danger") && /* @__PURE__ */ e(
                "button",
                {
                  disabled: !pe || !N && se,
                  onClick: () => I({
                    repo: re(m),
                    source: j,
                    trust: F,
                    depth: S,
                    backlog_intake: h,
                    results_in_repo: U,
                    steps: b.map((a) => ({ ...a, label: `dlc:${a.id}` }))
                  }),
                  className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: N ? "Save Pipeline" : "Create Pipeline"
                }
              )
            ] })
          ] })
        }
      )
    }
  );
}
function Je() {
  const s = De(), [f, v] = $([]), [x, L] = $([]), [I, A] = $(be), [w, R] = $(!0), [y, u] = $("pipeline"), [N, m] = $(/* @__PURE__ */ new Set()), [q, j] = $(!1), [H, F] = $(null), [P, S] = $([]), [E, h] = $([]), k = de(null), U = K(async () => {
    try {
      let t;
      try {
        t = await s.get("/api/file-read?path=" + encodeURIComponent(oe));
      } catch (r) {
        if (oe !== Ae)
          oe = Ae, t = await s.get("/api/file-read?path=" + encodeURIComponent(oe));
        else
          throw r;
      }
      v(t.cards || []), L(t.pipelines || []), A({ ...be, ...t.config || {} });
    } catch (t) {
      console.error("Failed to fetch cards:", t);
    } finally {
      R(!1);
    }
  }, [s]), X = ie(() => {
    const t = /* @__PURE__ */ new Map();
    return x.forEach((r) => {
      t.has(r.repo) || t.set(r.repo, 0);
    }), f.forEach((r) => {
      var c;
      const n = ((c = r.source) == null ? void 0 : c.repo) || "unlinked";
      t.set(n, (t.get(n) || 0) + 1);
    }), [...t.entries()].map(([r, n]) => ({ name: r, count: n })).sort((r, n) => n.count - r.count);
  }, [f, x]), b = ie(
    () => N.size === 0 ? f : f.filter((t) => {
      var r;
      return N.has(((r = t.source) == null ? void 0 : r.repo) || "unlinked");
    }),
    [f, N]
  ), B = ie(() => {
    var p;
    let t;
    if (N.size === 1) {
      const _ = [...N][0];
      t = (p = x.find((Q) => Q.repo === _)) == null ? void 0 : p.steps;
    } else x.length === 1 && (t = x[0].steps);
    const r = (t && t.length ? t : fe).map((_) => ({ ..._ })), n = new Set(r.map((_) => _.id)), c = [];
    return n.has("intake") || c.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), c.push(...r), n.has("done") || c.push({ id: "done", name: "Done", type: "agent" }), c;
  }, [N, x]), W = ie(() => B.map((t) => t.id), [B]), V = K((t) => {
    var r;
    return ((r = B.find((n) => n.id === t)) == null ? void 0 : r.type) === "gate" || t.startsWith("gate-");
  }, [B]), Y = K((t) => {
    var r, n;
    return ((n = (r = B.find((c) => c.id === t)) == null ? void 0 : r.agent) == null ? void 0 : n.name) || Be[t] || "unknown";
  }, [B]);
  _e(() => {
    U();
    const t = setInterval(U, 1e4);
    return () => clearInterval(t);
  }, [U]), _e(() => {
    (async () => {
      try {
        const t = await s.get("/api/file-read?path=~/.kiro/crew/config.json"), r = (t == null ? void 0 : t.agents) || {}, n = Object.entries(r).map(([c, p]) => ({
          name: c,
          description: (p == null ? void 0 : p.description) || void 0
        }));
        h(n);
      } catch (t) {
        console.warn("crew roster (config.json) unreadable:", t);
      }
    })();
  }, [s]);
  const ae = (t, r) => {
    const n = (t.pipelines || []).find((_) => _.id === r.pipeline_id) || (t.pipelines || []).find((_) => {
      var Q;
      return _.repo === ((Q = r.source) == null ? void 0 : Q.repo);
    }), p = ["intake", ...(n != null && n.steps && n.steps.length ? n.steps : fe).map((_) => _.id).filter((_) => _ !== "intake" && _ !== "done"), "done"];
    return [...new Set(p)];
  }, l = K(async (t) => {
    var r;
    try {
      const n = await s.get("/api/file-read?path=" + encodeURIComponent(oe)), c = (r = n.cards) == null ? void 0 : r.find((a) => a.id === t);
      if (!c) return;
      const p = ae(n, c), _ = p.indexOf(c.stage);
      if (_ < 0 || _ >= p.length - 1) return;
      const Q = c.stage;
      c.stage = p[_ + 1], c.updated_at = (/* @__PURE__ */ new Date()).toISOString(), c.gate_history = c.gate_history || [], c.gate_history.push({ gate: Q, decision: "approved", at: c.updated_at, notes: "" }), c.history = c.history || [], c.history.push({ from: Q, to: c.stage, at: c.updated_at, agent: "human" }), await s.post("/api/file-write", { path: oe, content: JSON.stringify(n, null, 2) }), U();
    } catch (n) {
      console.error("Failed to advance card:", n);
    }
  }, [s, U]), d = K(async (t) => {
    var r, n;
    try {
      const c = await s.get("/api/file-read?path=" + encodeURIComponent(oe)), p = (r = c.cards) == null ? void 0 : r.find((z) => z.id === t);
      if (!p) return;
      const _ = ae(c, p), Q = new Set((((n = (c.pipelines || []).find((z) => z.id === p.pipeline_id)) == null ? void 0 : n.steps) || fe).filter((z) => z.type === "gate").map((z) => z.id)), a = _.indexOf(p.stage);
      if (a <= 0) return;
      const i = p.stage;
      let O = a - 1;
      for (; O > 0 && (Q.has(_[O]) || _[O].startsWith("gate-")); ) O--;
      p.stage = _[O], p.updated_at = (/* @__PURE__ */ new Date()).toISOString(), p.gate_history = p.gate_history || [], p.gate_history.push({ gate: i, decision: "rejected", at: p.updated_at, notes: "" }), p.history = p.history || [], p.history.push({ from: i, to: p.stage, at: p.updated_at, agent: "human" }), await s.post("/api/file-write", { path: oe, content: JSON.stringify(c, null, 2) }), U();
    } catch (c) {
      console.error("Failed to reject card:", c);
    }
  }, [s, U]), g = K(async (t) => {
    try {
      const r = await s.get("/api/file-read?path=" + encodeURIComponent(oe));
      r.cards = r.cards || [], t(r), await s.post("/api/file-write", { path: oe, content: JSON.stringify(r, null, 2) }), U();
    } catch (r) {
      console.error("Failed to mutate state:", r);
    }
  }, [s, U]), C = K((t) => {
    A((r) => ({ ...r, ...t })), g((r) => {
      r.config = { ...be, ...r.config || {}, ...t };
    });
  }, [g]), ge = K((t) => {
    g((r) => {
      var p;
      const n = r.cards.find((_) => _.id === t);
      if (!n) return;
      const c = n.trust || ((p = r.config) == null ? void 0 : p.trust) || be.trust;
      n.trust = me[(me.indexOf(c) + 1) % me.length], n.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [g]), ee = K((t) => {
    g((r) => {
      var p;
      const n = r.cards.find((_) => _.id === t);
      if (!n) return;
      const c = n.depth || ((p = r.config) == null ? void 0 : p.depth) || be.depth;
      n.depth = ve[(ve.indexOf(c) + 1) % ve.length], n.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [g]), te = K((t) => {
    m((r) => {
      const n = new Set(r);
      return n.has(t) ? n.delete(t) : n.add(t), n;
    });
  }, []), le = K(() => m(/* @__PURE__ */ new Set()), []), re = K(async () => {
    const t = [];
    try {
      const r = await s.get("/api/file-read?path=~/.kiro/crew/config.json"), n = (r == null ? void 0 : r.workspaces) || {};
      Object.entries(n).forEach(([c, p]) => t.push({ repo: c, source: "workspace", detail: (p == null ? void 0 : p.dir) || c }));
    } catch (r) {
      console.warn("workspaces registry unreadable:", r);
    }
    try {
      const r = await s.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((r == null ? void 0 : r.repos) || []).forEach((n) => {
        n != null && n.owner && (n != null && n.repo) && t.push({ repo: `${n.owner}/${n.repo}`, source: "issue-radar", detail: `${n.provider || "github"} · ${n.host || "github.com"}` });
      });
    } catch (r) {
      console.warn("issue-radar config unreadable (app may not be installed):", r);
    }
    S(t), j(!0);
  }, [s]), Z = K(async (t) => {
    const r = (/* @__PURE__ */ new Date()).toISOString(), n = "pl-" + Math.random().toString(36).slice(2, 10);
    await g((c) => {
      c.pipelines = c.pipelines || [];
      const p = c.pipelines.find((_) => _.repo === t.repo);
      p ? (p.source = t.source, p.trust = t.trust, p.depth = t.depth, p.backlog_intake = t.backlog_intake, p.results_in_repo = t.results_in_repo, p.steps = t.steps) : c.pipelines.push({
        id: n,
        repo: t.repo,
        source: t.source,
        trust: t.trust,
        depth: t.depth,
        backlog_intake: t.backlog_intake,
        results_in_repo: t.results_in_repo,
        sot: "github",
        steps: t.steps,
        created_at: r
      });
    }), j(!1), F(null), m(/* @__PURE__ */ new Set([t.repo]));
  }, [g]), pe = K(async (t) => {
    await g((r) => {
      r.pipelines = (r.pipelines || []).filter((n) => n.repo !== t), r.cards = (r.cards || []).filter((n) => {
        var c;
        return (((c = n.source) == null ? void 0 : c.repo) || "unlinked") !== t;
      });
    }), m((r) => {
      const n = new Set(r);
      return n.delete(t), n;
    });
  }, [g]), se = ie(() => W.reduce((t, r) => (t[r] = b.filter((n) => n.stage === r), t), {}), [b, W]), M = K((t) => {
    var r;
    (r = document.getElementById(`stage-col-${t}`)) == null || r.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), G = ie(() => {
    const t = {};
    return b.forEach((r) => {
      var c;
      const n = ((c = r.source) == null ? void 0 : c.repo) || "unlinked";
      (t[n] || (t[n] = [])).push(r);
    }), t;
  }, [b]), T = ie(() => {
    const t = {};
    return b.forEach((r) => {
      const n = Y(r.stage);
      (t[n] || (t[n] = [])).push(r);
    }), t;
  }, [b, Y]), J = ie(() => {
    const t = [], r = [], n = [];
    return b.forEach((c) => {
      c.stage === "done" ? n.push(c) : V(c.stage) ? t.push(c) : r.push(c);
    }), { "Blocked at Gate": t, "In-Flight (Auto)": r, Done: n };
  }, [b, V]), ce = b.filter((t) => t.stage !== "done").length, ne = b.filter((t) => V(t.stage)).length, ye = b.filter((t) => t.stage === "done").length, xe = b.reduce((t, r) => {
    var n;
    return t + (((n = r.parked) == null ? void 0 : n.length) || 0);
  }, 0), we = {
    pipeline: b.length,
    workspace: Object.keys(G).length,
    crew: Object.keys(T).length,
    status: b.length,
    backlog: xe
  }, ue = (t) => ({
    card: t,
    config: I,
    onApprove: V(t.stage) ? () => l(t.id) : void 0,
    onReject: V(t.stage) ? () => d(t.id) : void 0,
    onCycleTrust: () => ge(t.id),
    onCycleDepth: () => ee(t.id)
  });
  return /* @__PURE__ */ o(je, { children: [
    /* @__PURE__ */ e(Me, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    q && /* @__PURE__ */ e(
      Ee,
      {
        candidates: P,
        existingRepos: new Set(x.map((t) => t.repo)),
        defaults: I,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: E,
        onCreate: Z,
        onClose: () => j(!1)
      }
    ),
    H && /* @__PURE__ */ e(
      Ee,
      {
        candidates: P,
        existingRepos: new Set(x.map((t) => t.repo)),
        defaults: I,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: E,
        editPipeline: x.find((t) => t.repo === H) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + H, repo: H, source: "manual", trust: I.trust, depth: I.depth, backlog_intake: !0, sot: "github", steps: fe.map((t) => ({ ...t })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: f.filter((t) => {
          var r;
          return (((r = t.source) == null ? void 0 : r.repo) || "unlinked") === H;
        }).length,
        isExample: Oe.has(H),
        onCreate: Z,
        onDelete: pe,
        onClose: () => F(null)
      }
    ),
    /* @__PURE__ */ o("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ e(We, { steps: B, cardsByStage: se, onNodeClick: M }),
      /* @__PURE__ */ o("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5", children: [
        /* @__PURE__ */ e(ke, { label: "Active", value: String(ce), accent: !0 }),
        /* @__PURE__ */ e(ke, { label: "Gated", value: String(ne) }),
        /* @__PURE__ */ e(ke, { label: "Done", value: String(ye) }),
        /* @__PURE__ */ e(ke, { label: "Parked", value: String(xe) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ e(
          Ue,
          {
            repos: X,
            selected: N,
            onToggle: te,
            onClear: le,
            onAddWorkspace: re,
            onEdit: F
          }
        ),
        /* @__PURE__ */ o("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ o("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ e(Ge, { active: y, onChange: u, counts: we }),
            N.size > 0 && /* @__PURE__ */ o(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  N.size === 1 ? [...N][0] : `${N.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ e("button", { onClick: le, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ e(ze, { config: I, onSet: C }),
          w ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : y === "backlog" ? /* @__PURE__ */ e(Fe, { cards: b }) : /* @__PURE__ */ o("div", { ref: k, className: "flex gap-3 overflow-x-auto pb-4", children: [
            y === "pipeline" && B.map((t) => /* @__PURE__ */ e(Se, { id: `stage-col-${t.id}`, title: t.name, count: (se[t.id] || []).length, children: (se[t.id] || []).map((r) => /* @__PURE__ */ e(Ce, { ...ue(r) }, r.id)) }, t.id)),
            y === "workspace" && Object.entries(G).map(([t, r]) => /* @__PURE__ */ e(Se, { title: t, count: r.length, children: r.map((n) => /* @__PURE__ */ e(Ce, { ...ue(n) }, n.id)) }, t)),
            y === "crew" && Object.entries(T).map(([t, r]) => /* @__PURE__ */ e(Se, { title: t, count: r.length, children: r.map((n) => /* @__PURE__ */ e(Ce, { ...ue(n) }, n.id)) }, t)),
            y === "status" && Object.entries(J).map(([t, r]) => /* @__PURE__ */ e(Se, { title: t, count: r.length, children: r.map((n) => /* @__PURE__ */ e(Ce, { ...ue(n) }, n.id)) }, t))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  Je as default
};
