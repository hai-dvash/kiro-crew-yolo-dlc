import { jsxs as n, Fragment as rt, jsx as r } from "react/jsx-runtime";
import { useAppApi as dt, useChatLauncher as pt } from "@kirocrew/app-sdk";
import { PageHeader as ut, StatCard as Fe } from "@kirocrew/app-sdk/ui";
import { useState as w, useRef as le, useCallback as H, useMemo as pe, useEffect as ke } from "react";
const mt = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), gt = /^[.,!?;:%)\]}]$/u, ht = /^[(\[{]$/u;
function vt(s, g = 3) {
  const v = (String(s || "").match(mt) || []).slice(-Math.max(0, g));
  return v.reduce((O, A, j) => {
    if (j === 0) return A;
    const u = v[j - 1];
    return gt.test(A) || ht.test(u) ? O + A : O + " " + A;
  }, "");
}
function Ye(s, g = !1) {
  return s != null && s.active && !g ? s : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function xt(s, g, h) {
  if (!g || s != null && s.active && Number.isFinite(h) && Number.isFinite(s.seq) && h <= s.seq)
    return s;
  const O = ((s != null && s.active ? s.buffer : "") + g).slice(-512);
  return { buffer: O, tail: vt(O, 3), active: !0, phase: "generating", seq: Number(h) || 0 };
}
function bt(s) {
  return s && { ...s, active: !1, phase: "idle" };
}
const ft = "~/.dlc-yolo/state.json", Ze = "/tmp/dlc-yolo/state.json";
let se = ft;
const Qe = (s) => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
})[s], Ee = [
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
], at = /* @__PURE__ */ new Set([
  "hai-dvash/webapp",
  "hai-dvash/dashboard",
  "hai-dvash/api-core"
]), yt = {
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
}, we = ["manual", "assisted", "autonomous"], Te = ["quick", "standard", "deep"], Ae = { trust: "assisted", depth: "standard" }, He = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, Ve = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function ye({ color: s, children: g, title: h, onClick: v, active: O }) {
  return /* @__PURE__ */ r(
    "button",
    {
      type: "button",
      title: h,
      onClick: v,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: s,
        background: `color-mix(in srgb, ${s} 14%, transparent)`,
        boxShadow: O ? `inset 0 0 0 1px color-mix(in srgb, ${s} 55%, transparent)` : "none",
        opacity: v && !O ? 0.85 : 1,
        cursor: v ? "pointer" : "default"
      },
      children: g
    }
  );
}
const Ke = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function kt({ steps: s, cardsByStage: g, onNodeClick: h }) {
  const v = le(null), O = le(null), A = le(0), j = le(null), u = le(s), L = le(g), T = le([]);
  u.current = s, L.current = g;
  const f = 3, S = 116, x = S / f, V = x - 26, [X, G] = w(880);
  ke(() => {
    const $ = O.current;
    if (!$) return;
    const D = new ResizeObserver((y) => {
      const b = Math.max(360, Math.floor(y[0].contentRect.width));
      G(b);
    });
    return D.observe($), () => D.disconnect();
  }, []);
  const z = ($) => $.type === "gate" || $.id.startsWith("gate-");
  return ke(() => {
    const $ = v.current;
    if (!$) return;
    const D = Math.floor(X / f);
    $.width = D * f, $.height = x * f;
    const y = $.getContext("2d");
    if (!y) return;
    const b = (W, J, P, F, Q) => {
      y.fillStyle = Q, y.fillRect(W * f, J * f, P * f, F * f);
    }, k = () => {
      const W = A.current, J = u.current, P = L.current, F = Math.max(1, J.length);
      Math.max(1, ...J.map((c) => {
        var N;
        return ((N = P[c.id]) == null ? void 0 : N.length) || 0;
      })), b(0, 0, D, V, "#0f172a");
      for (let c = 0; c < D / 5; c++) {
        const N = c * 37 % D, p = c * 13 % (V - 4);
        Math.sin(W * 0.03 + c * 2.1) > 0.35 && b(N, p, 1, 1, "#e2e8f0");
      }
      b(D - 26, 8, 10, 10, "#fde68a"), b(D - 24, 7, 8, 8, "#0f172a");
      for (let c = 0; c < D; c += 16)
        for (let N = V; N < x; N += 16)
          b(c, N, 16, 16, c / 16 + N / 16 & 1 ? "#33261a" : "#2a1f14");
      b(0, V - 2, D, 2, "#4a3520");
      const Q = D / F, ee = [];
      for (let c = 0; c < J.length; c++) {
        const N = J[c], p = Math.round(Q * (c + 0.5)), _ = (P[N.id] || []).length, K = _ > 0, de = Ke[c % Ke.length], ie = z(N), re = V - 2;
        if (ee.push({ x: p - Math.floor(Q / 2), w: Math.floor(Q), id: N.id }), c < J.length - 1) {
          const I = Math.round(Q * (c + 1.5));
          for (let R = p + 8; R < I - 8; R += 4) b(R, V - 1, 2, 1, "#4a3520");
        }
        if (ie) {
          const I = re - 20, R = K ? "#f39c12" : "#3a3222";
          b(p - 3, I, 6, 20, K ? "#5c4a2a" : "#2a2418");
          for (let E = 0; E < 5; E++) b(p - E, I - 5 + E, E * 2 + 1, 1, R);
          for (let E = 0; E < 5; E++) b(p - (4 - E), I - E, (4 - E) * 2 + 1, 1, R);
          if (K) {
            const E = (Math.sin(W * 0.08) + 1) / 2;
            y.globalAlpha = 0.35 + E * 0.4, b(p - 1, I - 6, 2, 2, "#ffd27a"), y.globalAlpha = 1;
          }
        } else {
          const I = re - 14;
          if (b(p - 10, I, 20, 3, "#7a5c47"), b(p - 10, I - 1, 20, 1, de), b(p - 9, I + 3, 2, 8, "#5c4033"), b(p + 7, I + 3, 2, 8, "#5c4033"), b(p - 5, I - 9, 10, 9, "#333"), b(p - 4, I - 8, 8, 7, K ? "#0a2a0a" : "#1a1a1a"), K)
            for (let R = 0; R < 3; R++) {
              const E = 2 + (W + R * 7) % 5;
              b(p - 3, I - 7 + R * 2, E, 0.8, "#33ff33");
            }
        }
        const ue = Math.min(_, 5);
        for (let I = 0; I < ue; I++) {
          const R = ue > 1 ? (I - (ue - 1) / 2) * 8 : 0, E = Math.round(p + R) - 3, oe = re - (ie ? 2 : 4), he = Ke[(c + I) % Ke.length], ae = Math.sin(W * 0.08 + c + I) > 0 ? 1 : 0;
          y.fillStyle = "rgba(0,0,0,0.18)", y.fillRect(E * f, (oe + 8) * f, 6 * f, f), b(E, oe + ae, 6, 6, he), b(E + 1, oe - 4 + ae, 4, 4, "#fdd"), b(E + 1, oe - 5 + ae, 4, 1, "#333"), (W + c * 9 + I * 5) % 120 >= 3 && (b(E + 2, oe - 3 + ae, 1, 1, "#333"), b(E + 4, oe - 3 + ae, 1, 1, "#333")), b(E + 1, oe + 6, 1, 2, he), b(E + 4, oe + 6, 1, 2, he);
        }
        _ > 5 && (y.fillStyle = de, y.font = `${3 * f}px monospace`, y.fillText(`+${_ - 5}`, (p + 10) * f, (re - 6) * f)), _ > 0 && (y.fillStyle = de, y.fillRect((p + 6) * f, (re - 30) * f, 9 * f, 9 * f), y.fillStyle = "#0f172a", y.font = `bold ${5 * f}px monospace`, y.textAlign = "center", y.fillText(String(_), (p + 10.5) * f, (re - 24) * f), y.textAlign = "left"), y.fillStyle = K ? "#e2e8f0" : "#6b7280", y.font = `${3.4 * f}px monospace`, y.textAlign = "center";
        const Re = N.name.length > 12 ? N.name.slice(0, 11) + "…" : N.name;
        y.fillText(Re, p * f, (x - 4) * f), y.textAlign = "left";
      }
      T.current = ee;
      const d = J.reduce((c, N) => {
        var p;
        return c + (((p = P[N.id]) == null ? void 0 : p.length) || 0);
      }, 0);
      y.fillStyle = "#f90", y.font = `bold ${3.6 * f}px monospace`, y.fillText(`${d} card${d !== 1 ? "s" : ""} · ${F} milestone${F !== 1 ? "s" : ""}`, 4 * f, 8 * f);
    }, B = () => {
      A.current++, k(), j.current = requestAnimationFrame(B);
    };
    return j.current = requestAnimationFrame(B), () => {
      j.current && cancelAnimationFrame(j.current);
    };
  }, [X, x, V]), /* @__PURE__ */ r("div", { ref: O, className: "w-full mb-5", children: /* @__PURE__ */ r(
    "canvas",
    {
      ref: v,
      onClick: ($) => {
        const D = v.current;
        if (!D) return;
        const y = D.getBoundingClientRect(), b = ($.clientX - y.left) / y.width * (D.width / f), k = T.current.find((B) => b >= B.x && b <= B.x + B.w);
        k && h(k.id);
      },
      style: {
        width: "100%",
        height: S + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function wt({ active: s, onChange: g, counts: h }) {
  return /* @__PURE__ */ r(
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
      ].map((O) => {
        const A = s === O.id, j = h[O.id];
        return /* @__PURE__ */ n(
          "button",
          {
            onClick: () => g(O.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: A ? "var(--accent)" : "transparent",
              color: A ? "var(--bg)" : "var(--muted)"
            },
            children: [
              O.label,
              j > 0 && /* @__PURE__ */ r(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: A ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: A ? "var(--bg)" : "var(--muted)" },
                  children: j
                }
              )
            ]
          },
          O.id
        );
      })
    }
  );
}
function Ue({ card: s, config: g, onApprove: h, onReject: v, onCycleTrust: O, onCycleDepth: A, onInterject: j, onResolveDecision: u }) {
  var D, y, b;
  const L = s.stage.startsWith("gate-"), T = L ? "var(--warn)" : "var(--border-strong, var(--border))", f = s.trust || g.trust, S = s.depth || g.depth, x = ((D = s.parked) == null ? void 0 : D.length) || 0, V = Object.values(s.step_sessions || {}).some(
    (k) => !!k.last_response_at && !k.chat_disabled_at && !k.superseded && (!k.last_response_handled_at || k.last_response_handled_at < k.last_response_at)
  ), [X, G] = w(!1), [z, Y] = w(""), $ = (s.decisions || []).filter((k) => !k.chosen && (k.action === "add-addendum" || k.options));
  return /* @__PURE__ */ n(
    "div",
    {
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${T}`
      },
      children: [
        /* @__PURE__ */ r("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: s.title }),
        ((y = s.source) == null ? void 0 : y.repo) && /* @__PURE__ */ n(
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
        /* @__PURE__ */ n("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ r(
            ye,
            {
              color: He[f],
              active: !!s.trust,
              onClick: O,
              title: `trust: ${f}${s.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: f
            }
          ),
          /* @__PURE__ */ r(
            ye,
            {
              color: Ve[S],
              active: !!s.depth,
              onClick: A,
              title: `depth: ${S}${s.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: S
            }
          ),
          x > 0 && /* @__PURE__ */ n(ye, { color: "var(--warn)", title: `${x} parked idea(s)`, children: [
            "⏸ ",
            x
          ] }),
          V && /* @__PURE__ */ r(ye, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
          typeof ((b = s.effort) == null ? void 0 : b.total) == "number" && s.effort.total > 0 && /* @__PURE__ */ n(ye, { color: "var(--info)", title: `estimated effort: ${s.effort.total} points`, children: [
            "⚡ ",
            s.effort.total
          ] }),
          s.backstep_history && s.backstep_history.length > 0 && /* @__PURE__ */ n(
            ye,
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
            const k = s.decisions[s.decisions.length - 1];
            return /* @__PURE__ */ n(
              ye,
              {
                color: "var(--accent)",
                title: `${s.decisions.length} decision${s.decisions.length === 1 ? "" : "s"} — last: ${k.question || k.kind || ""}${k.action ? ` → ${k.action}` : ""}${k.rationale ? `
${k.rationale}` : ""}`,
                children: [
                  "⚖ ",
                  s.decisions.length
                ]
              }
            );
          })()
        ] }),
        L && h && v && /* @__PURE__ */ n("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          /* @__PURE__ */ r(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--ok)", color: "var(--bg)" },
              onClick: h,
              children: "Approve"
            }
          ),
          /* @__PURE__ */ r(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--danger)", color: "var(--bg)" },
              onClick: v,
              children: "Reject"
            }
          ),
          (s.stage === "gate-review" || /review/i.test(s.stage || "")) && (() => {
            var P, F, Q;
            const k = (P = s.source) == null ? void 0 : P.repo;
            if (!k) return null;
            const B = (F = s.artifacts) == null ? void 0 : F.pr_url, W = B && ((Q = /\/pull\/(\d+)/.exec(B)) == null ? void 0 : Q[1]), J = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + k)}` + (W ? `&pr=${W}` : "");
            return /* @__PURE__ */ n(
              "a",
              {
                href: J,
                title: B ? `Deep-review PR #${W} in Code Review Sage` : `Open Code Review Sage for ${k}`,
                className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
                style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: [
                  /* @__PURE__ */ n("svg", { width: "11", height: "11", viewBox: "0 0 16 16", fill: "none", children: [
                    /* @__PURE__ */ r("circle", { cx: "7", cy: "7", r: "4.5", stroke: "currentColor", strokeWidth: "1.5" }),
                    /* @__PURE__ */ r("path", { d: "M10.5 10.5L14 14", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                  ] }),
                  "Review in Sage"
                ]
              }
            );
          })()
        ] }),
        u && $.map((k) => /* @__PURE__ */ n(
          "div",
          {
            className: "mt-2 p-1.5 rounded-md text-[11px]",
            style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
            children: [
              /* @__PURE__ */ n("div", { style: { color: "var(--text, var(--muted))" }, children: [
                "⚖ ",
                k.question || k.kind
              ] }),
              /* @__PURE__ */ n("div", { className: "mt-1 flex gap-1.5", children: [
                /* @__PURE__ */ r(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--ok)", color: "var(--bg)" },
                    onClick: () => u(k.id, "approve"),
                    children: "Approve"
                  }
                ),
                /* @__PURE__ */ r(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    onClick: () => u(k.id, "decline"),
                    children: "Decline"
                  }
                )
              ] })
            ]
          },
          k.id
        )),
        j && (X ? /* @__PURE__ */ n("div", { className: "mt-2 flex flex-col gap-1", children: [
          /* @__PURE__ */ r(
            "textarea",
            {
              value: z,
              onChange: (k) => Y(k.target.value),
              placeholder: "Interject: design/spec note, re-scope…",
              rows: 2,
              className: "w-full text-[11px] px-2 py-1 rounded outline-none resize-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ n("div", { className: "flex gap-1.5", children: [
            /* @__PURE__ */ r(
              "button",
              {
                className: "text-[11px] px-2 py-0.5 rounded font-semibold",
                style: { background: "var(--accent)", color: "var(--bg)" },
                onClick: () => {
                  z.trim() && (j("note", z.trim()), Y(""), G(!1));
                },
                children: "Send"
              }
            ),
            /* @__PURE__ */ r(
              "button",
              {
                className: "text-[11px] px-2 py-0.5 rounded",
                style: { color: "var(--muted)" },
                onClick: () => {
                  G(!1), Y("");
                },
                children: "Cancel"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ r(
          "button",
          {
            className: "mt-2 text-[10px] hover:underline",
            style: { color: "var(--muted)" },
            onClick: () => G(!0),
            children: "+ interject"
          }
        ))
      ]
    }
  );
}
function qe({ title: s, count: g, children: h, id: v }) {
  return /* @__PURE__ */ n("div", { id: v, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ n("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
      /* @__PURE__ */ r("span", { className: "text-[11px] font-semibold uppercase tracking-wide truncate", style: { color: "var(--muted-strong, var(--muted))" }, children: s }),
      /* @__PURE__ */ r(
        "span",
        {
          className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
          children: g
        }
      )
    ] }),
    /* @__PURE__ */ r("div", { className: "flex flex-col gap-2", children: g === 0 ? /* @__PURE__ */ r(
      "div",
      {
        className: "text-[11px] rounded-lg py-3 px-2 text-center",
        style: { color: "var(--muted)", border: "1px dashed var(--border)" },
        children: "empty"
      }
    ) : h })
  ] });
}
function Nt({ config: s, onSet: g }) {
  function h({ label: v, value: O, options: A, tokens: j, onPick: u }) {
    return /* @__PURE__ */ n("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ r("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: v }),
      /* @__PURE__ */ r("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: A.map((L) => {
        const T = O === L;
        return /* @__PURE__ */ r(
          "button",
          {
            onClick: () => u(L),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: T ? j[L] : "var(--muted)",
              background: T ? `color-mix(in srgb, ${j[L]} 16%, transparent)` : "transparent",
              boxShadow: T ? `inset 0 0 0 1px color-mix(in srgb, ${j[L]} 45%, transparent)` : "none"
            },
            children: L
          },
          L
        );
      }) })
    ] });
  }
  return /* @__PURE__ */ n(
    "div",
    {
      className: "flex items-center gap-5 flex-wrap mb-4 px-3 py-2 rounded-lg",
      style: { background: "var(--card)", border: "1px solid var(--border)" },
      children: [
        /* @__PURE__ */ r("span", { className: "text-xs font-semibold", style: { color: "var(--muted-strong, var(--muted))" }, children: "Defaults" }),
        /* @__PURE__ */ r(h, { label: "Trust", value: s.trust, options: we, tokens: He, onPick: (v) => g({ trust: v }) }),
        /* @__PURE__ */ r(h, { label: "Depth", value: s.depth, options: Te, tokens: Ve, onPick: (v) => g({ depth: v }) }),
        /* @__PURE__ */ r("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function _t({ cards: s }) {
  const g = s.flatMap(
    (h) => (h.parked || []).map((v) => {
      var O;
      return { ...v, cardTitle: h.title, repo: (O = h.source) == null ? void 0 : O.repo };
    })
  ).sort((h, v) => (v.at || "").localeCompare(h.at || ""));
  return g.length === 0 ? /* @__PURE__ */ n("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ r("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ n("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ r("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ r("div", { className: "flex flex-col gap-2 max-w-2xl", children: g.map((h) => /* @__PURE__ */ n("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ r("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: h.note }),
    /* @__PURE__ */ n("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ n("span", { children: [
        "from ",
        /* @__PURE__ */ r("span", { style: { color: "var(--text)" }, children: h.cardTitle })
      ] }),
      h.phase && /* @__PURE__ */ n("span", { children: [
        "· parked at ",
        h.phase
      ] }),
      h.repo && /* @__PURE__ */ n("span", { children: [
        "· ",
        h.repo
      ] }),
      h.issue_url && /* @__PURE__ */ r("a", { href: h.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, h.id)) });
}
function St({ repos: s, selected: g, onToggle: h, onClear: v, onAddWorkspace: O, onEdit: A }) {
  const j = s.reduce((T, f) => T + f.count, 0), u = g.size === 0, L = ({ name: T, count: f, label: S, checked: x, onClick: V, isAll: X }) => {
    const [G, z] = w(!1);
    return /* @__PURE__ */ n(
      "div",
      {
        onMouseEnter: () => z(!0),
        onMouseLeave: () => z(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: x ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: x ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ n(
            "button",
            {
              onClick: V,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                X ? /* @__PURE__ */ r("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: x ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ r(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: x ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${x ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: x && /* @__PURE__ */ r("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ r("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ r(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: x ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: S
                  }
                ),
                /* @__PURE__ */ r(
                  "span",
                  {
                    className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    children: f
                  }
                )
              ]
            }
          ),
          !X && T && /* @__PURE__ */ r(
            "button",
            {
              onClick: (Y) => {
                Y.stopPropagation(), A(T);
              },
              title: `Edit pipeline "${S}"`,
              "aria-label": `Edit pipeline ${S}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: G ? 1 : 0,
                pointerEvents: G ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (Y) => {
                const $ = Y.currentTarget;
                $.style.color = "var(--accent)", $.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (Y) => {
                const $ = Y.currentTarget;
                $.style.color = "var(--text-strong, var(--text))", $.style.borderColor = "var(--border-strong, var(--border))";
              },
              children: /* @__PURE__ */ r("svg", { width: "13", height: "13", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ r("path", { d: "M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) })
            }
          )
        ]
      }
    );
  };
  return /* @__PURE__ */ n(
    "div",
    {
      className: "flex-shrink-0 w-52 flex flex-col gap-1 pr-3 border-r self-stretch overflow-y-auto",
      style: { borderColor: "var(--border)" },
      children: [
        /* @__PURE__ */ n("div", { className: "flex items-center justify-between px-2.5 mb-1", children: [
          /* @__PURE__ */ r("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspaces" }),
          g.size > 0 && /* @__PURE__ */ r("button", { onClick: v, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ r(L, { isAll: !0, count: j, label: "All repos", checked: u, onClick: v }),
        s.map((T) => /* @__PURE__ */ r(
          L,
          {
            name: T.name,
            count: T.count,
            label: (at.has(T.name) ? "Example: " : "") + (T.name.includes("/") ? T.name.split("/")[1] : T.name),
            checked: g.has(T.name),
            onClick: () => h(T.name)
          },
          T.name
        )),
        /* @__PURE__ */ n(
          "button",
          {
            onClick: O,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ r("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        g.size > 1 && /* @__PURE__ */ n("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          g.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const Ct = [
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
function Tt({ initial: s, knownAgents: g, crews: h, repo: v, stepName: O, onSave: A, onClose: j }) {
  var ee;
  const { openChat: u } = pt(), [L, T] = w(s.name || ""), [f, S] = w(s.role || ""), [x, V] = w(s.tools || ["read"]), [X, G] = w(s.model || "auto"), [z, Y] = w(s.crew || ""), [$, D] = w(s.addenda || []), [y, b] = w(s.trust || ""), [k, B] = w(s.depth || ""), W = (d) => V((c) => c.includes(d) ? c.filter((N) => N !== d) : [...c, d]), J = () => D((d) => {
    var c;
    return d.length >= 3 ? d : [...d, { crew: ((c = h[0]) == null ? void 0 : c.name) || "", when: "always", writes: "" }];
  }), P = (d, c) => D((N) => N.map((p, ce) => ce === d ? { ...p, ...c } : p)), F = (d) => D((c) => c.filter((N, p) => p !== d)), Q = L.trim().length > 0;
  return /* @__PURE__ */ n("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ n("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ r("button", { onClick: j, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ n("div", { className: "ml-1", children: [
        /* @__PURE__ */ r("div", { className: "text-sm font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Configure Agent" }),
        /* @__PURE__ */ r("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "This step's agent (KiroCrew agent config)" })
      ] }),
      /* @__PURE__ */ r(
        "button",
        {
          onClick: () => u({
            message: `/dlc-yolo

Help me design a NEW agent for a custom pipeline step.
Pipeline repo: ${v || "(unset)"}
Step: ${O || "(unnamed)"}

Ask me what the step should do, then propose an agent config (name, role/prompt, tools, model). When I'm happy, write it into this pipeline's step in the DLC-YOLO state file (~/.dlc-yolo/state.json, or /tmp/dlc-yolo/state.json if that's what exists) — the step's agent {name, role, tools} and any trust/depth — keeping GitHub as the source of truth.`
          }),
          className: "ml-auto text-[11px] px-2.5 py-1 rounded-md font-semibold flex items-center gap-1",
          style: { background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" },
          title: "Author this agent in a /dlc-yolo chat session",
          children: "✨ Draft with /dlc-yolo"
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { className: "px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto", children: [
      g.length > 0 && /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ r("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Reuse an existing agent" }),
        /* @__PURE__ */ r("div", { className: "mt-1 flex flex-wrap gap-1.5", children: g.map((d) => /* @__PURE__ */ r(
          "button",
          {
            onClick: () => T(d),
            className: "text-[11px] px-2 py-1 rounded-md font-medium",
            style: {
              background: L === d ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: L === d ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: L === d ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: d
          },
          d
        )) })
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ r("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ r(
          "input",
          {
            value: L,
            onChange: (d) => T(d.target.value),
            placeholder: "e.g. impl-agent",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ r("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Role / prompt" }),
        /* @__PURE__ */ r(
          "textarea",
          {
            value: f,
            onChange: (d) => S(d.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ r("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ r("div", { className: "mt-1 flex flex-wrap gap-1.5", children: Ct.map((d) => {
          const c = x.includes(d);
          return /* @__PURE__ */ r(
            "button",
            {
              onClick: () => W(d),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: c ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: c ? "var(--accent)" : "var(--muted)",
                boxShadow: c ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: d
            },
            d
          );
        }) })
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ r("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ r(
          "input",
          {
            value: X,
            onChange: (d) => G(d.target.value),
            placeholder: "auto",
            className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ r("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Crew" }),
          /* @__PURE__ */ n(
            "select",
            {
              value: z,
              onChange: (d) => Y(d.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ r("option", { value: "", children: "— none (use step agent) —" }),
                h.map((d) => /* @__PURE__ */ r("option", { value: d.name, children: d.name }, d.name))
              ]
            }
          )
        ] }),
        z && /* @__PURE__ */ r("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: ((ee = h.find((d) => d.name === z)) == null ? void 0 : ee.description) || "Runs this step via select_crew → spawn_run(agent=" + z + ")" })
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ n("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ r("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ r(
            "button",
            {
              onClick: J,
              disabled: $.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ r("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        $.length === 0 && /* @__PURE__ */ r("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        $.map((d, c) => /* @__PURE__ */ n("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ r(
            "select",
            {
              value: d.crew,
              onChange: (N) => P(c, { crew: N.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: h.map((N) => /* @__PURE__ */ r("option", { value: N.name, children: N.name }, N.name))
            }
          ),
          /* @__PURE__ */ n(
            "select",
            {
              value: d.when || "always",
              onChange: (N) => P(c, { when: N.target.value }),
              title: "Integration trigger — when this addendum runs",
              className: "px-1.5 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ r("option", { value: "always", children: "always" }),
                /* @__PURE__ */ r("option", { value: "depth:deep", children: "depth:deep" }),
                /* @__PURE__ */ r("option", { value: "kind:bug", children: "kind:bug" }),
                /* @__PURE__ */ r("option", { value: "manual", children: "manual" })
              ]
            }
          ),
          /* @__PURE__ */ r(
            "input",
            {
              value: d.writes || "",
              onChange: (N) => P(c, { writes: N.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ r("button", { onClick: () => F(c), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ r("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ r("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, c))
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ r("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ r("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...we].map((d) => {
          const c = y === d;
          return /* @__PURE__ */ r(
            "button",
            {
              onClick: () => b(d),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: c ? d ? He[d] : "var(--text)" : "var(--muted)", background: c ? "var(--bg-hover, var(--border))" : "transparent" },
              children: d || "inherit"
            },
            d || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ r("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ r("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Te].map((d) => {
          const c = k === d;
          return /* @__PURE__ */ r(
            "button",
            {
              onClick: () => B(d),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: c ? d ? Ve[d] : "var(--text)" : "var(--muted)", background: c ? "var(--bg-hover, var(--border))" : "transparent" },
              children: d || "inherit"
            },
            d || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ n("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ r("button", { onClick: j, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ r(
        "button",
        {
          disabled: !Q,
          onClick: () => A({
            name: L.trim(),
            role: f.trim() || void 0,
            tools: x,
            model: X.trim() && X.trim() !== "auto" ? X.trim() : void 0,
            crew: z || void 0,
            addenda: $.length ? $.filter((d) => d.crew) : void 0,
            trust: y || void 0,
            depth: k || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save Agent"
        }
      )
    ] })
  ] });
}
function et({ candidates: s, existingRepos: g, defaults: h, knownAgents: v, crews: O, onCreate: A, onClose: j, editPipeline: u, cardCount: L, isExample: T, onDelete: f }) {
  var _e, Ie, Oe, je, Me, Be, ze, We, Le, Ge, ge, ve, xe, t;
  const S = !!u, [x, V] = w((u == null ? void 0 : u.repo) || ""), [X, G] = w((u == null ? void 0 : u.source) || "manual"), [z, Y] = w((u == null ? void 0 : u.trust) || h.trust), [$, D] = w((u == null ? void 0 : u.depth) || h.depth), y = u == null ? void 0 : u.budget, [b, k] = w(
    y ? y.max_child_cards === "unlimited" && y.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [B, W] = w(
    () => y && y.max_child_cards !== "unlimited" && y.effort_ceiling !== "unlimited" ? { ...y } : Qe((u == null ? void 0 : u.depth) || h.depth)
  ), [J, P] = w((u == null ? void 0 : u.backlog_intake) ?? !0), [F, Q] = w((u == null ? void 0 : u.results_in_repo) ?? !1), [ee, d] = w((u == null ? void 0 : u.self_enabling) ?? !1), [c, N] = w((u == null ? void 0 : u.approach) || "simplified"), [p, ce] = w(() => {
    var e;
    return (e = u == null ? void 0 : u.steps) != null && e.length ? u.steps.map((a) => ({ ...a })) : Ee.map((a) => ({ ...a }));
  }), [_, K] = w(null), [de, ie] = w(""), [re, ue] = w("settings"), Re = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", I = (e, a) => ce((o) => o.map((l, i) => i === e ? { ...l, ...a } : l)), R = (e) => ce((a) => a.filter((o, l) => l !== e)), E = (e, a) => ce((o) => {
    const l = e + a;
    if (l < 0 || l >= o.length) return o;
    const i = [...o];
    return [i[e], i[l]] = [i[l], i[e]], i;
  }), oe = (e) => ce((a) => [...a, {
    id: `${e}-${Math.random().toString(36).slice(2, 6)}`,
    name: e === "gate" ? "New Gate" : "New Step",
    type: e,
    agent: e === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), he = (e) => {
    V(e.repo), G(e.source);
  }, ae = (e) => {
    let a = (e || "").trim();
    if (!a) return "";
    const o = a.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return o && (a = o[1]), a.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, De = (e) => {
    const a = /github\.com|gitlab\.com/i.test(e);
    V(a ? ae(e) : e), G("manual");
  }, Xe = /^[^/\s]+\/[^/\s]+$/.test(ae(x)) || s.some((e) => e.repo === x), Ne = !S && g.has(ae(x)), $e = ({ value: e, options: a, tokens: o, onPick: l }) => /* @__PURE__ */ r("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: a.map((i) => {
    const M = e === i;
    return /* @__PURE__ */ r(
      "button",
      {
        onClick: () => l(i),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: M ? o[i] : "var(--muted)",
          background: M ? `color-mix(in srgb, ${o[i]} 16%, transparent)` : "transparent",
          boxShadow: M ? `inset 0 0 0 1px color-mix(in srgb, ${o[i]} 45%, transparent)` : "none"
        },
        children: i
      },
      i
    );
  }) }), me = { "issue-radar": [], workspace: [], manual: [] };
  s.forEach((e) => {
    var a;
    (me[a = e.source] || (me[a] = [])).push(e);
  });
  const Je = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" };
  return /* @__PURE__ */ r(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: j,
      children: /* @__PURE__ */ r(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (e) => e.stopPropagation(),
          children: _ !== null ? /* @__PURE__ */ r(
            Tt,
            {
              initial: {
                name: ((Ie = (_e = p[_]) == null ? void 0 : _e.agent) == null ? void 0 : Ie.name) || "",
                role: (je = (Oe = p[_]) == null ? void 0 : Oe.agent) == null ? void 0 : je.role,
                tools: (Be = (Me = p[_]) == null ? void 0 : Me.agent) == null ? void 0 : Be.tools,
                model: (We = (ze = p[_]) == null ? void 0 : ze.agent) == null ? void 0 : We.model,
                crew: (Ge = (Le = p[_]) == null ? void 0 : Le.agent) == null ? void 0 : Ge.crew,
                addenda: (ge = p[_]) == null ? void 0 : ge.addenda,
                trust: (ve = p[_]) == null ? void 0 : ve.trust,
                depth: (xe = p[_]) == null ? void 0 : xe.depth
              },
              knownAgents: v,
              crews: O,
              repo: x,
              stepName: ((t = p[_]) == null ? void 0 : t.name) || "",
              onClose: () => K(null),
              onSave: (e) => {
                I(_, {
                  agent: { name: e.name, role: e.role, tools: e.tools, model: e.model, crew: e.crew },
                  addenda: e.addenda,
                  trust: e.trust,
                  depth: e.depth
                }), K(null);
              }
            }
          ) : /* @__PURE__ */ n(rt, { children: [
            /* @__PURE__ */ n("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ n("div", { children: [
                /* @__PURE__ */ r("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: S ? "Edit Pipeline" : "New Pipeline" }),
                /* @__PURE__ */ r("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: S ? x.includes("/") ? x.split("/")[1] : x : "Configure a pipeline for a repository or workspace" })
              ] }),
              /* @__PURE__ */ r("button", { onClick: j, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
            ] }),
            S && /* @__PURE__ */ r("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: ["settings", "danger"].map((e) => {
              const a = re === e, o = e === "danger";
              return /* @__PURE__ */ r(
                "button",
                {
                  onClick: () => ue(e),
                  className: "text-[12px] px-3 py-2 font-semibold transition-all",
                  style: {
                    color: a ? o ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                    borderBottom: `2px solid ${a ? o ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                    marginBottom: "-1px"
                  },
                  children: e === "settings" ? "Settings" : "Danger Zone"
                },
                e
              );
            }) }),
            /* @__PURE__ */ n(
              "div",
              {
                className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                style: { display: S && re === "danger" ? "none" : "flex" },
                children: [
                  /* @__PURE__ */ n("div", { children: [
                    /* @__PURE__ */ r("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                    /* @__PURE__ */ r(
                      "input",
                      {
                        value: x,
                        onChange: (e) => De(e.target.value),
                        onPaste: (e) => {
                          const a = e.clipboardData.getData("text");
                          /github\.com|gitlab\.com/i.test(a) && (e.preventDefault(), De(a));
                        },
                        placeholder: "https://github.com/owner/name  ·  or  owner/name",
                        disabled: S,
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                        style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Ne ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                      }
                    ),
                    !S && x && ae(x) !== x && /* @__PURE__ */ n("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                      "→ ",
                      /* @__PURE__ */ r("code", { style: { color: "var(--accent)" }, children: ae(x) })
                    ] }),
                    Ne && /* @__PURE__ */ r("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                    /* @__PURE__ */ r("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((e) => me[e].length > 0 && /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ r("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Je[e] }),
                      /* @__PURE__ */ r("div", { className: "flex flex-wrap gap-1.5", children: me[e].map((a) => /* @__PURE__ */ r(
                        "button",
                        {
                          onClick: () => he(a),
                          disabled: g.has(a.repo),
                          title: a.detail || a.repo,
                          className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                          style: {
                            background: x === a.repo ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                            color: x === a.repo ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                            boxShadow: x === a.repo ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                          },
                          children: a.repo.includes("/") ? a.repo.split("/")[1] : a.repo
                        },
                        a.repo
                      )) })
                    ] }, e)) })
                  ] }),
                  /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ r("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                    /* @__PURE__ */ r($e, { value: z, options: we, tokens: He, onPick: Y })
                  ] }),
                  /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ r("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                    /* @__PURE__ */ r($e, { value: $, options: Te, tokens: Ve, onPick: D })
                  ] }),
                  /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ r("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                      /* @__PURE__ */ r("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                    ] }),
                    /* @__PURE__ */ r(
                      $e,
                      {
                        value: b,
                        options: ["depth", "custom", "unlimited"],
                        tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                        onPick: k
                      }
                    )
                  ] }),
                  b === "depth" && (() => {
                    const e = Qe($);
                    return /* @__PURE__ */ n("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      "Follows ",
                      /* @__PURE__ */ r("strong", { children: $ }),
                      ": ",
                      String(e.max_child_cards),
                      " child cards · ",
                      String(e.effort_ceiling),
                      " effort points · max ",
                      e.max_feature_size,
                      " · ",
                      e.addenda,
                      " addenda"
                    ] });
                  })(),
                  b === "unlimited" && /* @__PURE__ */ r("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                  b === "custom" && /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                      "Max child cards",
                      /* @__PURE__ */ r(
                        "input",
                        {
                          type: "number",
                          min: 0,
                          value: B.max_child_cards,
                          onChange: (e) => W((a) => ({ ...a, max_child_cards: Math.max(0, Number(e.target.value) || 0) })),
                          className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                          style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      )
                    ] }),
                    /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                      "Effort ceiling",
                      /* @__PURE__ */ r(
                        "input",
                        {
                          type: "number",
                          min: 0,
                          value: B.effort_ceiling,
                          onChange: (e) => W((a) => ({ ...a, effort_ceiling: Math.max(0, Number(e.target.value) || 0) })),
                          className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                          style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      )
                    ] }),
                    /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                      "Max feature size",
                      /* @__PURE__ */ r(
                        "select",
                        {
                          value: B.max_feature_size,
                          onChange: (e) => W((a) => ({ ...a, max_feature_size: e.target.value })),
                          className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                          style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                          children: ["S", "M", "L", "XL"].map((e) => /* @__PURE__ */ r("option", { children: e }, e))
                        }
                      )
                    ] }),
                    /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                      "Addenda",
                      /* @__PURE__ */ r(
                        "select",
                        {
                          value: B.addenda,
                          onChange: (e) => W((a) => ({ ...a, addenda: e.target.value })),
                          className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                          style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                          children: ["none", "obvious", "proactive"].map((e) => /* @__PURE__ */ r("option", { children: e }, e))
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ n("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ r("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Backlog auto-intake" }),
                      /* @__PURE__ */ n("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Back-feed open ",
                        /* @__PURE__ */ r("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
                        " issues as cards"
                      ] })
                    ] }),
                    /* @__PURE__ */ r(
                      "button",
                      {
                        onClick: () => P((e) => !e),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: J ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ r(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: J ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ r("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                      /* @__PURE__ */ n("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Also commit results & the pipeline conversation to a ",
                        /* @__PURE__ */ r("code", { style: { color: "var(--accent)" }, children: ".dlc-yolo/" }),
                        " copy in the owned repo (always kept in app data)"
                      ] })
                    ] }),
                    /* @__PURE__ */ r(
                      "button",
                      {
                        onClick: () => Q((e) => !e),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: F ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ r(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: F ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ r("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                      /* @__PURE__ */ r("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                    ] }),
                    /* @__PURE__ */ r(
                      "button",
                      {
                        onClick: () => d((e) => !e),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: ee ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ r(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: ee ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  ee && /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ r("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                      /* @__PURE__ */ r("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                    ] }),
                    /* @__PURE__ */ r("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((e) => /* @__PURE__ */ r(
                      "button",
                      {
                        onClick: () => N(e),
                        className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                        style: {
                          background: c === e ? "var(--accent)" : "transparent",
                          color: c === e ? "var(--bg)" : "var(--muted)",
                          border: `1px solid ${c === e ? "var(--accent)" : "var(--border)"}`
                        },
                        children: e
                      },
                      e
                    )) })
                  ] }),
                  /* @__PURE__ */ n("div", { children: [
                    /* @__PURE__ */ n("div", { className: "flex items-center justify-between mb-1.5", children: [
                      /* @__PURE__ */ r("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                      /* @__PURE__ */ n("div", { className: "flex gap-1", children: [
                        /* @__PURE__ */ r(
                          "button",
                          {
                            onClick: () => oe("agent"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                            children: "+ agent"
                          }
                        ),
                        /* @__PURE__ */ r(
                          "button",
                          {
                            onClick: () => oe("gate"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                            children: "+ gate"
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ r("div", { className: "flex flex-col gap-1.5", children: p.map((e, a) => {
                      var o, l;
                      return /* @__PURE__ */ n(
                        "div",
                        {
                          className: "rounded-md p-2",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${e.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                          children: [
                            /* @__PURE__ */ n("div", { className: "flex items-center gap-1.5", children: [
                              /* @__PURE__ */ n("div", { className: "flex flex-col", children: [
                                /* @__PURE__ */ r("button", { onClick: () => E(a, -1), disabled: a === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                /* @__PURE__ */ r("button", { onClick: () => E(a, 1), disabled: a === p.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                              ] }),
                              /* @__PURE__ */ r(
                                "input",
                                {
                                  value: e.name,
                                  onChange: (i) => I(a, { name: i.target.value, id: Re(i.target.value) }),
                                  className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                }
                              ),
                              /* @__PURE__ */ r(
                                "span",
                                {
                                  className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                  style: { color: e.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${e.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                  children: e.type
                                }
                              ),
                              /* @__PURE__ */ r("button", { onClick: () => R(a), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                            ] }),
                            e.type === "agent" && /* @__PURE__ */ n("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                              /* @__PURE__ */ n(
                                "button",
                                {
                                  onClick: () => K(a),
                                  className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                  children: [
                                    "⚙ ",
                                    (o = e.agent) != null && o.name ? `Agent: ${e.agent.name}` : "Configure agent"
                                  ]
                                }
                              ),
                              /* @__PURE__ */ r("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                              /* @__PURE__ */ n(
                                "select",
                                {
                                  value: e.trigger || "ask",
                                  onChange: (i) => I(a, { trigger: i.target.value === "ask" ? void 0 : i.target.value }),
                                  title: "Which engine runs this phase (ask = prompt at runtime)",
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ r("option", { value: "ask", children: "ask" }),
                                    /* @__PURE__ */ r("option", { value: "spec-builder", children: "Spec Builder" }),
                                    /* @__PURE__ */ r("option", { value: "task-runner", children: "Task Runner" }),
                                    /* @__PURE__ */ r("option", { value: "inline", children: "inline" }),
                                    /* @__PURE__ */ r("option", { value: "skip", children: "skip" })
                                  ]
                                }
                              ),
                              (e.trust || e.depth) && /* @__PURE__ */ r("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [e.trust, e.depth].filter(Boolean).join(" · ") }),
                              e.addenda && e.addenda.length > 0 && /* @__PURE__ */ n("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                "+",
                                e.addenda.length,
                                " addendum",
                                e.addenda.length === 1 ? "" : "s"
                              ] }),
                              ((l = e.agent) == null ? void 0 : l.role) && /* @__PURE__ */ r("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: e.agent.role })
                            ] }),
                            e.type === "gate" && /* @__PURE__ */ n("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                              /* @__PURE__ */ r("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                              /* @__PURE__ */ n(
                                "select",
                                {
                                  value: e.trust || "",
                                  onChange: (i) => I(a, { trust: i.target.value || void 0 }),
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ r("option", { value: "", children: "inherit" }),
                                    we.map((i) => /* @__PURE__ */ r("option", { value: i, children: i }, i))
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
            S && re === "danger" && f && (() => {
              const e = x.includes("/") ? x.split("/")[1] : x, a = de.trim() === e;
              return /* @__PURE__ */ r("div", { className: "px-5 pb-4 pt-4", children: T ? /* @__PURE__ */ n(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                  children: [
                    /* @__PURE__ */ n("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "This is a bundled ",
                      /* @__PURE__ */ r("strong", { children: "example" }),
                      " pipeline (",
                      L ?? 0,
                      " sample card",
                      (L ?? 0) === 1 ? "" : "s",
                      "). Remove it any time — it's demo data, not real work."
                    ] }),
                    /* @__PURE__ */ r(
                      "button",
                      {
                        onClick: () => {
                          f(x), j();
                        },
                        className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Remove Example"
                      }
                    )
                  ]
                }
              ) : /* @__PURE__ */ n(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))", background: "color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)" },
                  children: [
                    /* @__PURE__ */ r("div", { className: "text-[12px] font-semibold uppercase tracking-wide", style: { color: "var(--danger, #ef4444)" }, children: "Danger Zone" }),
                    /* @__PURE__ */ n("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "Deleting removes this pipeline and its ",
                      L ?? 0,
                      " card",
                      (L ?? 0) === 1 ? "" : "s",
                      " from DLC-YOLO's local state. It does ",
                      /* @__PURE__ */ r("strong", { children: "not" }),
                      " touch GitHub issues or labels. This cannot be undone."
                    ] }),
                    /* @__PURE__ */ n("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                      "Type ",
                      /* @__PURE__ */ r("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: e }),
                      " to confirm:"
                    ] }),
                    /* @__PURE__ */ r(
                      "input",
                      {
                        value: de,
                        onChange: (o) => ie(o.target.value),
                        placeholder: e,
                        className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                      }
                    ),
                    /* @__PURE__ */ r(
                      "button",
                      {
                        disabled: !a,
                        onClick: () => {
                          f(x), j();
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
            /* @__PURE__ */ n("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
              /* @__PURE__ */ r("button", { onClick: j, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Cancel" }),
              !(S && re === "danger") && /* @__PURE__ */ r(
                "button",
                {
                  disabled: !Xe || !S && Ne,
                  onClick: () => A({
                    repo: ae(x),
                    source: X,
                    trust: z,
                    depth: $,
                    budget: b === "depth" ? void 0 : b === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : B,
                    backlog_intake: J,
                    results_in_repo: F,
                    self_enabling: ee,
                    approach: c,
                    steps: p.map((e) => ({ ...e, label: `dlc:${e.id}` }))
                  }),
                  className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: S ? "Save Pipeline" : "Create Pipeline"
                }
              )
            ] })
          ] })
        }
      )
    }
  );
}
function tt({ size: s = 12 }) {
  return /* @__PURE__ */ n("svg", { className: "animate-spin flex-shrink-0", width: s, height: s, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ r("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ r("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
function Lt() {
  const s = dt(), [g, h] = w([]), [v, O] = w([]), [A, j] = w(Ae), [u, L] = w(!0), [T, f] = w("pipeline"), [S, x] = w(/* @__PURE__ */ new Set()), [V, X] = w(!1), [G, z] = w(null), [Y, $] = w([]), [D, y] = w([]), [b, k] = w(!1), [B, W] = w([]), J = le(null), P = le(!1), F = le(/* @__PURE__ */ new Set()), Q = le(/* @__PURE__ */ new Set()), [ee, d] = w({}), c = H(async () => {
    try {
      let t;
      try {
        t = await s.get("/api/file-read?path=" + encodeURIComponent(se));
      } catch (e) {
        if (se !== Ze)
          se = Ze, t = await s.get("/api/file-read?path=" + encodeURIComponent(se));
        else
          throw e;
      }
      h(t.cards || []), O(t.pipelines || []), j({ ...Ae, ...t.config || {} });
    } catch (t) {
      console.error("Failed to fetch cards:", t);
    } finally {
      L(!1);
    }
  }, [s]), N = pe(() => {
    const t = /* @__PURE__ */ new Map();
    return v.forEach((e) => {
      t.has(e.repo) || t.set(e.repo, 0);
    }), g.forEach((e) => {
      var o;
      const a = ((o = e.source) == null ? void 0 : o.repo) || "unlinked";
      t.set(a, (t.get(a) || 0) + 1);
    }), [...t.entries()].map(([e, a]) => ({ name: e, count: a })).sort((e, a) => a.count - e.count);
  }, [g, v]), p = pe(
    () => S.size === 0 ? g : g.filter((t) => {
      var e;
      return S.has(((e = t.source) == null ? void 0 : e.repo) || "unlinked");
    }),
    [g, S]
  );
  ke(() => {
    Q.current = new Set(g.map((t) => t.id)), F.current = new Set(g.flatMap(
      (t) => Object.values(t.step_sessions || {}).filter((e) => !!e.slot_key && !e.chat_disabled_at && !e.superseded).map((e) => e.slot_key)
    ));
  }, [g]), ke(() => {
    let t = !1, e = null, a, o = 0;
    const l = () => {
      if (t) return;
      const i = window.location.protocol === "https:" ? "wss:" : "ws:";
      e = new WebSocket(`${i}//${window.location.host}/api/ws`), e.onopen = () => {
        o = 0;
      }, e.onmessage = (M) => {
        if (typeof M.data == "string")
          try {
            const Z = JSON.parse(M.data), te = Z == null ? void 0 : Z.data;
            if (Z.type === "slots" && Array.isArray(te)) {
              const C = new Set(F.current), q = [];
              for (const m of te) {
                const ne = (m == null ? void 0 : m.key) || (m == null ? void 0 : m.slot) || (m == null ? void 0 : m.name), be = String((m == null ? void 0 : m.title) || (m == null ? void 0 : m.name) || "");
                typeof ne == "string" && ne.startsWith("cron-") && [...Q.current].some((fe) => be.includes(fe)) && C.add(ne), typeof ne == "string" && (m != null && m.running) && C.has(ne) && q.push(ne);
              }
              F.current = C, q.length && d((m) => {
                let ne = m;
                for (const be of q) {
                  const fe = Ye(m[be]);
                  fe !== m[be] && (ne = { ...ne, [be]: fe });
                }
                return ne;
              });
              return;
            }
            const U = te == null ? void 0 : te.slot;
            if (!U || !F.current.has(U)) return;
            Z.type === "chat_status" && String(te.status || "").toLowerCase().startsWith("thinking") || Z.type === "chat_thinking" ? d((C) => {
              const q = Ye(C[U], Z.type === "chat_status");
              return q === C[U] ? C : { ...C, [U]: q };
            }) : Z.type === "chat_chunk" && typeof te.content == "string" ? d((C) => {
              const q = xt(C[U], te.content, Number(te.seq));
              return q === C[U] ? C : { ...C, [U]: q };
            }) : Z.type === "chat_done" && d((C) => {
              const q = bt(C[U]);
              return q === C[U] ? C : { ...C, [U]: q };
            });
          } catch {
          }
      }, e.onclose = () => {
        if (t) return;
        const M = Math.min(1e3 * 2 ** o++, 15e3);
        a = setTimeout(l, M);
      }, e.onerror = () => e == null ? void 0 : e.close();
    };
    return l(), () => {
      t = !0, a && clearTimeout(a), e == null || e.close();
    };
  }, []), ke(() => {
    if (!b) return;
    const t = (e) => {
      e.key === "Escape" && k(!1);
    };
    return window.addEventListener("keydown", t), () => window.removeEventListener("keydown", t);
  }, [b]);
  const ce = 6e5, _ = pe(() => {
    var e, a, o, l;
    const t = [];
    for (const i of p) {
      const M = i.step_status || {}, Z = i.step_sessions || {}, te = v.find((C) => C.id === i.pipeline_id) || v.find((C) => {
        var q;
        return C.repo === ((q = i.source) == null ? void 0 : q.repo);
      }), U = /* @__PURE__ */ new Set([...Object.keys(M), ...Object.keys(Z)]);
      for (const C of U) {
        const q = M[C] || "idle", m = Z[C], ne = q === "pending" || q === "error", be = !!(m != null && m.slot_key) && !m.chat_disabled_at && !m.superseded;
        if (!ne && !be) continue;
        const fe = (e = i.pending_at) == null ? void 0 : e[C], nt = ne && !!fe && Date.now() - new Date(fe).getTime() > ce, Se = (a = te == null ? void 0 : te.steps) == null ? void 0 : a.find((Ce) => Ce.id === C), st = (m == null ? void 0 : m.agent) || ((o = Se == null ? void 0 : Se.agent) == null ? void 0 : o.crew) || ((l = Se == null ? void 0 : Se.agent) == null ? void 0 : l.name) || "orchestrator", Pe = m == null ? void 0 : m.agent_id, ot = m == null ? void 0 : m.slot_key, lt = m == null ? void 0 : m.session_key, it = Pe ? B.some((Ce) => Ce.id === Pe) : ne && B.some((Ce) => (Ce.task || "").includes(i.id) || (Ce.task || "").includes(i.title)), ct = !!(m != null && m.last_response_at) && (!m.last_response_handled_at || m.last_response_handled_at < m.last_response_at);
        t.push({ card: i.title || i.id, step: C, agent: st, stale: nt, status: q, live: it, responsePending: ct, agentId: Pe, slotKey: ot, sessionKey: lt, sessionName: m == null ? void 0 : m.name });
      }
    }
    return t;
  }, [p, v, B]), K = pe(() => {
    var l;
    let t;
    if (S.size === 1) {
      const i = [...S][0];
      t = (l = v.find((M) => M.repo === i)) == null ? void 0 : l.steps;
    } else v.length === 1 && (t = v[0].steps);
    const e = (t && t.length ? t : Ee).map((i) => ({ ...i })), a = new Set(e.map((i) => i.id)), o = [];
    return a.has("intake") || o.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), o.push(...e), a.has("done") || o.push({ id: "done", name: "Done", type: "agent" }), o;
  }, [S, v]), de = pe(() => K.map((t) => t.id), [K]), ie = H((t) => {
    var e;
    return ((e = K.find((a) => a.id === t)) == null ? void 0 : e.type) === "gate" || t.startsWith("gate-");
  }, [K]), re = H((t) => {
    var e, a;
    return ((a = (e = K.find((o) => o.id === t)) == null ? void 0 : e.agent) == null ? void 0 : a.name) || yt[t] || "unknown";
  }, [K]);
  ke(() => {
    c();
    const t = async () => {
      try {
        const a = se.slice(0, se.lastIndexOf("/")), o = (a ? a + "/" : "") + "live_spawns.json", l = await s.get("/api/file-read?path=" + encodeURIComponent(o));
        P.current = !1;
        const i = l != null && l.at ? Date.now() - new Date(l.at).getTime() < 18e4 : !0;
        W(i && Array.isArray(l == null ? void 0 : l.runs) ? l.runs : []);
      } catch {
        P.current = !0, W([]);
      }
    };
    c().then(t);
    const e = setInterval(() => {
      c().then(() => {
        P.current || t();
      });
    }, 1e4);
    return () => clearInterval(e);
  }, [c, s]), ke(() => {
    (async () => {
      try {
        const t = await s.get("/api/file-read?path=~/.kiro/crew/config.json"), e = (t == null ? void 0 : t.agents) || {}, a = Object.entries(e).map(([o, l]) => ({
          name: o,
          description: (l == null ? void 0 : l.description) || void 0
        }));
        y(a);
      } catch (t) {
        console.warn("crew roster (config.json) unreadable:", t);
      }
    })();
  }, [s]);
  const ue = (t, e) => {
    const a = (t.pipelines || []).find((i) => i.id === e.pipeline_id) || (t.pipelines || []).find((i) => {
      var M;
      return i.repo === ((M = e.source) == null ? void 0 : M.repo);
    }), l = ["intake", ...(a != null && a.steps && a.steps.length ? a.steps : Ee).map((i) => i.id).filter((i) => i !== "intake" && i !== "done"), "done"];
    return [...new Set(l)];
  }, Re = H(async (t) => {
    var e;
    try {
      const a = await s.get("/api/file-read?path=" + encodeURIComponent(se)), o = (e = a.cards) == null ? void 0 : e.find((Z) => Z.id === t);
      if (!o) return;
      const l = ue(a, o), i = l.indexOf(o.stage);
      if (i < 0 || i >= l.length - 1) return;
      const M = o.stage;
      o.stage = l[i + 1], o.updated_at = (/* @__PURE__ */ new Date()).toISOString(), o.gate_history = o.gate_history || [], o.gate_history.push({ gate: M, decision: "approved", at: o.updated_at, notes: "" }), o.history = o.history || [], o.history.push({ from: M, to: o.stage, at: o.updated_at, agent: "human" }), await s.post("/api/file-write", { path: se, content: JSON.stringify(a, null, 2) }), c();
    } catch (a) {
      console.error("Failed to advance card:", a);
    }
  }, [s, c]), I = H(async (t) => {
    var e, a;
    try {
      const o = await s.get("/api/file-read?path=" + encodeURIComponent(se)), l = (e = o.cards) == null ? void 0 : e.find((C) => C.id === t);
      if (!l) return;
      const i = ue(o, l), M = new Set((((a = (o.pipelines || []).find((C) => C.id === l.pipeline_id)) == null ? void 0 : a.steps) || Ee).filter((C) => C.type === "gate").map((C) => C.id)), Z = i.indexOf(l.stage);
      if (Z <= 0) return;
      const te = l.stage;
      let U = Z - 1;
      for (; U > 0 && (M.has(i[U]) || i[U].startsWith("gate-")); ) U--;
      l.stage = i[U], l.updated_at = (/* @__PURE__ */ new Date()).toISOString(), l.gate_history = l.gate_history || [], l.gate_history.push({ gate: te, decision: "rejected", at: l.updated_at, notes: "" }), l.history = l.history || [], l.history.push({ from: te, to: l.stage, at: l.updated_at, agent: "human" }), await s.post("/api/file-write", { path: se, content: JSON.stringify(o, null, 2) }), c();
    } catch (o) {
      console.error("Failed to reject card:", o);
    }
  }, [s, c]), R = H(async (t) => {
    try {
      const e = await s.get("/api/file-read?path=" + encodeURIComponent(se));
      e.cards = e.cards || [], t(e);
      try {
        const a = await s.get("/api/file-read?path=" + encodeURIComponent(se));
        a.cards = a.cards || [], t(a), await s.post("/api/file-write", { path: se, content: JSON.stringify(a, null, 2) });
      } catch {
        await s.post("/api/file-write", { path: se, content: JSON.stringify(e, null, 2) });
      }
      c();
    } catch (e) {
      console.error("Failed to mutate state:", e);
    }
  }, [s, c]), E = H((t) => {
    j((e) => ({ ...e, ...t })), R((e) => {
      e.config = { ...Ae, ...e.config || {}, ...t };
    });
  }, [R]);
  H((t, e) => {
    R((a) => {
      const o = a.cards.find((l) => l.id === t);
      o && (o.step_status = { ...o.step_status || {}, [e]: "approved" }, o.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [R]), H((t, e) => {
    R((a) => {
      const o = a.cards.find((l) => l.id === t);
      o && (o.step_status = { ...o.step_status || {}, [e]: "rejected" }, o.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [R]);
  const oe = H((t, e, a, o) => {
    R((l) => {
      const i = l.cards.find((M) => M.id === t);
      i && (i.interjection = [...i.interjection || [], {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        step: e,
        kind: a,
        text: o,
        by: "user",
        status: "pending"
      }], i.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [R]), he = H((t, e, a) => {
    R((o) => {
      const l = o.cards.find((M) => M.id === t);
      if (!l) return;
      const i = (l.decisions || []).find((M) => M.id === e);
      i && (i.chosen = a, i.resolved_at = (/* @__PURE__ */ new Date()).toISOString()), l.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [R]), ae = H((t) => {
    R((e) => {
      var l;
      const a = e.cards.find((i) => i.id === t);
      if (!a) return;
      const o = a.trust || ((l = e.config) == null ? void 0 : l.trust) || Ae.trust;
      a.trust = we[(we.indexOf(o) + 1) % we.length], a.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [R]), De = H((t) => {
    R((e) => {
      var l;
      const a = e.cards.find((i) => i.id === t);
      if (!a) return;
      const o = a.depth || ((l = e.config) == null ? void 0 : l.depth) || Ae.depth;
      a.depth = Te[(Te.indexOf(o) + 1) % Te.length], a.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [R]), Xe = H((t) => {
    x((e) => {
      const a = new Set(e);
      return a.has(t) ? a.delete(t) : a.add(t), a;
    });
  }, []), Ne = H(() => x(/* @__PURE__ */ new Set()), []), $e = H(async () => {
    const t = [];
    try {
      const e = await s.get("/api/file-read?path=~/.kiro/crew/config.json"), a = (e == null ? void 0 : e.workspaces) || {};
      Object.entries(a).forEach(([o, l]) => t.push({ repo: o, source: "workspace", detail: (l == null ? void 0 : l.dir) || o }));
    } catch (e) {
      console.warn("workspaces registry unreadable:", e);
    }
    try {
      const e = await s.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((e == null ? void 0 : e.repos) || []).forEach((a) => {
        a != null && a.owner && (a != null && a.repo) && t.push({ repo: `${a.owner}/${a.repo}`, source: "issue-radar", detail: `${a.provider || "github"} · ${a.host || "github.com"}` });
      });
    } catch (e) {
      console.warn("issue-radar config unreadable (app may not be installed):", e);
    }
    $(t), X(!0);
  }, [s]), me = H(async (t) => {
    const e = (/* @__PURE__ */ new Date()).toISOString(), a = "pl-" + Math.random().toString(36).slice(2, 10);
    await R((o) => {
      o.pipelines = o.pipelines || [];
      const l = o.pipelines.find((i) => i.repo === t.repo);
      l ? (l.source = t.source, l.trust = t.trust, l.depth = t.depth, t.budget ? l.budget = t.budget : delete l.budget, l.backlog_intake = t.backlog_intake, l.results_in_repo = t.results_in_repo, l.self_enabling = t.self_enabling, l.approach = t.approach, l.steps = t.steps) : o.pipelines.push({
        id: a,
        repo: t.repo,
        source: t.source,
        trust: t.trust,
        depth: t.depth,
        backlog_intake: t.backlog_intake,
        ...t.budget ? { budget: t.budget } : {},
        results_in_repo: t.results_in_repo,
        self_enabling: t.self_enabling,
        approach: t.approach,
        sot: "github",
        steps: t.steps,
        created_at: e
      });
    }), X(!1), z(null), x(/* @__PURE__ */ new Set([t.repo]));
  }, [R]), Je = H(async (t) => {
    await R((e) => {
      e.pipelines = (e.pipelines || []).filter((a) => a.repo !== t), e.cards = (e.cards || []).filter((a) => {
        var o;
        return (((o = a.source) == null ? void 0 : o.repo) || "unlinked") !== t;
      });
    }), x((e) => {
      const a = new Set(e);
      return a.delete(t), a;
    });
  }, [R]), _e = pe(() => de.reduce((t, e) => (t[e] = p.filter((a) => a.stage === e), t), {}), [p, de]), Ie = H((t) => {
    var e;
    (e = document.getElementById(`stage-col-${t}`)) == null || e.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), Oe = pe(() => {
    const t = {};
    return p.forEach((e) => {
      var o;
      const a = ((o = e.source) == null ? void 0 : o.repo) || "unlinked";
      (t[a] || (t[a] = [])).push(e);
    }), t;
  }, [p]), je = pe(() => {
    const t = {};
    return p.forEach((e) => {
      const a = re(e.stage);
      (t[a] || (t[a] = [])).push(e);
    }), t;
  }, [p, re]), Me = pe(() => {
    const t = [], e = [], a = [];
    return p.forEach((o) => {
      o.stage === "done" ? a.push(o) : ie(o.stage) ? t.push(o) : e.push(o);
    }), { "Blocked at Gate": t, "In-Flight (Auto)": e, Done: a };
  }, [p, ie]), Be = p.filter((t) => t.stage !== "done").length, ze = p.filter((t) => ie(t.stage)).length, We = p.filter((t) => t.stage === "done").length, Le = p.reduce((t, e) => {
    var a;
    return t + (((a = e.parked) == null ? void 0 : a.length) || 0);
  }, 0), Ge = {
    pipeline: p.length,
    workspace: Object.keys(Oe).length,
    crew: Object.keys(je).length,
    status: p.length,
    backlog: Le
  }, ge = _.some((t) => {
    var e, a;
    return !!t.slotKey && ((e = ee[t.slotKey]) == null ? void 0 : e.active) && ((a = ee[t.slotKey]) == null ? void 0 : a.phase) === "generating";
  }), ve = _.some((t) => {
    var e, a;
    return !!t.slotKey && ((e = ee[t.slotKey]) == null ? void 0 : e.active) && ((a = ee[t.slotKey]) == null ? void 0 : a.phase) === "thinking";
  }), xe = (t) => ({
    card: t,
    config: A,
    onApprove: ie(t.stage) ? () => Re(t.id) : void 0,
    onReject: ie(t.stage) ? () => I(t.id) : void 0,
    onCycleTrust: () => ae(t.id),
    onCycleDepth: () => De(t.id),
    onInterject: (e, a) => oe(t.id, t.stage, e, a),
    onResolveDecision: (e, a) => he(t.id, e, a)
  });
  return /* @__PURE__ */ n(rt, { children: [
    /* @__PURE__ */ r(ut, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    b && /* @__PURE__ */ r(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (t) => {
          t.currentTarget === t.target && k(!1);
        },
        children: /* @__PURE__ */ n(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "agent-sessions-title",
            className: "flex flex-col rounded-xl overflow-hidden",
            style: { width: "min(680px, calc(100vw - 32px))", maxHeight: "min(76vh, 680px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" },
            children: [
              /* @__PURE__ */ n("header", { className: "flex items-start gap-4 px-5 py-4", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ n("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ r("h2", { id: "agent-sessions-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agent sessions" }),
                    /* @__PURE__ */ r("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: _.length })
                  ] }),
                  /* @__PURE__ */ r("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "Live activity from enabled chats linked to pipeline cards." })
                ] }),
                /* @__PURE__ */ r(
                  "button",
                  {
                    onClick: () => k(!1),
                    "aria-label": "Close agent sessions",
                    className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                    style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ r("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: _.length === 0 ? /* @__PURE__ */ r("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : _.map((t) => {
                const e = t.slotKey ? ee[t.slotKey] : void 0;
                return /* @__PURE__ */ n(
                  "div",
                  {
                    className: "rounded-lg px-3 py-2.5",
                    style: { background: t.responsePending ? "color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))" : "var(--bg, transparent)", border: "1px solid var(--border)" },
                    children: [
                      /* @__PURE__ */ n("div", { className: "flex items-center gap-2 text-[11px] min-w-0", children: [
                        /* @__PURE__ */ r(
                          "span",
                          {
                            className: t.status === "pending" || t.responsePending ? "inline-block animate-pulse flex-shrink-0" : "inline-block flex-shrink-0",
                            style: { width: 7, height: 7, borderRadius: 999, background: t.stale ? "var(--warn)" : t.responsePending || t.status === "pending" ? "var(--accent)" : "var(--muted)" }
                          }
                        ),
                        /* @__PURE__ */ r("span", { className: "font-semibold flex-shrink-0", style: { color: "var(--accent)" }, title: t.sessionName || void 0, children: t.agent }),
                        /* @__PURE__ */ n("span", { className: "truncate", style: { color: "var(--muted)" }, children: [
                          "· ",
                          t.step
                        ] }),
                        /* @__PURE__ */ r("span", { className: "ml-auto truncate max-w-[220px]", style: { color: "var(--text, var(--muted))" }, title: t.card, children: t.card }),
                        /* @__PURE__ */ r("span", { className: "flex-shrink-0", style: { color: t.responsePending ? "var(--warn)" : t.status === "pending" ? "var(--ok)" : "var(--muted)" }, children: t.responsePending ? "response" : t.status }),
                        t.stale && /* @__PURE__ */ r("span", { style: { color: "var(--warn)" }, title: "stale — will be reclaimed", children: "↻" })
                      ] }),
                      (e == null ? void 0 : e.active) && e.phase === "thinking" && /* @__PURE__ */ n("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                        /* @__PURE__ */ r(tt, { size: 13 }),
                        /* @__PURE__ */ r("span", { children: "Thinking" })
                      ] }),
                      (e == null ? void 0 : e.active) && e.phase === "generating" && e.tail && /* @__PURE__ */ n("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                        /* @__PURE__ */ r("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                        /* @__PURE__ */ n("span", { className: "font-mono text-[11px] truncate", children: [
                          "Generating · …",
                          e.tail
                        ] })
                      ] }),
                      t.slotKey && /* @__PURE__ */ n(
                        "button",
                        {
                          className: "mt-2 ml-4 font-mono",
                          style: { color: "var(--muted)", fontSize: 10, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
                          title: `Copy openable slot ${t.slotKey} (${t.sessionName || t.sessionKey}); open it from Chats`,
                          onClick: () => {
                            var a;
                            try {
                              (a = navigator.clipboard) == null || a.writeText(t.slotKey || "");
                            } catch {
                            }
                          },
                          children: [
                            "copy ",
                            t.slotKey.slice(0, 18)
                          ]
                        }
                      )
                    ]
                  },
                  `${t.card}:${t.step}`
                );
              }) }),
              /* @__PURE__ */ r("footer", { className: "px-5 py-3 text-[10px]", style: { color: "var(--muted)", borderTop: "1px solid var(--border)" }, children: "Thinking and text tails come directly from live dashboard events. Terminal turns stay linked until chat is explicitly disabled." })
            ]
          }
        )
      }
    ),
    V && /* @__PURE__ */ r(
      et,
      {
        candidates: Y,
        existingRepos: new Set(v.map((t) => t.repo)),
        defaults: A,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: D,
        onCreate: me,
        onClose: () => X(!1)
      }
    ),
    G && /* @__PURE__ */ r(
      et,
      {
        candidates: Y,
        existingRepos: new Set(v.map((t) => t.repo)),
        defaults: A,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: D,
        editPipeline: v.find((t) => t.repo === G) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + G, repo: G, source: "manual", trust: A.trust, depth: A.depth, backlog_intake: !0, sot: "github", steps: Ee.map((t) => ({ ...t })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: g.filter((t) => {
          var e;
          return (((e = t.source) == null ? void 0 : e.repo) || "unlinked") === G;
        }).length,
        isExample: at.has(G),
        onCreate: me,
        onDelete: Je,
        onClose: () => z(null)
      }
    ),
    /* @__PURE__ */ n("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ r(kt, { steps: K, cardsByStage: _e, onNodeClick: Ie }),
      /* @__PURE__ */ n("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5", children: [
        /* @__PURE__ */ r(Fe, { label: "Active", value: String(Be), accent: !0 }),
        /* @__PURE__ */ r(Fe, { label: "Gated", value: String(ze) }),
        /* @__PURE__ */ r(Fe, { label: "Done", value: String(We) }),
        /* @__PURE__ */ r(Fe, { label: "Parked", value: String(Le) })
      ] }),
      /* @__PURE__ */ n("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ r(
          St,
          {
            repos: N,
            selected: S,
            onToggle: Xe,
            onClear: Ne,
            onAddWorkspace: $e,
            onEdit: z
          }
        ),
        /* @__PURE__ */ n("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ n("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ r(wt, { active: T, onChange: f, counts: Ge }),
            /* @__PURE__ */ n(
              "button",
              {
                onClick: () => k(!0),
                "aria-haspopup": "dialog",
                "aria-expanded": b,
                className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Open enabled agent sessions and see live activity",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: ge || ve || _.some((t) => t.status === "pending" || t.responsePending) ? "var(--accent)" : "var(--muted)" },
                children: [
                  ve ? /* @__PURE__ */ r(tt, { size: 11 }) : /* @__PURE__ */ r(
                    "span",
                    {
                      className: ge || _.some((t) => t.status === "pending" || t.responsePending) ? "inline-block animate-pulse" : "inline-block",
                      style: { width: 7, height: 7, borderRadius: 999, background: ge ? "var(--ok)" : _.some((t) => t.responsePending) ? "var(--warn)" : _.some((t) => t.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: _.length ? 1 : 0.5 }
                    }
                  ),
                  /* @__PURE__ */ r("span", { className: "font-semibold", children: _.length ? `${_.length} session${_.length === 1 ? "" : "s"}` : "no sessions" }),
                  ve && /* @__PURE__ */ r("span", { children: "· thinking" }),
                  ge && /* @__PURE__ */ r("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                  !ve && !ge && _.filter((t) => t.status === "pending").length > 0 && /* @__PURE__ */ n("span", { children: [
                    "· ",
                    _.filter((t) => t.status === "pending").length,
                    " running"
                  ] }),
                  _.some((t) => t.responsePending) && /* @__PURE__ */ r("span", { style: { color: "var(--warn)" }, children: "· response" }),
                  _.some((t) => t.stale) && /* @__PURE__ */ n("span", { style: { color: "var(--warn)" }, children: [
                    "· ",
                    _.filter((t) => t.stale).length,
                    " stale ↻"
                  ] })
                ]
              }
            ),
            S.size > 0 && /* @__PURE__ */ n(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  S.size === 1 ? [...S][0] : `${S.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ r("button", { onClick: Ne, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ r(Nt, { config: A, onSet: E }),
          u ? /* @__PURE__ */ r("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : T === "backlog" ? /* @__PURE__ */ r(_t, { cards: p }) : /* @__PURE__ */ n("div", { ref: J, className: "flex gap-3 overflow-x-auto pb-4", children: [
            T === "pipeline" && K.map((t) => /* @__PURE__ */ r(qe, { id: `stage-col-${t.id}`, title: t.name, count: (_e[t.id] || []).length, children: (_e[t.id] || []).map((e) => /* @__PURE__ */ r(Ue, { ...xe(e) }, e.id)) }, t.id)),
            T === "workspace" && Object.entries(Oe).map(([t, e]) => /* @__PURE__ */ r(qe, { title: t, count: e.length, children: e.map((a) => /* @__PURE__ */ r(Ue, { ...xe(a) }, a.id)) }, t)),
            T === "crew" && Object.entries(je).map(([t, e]) => /* @__PURE__ */ r(qe, { title: t, count: e.length, children: e.map((a) => /* @__PURE__ */ r(Ue, { ...xe(a) }, a.id)) }, t)),
            T === "status" && Object.entries(Me).map(([t, e]) => /* @__PURE__ */ r(qe, { title: t, count: e.length, children: e.map((a) => /* @__PURE__ */ r(Ue, { ...xe(a) }, a.id)) }, t))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  Lt as default
};
