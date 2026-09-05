import { jsxs as s, Fragment as ut, jsx as e } from "react/jsx-runtime";
import { useAppApi as wt, useNavigate as Nt, useChatLauncher as _t } from "@kirocrew/app-sdk";
import { PageHeader as St, StatCard as Xe } from "@kirocrew/app-sdk/ui";
import { useState as M, useRef as ue, useCallback as le, useMemo as ve, useEffect as je } from "react";
const Ct = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), $t = /^[.,!?;:%)\]}]$/u, Rt = /^[(\[{]$/u;
function Tt(r, a = 3) {
  const c = (String(r || "").match(Ct) || []).slice(-Math.max(0, a));
  return c.reduce((p, h, x) => {
    if (x === 0) return h;
    const m = c[x - 1];
    return $t.test(h) || Rt.test(m) ? p + h : p + " " + h;
  }, "");
}
function ot(r, a = !1) {
  return r != null && r.active && !a ? r : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function At(r, a, d) {
  if (!a || r != null && r.active && Number.isFinite(d) && Number.isFinite(r.seq) && d <= r.seq)
    return r;
  const p = ((r != null && r.active ? r.buffer : "") + a).slice(-512);
  return { buffer: p, tail: Tt(p, 3), active: !0, phase: "generating", seq: Number(d) || 0 };
}
function Lt(r) {
  return r && { ...r, active: !1, phase: "idle" };
}
const jt = /* @__PURE__ */ new Set(["done", "advanced"]), Et = /* @__PURE__ */ new Set([
  "done",
  "advanced",
  "completed",
  "consumed",
  "integrated",
  "waived",
  "omitted"
]), be = (r) => !!r && typeof r == "object" && !Array.isArray(r), L = (r) => be(r) ? r : {}, Z = (r) => Array.isArray(r) ? r : r == null ? [] : [r], _ = (...r) => r.find((a) => a != null && a !== "");
function Ce(r) {
  if (r == null || r === "") return "unobservable";
  if (typeof r == "boolean") return r ? "yes" : "no";
  if (typeof r == "string" || typeof r == "number") return String(r);
  if (Array.isArray(r)) return r.length ? r.map(Ce).join(" · ") : "none";
  if (be(r)) {
    const a = Object.entries(r);
    return a.length ? a.map(([d, c]) => `${d}: ${Ce(c)}`).join(" · ") : "none";
  }
  return String(r);
}
function _e(r) {
  return Z(r).map((a, d) => {
    if (!be(a))
      return { key: `item-${d}`, title: Ce(a), detail: null, status: null, level: null, ref: null, url: null };
    const c = _(
      a.title,
      a.label,
      a.name,
      a.requirement,
      a.question,
      a.check,
      a.kind,
      a.id,
      a.path,
      a.ref
    ) || `item ${d + 1}`, p = _(
      a.summary,
      a.detail,
      a.description,
      a.rationale,
      a.result,
      a.note,
      a.reason,
      a.path,
      a.ref
    ), h = _(
      a.enforcement,
      a.level,
      a.priority,
      a.required === !0 ? "required" : void 0
    ), x = _(
      a.status,
      a.outcome,
      a.state,
      a.passed === !0 ? "passed" : void 0,
      a.passed === !1 ? "failed" : void 0
    ), m = _(a.url, a.path, a.ref), v = typeof m == "string" && /^https?:\/\//.test(m) ? m : null;
    return {
      key: String(_(a.id, a.key, a.path, a.ref, `item-${d}`)),
      title: String(c),
      detail: p == null || String(p) === String(c) ? null : Ce(p),
      status: x == null ? null : String(x),
      level: h == null ? null : String(h),
      ref: m == null ? null : String(m),
      url: v
    };
  });
}
function qt(r) {
  return Z(r).filter((a) => a != null).map((a, d) => {
    const c = L(a), p = be(a) ? _(c.url, c.path, c.ref, c.id) : String(a), h = be(a) ? _(c.label, c.name, c.kind, c.id, c.path, c.ref, `artifact ${d + 1}`) : String(a), x = _(c.url, typeof p == "string" && /^https?:\/\//.test(p) ? p : void 0), m = _(c.preview, c.summary, c.description, c.evidence, c.detail);
    return {
      key: String(_(c.id, c.path, c.ref, `artifact-${d}`)),
      label: String(h),
      ref: p == null ? null : String(p),
      url: typeof x == "string" && /^https?:\/\//.test(x) ? x : null,
      preview: m == null ? null : Ce(m),
      kind: c.kind == null ? null : String(c.kind),
      status: c.status == null ? null : String(c.status)
    };
  });
}
function Ot(r) {
  return Z(r.children).map((d, c) => {
    const p = L(d), h = p.required !== !1 && !["optional", "preferred", "advisory"].includes(
      String(_(p.enforcement, p.level, "required")).toLowerCase()
    ), x = String(_(p.status, p.state, "unobservable"));
    return {
      key: String(_(p.id, p.card_id, p.issue, `child-${c}`)),
      label: String(_(p.title, p.name, p.card_id, p.id, p.issue, `child ${c + 1}`)),
      required: h,
      status: x,
      complete: Et.has(x.toLowerCase())
    };
  });
}
const mt = /* @__PURE__ */ new Set([
  "done",
  "completed",
  "covered",
  "satisfied",
  "validated",
  "met",
  "passed",
  "approved"
]);
function It(r, a) {
  const d = L(r == null ? void 0 : r.execution_envelope);
  return d.step === a ? d : Z(r == null ? void 0 : r.execution_envelope_history).map(L).reverse().find((c) => c.step === a) || {};
}
function gt(r) {
  return typeof r == "string" ? r.trim().length > 0 : be(r) ? [
    "ref",
    "id",
    "url",
    "path",
    "artifact_id",
    "artifact_ref",
    "evidence_refs",
    "requirement_refs",
    "design_refs",
    "task_refs",
    "refs"
  ].some((a) => r[a] !== void 0 && r[a] !== null && r[a] !== "" && (!Array.isArray(r[a]) || r[a].length > 0)) : !1;
}
function lt(r, a) {
  const d = Z(r.validation_and_evidence).map(L);
  return Z(a).map(String).filter((c) => !d.some((p) => {
    const h = String(_(p.kind, p.type, p.id, "")).toLowerCase(), x = String(_(p.status, "")).toLowerCase();
    return (h === c.toLowerCase() || Z(p.satisfies).map(String).includes(c)) && mt.has(x) && gt(p);
  }));
}
function Mt(r, a) {
  const d = Z(r.findings).map(L);
  if (!d.length) return !1;
  if (!a) return !0;
  const c = Z(_(r.sources, r.consulted_sources)).map(L).filter((h) => typeof h.url == "string" && /^https?:\/\//.test(h.url) && h.title && h.accessed_at && _(h.source_type, h.type)), p = new Set(c.flatMap((h) => [h.id && String(h.id), h.url]).filter(Boolean));
  return p.size > 0 && d.every((h) => {
    const x = Z(_(h.source_ids, h.sources)).map(String);
    return h.claim && x.some((m) => p.has(m));
  });
}
function Dt(r, a, d, c) {
  const p = L(r == null ? void 0 : r.intent_integrity), h = p.status === "violation" ? [`intent integrity (${Z(p.violations).join(", ")})`] : [], x = It(r, a), m = Z(L(x.observations).controls_runtime);
  if (Number(x.schema_version || 0) < 2 || !m.includes("result_scope"))
    return { missing: h, preferredShortfalls: [] };
  const v = [...h], R = [];
  d.envelope_id !== x.id && v.push("result bound to the active envelope revision");
  const u = Z(r == null ? void 0 : r.decisions).map(L).filter((g) => g.step && g.step !== a || g.envelope_id && g.envelope_id !== x.id ? !1 : g.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(g.kind)), q = u.filter((g) => {
    const Q = String(_(g.status, "")).toLowerCase();
    return g.chosen === void 0 && g.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(Q);
  }), b = L(x.questions);
  q.length && v.push("all qualified questions resolved before completion"), q.length > 1 && b.cadence === "one-at-a-time" && v.push("one-at-a-time question cadence"), Number.isInteger(b.max_rounds) && u.length > b.max_rounds && v.push(`question rounds within max_rounds=${b.max_rounds}`);
  const B = L(x.result_scope), K = L(B.enforcement), A = new Map(Z(c.intent_and_requirement_coverage).map(L).filter((g) => _(g.intent_id, g.constraint_id, g.id)).map((g) => [String(_(g.intent_id, g.constraint_id, g.id)), g]));
  for (const g of [...Z(B.required_outcome_ids), ...Z(B.hard_constraint_ids)]) {
    const Q = A.get(String(g)) || {}, re = String(_(Q.status, "")).toLowerCase(), ne = Z(_(Q.evidence_refs, Q.requirement_refs, Q.refs));
    (!mt.has(re) || !ne.some(gt)) && v.push(`required intent coverage ${g}`);
  }
  const T = Z(c.alternatives);
  if (Number.isInteger(B.alternatives) && T.length < B.alternatives) {
    const g = `${B.alternatives} material alternatives`;
    K.alternatives === "required" ? v.push(g) : K.alternatives === "preferred" && R.push(g);
  }
  const V = lt(c, B.evidence), j = lt(c, B.validation);
  K.evidence === "required" ? v.push(...V.map((g) => `required evidence ${g.toLowerCase()}`)) : K.evidence === "preferred" && R.push(...V.map((g) => `preferred evidence ${g.toLowerCase()}`)), K.validation === "required" ? v.push(...j.map((g) => `required validation ${g.toLowerCase()}`)) : K.validation === "preferred" && R.push(...j.map((g) => `preferred validation ${g.toLowerCase()}`));
  const D = L(x.research_policy), S = L(r == null ? void 0 : r.research_artifacts)[a], C = Z(_(c.research_and_citations, S)).map(L), z = C.filter((g) => Mt(
    g,
    D.citations === "required"
  ));
  return D.mode === "required" && !z.length && v.push("required research with claim-level citations"), Number.isInteger(D.max_passes) && C.length > D.max_passes && v.push(`research passes within max_passes=${D.max_passes}`), D.mode === "on-demand" && C.length && !z.length && R.push("complete citations for used research"), {
    missing: [...new Set(v)],
    preferredShortfalls: [...new Set(R)]
  };
}
function Bt(r, a, d) {
  const c = L(r.runtime_handshakes), p = L(r.runtime_handshake), h = L(c[a] || (p.step == null || p.step === a ? p : {})), x = L(h.assignment), m = L(h.capabilities), v = L(m.tools), R = L(m.skills), u = L(h.routing), q = L(u.model), b = L(u.reasoning_effort), B = L(h.scope), K = L(B.worktree), A = L(d.routing_and_provenance), T = L(A.model), V = L(A.reasoning_effort), j = L(A.assignment), D = _(v.profile_declared, v.declared, A.declared_tools), S = _(v.actual, A.actual_tools), C = _(R.profile_declared, R.declared, A.declared_skills), z = _(R.actual, A.actual_skills);
  return {
    assignedProfile: _(
      j.assigned_profile,
      A.assigned_profile,
      x.assigned_profile
    ) ?? null,
    effectiveProfile: _(
      j.effective_profile,
      A.effective_profile,
      x.effective_profile
    ) ?? null,
    model: {
      requested: _(T.requested, A.requested_model, q.requested) ?? null,
      applied: _(T.applied, A.applied_model, q.applied) ?? null,
      provider: _(T.provider, A.resolved_provider, q.provider) ?? null,
      version: _(T.version, A.model_version, q.version) ?? null,
      status: _(
        T.status,
        A.model_resolution_status,
        q.status,
        _(T.applied, A.applied_model, q.applied) != null ? "observed" : "unobservable"
      )
    },
    effort: {
      requested: _(V.requested, A.requested_effort, b.requested) ?? null,
      applied: _(V.applied, A.applied_effort, b.applied) ?? null,
      status: _(
        V.status,
        A.effort_resolution_status,
        b.status,
        _(V.applied, A.applied_effort, b.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: D == null ? null : Z(D),
      actual: S == null ? null : Z(S),
      status: _(v.status, A.tools_status, S != null ? "observed" : "unobservable")
    },
    skills: {
      declared: C == null ? null : Z(C),
      actual: z == null ? null : Z(z),
      status: _(R.status, A.skills_status, z != null ? "observed" : "unobservable")
    },
    network: L(B.network),
    write: L(B.write),
    worktree: Object.keys(K).length ? K : null
  };
}
function zt(r, a) {
  const d = L(r == null ? void 0 : r.gate_review), c = L(d.bundle), p = _(d.gate, r == null ? void 0 : r.stage), h = _(d.producer_step, a), x = L(r == null ? void 0 : r.step_sessions), m = Number.isInteger(d.result_revision) ? d.result_revision : null, v = _(d.status, "unobservable"), R = h ? L(r == null ? void 0 : r.step_status)[h] : void 0, u = qt(c.artifacts), q = L(c.card_topology), b = Ot(q), B = _(q.action, "unobservable"), K = ["fan-in", "unify"].includes(String(B).toLowerCase()), A = K ? b.filter((z) => z.required && !z.complete) : [], T = [];
  (!(r != null && r.gate_review) || !be(r.gate_review)) && T.push("result bundle record"), (!d.bundle || !be(d.bundle)) && T.push("declared result bundle"), h || T.push("producer binding"), m === null && T.push("result revision"), p && (r != null && r.stage) && p !== r.stage && T.push("gate binding matches current stage"), v !== "awaiting-review" && T.push(`review status awaiting-review (currently ${v})`), jt.has(String(R || "").toLowerCase()) || T.push(`terminal producer status (currently ${R || "unobservable"})`), _(c.summary) || T.push("result summary"), u.length === 0 && T.push("referenced artifact");
  const V = u.filter((z) => !z.ref);
  V.length > 0 && T.push(`artifact reference (${V.length} missing)`), K && b.length === 0 && T.push("declared fan-in child set"), A.length > 0 && T.push(`required child fan-in (${A.length} incomplete)`);
  const j = Dt(r, h, d, c);
  T.push(...j.missing);
  const D = Z(r == null ? void 0 : r.decisions).filter((z) => {
    const g = L(z);
    return !g.chosen && (!h || !g.step || g.step === h);
  }), S = _e([
    ...Z(c.decisions_and_questions),
    ...D
  ]), C = Bt(r || {}, h, c);
  return {
    gate: p || null,
    producerStep: h || null,
    producerSessionRef: _(
      d.producer_session_ref,
      h && be(x[h]) ? `step_sessions.${h}` : void 0
    ) || null,
    envelopeId: _(d.envelope_id) || null,
    revision: m,
    reviewStatus: v,
    createdAt: _(d.created_at) || null,
    ready: T.length === 0,
    missing: T,
    summary: _(c.summary) || null,
    changes: _e(c.changes_since_prior),
    artifacts: u,
    coverage: _e(c.intent_and_requirement_coverage),
    alternatives: _e(c.alternatives),
    research: _e(_(
      c.research_and_citations,
      h && L(r == null ? void 0 : r.research_artifacts)[h]
    )),
    preferredShortfalls: j.preferredShortfalls,
    decisions: S,
    topology: {
      action: B,
      integrationOwner: _(q.integration_owner, q.owner) || null,
      integrationStatus: _(q.integration_status, q.status) || null,
      children: b,
      incompleteRequiredChildren: A
    },
    budget: {
      allocated: L(c.budget).allocated ?? null,
      consumed: L(c.budget).consumed ?? null,
      remaining: L(c.budget).remaining ?? null
    },
    routing: C,
    validation: _e(c.validation_and_evidence),
    risks: _e(c.known_risks),
    deviations: _e(c.omissions_and_deviations)
  };
}
const Wt = "~/.dlc-yolo/state.json", it = "/tmp/dlc-yolo/state.json";
let he = Wt;
const dt = (r) => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
})[r], Qe = [
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
], ht = /* @__PURE__ */ new Set([
  "hai-dvash/webapp",
  "hai-dvash/dashboard",
  "hai-dvash/api-core"
]), Gt = {
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
}, Ee = ["manual", "assisted", "autonomous"], Me = ["quick", "standard", "deep"], Fe = { trust: "assisted", depth: "standard" }, et = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, tt = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Le({ color: r, children: a, title: d, onClick: c, active: p }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      title: d,
      onClick: c,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: r,
        background: `color-mix(in srgb, ${r} 14%, transparent)`,
        boxShadow: p ? `inset 0 0 0 1px color-mix(in srgb, ${r} 55%, transparent)` : "none",
        opacity: c && !p ? 0.85 : 1,
        cursor: c ? "pointer" : "default"
      },
      children: a
    }
  );
}
const Ye = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Ft({ steps: r, cardsByStage: a, onNodeClick: d }) {
  const c = ue(null), p = ue(null), h = ue(0), x = ue(null), m = ue(r), v = ue(a), R = ue([]);
  m.current = r, v.current = a;
  const u = 3, q = 116, b = q / u, B = b - 26, [K, A] = M(880);
  je(() => {
    const j = p.current;
    if (!j) return;
    const D = new ResizeObserver((S) => {
      const C = Math.max(360, Math.floor(S[0].contentRect.width));
      A(C);
    });
    return D.observe(j), () => D.disconnect();
  }, []);
  const T = (j) => j.type === "gate" || j.id.startsWith("gate-");
  return je(() => {
    const j = c.current;
    if (!j) return;
    const D = Math.floor(K / u);
    j.width = D * u, j.height = b * u;
    const S = j.getContext("2d");
    if (!S) return;
    const C = (Q, re, ne, se, oe) => {
      S.fillStyle = oe, S.fillRect(Q * u, re * u, ne * u, se * u);
    }, z = () => {
      const Q = h.current, re = m.current, ne = v.current, se = Math.max(1, re.length);
      Math.max(1, ...re.map((y) => {
        var E;
        return ((E = ne[y.id]) == null ? void 0 : E.length) || 0;
      })), C(0, 0, D, B, "#0f172a");
      for (let y = 0; y < D / 5; y++) {
        const E = y * 37 % D, W = y * 13 % (B - 4);
        Math.sin(Q * 0.03 + y * 2.1) > 0.35 && C(E, W, 1, 1, "#e2e8f0");
      }
      C(D - 26, 8, 10, 10, "#fde68a"), C(D - 24, 7, 8, 8, "#0f172a");
      for (let y = 0; y < D; y += 16)
        for (let E = B; E < b; E += 16)
          C(y, E, 16, 16, y / 16 + E / 16 & 1 ? "#33261a" : "#2a1f14");
      C(0, B - 2, D, 2, "#4a3520");
      const oe = D / se, $ = [];
      for (let y = 0; y < re.length; y++) {
        const E = re[y], W = Math.round(oe * (y + 0.5)), ee = (ne[E.id] || []).length, H = ee > 0, te = Ye[y % Ye.length], fe = T(E), de = B - 2;
        if ($.push({ x: W - Math.floor(oe / 2), w: Math.floor(oe), id: E.id }), y < re.length - 1) {
          const Y = Math.round(oe * (y + 1.5));
          for (let P = W + 8; P < Y - 8; P += 4) C(P, B - 1, 2, 1, "#4a3520");
        }
        if (fe) {
          const Y = de - 20, P = H ? "#f39c12" : "#3a3222";
          C(W - 3, Y, 6, 20, H ? "#5c4a2a" : "#2a2418");
          for (let U = 0; U < 5; U++) C(W - U, Y - 5 + U, U * 2 + 1, 1, P);
          for (let U = 0; U < 5; U++) C(W - (4 - U), Y - U, (4 - U) * 2 + 1, 1, P);
          if (H) {
            const U = (Math.sin(Q * 0.08) + 1) / 2;
            S.globalAlpha = 0.35 + U * 0.4, C(W - 1, Y - 6, 2, 2, "#ffd27a"), S.globalAlpha = 1;
          }
        } else {
          const Y = de - 14;
          if (C(W - 10, Y, 20, 3, "#7a5c47"), C(W - 10, Y - 1, 20, 1, te), C(W - 9, Y + 3, 2, 8, "#5c4033"), C(W + 7, Y + 3, 2, 8, "#5c4033"), C(W - 5, Y - 9, 10, 9, "#333"), C(W - 4, Y - 8, 8, 7, H ? "#0a2a0a" : "#1a1a1a"), H)
            for (let P = 0; P < 3; P++) {
              const U = 2 + (Q + P * 7) % 5;
              C(W - 3, Y - 7 + P * 2, U, 0.8, "#33ff33");
            }
        }
        const ye = Math.min(ee, 5);
        for (let Y = 0; Y < ye; Y++) {
          const P = ye > 1 ? (Y - (ye - 1) / 2) * 8 : 0, U = Math.round(W + P) - 3, ce = de - (fe ? 2 : 4), ke = Ye[(y + Y) % Ye.length], ge = Math.sin(Q * 0.08 + y + Y) > 0 ? 1 : 0;
          S.fillStyle = "rgba(0,0,0,0.18)", S.fillRect(U * u, (ce + 8) * u, 6 * u, u), C(U, ce + ge, 6, 6, ke), C(U + 1, ce - 4 + ge, 4, 4, "#fdd"), C(U + 1, ce - 5 + ge, 4, 1, "#333"), (Q + y * 9 + Y * 5) % 120 >= 3 && (C(U + 2, ce - 3 + ge, 1, 1, "#333"), C(U + 4, ce - 3 + ge, 1, 1, "#333")), C(U + 1, ce + 6, 1, 2, ke), C(U + 4, ce + 6, 1, 2, ke);
        }
        ee > 5 && (S.fillStyle = te, S.font = `${3 * u}px monospace`, S.fillText(`+${ee - 5}`, (W + 10) * u, (de - 6) * u)), ee > 0 && (S.fillStyle = te, S.fillRect((W + 6) * u, (de - 30) * u, 9 * u, 9 * u), S.fillStyle = "#0f172a", S.font = `bold ${5 * u}px monospace`, S.textAlign = "center", S.fillText(String(ee), (W + 10.5) * u, (de - 24) * u), S.textAlign = "left"), S.fillStyle = H ? "#e2e8f0" : "#6b7280", S.font = `${3.4 * u}px monospace`, S.textAlign = "center";
        const me = E.name.length > 12 ? E.name.slice(0, 11) + "…" : E.name;
        S.fillText(me, W * u, (b - 4) * u), S.textAlign = "left";
      }
      R.current = $;
      const f = re.reduce((y, E) => {
        var W;
        return y + (((W = ne[E.id]) == null ? void 0 : W.length) || 0);
      }, 0);
      S.fillStyle = "#f90", S.font = `bold ${3.6 * u}px monospace`, S.fillText(`${f} card${f !== 1 ? "s" : ""} · ${se} milestone${se !== 1 ? "s" : ""}`, 4 * u, 8 * u);
    }, g = () => {
      h.current++, z(), x.current = requestAnimationFrame(g);
    };
    return x.current = requestAnimationFrame(g), () => {
      x.current && cancelAnimationFrame(x.current);
    };
  }, [K, b, B]), /* @__PURE__ */ e("div", { ref: p, className: "w-full mb-5", children: /* @__PURE__ */ e(
    "canvas",
    {
      ref: c,
      onClick: (j) => {
        const D = c.current;
        if (!D) return;
        const S = D.getBoundingClientRect(), C = (j.clientX - S.left) / S.width * (D.width / u), z = R.current.find((g) => C >= g.x && C <= g.x + g.w);
        z && d(z.id);
      },
      style: {
        width: "100%",
        height: q + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function Kt({ active: r, onChange: a, counts: d }) {
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
      ].map((p) => {
        const h = r === p.id, x = d[p.id];
        return /* @__PURE__ */ s(
          "button",
          {
            onClick: () => a(p.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: h ? "var(--accent)" : "transparent",
              color: h ? "var(--bg)" : "var(--muted)"
            },
            children: [
              p.label,
              x > 0 && /* @__PURE__ */ e(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: h ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: h ? "var(--bg)" : "var(--muted)" },
                  children: x
                }
              )
            ]
          },
          p.id
        );
      })
    }
  );
}
function pe({ title: r, children: a }) {
  return /* @__PURE__ */ s("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ e("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: r }),
    a
  ] });
}
function Se({ rows: r, empty: a = "None recorded" }) {
  return r.length ? /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: r.map((d) => /* @__PURE__ */ s("div", { className: "rounded-md px-2 py-1.5", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)" }, children: [
    /* @__PURE__ */ s("div", { className: "flex items-start gap-2 text-[11px]", children: [
      /* @__PURE__ */ e("span", { className: "font-medium min-w-0 break-words", style: { color: "var(--text)" }, children: d.title }),
      /* @__PURE__ */ s("span", { className: "ml-auto flex gap-1 flex-shrink-0", children: [
        d.level && /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: d.level === "required" ? "var(--warn)" : "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: d.level }),
        d.status && /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: /fail|block|open|pending/i.test(d.status) ? "var(--warn)" : "var(--ok)", background: "var(--bg-hover, var(--border))" }, children: d.status })
      ] })
    ] }),
    d.detail && /* @__PURE__ */ e("div", { className: "mt-0.5 text-[10px] break-words", style: { color: "var(--muted)" }, children: d.detail }),
    d.ref && (d.url ? /* @__PURE__ */ e("a", { href: d.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: d.ref }) : /* @__PURE__ */ e("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: d.ref }))
  ] }, d.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: a });
}
function ae({ label: r, value: a, status: d }) {
  return /* @__PURE__ */ s("div", { className: "min-w-0", children: [
    /* @__PURE__ */ e("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: r }),
    /* @__PURE__ */ s("div", { className: "text-[11px] mt-0.5 break-words", style: { color: Ce(a) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      Ce(a),
      d && /* @__PURE__ */ s("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        Ce(d),
        ")"
      ] })
    ] })
  ] });
}
function Ut({ card: r, inspection: a, producerSession: d, onClose: c, onOpenProducer: p, onApprove: h, onReject: x, onInterject: m }) {
  const v = a.routing, R = () => {
    const u = window.prompt(`Why reject revision ${a.revision ?? "unknown"}?`);
    u != null && u.trim() && x && (x(u.trim()), c());
  };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (u) => {
        u.currentTarget === u.target && c();
      },
      children: /* @__PURE__ */ s(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": `gate-inspection-${r.id}`,
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(860px, calc(100vw - 32px))", maxHeight: "min(88vh, 860px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ s("header", { className: "px-5 py-4 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ s("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ s("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ e("h2", { id: `gate-inspection-${r.id}`, className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Gate result inspection" }),
                  /* @__PURE__ */ e("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: a.ready ? "var(--ok)" : "var(--warn)", background: `color-mix(in srgb, ${a.ready ? "var(--ok)" : "var(--warn)"} 14%, transparent)` }, children: a.ready ? "review-ready" : "not review-ready" }),
                  /* @__PURE__ */ s("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: [
                    "revision ",
                    a.revision ?? "unobservable"
                  ] })
                ] }),
                /* @__PURE__ */ e("div", { className: "text-[12px] mt-1 truncate", style: { color: "var(--text)" }, children: r.title }),
                /* @__PURE__ */ s("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: [
                  a.gate || r.stage,
                  " reviews ",
                  a.producerStep || "unobservable producer",
                  " · status ",
                  a.reviewStatus
                ] })
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  onClick: c,
                  "aria-label": "Close gate inspection",
                  className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                  style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ s("div", { className: "overflow-y-auto p-4 flex flex-col gap-3", children: [
              /* @__PURE__ */ s("div", { className: "rounded-lg p-3", style: { background: a.ready ? "color-mix(in srgb, var(--ok) 8%, transparent)" : "color-mix(in srgb, var(--warn) 8%, transparent)", border: `1px solid color-mix(in srgb, ${a.ready ? "var(--ok)" : "var(--warn)"} 38%, var(--border))` }, children: [
                /* @__PURE__ */ e("div", { className: "text-[11px] font-semibold", style: { color: a.ready ? "var(--ok)" : "var(--warn)" }, children: a.ready ? "Bundle is structurally ready for review" : `${a.missing.length} readiness gap${a.missing.length === 1 ? "" : "s"}` }),
                !a.ready && /* @__PURE__ */ e("ul", { className: "mt-1.5 pl-4 list-disc text-[10px] space-y-0.5", style: { color: "var(--muted)" }, children: a.missing.map((u) => /* @__PURE__ */ e("li", { children: u }, u)) }),
                a.preferredShortfalls.length > 0 && /* @__PURE__ */ s("div", { className: "mt-2 text-[10px]", style: { color: "var(--muted)" }, children: [
                  "Preferred shortfalls (non-blocking): ",
                  a.preferredShortfalls.join(" · ")
                ] }),
                /* @__PURE__ */ e("div", { className: "text-[9px] mt-2", style: { color: "var(--muted)" }, children: "Inspection is read-only; deterministic runtime remains authoritative for movement and readiness enforcement." })
              ] }),
              /* @__PURE__ */ s("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ s(pe, { title: "Result summary", children: [
                  /* @__PURE__ */ e("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: a.summary ? "var(--text)" : "var(--warn)" }, children: a.summary || "No result summary was published." }),
                  /* @__PURE__ */ s("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ e(ae, { label: "Envelope", value: a.envelopeId }),
                    /* @__PURE__ */ e(ae, { label: "Created", value: a.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ e(pe, { title: "Changes since prior revision", children: /* @__PURE__ */ e(Se, { rows: a.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ e(pe, { title: "Artifacts and evidence references", children: a.artifacts.length ? /* @__PURE__ */ e("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: a.artifacts.map((u) => /* @__PURE__ */ s("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ s("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ e("span", { className: "font-medium", style: { color: "var(--text)" }, children: u.label }),
                  u.kind && /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: u.kind })
                ] }),
                u.preview && /* @__PURE__ */ e("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: u.preview }),
                u.ref && (u.url ? /* @__PURE__ */ e("a", { href: u.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: u.ref }) : /* @__PURE__ */ e("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: u.ref }))
              ] }, u.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ s("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(pe, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ e(Se, { rows: a.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ e(pe, { title: "Research and citations", children: /* @__PURE__ */ e(Se, { rows: a.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ s("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(pe, { title: "Intent and requirement coverage", children: /* @__PURE__ */ e(Se, { rows: a.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ e(pe, { title: "Omissions and deviations", children: /* @__PURE__ */ e(Se, { rows: a.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ s(pe, { title: "Card topology and integration", children: [
                /* @__PURE__ */ s("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ e(ae, { label: "Action", value: a.topology.action }),
                  /* @__PURE__ */ e(ae, { label: "Integration owner", value: a.topology.integrationOwner }),
                  /* @__PURE__ */ e(ae, { label: "Integration status", value: a.topology.integrationStatus }),
                  /* @__PURE__ */ e(ae, { label: "Required children incomplete", value: a.topology.incompleteRequiredChildren.length })
                ] }),
                a.topology.children.length > 0 ? /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: a.topology.children.map((u) => /* @__PURE__ */ s("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: u.label }),
                  /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: u.required ? "var(--warn)" : "var(--muted)" }, children: u.required ? "required" : "optional" }),
                  /* @__PURE__ */ e("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(u.status) ? "var(--ok)" : "var(--warn)" }, children: u.status })
                ] }, u.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ s("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(pe, { title: "Budget consumption", children: /* @__PURE__ */ s("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ e(ae, { label: "Allocated", value: a.budget.allocated }),
                  /* @__PURE__ */ e(ae, { label: "Consumed", value: a.budget.consumed }),
                  /* @__PURE__ */ e(ae, { label: "Remaining", value: a.budget.remaining })
                ] }) }),
                /* @__PURE__ */ e(pe, { title: "Routing and runtime provenance", children: /* @__PURE__ */ s("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ e(ae, { label: "Assigned profile", value: v.assignedProfile }),
                  /* @__PURE__ */ e(ae, { label: "Effective profile", value: v.effectiveProfile }),
                  /* @__PURE__ */ e(ae, { label: "Model requested", value: v.model.requested }),
                  /* @__PURE__ */ e(ae, { label: "Model applied", value: v.model.applied, status: v.model.status }),
                  /* @__PURE__ */ e(ae, { label: "Provider / version", value: v.model.provider || v.model.version ? [v.model.provider, v.model.version].filter(Boolean) : null }),
                  /* @__PURE__ */ e(ae, { label: "Effort requested", value: v.effort.requested }),
                  /* @__PURE__ */ e(ae, { label: "Effort applied", value: v.effort.applied, status: v.effort.status }),
                  /* @__PURE__ */ e(ae, { label: "Tools available", value: v.tools.actual, status: v.tools.status }),
                  /* @__PURE__ */ e(ae, { label: "Skills available", value: v.skills.actual, status: v.skills.status }),
                  /* @__PURE__ */ e(ae, { label: "Network scope", value: v.network.actual, status: v.network.status }),
                  /* @__PURE__ */ e(ae, { label: "Write scope", value: v.write.actual, status: v.write.status }),
                  /* @__PURE__ */ e(ae, { label: "Worktree / branch", value: v.worktree })
                ] }) })
              ] }),
              /* @__PURE__ */ s("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ e(pe, { title: "Validation and evidence", children: /* @__PURE__ */ e(Se, { rows: a.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ e(pe, { title: "Known risks", children: /* @__PURE__ */ e(Se, { rows: a.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ e(pe, { title: "Open decisions and questions", children: /* @__PURE__ */ e(Se, { rows: a.decisions, empty: "No open decisions recorded" }) })
              ] })
            ] }),
            /* @__PURE__ */ s("footer", { className: "px-5 py-3 flex items-center gap-2 flex-wrap", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              h && /* @__PURE__ */ s("button", { onClick: () => {
                h(), c();
              }, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--ok)", color: "var(--bg)" }, children: [
                "Approve",
                a.revision != null ? ` r${a.revision}` : ""
              ] }),
              x && /* @__PURE__ */ s("button", { onClick: R, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--danger)", color: "var(--bg)" }, children: [
                "Reject",
                a.revision != null ? ` r${a.revision}` : ""
              ] }),
              m && /* @__PURE__ */ e("button", { onClick: m, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: "Interject on this revision" }),
              d && p && /* @__PURE__ */ s("button", { onClick: p, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: [
                "Open producer · ",
                d.step
              ] }),
              /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: a.producerSessionRef || "producer session reference unobservable" })
            ] })
          ]
        }
      )
    }
  );
}
function Je({ card: r, config: a, isGate: d, producerStep: c, producerSession: p, onOpenProducer: h, onApprove: x, onReject: m, onCycleTrust: v, onCycleDepth: R, onInterject: u, onResolveDecision: q }) {
  var ne, se, oe;
  const b = d ? "var(--warn)" : "var(--border-strong, var(--border))", B = r.trust || a.trust, K = r.depth || a.depth, A = ((ne = r.parked) == null ? void 0 : ne.length) || 0, T = Object.values(r.step_sessions || {}).some(
    ($) => !!$.last_response_at && !$.chat_disabled_at && !$.superseded && (!$.last_response_handled_at || $.last_response_handled_at < $.last_response_at)
  ), [V, j] = M(!1), [D, S] = M(""), [C, z] = M(!1), g = ve(
    () => d ? zt(r, c) : null,
    [r, d, c]
  ), Q = () => {
    const $ = window.prompt(`Why reject revision ${(g == null ? void 0 : g.revision) ?? "unknown"}?`);
    $ != null && $.trim() && m && m($.trim());
  }, re = (r.decisions || []).filter(($) => !$.chosen && ($.action === "add-addendum" || $.options));
  return /* @__PURE__ */ s(
    "div",
    {
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${b}`
      },
      children: [
        /* @__PURE__ */ e("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: r.title }),
        ((se = r.source) == null ? void 0 : se.repo) && /* @__PURE__ */ s(
          "a",
          {
            href: r.source.url || void 0,
            target: "_blank",
            rel: "noreferrer",
            className: "text-[11px] mt-0.5 inline-block truncate max-w-full hover:underline",
            style: { color: "var(--muted)" },
            children: [
              r.source.repo,
              r.source.issue ? `#${r.source.issue}` : ""
            ]
          }
        ),
        /* @__PURE__ */ s("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ e(
            Le,
            {
              color: et[B],
              active: !!r.trust,
              onClick: v,
              title: `trust: ${B}${r.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: B
            }
          ),
          /* @__PURE__ */ e(
            Le,
            {
              color: tt[K],
              active: !!r.depth,
              onClick: R,
              title: `depth: ${K}${r.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: K
            }
          ),
          A > 0 && /* @__PURE__ */ s(Le, { color: "var(--warn)", title: `${A} parked idea(s)`, children: [
            "⏸ ",
            A
          ] }),
          T && /* @__PURE__ */ e(Le, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
          typeof ((oe = r.effort) == null ? void 0 : oe.total) == "number" && r.effort.total > 0 && /* @__PURE__ */ s(Le, { color: "var(--info)", title: `estimated effort: ${r.effort.total} points`, children: [
            "⚡ ",
            r.effort.total
          ] }),
          r.backstep_history && r.backstep_history.length > 0 && /* @__PURE__ */ s(
            Le,
            {
              color: "var(--danger)",
              title: `stepped back ${r.backstep_history.length}× — last: ${r.backstep_history[r.backstep_history.length - 1].reason}`,
              children: [
                "↩ ",
                r.backstep_history.length
              ]
            }
          ),
          r.decisions && r.decisions.length > 0 && (() => {
            const $ = r.decisions[r.decisions.length - 1];
            return /* @__PURE__ */ s(
              Le,
              {
                color: "var(--accent)",
                title: `${r.decisions.length} decision${r.decisions.length === 1 ? "" : "s"} — last: ${$.question || $.kind || ""}${$.action ? ` → ${$.action}` : ""}${$.rationale ? `
${$.rationale}` : ""}`,
                children: [
                  "⚖ ",
                  r.decisions.length
                ]
              }
            );
          })()
        ] }),
        d && g && /* @__PURE__ */ s(
          "div",
          {
            "data-gate-inspection-summary": !0,
            className: "mt-2.5 rounded-md p-2",
            style: { background: g.ready ? "color-mix(in srgb, var(--ok) 7%, transparent)" : "color-mix(in srgb, var(--warn) 7%, transparent)", border: `1px solid color-mix(in srgb, ${g.ready ? "var(--ok)" : "var(--warn)"} 32%, var(--border))` },
            children: [
              /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
                /* @__PURE__ */ e("span", { className: "font-semibold", style: { color: g.ready ? "var(--ok)" : "var(--warn)" }, children: g.ready ? "Review-ready" : "Not review-ready" }),
                /* @__PURE__ */ s("span", { className: "ml-auto", style: { color: "var(--muted)" }, children: [
                  "r",
                  g.revision ?? "?"
                ] }),
                /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: g.reviewStatus })
              ] }),
              /* @__PURE__ */ e("div", { className: "mt-1 text-[11px] leading-snug overflow-hidden", style: { color: g.summary ? "var(--text)" : "var(--warn)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: g.summary || "No review bundle summary published." }),
              !g.ready && /* @__PURE__ */ s("div", { className: "mt-1 text-[9px]", style: { color: "var(--muted)" }, children: [
                g.missing.length,
                " readiness gap",
                g.missing.length === 1 ? "" : "s"
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  type: "button",
                  onClick: () => z(!0),
                  className: "mt-1.5 text-[10px] font-semibold hover:underline",
                  style: { color: "var(--accent)" },
                  children: "Inspect result bundle →"
                }
              )
            ]
          }
        ),
        d && x && m && /* @__PURE__ */ s("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
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
              onClick: Q,
              children: "Reject"
            }
          ),
          p && h && /* @__PURE__ */ s(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
              style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
              onClick: h,
              title: `Open the ${p.step} producer session${p.retained ? " (held for this gate)" : ""}`,
              children: [
                /* @__PURE__ */ e("span", { "aria-hidden": "true", children: "↗" }),
                "Open producer · ",
                p.step
              ]
            }
          ),
          (r.stage === "gate-review" || /review/i.test(r.stage || "")) && (() => {
            var W, X, ee;
            const $ = (W = r.source) == null ? void 0 : W.repo;
            if (!$) return null;
            const f = (X = r.artifacts) == null ? void 0 : X.pr_url, y = f && ((ee = /\/pull\/(\d+)/.exec(f)) == null ? void 0 : ee[1]), E = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + $)}` + (y ? `&pr=${y}` : "");
            return /* @__PURE__ */ s(
              "a",
              {
                href: E,
                title: f ? `Deep-review PR #${y} in Code Review Sage` : `Open Code Review Sage for ${$}`,
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
        q && re.map(($) => /* @__PURE__ */ s(
          "div",
          {
            className: "mt-2 p-1.5 rounded-md text-[11px]",
            style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
            children: [
              /* @__PURE__ */ s("div", { style: { color: "var(--text, var(--muted))" }, children: [
                "⚖ ",
                $.question || $.kind
              ] }),
              /* @__PURE__ */ s("div", { className: "mt-1 flex gap-1.5", children: [
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--ok)", color: "var(--bg)" },
                    onClick: () => q($.id, "approve"),
                    children: "Approve"
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    onClick: () => q($.id, "decline"),
                    children: "Decline"
                  }
                )
              ] })
            ]
          },
          $.id
        )),
        u && (V ? /* @__PURE__ */ s("div", { className: "mt-2 flex flex-col gap-1", children: [
          /* @__PURE__ */ e(
            "textarea",
            {
              value: D,
              onChange: ($) => S($.target.value),
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
                  D.trim() && (u("note", D.trim()), S(""), j(!1));
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
                  j(!1), S("");
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
            onClick: () => j(!0),
            children: "+ interject"
          }
        )),
        C && g && /* @__PURE__ */ e(
          Ut,
          {
            card: r,
            inspection: g,
            producerSession: p,
            onClose: () => z(!1),
            onOpenProducer: h,
            onApprove: x,
            onReject: m,
            onInterject: u ? () => {
              z(!1), j(!0);
            } : void 0
          }
        )
      ]
    }
  );
}
function Ze({ title: r, count: a, children: d, id: c }) {
  return /* @__PURE__ */ s("div", { id: c, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ s("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
      /* @__PURE__ */ e("span", { className: "text-[11px] font-semibold uppercase tracking-wide truncate", style: { color: "var(--muted-strong, var(--muted))" }, children: r }),
      /* @__PURE__ */ e(
        "span",
        {
          className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
          children: a
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "flex flex-col gap-2", children: a === 0 ? /* @__PURE__ */ e(
      "div",
      {
        className: "text-[11px] rounded-lg py-3 px-2 text-center",
        style: { color: "var(--muted)", border: "1px dashed var(--border)" },
        children: "empty"
      }
    ) : d })
  ] });
}
function Ht({ config: r, onSet: a }) {
  function d({ label: c, value: p, options: h, tokens: x, onPick: m }) {
    return /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: c }),
      /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: h.map((v) => {
        const R = p === v;
        return /* @__PURE__ */ e(
          "button",
          {
            onClick: () => m(v),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: R ? x[v] : "var(--muted)",
              background: R ? `color-mix(in srgb, ${x[v]} 16%, transparent)` : "transparent",
              boxShadow: R ? `inset 0 0 0 1px color-mix(in srgb, ${x[v]} 45%, transparent)` : "none"
            },
            children: v
          },
          v
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
        /* @__PURE__ */ e(d, { label: "Trust", value: r.trust, options: Ee, tokens: et, onPick: (c) => a({ trust: c }) }),
        /* @__PURE__ */ e(d, { label: "Depth", value: r.depth, options: Me, tokens: tt, onPick: (c) => a({ depth: c }) }),
        /* @__PURE__ */ e("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function Pt({ cards: r }) {
  const a = r.flatMap(
    (d) => (d.parked || []).map((c) => {
      var p;
      return { ...c, cardTitle: d.title, repo: (p = d.source) == null ? void 0 : p.repo };
    })
  ).sort((d, c) => (c.at || "").localeCompare(d.at || ""));
  return a.length === 0 ? /* @__PURE__ */ s("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ s("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ e("div", { className: "flex flex-col gap-2 max-w-2xl", children: a.map((d) => /* @__PURE__ */ s("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: d.note }),
    /* @__PURE__ */ s("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ s("span", { children: [
        "from ",
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: d.cardTitle })
      ] }),
      d.phase && /* @__PURE__ */ s("span", { children: [
        "· parked at ",
        d.phase
      ] }),
      d.repo && /* @__PURE__ */ s("span", { children: [
        "· ",
        d.repo
      ] }),
      d.issue_url && /* @__PURE__ */ e("a", { href: d.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, d.id)) });
}
function Vt({ repos: r, selected: a, onToggle: d, onClear: c, onAddWorkspace: p, onEdit: h }) {
  const x = r.reduce((R, u) => R + u.count, 0), m = a.size === 0, v = ({ name: R, count: u, label: q, checked: b, onClick: B, isAll: K }) => {
    const [A, T] = M(!1);
    return /* @__PURE__ */ s(
      "div",
      {
        onMouseEnter: () => T(!0),
        onMouseLeave: () => T(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: b ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: b ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ s(
            "button",
            {
              onClick: B,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                K ? /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: b ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ e(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: b ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${b ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: b && /* @__PURE__ */ e("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ e("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: b ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: q
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
          !K && R && /* @__PURE__ */ e(
            "button",
            {
              onClick: (V) => {
                V.stopPropagation(), h(R);
              },
              title: `Edit pipeline "${q}"`,
              "aria-label": `Edit pipeline ${q}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: A ? 1 : 0,
                pointerEvents: A ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (V) => {
                const j = V.currentTarget;
                j.style.color = "var(--accent)", j.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (V) => {
                const j = V.currentTarget;
                j.style.color = "var(--text-strong, var(--text))", j.style.borderColor = "var(--border-strong, var(--border))";
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
          a.size > 0 && /* @__PURE__ */ e("button", { onClick: c, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ e(v, { isAll: !0, count: x, label: "All repos", checked: m, onClick: c }),
        r.map((R) => /* @__PURE__ */ e(
          v,
          {
            name: R.name,
            count: R.count,
            label: (ht.has(R.name) ? "Example: " : "") + (R.name.includes("/") ? R.name.split("/")[1] : R.name),
            checked: a.has(R.name),
            onClick: () => d(R.name)
          },
          R.name
        )),
        /* @__PURE__ */ s(
          "button",
          {
            onClick: p,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        a.size > 1 && /* @__PURE__ */ s("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          a.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const Xt = [
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
function Yt({ initial: r, knownAgents: a, crews: d, repo: c, stepName: p, onSave: h, onClose: x }) {
  var $;
  const { openChat: m } = _t(), [v, R] = M(r.name || ""), [u, q] = M(r.role || ""), [b, B] = M(r.tools || ["read"]), [K, A] = M(r.model || "auto"), [T, V] = M(r.crew || ""), [j, D] = M(r.addenda || []), [S, C] = M(r.trust || ""), [z, g] = M(r.depth || ""), Q = (f) => B((y) => y.includes(f) ? y.filter((E) => E !== f) : [...y, f]), re = () => D((f) => {
    var y;
    return f.length >= 3 ? f : [...f, { crew: ((y = d[0]) == null ? void 0 : y.name) || "", when: "always", writes: "" }];
  }), ne = (f, y) => D((E) => E.map((W, X) => X === f ? { ...W, ...y } : W)), se = (f) => D((y) => y.filter((E, W) => W !== f)), oe = v.trim().length > 0;
  return /* @__PURE__ */ s("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ s("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ e("button", { onClick: x, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ s("div", { className: "ml-1", children: [
        /* @__PURE__ */ e("div", { className: "text-sm font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Configure Agent" }),
        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "This step's agent (KiroCrew agent config)" })
      ] }),
      /* @__PURE__ */ e(
        "button",
        {
          onClick: () => m({
            message: `/dlc-yolo

Help me design a NEW agent for a custom pipeline step.
Pipeline repo: ${c || "(unset)"}
Step: ${p || "(unnamed)"}

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
      a.length > 0 && /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Reuse an existing agent" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: a.map((f) => /* @__PURE__ */ e(
          "button",
          {
            onClick: () => R(f),
            className: "text-[11px] px-2 py-1 rounded-md font-medium",
            style: {
              background: v === f ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: v === f ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: v === f ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: f
          },
          f
        )) })
      ] }),
      /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: v,
            onChange: (f) => R(f.target.value),
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
            value: u,
            onChange: (f) => q(f.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: Xt.map((f) => {
          const y = b.includes(f);
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => Q(f),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: y ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: y ? "var(--accent)" : "var(--muted)",
                boxShadow: y ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: f
            },
            f
          );
        }) })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: K,
            onChange: (f) => A(f.target.value),
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
              value: T,
              onChange: (f) => V(f.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "— none (use step agent) —" }),
                d.map((f) => /* @__PURE__ */ e("option", { value: f.name, children: f.name }, f.name))
              ]
            }
          )
        ] }),
        T && /* @__PURE__ */ e("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: (($ = d.find((f) => f.name === T)) == null ? void 0 : $.description) || "Runs this step via select_crew → spawn_run(agent=" + T + ")" })
      ] }),
      /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ s("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: re,
              disabled: j.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        j.length === 0 && /* @__PURE__ */ e("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        j.map((f, y) => /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ e(
            "select",
            {
              value: f.crew,
              onChange: (E) => ne(y, { crew: E.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: d.map((E) => /* @__PURE__ */ e("option", { value: E.name, children: E.name }, E.name))
            }
          ),
          /* @__PURE__ */ s(
            "select",
            {
              value: f.when || "always",
              onChange: (E) => ne(y, { when: E.target.value }),
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
              value: f.writes || "",
              onChange: (E) => ne(y, { writes: E.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ e("button", { onClick: () => se(y), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ e("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ e("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, y))
      ] }),
      /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Ee].map((f) => {
          const y = S === f;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => C(f),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: y ? f ? et[f] : "var(--text)" : "var(--muted)", background: y ? "var(--bg-hover, var(--border))" : "transparent" },
              children: f || "inherit"
            },
            f || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Me].map((f) => {
          const y = z === f;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => g(f),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: y ? f ? tt[f] : "var(--text)" : "var(--muted)", background: y ? "var(--bg-hover, var(--border))" : "transparent" },
              children: f || "inherit"
            },
            f || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ s("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ e("button", { onClick: x, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ e(
        "button",
        {
          disabled: !oe,
          onClick: () => h({
            name: v.trim(),
            role: u.trim() || void 0,
            tools: b,
            model: K.trim() && K.trim() !== "auto" ? K.trim() : void 0,
            crew: T || void 0,
            addenda: j.length ? j.filter((f) => f.crew) : void 0,
            trust: S || void 0,
            depth: z || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save Agent"
        }
      )
    ] })
  ] });
}
function ct({ candidates: r, existingRepos: a, defaults: d, knownAgents: c, crews: p, onCreate: h, onClose: x, editPipeline: m, cardCount: v, isExample: R, onDelete: u }) {
  var ze, We, Ke, Ue, He, Pe, Ge, Ve, Ne, $e, Re, t, o, l;
  const q = !!m, [b, B] = M((m == null ? void 0 : m.repo) || ""), [K, A] = M((m == null ? void 0 : m.repo_path) || ""), [T, V] = M((m == null ? void 0 : m.source) || "manual"), [j, D] = M((m == null ? void 0 : m.trust) || d.trust), [S, C] = M((m == null ? void 0 : m.depth) || d.depth), z = m == null ? void 0 : m.budget, [g, Q] = M(
    z ? z.max_child_cards === "unlimited" && z.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [re, ne] = M(
    () => z && z.max_child_cards !== "unlimited" && z.effort_ceiling !== "unlimited" ? { ...z } : dt((m == null ? void 0 : m.depth) || d.depth)
  ), [se, oe] = M((m == null ? void 0 : m.backlog_intake) ?? !0), [$, f] = M((m == null ? void 0 : m.results_in_repo) ?? !1), [y, E] = M((m == null ? void 0 : m.self_enabling) ?? !1), [W, X] = M((m == null ? void 0 : m.approach) || "simplified"), [ee, H] = M(() => {
    var n;
    return (n = m == null ? void 0 : m.steps) != null && n.length ? m.steps.map((i) => ({ ...i })) : Qe.map((i) => ({ ...i }));
  }), [te, fe] = M(null), [de, ye] = M(""), [me, Y] = M("settings"), P = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", U = (n, i) => H((w) => w.map((I, N) => N === n ? { ...I, ...i } : I)), ce = (n) => H((i) => i.filter((w, I) => I !== n)), ke = (n, i) => H((w) => {
    const I = n + i;
    if (I < 0 || I >= w.length) return w;
    const N = [...w];
    return [N[n], N[I]] = [N[I], N[n]], N;
  }), ge = (n) => H((i) => [...i, {
    id: `${n}-${Math.random().toString(36).slice(2, 6)}`,
    name: n === "gate" ? "New Gate" : "New Step",
    type: n,
    agent: n === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), rt = (n) => {
    B(n.repo), A(n.path || ""), V(n.source);
  }, we = (n) => {
    let i = (n || "").trim();
    if (!i) return "";
    const w = i.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return w && (i = w[1]), i.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, De = (n) => {
    const i = /github\.com|gitlab\.com/i.test(n);
    B(i ? we(n) : n), V("manual");
  }, nt = /^[^/\s]+\/[^/\s]+$/.test(we(b)) || r.some((n) => n.repo === b), qe = !q && a.has(we(b)), Be = ({ value: n, options: i, tokens: w, onPick: I }) => /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: i.map((N) => {
    const J = n === N;
    return /* @__PURE__ */ e(
      "button",
      {
        onClick: () => I(N),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: J ? w[N] : "var(--muted)",
          background: J ? `color-mix(in srgb, ${w[N]} 16%, transparent)` : "transparent",
          boxShadow: J ? `inset 0 0 0 1px color-mix(in srgb, ${w[N]} 45%, transparent)` : "none"
        },
        children: N
      },
      N
    );
  }) }), xe = { "issue-radar": [], workspace: [], manual: [] };
  r.forEach((n) => {
    var i;
    (xe[i = n.source] || (xe[i] = [])).push(n);
  });
  const at = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: x,
      children: /* @__PURE__ */ e(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (n) => n.stopPropagation(),
          children: te !== null ? /* @__PURE__ */ e(
            Yt,
            {
              initial: {
                name: ((We = (ze = ee[te]) == null ? void 0 : ze.agent) == null ? void 0 : We.name) || "",
                role: (Ue = (Ke = ee[te]) == null ? void 0 : Ke.agent) == null ? void 0 : Ue.role,
                tools: (Pe = (He = ee[te]) == null ? void 0 : He.agent) == null ? void 0 : Pe.tools,
                model: (Ve = (Ge = ee[te]) == null ? void 0 : Ge.agent) == null ? void 0 : Ve.model,
                crew: ($e = (Ne = ee[te]) == null ? void 0 : Ne.agent) == null ? void 0 : $e.crew,
                addenda: (Re = ee[te]) == null ? void 0 : Re.addenda,
                trust: (t = ee[te]) == null ? void 0 : t.trust,
                depth: (o = ee[te]) == null ? void 0 : o.depth
              },
              knownAgents: c,
              crews: p,
              repo: b,
              stepName: ((l = ee[te]) == null ? void 0 : l.name) || "",
              onClose: () => fe(null),
              onSave: (n) => {
                U(te, {
                  agent: { name: n.name, role: n.role, tools: n.tools, model: n.model, crew: n.crew },
                  addenda: n.addenda,
                  trust: n.trust,
                  depth: n.depth
                }), fe(null);
              }
            }
          ) : /* @__PURE__ */ s(ut, { children: [
            /* @__PURE__ */ s("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ e("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: q ? "Edit Pipeline" : "New Pipeline" }),
                /* @__PURE__ */ e("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: q ? b.includes("/") ? b.split("/")[1] : b : "Configure a pipeline for a repository or workspace" })
              ] }),
              /* @__PURE__ */ e("button", { onClick: x, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
            ] }),
            q && /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: ["settings", "danger"].map((n) => {
              const i = me === n, w = n === "danger";
              return /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => Y(n),
                  className: "text-[12px] px-3 py-2 font-semibold transition-all",
                  style: {
                    color: i ? w ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                    borderBottom: `2px solid ${i ? w ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                    marginBottom: "-1px"
                  },
                  children: n === "settings" ? "Settings" : "Danger Zone"
                },
                n
              );
            }) }),
            /* @__PURE__ */ s(
              "div",
              {
                className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                style: { display: q && me === "danger" ? "none" : "flex" },
                children: [
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: b,
                        onChange: (n) => De(n.target.value),
                        onPaste: (n) => {
                          const i = n.clipboardData.getData("text");
                          /github\.com|gitlab\.com/i.test(i) && (n.preventDefault(), De(i));
                        },
                        placeholder: "https://github.com/owner/name  ·  or  owner/name",
                        disabled: q,
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                        style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${qe ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                      }
                    ),
                    !q && b && we(b) !== b && /* @__PURE__ */ s("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                      "→ ",
                      /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: we(b) })
                    ] }),
                    qe && /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                    /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((n) => xe[n].length > 0 && /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: at[n] }),
                      /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1.5", children: xe[n].map((i) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => rt(i),
                          disabled: a.has(i.repo),
                          title: i.detail || i.repo,
                          className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                          style: {
                            background: b === i.repo ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                            color: b === i.repo ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                            boxShadow: b === i.repo ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                          },
                          children: i.repo.includes("/") ? i.repo.split("/")[1] : i.repo
                        },
                        i.repo
                      )) })
                    ] }, n)) })
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Local checkout path" }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: K,
                        onChange: (n) => A(n.target.value),
                        placeholder: "/absolute/path/to/checkout",
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                      }
                    ),
                    /* @__PURE__ */ e("div", { className: "text-[10px] mt-1", style: { color: "var(--muted)" }, children: "Required before code or repo-mirrored results run. Mutable steps block rather than use the shared checkout when this path is absent or unverifiable." })
                  ] }),
                  /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                    /* @__PURE__ */ e(Be, { value: j, options: Ee, tokens: et, onPick: D })
                  ] }),
                  /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                    /* @__PURE__ */ e(Be, { value: S, options: Me, tokens: tt, onPick: C })
                  ] }),
                  /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                      /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                    ] }),
                    /* @__PURE__ */ e(
                      Be,
                      {
                        value: g,
                        options: ["depth", "custom", "unlimited"],
                        tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                        onPick: Q
                      }
                    )
                  ] }),
                  g === "depth" && (() => {
                    const n = dt(S);
                    return /* @__PURE__ */ s("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      "Follows ",
                      /* @__PURE__ */ e("strong", { children: S }),
                      ": ",
                      String(n.max_child_cards),
                      " child cards · ",
                      String(n.effort_ceiling),
                      " effort points · max ",
                      n.max_feature_size,
                      " · ",
                      n.addenda,
                      " addenda"
                    ] });
                  })(),
                  g === "unlimited" && /* @__PURE__ */ e("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                  g === "custom" && /* @__PURE__ */ s("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ s("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                      "Max child cards",
                      /* @__PURE__ */ e(
                        "input",
                        {
                          type: "number",
                          min: 0,
                          value: re.max_child_cards,
                          onChange: (n) => ne((i) => ({ ...i, max_child_cards: Math.max(0, Number(n.target.value) || 0) })),
                          className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                          style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      )
                    ] }),
                    /* @__PURE__ */ s("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                      "Effort ceiling",
                      /* @__PURE__ */ e(
                        "input",
                        {
                          type: "number",
                          min: 0,
                          value: re.effort_ceiling,
                          onChange: (n) => ne((i) => ({ ...i, effort_ceiling: Math.max(0, Number(n.target.value) || 0) })),
                          className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                          style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      )
                    ] }),
                    /* @__PURE__ */ s("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                      "Max feature size",
                      /* @__PURE__ */ e(
                        "select",
                        {
                          value: re.max_feature_size,
                          onChange: (n) => ne((i) => ({ ...i, max_feature_size: n.target.value })),
                          className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                          style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                          children: ["S", "M", "L", "XL"].map((n) => /* @__PURE__ */ e("option", { children: n }, n))
                        }
                      )
                    ] }),
                    /* @__PURE__ */ s("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                      "Addenda",
                      /* @__PURE__ */ e(
                        "select",
                        {
                          value: re.addenda,
                          onChange: (n) => ne((i) => ({ ...i, addenda: n.target.value })),
                          className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                          style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                          children: ["none", "obvious", "proactive"].map((n) => /* @__PURE__ */ e("option", { children: n }, n))
                        }
                      )
                    ] })
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
                        onClick: () => oe((n) => !n),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: se ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: se ? 20 : 2 }
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
                        onClick: () => f((n) => !n),
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
                  /* @__PURE__ */ s("label", { className: "flex items-center justify-between cursor-pointer", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                      /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => E((n) => !n),
                        className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                        style: { background: y ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                        children: /* @__PURE__ */ e(
                          "span",
                          {
                            className: "absolute top-0.5 rounded-full transition-all",
                            style: { height: 18, width: 18, background: "var(--bg)", left: y ? 20 : 2 }
                          }
                        )
                      }
                    )
                  ] }),
                  y && /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                      /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                    ] }),
                    /* @__PURE__ */ e("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((n) => /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => X(n),
                        className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                        style: {
                          background: W === n ? "var(--accent)" : "transparent",
                          color: W === n ? "var(--bg)" : "var(--muted)",
                          border: `1px solid ${W === n ? "var(--accent)" : "var(--border)"}`
                        },
                        children: n
                      },
                      n
                    )) })
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ s("div", { className: "flex items-center justify-between mb-1.5", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                      /* @__PURE__ */ s("div", { className: "flex gap-1", children: [
                        /* @__PURE__ */ e(
                          "button",
                          {
                            onClick: () => ge("agent"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                            children: "+ agent"
                          }
                        ),
                        /* @__PURE__ */ e(
                          "button",
                          {
                            onClick: () => ge("gate"),
                            className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                            children: "+ gate"
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: ee.map((n, i) => {
                      var w, I;
                      return /* @__PURE__ */ s(
                        "div",
                        {
                          className: "rounded-md p-2",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${n.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                          children: [
                            /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
                              /* @__PURE__ */ s("div", { className: "flex flex-col", children: [
                                /* @__PURE__ */ e("button", { onClick: () => ke(i, -1), disabled: i === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                /* @__PURE__ */ e("button", { onClick: () => ke(i, 1), disabled: i === ee.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                              ] }),
                              /* @__PURE__ */ e(
                                "input",
                                {
                                  value: n.name,
                                  onChange: (N) => U(i, { name: N.target.value, id: P(N.target.value) }),
                                  className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                }
                              ),
                              /* @__PURE__ */ e(
                                "span",
                                {
                                  className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                  style: { color: n.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${n.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                  children: n.type
                                }
                              ),
                              /* @__PURE__ */ e("button", { onClick: () => ce(i), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                            ] }),
                            n.type === "agent" && /* @__PURE__ */ s("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                              /* @__PURE__ */ s(
                                "button",
                                {
                                  onClick: () => fe(i),
                                  className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                  children: [
                                    "⚙ ",
                                    (w = n.agent) != null && w.name ? `Agent: ${n.agent.name}` : "Configure agent"
                                  ]
                                }
                              ),
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                              /* @__PURE__ */ s(
                                "select",
                                {
                                  value: n.trigger || "ask",
                                  onChange: (N) => U(i, { trigger: N.target.value === "ask" ? void 0 : N.target.value }),
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
                              (n.trust || n.depth) && /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [n.trust, n.depth].filter(Boolean).join(" · ") }),
                              n.addenda && n.addenda.length > 0 && /* @__PURE__ */ s("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                "+",
                                n.addenda.length,
                                " addendum",
                                n.addenda.length === 1 ? "" : "s"
                              ] }),
                              ((I = n.agent) == null ? void 0 : I.role) && /* @__PURE__ */ e("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: n.agent.role })
                            ] }),
                            n.type === "gate" && /* @__PURE__ */ s("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                              /* @__PURE__ */ s(
                                "select",
                                {
                                  value: n.trust || "",
                                  onChange: (N) => U(i, { trust: N.target.value || void 0 }),
                                  className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                  children: [
                                    /* @__PURE__ */ e("option", { value: "", children: "inherit" }),
                                    Ee.map((N) => /* @__PURE__ */ e("option", { value: N, children: N }, N))
                                  ]
                                }
                              )
                            ] })
                          ]
                        },
                        n.id
                      );
                    }) })
                  ] })
                ]
              }
            ),
            q && me === "danger" && u && (() => {
              const n = b.includes("/") ? b.split("/")[1] : b, i = de.trim() === n;
              return /* @__PURE__ */ e("div", { className: "px-5 pb-4 pt-4", children: R ? /* @__PURE__ */ s(
                "div",
                {
                  className: "rounded-lg p-4 flex flex-col gap-3",
                  style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                  children: [
                    /* @__PURE__ */ s("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                      "This is a bundled ",
                      /* @__PURE__ */ e("strong", { children: "example" }),
                      " pipeline (",
                      v ?? 0,
                      " sample card",
                      (v ?? 0) === 1 ? "" : "s",
                      "). Remove it any time — it's demo data, not real work."
                    ] }),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => {
                          u(b), x();
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
                      v ?? 0,
                      " card",
                      (v ?? 0) === 1 ? "" : "s",
                      " from DLC-YOLO's local state. It does ",
                      /* @__PURE__ */ e("strong", { children: "not" }),
                      " touch GitHub issues or labels. This cannot be undone."
                    ] }),
                    /* @__PURE__ */ s("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                      "Type ",
                      /* @__PURE__ */ e("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: n }),
                      " to confirm:"
                    ] }),
                    /* @__PURE__ */ e(
                      "input",
                      {
                        value: de,
                        onChange: (w) => ye(w.target.value),
                        placeholder: n,
                        className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        disabled: !i,
                        onClick: () => {
                          u(b), x();
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
            /* @__PURE__ */ s("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
              /* @__PURE__ */ e("button", { onClick: x, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Cancel" }),
              !(q && me === "danger") && /* @__PURE__ */ e(
                "button",
                {
                  disabled: !nt || !q && qe,
                  onClick: () => h({
                    repo: we(b),
                    ...K.trim() ? { repo_path: K.trim() } : {},
                    source: T,
                    trust: j,
                    depth: S,
                    budget: g === "depth" ? void 0 : g === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : re,
                    backlog_intake: se,
                    results_in_repo: $,
                    self_enabling: y,
                    approach: W,
                    steps: ee.map((n) => ({ ...n, label: `dlc:${n.id}` }))
                  }),
                  className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: q ? "Save Pipeline" : "Create Pipeline"
                }
              )
            ] })
          ] })
        }
      )
    }
  );
}
function pt({ size: r = 12 }) {
  return /* @__PURE__ */ s("svg", { className: "animate-spin flex-shrink-0", width: r, height: r, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ e("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ e("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
function tr() {
  const r = wt(), a = Nt(), [d, c] = M([]), [p, h] = M([]), [x, m] = M(Fe), [v, R] = M(!0), [u, q] = M("pipeline"), [b, B] = M(/* @__PURE__ */ new Set()), [K, A] = M(!1), [T, V] = M(null), [j, D] = M([]), [S, C] = M([]), [z, g] = M(!1), [Q, re] = M([]), ne = ue(null), se = ue(!1), oe = ue(/* @__PURE__ */ new Set()), $ = ue(/* @__PURE__ */ new Set()), [f, y] = M({}), E = le(async () => {
    try {
      let t;
      try {
        t = await r.get("/api/file-read?path=" + encodeURIComponent(he));
      } catch (o) {
        if (he !== it)
          he = it, t = await r.get("/api/file-read?path=" + encodeURIComponent(he));
        else
          throw o;
      }
      c(t.cards || []), h(t.pipelines || []), m({ ...Fe, ...t.config || {} });
    } catch (t) {
      console.error("Failed to fetch cards:", t);
    } finally {
      R(!1);
    }
  }, [r]), W = ve(() => {
    const t = /* @__PURE__ */ new Map();
    return p.forEach((o) => {
      t.has(o.repo) || t.set(o.repo, 0);
    }), d.forEach((o) => {
      var n;
      const l = ((n = o.source) == null ? void 0 : n.repo) || "unlinked";
      t.set(l, (t.get(l) || 0) + 1);
    }), [...t.entries()].map(([o, l]) => ({ name: o, count: l })).sort((o, l) => l.count - o.count);
  }, [d, p]), X = ve(
    () => b.size === 0 ? d : d.filter((t) => {
      var o;
      return b.has(((o = t.source) == null ? void 0 : o.repo) || "unlinked");
    }),
    [d, b]
  );
  je(() => {
    $.current = new Set(d.map((t) => t.id)), oe.current = new Set(d.flatMap(
      (t) => Object.values(t.step_sessions || {}).filter((o) => !!o.slot_key && !o.chat_disabled_at && !o.superseded).map((o) => o.slot_key)
    ));
  }, [d]), je(() => {
    let t = !1, o = null, l, n = 0;
    const i = () => {
      if (t) return;
      const w = window.location.protocol === "https:" ? "wss:" : "ws:";
      o = new WebSocket(`${w}//${window.location.host}/api/ws`), o.onopen = () => {
        n = 0;
      }, o.onmessage = (I) => {
        if (typeof I.data == "string")
          try {
            const N = JSON.parse(I.data), J = N == null ? void 0 : N.data;
            if (N.type === "slots" && Array.isArray(J)) {
              const O = new Set(oe.current), G = [];
              for (const k of J) {
                const ie = (k == null ? void 0 : k.key) || (k == null ? void 0 : k.slot) || (k == null ? void 0 : k.name), Te = String((k == null ? void 0 : k.title) || (k == null ? void 0 : k.name) || "");
                typeof ie == "string" && ie.startsWith("cron-") && [...$.current].some((Ae) => Te.includes(Ae)) && O.add(ie), typeof ie == "string" && (k != null && k.running) && O.has(ie) && G.push(ie);
              }
              oe.current = O, G.length && y((k) => {
                let ie = k;
                for (const Te of G) {
                  const Ae = ot(k[Te]);
                  Ae !== k[Te] && (ie = { ...ie, [Te]: Ae });
                }
                return ie;
              });
              return;
            }
            const F = J == null ? void 0 : J.slot;
            if (!F || !oe.current.has(F)) return;
            N.type === "chat_status" && String(J.status || "").toLowerCase().startsWith("thinking") || N.type === "chat_thinking" ? y((O) => {
              const G = ot(O[F], N.type === "chat_status");
              return G === O[F] ? O : { ...O, [F]: G };
            }) : N.type === "chat_chunk" && typeof J.content == "string" ? y((O) => {
              const G = At(O[F], J.content, Number(J.seq));
              return G === O[F] ? O : { ...O, [F]: G };
            }) : N.type === "chat_done" && y((O) => {
              const G = Lt(O[F]);
              return G === O[F] ? O : { ...O, [F]: G };
            });
          } catch {
          }
      }, o.onclose = () => {
        if (t) return;
        const I = Math.min(1e3 * 2 ** n++, 15e3);
        l = setTimeout(i, I);
      }, o.onerror = () => o == null ? void 0 : o.close();
    };
    return i(), () => {
      t = !0, l && clearTimeout(l), o == null || o.close();
    };
  }, []), je(() => {
    if (!z) return;
    const t = (o) => {
      o.key === "Escape" && g(!1);
    };
    return window.addEventListener("keydown", t), () => window.removeEventListener("keydown", t);
  }, [z]);
  const ee = 6e5, H = ve(() => {
    var o, l, n, i;
    const t = [];
    for (const w of X) {
      const I = w.step_status || {}, N = w.step_sessions || {}, J = p.find((O) => O.id === w.pipeline_id) || p.find((O) => {
        var G;
        return O.repo === ((G = w.source) == null ? void 0 : G.repo);
      }), F = /* @__PURE__ */ new Set([...Object.keys(I), ...Object.keys(N)]);
      for (const O of F) {
        const G = I[O] || "idle", k = N[O], ie = G === "pending" || G === "error", Te = !!(k != null && k.slot_key) && !k.chat_disabled_at && !k.superseded;
        if (!ie && !Te) continue;
        const Ae = (o = w.pending_at) == null ? void 0 : o[O], vt = ie && !!Ae && Date.now() - new Date(Ae).getTime() > ee, Oe = (l = J == null ? void 0 : J.steps) == null ? void 0 : l.find((Ie) => Ie.id === O), ft = (k == null ? void 0 : k.agent) || ((n = Oe == null ? void 0 : Oe.agent) == null ? void 0 : n.crew) || ((i = Oe == null ? void 0 : Oe.agent) == null ? void 0 : i.name) || "orchestrator", st = k == null ? void 0 : k.agent_id, xt = k == null ? void 0 : k.slot_key, bt = k == null ? void 0 : k.session_key, yt = st ? Q.some((Ie) => Ie.id === st) : ie && Q.some((Ie) => (Ie.task || "").includes(w.id) || (Ie.task || "").includes(w.title)), kt = !!(k != null && k.last_response_at) && (!k.last_response_handled_at || k.last_response_handled_at < k.last_response_at);
        t.push({ card: w.title || w.id, step: O, agent: ft, stale: vt, status: G, live: yt, responsePending: kt, agentId: st, slotKey: xt, sessionKey: bt, sessionName: k == null ? void 0 : k.name });
      }
    }
    return t;
  }, [X, p, Q]), te = ve(() => {
    var i;
    let t;
    if (b.size === 1) {
      const w = [...b][0];
      t = (i = p.find((I) => I.repo === w)) == null ? void 0 : i.steps;
    } else p.length === 1 && (t = p[0].steps);
    const o = (t && t.length ? t : Qe).map((w) => ({ ...w })), l = new Set(o.map((w) => w.id)), n = [];
    return l.has("intake") || n.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), n.push(...o), l.has("done") || n.push({ id: "done", name: "Done", type: "agent" }), n;
  }, [b, p]), fe = ve(() => te.map((t) => t.id), [te]), de = le((t) => {
    var o;
    return ((o = te.find((l) => l.id === t)) == null ? void 0 : o.type) === "gate" || t.startsWith("gate-");
  }, [te]), ye = le((t) => {
    var o, l;
    return ((l = (o = te.find((n) => n.id === t)) == null ? void 0 : o.agent) == null ? void 0 : l.name) || Gt[t] || "unknown";
  }, [te]), me = le((t) => {
    var i, w;
    const o = t.step_sessions || {}, l = Object.entries(o).find(
      ([, I]) => I.retained_for_gate === t.stage && I.retention !== "released"
    );
    let n = ((i = t.gate_review) == null ? void 0 : i.producer_step) || (l == null ? void 0 : l[0]);
    if (!n) {
      const I = p.find((G) => G.id === t.pipeline_id) || p.find((G) => {
        var k;
        return G.repo === ((k = t.source) == null ? void 0 : k.repo);
      }), N = (w = I == null ? void 0 : I.steps) != null && w.length ? I.steps : Qe, J = [
        { id: "intake", name: "Intake", type: "agent" },
        ...N.filter((G) => G.id !== "intake" && G.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], F = J.findIndex((G) => G.id === t.stage), O = F >= 0 ? J[F] : void 0;
      if (n = O == null ? void 0 : O.reviews_step, !n && F >= 0)
        for (let G = F - 1; G >= 0; G--) {
          const k = J[G];
          if (!(k.id === "intake" || k.id === "done") && k.type !== "gate" && !k.id.startsWith("gate-")) {
            n = k.id;
            break;
          }
        }
    }
    return n;
  }, [p]), Y = le((t) => {
    const o = me(t);
    if (!o) return;
    const l = (t.step_sessions || {})[o];
    if (!(!(l != null && l.slot_key) || l.chat_disabled_at || l.superseded))
      return {
        step: o,
        slotKey: l.slot_key,
        retained: l.retention === "held-for-gate"
      };
  }, [me]);
  je(() => {
    E();
    const t = async () => {
      try {
        const l = he.slice(0, he.lastIndexOf("/")), n = (l ? l + "/" : "") + "live_spawns.json", i = await r.get("/api/file-read?path=" + encodeURIComponent(n));
        se.current = !1;
        const w = i != null && i.at ? Date.now() - new Date(i.at).getTime() < 18e4 : !0;
        re(w && Array.isArray(i == null ? void 0 : i.runs) ? i.runs : []);
      } catch {
        se.current = !0, re([]);
      }
    };
    E().then(t);
    const o = setInterval(() => {
      E().then(() => {
        se.current || t();
      });
    }, 1e4);
    return () => clearInterval(o);
  }, [E, r]), je(() => {
    (async () => {
      try {
        const t = await r.get("/api/file-read?path=~/.kiro/crew/config.json"), o = (t == null ? void 0 : t.agents) || {}, l = Object.entries(o).map(([n, i]) => ({
          name: n,
          description: (i == null ? void 0 : i.description) || void 0
        }));
        C(l);
      } catch (t) {
        console.warn("crew roster (config.json) unreadable:", t);
      }
    })();
  }, [r]);
  const P = le(async (t) => {
    try {
      const o = await r.get("/api/file-read?path=" + encodeURIComponent(he));
      o.cards = o.cards || [], t(o);
      try {
        const l = await r.get("/api/file-read?path=" + encodeURIComponent(he));
        l.cards = l.cards || [], t(l), await r.post("/api/file-write", { path: he, content: JSON.stringify(l, null, 2) });
      } catch {
        await r.post("/api/file-write", { path: he, content: JSON.stringify(o, null, 2) });
      }
      E();
    } catch (o) {
      console.error("Failed to mutate state:", o);
    }
  }, [r, E]), U = le((t) => {
    m((o) => ({ ...o, ...t })), P((o) => {
      o.config = { ...Fe, ...o.config || {}, ...t };
    });
  }, [P]), ce = le((t, o, l, n) => {
    const i = (/* @__PURE__ */ new Date()).toISOString(), w = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    P((I) => {
      var G;
      const N = I.cards.find((k) => k.id === t);
      if (!N || N.stage !== o) return;
      if (n === void 0 && l.type === "interject") {
        const k = l.text.trim();
        if (!k) return;
        N.interjection = N.interjection || [], N.interjection.some((ie) => ie.id === w) || N.interjection.push({
          id: w,
          at: i,
          step: o,
          kind: l.kind,
          text: k,
          by: "user",
          status: "pending"
        }), N.updated_at = i;
        return;
      }
      if ((((G = N.gate_review) == null ? void 0 : G.result_revision) ?? null) !== n) return;
      const F = l.type === "reject" ? l.reason.trim() : void 0, O = l.type === "interject" ? l.text.trim() : void 0;
      l.type === "reject" && !F || l.type === "interject" && !O || (N.gate_commands = N.gate_commands || [], N.gate_commands.some((k) => k.id === w) || N.gate_commands.push({
        id: w,
        gate: o,
        action: l.type,
        expected_revision: n ?? null,
        actor: "user",
        at: i,
        status: "pending",
        ...F ? { reason: F } : {},
        ...l.type === "interject" ? { kind: l.kind, text: O } : {}
      }), N.updated_at = i);
    });
  }, [P]), ke = le((t, o, l) => {
    P((n) => {
      const i = n.cards.find((I) => I.id === t);
      if (!i) return;
      const w = (i.decisions || []).find((I) => I.id === o);
      w && (w.chosen = l, w.resolved_at = (/* @__PURE__ */ new Date()).toISOString()), i.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [P]), ge = le((t) => {
    P((o) => {
      var i;
      const l = o.cards.find((w) => w.id === t);
      if (!l) return;
      const n = l.trust || ((i = o.config) == null ? void 0 : i.trust) || Fe.trust;
      l.trust = Ee[(Ee.indexOf(n) + 1) % Ee.length], l.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [P]), rt = le((t) => {
    P((o) => {
      var i;
      const l = o.cards.find((w) => w.id === t);
      if (!l) return;
      const n = l.depth || ((i = o.config) == null ? void 0 : i.depth) || Fe.depth;
      l.depth = Me[(Me.indexOf(n) + 1) % Me.length], l.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [P]), we = le((t) => {
    B((o) => {
      const l = new Set(o);
      return l.has(t) ? l.delete(t) : l.add(t), l;
    });
  }, []), De = le(() => B(/* @__PURE__ */ new Set()), []), nt = le(async () => {
    const t = [];
    try {
      const o = await r.get("/api/file-read?path=~/.kiro/crew/config.json"), l = (o == null ? void 0 : o.workspaces) || {};
      Object.entries(l).forEach(([n, i]) => t.push({
        repo: n,
        source: "workspace",
        detail: (i == null ? void 0 : i.dir) || n,
        path: typeof (i == null ? void 0 : i.dir) == "string" ? i.dir : void 0
      }));
    } catch (o) {
      console.warn("workspaces registry unreadable:", o);
    }
    try {
      const o = await r.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((o == null ? void 0 : o.repos) || []).forEach((l) => {
        l != null && l.owner && (l != null && l.repo) && t.push({ repo: `${l.owner}/${l.repo}`, source: "issue-radar", detail: `${l.provider || "github"} · ${l.host || "github.com"}` });
      });
    } catch (o) {
      console.warn("issue-radar config unreadable (app may not be installed):", o);
    }
    D(t), A(!0);
  }, [r]), qe = le(async (t) => {
    const o = (/* @__PURE__ */ new Date()).toISOString(), l = "pl-" + Math.random().toString(36).slice(2, 10);
    await P((n) => {
      n.pipelines = n.pipelines || [];
      const i = n.pipelines.find((w) => w.repo === t.repo);
      i ? (i.source = t.source, t.repo_path ? i.repo_path = t.repo_path : delete i.repo_path, i.trust = t.trust, i.depth = t.depth, t.budget ? i.budget = t.budget : delete i.budget, i.backlog_intake = t.backlog_intake, i.results_in_repo = t.results_in_repo, i.self_enabling = t.self_enabling, i.approach = t.approach, i.steps = t.steps) : n.pipelines.push({
        id: l,
        repo: t.repo,
        ...t.repo_path ? { repo_path: t.repo_path } : {},
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
        created_at: o
      });
    }), A(!1), V(null), B(/* @__PURE__ */ new Set([t.repo]));
  }, [P]), Be = le(async (t) => {
    await P((o) => {
      o.pipelines = (o.pipelines || []).filter((l) => l.repo !== t), o.cards = (o.cards || []).filter((l) => {
        var n;
        return (((n = l.source) == null ? void 0 : n.repo) || "unlinked") !== t;
      });
    }), B((o) => {
      const l = new Set(o);
      return l.delete(t), l;
    });
  }, [P]), xe = ve(() => fe.reduce((t, o) => (t[o] = X.filter((l) => l.stage === o), t), {}), [X, fe]), at = le((t) => {
    var o;
    (o = document.getElementById(`stage-col-${t}`)) == null || o.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), ze = ve(() => {
    const t = {};
    return X.forEach((o) => {
      var n;
      const l = ((n = o.source) == null ? void 0 : n.repo) || "unlinked";
      (t[l] || (t[l] = [])).push(o);
    }), t;
  }, [X]), We = ve(() => {
    const t = {};
    return X.forEach((o) => {
      const l = ye(o.stage);
      (t[l] || (t[l] = [])).push(o);
    }), t;
  }, [X, ye]), Ke = ve(() => {
    const t = [], o = [], l = [];
    return X.forEach((n) => {
      n.stage === "done" ? l.push(n) : de(n.stage) ? t.push(n) : o.push(n);
    }), { "Blocked at Gate": t, "In-Flight (Auto)": o, Done: l };
  }, [X, de]), Ue = X.filter((t) => t.stage !== "done").length, He = X.filter((t) => de(t.stage)).length, Pe = X.filter((t) => t.stage === "done").length, Ge = X.reduce((t, o) => {
    var l;
    return t + (((l = o.parked) == null ? void 0 : l.length) || 0);
  }, 0), Ve = {
    pipeline: X.length,
    workspace: Object.keys(ze).length,
    crew: Object.keys(We).length,
    status: X.length,
    backlog: Ge
  }, Ne = H.some((t) => {
    var o, l;
    return !!t.slotKey && ((o = f[t.slotKey]) == null ? void 0 : o.active) && ((l = f[t.slotKey]) == null ? void 0 : l.phase) === "generating";
  }), $e = H.some((t) => {
    var o, l;
    return !!t.slotKey && ((o = f[t.slotKey]) == null ? void 0 : o.active) && ((l = f[t.slotKey]) == null ? void 0 : l.phase) === "thinking";
  }), Re = (t) => {
    var I, N, J;
    const o = p.find((F) => F.id === t.pipeline_id) || p.find((F) => {
      var O;
      return F.repo === ((O = t.source) == null ? void 0 : O.repo);
    }), l = ((N = (I = o == null ? void 0 : o.steps) == null ? void 0 : I.find((F) => F.id === t.stage)) == null ? void 0 : N.type) === "gate" || de(t.stage), n = l ? ((J = t.gate_review) == null ? void 0 : J.result_revision) ?? null : void 0, i = l ? me(t) : void 0, w = l ? Y(t) : void 0;
    return {
      card: t,
      config: x,
      isGate: l,
      producerStep: i,
      producerSession: w,
      onOpenProducer: w ? () => a(`/chat?sid=${encodeURIComponent(w.slotKey)}`) : void 0,
      onApprove: l ? () => ce(t.id, t.stage, { type: "approve" }, n) : void 0,
      onReject: l ? (F) => ce(t.id, t.stage, { type: "reject", reason: F }, n) : void 0,
      onCycleTrust: () => ge(t.id),
      onCycleDepth: () => rt(t.id),
      onInterject: (F, O) => ce(
        t.id,
        t.stage,
        { type: "interject", kind: F, text: O },
        n
      ),
      onResolveDecision: (F, O) => ke(t.id, F, O)
    };
  };
  return /* @__PURE__ */ s(ut, { children: [
    /* @__PURE__ */ e(St, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    z && /* @__PURE__ */ e(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (t) => {
          t.currentTarget === t.target && g(!1);
        },
        children: /* @__PURE__ */ s(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "agent-sessions-title",
            className: "flex flex-col rounded-xl overflow-hidden",
            style: { width: "min(680px, calc(100vw - 32px))", maxHeight: "min(76vh, 680px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" },
            children: [
              /* @__PURE__ */ s("header", { className: "flex items-start gap-4 px-5 py-4", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ s("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ e("h2", { id: "agent-sessions-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agent sessions" }),
                    /* @__PURE__ */ e("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: H.length })
                  ] }),
                  /* @__PURE__ */ e("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "Live activity from enabled chats linked to pipeline cards." })
                ] }),
                /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => g(!1),
                    "aria-label": "Close agent sessions",
                    className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                    style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ e("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: H.length === 0 ? /* @__PURE__ */ e("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : H.map((t) => {
                const o = t.slotKey ? f[t.slotKey] : void 0;
                return /* @__PURE__ */ s(
                  "div",
                  {
                    className: "rounded-lg px-3 py-2.5",
                    style: { background: t.responsePending ? "color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))" : "var(--bg, transparent)", border: "1px solid var(--border)" },
                    children: [
                      /* @__PURE__ */ s("div", { className: "flex items-center gap-2 text-[11px] min-w-0", children: [
                        /* @__PURE__ */ e(
                          "span",
                          {
                            className: t.status === "pending" || t.responsePending ? "inline-block animate-pulse flex-shrink-0" : "inline-block flex-shrink-0",
                            style: { width: 7, height: 7, borderRadius: 999, background: t.stale ? "var(--warn)" : t.responsePending || t.status === "pending" ? "var(--accent)" : "var(--muted)" }
                          }
                        ),
                        /* @__PURE__ */ e("span", { className: "font-semibold flex-shrink-0", style: { color: "var(--accent)" }, title: t.sessionName || void 0, children: t.agent }),
                        /* @__PURE__ */ s("span", { className: "truncate", style: { color: "var(--muted)" }, children: [
                          "· ",
                          t.step
                        ] }),
                        /* @__PURE__ */ e("span", { className: "ml-auto truncate max-w-[220px]", style: { color: "var(--text, var(--muted))" }, title: t.card, children: t.card }),
                        /* @__PURE__ */ e("span", { className: "flex-shrink-0", style: { color: t.responsePending ? "var(--warn)" : t.status === "pending" ? "var(--ok)" : "var(--muted)" }, children: t.responsePending ? "response" : t.status }),
                        t.stale && /* @__PURE__ */ e("span", { style: { color: "var(--warn)" }, title: "stale — will be reclaimed", children: "↻" })
                      ] }),
                      (o == null ? void 0 : o.active) && o.phase === "thinking" && /* @__PURE__ */ s("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                        /* @__PURE__ */ e(pt, { size: 13 }),
                        /* @__PURE__ */ e("span", { children: "Thinking" })
                      ] }),
                      (o == null ? void 0 : o.active) && o.phase === "generating" && o.tail && /* @__PURE__ */ s("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                        /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                        /* @__PURE__ */ s("span", { className: "font-mono text-[11px] truncate", children: [
                          "Generating · …",
                          o.tail
                        ] })
                      ] }),
                      t.slotKey && /* @__PURE__ */ s(
                        "button",
                        {
                          className: "mt-2 ml-4 font-mono",
                          style: { color: "var(--muted)", fontSize: 10, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
                          title: `Copy openable slot ${t.slotKey} (${t.sessionName || t.sessionKey}); open it from Chats`,
                          onClick: () => {
                            var l;
                            try {
                              (l = navigator.clipboard) == null || l.writeText(t.slotKey || "");
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
              /* @__PURE__ */ e("footer", { className: "px-5 py-3 text-[10px]", style: { color: "var(--muted)", borderTop: "1px solid var(--border)" }, children: "Thinking and text tails come directly from live dashboard events. Terminal turns stay linked until chat is explicitly disabled." })
            ]
          }
        )
      }
    ),
    K && /* @__PURE__ */ e(
      ct,
      {
        candidates: j,
        existingRepos: new Set(p.map((t) => t.repo)),
        defaults: x,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: S,
        onCreate: qe,
        onClose: () => A(!1)
      }
    ),
    T && /* @__PURE__ */ e(
      ct,
      {
        candidates: j,
        existingRepos: new Set(p.map((t) => t.repo)),
        defaults: x,
        knownAgents: ["spec-agent", "design-agent", "impl-agent", "review-agent", "orchestrator"],
        crews: S,
        editPipeline: p.find((t) => t.repo === T) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + T, repo: T, source: "manual", trust: x.trust, depth: x.depth, backlog_intake: !0, sot: "github", steps: Qe.map((t) => ({ ...t })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: d.filter((t) => {
          var o;
          return (((o = t.source) == null ? void 0 : o.repo) || "unlinked") === T;
        }).length,
        isExample: ht.has(T),
        onCreate: qe,
        onDelete: Be,
        onClose: () => V(null)
      }
    ),
    /* @__PURE__ */ s("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ e(Ft, { steps: te, cardsByStage: xe, onNodeClick: at }),
      /* @__PURE__ */ s("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-5", children: [
        /* @__PURE__ */ e(Xe, { label: "Active", value: String(Ue), accent: !0 }),
        /* @__PURE__ */ e(Xe, { label: "Gated", value: String(He) }),
        /* @__PURE__ */ e(Xe, { label: "Done", value: String(Pe) }),
        /* @__PURE__ */ e(Xe, { label: "Parked", value: String(Ge) })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ e(
          Vt,
          {
            repos: W,
            selected: b,
            onToggle: we,
            onClear: De,
            onAddWorkspace: nt,
            onEdit: V
          }
        ),
        /* @__PURE__ */ s("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ s("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ e(Kt, { active: u, onChange: q, counts: Ve }),
            /* @__PURE__ */ s(
              "button",
              {
                onClick: () => g(!0),
                "aria-haspopup": "dialog",
                "aria-expanded": z,
                className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Open enabled agent sessions and see live activity",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: Ne || $e || H.some((t) => t.status === "pending" || t.responsePending) ? "var(--accent)" : "var(--muted)" },
                children: [
                  $e ? /* @__PURE__ */ e(pt, { size: 11 }) : /* @__PURE__ */ e(
                    "span",
                    {
                      className: Ne || H.some((t) => t.status === "pending" || t.responsePending) ? "inline-block animate-pulse" : "inline-block",
                      style: { width: 7, height: 7, borderRadius: 999, background: Ne ? "var(--ok)" : H.some((t) => t.responsePending) ? "var(--warn)" : H.some((t) => t.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: H.length ? 1 : 0.5 }
                    }
                  ),
                  /* @__PURE__ */ e("span", { className: "font-semibold", children: H.length ? `${H.length} session${H.length === 1 ? "" : "s"}` : "no sessions" }),
                  $e && /* @__PURE__ */ e("span", { children: "· thinking" }),
                  Ne && /* @__PURE__ */ e("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                  !$e && !Ne && H.filter((t) => t.status === "pending").length > 0 && /* @__PURE__ */ s("span", { children: [
                    "· ",
                    H.filter((t) => t.status === "pending").length,
                    " running"
                  ] }),
                  H.some((t) => t.responsePending) && /* @__PURE__ */ e("span", { style: { color: "var(--warn)" }, children: "· response" }),
                  H.some((t) => t.stale) && /* @__PURE__ */ s("span", { style: { color: "var(--warn)" }, children: [
                    "· ",
                    H.filter((t) => t.stale).length,
                    " stale ↻"
                  ] })
                ]
              }
            ),
            b.size > 0 && /* @__PURE__ */ s(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  b.size === 1 ? [...b][0] : `${b.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ e("button", { onClick: De, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ e(Ht, { config: x, onSet: U }),
          v ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : u === "backlog" ? /* @__PURE__ */ e(Pt, { cards: X }) : /* @__PURE__ */ s("div", { ref: ne, className: "flex gap-3 overflow-x-auto pb-4", children: [
            u === "pipeline" && te.map((t) => /* @__PURE__ */ e(Ze, { id: `stage-col-${t.id}`, title: t.name, count: (xe[t.id] || []).length, children: (xe[t.id] || []).map((o) => /* @__PURE__ */ e(Je, { ...Re(o) }, o.id)) }, t.id)),
            u === "workspace" && Object.entries(ze).map(([t, o]) => /* @__PURE__ */ e(Ze, { title: t, count: o.length, children: o.map((l) => /* @__PURE__ */ e(Je, { ...Re(l) }, l.id)) }, t)),
            u === "crew" && Object.entries(We).map(([t, o]) => /* @__PURE__ */ e(Ze, { title: t, count: o.length, children: o.map((l) => /* @__PURE__ */ e(Je, { ...Re(l) }, l.id)) }, t)),
            u === "status" && Object.entries(Ke).map(([t, o]) => /* @__PURE__ */ e(Ze, { title: t, count: o.length, children: o.map((l) => /* @__PURE__ */ e(Je, { ...Re(l) }, l.id)) }, t))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  tr as default
};
