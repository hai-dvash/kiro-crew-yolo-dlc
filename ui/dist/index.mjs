import { jsxs as s, Fragment as Ee, jsx as e } from "react/jsx-runtime";
import { useAppApi as qe, useChatLauncher as Ve } from "@kirocrew/app-sdk";
import { PageHeader as Je, StatCard as je } from "@kirocrew/app-sdk/ui";
import { useState as C, useRef as de, useCallback as G, useMemo as le, useEffect as Ie } from "react";
const Ke = "~/.dlc-yolo/state.json", We = "/tmp/dlc-yolo/state.json";
let Z = Ke;
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
], Ge = /* @__PURE__ */ new Set([
  "hai-dvash/webapp",
  "hai-dvash/dashboard",
  "hai-dvash/api-core"
]), Ye = {
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
}, ue = ["manual", "assisted", "autonomous"], ve = ["quick", "standard", "deep"], we = { trust: "assisted", depth: "standard" }, Le = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, Me = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function he({ color: l, children: w, title: x, onClick: g, active: A }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      title: x,
      onClick: g,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: l,
        background: `color-mix(in srgb, ${l} 14%, transparent)`,
        boxShadow: A ? `inset 0 0 0 1px color-mix(in srgb, ${l} 55%, transparent)` : "none",
        opacity: g && !A ? 0.85 : 1,
        cursor: g ? "pointer" : "default"
      },
      children: w
    }
  );
}
const De = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Xe({ steps: l, cardsByStage: w, onNodeClick: x }) {
  const g = de(null), A = de(null), I = de(0), D = de(null), v = de(l), $ = de(w), k = de([]);
  v.current = l, $.current = w;
  const m = 3, _ = 116, u = _ / m, M = u - 26, [B, F] = C(880);
  Ie(() => {
    const R = A.current;
    if (!R) return;
    const p = new ResizeObserver((h) => {
      const b = Math.max(360, Math.floor(h[0].contentRect.width));
      F(b);
    });
    return p.observe(R), () => p.disconnect();
  }, []);
  const W = (R) => R.type === "gate" || R.id.startsWith("gate-");
  return Ie(() => {
    const R = g.current;
    if (!R) return;
    const p = Math.floor(B / m);
    R.width = p * m, R.height = u * m;
    const h = R.getContext("2d");
    if (!h) return;
    const b = (z, H, E, ee, f) => {
      h.fillStyle = f, h.fillRect(z * m, H * m, E * m, ee * m);
    }, J = () => {
      const z = I.current, H = v.current, E = $.current, ee = Math.max(1, H.length);
      Math.max(1, ...H.map((d) => {
        var y;
        return ((y = E[d.id]) == null ? void 0 : y.length) || 0;
      })), b(0, 0, p, M, "#0f172a");
      for (let d = 0; d < p / 5; d++) {
        const y = d * 37 % p, N = d * 13 % (M - 4);
        Math.sin(z * 0.03 + d * 2.1) > 0.35 && b(y, N, 1, 1, "#e2e8f0");
      }
      b(p - 26, 8, 10, 10, "#fde68a"), b(p - 24, 7, 8, 8, "#0f172a");
      for (let d = 0; d < p; d += 16)
        for (let y = M; y < u; y += 16)
          b(d, y, 16, 16, d / 16 + y / 16 & 1 ? "#33261a" : "#2a1f14");
      b(0, M - 2, p, 2, "#4a3520");
      const f = p / ee, Q = [];
      for (let d = 0; d < H.length; d++) {
        const y = H[d], N = Math.round(f * (d + 0.5)), te = (E[y.id] || []).length, ne = te > 0, oe = De[d % De.length], L = W(y), re = M - 2;
        if (Q.push({ x: N - Math.floor(f / 2), w: Math.floor(f), id: y.id }), d < H.length - 1) {
          const j = Math.round(f * (d + 1.5));
          for (let U = N + 8; U < j - 8; U += 4) b(U, M - 1, 2, 1, "#4a3520");
        }
        if (L) {
          const j = re - 20, U = ne ? "#f39c12" : "#3a3222";
          b(N - 3, j, 6, 20, ne ? "#5c4a2a" : "#2a2418");
          for (let O = 0; O < 5; O++) b(N - O, j - 5 + O, O * 2 + 1, 1, U);
          for (let O = 0; O < 5; O++) b(N - (4 - O), j - O, (4 - O) * 2 + 1, 1, U);
          if (ne) {
            const O = (Math.sin(z * 0.08) + 1) / 2;
            h.globalAlpha = 0.35 + O * 0.4, b(N - 1, j - 6, 2, 2, "#ffd27a"), h.globalAlpha = 1;
          }
        } else {
          const j = re - 14;
          if (b(N - 10, j, 20, 3, "#7a5c47"), b(N - 10, j - 1, 20, 1, oe), b(N - 9, j + 3, 2, 8, "#5c4033"), b(N + 7, j + 3, 2, 8, "#5c4033"), b(N - 5, j - 9, 10, 9, "#333"), b(N - 4, j - 8, 8, 7, ne ? "#0a2a0a" : "#1a1a1a"), ne)
            for (let U = 0; U < 3; U++) {
              const O = 2 + (z + U * 7) % 5;
              b(N - 3, j - 7 + U * 2, O, 0.8, "#33ff33");
            }
        }
        const ce = Math.min(te, 5);
        for (let j = 0; j < ce; j++) {
          const U = ce > 1 ? (j - (ce - 1) / 2) * 8 : 0, O = Math.round(N + U) - 3, K = re - (L ? 2 : 4), ie = De[(d + j) % De.length], Y = Math.sin(z * 0.08 + d + j) > 0 ? 1 : 0;
          h.fillStyle = "rgba(0,0,0,0.18)", h.fillRect(O * m, (K + 8) * m, 6 * m, m), b(O, K + Y, 6, 6, ie), b(O + 1, K - 4 + Y, 4, 4, "#fdd"), b(O + 1, K - 5 + Y, 4, 1, "#333"), (z + d * 9 + j * 5) % 120 >= 3 && (b(O + 2, K - 3 + Y, 1, 1, "#333"), b(O + 4, K - 3 + Y, 1, 1, "#333")), b(O + 1, K + 6, 1, 2, ie), b(O + 4, K + 6, 1, 2, ie);
        }
        te > 5 && (h.fillStyle = oe, h.font = `${3 * m}px monospace`, h.fillText(`+${te - 5}`, (N + 10) * m, (re - 6) * m)), te > 0 && (h.fillStyle = oe, h.fillRect((N + 6) * m, (re - 30) * m, 9 * m, 9 * m), h.fillStyle = "#0f172a", h.font = `bold ${5 * m}px monospace`, h.textAlign = "center", h.fillText(String(te), (N + 10.5) * m, (re - 24) * m), h.textAlign = "left"), h.fillStyle = ne ? "#e2e8f0" : "#6b7280", h.font = `${3.4 * m}px monospace`, h.textAlign = "center";
        const xe = y.name.length > 12 ? y.name.slice(0, 11) + "…" : y.name;
        h.fillText(xe, N * m, (u - 4) * m), h.textAlign = "left";
      }
      k.current = Q;
      const c = H.reduce((d, y) => {
        var N;
        return d + (((N = E[y.id]) == null ? void 0 : N.length) || 0);
      }, 0);
      h.fillStyle = "#f90", h.font = `bold ${3.6 * m}px monospace`, h.fillText(`${c} card${c !== 1 ? "s" : ""} · ${ee} milestone${ee !== 1 ? "s" : ""}`, 4 * m, 8 * m);
    }, V = () => {
      I.current++, J(), D.current = requestAnimationFrame(V);
    };
    return D.current = requestAnimationFrame(V), () => {
      D.current && cancelAnimationFrame(D.current);
    };
  }, [B, u, M]), /* @__PURE__ */ e("div", { ref: A, className: "w-full mb-5", children: /* @__PURE__ */ e(
    "canvas",
    {
      ref: g,
      onClick: (R) => {
        const p = g.current;
        if (!p) return;
        const h = p.getBoundingClientRect(), b = (R.clientX - h.left) / h.width * (p.width / m), J = k.current.find((V) => b >= V.x && b <= V.x + V.w);
        J && x(J.id);
      },
      style: {
        width: "100%",
        height: _ + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function Ze({ active: l, onChange: w, counts: x }) {
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
      ].map((A) => {
        const I = l === A.id, D = x[A.id];
        return /* @__PURE__ */ s(
          "button",
          {
            onClick: () => w(A.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: I ? "var(--accent)" : "transparent",
              color: I ? "var(--bg)" : "var(--muted)"
            },
            children: [
              A.label,
              D > 0 && /* @__PURE__ */ e(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: I ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: I ? "var(--bg)" : "var(--muted)" },
                  children: D
                }
              )
            ]
          },
          A.id
        );
      })
    }
  );
}
function Oe({ card: l, config: w, onApprove: x, onReject: g, onCycleTrust: A, onCycleDepth: I }) {
  var W, q, R;
  const D = l.stage.startsWith("gate-"), v = D ? "var(--warn)" : "var(--border-strong, var(--border))", $ = l.trust || w.trust, k = l.depth || w.depth, m = ((W = l.parked) == null ? void 0 : W.length) || 0, [_, u] = C(!1), [M, B] = C(""), F = (l.decisions || []).filter((p) => !p.chosen && (p.action === "add-addendum" || p.options));
  return /* @__PURE__ */ s(
    "div",
    {
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${v}`
      },
      children: [
        /* @__PURE__ */ e("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: l.title }),
        ((q = l.source) == null ? void 0 : q.repo) && /* @__PURE__ */ s(
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
        /* @__PURE__ */ s("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ e(
            he,
            {
              color: Le[$],
              active: !!l.trust,
              onClick: A,
              title: `trust: ${$}${l.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: $
            }
          ),
          /* @__PURE__ */ e(
            he,
            {
              color: Me[k],
              active: !!l.depth,
              onClick: I,
              title: `depth: ${k}${l.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: k
            }
          ),
          m > 0 && /* @__PURE__ */ s(he, { color: "var(--warn)", title: `${m} parked idea(s)`, children: [
            "⏸ ",
            m
          ] }),
          typeof ((R = l.effort) == null ? void 0 : R.total) == "number" && l.effort.total > 0 && /* @__PURE__ */ s(he, { color: "var(--info)", title: `estimated effort: ${l.effort.total} points`, children: [
            "⚡ ",
            l.effort.total
          ] }),
          l.backstep_history && l.backstep_history.length > 0 && /* @__PURE__ */ s(
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
            return /* @__PURE__ */ s(
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
        D && x && g && /* @__PURE__ */ s("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
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
              onClick: g,
              children: "Reject"
            }
          ),
          (l.stage === "gate-review" || /review/i.test(l.stage || "")) && (() => {
            var V, z, H;
            const p = (V = l.source) == null ? void 0 : V.repo;
            if (!p) return null;
            const h = (z = l.artifacts) == null ? void 0 : z.pr_url, b = h && ((H = /\/pull\/(\d+)/.exec(h)) == null ? void 0 : H[1]), J = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + p)}` + (b ? `&pr=${b}` : "");
            return /* @__PURE__ */ s(
              "a",
              {
                href: J,
                title: h ? `Deep-review PR #${b} in Code Review Sage` : `Open Code Review Sage for ${p}`,
                className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
                style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: [
                  /* @__PURE__ */ s("svg", { width: "11", height: "11", viewBox: "0 0 16 16", fill: "none", children: [
                    /* @__PURE__ */ e("circle", { cx: "7", cy: "7", r: "4.5", stroke: "currentColor", strokeWidth: "1.5" }),
                    /* @__PURE__ */ e("path", { d: "M10.5 10.5L14 14", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                  ] }),
                  "Review in Sage"
                ]
              }
            );
          })()
        ] }),
        onResolveDecision && F.map((p) => /* @__PURE__ */ s(
          "div",
          {
            className: "mt-2 p-1.5 rounded-md text-[11px]",
            style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
            children: [
              /* @__PURE__ */ s("div", { style: { color: "var(--text, var(--muted))" }, children: [
                "⚖ ",
                p.question || p.kind
              ] }),
              /* @__PURE__ */ s("div", { className: "mt-1 flex gap-1.5", children: [
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--ok)", color: "var(--bg)" },
                    onClick: () => onResolveDecision(p.id, "approve"),
                    children: "Approve"
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    onClick: () => onResolveDecision(p.id, "decline"),
                    children: "Decline"
                  }
                )
              ] })
            ]
          },
          p.id
        )),
        onInterject && (_ ? /* @__PURE__ */ s("div", { className: "mt-2 flex flex-col gap-1", children: [
          /* @__PURE__ */ e(
            "textarea",
            {
              value: M,
              onChange: (p) => B(p.target.value),
              placeholder: "Interject: design/spec note, re-scope…",
              rows: 2,
              className: "w-full text-[11px] px-2 py-1 rounded outline-none resize-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ s("div", { className: "flex gap-1.5", children: [
            /* @__PURE__ */ e(
              "button",
              {
                className: "text-[11px] px-2 py-0.5 rounded font-semibold",
                style: { background: "var(--accent)", color: "var(--bg)" },
                onClick: () => {
                  M.trim() && (onInterject("note", M.trim()), B(""), u(!1));
                },
                children: "Send"
              }
            ),
            /* @__PURE__ */ e(
              "button",
              {
                className: "text-[11px] px-2 py-0.5 rounded",
                style: { color: "var(--muted)" },
                onClick: () => {
                  u(!1), B("");
                },
                children: "Cancel"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ e(
          "button",
          {
            className: "mt-2 text-[10px] hover:underline",
            style: { color: "var(--muted)" },
            onClick: () => u(!0),
            children: "+ interject"
          }
        ))
      ]
    }
  );
}
function Ae({ title: l, count: w, children: x, id: g }) {
  return /* @__PURE__ */ s("div", { id: g, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ s("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
      /* @__PURE__ */ e("span", { className: "text-[11px] font-semibold uppercase tracking-wide truncate", style: { color: "var(--muted-strong, var(--muted))" }, children: l }),
      /* @__PURE__ */ e(
        "span",
        {
          className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
          children: w
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "flex flex-col gap-2", children: w === 0 ? /* @__PURE__ */ e(
      "div",
      {
        className: "text-[11px] rounded-lg py-3 px-2 text-center",
        style: { color: "var(--muted)", border: "1px dashed var(--border)" },
        children: "empty"
      }
    ) : x })
  ] });
}
function Qe({ config: l, onSet: w }) {
  function x({ label: g, value: A, options: I, tokens: D, onPick: v }) {
    return /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: g }),
      /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: I.map(($) => {
        const k = A === $;
        return /* @__PURE__ */ e(
          "button",
          {
            onClick: () => v($),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: k ? D[$] : "var(--muted)",
              background: k ? `color-mix(in srgb, ${D[$]} 16%, transparent)` : "transparent",
              boxShadow: k ? `inset 0 0 0 1px color-mix(in srgb, ${D[$]} 45%, transparent)` : "none"
            },
            children: $
          },
          $
        );
      }) })
    ] });
  }
  return /* @__PURE__ */ s(
    "div",
    {
      className: "flex items-center gap-5 flex-wrap mb-4 px-3 py-2 rounded-lg",
      style: { background: "var(--card)", border: "1px solid var(--border)" },
      children: [
        /* @__PURE__ */ e("span", { className: "text-xs font-semibold", style: { color: "var(--muted-strong, var(--muted))" }, children: "Defaults" }),
        /* @__PURE__ */ e(x, { label: "Trust", value: l.trust, options: ue, tokens: Le, onPick: (g) => w({ trust: g }) }),
        /* @__PURE__ */ e(x, { label: "Depth", value: l.depth, options: ve, tokens: Me, onPick: (g) => w({ depth: g }) }),
        /* @__PURE__ */ e("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function Pe({ cards: l }) {
  const w = l.flatMap(
    (x) => (x.parked || []).map((g) => {
      var A;
      return { ...g, cardTitle: x.title, repo: (A = x.source) == null ? void 0 : A.repo };
    })
  ).sort((x, g) => (g.at || "").localeCompare(x.at || ""));
  return w.length === 0 ? /* @__PURE__ */ s("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ s("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ e("div", { className: "flex flex-col gap-2 max-w-2xl", children: w.map((x) => /* @__PURE__ */ s("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: x.note }),
    /* @__PURE__ */ s("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ s("span", { children: [
        "from ",
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: x.cardTitle })
      ] }),
      x.phase && /* @__PURE__ */ s("span", { children: [
        "· parked at ",
        x.phase
      ] }),
      x.repo && /* @__PURE__ */ s("span", { children: [
        "· ",
        x.repo
      ] }),
      x.issue_url && /* @__PURE__ */ e("a", { href: x.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, x.id)) });
}
function et({ repos: l, selected: w, onToggle: x, onClear: g, onAddWorkspace: A, onEdit: I }) {
  const D = l.reduce((k, m) => k + m.count, 0), v = w.size === 0, $ = ({ name: k, count: m, label: _, checked: u, onClick: M, isAll: B }) => {
    const [F, W] = C(!1);
    return /* @__PURE__ */ s(
      "div",
      {
        onMouseEnter: () => W(!0),
        onMouseLeave: () => W(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: u ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: u ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ s(
            "button",
            {
              onClick: M,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                B ? /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: u ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ e(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: u ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${u ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: u && /* @__PURE__ */ e("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ e("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: u ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: _
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
          !B && k && /* @__PURE__ */ e(
            "button",
            {
              onClick: (q) => {
                q.stopPropagation(), I(k);
              },
              title: `Edit pipeline "${_}"`,
              "aria-label": `Edit pipeline ${_}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: F ? 1 : 0,
                pointerEvents: F ? "auto" : "none",
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
  return /* @__PURE__ */ s(
    "div",
    {
      className: "flex-shrink-0 w-52 flex flex-col gap-1 pr-3 border-r self-stretch overflow-y-auto",
      style: { borderColor: "var(--border)" },
      children: [
        /* @__PURE__ */ s("div", { className: "flex items-center justify-between px-2.5 mb-1", children: [
          /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspaces" }),
          w.size > 0 && /* @__PURE__ */ e("button", { onClick: g, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ e($, { isAll: !0, count: D, label: "All repos", checked: v, onClick: g }),
        l.map((k) => /* @__PURE__ */ e(
          $,
          {
            name: k.name,
            count: k.count,
            label: (Ge.has(k.name) ? "Example: " : "") + (k.name.includes("/") ? k.name.split("/")[1] : k.name),
            checked: w.has(k.name),
            onClick: () => x(k.name)
          },
          k.name
        )),
        /* @__PURE__ */ s(
          "button",
          {
            onClick: A,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        w.size > 1 && /* @__PURE__ */ s("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          w.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const tt = [
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
function rt({ initial: l, knownAgents: w, crews: x, repo: g, stepName: A, onSave: I, onClose: D }) {
  var Q;
  const { openChat: v } = Ve(), [$, k] = C(l.name || ""), [m, _] = C(l.role || ""), [u, M] = C(l.tools || ["read"]), [B, F] = C(l.model || "auto"), [W, q] = C(l.crew || ""), [R, p] = C(l.addenda || []), [h, b] = C(l.trust || ""), [J, V] = C(l.depth || ""), z = (c) => M((d) => d.includes(c) ? d.filter((y) => y !== c) : [...d, c]), H = () => p((c) => {
    var d;
    return c.length >= 3 ? c : [...c, { crew: ((d = x[0]) == null ? void 0 : d.name) || "", when: "always", writes: "" }];
  }), E = (c, d) => p((y) => y.map((N, ae) => ae === c ? { ...N, ...d } : N)), ee = (c) => p((d) => d.filter((y, N) => N !== c)), f = $.trim().length > 0;
  return /* @__PURE__ */ s("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ s("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ e("button", { onClick: D, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ s("div", { className: "ml-1", children: [
        /* @__PURE__ */ e("div", { className: "text-sm font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Configure Agent" }),
        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "This step's agent (KiroCrew agent config)" })
      ] }),
      /* @__PURE__ */ e(
        "button",
        {
          onClick: () => v({
            message: `/dlc-yolo

Help me design a NEW agent for a custom pipeline step.
Pipeline repo: ${g || "(unset)"}
Step: ${A || "(unnamed)"}

Ask me what the step should do, then propose an agent config (name, role/prompt, tools, model). When I'm happy, write it into this pipeline's step in the DLC-YOLO state file (~/.dlc-yolo/state.json, or /tmp/dlc-yolo/state.json if that's what exists) — the step's agent {name, role, tools} and any trust/depth — keeping GitHub as the source of truth.`
          }),
          className: "ml-auto text-[11px] px-2.5 py-1 rounded-md font-semibold flex items-center gap-1",
          style: { background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" },
          title: "Author this agent in a /dlc-yolo chat session",
          children: "✨ Draft with /dlc-yolo"
        }
      )
    ] }),
    /* @__PURE__ */ s("div", { className: "px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto", children: [
      w.length > 0 && /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Reuse an existing agent" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: w.map((c) => /* @__PURE__ */ e(
          "button",
          {
            onClick: () => k(c),
            className: "text-[11px] px-2 py-1 rounded-md font-medium",
            style: {
              background: $ === c ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: $ === c ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: $ === c ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: c
          },
          c
        )) })
      ] }),
      /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: $,
            onChange: (c) => k(c.target.value),
            placeholder: "e.g. impl-agent",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Role / prompt" }),
        /* @__PURE__ */ e(
          "textarea",
          {
            value: m,
            onChange: (c) => _(c.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: tt.map((c) => {
          const d = u.includes(c);
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => z(c),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: d ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: d ? "var(--accent)" : "var(--muted)",
                boxShadow: d ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: c
            },
            c
          );
        }) })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: B,
            onChange: (c) => F(c.target.value),
            placeholder: "auto",
            className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Crew" }),
          /* @__PURE__ */ s(
            "select",
            {
              value: W,
              onChange: (c) => q(c.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "— none (use step agent) —" }),
                x.map((c) => /* @__PURE__ */ e("option", { value: c.name, children: c.name }, c.name))
              ]
            }
          )
        ] }),
        W && /* @__PURE__ */ e("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: ((Q = x.find((c) => c.name === W)) == null ? void 0 : Q.description) || "Runs this step via select_crew → spawn_run(agent=" + W + ")" })
      ] }),
      /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ s("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: H,
              disabled: R.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        R.length === 0 && /* @__PURE__ */ e("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        R.map((c, d) => /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ e(
            "select",
            {
              value: c.crew,
              onChange: (y) => E(d, { crew: y.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: x.map((y) => /* @__PURE__ */ e("option", { value: y.name, children: y.name }, y.name))
            }
          ),
          /* @__PURE__ */ s(
            "select",
            {
              value: c.when || "always",
              onChange: (y) => E(d, { when: y.target.value }),
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
              value: c.writes || "",
              onChange: (y) => E(d, { writes: y.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ e("button", { onClick: () => ee(d), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ e("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ e("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, d))
      ] }),
      /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...ue].map((c) => {
          const d = h === c;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => b(c),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: d ? c ? Le[c] : "var(--text)" : "var(--muted)", background: d ? "var(--bg-hover, var(--border))" : "transparent" },
              children: c || "inherit"
            },
            c || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...ve].map((c) => {
          const d = J === c;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => V(c),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: d ? c ? Me[c] : "var(--text)" : "var(--muted)", background: d ? "var(--bg-hover, var(--border))" : "transparent" },
              children: c || "inherit"
            },
            c || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ s("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ e("button", { onClick: D, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ e(
        "button",
        {
          disabled: !f,
          onClick: () => I({
            name: $.trim(),
            role: m.trim() || void 0,
            tools: u,
            model: B.trim() && B.trim() !== "auto" ? B.trim() : void 0,
            crew: W || void 0,
            addenda: R.length ? R.filter((c) => c.crew) : void 0,
            trust: h || void 0,
            depth: J || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save Agent"
        }
      )
    ] })
  ] });
}
function ze({ candidates: l, existingRepos: w, defaults: x, knownAgents: g, crews: A, onCreate: I, onClose: D, editPipeline: v, cardCount: $, isExample: k, onDelete: m }) {
  var me, Ne, be, fe, Se, Ce, _e, Re, ye, Te, pe, r, n, o;
  const _ = !!v, [u, M] = C((v == null ? void 0 : v.repo) || ""), [B, F] = C((v == null ? void 0 : v.source) || "manual"), [W, q] = C((v == null ? void 0 : v.trust) || x.trust), [R, p] = C((v == null ? void 0 : v.depth) || x.depth), [h, b] = C((v == null ? void 0 : v.backlog_intake) ?? !0), [J, V] = C((v == null ? void 0 : v.results_in_repo) ?? !1), [z, H] = C((v == null ? void 0 : v.self_enabling) ?? !1), [E, ee] = C((v == null ? void 0 : v.approach) || "simplified"), [f, Q] = C(() => {
    var t;
    return (t = v == null ? void 0 : v.steps) != null && t.length ? v.steps.map((a) => ({ ...a })) : ke.map((a) => ({ ...a }));
  }), [c, d] = C(null), [y, N] = C(""), [ae, te] = C("settings"), ne = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", oe = (t, a) => Q((i) => i.map((T, S) => S === t ? { ...T, ...a } : T)), L = (t) => Q((a) => a.filter((i, T) => T !== t)), re = (t, a) => Q((i) => {
    const T = t + a;
    if (T < 0 || T >= i.length) return i;
    const S = [...i];
    return [S[t], S[T]] = [S[T], S[t]], S;
  }), ce = (t) => Q((a) => [...a, {
    id: `${t}-${Math.random().toString(36).slice(2, 6)}`,
    name: t === "gate" ? "New Gate" : "New Step",
    type: t,
    agent: t === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), xe = (t) => {
    M(t.repo), F(t.source);
  }, j = (t) => {
    let a = (t || "").trim();
    if (!a) return "";
    const i = a.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return i && (a = i[1]), a.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, U = (t) => {
    const a = /github\.com|gitlab\.com/i.test(t);
    M(a ? j(t) : t), F("manual");
  }, O = /^[^/\s]+\/[^/\s]+$/.test(j(u)) || l.some((t) => t.repo === u), K = !_ && w.has(j(u)), ie = ({ value: t, options: a, tokens: i, onPick: T }) => /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: a.map((S) => {
    const X = t === S;
    return /* @__PURE__ */ e(
      "button",
      {
        onClick: () => T(S),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: X ? i[S] : "var(--muted)",
          background: X ? `color-mix(in srgb, ${i[S]} 16%, transparent)` : "transparent",
          boxShadow: X ? `inset 0 0 0 1px color-mix(in srgb, ${i[S]} 45%, transparent)` : "none"
        },
        children: S
      },
      S
    );
  }) }), Y = { "issue-radar": [], workspace: [], manual: [] };
  l.forEach((t) => {
    var a;
    (Y[a = t.source] || (Y[a] = [])).push(t);
  });
  const Be = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: D,
      children: /* @__PURE__ */ e(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (t) => t.stopPropagation(),
          children: c !== null ? /* @__PURE__ */ e(
            rt,
            {
              initial: {
                name: ((Ne = (me = f[c]) == null ? void 0 : me.agent) == null ? void 0 : Ne.name) || "",
                role: (fe = (be = f[c]) == null ? void 0 : be.agent) == null ? void 0 : fe.role,
                tools: (Ce = (Se = f[c]) == null ? void 0 : Se.agent) == null ? void 0 : Ce.tools,
                model: (Re = (_e = f[c]) == null ? void 0 : _e.agent) == null ? void 0 : Re.model,
                crew: (Te = (ye = f[c]) == null ? void 0 : ye.agent) == null ? void 0 : Te.crew,
                addenda: (pe = f[c]) == null ? void 0 : pe.addenda,
                trust: (r = f[c]) == null ? void 0 : r.trust,
                depth: (n = f[c]) == null ? void 0 : n.depth
              },
              knownAgents: g,
              crews: A,
              repo: u,
              stepName: ((o = f[c]) == null ? void 0 : o.name) || "",
              onClose: () => d(null),
              onSave: (t) => {
                oe(c, {
                  agent: { name: t.name, role: t.role, tools: t.tools, model: t.model, crew: t.crew },
                  addenda: t.addenda,
                  trust: t.trust,
                  depth: t.depth
                }), d(null);
              }
            }
          ) : /* @__PURE__ */ s(Ee, { children: [
            /* @__PURE__ */ s("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ e("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: _ ? "Edit Pipeline" : "New Pipeline" }),
                /* @__PURE__ */ e("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: _ ? u.includes("/") ? u.split("/")[1] : u : "Configure a pipeline for a repository or workspace" })
              ] }),
              /* @__PURE__ */ e("button", { onClick: D, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
            ] }),
            _ && /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: ["settings", "danger"].map((t) => {
              const a = ae === t, i = t === "danger";
              return /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => te(t),
                  className: "text-[12px] px-3 py-2 font-semibold transition-all",
                  style: {
                    color: a ? i ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                    borderBottom: `2px solid ${a ? i ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                    marginBottom: "-1px"
                  },
                  children: t === "settings" ? "Settings" : "Danger Zone"
                },
                t
              );
            }) }),
            /* @__PURE__ */ s(
              "div",
              {
                className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                style: { display: _ && ae === "danger" ? "none" : "flex" },
                children: [
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: u,
                        onChange: (t) => U(t.target.value),
                        onPaste: (t) => {
                          const a = t.clipboardData.getData("text");
                          /github\.com|gitlab\.com/i.test(a) && (t.preventDefault(), U(a));
                        },
                        placeholder: "https://github.com/owner/name  ·  or  owner/name",
                        disabled: _,
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                        style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${K ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                      }
                    ),
                    !_ && u && j(u) !== u && /* @__PURE__ */ s("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                      "→ ",
                      /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: j(u) })
                    ] }),
                    K && /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                    /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((t) => Y[t].length > 0 && /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Be[t] }),
                      /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1.5", children: Y[t].map((a) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => xe(a),
                          disabled: w.has(a.repo),
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
                    ] }, t)) })
                  ] }),
                  /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                    /* @__PURE__ */ e(ie, { value: W, options: ue, tokens: Le, onPick: q })
                  ] }),
                  /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                    /* @__PURE__ */ e(ie, { value: R, options: ve, tokens: Me, onPick: p })
                  ] }),
                  /* @__PURE__ */ s("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Backlog auto-intake" }),
                      /* @__PURE__ */ s("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Back-feed open ",
                        /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
                        " issues as cards"
                      ] })
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => b((t) => !t),
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
                  /* @__PURE__ */ s("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                      /* @__PURE__ */ s("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Also commit results & the pipeline conversation to a ",
                        /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: ".dlc-yolo/" }),
                        " copy in the owned repo (always kept in app data)"
                      ] })
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => V((t) => !t),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: J ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: J ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ s("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                      /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => H((t) => !t),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: z ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: z ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  z && /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                      /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                    ] }),
                    /* @__PURE__ */ e("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((t) => /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => ee(t),
                        className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                        style: {
                          background: E === t ? "var(--accent)" : "transparent",
                          color: E === t ? "var(--bg)" : "var(--muted)",
                          border: `1px solid ${E === t ? "var(--accent)" : "var(--border)"}`
                        },
                        children: t
                      },
                      t
                    )) })
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ s("div", { className: "flex items-center justify-between mb-1.5", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                      /* @__PURE__ */ s("div", { className: "flex gap-1", children: [
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
                    /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: f.map((t, a) => {
                      var i, T;
                      return /* @__PURE__ */ s(
                        "div",
                        {
                          className: "rounded-md p-2",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${t.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                          children: [
                            /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
                              /* @__PURE__ */ s("div", { className: "flex flex-col", children: [
                                /* @__PURE__ */ e("button", { onClick: () => re(a, -1), disabled: a === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                /* @__PURE__ */ e("button", { onClick: () => re(a, 1), disabled: a === f.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                              ] }),
                              /* @__PURE__ */ e(
                                "input",
                                {
                                  value: t.name,
                                  onChange: (S) => oe(a, { name: S.target.value, id: ne(S.target.value) }),
                                  className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                }
                              ),
                              /* @__PURE__ */ e(
                                "span",
                                {
                                  className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                  style: { color: t.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${t.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                  children: t.type
                                }
                              ),
                              /* @__PURE__ */ e("button", { onClick: () => L(a), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                            ] }),
                            t.type === "agent" && /* @__PURE__ */ s("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                              /* @__PURE__ */ s(
                                "button",
                                {
                                  onClick: () => d(a),
                                  className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                  children: [
                                    "⚙ ",
                                    (i = t.agent) != null && i.name ? `Agent: ${t.agent.name}` : "Configure agent"
                                  ]
                                }
                              ),
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                              /* @__PURE__ */ s(
                                "select",
                                {
                                  value: t.trigger || "ask",
                                  onChange: (S) => oe(a, { trigger: S.target.value === "ask" ? void 0 : S.target.value }),
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
                              (t.trust || t.depth) && /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [t.trust, t.depth].filter(Boolean).join(" · ") }),
                              t.addenda && t.addenda.length > 0 && /* @__PURE__ */ s("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                "+",
                                t.addenda.length,
                                " addendum",
                                t.addenda.length === 1 ? "" : "s"
                              ] }),
                              ((T = t.agent) == null ? void 0 : T.role) && /* @__PURE__ */ e("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: t.agent.role })
                            ] }),
                            t.type === "gate" && /* @__PURE__ */ s("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                              /* @__PURE__ */ s(
                                "select",
                                {
                                  value: t.trust || "",
                                  onChange: (S) => oe(a, { trust: S.target.value || void 0 }),
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
                        t.id
                      );
                    }) })
                  ] })
                ]
              }
            ),
            _ && ae === "danger" && m && (() => {
              const t = u.includes("/") ? u.split("/")[1] : u, a = y.trim() === t;
              return /* @__PURE__ */ e("div", { className: "px-5 pb-4 pt-4", children: k ? /* @__PURE__ */ s(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                  children: [
                    /* @__PURE__ */ s("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
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
                          m(u), D();
                        },
                        className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Remove Example"
                      }
                    )
                  ]
                }
              ) : /* @__PURE__ */ s(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))", background: "color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)" },
                  children: [
                    /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold uppercase tracking-wide", style: { color: "var(--danger, #ef4444)" }, children: "Danger Zone" }),
                    /* @__PURE__ */ s("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "Deleting removes this pipeline and its ",
                      $ ?? 0,
                      " card",
                      ($ ?? 0) === 1 ? "" : "s",
                      " from DLC-YOLO's local state. It does ",
                      /* @__PURE__ */ e("strong", { children: "not" }),
                      " touch GitHub issues or labels. This cannot be undone."
                    ] }),
                    /* @__PURE__ */ s("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                      "Type ",
                      /* @__PURE__ */ e("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: t }),
                      " to confirm:"
                    ] }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: y,
                        onChange: (i) => N(i.target.value),
                        placeholder: t,
                        className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        disabled: !a,
                        onClick: () => {
                          m(u), D();
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
            /* @__PURE__ */ s("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
              /* @__PURE__ */ e("button", { onClick: D, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Cancel" }),
              !(_ && ae === "danger") && /* @__PURE__ */ e(
                "button",
                {
                  disabled: !O || !_ && K,
                  onClick: () => I({
                    repo: j(u),
                    source: B,
                    trust: W,
                    depth: R,
                    backlog_intake: h,
                    results_in_repo: J,
                    self_enabling: z,
                    approach: E,
                    steps: f.map((t) => ({ ...t, label: `dlc:${t.id}` }))
                  }),
                  className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: _ ? "Save Pipeline" : "Create Pipeline"
                }
              )
            ] })
          ] })
        }
      )
    }
  );
}
function lt() {
  const l = qe(), [w, x] = C([]), [g, A] = C([]), [I, D] = C(we), [v, $] = C(!0), [k, m] = C("pipeline"), [_, u] = C(/* @__PURE__ */ new Set()), [M, B] = C(!1), [F, W] = C(null), [q, R] = C([]), [p, h] = C([]), [b, J] = C(!1), [V, z] = C([]), H = de(null), E = G(async () => {
    try {
      let r;
      try {
        r = await l.get("/api/file-read?path=" + encodeURIComponent(Z));
      } catch (n) {
        if (Z !== We)
          Z = We, r = await l.get("/api/file-read?path=" + encodeURIComponent(Z));
        else
          throw n;
      }
      x(r.cards || []), A(r.pipelines || []), D({ ...we, ...r.config || {} });
    } catch (r) {
      console.error("Failed to fetch cards:", r);
    } finally {
      $(!1);
    }
  }, [l]), ee = le(() => {
    const r = /* @__PURE__ */ new Map();
    return g.forEach((n) => {
      r.has(n.repo) || r.set(n.repo, 0);
    }), w.forEach((n) => {
      var t;
      const o = ((t = n.source) == null ? void 0 : t.repo) || "unlinked";
      r.set(o, (r.get(o) || 0) + 1);
    }), [...r.entries()].map(([n, o]) => ({ name: n, count: o })).sort((n, o) => o.count - n.count);
  }, [w, g]), f = le(
    () => _.size === 0 ? w : w.filter((r) => {
      var n;
      return _.has(((n = r.source) == null ? void 0 : n.repo) || "unlinked");
    }),
    [w, _]
  ), Q = 6e5, c = le(() => {
    var n, o, t, a;
    const r = [];
    for (const i of f) {
      const T = i.step_status || {}, S = g.find((X) => X.id === i.pipeline_id) || g.find((X) => {
        var P;
        return X.repo === ((P = i.source) == null ? void 0 : P.repo);
      });
      for (const [X, P] of Object.entries(T))
        if (P === "pending" || P === "error") {
          const se = (n = i.pending_at) == null ? void 0 : n[X], Fe = se ? Date.now() - new Date(se).getTime() > Q : !1, ge = (o = S == null ? void 0 : S.steps) == null ? void 0 : o.find(($e) => $e.id === X), Ue = ((t = ge == null ? void 0 : ge.agent) == null ? void 0 : t.crew) || ((a = ge == null ? void 0 : ge.agent) == null ? void 0 : a.name) || "orchestrator", He = V.some(($e) => ($e.task || "").includes(i.id) || ($e.task || "").includes(i.title));
          r.push({ card: i.title || i.id, step: X, agent: Ue, stale: Fe, status: P, live: He });
        }
    }
    return r;
  }, [f, g, V]), d = le(() => {
    var a;
    let r;
    if (_.size === 1) {
      const i = [..._][0];
      r = (a = g.find((T) => T.repo === i)) == null ? void 0 : a.steps;
    } else g.length === 1 && (r = g[0].steps);
    const n = (r && r.length ? r : ke).map((i) => ({ ...i })), o = new Set(n.map((i) => i.id)), t = [];
    return o.has("intake") || t.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), t.push(...n), o.has("done") || t.push({ id: "done", name: "Done", type: "agent" }), t;
  }, [_, g]), y = le(() => d.map((r) => r.id), [d]), N = G((r) => {
    var n;
    return ((n = d.find((o) => o.id === r)) == null ? void 0 : n.type) === "gate" || r.startsWith("gate-");
  }, [d]), ae = G((r) => {
    var n, o;
    return ((o = (n = d.find((t) => t.id === r)) == null ? void 0 : n.agent) == null ? void 0 : o.name) || Ye[r] || "unknown";
  }, [d]);
  Ie(() => {
    E();
    const r = async () => {
      try {
        const o = Z.slice(0, Z.lastIndexOf("/")), t = (o ? o + "/" : "") + "live_spawns.json", a = await l.get("/api/file-read?path=" + encodeURIComponent(t)), i = a != null && a.at ? Date.now() - new Date(a.at).getTime() < 18e4 : !0;
        z(i && Array.isArray(a == null ? void 0 : a.runs) ? a.runs : []);
      } catch {
      }
    };
    E().then(r);
    const n = setInterval(() => {
      E().then(r);
    }, 1e4);
    return () => clearInterval(n);
  }, [E, l]), Ie(() => {
    (async () => {
      try {
        const r = await l.get("/api/file-read?path=~/.kiro/crew/config.json"), n = (r == null ? void 0 : r.agents) || {}, o = Object.entries(n).map(([t, a]) => ({
          name: t,
          description: (a == null ? void 0 : a.description) || void 0
        }));
        h(o);
      } catch (r) {
        console.warn("crew roster (config.json) unreadable:", r);
      }
    })();
  }, [l]);
  const te = (r, n) => {
    const o = (r.pipelines || []).find((i) => i.id === n.pipeline_id) || (r.pipelines || []).find((i) => {
      var T;
      return i.repo === ((T = n.source) == null ? void 0 : T.repo);
    }), a = ["intake", ...(o != null && o.steps && o.steps.length ? o.steps : ke).map((i) => i.id).filter((i) => i !== "intake" && i !== "done"), "done"];
    return [...new Set(a)];
  }, ne = G(async (r) => {
    var n;
    try {
      const o = await l.get("/api/file-read?path=" + encodeURIComponent(Z)), t = (n = o.cards) == null ? void 0 : n.find((S) => S.id === r);
      if (!t) return;
      const a = te(o, t), i = a.indexOf(t.stage);
      if (i < 0 || i >= a.length - 1) return;
      const T = t.stage;
      t.stage = a[i + 1], t.updated_at = (/* @__PURE__ */ new Date()).toISOString(), t.gate_history = t.gate_history || [], t.gate_history.push({ gate: T, decision: "approved", at: t.updated_at, notes: "" }), t.history = t.history || [], t.history.push({ from: T, to: t.stage, at: t.updated_at, agent: "human" }), await l.post("/api/file-write", { path: Z, content: JSON.stringify(o, null, 2) }), E();
    } catch (o) {
      console.error("Failed to advance card:", o);
    }
  }, [l, E]), oe = G(async (r) => {
    var n, o;
    try {
      const t = await l.get("/api/file-read?path=" + encodeURIComponent(Z)), a = (n = t.cards) == null ? void 0 : n.find((se) => se.id === r);
      if (!a) return;
      const i = te(t, a), T = new Set((((o = (t.pipelines || []).find((se) => se.id === a.pipeline_id)) == null ? void 0 : o.steps) || ke).filter((se) => se.type === "gate").map((se) => se.id)), S = i.indexOf(a.stage);
      if (S <= 0) return;
      const X = a.stage;
      let P = S - 1;
      for (; P > 0 && (T.has(i[P]) || i[P].startsWith("gate-")); ) P--;
      a.stage = i[P], a.updated_at = (/* @__PURE__ */ new Date()).toISOString(), a.gate_history = a.gate_history || [], a.gate_history.push({ gate: X, decision: "rejected", at: a.updated_at, notes: "" }), a.history = a.history || [], a.history.push({ from: X, to: a.stage, at: a.updated_at, agent: "human" }), await l.post("/api/file-write", { path: Z, content: JSON.stringify(t, null, 2) }), E();
    } catch (t) {
      console.error("Failed to reject card:", t);
    }
  }, [l, E]), L = G(async (r) => {
    try {
      const n = await l.get("/api/file-read?path=" + encodeURIComponent(Z));
      n.cards = n.cards || [], r(n);
      try {
        const o = await l.get("/api/file-read?path=" + encodeURIComponent(Z));
        o.cards = o.cards || [], r(o), await l.post("/api/file-write", { path: Z, content: JSON.stringify(o, null, 2) });
      } catch {
        await l.post("/api/file-write", { path: Z, content: JSON.stringify(n, null, 2) });
      }
      E();
    } catch (n) {
      console.error("Failed to mutate state:", n);
    }
  }, [l, E]), re = G((r) => {
    D((n) => ({ ...n, ...r })), L((n) => {
      n.config = { ...we, ...n.config || {}, ...r };
    });
  }, [L]);
  G((r, n) => {
    L((o) => {
      const t = o.cards.find((a) => a.id === r);
      t && (t.step_status = { ...t.step_status || {}, [n]: "approved" }, t.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [L]), G((r, n) => {
    L((o) => {
      const t = o.cards.find((a) => a.id === r);
      t && (t.step_status = { ...t.step_status || {}, [n]: "rejected" }, t.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [L]);
  const ce = G((r, n, o, t) => {
    L((a) => {
      const i = a.cards.find((T) => T.id === r);
      i && (i.interjection = [...i.interjection || [], {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        step: n,
        kind: o,
        text: t,
        by: "user",
        status: "pending"
      }], i.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [L]), xe = G((r, n, o) => {
    L((t) => {
      const a = t.cards.find((T) => T.id === r);
      if (!a) return;
      const i = (a.decisions || []).find((T) => T.id === n);
      i && (i.chosen = o, i.resolved_at = (/* @__PURE__ */ new Date()).toISOString()), a.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [L]), j = G((r) => {
    L((n) => {
      var a;
      const o = n.cards.find((i) => i.id === r);
      if (!o) return;
      const t = o.trust || ((a = n.config) == null ? void 0 : a.trust) || we.trust;
      o.trust = ue[(ue.indexOf(t) + 1) % ue.length], o.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [L]), U = G((r) => {
    L((n) => {
      var a;
      const o = n.cards.find((i) => i.id === r);
      if (!o) return;
      const t = o.depth || ((a = n.config) == null ? void 0 : a.depth) || we.depth;
      o.depth = ve[(ve.indexOf(t) + 1) % ve.length], o.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [L]), O = G((r) => {
    u((n) => {
      const o = new Set(n);
      return o.has(r) ? o.delete(r) : o.add(r), o;
    });
  }, []), K = G(() => u(/* @__PURE__ */ new Set()), []), ie = G(async () => {
    const r = [];
    try {
      const n = await l.get("/api/file-read?path=~/.kiro/crew/config.json"), o = (n == null ? void 0 : n.workspaces) || {};
      Object.entries(o).forEach(([t, a]) => r.push({ repo: t, source: "workspace", detail: (a == null ? void 0 : a.dir) || t }));
    } catch (n) {
      console.warn("workspaces registry unreadable:", n);
    }
    try {
      const n = await l.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((n == null ? void 0 : n.repos) || []).forEach((o) => {
        o != null && o.owner && (o != null && o.repo) && r.push({ repo: `${o.owner}/${o.repo}`, source: "issue-radar", detail: `${o.provider || "github"} · ${o.host || "github.com"}` });
      });
    } catch (n) {
      console.warn("issue-radar config unreadable (app may not be installed):", n);
    }
    R(r), B(!0);
  }, [l]), Y = G(async (r) => {
    const n = (/* @__PURE__ */ new Date()).toISOString(), o = "pl-" + Math.random().toString(36).slice(2, 10);
    await L((t) => {
      t.pipelines = t.pipelines || [];
      const a = t.pipelines.find((i) => i.repo === r.repo);
      a ? (a.source = r.source, a.trust = r.trust, a.depth = r.depth, a.backlog_intake = r.backlog_intake, a.results_in_repo = r.results_in_repo, a.self_enabling = r.self_enabling, a.approach = r.approach, a.steps = r.steps) : t.pipelines.push({
        id: o,
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
    }), B(!1), W(null), u(/* @__PURE__ */ new Set([r.repo]));
  }, [L]), Be = G(async (r) => {
    await L((n) => {
      n.pipelines = (n.pipelines || []).filter((o) => o.repo !== r), n.cards = (n.cards || []).filter((o) => {
        var t;
        return (((t = o.source) == null ? void 0 : t.repo) || "unlinked") !== r;
      });
    }), u((n) => {
      const o = new Set(n);
      return o.delete(r), o;
    });
  }, [L]), me = le(() => y.reduce((r, n) => (r[n] = f.filter((o) => o.stage === n), r), {}), [f, y]), Ne = G((r) => {
    var n;
    (n = document.getElementById(`stage-col-${r}`)) == null || n.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), be = le(() => {
    const r = {};
    return f.forEach((n) => {
      var t;
      const o = ((t = n.source) == null ? void 0 : t.repo) || "unlinked";
      (r[o] || (r[o] = [])).push(n);
    }), r;
  }, [f]), fe = le(() => {
    const r = {};
    return f.forEach((n) => {
      const o = ae(n.stage);
      (r[o] || (r[o] = [])).push(n);
    }), r;
  }, [f, ae]), Se = le(() => {
    const r = [], n = [], o = [];
    return f.forEach((t) => {
      t.stage === "done" ? o.push(t) : N(t.stage) ? r.push(t) : n.push(t);
    }), { "Blocked at Gate": r, "In-Flight (Auto)": n, Done: o };
  }, [f, N]), Ce = f.filter((r) => r.stage !== "done").length, _e = f.filter((r) => N(r.stage)).length, Re = f.filter((r) => r.stage === "done").length, ye = f.reduce((r, n) => {
    var o;
    return r + (((o = n.parked) == null ? void 0 : o.length) || 0);
  }, 0), Te = {
    pipeline: f.length,
    workspace: Object.keys(be).length,
    crew: Object.keys(fe).length,
    status: f.length,
    backlog: ye
  }, pe = (r) => ({
    card: r,
    config: I,
    onApprove: N(r.stage) ? () => ne(r.id) : void 0,
    onReject: N(r.stage) ? () => oe(r.id) : void 0,
    onCycleTrust: () => j(r.id),
    onCycleDepth: () => U(r.id),
    onInterject: (n, o) => ce(r.id, r.stage, n, o),
    onResolveDecision: (n, o) => xe(r.id, n, o)
  });
  return /* @__PURE__ */ s(Ee, { children: [
    /* @__PURE__ */ e(Je, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    M && /* @__PURE__ */ e(
      ze,
      {
        candidates: q,
        existingRepos: new Set(g.map((r) => r.repo)),
        defaults: I,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: p,
        onCreate: Y,
        onClose: () => B(!1)
      }
    ),
    F && /* @__PURE__ */ e(
      ze,
      {
        candidates: q,
        existingRepos: new Set(g.map((r) => r.repo)),
        defaults: I,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: p,
        editPipeline: g.find((r) => r.repo === F) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + F, repo: F, source: "manual", trust: I.trust, depth: I.depth, backlog_intake: !0, sot: "github", steps: ke.map((r) => ({ ...r })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: w.filter((r) => {
          var n;
          return (((n = r.source) == null ? void 0 : n.repo) || "unlinked") === F;
        }).length,
        isExample: Ge.has(F),
        onCreate: Y,
        onDelete: Be,
        onClose: () => W(null)
      }
    ),
    /* @__PURE__ */ s("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ e(Xe, { steps: d, cardsByStage: me, onNodeClick: Ne }),
      /* @__PURE__ */ s("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5", children: [
        /* @__PURE__ */ e(je, { label: "Active", value: String(Ce), accent: !0 }),
        /* @__PURE__ */ e(je, { label: "Gated", value: String(_e) }),
        /* @__PURE__ */ e(je, { label: "Done", value: String(Re) }),
        /* @__PURE__ */ e(je, { label: "Parked", value: String(ye) })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ e(
          et,
          {
            repos: ee,
            selected: _,
            onToggle: O,
            onClear: K,
            onAddWorkspace: ie,
            onEdit: W
          }
        ),
        /* @__PURE__ */ s("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ s("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ e(Ze, { active: k, onChange: m, counts: Te }),
            /* @__PURE__ */ s("div", { className: "relative", children: [
              /* @__PURE__ */ s(
                "button",
                {
                  onClick: () => J((r) => !r),
                  className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Click to see which agents are running",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: c.length ? "var(--accent)" : "var(--muted)" },
                  children: [
                    c.length > 0 ? /* @__PURE__ */ s(Ee, { children: [
                      /* @__PURE__ */ e("span", { className: "inline-block animate-pulse", style: { width: 7, height: 7, borderRadius: 999, background: "var(--accent)" } }),
                      /* @__PURE__ */ s("span", { className: "font-semibold", children: [
                        c.length,
                        " running"
                      ] }),
                      c.some((r) => r.stale) && /* @__PURE__ */ s("span", { style: { color: "var(--warn)" }, children: [
                        "· ",
                        c.filter((r) => r.stale).length,
                        " stale ↻"
                      ] })
                    ] }) : /* @__PURE__ */ s(Ee, { children: [
                      /* @__PURE__ */ e("span", { style: { width: 7, height: 7, borderRadius: 999, background: "var(--muted)", display: "inline-block", opacity: 0.5 } }),
                      " ",
                      /* @__PURE__ */ e("span", { children: "idle" })
                    ] }),
                    /* @__PURE__ */ e("span", { style: { opacity: 0.5, fontSize: 9 }, children: b ? "▲" : "▼" })
                  ]
                }
              ),
              b && /* @__PURE__ */ s(
                "div",
                {
                  className: "absolute z-20 mt-1 left-0 rounded-md p-2 flex flex-col gap-1 min-w-[260px]",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 6px 20px rgba(0,0,0,0.25)" },
                  children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-0.5", style: { color: "var(--muted)" }, children: "Subagents in flight" }),
                    c.length === 0 ? /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No agents running — pipeline idle." }) : c.map((r) => /* @__PURE__ */ s(
                      "div",
                      {
                        className: "flex items-center gap-2 text-[11px] px-1.5 py-1 rounded",
                        style: { background: "var(--bg, transparent)" },
                        children: [
                          /* @__PURE__ */ e("span", { className: "inline-block animate-pulse flex-shrink-0", style: { width: 6, height: 6, borderRadius: 999, background: r.stale ? "var(--warn)" : "var(--accent)" } }),
                          /* @__PURE__ */ e("span", { className: "font-semibold", style: { color: "var(--accent)" }, children: r.agent }),
                          /* @__PURE__ */ s("span", { style: { color: "var(--muted)" }, children: [
                            "· ",
                            r.step
                          ] }),
                          /* @__PURE__ */ e("span", { className: "ml-auto truncate max-w-[110px]", style: { color: "var(--text, var(--muted))" }, title: r.card, children: r.card }),
                          r.live ? /* @__PURE__ */ e("span", { style: { color: "var(--ok)" }, title: "live spawn confirmed via spawn_list", children: "●live" }) : /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, title: "no live spawn found — likely dead, will reclaim", children: "no-spawn" }),
                          r.stale && /* @__PURE__ */ e("span", { style: { color: "var(--warn)" }, title: "stale — will be re-escalated", children: "↻" }),
                          r.status === "error" && /* @__PURE__ */ e("span", { style: { color: "var(--danger, #ef4444)" }, title: "errored — retrying", children: "⚠" })
                        ]
                      },
                      `${r.card}:${r.step}`
                    ))
                  ]
                }
              )
            ] }),
            _.size > 0 && /* @__PURE__ */ s(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  _.size === 1 ? [..._][0] : `${_.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ e("button", { onClick: K, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ e(Qe, { config: I, onSet: re }),
          v ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : k === "backlog" ? /* @__PURE__ */ e(Pe, { cards: f }) : /* @__PURE__ */ s("div", { ref: H, className: "flex gap-3 overflow-x-auto pb-4", children: [
            k === "pipeline" && d.map((r) => /* @__PURE__ */ e(Ae, { id: `stage-col-${r.id}`, title: r.name, count: (me[r.id] || []).length, children: (me[r.id] || []).map((n) => /* @__PURE__ */ e(Oe, { ...pe(n) }, n.id)) }, r.id)),
            k === "workspace" && Object.entries(be).map(([r, n]) => /* @__PURE__ */ e(Ae, { title: r, count: n.length, children: n.map((o) => /* @__PURE__ */ e(Oe, { ...pe(o) }, o.id)) }, r)),
            k === "crew" && Object.entries(fe).map(([r, n]) => /* @__PURE__ */ e(Ae, { title: r, count: n.length, children: n.map((o) => /* @__PURE__ */ e(Oe, { ...pe(o) }, o.id)) }, r)),
            k === "status" && Object.entries(Se).map(([r, n]) => /* @__PURE__ */ e(Ae, { title: r, count: n.length, children: n.map((o) => /* @__PURE__ */ e(Oe, { ...pe(o) }, o.id)) }, r))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  lt as default
};
