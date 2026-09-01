import { jsxs as o, Fragment as Le, jsx as t } from "react/jsx-runtime";
import { useAppApi as Ve, useChatLauncher as Je } from "@kirocrew/app-sdk";
import { PageHeader as Ke, StatCard as Ae } from "@kirocrew/app-sdk/ui";
import { useState as k, useRef as ce, useCallback as F, useMemo as le, useEffect as Me } from "react";
const Ye = "~/.dlc-yolo/state.json", ze = "/tmp/dlc-yolo/state.json";
let X = Ye;
const ke = [
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
], Fe = /* @__PURE__ */ new Set([
  "hai-dvash/webapp",
  "hai-dvash/dashboard",
  "hai-dvash/api-core"
]), Xe = {
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
}, pe = ["manual", "assisted", "autonomous"], ve = ["quick", "standard", "deep"], we = { trust: "assisted", depth: "standard" }, Be = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, We = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function he({ color: l, children: y, title: f, onClick: x, active: D }) {
  return /* @__PURE__ */ t(
    "button",
    {
      type: "button",
      title: f,
      onClick: x,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: l,
        background: `color-mix(in srgb, ${l} 14%, transparent)`,
        boxShadow: D ? `inset 0 0 0 1px color-mix(in srgb, ${l} 55%, transparent)` : "none",
        opacity: x && !D ? 0.85 : 1,
        cursor: x ? "pointer" : "default"
      },
      children: y
    }
  );
}
const De = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Ze({ steps: l, cardsByStage: y, onNodeClick: f }) {
  const x = ce(null), D = ce(null), E = ce(0), T = ce(null), v = ce(l), _ = ce(y), N = ce([]);
  v.current = l, _.current = y;
  const m = 3, w = 116, u = w / m, U = u - 26, [W, z] = k(880);
  Me(() => {
    const C = D.current;
    if (!C) return;
    const $ = new ResizeObserver((b) => {
      const p = Math.max(360, Math.floor(b[0].contentRect.width));
      z(p);
    });
    return $.observe(C), () => $.disconnect();
  }, []);
  const M = (C) => C.type === "gate" || C.id.startsWith("gate-");
  return Me(() => {
    const C = x.current;
    if (!C) return;
    const $ = Math.floor(W / m);
    C.width = $ * m, C.height = u * m;
    const b = C.getContext("2d");
    if (!b) return;
    const p = (G, J, B, I, L) => {
      b.fillStyle = L, b.fillRect(G * m, J * m, B * m, I * m);
    }, q = () => {
      const G = E.current, J = v.current, B = _.current, I = Math.max(1, J.length);
      Math.max(1, ...J.map((i) => {
        var g;
        return ((g = B[i.id]) == null ? void 0 : g.length) || 0;
      })), p(0, 0, $, U, "#0f172a");
      for (let i = 0; i < $ / 5; i++) {
        const g = i * 37 % $, S = i * 13 % (U - 4);
        Math.sin(G * 0.03 + i * 2.1) > 0.35 && p(g, S, 1, 1, "#e2e8f0");
      }
      p($ - 26, 8, 10, 10, "#fde68a"), p($ - 24, 7, 8, 8, "#0f172a");
      for (let i = 0; i < $; i += 16)
        for (let g = U; g < u; g += 16)
          p(i, g, 16, 16, i / 16 + g / 16 & 1 ? "#33261a" : "#2a1f14");
      p(0, U - 2, $, 2, "#4a3520");
      const L = $ / I, j = [];
      for (let i = 0; i < J.length; i++) {
        const g = J[i], S = Math.round(L * (i + 0.5)), te = (B[g.id] || []).length, re = te > 0, ae = De[i % De.length], ue = M(g), O = U - 2;
        if (j.push({ x: S - Math.floor(L / 2), w: Math.floor(L), id: g.id }), i < J.length - 1) {
          const R = Math.round(L * (i + 1.5));
          for (let H = S + 8; H < R - 8; H += 4) p(H, U - 1, 2, 1, "#4a3520");
        }
        if (ue) {
          const R = O - 20, H = re ? "#f39c12" : "#3a3222";
          p(S - 3, R, 6, 20, re ? "#5c4a2a" : "#2a2418");
          for (let A = 0; A < 5; A++) p(S - A, R - 5 + A, A * 2 + 1, 1, H);
          for (let A = 0; A < 5; A++) p(S - (4 - A), R - A, (4 - A) * 2 + 1, 1, H);
          if (re) {
            const A = (Math.sin(G * 0.08) + 1) / 2;
            b.globalAlpha = 0.35 + A * 0.4, p(S - 1, R - 6, 2, 2, "#ffd27a"), b.globalAlpha = 1;
          }
        } else {
          const R = O - 14;
          if (p(S - 10, R, 20, 3, "#7a5c47"), p(S - 10, R - 1, 20, 1, ae), p(S - 9, R + 3, 2, 8, "#5c4033"), p(S + 7, R + 3, 2, 8, "#5c4033"), p(S - 5, R - 9, 10, 9, "#333"), p(S - 4, R - 8, 8, 7, re ? "#0a2a0a" : "#1a1a1a"), re)
            for (let H = 0; H < 3; H++) {
              const A = 2 + (G + H * 7) % 5;
              p(S - 3, R - 7 + H * 2, A, 0.8, "#33ff33");
            }
        }
        const ie = Math.min(te, 5);
        for (let R = 0; R < ie; R++) {
          const H = ie > 1 ? (R - (ie - 1) / 2) * 8 : 0, A = Math.round(S + H) - 3, Y = O - (ue ? 2 : 4), se = De[(i + R) % De.length], Q = Math.sin(G * 0.08 + i + R) > 0 ? 1 : 0;
          b.fillStyle = "rgba(0,0,0,0.18)", b.fillRect(A * m, (Y + 8) * m, 6 * m, m), p(A, Y + Q, 6, 6, se), p(A + 1, Y - 4 + Q, 4, 4, "#fdd"), p(A + 1, Y - 5 + Q, 4, 1, "#333"), (G + i * 9 + R * 5) % 120 >= 3 && (p(A + 2, Y - 3 + Q, 1, 1, "#333"), p(A + 4, Y - 3 + Q, 1, 1, "#333")), p(A + 1, Y + 6, 1, 2, se), p(A + 4, Y + 6, 1, 2, se);
        }
        te > 5 && (b.fillStyle = ae, b.font = `${3 * m}px monospace`, b.fillText(`+${te - 5}`, (S + 10) * m, (O - 6) * m)), te > 0 && (b.fillStyle = ae, b.fillRect((S + 6) * m, (O - 30) * m, 9 * m, 9 * m), b.fillStyle = "#0f172a", b.font = `bold ${5 * m}px monospace`, b.textAlign = "center", b.fillText(String(te), (S + 10.5) * m, (O - 24) * m), b.textAlign = "left"), b.fillStyle = re ? "#e2e8f0" : "#6b7280", b.font = `${3.4 * m}px monospace`, b.textAlign = "center";
        const xe = g.name.length > 12 ? g.name.slice(0, 11) + "…" : g.name;
        b.fillText(xe, S * m, (u - 4) * m), b.textAlign = "left";
      }
      N.current = j;
      const c = J.reduce((i, g) => {
        var S;
        return i + (((S = B[g.id]) == null ? void 0 : S.length) || 0);
      }, 0);
      b.fillStyle = "#f90", b.font = `bold ${3.6 * m}px monospace`, b.fillText(`${c} card${c !== 1 ? "s" : ""} · ${I} milestone${I !== 1 ? "s" : ""}`, 4 * m, 8 * m);
    }, V = () => {
      E.current++, q(), T.current = requestAnimationFrame(V);
    };
    return T.current = requestAnimationFrame(V), () => {
      T.current && cancelAnimationFrame(T.current);
    };
  }, [W, u, U]), /* @__PURE__ */ t("div", { ref: D, className: "w-full mb-5", children: /* @__PURE__ */ t(
    "canvas",
    {
      ref: x,
      onClick: (C) => {
        const $ = x.current;
        if (!$) return;
        const b = $.getBoundingClientRect(), p = (C.clientX - b.left) / b.width * ($.width / m), q = N.current.find((V) => p >= V.x && p <= V.x + V.w);
        q && f(q.id);
      },
      style: {
        width: "100%",
        height: w + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function Qe({ active: l, onChange: y, counts: f }) {
  return /* @__PURE__ */ t(
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
        const E = l === D.id, T = f[D.id];
        return /* @__PURE__ */ o(
          "button",
          {
            onClick: () => y(D.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: E ? "var(--accent)" : "transparent",
              color: E ? "var(--bg)" : "var(--muted)"
            },
            children: [
              D.label,
              T > 0 && /* @__PURE__ */ t(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: E ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: E ? "var(--bg)" : "var(--muted)" },
                  children: T
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
function Ee({ card: l, config: y, onApprove: f, onReject: x, onCycleTrust: D, onCycleDepth: E, onInterject: T, onResolveDecision: v }) {
  var C, $, b;
  const _ = l.stage.startsWith("gate-"), N = _ ? "var(--warn)" : "var(--border-strong, var(--border))", m = l.trust || y.trust, w = l.depth || y.depth, u = ((C = l.parked) == null ? void 0 : C.length) || 0, [U, W] = k(!1), [z, M] = k(""), K = (l.decisions || []).filter((p) => !p.chosen && (p.action === "add-addendum" || p.options));
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
        /* @__PURE__ */ t("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: l.title }),
        (($ = l.source) == null ? void 0 : $.repo) && /* @__PURE__ */ o(
          "a",
          {
            href: l.source.url || void 0,
            target: "_blank",
            rel: "noreferrer",
            className: "text-[11px] mt-0.5 inline-block truncate max-w-full hover:underline",
            style: { color: "var(--muted)" },
            children: [
              l.source.repo,
              l.source.issue ? `#${l.source.issue}` : ""
            ]
          }
        ),
        /* @__PURE__ */ o("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ t(
            he,
            {
              color: Be[m],
              active: !!l.trust,
              onClick: D,
              title: `trust: ${m}${l.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: m
            }
          ),
          /* @__PURE__ */ t(
            he,
            {
              color: We[w],
              active: !!l.depth,
              onClick: E,
              title: `depth: ${w}${l.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: w
            }
          ),
          u > 0 && /* @__PURE__ */ o(he, { color: "var(--warn)", title: `${u} parked idea(s)`, children: [
            "⏸ ",
            u
          ] }),
          typeof ((b = l.effort) == null ? void 0 : b.total) == "number" && l.effort.total > 0 && /* @__PURE__ */ o(he, { color: "var(--info)", title: `estimated effort: ${l.effort.total} points`, children: [
            "⚡ ",
            l.effort.total
          ] }),
          l.backstep_history && l.backstep_history.length > 0 && /* @__PURE__ */ o(
            he,
            {
              color: "var(--danger)",
              title: `stepped back ${l.backstep_history.length}× — last: ${l.backstep_history[l.backstep_history.length - 1].reason}`,
              children: [
                "↩ ",
                l.backstep_history.length
              ]
            }
          ),
          l.decisions && l.decisions.length > 0 && (() => {
            const p = l.decisions[l.decisions.length - 1];
            return /* @__PURE__ */ o(
              he,
              {
                color: "var(--accent)",
                title: `${l.decisions.length} decision${l.decisions.length === 1 ? "" : "s"} — last: ${p.question || p.kind || ""}${p.action ? ` → ${p.action}` : ""}${p.rationale ? `
${p.rationale}` : ""}`,
                children: [
                  "⚖ ",
                  l.decisions.length
                ]
              }
            );
          })()
        ] }),
        _ && f && x && /* @__PURE__ */ o("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          /* @__PURE__ */ t(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--ok)", color: "var(--bg)" },
              onClick: f,
              children: "Approve"
            }
          ),
          /* @__PURE__ */ t(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--danger)", color: "var(--bg)" },
              onClick: x,
              children: "Reject"
            }
          ),
          (l.stage === "gate-review" || /review/i.test(l.stage || "")) && (() => {
            var J, B, I;
            const p = (J = l.source) == null ? void 0 : J.repo;
            if (!p) return null;
            const q = (B = l.artifacts) == null ? void 0 : B.pr_url, V = q && ((I = /\/pull\/(\d+)/.exec(q)) == null ? void 0 : I[1]), G = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + p)}` + (V ? `&pr=${V}` : "");
            return /* @__PURE__ */ o(
              "a",
              {
                href: G,
                title: q ? `Deep-review PR #${V} in Code Review Sage` : `Open Code Review Sage for ${p}`,
                className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
                style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: [
                  /* @__PURE__ */ o("svg", { width: "11", height: "11", viewBox: "0 0 16 16", fill: "none", children: [
                    /* @__PURE__ */ t("circle", { cx: "7", cy: "7", r: "4.5", stroke: "currentColor", strokeWidth: "1.5" }),
                    /* @__PURE__ */ t("path", { d: "M10.5 10.5L14 14", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                  ] }),
                  "Review in Sage"
                ]
              }
            );
          })()
        ] }),
        v && K.map((p) => /* @__PURE__ */ o(
          "div",
          {
            className: "mt-2 p-1.5 rounded-md text-[11px]",
            style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
            children: [
              /* @__PURE__ */ o("div", { style: { color: "var(--text, var(--muted))" }, children: [
                "⚖ ",
                p.question || p.kind
              ] }),
              /* @__PURE__ */ o("div", { className: "mt-1 flex gap-1.5", children: [
                /* @__PURE__ */ t(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--ok)", color: "var(--bg)" },
                    onClick: () => v(p.id, "approve"),
                    children: "Approve"
                  }
                ),
                /* @__PURE__ */ t(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    onClick: () => v(p.id, "decline"),
                    children: "Decline"
                  }
                )
              ] })
            ]
          },
          p.id
        )),
        T && (U ? /* @__PURE__ */ o("div", { className: "mt-2 flex flex-col gap-1", children: [
          /* @__PURE__ */ t(
            "textarea",
            {
              value: z,
              onChange: (p) => M(p.target.value),
              placeholder: "Interject: design/spec note, re-scope…",
              rows: 2,
              className: "w-full text-[11px] px-2 py-1 rounded outline-none resize-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ o("div", { className: "flex gap-1.5", children: [
            /* @__PURE__ */ t(
              "button",
              {
                className: "text-[11px] px-2 py-0.5 rounded font-semibold",
                style: { background: "var(--accent)", color: "var(--bg)" },
                onClick: () => {
                  z.trim() && (T("note", z.trim()), M(""), W(!1));
                },
                children: "Send"
              }
            ),
            /* @__PURE__ */ t(
              "button",
              {
                className: "text-[11px] px-2 py-0.5 rounded",
                style: { color: "var(--muted)" },
                onClick: () => {
                  W(!1), M("");
                },
                children: "Cancel"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ t(
          "button",
          {
            className: "mt-2 text-[10px] hover:underline",
            style: { color: "var(--muted)" },
            onClick: () => W(!0),
            children: "+ interject"
          }
        ))
      ]
    }
  );
}
function Ie({ title: l, count: y, children: f, id: x }) {
  return /* @__PURE__ */ o("div", { id: x, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ o("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
      /* @__PURE__ */ t("span", { className: "text-[11px] font-semibold uppercase tracking-wide truncate", style: { color: "var(--muted-strong, var(--muted))" }, children: l }),
      /* @__PURE__ */ t(
        "span",
        {
          className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
          children: y
        }
      )
    ] }),
    /* @__PURE__ */ t("div", { className: "flex flex-col gap-2", children: y === 0 ? /* @__PURE__ */ t(
      "div",
      {
        className: "text-[11px] rounded-lg py-3 px-2 text-center",
        style: { color: "var(--muted)", border: "1px dashed var(--border)" },
        children: "empty"
      }
    ) : f })
  ] });
}
function Pe({ config: l, onSet: y }) {
  function f({ label: x, value: D, options: E, tokens: T, onPick: v }) {
    return /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: x }),
      /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: E.map((_) => {
        const N = D === _;
        return /* @__PURE__ */ t(
          "button",
          {
            onClick: () => v(_),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: N ? T[_] : "var(--muted)",
              background: N ? `color-mix(in srgb, ${T[_]} 16%, transparent)` : "transparent",
              boxShadow: N ? `inset 0 0 0 1px color-mix(in srgb, ${T[_]} 45%, transparent)` : "none"
            },
            children: _
          },
          _
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
        /* @__PURE__ */ t("span", { className: "text-xs font-semibold", style: { color: "var(--muted-strong, var(--muted))" }, children: "Defaults" }),
        /* @__PURE__ */ t(f, { label: "Trust", value: l.trust, options: pe, tokens: Be, onPick: (x) => y({ trust: x }) }),
        /* @__PURE__ */ t(f, { label: "Depth", value: l.depth, options: ve, tokens: We, onPick: (x) => y({ depth: x }) }),
        /* @__PURE__ */ t("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function et({ cards: l }) {
  const y = l.flatMap(
    (f) => (f.parked || []).map((x) => {
      var D;
      return { ...x, cardTitle: f.title, repo: (D = f.source) == null ? void 0 : D.repo };
    })
  ).sort((f, x) => (x.at || "").localeCompare(f.at || ""));
  return y.length === 0 ? /* @__PURE__ */ o("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ o("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ t("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ t("div", { className: "flex flex-col gap-2 max-w-2xl", children: y.map((f) => /* @__PURE__ */ o("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: f.note }),
    /* @__PURE__ */ o("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ o("span", { children: [
        "from ",
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: f.cardTitle })
      ] }),
      f.phase && /* @__PURE__ */ o("span", { children: [
        "· parked at ",
        f.phase
      ] }),
      f.repo && /* @__PURE__ */ o("span", { children: [
        "· ",
        f.repo
      ] }),
      f.issue_url && /* @__PURE__ */ t("a", { href: f.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, f.id)) });
}
function tt({ repos: l, selected: y, onToggle: f, onClear: x, onAddWorkspace: D, onEdit: E }) {
  const T = l.reduce((N, m) => N + m.count, 0), v = y.size === 0, _ = ({ name: N, count: m, label: w, checked: u, onClick: U, isAll: W }) => {
    const [z, M] = k(!1);
    return /* @__PURE__ */ o(
      "div",
      {
        onMouseEnter: () => M(!0),
        onMouseLeave: () => M(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: u ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: u ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ o(
            "button",
            {
              onClick: U,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                W ? /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: u ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ t(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: u ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${u ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: u && /* @__PURE__ */ t("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ t("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ t(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: u ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: w
                  }
                ),
                /* @__PURE__ */ t(
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
          !W && N && /* @__PURE__ */ t(
            "button",
            {
              onClick: (K) => {
                K.stopPropagation(), E(N);
              },
              title: `Edit pipeline "${w}"`,
              "aria-label": `Edit pipeline ${w}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: z ? 1 : 0,
                pointerEvents: z ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (K) => {
                const C = K.currentTarget;
                C.style.color = "var(--accent)", C.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (K) => {
                const C = K.currentTarget;
                C.style.color = "var(--text-strong, var(--text))", C.style.borderColor = "var(--border-strong, var(--border))";
              },
              children: /* @__PURE__ */ t("svg", { width: "13", height: "13", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ t("path", { d: "M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) })
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
          /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspaces" }),
          y.size > 0 && /* @__PURE__ */ t("button", { onClick: x, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ t(_, { isAll: !0, count: T, label: "All repos", checked: v, onClick: x }),
        l.map((N) => /* @__PURE__ */ t(
          _,
          {
            name: N.name,
            count: N.count,
            label: (Fe.has(N.name) ? "Example: " : "") + (N.name.includes("/") ? N.name.split("/")[1] : N.name),
            checked: y.has(N.name),
            onClick: () => f(N.name)
          },
          N.name
        )),
        /* @__PURE__ */ o(
          "button",
          {
            onClick: D,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ t("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        y.size > 1 && /* @__PURE__ */ o("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          y.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const rt = [
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
function at({ initial: l, knownAgents: y, crews: f, repo: x, stepName: D, onSave: E, onClose: T }) {
  var j;
  const { openChat: v } = Je(), [_, N] = k(l.name || ""), [m, w] = k(l.role || ""), [u, U] = k(l.tools || ["read"]), [W, z] = k(l.model || "auto"), [M, K] = k(l.crew || ""), [C, $] = k(l.addenda || []), [b, p] = k(l.trust || ""), [q, V] = k(l.depth || ""), G = (c) => U((i) => i.includes(c) ? i.filter((g) => g !== c) : [...i, c]), J = () => $((c) => {
    var i;
    return c.length >= 3 ? c : [...c, { crew: ((i = f[0]) == null ? void 0 : i.name) || "", when: "always", writes: "" }];
  }), B = (c, i) => $((g) => g.map((S, Z) => Z === c ? { ...S, ...i } : S)), I = (c) => $((i) => i.filter((g, S) => S !== c)), L = _.trim().length > 0;
  return /* @__PURE__ */ o("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ t("button", { onClick: T, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ o("div", { className: "ml-1", children: [
        /* @__PURE__ */ t("div", { className: "text-sm font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Configure Agent" }),
        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "This step's agent (KiroCrew agent config)" })
      ] }),
      /* @__PURE__ */ t(
        "button",
        {
          onClick: () => v({
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
      y.length > 0 && /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Reuse an existing agent" }),
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: y.map((c) => /* @__PURE__ */ t(
          "button",
          {
            onClick: () => N(c),
            className: "text-[11px] px-2 py-1 rounded-md font-medium",
            style: {
              background: _ === c ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: _ === c ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: _ === c ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: c
          },
          c
        )) })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: _,
            onChange: (c) => N(c.target.value),
            placeholder: "e.g. impl-agent",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Role / prompt" }),
        /* @__PURE__ */ t(
          "textarea",
          {
            value: m,
            onChange: (c) => w(c.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: rt.map((c) => {
          const i = u.includes(c);
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => G(c),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: i ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: i ? "var(--accent)" : "var(--muted)",
                boxShadow: i ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: c
            },
            c
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: W,
            onChange: (c) => z(c.target.value),
            placeholder: "auto",
            className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Crew" }),
          /* @__PURE__ */ o(
            "select",
            {
              value: M,
              onChange: (c) => K(c.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "— none (use step agent) —" }),
                f.map((c) => /* @__PURE__ */ t("option", { value: c.name, children: c.name }, c.name))
              ]
            }
          )
        ] }),
        M && /* @__PURE__ */ t("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: ((j = f.find((c) => c.name === M)) == null ? void 0 : j.description) || "Runs this step via select_crew → spawn_run(agent=" + M + ")" })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ t(
            "button",
            {
              onClick: J,
              disabled: C.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ t("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        C.length === 0 && /* @__PURE__ */ t("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        C.map((c, i) => /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ t(
            "select",
            {
              value: c.crew,
              onChange: (g) => B(i, { crew: g.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: f.map((g) => /* @__PURE__ */ t("option", { value: g.name, children: g.name }, g.name))
            }
          ),
          /* @__PURE__ */ o(
            "select",
            {
              value: c.when || "always",
              onChange: (g) => B(i, { when: g.target.value }),
              title: "Integration trigger — when this addendum runs",
              className: "px-1.5 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "always", children: "always" }),
                /* @__PURE__ */ t("option", { value: "depth:deep", children: "depth:deep" }),
                /* @__PURE__ */ t("option", { value: "kind:bug", children: "kind:bug" }),
                /* @__PURE__ */ t("option", { value: "manual", children: "manual" })
              ]
            }
          ),
          /* @__PURE__ */ t(
            "input",
            {
              value: c.writes || "",
              onChange: (g) => B(i, { writes: g.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ t("button", { onClick: () => I(i), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ t("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ t("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, i))
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...pe].map((c) => {
          const i = b === c;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => p(c),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: i ? c ? Be[c] : "var(--text)" : "var(--muted)", background: i ? "var(--bg-hover, var(--border))" : "transparent" },
              children: c || "inherit"
            },
            c || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...ve].map((c) => {
          const i = q === c;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => V(c),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: i ? c ? We[c] : "var(--text)" : "var(--muted)", background: i ? "var(--bg-hover, var(--border))" : "transparent" },
              children: c || "inherit"
            },
            c || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ t("button", { onClick: T, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ t(
        "button",
        {
          disabled: !L,
          onClick: () => E({
            name: _.trim(),
            role: m.trim() || void 0,
            tools: u,
            model: W.trim() && W.trim() !== "auto" ? W.trim() : void 0,
            crew: M || void 0,
            addenda: C.length ? C.filter((c) => c.crew) : void 0,
            trust: b || void 0,
            depth: q || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save Agent"
        }
      )
    ] })
  ] });
}
function Ge({ candidates: l, existingRepos: y, defaults: f, knownAgents: x, crews: D, onCreate: E, onClose: T, editPipeline: v, cardCount: _, isExample: N, onDelete: m }) {
  var Se, me, Ce, be, fe, _e, Re, Te, $e, ye, je, de, r, n;
  const w = !!v, [u, U] = k((v == null ? void 0 : v.repo) || ""), [W, z] = k((v == null ? void 0 : v.source) || "manual"), [M, K] = k((v == null ? void 0 : v.trust) || f.trust), [C, $] = k((v == null ? void 0 : v.depth) || f.depth), [b, p] = k((v == null ? void 0 : v.backlog_intake) ?? !0), [q, V] = k((v == null ? void 0 : v.results_in_repo) ?? !1), [G, J] = k((v == null ? void 0 : v.self_enabling) ?? !1), [B, I] = k((v == null ? void 0 : v.approach) || "simplified"), [L, j] = k(() => {
    var e;
    return (e = v == null ? void 0 : v.steps) != null && e.length ? v.steps.map((a) => ({ ...a })) : ke.map((a) => ({ ...a }));
  }), [c, i] = k(null), [g, S] = k(""), [Z, te] = k("settings"), re = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", ae = (e, a) => j((s) => s.map((d, h) => h === e ? { ...d, ...a } : d)), ue = (e) => j((a) => a.filter((s, d) => d !== e)), O = (e, a) => j((s) => {
    const d = e + a;
    if (d < 0 || d >= s.length) return s;
    const h = [...s];
    return [h[e], h[d]] = [h[d], h[e]], h;
  }), ie = (e) => j((a) => [...a, {
    id: `${e}-${Math.random().toString(36).slice(2, 6)}`,
    name: e === "gate" ? "New Gate" : "New Step",
    type: e,
    agent: e === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), xe = (e) => {
    U(e.repo), z(e.source);
  }, R = (e) => {
    let a = (e || "").trim();
    if (!a) return "";
    const s = a.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return s && (a = s[1]), a.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, H = (e) => {
    const a = /github\.com|gitlab\.com/i.test(e);
    U(a ? R(e) : e), z("manual");
  }, A = /^[^/\s]+\/[^/\s]+$/.test(R(u)) || l.some((e) => e.repo === u), Y = !w && y.has(R(u)), se = ({ value: e, options: a, tokens: s, onPick: d }) => /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: a.map((h) => {
    const P = e === h;
    return /* @__PURE__ */ t(
      "button",
      {
        onClick: () => d(h),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: P ? s[h] : "var(--muted)",
          background: P ? `color-mix(in srgb, ${s[h]} 16%, transparent)` : "transparent",
          boxShadow: P ? `inset 0 0 0 1px color-mix(in srgb, ${s[h]} 45%, transparent)` : "none"
        },
        children: h
      },
      h
    );
  }) }), Q = { "issue-radar": [], workspace: [], manual: [] };
  l.forEach((e) => {
    var a;
    (Q[a = e.source] || (Q[a] = [])).push(e);
  });
  const Ne = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" };
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: T,
      children: /* @__PURE__ */ t(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (e) => e.stopPropagation(),
          children: c !== null ? /* @__PURE__ */ t(
            at,
            {
              initial: {
                name: ((me = (Se = L[c]) == null ? void 0 : Se.agent) == null ? void 0 : me.name) || "",
                role: (be = (Ce = L[c]) == null ? void 0 : Ce.agent) == null ? void 0 : be.role,
                tools: (_e = (fe = L[c]) == null ? void 0 : fe.agent) == null ? void 0 : _e.tools,
                model: (Te = (Re = L[c]) == null ? void 0 : Re.agent) == null ? void 0 : Te.model,
                crew: (ye = ($e = L[c]) == null ? void 0 : $e.agent) == null ? void 0 : ye.crew,
                addenda: (je = L[c]) == null ? void 0 : je.addenda,
                trust: (de = L[c]) == null ? void 0 : de.trust,
                depth: (r = L[c]) == null ? void 0 : r.depth
              },
              knownAgents: x,
              crews: D,
              repo: u,
              stepName: ((n = L[c]) == null ? void 0 : n.name) || "",
              onClose: () => i(null),
              onSave: (e) => {
                ae(c, {
                  agent: { name: e.name, role: e.role, tools: e.tools, model: e.model, crew: e.crew },
                  addenda: e.addenda,
                  trust: e.trust,
                  depth: e.depth
                }), i(null);
              }
            }
          ) : /* @__PURE__ */ o(Le, { children: [
            /* @__PURE__ */ o("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ o("div", { children: [
                /* @__PURE__ */ t("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: w ? "Edit Pipeline" : "New Pipeline" }),
                /* @__PURE__ */ t("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: w ? u.includes("/") ? u.split("/")[1] : u : "Configure a pipeline for a repository or workspace" })
              ] }),
              /* @__PURE__ */ t("button", { onClick: T, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
            ] }),
            w && /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: ["settings", "danger"].map((e) => {
              const a = Z === e, s = e === "danger";
              return /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => te(e),
                  className: "text-[12px] px-3 py-2 font-semibold transition-all",
                  style: {
                    color: a ? s ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                    borderBottom: `2px solid ${a ? s ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                    marginBottom: "-1px"
                  },
                  children: e === "settings" ? "Settings" : "Danger Zone"
                },
                e
              );
            }) }),
            /* @__PURE__ */ o(
              "div",
              {
                className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                style: { display: w && Z === "danger" ? "none" : "flex" },
                children: [
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                    /* @__PURE__ */ t(
                      "input",
                      {
                        value: u,
                        onChange: (e) => H(e.target.value),
                        onPaste: (e) => {
                          const a = e.clipboardData.getData("text");
                          /github\.com|gitlab\.com/i.test(a) && (e.preventDefault(), H(a));
                        },
                        placeholder: "https://github.com/owner/name  ·  or  owner/name",
                        disabled: w,
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                        style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Y ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                      }
                    ),
                    !w && u && R(u) !== u && /* @__PURE__ */ o("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                      "→ ",
                      /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: R(u) })
                    ] }),
                    Y && /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                    /* @__PURE__ */ t("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((e) => Q[e].length > 0 && /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Ne[e] }),
                      /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1.5", children: Q[e].map((a) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => xe(a),
                          disabled: y.has(a.repo),
                          title: a.detail || a.repo,
                          className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                          style: {
                            background: u === a.repo ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                            color: u === a.repo ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                            boxShadow: u === a.repo ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                          },
                          children: a.repo.includes("/") ? a.repo.split("/")[1] : a.repo
                        },
                        a.repo
                      )) })
                    ] }, e)) })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                    /* @__PURE__ */ t(se, { value: M, options: pe, tokens: Be, onPick: K })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                    /* @__PURE__ */ t(se, { value: C, options: ve, tokens: We, onPick: $ })
                  ] }),
                  /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Backlog auto-intake" }),
                      /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Back-feed open ",
                        /* @__PURE__ */ t("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
                        " issues as cards"
                      ] })
                    ] }),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => p((e) => !e),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: b ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ t(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: b ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                      /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Also commit results & the pipeline conversation to a ",
                        /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: ".dlc-yolo/" }),
                        " copy in the owned repo (always kept in app data)"
                      ] })
                    ] }),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => V((e) => !e),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: q ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ t(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: q ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                      /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                    ] }),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => J((e) => !e),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: G ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ t(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: G ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  G && /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                      /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                    ] }),
                    /* @__PURE__ */ t("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((e) => /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => I(e),
                        className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                        style: {
                          background: B === e ? "var(--accent)" : "transparent",
                          color: B === e ? "var(--bg)" : "var(--muted)",
                          border: `1px solid ${B === e ? "var(--accent)" : "var(--border)"}`
                        },
                        children: e
                      },
                      e
                    )) })
                  ] }),
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1.5", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                      /* @__PURE__ */ o("div", { className: "flex gap-1", children: [
                        /* @__PURE__ */ t(
                          "button",
                          {
                            onClick: () => ie("agent"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                            children: "+ agent"
                          }
                        ),
                        /* @__PURE__ */ t(
                          "button",
                          {
                            onClick: () => ie("gate"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                            children: "+ gate"
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: L.map((e, a) => {
                      var s, d;
                      return /* @__PURE__ */ o(
                        "div",
                        {
                          className: "rounded-md p-2",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${e.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                          children: [
                            /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5", children: [
                              /* @__PURE__ */ o("div", { className: "flex flex-col", children: [
                                /* @__PURE__ */ t("button", { onClick: () => O(a, -1), disabled: a === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                /* @__PURE__ */ t("button", { onClick: () => O(a, 1), disabled: a === L.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                              ] }),
                              /* @__PURE__ */ t(
                                "input",
                                {
                                  value: e.name,
                                  onChange: (h) => ae(a, { name: h.target.value, id: re(h.target.value) }),
                                  className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                }
                              ),
                              /* @__PURE__ */ t(
                                "span",
                                {
                                  className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                  style: { color: e.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${e.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                  children: e.type
                                }
                              ),
                              /* @__PURE__ */ t("button", { onClick: () => ue(a), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                            ] }),
                            e.type === "agent" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                              /* @__PURE__ */ o(
                                "button",
                                {
                                  onClick: () => i(a),
                                  className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                  children: [
                                    "⚙ ",
                                    (s = e.agent) != null && s.name ? `Agent: ${e.agent.name}` : "Configure agent"
                                  ]
                                }
                              ),
                              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: e.trigger || "ask",
                                  onChange: (h) => ae(a, { trigger: h.target.value === "ask" ? void 0 : h.target.value }),
                                  title: "Which engine runs this phase (ask = prompt at runtime)",
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ t("option", { value: "ask", children: "ask" }),
                                    /* @__PURE__ */ t("option", { value: "spec-builder", children: "Spec Builder" }),
                                    /* @__PURE__ */ t("option", { value: "task-runner", children: "Task Runner" }),
                                    /* @__PURE__ */ t("option", { value: "inline", children: "inline" }),
                                    /* @__PURE__ */ t("option", { value: "skip", children: "skip" })
                                  ]
                                }
                              ),
                              (e.trust || e.depth) && /* @__PURE__ */ t("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [e.trust, e.depth].filter(Boolean).join(" · ") }),
                              e.addenda && e.addenda.length > 0 && /* @__PURE__ */ o("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                "+",
                                e.addenda.length,
                                " addendum",
                                e.addenda.length === 1 ? "" : "s"
                              ] }),
                              ((d = e.agent) == null ? void 0 : d.role) && /* @__PURE__ */ t("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: e.agent.role })
                            ] }),
                            e.type === "gate" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: e.trust || "",
                                  onChange: (h) => ae(a, { trust: h.target.value || void 0 }),
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ t("option", { value: "", children: "inherit" }),
                                    pe.map((h) => /* @__PURE__ */ t("option", { value: h, children: h }, h))
                                  ]
                                }
                              )
                            ] })
                          ]
                        },
                        e.id
                      );
                    }) })
                  ] })
                ]
              }
            ),
            w && Z === "danger" && m && (() => {
              const e = u.includes("/") ? u.split("/")[1] : u, a = g.trim() === e;
              return /* @__PURE__ */ t("div", { className: "px-5 pb-4 pt-4", children: N ? /* @__PURE__ */ o(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                  children: [
                    /* @__PURE__ */ o("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "This is a bundled ",
                      /* @__PURE__ */ t("strong", { children: "example" }),
                      " pipeline (",
                      _ ?? 0,
                      " sample card",
                      (_ ?? 0) === 1 ? "" : "s",
                      "). Remove it any time — it's demo data, not real work."
                    ] }),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => {
                          m(u), T();
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
                    /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold uppercase tracking-wide", style: { color: "var(--danger, #ef4444)" }, children: "Danger Zone" }),
                    /* @__PURE__ */ o("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "Deleting removes this pipeline and its ",
                      _ ?? 0,
                      " card",
                      (_ ?? 0) === 1 ? "" : "s",
                      " from DLC-YOLO's local state. It does ",
                      /* @__PURE__ */ t("strong", { children: "not" }),
                      " touch GitHub issues or labels. This cannot be undone."
                    ] }),
                    /* @__PURE__ */ o("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                      "Type ",
                      /* @__PURE__ */ t("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: e }),
                      " to confirm:"
                    ] }),
                    /* @__PURE__ */ t(
                      "input",
                      {
                        value: g,
                        onChange: (s) => S(s.target.value),
                        placeholder: e,
                        className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        disabled: !a,
                        onClick: () => {
                          m(u), T();
                        },
                        className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                        style: {
                          background: a ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                          color: a ? "#fff" : "var(--muted)",
                          cursor: a ? "pointer" : "not-allowed"
                        },
                        children: "Delete pipeline"
                      }
                    )
                  ]
                }
              ) });
            })(),
            /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
              /* @__PURE__ */ t("button", { onClick: T, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Cancel" }),
              !(w && Z === "danger") && /* @__PURE__ */ t(
                "button",
                {
                  disabled: !A || !w && Y,
                  onClick: () => E({
                    repo: R(u),
                    source: W,
                    trust: M,
                    depth: C,
                    backlog_intake: b,
                    results_in_repo: q,
                    self_enabling: G,
                    approach: B,
                    steps: L.map((e) => ({ ...e, label: `dlc:${e.id}` }))
                  }),
                  className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: w ? "Save Pipeline" : "Create Pipeline"
                }
              )
            ] })
          ] })
        }
      )
    }
  );
}
function ct() {
  const l = Ve(), [y, f] = k([]), [x, D] = k([]), [E, T] = k(we), [v, _] = k(!0), [N, m] = k("pipeline"), [w, u] = k(/* @__PURE__ */ new Set()), [U, W] = k(!1), [z, M] = k(null), [K, C] = k([]), [$, b] = k([]), [p, q] = k(!1), [V, G] = k([]), J = ce(null), B = ce(!1), I = F(async () => {
    try {
      let r;
      try {
        r = await l.get("/api/file-read?path=" + encodeURIComponent(X));
      } catch (n) {
        if (X !== ze)
          X = ze, r = await l.get("/api/file-read?path=" + encodeURIComponent(X));
        else
          throw n;
      }
      f(r.cards || []), D(r.pipelines || []), T({ ...we, ...r.config || {} });
    } catch (r) {
      console.error("Failed to fetch cards:", r);
    } finally {
      _(!1);
    }
  }, [l]), L = le(() => {
    const r = /* @__PURE__ */ new Map();
    return x.forEach((n) => {
      r.has(n.repo) || r.set(n.repo, 0);
    }), y.forEach((n) => {
      var a;
      const e = ((a = n.source) == null ? void 0 : a.repo) || "unlinked";
      r.set(e, (r.get(e) || 0) + 1);
    }), [...r.entries()].map(([n, e]) => ({ name: n, count: e })).sort((n, e) => e.count - n.count);
  }, [y, x]), j = le(
    () => w.size === 0 ? y : y.filter((r) => {
      var n;
      return w.has(((n = r.source) == null ? void 0 : n.repo) || "unlinked");
    }),
    [y, w]
  ), c = 6e5, i = le(() => {
    var n, e, a, s;
    const r = [];
    for (const d of j) {
      const h = d.step_status || {}, P = x.find((ne) => ne.id === d.pipeline_id) || x.find((ne) => {
        var ee;
        return ne.repo === ((ee = d.source) == null ? void 0 : ee.repo);
      });
      for (const [ne, ee] of Object.entries(h))
        if (ee === "pending" || ee === "error") {
          const oe = (n = d.pending_at) == null ? void 0 : n[ne], Ue = oe ? Date.now() - new Date(oe).getTime() > c : !1, ge = (e = P == null ? void 0 : P.steps) == null ? void 0 : e.find((Oe) => Oe.id === ne), He = ((a = ge == null ? void 0 : ge.agent) == null ? void 0 : a.crew) || ((s = ge == null ? void 0 : ge.agent) == null ? void 0 : s.name) || "orchestrator", qe = V.some((Oe) => (Oe.task || "").includes(d.id) || (Oe.task || "").includes(d.title));
          r.push({ card: d.title || d.id, step: ne, agent: He, stale: Ue, status: ee, live: qe });
        }
    }
    return r;
  }, [j, x, V]), g = le(() => {
    var s;
    let r;
    if (w.size === 1) {
      const d = [...w][0];
      r = (s = x.find((h) => h.repo === d)) == null ? void 0 : s.steps;
    } else x.length === 1 && (r = x[0].steps);
    const n = (r && r.length ? r : ke).map((d) => ({ ...d })), e = new Set(n.map((d) => d.id)), a = [];
    return e.has("intake") || a.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), a.push(...n), e.has("done") || a.push({ id: "done", name: "Done", type: "agent" }), a;
  }, [w, x]), S = le(() => g.map((r) => r.id), [g]), Z = F((r) => {
    var n;
    return ((n = g.find((e) => e.id === r)) == null ? void 0 : n.type) === "gate" || r.startsWith("gate-");
  }, [g]), te = F((r) => {
    var n, e;
    return ((e = (n = g.find((a) => a.id === r)) == null ? void 0 : n.agent) == null ? void 0 : e.name) || Xe[r] || "unknown";
  }, [g]);
  Me(() => {
    I();
    const r = async () => {
      try {
        const e = X.slice(0, X.lastIndexOf("/")), a = (e ? e + "/" : "") + "live_spawns.json", s = await l.get("/api/file-read?path=" + encodeURIComponent(a));
        B.current = !1;
        const d = s != null && s.at ? Date.now() - new Date(s.at).getTime() < 18e4 : !0;
        G(d && Array.isArray(s == null ? void 0 : s.runs) ? s.runs : []);
      } catch {
        B.current = !0, G([]);
      }
    };
    I().then(r);
    const n = setInterval(() => {
      I().then(() => {
        B.current || r();
      });
    }, 1e4);
    return () => clearInterval(n);
  }, [I, l]), Me(() => {
    (async () => {
      try {
        const r = await l.get("/api/file-read?path=~/.kiro/crew/config.json"), n = (r == null ? void 0 : r.agents) || {}, e = Object.entries(n).map(([a, s]) => ({
          name: a,
          description: (s == null ? void 0 : s.description) || void 0
        }));
        b(e);
      } catch (r) {
        console.warn("crew roster (config.json) unreadable:", r);
      }
    })();
  }, [l]);
  const re = (r, n) => {
    const e = (r.pipelines || []).find((d) => d.id === n.pipeline_id) || (r.pipelines || []).find((d) => {
      var h;
      return d.repo === ((h = n.source) == null ? void 0 : h.repo);
    }), s = ["intake", ...(e != null && e.steps && e.steps.length ? e.steps : ke).map((d) => d.id).filter((d) => d !== "intake" && d !== "done"), "done"];
    return [...new Set(s)];
  }, ae = F(async (r) => {
    var n;
    try {
      const e = await l.get("/api/file-read?path=" + encodeURIComponent(X)), a = (n = e.cards) == null ? void 0 : n.find((P) => P.id === r);
      if (!a) return;
      const s = re(e, a), d = s.indexOf(a.stage);
      if (d < 0 || d >= s.length - 1) return;
      const h = a.stage;
      a.stage = s[d + 1], a.updated_at = (/* @__PURE__ */ new Date()).toISOString(), a.gate_history = a.gate_history || [], a.gate_history.push({ gate: h, decision: "approved", at: a.updated_at, notes: "" }), a.history = a.history || [], a.history.push({ from: h, to: a.stage, at: a.updated_at, agent: "human" }), await l.post("/api/file-write", { path: X, content: JSON.stringify(e, null, 2) }), I();
    } catch (e) {
      console.error("Failed to advance card:", e);
    }
  }, [l, I]), ue = F(async (r) => {
    var n, e;
    try {
      const a = await l.get("/api/file-read?path=" + encodeURIComponent(X)), s = (n = a.cards) == null ? void 0 : n.find((oe) => oe.id === r);
      if (!s) return;
      const d = re(a, s), h = new Set((((e = (a.pipelines || []).find((oe) => oe.id === s.pipeline_id)) == null ? void 0 : e.steps) || ke).filter((oe) => oe.type === "gate").map((oe) => oe.id)), P = d.indexOf(s.stage);
      if (P <= 0) return;
      const ne = s.stage;
      let ee = P - 1;
      for (; ee > 0 && (h.has(d[ee]) || d[ee].startsWith("gate-")); ) ee--;
      s.stage = d[ee], s.updated_at = (/* @__PURE__ */ new Date()).toISOString(), s.gate_history = s.gate_history || [], s.gate_history.push({ gate: ne, decision: "rejected", at: s.updated_at, notes: "" }), s.history = s.history || [], s.history.push({ from: ne, to: s.stage, at: s.updated_at, agent: "human" }), await l.post("/api/file-write", { path: X, content: JSON.stringify(a, null, 2) }), I();
    } catch (a) {
      console.error("Failed to reject card:", a);
    }
  }, [l, I]), O = F(async (r) => {
    try {
      const n = await l.get("/api/file-read?path=" + encodeURIComponent(X));
      n.cards = n.cards || [], r(n);
      try {
        const e = await l.get("/api/file-read?path=" + encodeURIComponent(X));
        e.cards = e.cards || [], r(e), await l.post("/api/file-write", { path: X, content: JSON.stringify(e, null, 2) });
      } catch {
        await l.post("/api/file-write", { path: X, content: JSON.stringify(n, null, 2) });
      }
      I();
    } catch (n) {
      console.error("Failed to mutate state:", n);
    }
  }, [l, I]), ie = F((r) => {
    T((n) => ({ ...n, ...r })), O((n) => {
      n.config = { ...we, ...n.config || {}, ...r };
    });
  }, [O]);
  F((r, n) => {
    O((e) => {
      const a = e.cards.find((s) => s.id === r);
      a && (a.step_status = { ...a.step_status || {}, [n]: "approved" }, a.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [O]), F((r, n) => {
    O((e) => {
      const a = e.cards.find((s) => s.id === r);
      a && (a.step_status = { ...a.step_status || {}, [n]: "rejected" }, a.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [O]);
  const xe = F((r, n, e, a) => {
    O((s) => {
      const d = s.cards.find((h) => h.id === r);
      d && (d.interjection = [...d.interjection || [], {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        step: n,
        kind: e,
        text: a,
        by: "user",
        status: "pending"
      }], d.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [O]), R = F((r, n, e) => {
    O((a) => {
      const s = a.cards.find((h) => h.id === r);
      if (!s) return;
      const d = (s.decisions || []).find((h) => h.id === n);
      d && (d.chosen = e, d.resolved_at = (/* @__PURE__ */ new Date()).toISOString()), s.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [O]), H = F((r) => {
    O((n) => {
      var s;
      const e = n.cards.find((d) => d.id === r);
      if (!e) return;
      const a = e.trust || ((s = n.config) == null ? void 0 : s.trust) || we.trust;
      e.trust = pe[(pe.indexOf(a) + 1) % pe.length], e.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [O]), A = F((r) => {
    O((n) => {
      var s;
      const e = n.cards.find((d) => d.id === r);
      if (!e) return;
      const a = e.depth || ((s = n.config) == null ? void 0 : s.depth) || we.depth;
      e.depth = ve[(ve.indexOf(a) + 1) % ve.length], e.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [O]), Y = F((r) => {
    u((n) => {
      const e = new Set(n);
      return e.has(r) ? e.delete(r) : e.add(r), e;
    });
  }, []), se = F(() => u(/* @__PURE__ */ new Set()), []), Q = F(async () => {
    const r = [];
    try {
      const n = await l.get("/api/file-read?path=~/.kiro/crew/config.json"), e = (n == null ? void 0 : n.workspaces) || {};
      Object.entries(e).forEach(([a, s]) => r.push({ repo: a, source: "workspace", detail: (s == null ? void 0 : s.dir) || a }));
    } catch (n) {
      console.warn("workspaces registry unreadable:", n);
    }
    try {
      const n = await l.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((n == null ? void 0 : n.repos) || []).forEach((e) => {
        e != null && e.owner && (e != null && e.repo) && r.push({ repo: `${e.owner}/${e.repo}`, source: "issue-radar", detail: `${e.provider || "github"} · ${e.host || "github.com"}` });
      });
    } catch (n) {
      console.warn("issue-radar config unreadable (app may not be installed):", n);
    }
    C(r), W(!0);
  }, [l]), Ne = F(async (r) => {
    const n = (/* @__PURE__ */ new Date()).toISOString(), e = "pl-" + Math.random().toString(36).slice(2, 10);
    await O((a) => {
      a.pipelines = a.pipelines || [];
      const s = a.pipelines.find((d) => d.repo === r.repo);
      s ? (s.source = r.source, s.trust = r.trust, s.depth = r.depth, s.backlog_intake = r.backlog_intake, s.results_in_repo = r.results_in_repo, s.self_enabling = r.self_enabling, s.approach = r.approach, s.steps = r.steps) : a.pipelines.push({
        id: e,
        repo: r.repo,
        source: r.source,
        trust: r.trust,
        depth: r.depth,
        backlog_intake: r.backlog_intake,
        results_in_repo: r.results_in_repo,
        self_enabling: r.self_enabling,
        approach: r.approach,
        sot: "github",
        steps: r.steps,
        created_at: n
      });
    }), W(!1), M(null), u(/* @__PURE__ */ new Set([r.repo]));
  }, [O]), Se = F(async (r) => {
    await O((n) => {
      n.pipelines = (n.pipelines || []).filter((e) => e.repo !== r), n.cards = (n.cards || []).filter((e) => {
        var a;
        return (((a = e.source) == null ? void 0 : a.repo) || "unlinked") !== r;
      });
    }), u((n) => {
      const e = new Set(n);
      return e.delete(r), e;
    });
  }, [O]), me = le(() => S.reduce((r, n) => (r[n] = j.filter((e) => e.stage === n), r), {}), [j, S]), Ce = F((r) => {
    var n;
    (n = document.getElementById(`stage-col-${r}`)) == null || n.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), be = le(() => {
    const r = {};
    return j.forEach((n) => {
      var a;
      const e = ((a = n.source) == null ? void 0 : a.repo) || "unlinked";
      (r[e] || (r[e] = [])).push(n);
    }), r;
  }, [j]), fe = le(() => {
    const r = {};
    return j.forEach((n) => {
      const e = te(n.stage);
      (r[e] || (r[e] = [])).push(n);
    }), r;
  }, [j, te]), _e = le(() => {
    const r = [], n = [], e = [];
    return j.forEach((a) => {
      a.stage === "done" ? e.push(a) : Z(a.stage) ? r.push(a) : n.push(a);
    }), { "Blocked at Gate": r, "In-Flight (Auto)": n, Done: e };
  }, [j, Z]), Re = j.filter((r) => r.stage !== "done").length, Te = j.filter((r) => Z(r.stage)).length, $e = j.filter((r) => r.stage === "done").length, ye = j.reduce((r, n) => {
    var e;
    return r + (((e = n.parked) == null ? void 0 : e.length) || 0);
  }, 0), je = {
    pipeline: j.length,
    workspace: Object.keys(be).length,
    crew: Object.keys(fe).length,
    status: j.length,
    backlog: ye
  }, de = (r) => ({
    card: r,
    config: E,
    onApprove: Z(r.stage) ? () => ae(r.id) : void 0,
    onReject: Z(r.stage) ? () => ue(r.id) : void 0,
    onCycleTrust: () => H(r.id),
    onCycleDepth: () => A(r.id),
    onInterject: (n, e) => xe(r.id, r.stage, n, e),
    onResolveDecision: (n, e) => R(r.id, n, e)
  });
  return /* @__PURE__ */ o(Le, { children: [
    /* @__PURE__ */ t(Ke, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    U && /* @__PURE__ */ t(
      Ge,
      {
        candidates: K,
        existingRepos: new Set(x.map((r) => r.repo)),
        defaults: E,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: $,
        onCreate: Ne,
        onClose: () => W(!1)
      }
    ),
    z && /* @__PURE__ */ t(
      Ge,
      {
        candidates: K,
        existingRepos: new Set(x.map((r) => r.repo)),
        defaults: E,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: $,
        editPipeline: x.find((r) => r.repo === z) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + z, repo: z, source: "manual", trust: E.trust, depth: E.depth, backlog_intake: !0, sot: "github", steps: ke.map((r) => ({ ...r })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: y.filter((r) => {
          var n;
          return (((n = r.source) == null ? void 0 : n.repo) || "unlinked") === z;
        }).length,
        isExample: Fe.has(z),
        onCreate: Ne,
        onDelete: Se,
        onClose: () => M(null)
      }
    ),
    /* @__PURE__ */ o("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ t(Ze, { steps: g, cardsByStage: me, onNodeClick: Ce }),
      /* @__PURE__ */ o("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5", children: [
        /* @__PURE__ */ t(Ae, { label: "Active", value: String(Re), accent: !0 }),
        /* @__PURE__ */ t(Ae, { label: "Gated", value: String(Te) }),
        /* @__PURE__ */ t(Ae, { label: "Done", value: String($e) }),
        /* @__PURE__ */ t(Ae, { label: "Parked", value: String(ye) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ t(
          tt,
          {
            repos: L,
            selected: w,
            onToggle: Y,
            onClear: se,
            onAddWorkspace: Q,
            onEdit: M
          }
        ),
        /* @__PURE__ */ o("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ o("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ t(Qe, { active: N, onChange: m, counts: je }),
            /* @__PURE__ */ o("div", { className: "relative", children: [
              /* @__PURE__ */ o(
                "button",
                {
                  onClick: () => q((r) => !r),
                  className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Click to see which agents are running",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: i.length ? "var(--accent)" : "var(--muted)" },
                  children: [
                    i.length > 0 ? /* @__PURE__ */ o(Le, { children: [
                      /* @__PURE__ */ t("span", { className: "inline-block animate-pulse", style: { width: 7, height: 7, borderRadius: 999, background: "var(--accent)" } }),
                      /* @__PURE__ */ o("span", { className: "font-semibold", children: [
                        i.length,
                        " running"
                      ] }),
                      i.some((r) => r.stale) && /* @__PURE__ */ o("span", { style: { color: "var(--warn)" }, children: [
                        "· ",
                        i.filter((r) => r.stale).length,
                        " stale ↻"
                      ] })
                    ] }) : /* @__PURE__ */ o(Le, { children: [
                      /* @__PURE__ */ t("span", { style: { width: 7, height: 7, borderRadius: 999, background: "var(--muted)", display: "inline-block", opacity: 0.5 } }),
                      " ",
                      /* @__PURE__ */ t("span", { children: "idle" })
                    ] }),
                    /* @__PURE__ */ t("span", { style: { opacity: 0.5, fontSize: 9 }, children: p ? "▲" : "▼" })
                  ]
                }
              ),
              p && /* @__PURE__ */ o(
                "div",
                {
                  className: "absolute z-20 mt-1 left-0 rounded-md p-2 flex flex-col gap-1 min-w-[260px]",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 6px 20px rgba(0,0,0,0.25)" },
                  children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-0.5", style: { color: "var(--muted)" }, children: "Subagents in flight" }),
                    i.length === 0 ? /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No agents running — pipeline idle." }) : i.map((r) => /* @__PURE__ */ o(
                      "div",
                      {
                        className: "flex items-center gap-2 text-[11px] px-1.5 py-1 rounded",
                        style: { background: "var(--bg, transparent)" },
                        children: [
                          /* @__PURE__ */ t("span", { className: "inline-block animate-pulse flex-shrink-0", style: { width: 6, height: 6, borderRadius: 999, background: r.stale ? "var(--warn)" : "var(--accent)" } }),
                          /* @__PURE__ */ t("span", { className: "font-semibold", style: { color: "var(--accent)" }, children: r.agent }),
                          /* @__PURE__ */ o("span", { style: { color: "var(--muted)" }, children: [
                            "· ",
                            r.step
                          ] }),
                          /* @__PURE__ */ t("span", { className: "ml-auto truncate max-w-[110px]", style: { color: "var(--text, var(--muted))" }, title: r.card, children: r.card }),
                          r.live ? /* @__PURE__ */ t("span", { style: { color: "var(--ok)" }, title: "live spawn confirmed via spawn_list", children: "●live" }) : /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, title: "no live spawn found — likely dead, will reclaim", children: "no-spawn" }),
                          r.stale && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, title: "stale — will be re-escalated", children: "↻" }),
                          r.status === "error" && /* @__PURE__ */ t("span", { style: { color: "var(--danger, #ef4444)" }, title: "errored — retrying", children: "⚠" })
                        ]
                      },
                      `${r.card}:${r.step}`
                    ))
                  ]
                }
              )
            ] }),
            w.size > 0 && /* @__PURE__ */ o(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  w.size === 1 ? [...w][0] : `${w.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ t("button", { onClick: se, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ t(Pe, { config: E, onSet: ie }),
          v ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : N === "backlog" ? /* @__PURE__ */ t(et, { cards: j }) : /* @__PURE__ */ o("div", { ref: J, className: "flex gap-3 overflow-x-auto pb-4", children: [
            N === "pipeline" && g.map((r) => /* @__PURE__ */ t(Ie, { id: `stage-col-${r.id}`, title: r.name, count: (me[r.id] || []).length, children: (me[r.id] || []).map((n) => /* @__PURE__ */ t(Ee, { ...de(n) }, n.id)) }, r.id)),
            N === "workspace" && Object.entries(be).map(([r, n]) => /* @__PURE__ */ t(Ie, { title: r, count: n.length, children: n.map((e) => /* @__PURE__ */ t(Ee, { ...de(e) }, e.id)) }, r)),
            N === "crew" && Object.entries(fe).map(([r, n]) => /* @__PURE__ */ t(Ie, { title: r, count: n.length, children: n.map((e) => /* @__PURE__ */ t(Ee, { ...de(e) }, e.id)) }, r)),
            N === "status" && Object.entries(_e).map(([r, n]) => /* @__PURE__ */ t(Ie, { title: r, count: n.length, children: n.map((e) => /* @__PURE__ */ t(Ee, { ...de(e) }, e.id)) }, r))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  ct as default
};
