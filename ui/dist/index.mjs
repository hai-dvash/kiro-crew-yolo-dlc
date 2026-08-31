import { jsxs as o, Fragment as Me, jsx as e } from "react/jsx-runtime";
import { useAppApi as Be, useChatLauncher as We } from "@kirocrew/app-sdk";
import { PageHeader as Ge, StatCard as Se } from "@kirocrew/app-sdk/ui";
import { useState as _, useRef as ue, useCallback as Y, useMemo as pe, useEffect as Te } from "react";
const ze = "~/.dlc-yolo/state.json", De = "/tmp/dlc-yolo/state.json";
let se = ze;
const Ne = [
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
], Ie = /* @__PURE__ */ new Set([
  "hai-dvash/webapp",
  "hai-dvash/dashboard",
  "hai-dvash/api-core"
]), Fe = {
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
}, ve = ["manual", "assisted", "autonomous"], fe = ["quick", "standard", "deep"], ke = { trust: "assisted", depth: "standard" }, Ee = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, Ae = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function be({ color: s, children: f, title: x, onClick: b, active: L }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      title: x,
      onClick: b,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: s,
        background: `color-mix(in srgb, ${s} 14%, transparent)`,
        boxShadow: L ? `inset 0 0 0 1px color-mix(in srgb, ${s} 55%, transparent)` : "none",
        opacity: b && !L ? 0.85 : 1,
        cursor: b ? "pointer" : "default"
      },
      children: f
    }
  );
}
const _e = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Ue({ steps: s, cardsByStage: f, onNodeClick: x }) {
  const b = ue(null), L = ue(null), M = ue(0), A = ue(null), h = ue(s), R = ue(f), y = ue([]);
  h.current = s, R.current = f;
  const m = 3, k = 116, g = k / m, U = g - 26, [O, F] = _(880);
  Te(() => {
    const N = L.current;
    if (!N) return;
    const j = new ResizeObserver((v) => {
      const w = Math.max(360, Math.floor(v[0].contentRect.width));
      F(w);
    });
    return j.observe(N), () => j.disconnect();
  }, []);
  const B = (N) => N.type === "gate" || N.id.startsWith("gate-");
  return Te(() => {
    const N = b.current;
    if (!N) return;
    const j = Math.floor(O / m);
    N.width = j * m, N.height = g * m;
    const v = N.getContext("2d");
    if (!v) return;
    const w = ($, G, q, K, I) => {
      v.fillStyle = I, v.fillRect($ * m, G * m, q * m, K * m);
    }, W = () => {
      const $ = M.current, G = h.current, q = R.current, K = Math.max(1, G.length);
      Math.max(1, ...G.map((i) => {
        var u;
        return ((u = q[i.id]) == null ? void 0 : u.length) || 0;
      })), w(0, 0, j, U, "#0f172a");
      for (let i = 0; i < j / 5; i++) {
        const u = i * 37 % j, C = i * 13 % (U - 4);
        Math.sin($ * 0.03 + i * 2.1) > 0.35 && w(u, C, 1, 1, "#e2e8f0");
      }
      w(j - 26, 8, 10, 10, "#fde68a"), w(j - 24, 7, 8, 8, "#0f172a");
      for (let i = 0; i < j; i += 16)
        for (let u = U; u < g; u += 16)
          w(i, u, 16, 16, i / 16 + u / 16 & 1 ? "#33261a" : "#2a1f14");
      w(0, U - 2, j, 2, "#4a3520");
      const I = j / K, Z = [];
      for (let i = 0; i < G.length; i++) {
        const u = G[i], C = Math.round(I * (i + 0.5)), ae = (q[u.id] || []).length, ne = ae > 0, re = _e[i % _e.length], xe = B(u), ee = U - 2;
        if (Z.push({ x: C - Math.floor(I / 2), w: Math.floor(I), id: u.id }), i < G.length - 1) {
          const T = Math.round(I * (i + 1.5));
          for (let H = C + 8; H < T - 8; H += 4) w(H, U - 1, 2, 1, "#4a3520");
        }
        if (xe) {
          const T = ee - 20, H = ne ? "#f39c12" : "#3a3222";
          w(C - 3, T, 6, 20, ne ? "#5c4a2a" : "#2a2418");
          for (let E = 0; E < 5; E++) w(C - E, T - 5 + E, E * 2 + 1, 1, H);
          for (let E = 0; E < 5; E++) w(C - (4 - E), T - E, (4 - E) * 2 + 1, 1, H);
          if (ne) {
            const E = (Math.sin($ * 0.08) + 1) / 2;
            v.globalAlpha = 0.35 + E * 0.4, w(C - 1, T - 6, 2, 2, "#ffd27a"), v.globalAlpha = 1;
          }
        } else {
          const T = ee - 14;
          if (w(C - 10, T, 20, 3, "#7a5c47"), w(C - 10, T - 1, 20, 1, re), w(C - 9, T + 3, 2, 8, "#5c4033"), w(C + 7, T + 3, 2, 8, "#5c4033"), w(C - 5, T - 9, 10, 9, "#333"), w(C - 4, T - 8, 8, 7, ne ? "#0a2a0a" : "#1a1a1a"), ne)
            for (let H = 0; H < 3; H++) {
              const E = 2 + ($ + H * 7) % 5;
              w(C - 3, T - 7 + H * 2, E, 0.8, "#33ff33");
            }
        }
        const ce = Math.min(ae, 5);
        for (let T = 0; T < ce; T++) {
          const H = ce > 1 ? (T - (ce - 1) / 2) * 8 : 0, E = Math.round(C + H) - 3, J = ee - (xe ? 2 : 4), ie = _e[(i + T) % _e.length], Q = Math.sin($ * 0.08 + i + T) > 0 ? 1 : 0;
          v.fillStyle = "rgba(0,0,0,0.18)", v.fillRect(E * m, (J + 8) * m, 6 * m, m), w(E, J + Q, 6, 6, ie), w(E + 1, J - 4 + Q, 4, 4, "#fdd"), w(E + 1, J - 5 + Q, 4, 1, "#333"), ($ + i * 9 + T * 5) % 120 >= 3 && (w(E + 2, J - 3 + Q, 1, 1, "#333"), w(E + 4, J - 3 + Q, 1, 1, "#333")), w(E + 1, J + 6, 1, 2, ie), w(E + 4, J + 6, 1, 2, ie);
        }
        ae > 5 && (v.fillStyle = re, v.font = `${3 * m}px monospace`, v.fillText(`+${ae - 5}`, (C + 10) * m, (ee - 6) * m)), ae > 0 && (v.fillStyle = re, v.fillRect((C + 6) * m, (ee - 30) * m, 9 * m, 9 * m), v.fillStyle = "#0f172a", v.font = `bold ${5 * m}px monospace`, v.textAlign = "center", v.fillText(String(ae), (C + 10.5) * m, (ee - 24) * m), v.textAlign = "left"), v.fillStyle = ne ? "#e2e8f0" : "#6b7280", v.font = `${3.4 * m}px monospace`, v.textAlign = "center";
        const me = u.name.length > 12 ? u.name.slice(0, 11) + "…" : u.name;
        v.fillText(me, C * m, (g - 4) * m), v.textAlign = "left";
      }
      y.current = Z;
      const l = G.reduce((i, u) => {
        var C;
        return i + (((C = q[u.id]) == null ? void 0 : C.length) || 0);
      }, 0);
      v.fillStyle = "#f90", v.font = `bold ${3.6 * m}px monospace`, v.fillText(`${l} card${l !== 1 ? "s" : ""} · ${K} milestone${K !== 1 ? "s" : ""}`, 4 * m, 8 * m);
    }, P = () => {
      M.current++, W(), A.current = requestAnimationFrame(P);
    };
    return A.current = requestAnimationFrame(P), () => {
      A.current && cancelAnimationFrame(A.current);
    };
  }, [O, g, U]), /* @__PURE__ */ e("div", { ref: L, className: "w-full mb-5", children: /* @__PURE__ */ e(
    "canvas",
    {
      ref: b,
      onClick: (N) => {
        const j = b.current;
        if (!j) return;
        const v = j.getBoundingClientRect(), w = (N.clientX - v.left) / v.width * (j.width / m), W = y.current.find((P) => w >= P.x && w <= P.x + P.w);
        W && x(W.id);
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
function He({ active: s, onChange: f, counts: x }) {
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
        const M = s === L.id, A = x[L.id];
        return /* @__PURE__ */ o(
          "button",
          {
            onClick: () => f(L.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: M ? "var(--accent)" : "transparent",
              color: M ? "var(--bg)" : "var(--muted)"
            },
            children: [
              L.label,
              A > 0 && /* @__PURE__ */ e(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: M ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: M ? "var(--bg)" : "var(--muted)" },
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
function Re({ card: s, config: f, onApprove: x, onReject: b, onCycleTrust: L, onCycleDepth: M }) {
  var k, g, U;
  const A = s.stage.startsWith("gate-"), h = A ? "var(--warn)" : "var(--border-strong, var(--border))", R = s.trust || f.trust, y = s.depth || f.depth, m = ((k = s.parked) == null ? void 0 : k.length) || 0;
  return /* @__PURE__ */ o(
    "div",
    {
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${h}`
      },
      children: [
        /* @__PURE__ */ e("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: s.title }),
        ((g = s.source) == null ? void 0 : g.repo) && /* @__PURE__ */ o(
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
            be,
            {
              color: Ee[R],
              active: !!s.trust,
              onClick: L,
              title: `trust: ${R}${s.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: R
            }
          ),
          /* @__PURE__ */ e(
            be,
            {
              color: Ae[y],
              active: !!s.depth,
              onClick: M,
              title: `depth: ${y}${s.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: y
            }
          ),
          m > 0 && /* @__PURE__ */ o(be, { color: "var(--warn)", title: `${m} parked idea(s)`, children: [
            "⏸ ",
            m
          ] }),
          typeof ((U = s.effort) == null ? void 0 : U.total) == "number" && s.effort.total > 0 && /* @__PURE__ */ o(be, { color: "var(--info)", title: `estimated effort: ${s.effort.total} points`, children: [
            "⚡ ",
            s.effort.total
          ] }),
          s.backstep_history && s.backstep_history.length > 0 && /* @__PURE__ */ o(
            be,
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
              be,
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
        A && x && b && /* @__PURE__ */ o("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          /* @__PURE__ */ e(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--ok)", color: "var(--bg)" },
              onClick: x,
              children: "Approve"
            }
          ),
          /* @__PURE__ */ e(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--danger)", color: "var(--bg)" },
              onClick: b,
              children: "Reject"
            }
          ),
          (s.stage === "gate-review" || /review/i.test(s.stage || "")) && (() => {
            var N, j, v;
            const O = (N = s.source) == null ? void 0 : N.repo;
            if (!O) return null;
            const F = (j = s.artifacts) == null ? void 0 : j.pr_url, B = F && ((v = /\/pull\/(\d+)/.exec(F)) == null ? void 0 : v[1]), V = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + O)}` + (B ? `&pr=${B}` : "");
            return /* @__PURE__ */ o(
              "a",
              {
                href: V,
                title: F ? `Deep-review PR #${B} in Code Review Sage` : `Open Code Review Sage for ${O}`,
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
function $e({ title: s, count: f, children: x, id: b }) {
  return /* @__PURE__ */ o("div", { id: b, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
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
    ) : x })
  ] });
}
function qe({ config: s, onSet: f }) {
  function x({ label: b, value: L, options: M, tokens: A, onPick: h }) {
    return /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: b }),
      /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: M.map((R) => {
        const y = L === R;
        return /* @__PURE__ */ e(
          "button",
          {
            onClick: () => h(R),
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
        /* @__PURE__ */ e(x, { label: "Trust", value: s.trust, options: ve, tokens: Ee, onPick: (b) => f({ trust: b }) }),
        /* @__PURE__ */ e(x, { label: "Depth", value: s.depth, options: fe, tokens: Ae, onPick: (b) => f({ depth: b }) }),
        /* @__PURE__ */ e("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function Ve({ cards: s }) {
  const f = s.flatMap(
    (x) => (x.parked || []).map((b) => {
      var L;
      return { ...b, cardTitle: x.title, repo: (L = x.source) == null ? void 0 : L.repo };
    })
  ).sort((x, b) => (b.at || "").localeCompare(x.at || ""));
  return f.length === 0 ? /* @__PURE__ */ o("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ o("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ e("div", { className: "flex flex-col gap-2 max-w-2xl", children: f.map((x) => /* @__PURE__ */ o("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: x.note }),
    /* @__PURE__ */ o("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ o("span", { children: [
        "from ",
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: x.cardTitle })
      ] }),
      x.phase && /* @__PURE__ */ o("span", { children: [
        "· parked at ",
        x.phase
      ] }),
      x.repo && /* @__PURE__ */ o("span", { children: [
        "· ",
        x.repo
      ] }),
      x.issue_url && /* @__PURE__ */ e("a", { href: x.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, x.id)) });
}
function Ke({ repos: s, selected: f, onToggle: x, onClear: b, onAddWorkspace: L, onEdit: M }) {
  const A = s.reduce((y, m) => y + m.count, 0), h = f.size === 0, R = ({ name: y, count: m, label: k, checked: g, onClick: U, isAll: O }) => {
    const [F, B] = _(!1);
    return /* @__PURE__ */ o(
      "div",
      {
        onMouseEnter: () => B(!0),
        onMouseLeave: () => B(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: g ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: g ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ o(
            "button",
            {
              onClick: U,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                O ? /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: g ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ e(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: g ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${g ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: g && /* @__PURE__ */ e("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ e("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: g ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: k
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    children: m
                  }
                )
              ]
            }
          ),
          !O && y && /* @__PURE__ */ e(
            "button",
            {
              onClick: (V) => {
                V.stopPropagation(), M(y);
              },
              title: `Edit pipeline "${k}"`,
              "aria-label": `Edit pipeline ${k}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: F ? 1 : 0,
                pointerEvents: F ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (V) => {
                const N = V.currentTarget;
                N.style.color = "var(--accent)", N.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (V) => {
                const N = V.currentTarget;
                N.style.color = "var(--text-strong, var(--text))", N.style.borderColor = "var(--border-strong, var(--border))";
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
          f.size > 0 && /* @__PURE__ */ e("button", { onClick: b, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ e(R, { isAll: !0, count: A, label: "All repos", checked: h, onClick: b }),
        s.map((y) => /* @__PURE__ */ e(
          R,
          {
            name: y.name,
            count: y.count,
            label: (Ie.has(y.name) ? "Example: " : "") + (y.name.includes("/") ? y.name.split("/")[1] : y.name),
            checked: f.has(y.name),
            onClick: () => x(y.name)
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
const Ye = [
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
function Je({ initial: s, knownAgents: f, crews: x, repo: b, stepName: L, onSave: M, onClose: A }) {
  var Z;
  const { openChat: h } = We(), [R, y] = _(s.name || ""), [m, k] = _(s.role || ""), [g, U] = _(s.tools || ["read"]), [O, F] = _(s.model || "auto"), [B, V] = _(s.crew || ""), [N, j] = _(s.addenda || []), [v, w] = _(s.trust || ""), [W, P] = _(s.depth || ""), $ = (l) => U((i) => i.includes(l) ? i.filter((u) => u !== l) : [...i, l]), G = () => j((l) => {
    var i;
    return l.length >= 3 ? l : [...l, { crew: ((i = x[0]) == null ? void 0 : i.name) || "", when: "always", writes: "" }];
  }), q = (l, i) => j((u) => u.map((C, le) => le === l ? { ...C, ...i } : C)), K = (l) => j((i) => i.filter((u, C) => C !== l)), I = R.trim().length > 0;
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
          onClick: () => h({
            message: `/dlc-yolo

Help me design a NEW agent for a custom pipeline step.
Pipeline repo: ${b || "(unset)"}
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
            value: m,
            onChange: (l) => k(l.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: Ye.map((l) => {
          const i = g.includes(l);
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => $(l),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: i ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: i ? "var(--accent)" : "var(--muted)",
                boxShadow: i ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
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
            value: O,
            onChange: (l) => F(l.target.value),
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
              value: B,
              onChange: (l) => V(l.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "— none (use step agent) —" }),
                x.map((l) => /* @__PURE__ */ e("option", { value: l.name, children: l.name }, l.name))
              ]
            }
          )
        ] }),
        B && /* @__PURE__ */ e("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: ((Z = x.find((l) => l.name === B)) == null ? void 0 : Z.description) || "Runs this step via select_crew → spawn_run(agent=" + B + ")" })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: G,
              disabled: N.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        N.length === 0 && /* @__PURE__ */ e("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        N.map((l, i) => /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ e(
            "select",
            {
              value: l.crew,
              onChange: (u) => q(i, { crew: u.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: x.map((u) => /* @__PURE__ */ e("option", { value: u.name, children: u.name }, u.name))
            }
          ),
          /* @__PURE__ */ o(
            "select",
            {
              value: l.when || "always",
              onChange: (u) => q(i, { when: u.target.value }),
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
              onChange: (u) => q(i, { writes: u.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ e("button", { onClick: () => K(i), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ e("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ e("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, i))
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...ve].map((l) => {
          const i = v === l;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => w(l),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: i ? l ? Ee[l] : "var(--text)" : "var(--muted)", background: i ? "var(--bg-hover, var(--border))" : "transparent" },
              children: l || "inherit"
            },
            l || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...fe].map((l) => {
          const i = W === l;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => P(l),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: i ? l ? Ae[l] : "var(--text)" : "var(--muted)", background: i ? "var(--bg-hover, var(--border))" : "transparent" },
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
          disabled: !I,
          onClick: () => M({
            name: R.trim(),
            role: m.trim() || void 0,
            tools: g,
            model: O.trim() && O.trim() !== "auto" ? O.trim() : void 0,
            crew: B || void 0,
            addenda: N.length ? N.filter((l) => l.crew) : void 0,
            trust: v || void 0,
            depth: W || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save Agent"
        }
      )
    ] })
  ] });
}
function Le({ candidates: s, existingRepos: f, defaults: x, knownAgents: b, crews: L, onCreate: M, onClose: A, editPipeline: h, cardCount: R, isExample: y, onDelete: m }) {
  var ye, Ce, ge, t, r, n, c, p, S, te, he, we, de, oe;
  const k = !!h, [g, U] = _((h == null ? void 0 : h.repo) || ""), [O, F] = _((h == null ? void 0 : h.source) || "manual"), [B, V] = _((h == null ? void 0 : h.trust) || x.trust), [N, j] = _((h == null ? void 0 : h.depth) || x.depth), [v, w] = _((h == null ? void 0 : h.backlog_intake) ?? !0), [W, P] = _((h == null ? void 0 : h.results_in_repo) ?? !1), [$, G] = _((h == null ? void 0 : h.self_enabling) ?? !1), [q, K] = _((h == null ? void 0 : h.approach) || "simplified"), [I, Z] = _(() => {
    var a;
    return (a = h == null ? void 0 : h.steps) != null && a.length ? h.steps.map((d) => ({ ...d })) : Ne.map((d) => ({ ...d }));
  }), [l, i] = _(null), [u, C] = _(""), [le, ae] = _("settings"), ne = (a) => a.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", re = (a, d) => Z((z) => z.map((X, D) => D === a ? { ...X, ...d } : X)), xe = (a) => Z((d) => d.filter((z, X) => X !== a)), ee = (a, d) => Z((z) => {
    const X = a + d;
    if (X < 0 || X >= z.length) return z;
    const D = [...z];
    return [D[a], D[X]] = [D[X], D[a]], D;
  }), ce = (a) => Z((d) => [...d, {
    id: `${a}-${Math.random().toString(36).slice(2, 6)}`,
    name: a === "gate" ? "New Gate" : "New Step",
    type: a,
    agent: a === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), me = (a) => {
    U(a.repo), F(a.source);
  }, T = (a) => {
    let d = (a || "").trim();
    if (!d) return "";
    const z = d.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return z && (d = z[1]), d.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, H = (a) => {
    const d = /github\.com|gitlab\.com/i.test(a);
    U(d ? T(a) : a), F("manual");
  }, E = /^[^/\s]+\/[^/\s]+$/.test(T(g)) || s.some((a) => a.repo === g), J = !k && f.has(T(g)), ie = ({ value: a, options: d, tokens: z, onPick: X }) => /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: d.map((D) => {
    const Oe = a === D;
    return /* @__PURE__ */ e(
      "button",
      {
        onClick: () => X(D),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: Oe ? z[D] : "var(--muted)",
          background: Oe ? `color-mix(in srgb, ${z[D]} 16%, transparent)` : "transparent",
          boxShadow: Oe ? `inset 0 0 0 1px color-mix(in srgb, ${z[D]} 45%, transparent)` : "none"
        },
        children: D
      },
      D
    );
  }) }), Q = { "issue-radar": [], workspace: [], manual: [] };
  s.forEach((a) => {
    var d;
    (Q[d = a.source] || (Q[d] = [])).push(a);
  });
  const je = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" };
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
          children: l !== null ? /* @__PURE__ */ e(
            Je,
            {
              initial: {
                name: ((Ce = (ye = I[l]) == null ? void 0 : ye.agent) == null ? void 0 : Ce.name) || "",
                role: (t = (ge = I[l]) == null ? void 0 : ge.agent) == null ? void 0 : t.role,
                tools: (n = (r = I[l]) == null ? void 0 : r.agent) == null ? void 0 : n.tools,
                model: (p = (c = I[l]) == null ? void 0 : c.agent) == null ? void 0 : p.model,
                crew: (te = (S = I[l]) == null ? void 0 : S.agent) == null ? void 0 : te.crew,
                addenda: (he = I[l]) == null ? void 0 : he.addenda,
                trust: (we = I[l]) == null ? void 0 : we.trust,
                depth: (de = I[l]) == null ? void 0 : de.depth
              },
              knownAgents: b,
              crews: L,
              repo: g,
              stepName: ((oe = I[l]) == null ? void 0 : oe.name) || "",
              onClose: () => i(null),
              onSave: (a) => {
                re(l, {
                  agent: { name: a.name, role: a.role, tools: a.tools, model: a.model, crew: a.crew },
                  addenda: a.addenda,
                  trust: a.trust,
                  depth: a.depth
                }), i(null);
              }
            }
          ) : /* @__PURE__ */ o(Me, { children: [
            /* @__PURE__ */ o("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ o("div", { children: [
                /* @__PURE__ */ e("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: k ? "Edit Pipeline" : "New Pipeline" }),
                /* @__PURE__ */ e("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: k ? g.includes("/") ? g.split("/")[1] : g : "Configure a pipeline for a repository or workspace" })
              ] }),
              /* @__PURE__ */ e("button", { onClick: A, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
            ] }),
            k && /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: ["settings", "danger"].map((a) => {
              const d = le === a, z = a === "danger";
              return /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => ae(a),
                  className: "text-[12px] px-3 py-2 font-semibold transition-all",
                  style: {
                    color: d ? z ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                    borderBottom: `2px solid ${d ? z ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
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
                style: { display: k && le === "danger" ? "none" : "flex" },
                children: [
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: g,
                        onChange: (a) => H(a.target.value),
                        onPaste: (a) => {
                          const d = a.clipboardData.getData("text");
                          /github\.com|gitlab\.com/i.test(d) && (a.preventDefault(), H(d));
                        },
                        placeholder: "https://github.com/owner/name  ·  or  owner/name",
                        disabled: k,
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                        style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${J ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                      }
                    ),
                    !k && g && T(g) !== g && /* @__PURE__ */ o("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                      "→ ",
                      /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: T(g) })
                    ] }),
                    J && /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                    /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((a) => Q[a].length > 0 && /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: je[a] }),
                      /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1.5", children: Q[a].map((d) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => me(d),
                          disabled: f.has(d.repo),
                          title: d.detail || d.repo,
                          className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                          style: {
                            background: g === d.repo ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                            color: g === d.repo ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                            boxShadow: g === d.repo ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                          },
                          children: d.repo.includes("/") ? d.repo.split("/")[1] : d.repo
                        },
                        d.repo
                      )) })
                    ] }, a)) })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                    /* @__PURE__ */ e(ie, { value: B, options: ve, tokens: Ee, onPick: V })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                    /* @__PURE__ */ e(ie, { value: N, options: fe, tokens: Ae, onPick: j })
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
                        onClick: () => w((a) => !a),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: v ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: v ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                      /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Also commit results & the pipeline conversation to a ",
                        /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: ".dlc-yolo/" }),
                        " copy in the owned repo (always kept in app data)"
                      ] })
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => P((a) => !a),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: W ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: W ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                      /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => G((a) => !a),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: $ ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: $ ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  $ && /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                      /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                    ] }),
                    /* @__PURE__ */ e("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((a) => /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => K(a),
                        className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                        style: {
                          background: q === a ? "var(--accent)" : "transparent",
                          color: q === a ? "var(--bg)" : "var(--muted)",
                          border: `1px solid ${q === a ? "var(--accent)" : "var(--border)"}`
                        },
                        children: a
                      },
                      a
                    )) })
                  ] }),
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1.5", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                      /* @__PURE__ */ o("div", { className: "flex gap-1", children: [
                        /* @__PURE__ */ e(
                          "button",
                          {
                            onClick: () => ce("agent"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                            children: "+ agent"
                          }
                        ),
                        /* @__PURE__ */ e(
                          "button",
                          {
                            onClick: () => ce("gate"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                            children: "+ gate"
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: I.map((a, d) => {
                      var z, X;
                      return /* @__PURE__ */ o(
                        "div",
                        {
                          className: "rounded-md p-2",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${a.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                          children: [
                            /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5", children: [
                              /* @__PURE__ */ o("div", { className: "flex flex-col", children: [
                                /* @__PURE__ */ e("button", { onClick: () => ee(d, -1), disabled: d === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                /* @__PURE__ */ e("button", { onClick: () => ee(d, 1), disabled: d === I.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                              ] }),
                              /* @__PURE__ */ e(
                                "input",
                                {
                                  value: a.name,
                                  onChange: (D) => re(d, { name: D.target.value, id: ne(D.target.value) }),
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
                              /* @__PURE__ */ e("button", { onClick: () => xe(d), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                            ] }),
                            a.type === "agent" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                              /* @__PURE__ */ o(
                                "button",
                                {
                                  onClick: () => i(d),
                                  className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                  children: [
                                    "⚙ ",
                                    (z = a.agent) != null && z.name ? `Agent: ${a.agent.name}` : "Configure agent"
                                  ]
                                }
                              ),
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: a.trigger || "ask",
                                  onChange: (D) => re(d, { trigger: D.target.value === "ask" ? void 0 : D.target.value }),
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
                              ((X = a.agent) == null ? void 0 : X.role) && /* @__PURE__ */ e("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: a.agent.role })
                            ] }),
                            a.type === "gate" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: a.trust || "",
                                  onChange: (D) => re(d, { trust: D.target.value || void 0 }),
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ e("option", { value: "", children: "inherit" }),
                                    ve.map((D) => /* @__PURE__ */ e("option", { value: D, children: D }, D))
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
            k && le === "danger" && m && (() => {
              const a = g.includes("/") ? g.split("/")[1] : g, d = u.trim() === a;
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
                          m(g), A();
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
                        value: u,
                        onChange: (z) => C(z.target.value),
                        placeholder: a,
                        className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        disabled: !d,
                        onClick: () => {
                          m(g), A();
                        },
                        className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                        style: {
                          background: d ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                          color: d ? "#fff" : "var(--muted)",
                          cursor: d ? "pointer" : "not-allowed"
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
              !(k && le === "danger") && /* @__PURE__ */ e(
                "button",
                {
                  disabled: !E || !k && J,
                  onClick: () => M({
                    repo: T(g),
                    source: O,
                    trust: B,
                    depth: N,
                    backlog_intake: v,
                    results_in_repo: W,
                    self_enabling: $,
                    approach: q,
                    steps: I.map((a) => ({ ...a, label: `dlc:${a.id}` }))
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
function et() {
  const s = Be(), [f, x] = _([]), [b, L] = _([]), [M, A] = _(ke), [h, R] = _(!0), [y, m] = _("pipeline"), [k, g] = _(/* @__PURE__ */ new Set()), [U, O] = _(!1), [F, B] = _(null), [V, N] = _([]), [j, v] = _([]), w = ue(null), W = Y(async () => {
    try {
      let t;
      try {
        t = await s.get("/api/file-read?path=" + encodeURIComponent(se));
      } catch (r) {
        if (se !== De)
          se = De, t = await s.get("/api/file-read?path=" + encodeURIComponent(se));
        else
          throw r;
      }
      x(t.cards || []), L(t.pipelines || []), A({ ...ke, ...t.config || {} });
    } catch (t) {
      console.error("Failed to fetch cards:", t);
    } finally {
      R(!1);
    }
  }, [s]), P = pe(() => {
    const t = /* @__PURE__ */ new Map();
    return b.forEach((r) => {
      t.has(r.repo) || t.set(r.repo, 0);
    }), f.forEach((r) => {
      var c;
      const n = ((c = r.source) == null ? void 0 : c.repo) || "unlinked";
      t.set(n, (t.get(n) || 0) + 1);
    }), [...t.entries()].map(([r, n]) => ({ name: r, count: n })).sort((r, n) => n.count - r.count);
  }, [f, b]), $ = pe(
    () => k.size === 0 ? f : f.filter((t) => {
      var r;
      return k.has(((r = t.source) == null ? void 0 : r.repo) || "unlinked");
    }),
    [f, k]
  ), G = pe(() => {
    var p;
    let t;
    if (k.size === 1) {
      const S = [...k][0];
      t = (p = b.find((te) => te.repo === S)) == null ? void 0 : p.steps;
    } else b.length === 1 && (t = b[0].steps);
    const r = (t && t.length ? t : Ne).map((S) => ({ ...S })), n = new Set(r.map((S) => S.id)), c = [];
    return n.has("intake") || c.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), c.push(...r), n.has("done") || c.push({ id: "done", name: "Done", type: "agent" }), c;
  }, [k, b]), q = pe(() => G.map((t) => t.id), [G]), K = Y((t) => {
    var r;
    return ((r = G.find((n) => n.id === t)) == null ? void 0 : r.type) === "gate" || t.startsWith("gate-");
  }, [G]), I = Y((t) => {
    var r, n;
    return ((n = (r = G.find((c) => c.id === t)) == null ? void 0 : r.agent) == null ? void 0 : n.name) || Fe[t] || "unknown";
  }, [G]);
  Te(() => {
    W();
    const t = setInterval(W, 1e4);
    return () => clearInterval(t);
  }, [W]), Te(() => {
    (async () => {
      try {
        const t = await s.get("/api/file-read?path=~/.kiro/crew/config.json"), r = (t == null ? void 0 : t.agents) || {}, n = Object.entries(r).map(([c, p]) => ({
          name: c,
          description: (p == null ? void 0 : p.description) || void 0
        }));
        v(n);
      } catch (t) {
        console.warn("crew roster (config.json) unreadable:", t);
      }
    })();
  }, [s]);
  const Z = (t, r) => {
    const n = (t.pipelines || []).find((S) => S.id === r.pipeline_id) || (t.pipelines || []).find((S) => {
      var te;
      return S.repo === ((te = r.source) == null ? void 0 : te.repo);
    }), p = ["intake", ...(n != null && n.steps && n.steps.length ? n.steps : Ne).map((S) => S.id).filter((S) => S !== "intake" && S !== "done"), "done"];
    return [...new Set(p)];
  }, l = Y(async (t) => {
    var r;
    try {
      const n = await s.get("/api/file-read?path=" + encodeURIComponent(se)), c = (r = n.cards) == null ? void 0 : r.find((he) => he.id === t);
      if (!c) return;
      const p = Z(n, c), S = p.indexOf(c.stage);
      if (S < 0 || S >= p.length - 1) return;
      const te = c.stage;
      c.stage = p[S + 1], c.updated_at = (/* @__PURE__ */ new Date()).toISOString(), c.gate_history = c.gate_history || [], c.gate_history.push({ gate: te, decision: "approved", at: c.updated_at, notes: "" }), c.history = c.history || [], c.history.push({ from: te, to: c.stage, at: c.updated_at, agent: "human" }), await s.post("/api/file-write", { path: se, content: JSON.stringify(n, null, 2) }), W();
    } catch (n) {
      console.error("Failed to advance card:", n);
    }
  }, [s, W]), i = Y(async (t) => {
    var r, n;
    try {
      const c = await s.get("/api/file-read?path=" + encodeURIComponent(se)), p = (r = c.cards) == null ? void 0 : r.find((oe) => oe.id === t);
      if (!p) return;
      const S = Z(c, p), te = new Set((((n = (c.pipelines || []).find((oe) => oe.id === p.pipeline_id)) == null ? void 0 : n.steps) || Ne).filter((oe) => oe.type === "gate").map((oe) => oe.id)), he = S.indexOf(p.stage);
      if (he <= 0) return;
      const we = p.stage;
      let de = he - 1;
      for (; de > 0 && (te.has(S[de]) || S[de].startsWith("gate-")); ) de--;
      p.stage = S[de], p.updated_at = (/* @__PURE__ */ new Date()).toISOString(), p.gate_history = p.gate_history || [], p.gate_history.push({ gate: we, decision: "rejected", at: p.updated_at, notes: "" }), p.history = p.history || [], p.history.push({ from: we, to: p.stage, at: p.updated_at, agent: "human" }), await s.post("/api/file-write", { path: se, content: JSON.stringify(c, null, 2) }), W();
    } catch (c) {
      console.error("Failed to reject card:", c);
    }
  }, [s, W]), u = Y(async (t) => {
    try {
      const r = await s.get("/api/file-read?path=" + encodeURIComponent(se));
      r.cards = r.cards || [], t(r), await s.post("/api/file-write", { path: se, content: JSON.stringify(r, null, 2) }), W();
    } catch (r) {
      console.error("Failed to mutate state:", r);
    }
  }, [s, W]), C = Y((t) => {
    A((r) => ({ ...r, ...t })), u((r) => {
      r.config = { ...ke, ...r.config || {}, ...t };
    });
  }, [u]), le = Y((t) => {
    u((r) => {
      var p;
      const n = r.cards.find((S) => S.id === t);
      if (!n) return;
      const c = n.trust || ((p = r.config) == null ? void 0 : p.trust) || ke.trust;
      n.trust = ve[(ve.indexOf(c) + 1) % ve.length], n.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [u]), ae = Y((t) => {
    u((r) => {
      var p;
      const n = r.cards.find((S) => S.id === t);
      if (!n) return;
      const c = n.depth || ((p = r.config) == null ? void 0 : p.depth) || ke.depth;
      n.depth = fe[(fe.indexOf(c) + 1) % fe.length], n.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [u]), ne = Y((t) => {
    g((r) => {
      const n = new Set(r);
      return n.has(t) ? n.delete(t) : n.add(t), n;
    });
  }, []), re = Y(() => g(/* @__PURE__ */ new Set()), []), xe = Y(async () => {
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
    N(t), O(!0);
  }, [s]), ee = Y(async (t) => {
    const r = (/* @__PURE__ */ new Date()).toISOString(), n = "pl-" + Math.random().toString(36).slice(2, 10);
    await u((c) => {
      c.pipelines = c.pipelines || [];
      const p = c.pipelines.find((S) => S.repo === t.repo);
      p ? (p.source = t.source, p.trust = t.trust, p.depth = t.depth, p.backlog_intake = t.backlog_intake, p.results_in_repo = t.results_in_repo, p.self_enabling = t.self_enabling, p.approach = t.approach, p.steps = t.steps) : c.pipelines.push({
        id: n,
        repo: t.repo,
        source: t.source,
        trust: t.trust,
        depth: t.depth,
        backlog_intake: t.backlog_intake,
        results_in_repo: t.results_in_repo,
        self_enabling: t.self_enabling,
        approach: t.approach,
        sot: "github",
        steps: t.steps,
        created_at: r
      });
    }), O(!1), B(null), g(/* @__PURE__ */ new Set([t.repo]));
  }, [u]), ce = Y(async (t) => {
    await u((r) => {
      r.pipelines = (r.pipelines || []).filter((n) => n.repo !== t), r.cards = (r.cards || []).filter((n) => {
        var c;
        return (((c = n.source) == null ? void 0 : c.repo) || "unlinked") !== t;
      });
    }), g((r) => {
      const n = new Set(r);
      return n.delete(t), n;
    });
  }, [u]), me = pe(() => q.reduce((t, r) => (t[r] = $.filter((n) => n.stage === r), t), {}), [$, q]), T = Y((t) => {
    var r;
    (r = document.getElementById(`stage-col-${t}`)) == null || r.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), H = pe(() => {
    const t = {};
    return $.forEach((r) => {
      var c;
      const n = ((c = r.source) == null ? void 0 : c.repo) || "unlinked";
      (t[n] || (t[n] = [])).push(r);
    }), t;
  }, [$]), E = pe(() => {
    const t = {};
    return $.forEach((r) => {
      const n = I(r.stage);
      (t[n] || (t[n] = [])).push(r);
    }), t;
  }, [$, I]), J = pe(() => {
    const t = [], r = [], n = [];
    return $.forEach((c) => {
      c.stage === "done" ? n.push(c) : K(c.stage) ? t.push(c) : r.push(c);
    }), { "Blocked at Gate": t, "In-Flight (Auto)": r, Done: n };
  }, [$, K]), ie = $.filter((t) => t.stage !== "done").length, Q = $.filter((t) => K(t.stage)).length, je = $.filter((t) => t.stage === "done").length, ye = $.reduce((t, r) => {
    var n;
    return t + (((n = r.parked) == null ? void 0 : n.length) || 0);
  }, 0), Ce = {
    pipeline: $.length,
    workspace: Object.keys(H).length,
    crew: Object.keys(E).length,
    status: $.length,
    backlog: ye
  }, ge = (t) => ({
    card: t,
    config: M,
    onApprove: K(t.stage) ? () => l(t.id) : void 0,
    onReject: K(t.stage) ? () => i(t.id) : void 0,
    onCycleTrust: () => le(t.id),
    onCycleDepth: () => ae(t.id)
  });
  return /* @__PURE__ */ o(Me, { children: [
    /* @__PURE__ */ e(Ge, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    U && /* @__PURE__ */ e(
      Le,
      {
        candidates: V,
        existingRepos: new Set(b.map((t) => t.repo)),
        defaults: M,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: j,
        onCreate: ee,
        onClose: () => O(!1)
      }
    ),
    F && /* @__PURE__ */ e(
      Le,
      {
        candidates: V,
        existingRepos: new Set(b.map((t) => t.repo)),
        defaults: M,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: j,
        editPipeline: b.find((t) => t.repo === F) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + F, repo: F, source: "manual", trust: M.trust, depth: M.depth, backlog_intake: !0, sot: "github", steps: Ne.map((t) => ({ ...t })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: f.filter((t) => {
          var r;
          return (((r = t.source) == null ? void 0 : r.repo) || "unlinked") === F;
        }).length,
        isExample: Ie.has(F),
        onCreate: ee,
        onDelete: ce,
        onClose: () => B(null)
      }
    ),
    /* @__PURE__ */ o("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ e(Ue, { steps: G, cardsByStage: me, onNodeClick: T }),
      /* @__PURE__ */ o("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5", children: [
        /* @__PURE__ */ e(Se, { label: "Active", value: String(ie), accent: !0 }),
        /* @__PURE__ */ e(Se, { label: "Gated", value: String(Q) }),
        /* @__PURE__ */ e(Se, { label: "Done", value: String(je) }),
        /* @__PURE__ */ e(Se, { label: "Parked", value: String(ye) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ e(
          Ke,
          {
            repos: P,
            selected: k,
            onToggle: ne,
            onClear: re,
            onAddWorkspace: xe,
            onEdit: B
          }
        ),
        /* @__PURE__ */ o("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ o("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ e(He, { active: y, onChange: m, counts: Ce }),
            k.size > 0 && /* @__PURE__ */ o(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  k.size === 1 ? [...k][0] : `${k.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ e("button", { onClick: re, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ e(qe, { config: M, onSet: C }),
          h ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : y === "backlog" ? /* @__PURE__ */ e(Ve, { cards: $ }) : /* @__PURE__ */ o("div", { ref: w, className: "flex gap-3 overflow-x-auto pb-4", children: [
            y === "pipeline" && G.map((t) => /* @__PURE__ */ e($e, { id: `stage-col-${t.id}`, title: t.name, count: (me[t.id] || []).length, children: (me[t.id] || []).map((r) => /* @__PURE__ */ e(Re, { ...ge(r) }, r.id)) }, t.id)),
            y === "workspace" && Object.entries(H).map(([t, r]) => /* @__PURE__ */ e($e, { title: t, count: r.length, children: r.map((n) => /* @__PURE__ */ e(Re, { ...ge(n) }, n.id)) }, t)),
            y === "crew" && Object.entries(E).map(([t, r]) => /* @__PURE__ */ e($e, { title: t, count: r.length, children: r.map((n) => /* @__PURE__ */ e(Re, { ...ge(n) }, n.id)) }, t)),
            y === "status" && Object.entries(J).map(([t, r]) => /* @__PURE__ */ e($e, { title: t, count: r.length, children: r.map((n) => /* @__PURE__ */ e(Re, { ...ge(n) }, n.id)) }, t))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  et as default
};
