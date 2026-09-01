import { jsxs as o, Fragment as Me, jsx as t } from "react/jsx-runtime";
import { useAppApi as Ye, useChatLauncher as Xe } from "@kirocrew/app-sdk";
import { PageHeader as Ze, StatCard as Ie } from "@kirocrew/app-sdk/ui";
import { useState as k, useRef as le, useCallback as F, useMemo as se, useEffect as Be } from "react";
const Qe = "~/.dlc-yolo/state.json", Ue = "/tmp/dlc-yolo/state.json";
let Q = Qe;
const Se = [
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
], qe = /* @__PURE__ */ new Set([
  "hai-dvash/webapp",
  "hai-dvash/dashboard",
  "hai-dvash/api-core"
]), Pe = {
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
}, de = ["manual", "assisted", "autonomous"], be = ["quick", "standard", "deep"], Ne = { trust: "assisted", depth: "standard" }, ze = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, We = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function xe({ color: l, children: y, title: f, onClick: x, active: I }) {
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
        boxShadow: I ? `inset 0 0 0 1px color-mix(in srgb, ${l} 55%, transparent)` : "none",
        opacity: x && !I ? 0.85 : 1,
        cursor: x ? "pointer" : "default"
      },
      children: y
    }
  );
}
const De = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function et({ steps: l, cardsByStage: y, onNodeClick: f }) {
  const x = le(null), I = le(null), D = le(0), $ = le(null), v = le(l), _ = le(y), N = le([]);
  v.current = l, _.current = y;
  const g = 3, w = 116, m = w / g, U = m - 26, [z, W] = k(880);
  Be(() => {
    const C = I.current;
    if (!C) return;
    const T = new ResizeObserver((b) => {
      const d = Math.max(360, Math.floor(b[0].contentRect.width));
      W(d);
    });
    return T.observe(C), () => T.disconnect();
  }, []);
  const M = (C) => C.type === "gate" || C.id.startsWith("gate-");
  return Be(() => {
    const C = x.current;
    if (!C) return;
    const T = Math.floor(z / g);
    C.width = T * g, C.height = m * g;
    const b = C.getContext("2d");
    if (!b) return;
    const d = (G, J, B, E, L) => {
      b.fillStyle = L, b.fillRect(G * g, J * g, B * g, E * g);
    }, V = () => {
      const G = D.current, J = v.current, B = _.current, E = Math.max(1, J.length);
      Math.max(1, ...J.map((c) => {
        var h;
        return ((h = B[c.id]) == null ? void 0 : h.length) || 0;
      })), d(0, 0, T, U, "#0f172a");
      for (let c = 0; c < T / 5; c++) {
        const h = c * 37 % T, S = c * 13 % (U - 4);
        Math.sin(G * 0.03 + c * 2.1) > 0.35 && d(h, S, 1, 1, "#e2e8f0");
      }
      d(T - 26, 8, 10, 10, "#fde68a"), d(T - 24, 7, 8, 8, "#0f172a");
      for (let c = 0; c < T; c += 16)
        for (let h = U; h < m; h += 16)
          d(c, h, 16, 16, c / 16 + h / 16 & 1 ? "#33261a" : "#2a1f14");
      d(0, U - 2, T, 2, "#4a3520");
      const L = T / E, j = [];
      for (let c = 0; c < J.length; c++) {
        const h = J[c], S = Math.round(L * (c + 0.5)), te = (B[h.id] || []).length, re = te > 0, ae = De[c % De.length], pe = M(h), O = U - 2;
        if (j.push({ x: S - Math.floor(L / 2), w: Math.floor(L), id: h.id }), c < J.length - 1) {
          const R = Math.round(L * (c + 1.5));
          for (let q = S + 8; q < R - 8; q += 4) d(q, U - 1, 2, 1, "#4a3520");
        }
        if (pe) {
          const R = O - 20, q = re ? "#f39c12" : "#3a3222";
          d(S - 3, R, 6, 20, re ? "#5c4a2a" : "#2a2418");
          for (let A = 0; A < 5; A++) d(S - A, R - 5 + A, A * 2 + 1, 1, q);
          for (let A = 0; A < 5; A++) d(S - (4 - A), R - A, (4 - A) * 2 + 1, 1, q);
          if (re) {
            const A = (Math.sin(G * 0.08) + 1) / 2;
            b.globalAlpha = 0.35 + A * 0.4, d(S - 1, R - 6, 2, 2, "#ffd27a"), b.globalAlpha = 1;
          }
        } else {
          const R = O - 14;
          if (d(S - 10, R, 20, 3, "#7a5c47"), d(S - 10, R - 1, 20, 1, ae), d(S - 9, R + 3, 2, 8, "#5c4033"), d(S + 7, R + 3, 2, 8, "#5c4033"), d(S - 5, R - 9, 10, 9, "#333"), d(S - 4, R - 8, 8, 7, re ? "#0a2a0a" : "#1a1a1a"), re)
            for (let q = 0; q < 3; q++) {
              const A = 2 + (G + q * 7) % 5;
              d(S - 3, R - 7 + q * 2, A, 0.8, "#33ff33");
            }
        }
        const ie = Math.min(te, 5);
        for (let R = 0; R < ie; R++) {
          const q = ie > 1 ? (R - (ie - 1) / 2) * 8 : 0, A = Math.round(S + q) - 3, Y = O - (pe ? 2 : 4), oe = De[(c + R) % De.length], ee = Math.sin(G * 0.08 + c + R) > 0 ? 1 : 0;
          b.fillStyle = "rgba(0,0,0,0.18)", b.fillRect(A * g, (Y + 8) * g, 6 * g, g), d(A, Y + ee, 6, 6, oe), d(A + 1, Y - 4 + ee, 4, 4, "#fdd"), d(A + 1, Y - 5 + ee, 4, 1, "#333"), (G + c * 9 + R * 5) % 120 >= 3 && (d(A + 2, Y - 3 + ee, 1, 1, "#333"), d(A + 4, Y - 3 + ee, 1, 1, "#333")), d(A + 1, Y + 6, 1, 2, oe), d(A + 4, Y + 6, 1, 2, oe);
        }
        te > 5 && (b.fillStyle = ae, b.font = `${3 * g}px monospace`, b.fillText(`+${te - 5}`, (S + 10) * g, (O - 6) * g)), te > 0 && (b.fillStyle = ae, b.fillRect((S + 6) * g, (O - 30) * g, 9 * g, 9 * g), b.fillStyle = "#0f172a", b.font = `bold ${5 * g}px monospace`, b.textAlign = "center", b.fillText(String(te), (S + 10.5) * g, (O - 24) * g), b.textAlign = "left"), b.fillStyle = re ? "#e2e8f0" : "#6b7280", b.font = `${3.4 * g}px monospace`, b.textAlign = "center";
        const fe = h.name.length > 12 ? h.name.slice(0, 11) + "…" : h.name;
        b.fillText(fe, S * g, (m - 4) * g), b.textAlign = "left";
      }
      N.current = j;
      const i = J.reduce((c, h) => {
        var S;
        return c + (((S = B[h.id]) == null ? void 0 : S.length) || 0);
      }, 0);
      b.fillStyle = "#f90", b.font = `bold ${3.6 * g}px monospace`, b.fillText(`${i} card${i !== 1 ? "s" : ""} · ${E} milestone${E !== 1 ? "s" : ""}`, 4 * g, 8 * g);
    }, H = () => {
      D.current++, V(), $.current = requestAnimationFrame(H);
    };
    return $.current = requestAnimationFrame(H), () => {
      $.current && cancelAnimationFrame($.current);
    };
  }, [z, m, U]), /* @__PURE__ */ t("div", { ref: I, className: "w-full mb-5", children: /* @__PURE__ */ t(
    "canvas",
    {
      ref: x,
      onClick: (C) => {
        const T = x.current;
        if (!T) return;
        const b = T.getBoundingClientRect(), d = (C.clientX - b.left) / b.width * (T.width / g), V = N.current.find((H) => d >= H.x && d <= H.x + H.w);
        V && f(V.id);
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
function tt({ active: l, onChange: y, counts: f }) {
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
      ].map((I) => {
        const D = l === I.id, $ = f[I.id];
        return /* @__PURE__ */ o(
          "button",
          {
            onClick: () => y(I.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: D ? "var(--accent)" : "transparent",
              color: D ? "var(--bg)" : "var(--muted)"
            },
            children: [
              I.label,
              $ > 0 && /* @__PURE__ */ t(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: D ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: D ? "var(--bg)" : "var(--muted)" },
                  children: $
                }
              )
            ]
          },
          I.id
        );
      })
    }
  );
}
function Ee({ card: l, config: y, onApprove: f, onReject: x, onCycleTrust: I, onCycleDepth: D, onInterject: $, onResolveDecision: v }) {
  var C, T, b;
  const _ = l.stage.startsWith("gate-"), N = _ ? "var(--warn)" : "var(--border-strong, var(--border))", g = l.trust || y.trust, w = l.depth || y.depth, m = ((C = l.parked) == null ? void 0 : C.length) || 0, [U, z] = k(!1), [W, M] = k(""), K = (l.decisions || []).filter((d) => !d.chosen && (d.action === "add-addendum" || d.options));
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
        ((T = l.source) == null ? void 0 : T.repo) && /* @__PURE__ */ o(
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
            xe,
            {
              color: ze[g],
              active: !!l.trust,
              onClick: I,
              title: `trust: ${g}${l.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: g
            }
          ),
          /* @__PURE__ */ t(
            xe,
            {
              color: We[w],
              active: !!l.depth,
              onClick: D,
              title: `depth: ${w}${l.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: w
            }
          ),
          m > 0 && /* @__PURE__ */ o(xe, { color: "var(--warn)", title: `${m} parked idea(s)`, children: [
            "⏸ ",
            m
          ] }),
          typeof ((b = l.effort) == null ? void 0 : b.total) == "number" && l.effort.total > 0 && /* @__PURE__ */ o(xe, { color: "var(--info)", title: `estimated effort: ${l.effort.total} points`, children: [
            "⚡ ",
            l.effort.total
          ] }),
          l.backstep_history && l.backstep_history.length > 0 && /* @__PURE__ */ o(
            xe,
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
            const d = l.decisions[l.decisions.length - 1];
            return /* @__PURE__ */ o(
              xe,
              {
                color: "var(--accent)",
                title: `${l.decisions.length} decision${l.decisions.length === 1 ? "" : "s"} — last: ${d.question || d.kind || ""}${d.action ? ` → ${d.action}` : ""}${d.rationale ? `
${d.rationale}` : ""}`,
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
            var J, B, E;
            const d = (J = l.source) == null ? void 0 : J.repo;
            if (!d) return null;
            const V = (B = l.artifacts) == null ? void 0 : B.pr_url, H = V && ((E = /\/pull\/(\d+)/.exec(V)) == null ? void 0 : E[1]), G = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + d)}` + (H ? `&pr=${H}` : "");
            return /* @__PURE__ */ o(
              "a",
              {
                href: G,
                title: V ? `Deep-review PR #${H} in Code Review Sage` : `Open Code Review Sage for ${d}`,
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
        v && K.map((d) => /* @__PURE__ */ o(
          "div",
          {
            className: "mt-2 p-1.5 rounded-md text-[11px]",
            style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
            children: [
              /* @__PURE__ */ o("div", { style: { color: "var(--text, var(--muted))" }, children: [
                "⚖ ",
                d.question || d.kind
              ] }),
              /* @__PURE__ */ o("div", { className: "mt-1 flex gap-1.5", children: [
                /* @__PURE__ */ t(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--ok)", color: "var(--bg)" },
                    onClick: () => v(d.id, "approve"),
                    children: "Approve"
                  }
                ),
                /* @__PURE__ */ t(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    onClick: () => v(d.id, "decline"),
                    children: "Decline"
                  }
                )
              ] })
            ]
          },
          d.id
        )),
        $ && (U ? /* @__PURE__ */ o("div", { className: "mt-2 flex flex-col gap-1", children: [
          /* @__PURE__ */ t(
            "textarea",
            {
              value: W,
              onChange: (d) => M(d.target.value),
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
                  W.trim() && ($("note", W.trim()), M(""), z(!1));
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
                  z(!1), M("");
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
            onClick: () => z(!0),
            children: "+ interject"
          }
        ))
      ]
    }
  );
}
function Le({ title: l, count: y, children: f, id: x }) {
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
function rt({ config: l, onSet: y }) {
  function f({ label: x, value: I, options: D, tokens: $, onPick: v }) {
    return /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: x }),
      /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: D.map((_) => {
        const N = I === _;
        return /* @__PURE__ */ t(
          "button",
          {
            onClick: () => v(_),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: N ? $[_] : "var(--muted)",
              background: N ? `color-mix(in srgb, ${$[_]} 16%, transparent)` : "transparent",
              boxShadow: N ? `inset 0 0 0 1px color-mix(in srgb, ${$[_]} 45%, transparent)` : "none"
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
        /* @__PURE__ */ t(f, { label: "Trust", value: l.trust, options: de, tokens: ze, onPick: (x) => y({ trust: x }) }),
        /* @__PURE__ */ t(f, { label: "Depth", value: l.depth, options: be, tokens: We, onPick: (x) => y({ depth: x }) }),
        /* @__PURE__ */ t("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function at({ cards: l }) {
  const y = l.flatMap(
    (f) => (f.parked || []).map((x) => {
      var I;
      return { ...x, cardTitle: f.title, repo: (I = f.source) == null ? void 0 : I.repo };
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
function nt({ repos: l, selected: y, onToggle: f, onClear: x, onAddWorkspace: I, onEdit: D }) {
  const $ = l.reduce((N, g) => N + g.count, 0), v = y.size === 0, _ = ({ name: N, count: g, label: w, checked: m, onClick: U, isAll: z }) => {
    const [W, M] = k(!1);
    return /* @__PURE__ */ o(
      "div",
      {
        onMouseEnter: () => M(!0),
        onMouseLeave: () => M(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: m ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: m ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ o(
            "button",
            {
              onClick: U,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                z ? /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: m ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ t(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: m ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${m ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: m && /* @__PURE__ */ t("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ t("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ t(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: m ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: w
                  }
                ),
                /* @__PURE__ */ t(
                  "span",
                  {
                    className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    children: g
                  }
                )
              ]
            }
          ),
          !z && N && /* @__PURE__ */ t(
            "button",
            {
              onClick: (K) => {
                K.stopPropagation(), D(N);
              },
              title: `Edit pipeline "${w}"`,
              "aria-label": `Edit pipeline ${w}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: W ? 1 : 0,
                pointerEvents: W ? "auto" : "none",
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
        /* @__PURE__ */ t(_, { isAll: !0, count: $, label: "All repos", checked: v, onClick: x }),
        l.map((N) => /* @__PURE__ */ t(
          _,
          {
            name: N.name,
            count: N.count,
            label: (qe.has(N.name) ? "Example: " : "") + (N.name.includes("/") ? N.name.split("/")[1] : N.name),
            checked: y.has(N.name),
            onClick: () => f(N.name)
          },
          N.name
        )),
        /* @__PURE__ */ o(
          "button",
          {
            onClick: I,
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
const ot = [
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
function st({ initial: l, knownAgents: y, crews: f, repo: x, stepName: I, onSave: D, onClose: $ }) {
  var j;
  const { openChat: v } = Xe(), [_, N] = k(l.name || ""), [g, w] = k(l.role || ""), [m, U] = k(l.tools || ["read"]), [z, W] = k(l.model || "auto"), [M, K] = k(l.crew || ""), [C, T] = k(l.addenda || []), [b, d] = k(l.trust || ""), [V, H] = k(l.depth || ""), G = (i) => U((c) => c.includes(i) ? c.filter((h) => h !== i) : [...c, i]), J = () => T((i) => {
    var c;
    return i.length >= 3 ? i : [...i, { crew: ((c = f[0]) == null ? void 0 : c.name) || "", when: "always", writes: "" }];
  }), B = (i, c) => T((h) => h.map((S, P) => P === i ? { ...S, ...c } : S)), E = (i) => T((c) => c.filter((h, S) => S !== i)), L = _.trim().length > 0;
  return /* @__PURE__ */ o("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ t("button", { onClick: $, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
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
Step: ${I || "(unnamed)"}

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
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: y.map((i) => /* @__PURE__ */ t(
          "button",
          {
            onClick: () => N(i),
            className: "text-[11px] px-2 py-1 rounded-md font-medium",
            style: {
              background: _ === i ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: _ === i ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: _ === i ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: i
          },
          i
        )) })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: _,
            onChange: (i) => N(i.target.value),
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
            value: g,
            onChange: (i) => w(i.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: ot.map((i) => {
          const c = m.includes(i);
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => G(i),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: c ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: c ? "var(--accent)" : "var(--muted)",
                boxShadow: c ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: i
            },
            i
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: z,
            onChange: (i) => W(i.target.value),
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
              onChange: (i) => K(i.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "— none (use step agent) —" }),
                f.map((i) => /* @__PURE__ */ t("option", { value: i.name, children: i.name }, i.name))
              ]
            }
          )
        ] }),
        M && /* @__PURE__ */ t("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: ((j = f.find((i) => i.name === M)) == null ? void 0 : j.description) || "Runs this step via select_crew → spawn_run(agent=" + M + ")" })
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
        C.map((i, c) => /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ t(
            "select",
            {
              value: i.crew,
              onChange: (h) => B(c, { crew: h.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: f.map((h) => /* @__PURE__ */ t("option", { value: h.name, children: h.name }, h.name))
            }
          ),
          /* @__PURE__ */ o(
            "select",
            {
              value: i.when || "always",
              onChange: (h) => B(c, { when: h.target.value }),
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
              value: i.writes || "",
              onChange: (h) => B(c, { writes: h.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ t("button", { onClick: () => E(c), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ t("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ t("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, c))
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...de].map((i) => {
          const c = b === i;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => d(i),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: c ? i ? ze[i] : "var(--text)" : "var(--muted)", background: c ? "var(--bg-hover, var(--border))" : "transparent" },
              children: i || "inherit"
            },
            i || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...be].map((i) => {
          const c = V === i;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => H(i),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: c ? i ? We[i] : "var(--text)" : "var(--muted)", background: c ? "var(--bg-hover, var(--border))" : "transparent" },
              children: i || "inherit"
            },
            i || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ t("button", { onClick: $, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ t(
        "button",
        {
          disabled: !L,
          onClick: () => D({
            name: _.trim(),
            role: g.trim() || void 0,
            tools: m,
            model: z.trim() && z.trim() !== "auto" ? z.trim() : void 0,
            crew: M || void 0,
            addenda: C.length ? C.filter((i) => i.crew) : void 0,
            trust: b || void 0,
            depth: V || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save Agent"
        }
      )
    ] })
  ] });
}
function He({ candidates: l, existingRepos: y, defaults: f, knownAgents: x, crews: I, onCreate: D, onClose: $, editPipeline: v, cardCount: _, isExample: N, onDelete: g }) {
  var _e, ue, Re, ye, we, $e, Te, je, Oe, ke, Ae, ce, r, n;
  const w = !!v, [m, U] = k((v == null ? void 0 : v.repo) || ""), [z, W] = k((v == null ? void 0 : v.source) || "manual"), [M, K] = k((v == null ? void 0 : v.trust) || f.trust), [C, T] = k((v == null ? void 0 : v.depth) || f.depth), [b, d] = k((v == null ? void 0 : v.backlog_intake) ?? !0), [V, H] = k((v == null ? void 0 : v.results_in_repo) ?? !1), [G, J] = k((v == null ? void 0 : v.self_enabling) ?? !1), [B, E] = k((v == null ? void 0 : v.approach) || "simplified"), [L, j] = k(() => {
    var e;
    return (e = v == null ? void 0 : v.steps) != null && e.length ? v.steps.map((a) => ({ ...a })) : Se.map((a) => ({ ...a }));
  }), [i, c] = k(null), [h, S] = k(""), [P, te] = k("settings"), re = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", ae = (e, a) => j((s) => s.map((p, u) => u === e ? { ...p, ...a } : p)), pe = (e) => j((a) => a.filter((s, p) => p !== e)), O = (e, a) => j((s) => {
    const p = e + a;
    if (p < 0 || p >= s.length) return s;
    const u = [...s];
    return [u[e], u[p]] = [u[p], u[e]], u;
  }), ie = (e) => j((a) => [...a, {
    id: `${e}-${Math.random().toString(36).slice(2, 6)}`,
    name: e === "gate" ? "New Gate" : "New Step",
    type: e,
    agent: e === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), fe = (e) => {
    U(e.repo), W(e.source);
  }, R = (e) => {
    let a = (e || "").trim();
    if (!a) return "";
    const s = a.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return s && (a = s[1]), a.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, q = (e) => {
    const a = /github\.com|gitlab\.com/i.test(e);
    U(a ? R(e) : e), W("manual");
  }, A = /^[^/\s]+\/[^/\s]+$/.test(R(m)) || l.some((e) => e.repo === m), Y = !w && y.has(R(m)), oe = ({ value: e, options: a, tokens: s, onPick: p }) => /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: a.map((u) => {
    const ne = e === u;
    return /* @__PURE__ */ t(
      "button",
      {
        onClick: () => p(u),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: ne ? s[u] : "var(--muted)",
          background: ne ? `color-mix(in srgb, ${s[u]} 16%, transparent)` : "transparent",
          boxShadow: ne ? `inset 0 0 0 1px color-mix(in srgb, ${s[u]} 45%, transparent)` : "none"
        },
        children: u
      },
      u
    );
  }) }), ee = { "issue-radar": [], workspace: [], manual: [] };
  l.forEach((e) => {
    var a;
    (ee[a = e.source] || (ee[a] = [])).push(e);
  });
  const Ce = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" };
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: $,
      children: /* @__PURE__ */ t(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (e) => e.stopPropagation(),
          children: i !== null ? /* @__PURE__ */ t(
            st,
            {
              initial: {
                name: ((ue = (_e = L[i]) == null ? void 0 : _e.agent) == null ? void 0 : ue.name) || "",
                role: (ye = (Re = L[i]) == null ? void 0 : Re.agent) == null ? void 0 : ye.role,
                tools: ($e = (we = L[i]) == null ? void 0 : we.agent) == null ? void 0 : $e.tools,
                model: (je = (Te = L[i]) == null ? void 0 : Te.agent) == null ? void 0 : je.model,
                crew: (ke = (Oe = L[i]) == null ? void 0 : Oe.agent) == null ? void 0 : ke.crew,
                addenda: (Ae = L[i]) == null ? void 0 : Ae.addenda,
                trust: (ce = L[i]) == null ? void 0 : ce.trust,
                depth: (r = L[i]) == null ? void 0 : r.depth
              },
              knownAgents: x,
              crews: I,
              repo: m,
              stepName: ((n = L[i]) == null ? void 0 : n.name) || "",
              onClose: () => c(null),
              onSave: (e) => {
                ae(i, {
                  agent: { name: e.name, role: e.role, tools: e.tools, model: e.model, crew: e.crew },
                  addenda: e.addenda,
                  trust: e.trust,
                  depth: e.depth
                }), c(null);
              }
            }
          ) : /* @__PURE__ */ o(Me, { children: [
            /* @__PURE__ */ o("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ o("div", { children: [
                /* @__PURE__ */ t("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: w ? "Edit Pipeline" : "New Pipeline" }),
                /* @__PURE__ */ t("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: w ? m.includes("/") ? m.split("/")[1] : m : "Configure a pipeline for a repository or workspace" })
              ] }),
              /* @__PURE__ */ t("button", { onClick: $, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
            ] }),
            w && /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: ["settings", "danger"].map((e) => {
              const a = P === e, s = e === "danger";
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
                style: { display: w && P === "danger" ? "none" : "flex" },
                children: [
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                    /* @__PURE__ */ t(
                      "input",
                      {
                        value: m,
                        onChange: (e) => q(e.target.value),
                        onPaste: (e) => {
                          const a = e.clipboardData.getData("text");
                          /github\.com|gitlab\.com/i.test(a) && (e.preventDefault(), q(a));
                        },
                        placeholder: "https://github.com/owner/name  ·  or  owner/name",
                        disabled: w,
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                        style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Y ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                      }
                    ),
                    !w && m && R(m) !== m && /* @__PURE__ */ o("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                      "→ ",
                      /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: R(m) })
                    ] }),
                    Y && /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                    /* @__PURE__ */ t("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((e) => ee[e].length > 0 && /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Ce[e] }),
                      /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1.5", children: ee[e].map((a) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => fe(a),
                          disabled: y.has(a.repo),
                          title: a.detail || a.repo,
                          className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                          style: {
                            background: m === a.repo ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                            color: m === a.repo ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                            boxShadow: m === a.repo ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                          },
                          children: a.repo.includes("/") ? a.repo.split("/")[1] : a.repo
                        },
                        a.repo
                      )) })
                    ] }, e)) })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                    /* @__PURE__ */ t(oe, { value: M, options: de, tokens: ze, onPick: K })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                    /* @__PURE__ */ t(oe, { value: C, options: be, tokens: We, onPick: T })
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
                        onClick: () => d((e) => !e),
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
                        onClick: () => H((e) => !e),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: V ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ t(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: V ? 20 : 2 }
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
                        onClick: () => E(e),
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
                      var s, p;
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
                                  onChange: (u) => ae(a, { name: u.target.value, id: re(u.target.value) }),
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
                              /* @__PURE__ */ t("button", { onClick: () => pe(a), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                            ] }),
                            e.type === "agent" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                              /* @__PURE__ */ o(
                                "button",
                                {
                                  onClick: () => c(a),
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
                                  onChange: (u) => ae(a, { trigger: u.target.value === "ask" ? void 0 : u.target.value }),
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
                              ((p = e.agent) == null ? void 0 : p.role) && /* @__PURE__ */ t("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: e.agent.role })
                            ] }),
                            e.type === "gate" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                              /* @__PURE__ */ o(
                                "select",
                                {
                                  value: e.trust || "",
                                  onChange: (u) => ae(a, { trust: u.target.value || void 0 }),
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ t("option", { value: "", children: "inherit" }),
                                    de.map((u) => /* @__PURE__ */ t("option", { value: u, children: u }, u))
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
            w && P === "danger" && g && (() => {
              const e = m.includes("/") ? m.split("/")[1] : m, a = h.trim() === e;
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
                          g(m), $();
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
                        value: h,
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
                          g(m), $();
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
              /* @__PURE__ */ t("button", { onClick: $, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Cancel" }),
              !(w && P === "danger") && /* @__PURE__ */ t(
                "button",
                {
                  disabled: !A || !w && Y,
                  onClick: () => D({
                    repo: R(m),
                    source: z,
                    trust: M,
                    depth: C,
                    backlog_intake: b,
                    results_in_repo: V,
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
function pt() {
  const l = Ye(), [y, f] = k([]), [x, I] = k([]), [D, $] = k(Ne), [v, _] = k(!0), [N, g] = k("pipeline"), [w, m] = k(/* @__PURE__ */ new Set()), [U, z] = k(!1), [W, M] = k(null), [K, C] = k([]), [T, b] = k([]), [d, V] = k(!1), [H, G] = k([]), J = le(null), B = le(!1), E = F(async () => {
    try {
      let r;
      try {
        r = await l.get("/api/file-read?path=" + encodeURIComponent(Q));
      } catch (n) {
        if (Q !== Ue)
          Q = Ue, r = await l.get("/api/file-read?path=" + encodeURIComponent(Q));
        else
          throw n;
      }
      f(r.cards || []), I(r.pipelines || []), $({ ...Ne, ...r.config || {} });
    } catch (r) {
      console.error("Failed to fetch cards:", r);
    } finally {
      _(!1);
    }
  }, [l]), L = se(() => {
    const r = /* @__PURE__ */ new Map();
    return x.forEach((n) => {
      r.has(n.repo) || r.set(n.repo, 0);
    }), y.forEach((n) => {
      var a;
      const e = ((a = n.source) == null ? void 0 : a.repo) || "unlinked";
      r.set(e, (r.get(e) || 0) + 1);
    }), [...r.entries()].map(([n, e]) => ({ name: n, count: e })).sort((n, e) => e.count - n.count);
  }, [y, x]), j = se(
    () => w.size === 0 ? y : y.filter((r) => {
      var n;
      return w.has(((n = r.source) == null ? void 0 : n.repo) || "unlinked");
    }),
    [y, w]
  ), i = 6e5, c = se(() => {
    var n, e, a, s, p;
    const r = [];
    for (const u of j) {
      const ne = u.step_status || {}, me = x.find((X) => X.id === u.pipeline_id) || x.find((X) => {
        var Z;
        return X.repo === ((Z = u.source) == null ? void 0 : Z.repo);
      });
      for (const [X, Z] of Object.entries(ne))
        if (Z === "pending" || Z === "error") {
          const Fe = (n = u.pending_at) == null ? void 0 : n[X], Ve = Fe ? Date.now() - new Date(Fe).getTime() > i : !1, ge = (e = me == null ? void 0 : me.steps) == null ? void 0 : e.find((ve) => ve.id === X), Je = ((a = ge == null ? void 0 : ge.agent) == null ? void 0 : a.crew) || ((s = ge == null ? void 0 : ge.agent) == null ? void 0 : s.name) || "orchestrator", he = (p = u.step_sessions) == null ? void 0 : p[X], Ge = he == null ? void 0 : he.agent_id, Ke = Ge ? H.some((ve) => ve.id === Ge) : H.some((ve) => (ve.task || "").includes(u.id) || (ve.task || "").includes(u.title));
          r.push({ card: u.title || u.id, step: X, agent: Je, stale: Ve, status: Z, live: Ke, agentId: Ge, sessionName: he == null ? void 0 : he.name });
        }
    }
    return r;
  }, [j, x, H]), h = se(() => {
    var s;
    let r;
    if (w.size === 1) {
      const p = [...w][0];
      r = (s = x.find((u) => u.repo === p)) == null ? void 0 : s.steps;
    } else x.length === 1 && (r = x[0].steps);
    const n = (r && r.length ? r : Se).map((p) => ({ ...p })), e = new Set(n.map((p) => p.id)), a = [];
    return e.has("intake") || a.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), a.push(...n), e.has("done") || a.push({ id: "done", name: "Done", type: "agent" }), a;
  }, [w, x]), S = se(() => h.map((r) => r.id), [h]), P = F((r) => {
    var n;
    return ((n = h.find((e) => e.id === r)) == null ? void 0 : n.type) === "gate" || r.startsWith("gate-");
  }, [h]), te = F((r) => {
    var n, e;
    return ((e = (n = h.find((a) => a.id === r)) == null ? void 0 : n.agent) == null ? void 0 : e.name) || Pe[r] || "unknown";
  }, [h]);
  Be(() => {
    E();
    const r = async () => {
      try {
        const e = Q.slice(0, Q.lastIndexOf("/")), a = (e ? e + "/" : "") + "live_spawns.json", s = await l.get("/api/file-read?path=" + encodeURIComponent(a));
        B.current = !1;
        const p = s != null && s.at ? Date.now() - new Date(s.at).getTime() < 18e4 : !0;
        G(p && Array.isArray(s == null ? void 0 : s.runs) ? s.runs : []);
      } catch {
        B.current = !0, G([]);
      }
    };
    E().then(r);
    const n = setInterval(() => {
      E().then(() => {
        B.current || r();
      });
    }, 1e4);
    return () => clearInterval(n);
  }, [E, l]), Be(() => {
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
    const e = (r.pipelines || []).find((p) => p.id === n.pipeline_id) || (r.pipelines || []).find((p) => {
      var u;
      return p.repo === ((u = n.source) == null ? void 0 : u.repo);
    }), s = ["intake", ...(e != null && e.steps && e.steps.length ? e.steps : Se).map((p) => p.id).filter((p) => p !== "intake" && p !== "done"), "done"];
    return [...new Set(s)];
  }, ae = F(async (r) => {
    var n;
    try {
      const e = await l.get("/api/file-read?path=" + encodeURIComponent(Q)), a = (n = e.cards) == null ? void 0 : n.find((ne) => ne.id === r);
      if (!a) return;
      const s = re(e, a), p = s.indexOf(a.stage);
      if (p < 0 || p >= s.length - 1) return;
      const u = a.stage;
      a.stage = s[p + 1], a.updated_at = (/* @__PURE__ */ new Date()).toISOString(), a.gate_history = a.gate_history || [], a.gate_history.push({ gate: u, decision: "approved", at: a.updated_at, notes: "" }), a.history = a.history || [], a.history.push({ from: u, to: a.stage, at: a.updated_at, agent: "human" }), await l.post("/api/file-write", { path: Q, content: JSON.stringify(e, null, 2) }), E();
    } catch (e) {
      console.error("Failed to advance card:", e);
    }
  }, [l, E]), pe = F(async (r) => {
    var n, e;
    try {
      const a = await l.get("/api/file-read?path=" + encodeURIComponent(Q)), s = (n = a.cards) == null ? void 0 : n.find((Z) => Z.id === r);
      if (!s) return;
      const p = re(a, s), u = new Set((((e = (a.pipelines || []).find((Z) => Z.id === s.pipeline_id)) == null ? void 0 : e.steps) || Se).filter((Z) => Z.type === "gate").map((Z) => Z.id)), ne = p.indexOf(s.stage);
      if (ne <= 0) return;
      const me = s.stage;
      let X = ne - 1;
      for (; X > 0 && (u.has(p[X]) || p[X].startsWith("gate-")); ) X--;
      s.stage = p[X], s.updated_at = (/* @__PURE__ */ new Date()).toISOString(), s.gate_history = s.gate_history || [], s.gate_history.push({ gate: me, decision: "rejected", at: s.updated_at, notes: "" }), s.history = s.history || [], s.history.push({ from: me, to: s.stage, at: s.updated_at, agent: "human" }), await l.post("/api/file-write", { path: Q, content: JSON.stringify(a, null, 2) }), E();
    } catch (a) {
      console.error("Failed to reject card:", a);
    }
  }, [l, E]), O = F(async (r) => {
    try {
      const n = await l.get("/api/file-read?path=" + encodeURIComponent(Q));
      n.cards = n.cards || [], r(n);
      try {
        const e = await l.get("/api/file-read?path=" + encodeURIComponent(Q));
        e.cards = e.cards || [], r(e), await l.post("/api/file-write", { path: Q, content: JSON.stringify(e, null, 2) });
      } catch {
        await l.post("/api/file-write", { path: Q, content: JSON.stringify(n, null, 2) });
      }
      E();
    } catch (n) {
      console.error("Failed to mutate state:", n);
    }
  }, [l, E]), ie = F((r) => {
    $((n) => ({ ...n, ...r })), O((n) => {
      n.config = { ...Ne, ...n.config || {}, ...r };
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
  const fe = F((r, n, e, a) => {
    O((s) => {
      const p = s.cards.find((u) => u.id === r);
      p && (p.interjection = [...p.interjection || [], {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        step: n,
        kind: e,
        text: a,
        by: "user",
        status: "pending"
      }], p.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [O]), R = F((r, n, e) => {
    O((a) => {
      const s = a.cards.find((u) => u.id === r);
      if (!s) return;
      const p = (s.decisions || []).find((u) => u.id === n);
      p && (p.chosen = e, p.resolved_at = (/* @__PURE__ */ new Date()).toISOString()), s.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [O]), q = F((r) => {
    O((n) => {
      var s;
      const e = n.cards.find((p) => p.id === r);
      if (!e) return;
      const a = e.trust || ((s = n.config) == null ? void 0 : s.trust) || Ne.trust;
      e.trust = de[(de.indexOf(a) + 1) % de.length], e.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [O]), A = F((r) => {
    O((n) => {
      var s;
      const e = n.cards.find((p) => p.id === r);
      if (!e) return;
      const a = e.depth || ((s = n.config) == null ? void 0 : s.depth) || Ne.depth;
      e.depth = be[(be.indexOf(a) + 1) % be.length], e.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [O]), Y = F((r) => {
    m((n) => {
      const e = new Set(n);
      return e.has(r) ? e.delete(r) : e.add(r), e;
    });
  }, []), oe = F(() => m(/* @__PURE__ */ new Set()), []), ee = F(async () => {
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
    C(r), z(!0);
  }, [l]), Ce = F(async (r) => {
    const n = (/* @__PURE__ */ new Date()).toISOString(), e = "pl-" + Math.random().toString(36).slice(2, 10);
    await O((a) => {
      a.pipelines = a.pipelines || [];
      const s = a.pipelines.find((p) => p.repo === r.repo);
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
    }), z(!1), M(null), m(/* @__PURE__ */ new Set([r.repo]));
  }, [O]), _e = F(async (r) => {
    await O((n) => {
      n.pipelines = (n.pipelines || []).filter((e) => e.repo !== r), n.cards = (n.cards || []).filter((e) => {
        var a;
        return (((a = e.source) == null ? void 0 : a.repo) || "unlinked") !== r;
      });
    }), m((n) => {
      const e = new Set(n);
      return e.delete(r), e;
    });
  }, [O]), ue = se(() => S.reduce((r, n) => (r[n] = j.filter((e) => e.stage === n), r), {}), [j, S]), Re = F((r) => {
    var n;
    (n = document.getElementById(`stage-col-${r}`)) == null || n.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), ye = se(() => {
    const r = {};
    return j.forEach((n) => {
      var a;
      const e = ((a = n.source) == null ? void 0 : a.repo) || "unlinked";
      (r[e] || (r[e] = [])).push(n);
    }), r;
  }, [j]), we = se(() => {
    const r = {};
    return j.forEach((n) => {
      const e = te(n.stage);
      (r[e] || (r[e] = [])).push(n);
    }), r;
  }, [j, te]), $e = se(() => {
    const r = [], n = [], e = [];
    return j.forEach((a) => {
      a.stage === "done" ? e.push(a) : P(a.stage) ? r.push(a) : n.push(a);
    }), { "Blocked at Gate": r, "In-Flight (Auto)": n, Done: e };
  }, [j, P]), Te = j.filter((r) => r.stage !== "done").length, je = j.filter((r) => P(r.stage)).length, Oe = j.filter((r) => r.stage === "done").length, ke = j.reduce((r, n) => {
    var e;
    return r + (((e = n.parked) == null ? void 0 : e.length) || 0);
  }, 0), Ae = {
    pipeline: j.length,
    workspace: Object.keys(ye).length,
    crew: Object.keys(we).length,
    status: j.length,
    backlog: ke
  }, ce = (r) => ({
    card: r,
    config: D,
    onApprove: P(r.stage) ? () => ae(r.id) : void 0,
    onReject: P(r.stage) ? () => pe(r.id) : void 0,
    onCycleTrust: () => q(r.id),
    onCycleDepth: () => A(r.id),
    onInterject: (n, e) => fe(r.id, r.stage, n, e),
    onResolveDecision: (n, e) => R(r.id, n, e)
  });
  return /* @__PURE__ */ o(Me, { children: [
    /* @__PURE__ */ t(Ze, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    U && /* @__PURE__ */ t(
      He,
      {
        candidates: K,
        existingRepos: new Set(x.map((r) => r.repo)),
        defaults: D,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: T,
        onCreate: Ce,
        onClose: () => z(!1)
      }
    ),
    W && /* @__PURE__ */ t(
      He,
      {
        candidates: K,
        existingRepos: new Set(x.map((r) => r.repo)),
        defaults: D,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: T,
        editPipeline: x.find((r) => r.repo === W) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + W, repo: W, source: "manual", trust: D.trust, depth: D.depth, backlog_intake: !0, sot: "github", steps: Se.map((r) => ({ ...r })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: y.filter((r) => {
          var n;
          return (((n = r.source) == null ? void 0 : n.repo) || "unlinked") === W;
        }).length,
        isExample: qe.has(W),
        onCreate: Ce,
        onDelete: _e,
        onClose: () => M(null)
      }
    ),
    /* @__PURE__ */ o("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ t(et, { steps: h, cardsByStage: ue, onNodeClick: Re }),
      /* @__PURE__ */ o("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5", children: [
        /* @__PURE__ */ t(Ie, { label: "Active", value: String(Te), accent: !0 }),
        /* @__PURE__ */ t(Ie, { label: "Gated", value: String(je) }),
        /* @__PURE__ */ t(Ie, { label: "Done", value: String(Oe) }),
        /* @__PURE__ */ t(Ie, { label: "Parked", value: String(ke) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ t(
          nt,
          {
            repos: L,
            selected: w,
            onToggle: Y,
            onClear: oe,
            onAddWorkspace: ee,
            onEdit: M
          }
        ),
        /* @__PURE__ */ o("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ o("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ t(tt, { active: N, onChange: g, counts: Ae }),
            /* @__PURE__ */ o("div", { className: "relative", children: [
              /* @__PURE__ */ o(
                "button",
                {
                  onClick: () => V((r) => !r),
                  className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Click to see which agents are running",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: c.length ? "var(--accent)" : "var(--muted)" },
                  children: [
                    c.length > 0 ? /* @__PURE__ */ o(Me, { children: [
                      /* @__PURE__ */ t("span", { className: "inline-block animate-pulse", style: { width: 7, height: 7, borderRadius: 999, background: "var(--accent)" } }),
                      /* @__PURE__ */ o("span", { className: "font-semibold", children: [
                        c.length,
                        " running"
                      ] }),
                      c.some((r) => r.stale) && /* @__PURE__ */ o("span", { style: { color: "var(--warn)" }, children: [
                        "· ",
                        c.filter((r) => r.stale).length,
                        " stale ↻"
                      ] })
                    ] }) : /* @__PURE__ */ o(Me, { children: [
                      /* @__PURE__ */ t("span", { style: { width: 7, height: 7, borderRadius: 999, background: "var(--muted)", display: "inline-block", opacity: 0.5 } }),
                      " ",
                      /* @__PURE__ */ t("span", { children: "idle" })
                    ] }),
                    /* @__PURE__ */ t("span", { style: { opacity: 0.5, fontSize: 9 }, children: d ? "▲" : "▼" })
                  ]
                }
              ),
              d && /* @__PURE__ */ o(
                "div",
                {
                  className: "absolute z-20 mt-1 left-0 rounded-md p-2 flex flex-col gap-1 min-w-[260px]",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 6px 20px rgba(0,0,0,0.25)" },
                  children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-0.5", style: { color: "var(--muted)" }, children: "Subagents in flight" }),
                    c.length === 0 ? /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No agents running — pipeline idle." }) : c.map((r) => /* @__PURE__ */ o(
                      "div",
                      {
                        className: "flex items-center gap-2 text-[11px] px-1.5 py-1 rounded",
                        style: { background: "var(--bg, transparent)" },
                        children: [
                          /* @__PURE__ */ t("span", { className: "inline-block animate-pulse flex-shrink-0", style: { width: 6, height: 6, borderRadius: 999, background: r.stale ? "var(--warn)" : "var(--accent)" } }),
                          /* @__PURE__ */ t("span", { className: "font-semibold", style: { color: "var(--accent)" }, title: r.sessionName || void 0, children: r.agent }),
                          /* @__PURE__ */ o("span", { style: { color: "var(--muted)" }, children: [
                            "· ",
                            r.step
                          ] }),
                          r.agentId && /* @__PURE__ */ o(
                            "span",
                            {
                              className: "font-mono flex-shrink-0",
                              style: { color: "var(--muted)", fontSize: 10 },
                              title: `session: ${r.sessionName || r.agentId} — open/steer via /dlc-yolo (spawn_continue ${r.agentId})`,
                              children: [
                                "⧉",
                                r.agentId.slice(0, 6)
                              ]
                            }
                          ),
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
                  /* @__PURE__ */ t("button", { onClick: oe, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ t(rt, { config: D, onSet: ie }),
          v ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : N === "backlog" ? /* @__PURE__ */ t(at, { cards: j }) : /* @__PURE__ */ o("div", { ref: J, className: "flex gap-3 overflow-x-auto pb-4", children: [
            N === "pipeline" && h.map((r) => /* @__PURE__ */ t(Le, { id: `stage-col-${r.id}`, title: r.name, count: (ue[r.id] || []).length, children: (ue[r.id] || []).map((n) => /* @__PURE__ */ t(Ee, { ...ce(n) }, n.id)) }, r.id)),
            N === "workspace" && Object.entries(ye).map(([r, n]) => /* @__PURE__ */ t(Le, { title: r, count: n.length, children: n.map((e) => /* @__PURE__ */ t(Ee, { ...ce(e) }, e.id)) }, r)),
            N === "crew" && Object.entries(we).map(([r, n]) => /* @__PURE__ */ t(Le, { title: r, count: n.length, children: n.map((e) => /* @__PURE__ */ t(Ee, { ...ce(e) }, e.id)) }, r)),
            N === "status" && Object.entries($e).map(([r, n]) => /* @__PURE__ */ t(Le, { title: r, count: n.length, children: n.map((e) => /* @__PURE__ */ t(Ee, { ...ce(e) }, e.id)) }, r))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  pt as default
};
