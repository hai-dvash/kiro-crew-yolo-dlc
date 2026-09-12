import { jsx as e, Fragment as He, jsxs as a } from "react/jsx-runtime";
import { useChatLauncher as ir, useAppApi as Zt, useNavigate as cr } from "@kirocrew/app-sdk";
import { PageHeader as dr, StatCard as kt } from "@kirocrew/app-sdk/ui";
import { useState as N, useCallback as ae, useEffect as _e, useMemo as xe, useRef as fe } from "react";
const pr = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), ur = /^[.,!?;:%)\]}]$/u, mr = /^[(\[{]$/u;
function gr(t, r = 3) {
  const o = (String(t || "").match(pr) || []).slice(-Math.max(0, r));
  return o.reduce((l, m, u) => {
    if (u === 0) return m;
    const g = o[u - 1];
    return ur.test(m) || mr.test(g) ? l + m : l + " " + m;
  }, "");
}
function Dt(t, r = !1) {
  return t != null && t.active && !r ? t : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function vr(t, r, i) {
  if (!r || t != null && t.active && Number.isFinite(i) && Number.isFinite(t.seq) && i <= t.seq)
    return t;
  const l = ((t != null && t.active ? t.buffer : "") + r).slice(-512);
  return { buffer: l, tail: gr(l, 3), active: !0, phase: "generating", seq: Number(i) || 0 };
}
function hr(t) {
  return t && { ...t, active: !1, phase: "idle" };
}
const br = /* @__PURE__ */ new Set(["done", "advanced"]), xr = /* @__PURE__ */ new Set([
  "done",
  "advanced",
  "completed",
  "consumed",
  "integrated",
  "waived",
  "omitted"
]), Le = (t) => !!t && typeof t == "object" && !Array.isArray(t), H = (t) => Le(t) ? t : {}, ce = (t) => Array.isArray(t) ? t : t == null ? [] : [t], z = (...t) => t.find((r) => r != null && r !== "");
function De(t) {
  if (t == null || t === "") return "unobservable";
  if (typeof t == "boolean") return t ? "yes" : "no";
  if (typeof t == "string" || typeof t == "number") return String(t);
  if (Array.isArray(t)) return t.length ? t.map(De).join(" · ") : "none";
  if (Le(t)) {
    const r = Object.entries(t);
    return r.length ? r.map(([i, o]) => `${i}: ${De(o)}`).join(" · ") : "none";
  }
  return String(t);
}
function Ie(t) {
  return ce(t).map((r, i) => {
    if (!Le(r))
      return { key: `item-${i}`, title: De(r), detail: null, status: null, level: null, ref: null, url: null };
    const o = z(
      r.title,
      r.label,
      r.name,
      r.requirement,
      r.question,
      r.check,
      r.kind,
      r.id,
      r.path,
      r.ref
    ) || `item ${i + 1}`, l = z(
      r.summary,
      r.detail,
      r.description,
      r.rationale,
      r.result,
      r.note,
      r.reason,
      r.path,
      r.ref
    ), m = z(
      r.enforcement,
      r.level,
      r.priority,
      r.required === !0 ? "required" : void 0
    ), u = z(
      r.status,
      r.outcome,
      r.state,
      r.passed === !0 ? "passed" : void 0,
      r.passed === !1 ? "failed" : void 0
    ), g = z(r.url, r.path, r.ref), d = typeof g == "string" && /^https?:\/\//.test(g) ? g : null;
    return {
      key: String(z(r.id, r.key, r.path, r.ref, `item-${i}`)),
      title: String(o),
      detail: l == null || String(l) === String(o) ? null : De(l),
      status: u == null ? null : String(u),
      level: m == null ? null : String(m),
      ref: g == null ? null : String(g),
      url: d
    };
  });
}
function fr(t) {
  return ce(t).filter((r) => r != null).map((r, i) => {
    const o = H(r), l = Le(r) ? z(o.url, o.path, o.ref, o.id) : String(r), m = Le(r) ? z(o.label, o.name, o.kind, o.id, o.path, o.ref, `artifact ${i + 1}`) : String(r), u = z(o.url, typeof l == "string" && /^https?:\/\//.test(l) ? l : void 0), g = z(o.preview, o.summary, o.description, o.evidence, o.detail);
    return {
      key: String(z(o.id, o.path, o.ref, `artifact-${i}`)),
      label: String(m),
      ref: l == null ? null : String(l),
      url: typeof u == "string" && /^https?:\/\//.test(u) ? u : null,
      preview: g == null ? null : De(g),
      kind: o.kind == null ? null : String(o.kind),
      status: o.status == null ? null : String(o.status)
    };
  });
}
function yr(t) {
  return ce(t.children).map((i, o) => {
    const l = H(i), m = l.required !== !1 && !["optional", "preferred", "advisory"].includes(
      String(z(l.enforcement, l.level, "required")).toLowerCase()
    ), u = String(z(l.status, l.state, "unobservable"));
    return {
      key: String(z(l.id, l.card_id, l.issue, `child-${o}`)),
      label: String(z(l.title, l.name, l.card_id, l.id, l.issue, `child ${o + 1}`)),
      required: m,
      status: u,
      complete: xr.has(u.toLowerCase())
    };
  });
}
const Jt = /* @__PURE__ */ new Set([
  "done",
  "completed",
  "covered",
  "satisfied",
  "validated",
  "met",
  "passed",
  "approved"
]);
function kr(t, r) {
  const i = H(t == null ? void 0 : t.execution_envelope);
  return i.step === r ? i : ce(t == null ? void 0 : t.execution_envelope_history).map(H).reverse().find((o) => o.step === r) || {};
}
function Qt(t) {
  return typeof t == "string" ? t.trim().length > 0 : Le(t) ? [
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
  ].some((r) => t[r] !== void 0 && t[r] !== null && t[r] !== "" && (!Array.isArray(t[r]) || t[r].length > 0)) : !1;
}
function zt(t, r) {
  const i = ce(t.validation_and_evidence).map(H);
  return ce(r).map(String).filter((o) => !i.some((l) => {
    const m = String(z(l.kind, l.type, l.id, "")).toLowerCase(), u = String(z(l.status, "")).toLowerCase();
    return (m === o.toLowerCase() || ce(l.satisfies).map(String).includes(o)) && Jt.has(u) && Qt(l);
  }));
}
function wr(t, r) {
  const i = ce(t.findings).map(H);
  if (!i.length) return !1;
  if (!r) return !0;
  const o = ce(z(t.sources, t.consulted_sources)).map(H).filter((m) => typeof m.url == "string" && /^https?:\/\//.test(m.url) && m.title && m.accessed_at && z(m.source_type, m.type)), l = new Set(o.flatMap((m) => [m.id && String(m.id), m.url]).filter(Boolean));
  return l.size > 0 && i.every((m) => {
    const u = ce(z(m.source_ids, m.sources)).map(String);
    return m.claim && u.some((g) => l.has(g));
  });
}
function Nr(t, r, i, o) {
  const l = H(t == null ? void 0 : t.intent_integrity), m = l.status === "violation" ? [`intent integrity (${ce(l.violations).join(", ")})`] : [], u = kr(t, r), g = ce(H(u.observations).controls_runtime);
  if (Number(u.schema_version || 0) < 2 || !g.includes("result_scope"))
    return { missing: m, preferredShortfalls: [] };
  const d = [...m], T = [];
  i.envelope_id !== u.id && d.push("result bound to the active envelope revision");
  const x = ce(t == null ? void 0 : t.decisions).map(H).filter((y) => y.step && y.step !== r || y.envelope_id && y.envelope_id !== u.id ? !1 : y.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(y.kind)), j = x.filter((y) => {
    const ee = String(z(y.status, "")).toLowerCase();
    return y.chosen === void 0 && y.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(ee);
  }), f = H(u.questions);
  j.length && d.push("all qualified questions resolved before completion"), j.length > 1 && f.cadence === "one-at-a-time" && d.push("one-at-a-time question cadence"), Number.isInteger(f.max_rounds) && x.length > f.max_rounds && d.push(`question rounds within max_rounds=${f.max_rounds}`);
  const w = H(u.result_scope), V = H(w.enforcement), I = new Map(ce(o.intent_and_requirement_coverage).map(H).filter((y) => z(y.intent_id, y.constraint_id, y.id)).map((y) => [String(z(y.intent_id, y.constraint_id, y.id)), y]));
  for (const y of [...ce(w.required_outcome_ids), ...ce(w.hard_constraint_ids)]) {
    const ee = I.get(String(y)) || {}, S = String(z(ee.status, "")).toLowerCase(), se = ce(z(ee.evidence_refs, ee.requirement_refs, ee.refs));
    (!Jt.has(S) || !se.some(Qt)) && d.push(`required intent coverage ${y}`);
  }
  const q = ce(o.alternatives);
  if (Number.isInteger(w.alternatives) && q.length < w.alternatives) {
    const y = `${w.alternatives} material alternatives`;
    V.alternatives === "required" ? d.push(y) : V.alternatives === "preferred" && T.push(y);
  }
  const O = zt(o, w.evidence), R = zt(o, w.validation);
  V.evidence === "required" ? d.push(...O.map((y) => `required evidence ${y.toLowerCase()}`)) : V.evidence === "preferred" && T.push(...O.map((y) => `preferred evidence ${y.toLowerCase()}`)), V.validation === "required" ? d.push(...R.map((y) => `required validation ${y.toLowerCase()}`)) : V.validation === "preferred" && T.push(...R.map((y) => `preferred validation ${y.toLowerCase()}`));
  const B = H(u.research_policy), _ = H(t == null ? void 0 : t.research_artifacts)[r], M = ce(z(o.research_and_citations, _)).map(H), K = M.filter((y) => wr(
    y,
    B.citations === "required"
  ));
  return B.mode === "required" && !K.length && d.push("required research with claim-level citations"), Number.isInteger(B.max_passes) && M.length > B.max_passes && d.push(`research passes within max_passes=${B.max_passes}`), B.mode === "on-demand" && M.length && !K.length && T.push("complete citations for used research"), {
    missing: [...new Set(d)],
    preferredShortfalls: [...new Set(T)]
  };
}
function _r(t, r, i) {
  const o = H(t.runtime_handshakes), l = H(t.runtime_handshake), m = H(o[r] || (l.step == null || l.step === r ? l : {})), u = H(m.assignment), g = H(m.capabilities), d = H(g.tools), T = H(g.skills), x = H(m.routing), j = H(x.model), f = H(x.reasoning_effort), w = H(m.scope), V = H(w.worktree), I = H(i.routing_and_provenance), q = H(I.model), O = H(I.reasoning_effort), R = H(I.assignment), B = z(d.profile_declared, d.declared, I.declared_tools), _ = z(d.actual, I.actual_tools), M = z(T.profile_declared, T.declared, I.declared_skills), K = z(T.actual, I.actual_skills);
  return {
    assignedProfile: z(
      R.assigned_profile,
      I.assigned_profile,
      u.assigned_profile
    ) ?? null,
    effectiveProfile: z(
      R.effective_profile,
      I.effective_profile,
      u.effective_profile
    ) ?? null,
    model: {
      requested: z(q.requested, I.requested_model, j.requested) ?? null,
      applied: z(q.applied, I.applied_model, j.applied) ?? null,
      provider: z(q.provider, I.resolved_provider, j.provider) ?? null,
      version: z(q.version, I.model_version, j.version) ?? null,
      status: z(
        q.status,
        I.model_resolution_status,
        j.status,
        z(q.applied, I.applied_model, j.applied) != null ? "observed" : "unobservable"
      )
    },
    effort: {
      requested: z(O.requested, I.requested_effort, f.requested) ?? null,
      applied: z(O.applied, I.applied_effort, f.applied) ?? null,
      status: z(
        O.status,
        I.effort_resolution_status,
        f.status,
        z(O.applied, I.applied_effort, f.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: B == null ? null : ce(B),
      actual: _ == null ? null : ce(_),
      status: z(d.status, I.tools_status, _ != null ? "observed" : "unobservable")
    },
    skills: {
      declared: M == null ? null : ce(M),
      actual: K == null ? null : ce(K),
      status: z(T.status, I.skills_status, K != null ? "observed" : "unobservable")
    },
    network: H(w.network),
    write: H(w.write),
    worktree: Object.keys(V).length ? V : null
  };
}
function Cr(t, r) {
  const i = H(t == null ? void 0 : t.gate_review), o = H(i.bundle), l = z(i.gate, t == null ? void 0 : t.stage), m = z(i.producer_step, r), u = H(t == null ? void 0 : t.step_sessions), g = Number.isInteger(i.result_revision) ? i.result_revision : null, d = z(i.status, "unobservable"), T = m ? H(t == null ? void 0 : t.step_status)[m] : void 0, x = fr(o.artifacts), j = H(o.card_topology), f = yr(j), w = z(j.action, "unobservable"), V = ["fan-in", "unify"].includes(String(w).toLowerCase()), I = V ? f.filter((K) => K.required && !K.complete) : [], q = [];
  (!(t != null && t.gate_review) || !Le(t.gate_review)) && q.push("result bundle record"), (!i.bundle || !Le(i.bundle)) && q.push("declared result bundle"), m || q.push("producer binding"), g === null && q.push("result revision"), l && (t != null && t.stage) && l !== t.stage && q.push("gate binding matches current stage"), d !== "awaiting-review" && q.push(`review status awaiting-review (currently ${d})`), br.has(String(T || "").toLowerCase()) || q.push(`terminal producer status (currently ${T || "unobservable"})`), z(o.summary) || q.push("result summary"), x.length === 0 && q.push("referenced artifact");
  const O = x.filter((K) => !K.ref);
  O.length > 0 && q.push(`artifact reference (${O.length} missing)`), V && f.length === 0 && q.push("declared fan-in child set"), I.length > 0 && q.push(`required child fan-in (${I.length} incomplete)`);
  const R = Nr(t, m, i, o);
  q.push(...R.missing);
  const B = ce(t == null ? void 0 : t.decisions).filter((K) => {
    const y = H(K);
    return !y.chosen && (!m || !y.step || y.step === m);
  }), _ = Ie([
    ...ce(o.decisions_and_questions),
    ...B
  ]), M = _r(t || {}, m, o);
  return {
    gate: l || null,
    producerStep: m || null,
    producerSessionRef: z(
      i.producer_session_ref,
      m && Le(u[m]) ? `step_sessions.${m}` : void 0
    ) || null,
    envelopeId: z(i.envelope_id) || null,
    revision: g,
    reviewStatus: d,
    createdAt: z(i.created_at) || null,
    ready: q.length === 0,
    missing: q,
    summary: z(o.summary) || null,
    changes: Ie(o.changes_since_prior),
    artifacts: x,
    coverage: Ie(o.intent_and_requirement_coverage),
    alternatives: Ie(o.alternatives),
    research: Ie(z(
      o.research_and_citations,
      m && H(t == null ? void 0 : t.research_artifacts)[m]
    )),
    preferredShortfalls: R.preferredShortfalls,
    decisions: _,
    topology: {
      action: w,
      integrationOwner: z(j.integration_owner, j.owner) || null,
      integrationStatus: z(j.integration_status, j.status) || null,
      children: f,
      incompleteRequiredChildren: I
    },
    budget: {
      allocated: H(o.budget).allocated ?? null,
      consumed: H(o.budget).consumed ?? null,
      remaining: H(o.budget).remaining ?? null
    },
    routing: M,
    validation: Ie(o.validation_and_evidence),
    risks: Ie(o.known_risks),
    deviations: Ie(o.omissions_and_deviations)
  };
}
const Sr = "~/.dlc-yolo/.statepath", Mt = "~/.dlc-yolo/state.json", Bt = "/tmp/dlc-yolo/state.json", Tr = 1, Gt = 4096, Ar = 3072;
function Rr(t) {
  let r = t;
  if (typeof t == "string") {
    if (new TextEncoder().encode(t).length > Gt) return null;
    try {
      r = JSON.parse(t);
    } catch {
      return null;
    }
  }
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  let i;
  try {
    i = JSON.stringify(r);
  } catch {
    return null;
  }
  if (new TextEncoder().encode(i).length > Gt) return null;
  const o = Object.keys(r).sort();
  if (o.length !== 2 || o[0] !== "path" || o[1] !== "schema_version" || r.schema_version !== Tr || typeof r.path != "string") return null;
  const l = r.path;
  return !l.startsWith("/") || l.length === 0 || l.length > Ar || l.includes("\0") || l.includes("\r") || l.includes(`
`) || l.split("/").some((m) => m === "." || m === "..") ? null : l;
}
async function St(t) {
  try {
    const r = await t(Sr), i = Rr(r);
    if (i)
      try {
        return { path: i, data: await t(i), source: "pointer" };
      } catch {
      }
  } catch {
  }
  try {
    return { path: Mt, data: await t(Mt), source: "durable" };
  } catch {
    return { path: Bt, data: await t(Bt), source: "scratch" };
  }
}
async function Wt(t, r) {
  try {
    return { path: r, data: await t(r), source: "current" };
  } catch {
    return St(t);
  }
}
const $r = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
function Er(t) {
  const r = /* @__PURE__ */ new Map();
  for (const i of String(t || "").split(/[\n,]/)) {
    const o = i.trim();
    $r.test(o) && !r.has(o.toLowerCase()) && r.set(o.toLowerCase(), o);
  }
  return [...r.values()].sort((i, o) => i.toLowerCase().localeCompare(o.toLowerCase()));
}
const Lr = {
  "receiver-disabled": "Enable and save the receiver above first.",
  "receiver-secret-missing": "Set a webhook secret above before exposing the port.",
  "receiver-allowlist-empty": "Add at least one allowed repository above first.",
  "receiver-port-mismatch": "Save the receiver on this port before starting the tunnel.",
  "receiver-not-listening": "The receiver is not listening yet — save it, then Refresh.",
  "receiver-config-invalid": "Repair the stored receiver configuration first."
};
function Pt(t) {
  return t === "listening" ? "var(--ok)" : t === "misconfigured" || t === "failed" ? "var(--danger, #ef4444)" : "var(--muted)";
}
function st(t) {
  const r = (t == null ? void 0 : t.message) || String(t);
  return /(?:404|not found)/i.test(r) ? "Webhook backend unavailable in the running gateway. Restart KiroCrew after syncing this app, then refresh this tab." : r;
}
function jr() {
  var $, C;
  const t = Zt(), [r, i] = N(null), [o, l] = N(!1), [m, u] = N("8765"), [g, d] = N(""), [T, x] = N(""), [j, f] = N(""), [w, V] = N(!1), [I, q] = N(!1), [O, R] = N(!0), [B, _] = N(!1), [M, K] = N(""), y = ae((v) => {
    i(v), l(!!v.enabled), u(String(v.port || 8765)), d((v.repositories || []).join(`
`)), x(v.inbox_path || ""), q(!!v.autosync), f(""), V(!1);
  }, []), ee = ae(async () => {
    R(!0), K("");
    try {
      y(await t.get("/apps/dlc-yolo/api/webhook/config"));
    } catch (v) {
      K(st(v));
    } finally {
      R(!1);
    }
  }, [t, y]);
  _e(() => {
    ee();
  }, [ee]);
  const [S, se] = N(null), [ie, ne] = N(!1), oe = ae(async () => {
    try {
      se(await t.get("/apps/dlc-yolo/api/tunnel/status"));
    } catch {
      se(null);
    }
  }, [t]);
  _e(() => {
    oe();
  }, [oe]);
  const be = ae(async () => {
    ne(!0);
    try {
      se(await t.post("/apps/dlc-yolo/api/tunnel/start", {}));
    } catch (v) {
      K(st(v));
    } finally {
      ne(!1);
    }
  }, [t]), Z = ae(async () => {
    ne(!0);
    try {
      se(await t.post("/apps/dlc-yolo/api/tunnel/stop", {}));
    } catch (v) {
      K(st(v));
    } finally {
      ne(!1);
    }
  }, [t]), [D, X] = N(null), [pe, ue] = N(!1), ve = ae(async () => {
    try {
      X(await t.get("/apps/dlc-yolo/api/crons/status"));
    } catch {
      X(null);
    }
  }, [t]);
  _e(() => {
    ve();
  }, [ve]);
  const h = ae(async (v) => {
    ue(!0);
    try {
      const re = v ? "/apps/dlc-yolo/api/crons/pause" : "/apps/dlc-yolo/api/crons/resume";
      X(await t.post(re, {}));
    } catch (re) {
      K(st(re));
    } finally {
      ue(!1);
    }
  }, [t]), P = xe(() => Er(g), [g]), U = Number(m), le = typeof TextEncoder > "u" ? j.length : new TextEncoder().encode(j).length, ke = !!(r != null && r.secret_configured) || le >= 32, W = Number.isInteger(U) && U >= 1024 && U <= 65535 && (!o || P.length > 0 && ke) && (!T.trim() || T.trim().startsWith("/")), de = async () => {
    if (!(!(r != null && r.editable) || !W)) {
      _(!0), K("");
      try {
        const v = {
          enabled: o,
          port: U,
          repositories: P,
          inbox_path: T.trim() || null,
          clear_secret: w,
          autosync: I
        };
        j && (v.secret = j), y(await t.post("/apps/dlc-yolo/api/webhook/config", v));
      } catch (v) {
        K(st(v));
      } finally {
        _(!1);
      }
    }
  };
  return /* @__PURE__ */ a(
    "section",
    {
      "data-pipeline-webhook-settings": !0,
      "aria-labelledby": "webhook-settings-title",
      className: "w-full rounded-lg overflow-hidden flex flex-col",
      style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))" },
      children: [
        /* @__PURE__ */ e("header", { className: "px-4 py-3 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ e("h2", { id: "webhook-settings-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "GitHub webhook" }),
            /* @__PURE__ */ e(
              "span",
              {
                className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: "App-wide"
              }
            ),
            r && /* @__PURE__ */ e(
              "span",
              {
                className: "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                style: { color: Pt(r.listener), background: `color-mix(in srgb, ${Pt(r.listener)} 13%, transparent)` },
                children: r.listener
              }
            )
          ] }),
          /* @__PURE__ */ e("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "Shared by every pipeline. This authenticated control owns the app-wide loopback receiver; the secret is write-only and never returned." })
        ] }) }),
        /* @__PURE__ */ a("div", { className: "px-4 py-4 flex flex-col gap-4", children: [
          O ? /* @__PURE__ */ e("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: "Loading receiver configuration…" }) : r && /* @__PURE__ */ a(He, { children: [
            r.configuration_source === "environment" && /* @__PURE__ */ e("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))", background: "color-mix(in srgb, var(--warn) 7%, transparent)" }, children: "Gateway environment variables currently own this configuration, so the UI is read-only. Remove those overrides and restart the gateway to transfer authority to this form." }),
            r.configuration_source === "invalid" && /* @__PURE__ */ a("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid var(--danger, #ef4444)" }, children: [
              "Stored configuration failed secure validation and was not loaded. Repair or remove the app-owned config file before using this form.",
              r.configuration_error && /* @__PURE__ */ a("div", { className: "mt-1 font-mono", children: [
                "Reason: ",
                r.configuration_error
              ] })
            ] }),
            /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
              /* @__PURE__ */ a("div", { children: [
                /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Enable receiver" }),
                /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Applies immediately for UI-managed settings; polling remains reconciliation." })
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  type: "button",
                  disabled: !r.editable,
                  onClick: () => l((v) => !v),
                  "aria-pressed": o,
                  className: "rounded-full transition-all relative disabled:opacity-50",
                  style: { background: o ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                  children: /* @__PURE__ */ e("span", { className: "absolute top-0.5 rounded-full transition-all", style: { height: 18, width: 18, background: "var(--bg)", left: o ? 20 : 2 } })
                }
              )
            ] }),
            /* @__PURE__ */ a("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
              /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Loopback port",
                /* @__PURE__ */ e(
                  "input",
                  {
                    type: "number",
                    min: 1024,
                    max: 65535,
                    value: m,
                    disabled: !r.editable,
                    onChange: (v) => u(v.target.value),
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ a("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Fixed listener route",
                /* @__PURE__ */ a(
                  "div",
                  {
                    className: "mt-1 px-3 py-2 rounded-md text-sm font-mono normal-case",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
                    children: [
                      "127.0.0.1:",
                      Number.isFinite(U) ? U : "—",
                      "/github"
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "Repository allowlist · one owner/repo per line",
              /* @__PURE__ */ e(
                "textarea",
                {
                  rows: 4,
                  value: g,
                  disabled: !r.editable,
                  onChange: (v) => d(v.target.value),
                  placeholder: "owner/repo",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "Durable inbox override · optional absolute path",
              /* @__PURE__ */ e(
                "input",
                {
                  value: T,
                  disabled: !r.editable,
                  onChange: (v) => x(v.target.value),
                  placeholder: "Uses the state directory by default",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "GitHub webhook secret · ",
              r.secret_configured ? "configured; leave blank to keep" : "minimum 32 bytes",
              /* @__PURE__ */ e(
                "input",
                {
                  type: "password",
                  autoComplete: "new-password",
                  value: j,
                  disabled: !r.editable,
                  onChange: (v) => f(v.target.value),
                  placeholder: r.secret_configured ? "•••••••••••••••• (unchanged)" : "Enter a new secret",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            !o && r.secret_configured && r.editable && /* @__PURE__ */ a("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer", style: { color: "var(--muted)" }, children: [
              /* @__PURE__ */ e("input", { type: "checkbox", checked: w, onChange: (v) => V(v.target.checked) }),
              "Remove the stored secret when saving the disabled receiver"
            ] }),
            /* @__PURE__ */ a(
              "div",
              {
                className: "rounded-md p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Source" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: r.configuration_source })
                  ] }),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Allowlist" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: r.allowed_repository_count })
                  ] }),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Pending" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: (($ = r.inbox) == null ? void 0 : $.pending) ?? "—" })
                  ] }),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Processed" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: ((C = r.inbox) == null ? void 0 : C.processed) ?? "—" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ a("div", { className: "text-[11px] leading-5", style: { color: "var(--muted)" }, children: [
              "Configure GitHub for ",
              /* @__PURE__ */ e("strong", { children: "Issues" }),
              " and ",
              /* @__PURE__ */ e("strong", { children: "Labels" }),
              " events and use the same secret. A public relay/tunnel may forward only its ",
              /* @__PURE__ */ e("code", { children: "/github" }),
              " route to this loopback listener—never expose the dashboard or general API."
            ] }),
            /* @__PURE__ */ a(
              "div",
              {
                "data-cloudflare-tunnel": !0,
                className: "rounded-md p-3 flex flex-col gap-2",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ e("span", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Cloudflare tunnel" }),
                    /* @__PURE__ */ e(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: S != null && S.running ? "var(--ok)" : "var(--muted)", border: "1px solid var(--border)" },
                        children: S ? S.running ? "running" : S.installed ? "stopped" : "not installed" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ e("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "The receiver is loopback-only, so GitHub needs a public relay. Start a Cloudflare quick tunnel here, or run the shown command yourself. cloudflared is never installed automatically." }),
                  S && !S.installed && /* @__PURE__ */ a("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "cloudflared is not installed. Install it, then Refresh status.",
                    S.install_hint && /* @__PURE__ */ e("pre", { className: "mt-1 whitespace-pre-wrap font-mono text-[10px]", style: { color: "var(--text)" }, children: S.install_hint })
                  ] }),
                  (S == null ? void 0 : S.running) && S.payload_url && /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "GitHub payload URL",
                    /* @__PURE__ */ e(
                      "input",
                      {
                        readOnly: !0,
                        value: S.payload_url,
                        onFocus: (v) => v.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ok)" }
                      }
                    )
                  ] }),
                  (S == null ? void 0 : S.command) && /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "Command ",
                    S.running ? "running" : "to run yourself",
                    /* @__PURE__ */ e(
                      "input",
                      {
                        readOnly: !0,
                        value: S.command,
                        onFocus: (v) => v.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }
                      }
                    )
                  ] }),
                  (S == null ? void 0 : S.last_error) && /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Tunnel: ",
                    S.last_error
                  ] }),
                  S && S.installed && !S.running && S.receiver_ready === !1 && /* @__PURE__ */ a("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "Won't expose the port until the receiver is ready: ",
                    Lr[S.receiver_block_reason || ""] || S.receiver_block_reason
                  ] }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    S != null && S.running ? /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void Z(),
                        disabled: ie,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--danger, #ef4444)", color: "var(--bg)" },
                        children: ie ? "Stopping…" : "Stop tunnel"
                      }
                    ) : /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void be(),
                        disabled: ie || !(S != null && S.installed) || (S == null ? void 0 : S.receiver_ready) === !1,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: ie ? "Starting…" : "Start tunnel"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void oe(),
                        disabled: ie,
                        className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50",
                        style: { color: "var(--muted)" },
                        children: "Refresh"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ a("p", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
                    "Exposes only the receiver's ",
                    /* @__PURE__ */ e("code", { children: "/github" }),
                    " route; every delivery is HMAC-verified. Quick-tunnel URLs change each restart — update the GitHub payload URL when it does."
                  ] }),
                  /* @__PURE__ */ a("label", { className: "flex items-start gap-2 mt-1 cursor-pointer", style: { color: "var(--text)" }, children: [
                    /* @__PURE__ */ e(
                      "input",
                      {
                        type: "checkbox",
                        checked: I,
                        disabled: !(r != null && r.editable),
                        onChange: (v) => q(v.target.checked),
                        className: "mt-0.5"
                      }
                    ),
                    /* @__PURE__ */ a("span", { className: "text-[11px]", children: [
                      /* @__PURE__ */ e("span", { className: "font-medium", children: "Auto-sync the GitHub webhook URL" }),
                      " — on tunnel start, re-point each allowed repo's webhook to the new ",
                      /* @__PURE__ */ e("code", { children: "…trycloudflare.com/github" }),
                      " URL via ",
                      /* @__PURE__ */ e("code", { children: "gh" }),
                      ". Only rewrites a hook already on a quick-tunnel host (a hand-set stable URL is never touched). Save to apply."
                    ] })
                  ] }),
                  (S == null ? void 0 : S.autosync) && S.autosync.enabled && /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: S.autosync.error ? "var(--danger, #ef4444)" : "var(--ok)" }, children: S.autosync.error ? `Auto-sync failed: ${S.autosync.error}` : `Auto-synced ${(S.autosync.results || []).filter((v) => v.action === "updated").length} hook(s) → ${S.autosync.payload_url}` })
                ]
              }
            ),
            /* @__PURE__ */ a(
              "div",
              {
                "data-automation-crons": !0,
                className: "rounded-md p-3 flex flex-col gap-2",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ e("span", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Automation crons" }),
                    D && D.available && /* @__PURE__ */ e(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: D.all_paused ? "var(--warn)" : "var(--ok)", border: "1px solid var(--border)" },
                        children: D.all_paused ? "paused" : D.any_active ? "running" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ e("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "DLC-YOLO's three background jobs (advance · spawns · backlog-intake). Pause them for a webhook-only or maintenance setup; the webhook receiver keeps working while paused (a verified delivery still wakes advance when resumed). Polling stops while paused." }),
                  D && !D.available && /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Cron control unavailable",
                    D.error ? `: ${D.error}` : "",
                    "."
                  ] }),
                  D && D.available && D.jobs.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-col gap-1", children: D.jobs.map((v) => /* @__PURE__ */ a(
                    "div",
                    {
                      className: "flex items-center justify-between text-[11px] font-mono",
                      style: { color: "var(--muted)" },
                      children: [
                        /* @__PURE__ */ e("span", { children: v.basename }),
                        /* @__PURE__ */ e("span", { style: { color: v.paused ? "var(--warn)" : "var(--ok)" }, children: v.paused ? "paused" : "active" })
                      ]
                    },
                    v.id
                  )) }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void h(!0),
                        disabled: pe || !(D != null && D.available) || (D == null ? void 0 : D.all_paused),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--warn)", color: "var(--bg)" },
                        children: pe ? "…" : "Pause all"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void h(!1),
                        disabled: pe || !(D != null && D.available) || (D == null ? void 0 : D.any_active),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: pe ? "…" : "Resume all"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void ve(),
                        disabled: pe,
                        className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50",
                        style: { color: "var(--muted)" },
                        children: "Refresh"
                      }
                    )
                  ] })
                ]
              }
            )
          ] }),
          M && /* @__PURE__ */ e("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))" }, children: M })
        ] }),
        /* @__PURE__ */ a("footer", { className: "px-4 py-3 flex justify-between gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--card)" }, children: [
          /* @__PURE__ */ e("button", { onClick: () => void ee(), disabled: O || B, className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50", style: { color: "var(--muted)" }, children: "Refresh status" }),
          (r == null ? void 0 : r.editable) && /* @__PURE__ */ e(
            "button",
            {
              onClick: () => void de(),
              disabled: !W || B,
              className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
              style: { background: "var(--accent)", color: "var(--bg)" },
              children: B ? "Applying…" : "Save & apply"
            }
          )
        ] })
      ]
    }
  );
}
function Or({ repos: t, selectedRepos: r, onNewPipeline: i, onConfigure: o, onOpenAgents: l }) {
  const { openChat: m } = ir(), u = r.length === 1 ? r[0] : t.length === 1 ? t[0] : "", g = "/dlc-yolo", d = "text-[10px] leading-none px-1.5 py-1 rounded font-semibold";
  return /* @__PURE__ */ e(He, { children: /* @__PURE__ */ a("div", { "data-dlc-command-controls": !0, className: "mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap", children: [
    /* @__PURE__ */ e(
      "button",
      {
        onClick: () => m({ message: g }),
        title: "Open the DLC-YOLO command session; choose the next command action there",
        className: d,
        style: { background: "var(--accent)", color: "var(--bg)" },
        children: "✨ Command session"
      }
    ),
    /* @__PURE__ */ e(
      "button",
      {
        onClick: () => u ? o(u) : i(),
        className: d,
        style: { color: "var(--muted)", border: "1px solid var(--border)" },
        children: u ? "Edit pipeline" : "New pipeline"
      }
    ),
    /* @__PURE__ */ e(
      "button",
      {
        onClick: l,
        className: d,
        style: { color: "var(--muted)", border: "1px solid var(--border)" },
        children: "Agent config"
      }
    ),
    u && /* @__PURE__ */ a("span", { className: "text-[10px] truncate max-w-[300px]", style: { color: "var(--muted)" }, children: [
      "Target: ",
      u
    ] })
  ] }) });
}
const wt = {
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
};
function lt(t) {
  return t ? t.max_child_cards === "unlimited" && t.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth";
}
function Ir({ budget: t, depth: r, onSave: i }) {
  const [o, l] = N(!1), [m, u] = N(lt(t)), [g, d] = N(
    lt(t) === "custom" ? { ...t } : { ...wt[r] || wt.standard }
  ), T = () => {
    const f = lt(t);
    u(f), d(f === "custom" ? { ...t } : { ...wt[r] || wt.standard }), l(!0);
  }, x = () => {
    i(m === "depth" ? void 0 : m === "unlimited" ? {
      max_child_cards: "unlimited",
      effort_ceiling: "unlimited",
      max_feature_size: "XL",
      addenda: "proactive"
    } : { ...g }), l(!1);
  }, j = lt(t) === "depth" ? "budget: depth" : lt(t) === "unlimited" ? "budget: unlimited" : "budget: custom";
  return /* @__PURE__ */ a("div", { className: "relative", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        onClick: T,
        title: "Edit this card's explicit budget override",
        className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
        style: { color: t ? "var(--accent)" : "var(--muted)", border: `1px solid ${t ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)"}`, background: t ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" },
        children: j
      }
    ),
    o && /* @__PURE__ */ a(
      "div",
      {
        className: "absolute z-40 mt-1 left-0 w-72 rounded-lg p-3 flex flex-col gap-2",
        style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 12px 36px rgba(0,0,0,.35)" },
        children: [
          /* @__PURE__ */ e("div", { className: "text-[11px] font-semibold", style: { color: "var(--text)" }, children: "Card budget override" }),
          /* @__PURE__ */ e("div", { className: "grid grid-cols-3 gap-1", children: ["depth", "custom", "unlimited"].map((f) => /* @__PURE__ */ e(
            "button",
            {
              type: "button",
              onClick: () => u(f),
              className: "text-[10px] px-2 py-1 rounded font-semibold",
              style: { color: m === f ? "var(--bg)" : "var(--muted)", background: m === f ? "var(--accent)" : "var(--bg-hover, var(--border))" },
              children: f === "depth" ? "follow depth" : f
            },
            f
          )) }),
          m === "depth" && /* @__PURE__ */ a("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
            "Removes ",
            /* @__PURE__ */ e("code", { children: "card.budget" }),
            "; effective budget follows ",
            r || "standard",
            " depth."
          ] }),
          m === "unlimited" && /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: "var(--warn)" }, children: "Literal unlimited child/effort caps · XL · proactive addenda." }),
          m === "custom" && /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Child cards",
              /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: g.max_child_cards,
                  onChange: (f) => d((w) => ({ ...w, max_child_cards: Math.max(0, Number(f.target.value) || 0) })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Effort ceiling",
              /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: g.effort_ceiling,
                  onChange: (f) => d((w) => ({ ...w, effort_ceiling: Math.max(0, Number(f.target.value) || 0) })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Max feature",
              /* @__PURE__ */ e(
                "select",
                {
                  value: g.max_feature_size,
                  onChange: (f) => d((w) => ({ ...w, max_feature_size: f.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["S", "M", "L", "XL"].map((f) => /* @__PURE__ */ e("option", { children: f }, f))
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Addenda",
              /* @__PURE__ */ e(
                "select",
                {
                  value: g.addenda,
                  onChange: (f) => d((w) => ({ ...w, addenda: f.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["none", "obvious", "proactive"].map((f) => /* @__PURE__ */ e("option", { children: f }, f))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ a("div", { className: "flex justify-end gap-2 mt-1", children: [
            /* @__PURE__ */ e("button", { type: "button", onClick: () => l(!1), className: "text-[10px] px-2 py-1", style: { color: "var(--muted)" }, children: "Cancel" }),
            /* @__PURE__ */ e("button", { type: "button", onClick: x, className: "text-[10px] px-2 py-1 rounded font-semibold", style: { background: "var(--accent)", color: "var(--bg)" }, children: "Save budget" })
          ] })
        ]
      }
    )
  ] });
}
const Ft = [
  "terminal",
  "cancelling",
  "blocked",
  "error",
  "waiting-gate",
  "running-observed",
  "pending-unconfirmed",
  "queued",
  "ready",
  "idle"
], er = {
  terminal: { label: "Terminal", color: "var(--ok)" },
  cancelling: { label: "Cancelling", color: "var(--warn)" },
  blocked: { label: "Blocked", color: "var(--danger)" },
  error: { label: "Error", color: "var(--danger)" },
  "waiting-gate": { label: "Waiting at gate", color: "var(--warn)" },
  "running-observed": { label: "Running · observed", color: "var(--ok)" },
  "pending-unconfirmed": { label: "Pending · unconfirmed", color: "var(--accent)" },
  queued: { label: "Queued", color: "var(--info)" },
  ready: { label: "Ready", color: "var(--accent)" },
  idle: { label: "Idle / unstarted", color: "var(--muted)" }
}, Mr = /* @__PURE__ */ new Set(["retired", "merged"]), Ht = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked"]);
function qr(t) {
  const r = t == null ? void 0 : t.execution_schedule;
  if (!r || typeof r != "object") return null;
  const i = r.nodes;
  if (!i || typeof i != "object") return null;
  const o = r.current_node_id;
  return typeof o == "string" && i[o] && typeof i[o] == "object" ? i[o] : Object.values(i).find((l) => l && typeof l == "object" && l.step === t.stage) || null;
}
function Ut(t, r) {
  const i = t == null ? void 0 : t[r], o = i && typeof i == "object" ? i[t.stage] : null;
  return typeof o == "string" && o.trim() ? o.trim() : null;
}
function Kt(t, { isGate: r = !1, liveObserved: i = !1 } = {}) {
  const o = typeof (t == null ? void 0 : t.stage) == "string" ? t.stage : "", l = typeof (t == null ? void 0 : t.lifecycle) == "string" ? t.lifecycle.toLowerCase() : "", m = t != null && t.step_status && typeof t.step_status == "object" ? String(t.step_status[o] || "") : "", u = qr(t), g = typeof (u == null ? void 0 : u.status) == "string" ? u.status : "", d = t != null && t.step_sessions && typeof t.step_sessions == "object" ? t.step_sessions[o] : null, T = Ht.has(l) || g === "cancelling" || (d == null ? void 0 : d.writes_allowed) === !1 || !!(d != null && d.cancel_requested_at), x = o === "done" || Mr.has(l) || ["completed", "cancelled", "superseded"].includes(g);
  let j, f = null;
  return x ? (j = "terminal", f = g === "cancelled" || Ht.has(l) ? `terminal ${l || g}` : l || g || o || null) : T ? (j = "cancelling", f = "writes revoked; awaiting terminal observation") : m === "blocked" || g === "blocked" ? (j = "blocked", f = Ut(t, "block_reason") || ((u == null ? void 0 : u.wait_reasons) || [])[0] || "step blocked") : m === "error" || g === "failed" ? (j = "error", f = Ut(t, "error_reason") || (u == null ? void 0 : u.dispatch_error) || "step error") : r || g === "gate-wait" ? j = "waiting-gate" : i ? j = "running-observed" : m === "pending" || g === "running" ? (j = "pending-unconfirmed", f = "no current live observation") : ["queued", "dependency-wait", "permit-wait"].includes(g) ? (j = "queued", f = Array.isArray(u == null ? void 0 : u.wait_reasons) ? u.wait_reasons.join(" · ") : null) : g === "ready" ? j = "ready" : j = "idle", { kind: j, reason: f, ...er[j] };
}
const Ze = { LOOP: "loop", STEP: "step-agent", ORCH: "orchestrator", HUMAN: "human" };
function We(t) {
  return typeof t == "string" ? t : "";
}
function Dr(t) {
  if (!t || typeof t != "object") return [];
  const r = [], i = (o) => {
    o && o.at && r.push(o);
  };
  for (const o of t.history || [])
    !o || typeof o != "object" || i({
      id: `hist:${o.at}:${o.to}`,
      at: We(o.at),
      actor: Ze.LOOP,
      kind: "promoted",
      step: o.to,
      cls: "notification",
      needs_human: !1,
      headline: `advanced ${o.from || "?"} → ${o.to || "?"}`,
      detail: o.agent ? `by ${o.agent}` : ""
    });
  for (const [o, l] of Object.entries(t.step_summaries || {})) {
    if (!l || typeof l != "object" || !l.headline) continue;
    const m = l.status === "blocked";
    i({
      id: `summ:${o}:${l.at || l.status}`,
      at: We(l.at) || We(t.updated_at),
      actor: Ze.STEP,
      kind: m ? "blocked" : l.status === "error" ? "error" : "step-done",
      step: o,
      cls: "notification",
      needs_human: !!l.needs_human,
      headline: l.headline,
      detail: l.description || "",
      executor: l.executor || null
    });
  }
  for (const o of t.gate_history || [])
    !o || typeof o != "object" || i({
      id: `gate:${o.at}:${o.gate}`,
      at: We(o.at),
      actor: Ze.HUMAN,
      kind: o.decision === "rejected" ? "rejected" : o.decision === "approved" ? "approved" : "gate",
      step: o.gate,
      cls: "decision",
      needs_human: !1,
      headline: `you ${o.decision || "acted on"} ${o.gate}`,
      detail: o.notes || ""
    });
  for (const o of t.decisions || []) {
    if (!o || typeof o != "object") continue;
    const l = !!o.chosen || !!o.resolved_at;
    i({
      id: `dec:${o.id || o.at}`,
      at: We(o.at),
      actor: Ze.ORCH,
      kind: l ? "resolved" : "decision",
      step: o.step,
      cls: "decision",
      needs_human: !l,
      headline: l ? `resolved: ${o.chosen || o.action || o.kind || "decision"}` : `decision needed: ${o.question || o.kind || "a fork"}`,
      detail: o.rationale || o.question || ""
    });
  }
  for (const o of t.backstep_history || [])
    !o || typeof o != "object" || i({
      id: `back:${o.at}`,
      at: We(o.at),
      actor: Ze.ORCH,
      kind: "back-stepped",
      step: o.to,
      cls: "notification",
      needs_human: !1,
      headline: `stepped back ${o.from || "?"} → ${o.to || "?"}`,
      detail: o.reason || ""
    });
  for (const o of t.parked || [])
    !o || typeof o != "object" || i({
      id: `park:${o.id || o.at}`,
      at: We(o.at),
      actor: Ze.ORCH,
      kind: "parked",
      step: o.phase,
      cls: "notification",
      needs_human: !1,
      headline: `parked to backlog: ${o.note || "idea"}`,
      detail: o.issue_url || ""
    });
  return r.map((o, l) => ({ ...o, _i: l })).sort((o, l) => o.at < l.at ? -1 : o.at > l.at ? 1 : o._i - l._i).map(({ _i: o, ...l }) => l);
}
const zr = /^\[([a-z0-9-]+)\s*[·.]\s*f?\d+\]\s*(.*)$/i;
function tr(t) {
  const r = zr.exec(String(t || ""));
  return r ? { parentId: r[1], rest: r[2] } : null;
}
function Br(t, r) {
  var m;
  if (!t) return [];
  const i = [], o = /* @__PURE__ */ new Set(), l = (u) => {
    u && !o.has(u.id) && (o.add(u.id), i.push(u));
  };
  for (const u of ((m = t.topology) == null ? void 0 : m.children) || []) {
    const g = typeof u == "string" ? u : u == null ? void 0 : u.card_id, d = (r || []).find((T) => T.id === g);
    d && l({ id: d.id, title: d.title, stage: d.stage, lifecycle: d.lifecycle, required: (u == null ? void 0 : u.required) !== !1 });
  }
  for (const u of r || []) {
    const g = tr(u.title);
    g && g.parentId === t.id && l({ id: u.id, title: u.title, stage: u.stage, lifecycle: u.lifecycle, required: !0 });
  }
  return i;
}
function Gr(t) {
  var i;
  const r = tr(t == null ? void 0 : t.title);
  return r ? r.parentId : ((i = t == null ? void 0 : t.topology) == null ? void 0 : i.integration_owner) || (t == null ? void 0 : t.parent_card) || null;
}
const Vt = /^[A-Za-z0-9._-]{1,128}$/;
function it({ values: t, empty: r = "none declared" }) {
  return t.length ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1", children: t.map((i) => /* @__PURE__ */ e(
    "code",
    {
      className: "text-[10px] px-1.5 py-0.5 rounded",
      style: { color: "var(--text)", background: "var(--bg-hover, var(--border))", border: "1px solid var(--border)" },
      children: i
    },
    i
  )) }) : /* @__PURE__ */ e("span", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: r });
}
function Me({ label: t, value: r }) {
  return /* @__PURE__ */ a("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]", children: [
    /* @__PURE__ */ e("span", { className: "uppercase tracking-wide", style: { color: "var(--muted)" }, children: t }),
    /* @__PURE__ */ e("span", { className: "break-words", style: { color: r ? "var(--text)" : "var(--muted)" }, children: r || "not set" })
  ] });
}
function Wr({ profiles: t, initial: r, onSave: i, onClose: o }) {
  var B;
  const l = r ? "update" : "create", [m, u] = N((r == null ? void 0 : r.name) || ""), [g, d] = N((r == null ? void 0 : r.kiroAgent) || ((B = t.find((_) => _.status === "loaded")) == null ? void 0 : B.name) || ""), [T, x] = N((r == null ? void 0 : r.workspace) || ""), [j, f] = N((r == null ? void 0 : r.memoryStore) || ""), [w, V] = N(!1), [I, q] = N(""), O = Vt.test(m.trim()) && Vt.test(g.trim()) && new TextEncoder().encode(T.trim()).length <= 256 && new TextEncoder().encode(j.trim()).length <= 256, R = async () => {
    if (!(!O || w)) {
      V(!0), q("");
      try {
        await i({
          mode: l,
          name: m.trim(),
          kiroAgent: g.trim(),
          workspace: T.trim() || void 0,
          memoryStore: j.trim() || void 0
        });
      } catch (_) {
        q((_ == null ? void 0 : _.message) || String(_)), V(!1);
      }
    }
  };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[80] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 68%, transparent)", backdropFilter: "blur(3px)" },
      onMouseDown: (_) => {
        _.currentTarget === _.target && !w && o();
      },
      children: /* @__PURE__ */ a(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "crew-route-editor-title",
          className: "w-full max-w-lg rounded-xl overflow-hidden",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ a("header", { className: "px-5 py-4 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ e("h3", { id: "crew-route-editor-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: l === "create" ? "New global crew route" : `Edit ${r == null ? void 0 : r.name}` }),
                /* @__PURE__ */ e("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "UI-managed routing record backed by the sanctioned KiroCrew agent CLI—no chat handoff." })
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  onClick: o,
                  disabled: w,
                  "aria-label": "Close crew route editor",
                  className: "w-8 h-8 rounded-lg text-lg disabled:opacity-40",
                  style: { color: "var(--muted)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ a("div", { className: "px-5 py-4 flex flex-col gap-3.5", children: [
              /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Crew name",
                /* @__PURE__ */ e(
                  "input",
                  {
                    value: m,
                    onChange: (_) => u(_.target.value),
                    disabled: l === "update",
                    placeholder: "e.g. dlcyolo-secure-review",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none disabled:opacity-60",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Kiro agent authority profile",
                /* @__PURE__ */ e(
                  "input",
                  {
                    list: "dlc-agent-profile-options",
                    value: g,
                    onChange: (_) => d(_.target.value),
                    placeholder: "dlcyolo-readonly",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                ),
                /* @__PURE__ */ e("datalist", { id: "dlc-agent-profile-options", children: t.map((_) => /* @__PURE__ */ e("option", { value: _.name }, _.name)) })
              ] }),
              /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Workspace ",
                /* @__PURE__ */ e("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    value: T,
                    onChange: (_) => x(_.target.value),
                    placeholder: l === "update" ? "Blank keeps the current value" : "Default workspace",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Memory store ",
                /* @__PURE__ */ e("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    value: j,
                    onChange: (_) => f(_.target.value),
                    placeholder: l === "update" ? "Blank keeps the current value" : "Default memory store",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ a("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                "This edits the global crew → ",
                /* @__PURE__ */ e("code", { children: "kiro_agent" }),
                " route. Profile prompts, tools, and approval policy remain source-managed declarations; pipeline-local objectives stay in Pipeline Setup."
              ] }),
              I && /* @__PURE__ */ e("div", { className: "text-[11px] rounded-md px-3 py-2", style: { color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))" }, children: I })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              /* @__PURE__ */ e("button", { onClick: o, disabled: w, className: "text-[11px] px-3 py-1.5 rounded-md disabled:opacity-40", style: { color: "var(--muted)" }, children: "Cancel" }),
              /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => void R(),
                  disabled: !O || w,
                  className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: w ? "Saving…" : l === "create" ? "Create crew route" : "Save crew route"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function qt({ profiles: t, crews: r, loading: i = !1, context: o, onRefresh: l, onClose: m, onSelectProfile: u, onSelectCrew: g, onSaveCrew: d }) {
  var M, K;
  const [T, x] = N("agents"), [j, f] = N(((M = t[0]) == null ? void 0 : M.name) || ""), [w, V] = N(((K = r[0]) == null ? void 0 : K.name) || ""), [I, q] = N(null);
  _e(() => {
    var y;
    t.some((ee) => ee.name === j) || f(((y = t[0]) == null ? void 0 : y.name) || "");
  }, [t, j]), _e(() => {
    var y;
    r.some((ee) => ee.name === w) || V(((y = r[0]) == null ? void 0 : y.name) || "");
  }, [r, w]);
  const O = t.find((y) => y.name === j), R = r.find((y) => y.name === w), B = xe(
    () => R != null && R.kiroAgent ? t.find((y) => y.name === R.kiroAgent) : void 0,
    [R, t]
  ), _ = O != null && O.prompt ? O.prompt.length > 1200 ? `${O.prompt.slice(0, 1200)}…` : O.prompt : "";
  return /* @__PURE__ */ a(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 62%, transparent)", backdropFilter: "blur(2px)" },
      onMouseDown: (y) => {
        y.currentTarget === y.target && m();
      },
      children: [
        /* @__PURE__ */ a(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "agent-crew-catalog-title",
            className: "w-full max-w-4xl rounded-xl overflow-hidden flex flex-col",
            style: { height: "min(78vh, 760px)", background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" },
            children: [
              /* @__PURE__ */ a("header", { className: "px-5 py-4 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ e("h2", { id: "agent-crew-catalog-title", className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agents & crews" }),
                  /* @__PURE__ */ e("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "KiroCrew agent templates define prompts/tools/approval policy. Global crew records route to one template plus workspace and memory." }),
                  o && /* @__PURE__ */ a("p", { className: "text-[10px] mt-1", style: { color: "var(--accent)" }, children: [
                    "Pipeline context: ",
                    o
                  ] })
                ] }),
                l && /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: l,
                    disabled: i,
                    className: "text-[11px] px-2.5 py-1.5 rounded-md disabled:opacity-50",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: i ? "Refreshing…" : "Refresh"
                  }
                ),
                d && /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => {
                      x("crews"), q({ mode: "create" });
                    },
                    className: "text-[11px] px-2.5 py-1.5 rounded-md font-semibold",
                    style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))" },
                    children: "+ New crew route"
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: m,
                    "aria-label": "Close agents and crews",
                    className: "w-8 h-8 rounded-lg text-lg leading-none",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: [["agents", `Agent templates · ${t.length}`], ["crews", `Global crews · ${r.length}`]].map(([y, ee]) => /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => x(y),
                  className: "text-[12px] px-3 py-2 font-semibold",
                  style: { color: T === y ? "var(--accent)" : "var(--muted)", borderBottom: `2px solid ${T === y ? "var(--accent)" : "transparent"}`, marginBottom: -1 },
                  children: ee
                },
                y
              )) }),
              /* @__PURE__ */ e("div", { className: "flex min-h-0 flex-1", children: T === "agents" ? /* @__PURE__ */ a(He, { children: [
                /* @__PURE__ */ a("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  t.map((y) => /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: () => f(y.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: y.name === j ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: y.name === j ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold truncate", children: y.name }),
                        /* @__PURE__ */ e("div", { className: "text-[9px] mt-0.5", style: { color: y.status === "loaded" ? "var(--ok)" : "var(--warn)" }, children: y.status === "loaded" ? "config loaded" : "config unavailable" })
                      ]
                    },
                    y.name
                  )),
                  !t.length && /* @__PURE__ */ e("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No referenced profiles." })
                ] }),
                /* @__PURE__ */ e("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: O ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ e("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: O.name }),
                      /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: O.description || "No description declared." })
                    ] }),
                    u && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => u(O),
                        disabled: O.status !== "loaded",
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Use for this step"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ a("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ e(Me, { label: "Model", value: O.model || "auto / provider default" }),
                    /* @__PURE__ */ e(Me, { label: "Config source", value: O.sourcePath }),
                    /* @__PURE__ */ e(Me, { label: "Prompt", value: O.prompt ? O.prompt.startsWith("file://") ? O.prompt : "inline prompt" : void 0 })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Declared tools" }),
                    /* @__PURE__ */ e(it, { values: O.tools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Auto-approved tools" }),
                    /* @__PURE__ */ e(it, { values: O.allowedTools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Resources / skills" }),
                    /* @__PURE__ */ e(it, { values: O.resources })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "MCP servers" }),
                    /* @__PURE__ */ e(it, { values: O.mcpServers })
                  ] }),
                  _ && /* @__PURE__ */ a("details", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ e("summary", { className: "text-[11px] cursor-pointer", style: { color: "var(--accent)" }, children: "Prompt preview" }),
                    /* @__PURE__ */ e("pre", { className: "mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto", style: { color: "var(--muted)" }, children: _ })
                  ] }),
                  /* @__PURE__ */ e("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 28%, var(--border))" }, children: "These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access." })
                ] }) : /* @__PURE__ */ e("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select an agent template." }) })
              ] }) : /* @__PURE__ */ a(He, { children: [
                /* @__PURE__ */ a("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  r.map((y) => /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: () => V(y.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: y.name === w ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: y.name === w ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold truncate", children: y.name }),
                        /* @__PURE__ */ a("div", { className: "text-[9px] mt-0.5 truncate", style: { color: "var(--muted)" }, children: [
                          "→ ",
                          y.kiroAgent || "profile not declared"
                        ] })
                      ]
                    },
                    y.name
                  )),
                  !r.length && /* @__PURE__ */ e("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No global crews found." })
                ] }),
                /* @__PURE__ */ e("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: R ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ e("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: R.name }),
                      /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: R.description || "No description declared." })
                    ] }),
                    d && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => q({ mode: "update", crew: R }),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { color: "var(--accent)", border: "1px solid var(--border)" },
                        children: "Edit route"
                      }
                    ),
                    g && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => g(R),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Route step here"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ a("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ e(Me, { label: "kiro_agent", value: R.kiroAgent }),
                    /* @__PURE__ */ e(Me, { label: "Workspace", value: R.workspace }),
                    /* @__PURE__ */ e(Me, { label: "Memory store", value: R.memoryStore }),
                    /* @__PURE__ */ e(Me, { label: "Model override", value: R.model }),
                    /* @__PURE__ */ e(Me, { label: "Source", value: R.source })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Selection triggers" }),
                    /* @__PURE__ */ e(it, { values: R.triggers })
                  ] }),
                  R.kiroAgent && /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Authority profile" }),
                    /* @__PURE__ */ a("div", { className: "flex items-center gap-2 mt-1.5", children: [
                      /* @__PURE__ */ e("code", { className: "text-[12px]", style: { color: "var(--accent)" }, children: R.kiroAgent }),
                      /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: (B == null ? void 0 : B.status) === "loaded" ? "var(--ok)" : "var(--warn)" }, children: (B == null ? void 0 : B.status) === "loaded" ? "loaded" : "unavailable" }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => {
                            f(R.kiroAgent || ""), x("agents");
                          },
                          className: "ml-auto text-[10px] px-2 py-1 rounded",
                          style: { color: "var(--accent)", border: "1px solid var(--border)" },
                          children: "View profile"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ a("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--accent) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))" }, children: [
                    "This crew entry is a thin global routing record. Its tools and approval policy come from the linked ",
                    /* @__PURE__ */ e("code", { children: "kiro_agent" }),
                    " template; they are not duplicated on the crew."
                  ] })
                ] }) : /* @__PURE__ */ e("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select a global crew." }) })
              ] }) })
            ]
          }
        ),
        I && d && /* @__PURE__ */ e(
          Wr,
          {
            profiles: t,
            initial: I.mode === "update" ? I.crew : void 0,
            onClose: () => q(null),
            onSave: async (y) => {
              await d(y), V(y.name), q(null);
            }
          }
        )
      ]
    }
  );
}
const rr = Object.freeze([
  "pipeline-orchestrator",
  "intent-agent",
  "spec-agent",
  "design-agent",
  "impl-agent",
  "review-agent",
  "dlcyolo-readonly",
  "dlcyolo-authoring",
  "dlcyolo-builder",
  "dlcyolo-coordinator"
]), Pr = /^[A-Za-z0-9._-]{1,128}$/;
function Te(t) {
  return typeof t == "string" && Pr.test(t);
}
function Ee(t) {
  return typeof t == "string" && t.trim() ? t.trim() : void 0;
}
function Tt(t) {
  return Array.isArray(t) ? [...new Set(t.filter((r) => typeof r == "string" && r.trim()).map((r) => r.trim()))] : [];
}
function Fr(t) {
  return !t || typeof t != "object" || Array.isArray(t) ? [] : Object.entries(t).filter(([r, i]) => Te(r) && i && typeof i == "object" && !Array.isArray(i)).map(([r, i]) => ({
    name: r,
    kiroAgent: Te(i.kiro_agent) ? i.kiro_agent : void 0,
    workspace: Ee(i.workspace),
    memoryStore: Ee(i.memory_store ?? i.memoryStore),
    model: Ee(i.model),
    description: Ee(i.description),
    triggers: Tt(i.triggers),
    source: Ee(i.source)
  })).sort((r, i) => r.name.localeCompare(i.name));
}
function Hr(t, r = rr) {
  const i = [];
  for (const l of r)
    Te(l) && !i.includes(l) && i.push(l);
  const o = (Array.isArray(t) ? t : []).map((l) => l == null ? void 0 : l.kiroAgent).filter(Te).sort((l, m) => l.localeCompare(m));
  for (const l of o)
    i.includes(l) || i.push(l);
  return i;
}
function Ur(t, r, i = rr) {
  if (!Te(t)) return;
  if (i.includes(t)) return `~/.kiro/crew/apps/dlc-yolo/agents/${t}.json`;
  const o = [...new Set(
    (Array.isArray(r) ? r : []).filter((l) => (l == null ? void 0 : l.kiroAgent) === t).map((l) => l == null ? void 0 : l.source).filter(Te)
  )];
  if (o.length === 1)
    return `~/.kiro/agents/${o[0]}--${t}.json`;
}
function It(t, r, i) {
  const o = Te(r) ? r : "unknown", l = !!t && typeof t == "object" && !Array.isArray(t), m = l && Te(t.name) ? t.name : o, u = l && t.mcpServers && typeof t.mcpServers == "object" ? Object.keys(t.mcpServers).filter(Te) : [];
  return {
    name: m,
    description: l ? Ee(t.description) : void 0,
    prompt: l ? Ee(t.prompt) : void 0,
    model: l ? Ee(t.model) : void 0,
    tools: l ? Tt(t.tools) : [],
    allowedTools: l ? Tt(t.allowedTools) : [],
    resources: l ? Tt(t.resources) : [],
    mcpServers: u,
    status: l ? "loaded" : "unavailable",
    sourcePath: Ee(i)
  };
}
function Kr(t) {
  const r = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(t || "");
  return r == null ? void 0 : r[1];
}
function Vr(t, r) {
  if (!r || !Te(r.name)) return { ...t };
  const i = Kr(r.name);
  return {
    ...t,
    name: r.name,
    tools: [...r.tools || []],
    model: r.model || "auto",
    ...i ? { capability: i } : {}
  };
}
let Pe = Mt;
const Yt = (t) => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
})[t], At = [
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
], ar = /* @__PURE__ */ new Set([
  "example-org/web-app",
  "example-org/dashboard",
  "example-org/api-core"
]), Yr = {
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
}, Fe = ["manual", "assisted", "autonomous"], Je = ["quick", "standard", "deep"], ct = { trust: "assisted", depth: "standard" }, Rt = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, $t = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Ce({ color: t, children: r, title: i, onClick: o, active: l }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      title: i,
      onClick: o,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: t,
        background: `color-mix(in srgb, ${t} 14%, transparent)`,
        boxShadow: l ? `inset 0 0 0 1px color-mix(in srgb, ${t} 55%, transparent)` : "none",
        opacity: o && !l ? 0.85 : 1,
        cursor: o ? "pointer" : "default"
      },
      children: r
    }
  );
}
const Nt = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Xr({ steps: t, cardsByStage: r, onNodeClick: i }) {
  const o = fe(null), l = fe(null), m = fe(0), u = fe(null), g = fe(t), d = fe(r), T = fe([]);
  g.current = t, d.current = r;
  const x = 3, j = 116, f = j / x, w = f - 26, [V, I] = N(880);
  _e(() => {
    const R = l.current;
    if (!R) return;
    const B = new ResizeObserver((_) => {
      const M = Math.max(360, Math.floor(_[0].contentRect.width));
      I(M);
    });
    return B.observe(R), () => B.disconnect();
  }, []);
  const q = (R) => R.type === "gate" || R.id.startsWith("gate-");
  return _e(() => {
    const R = o.current;
    if (!R) return;
    const B = Math.floor(V / x);
    R.width = B * x, R.height = f * x;
    const _ = R.getContext("2d");
    if (!_) return;
    const M = (ee, S, se, ie, ne) => {
      _.fillStyle = ne, _.fillRect(ee * x, S * x, se * x, ie * x);
    }, K = () => {
      const ee = m.current, S = g.current, se = d.current, ie = Math.max(1, S.length);
      Math.max(1, ...S.map((Z) => {
        var D;
        return ((D = se[Z.id]) == null ? void 0 : D.length) || 0;
      })), M(0, 0, B, w, "#0f172a");
      for (let Z = 0; Z < B / 5; Z++) {
        const D = Z * 37 % B, X = Z * 13 % (w - 4);
        Math.sin(ee * 0.03 + Z * 2.1) > 0.35 && M(D, X, 1, 1, "#e2e8f0");
      }
      M(B - 26, 8, 10, 10, "#fde68a"), M(B - 24, 7, 8, 8, "#0f172a");
      for (let Z = 0; Z < B; Z += 16)
        for (let D = w; D < f; D += 16)
          M(Z, D, 16, 16, Z / 16 + D / 16 & 1 ? "#33261a" : "#2a1f14");
      M(0, w - 2, B, 2, "#4a3520");
      const ne = B / ie, oe = [];
      for (let Z = 0; Z < S.length; Z++) {
        const D = S[Z], X = Math.round(ne * (Z + 0.5)), ue = (se[D.id] || []).length, ve = ue > 0, h = Nt[Z % Nt.length], P = q(D), U = w - 2;
        if (oe.push({ x: X - Math.floor(ne / 2), w: Math.floor(ne), id: D.id }), Z < S.length - 1) {
          const W = Math.round(ne * (Z + 1.5));
          for (let de = X + 8; de < W - 8; de += 4) M(de, w - 1, 2, 1, "#4a3520");
        }
        if (P) {
          const W = U - 20, de = ve ? "#f39c12" : "#3a3222";
          M(X - 3, W, 6, 20, ve ? "#5c4a2a" : "#2a2418");
          for (let $ = 0; $ < 5; $++) M(X - $, W - 5 + $, $ * 2 + 1, 1, de);
          for (let $ = 0; $ < 5; $++) M(X - (4 - $), W - $, (4 - $) * 2 + 1, 1, de);
          if (ve) {
            const $ = (Math.sin(ee * 0.08) + 1) / 2;
            _.globalAlpha = 0.35 + $ * 0.4, M(X - 1, W - 6, 2, 2, "#ffd27a"), _.globalAlpha = 1;
          }
        } else {
          const W = U - 14;
          if (M(X - 10, W, 20, 3, "#7a5c47"), M(X - 10, W - 1, 20, 1, h), M(X - 9, W + 3, 2, 8, "#5c4033"), M(X + 7, W + 3, 2, 8, "#5c4033"), M(X - 5, W - 9, 10, 9, "#333"), M(X - 4, W - 8, 8, 7, ve ? "#0a2a0a" : "#1a1a1a"), ve)
            for (let de = 0; de < 3; de++) {
              const $ = 2 + (ee + de * 7) % 5;
              M(X - 3, W - 7 + de * 2, $, 0.8, "#33ff33");
            }
        }
        const le = Math.min(ue, 5);
        for (let W = 0; W < le; W++) {
          const de = le > 1 ? (W - (le - 1) / 2) * 8 : 0, $ = Math.round(X + de) - 3, C = U - (P ? 2 : 4), v = Nt[(Z + W) % Nt.length], re = Math.sin(ee * 0.08 + Z + W) > 0 ? 1 : 0;
          _.fillStyle = "rgba(0,0,0,0.18)", _.fillRect($ * x, (C + 8) * x, 6 * x, x), M($, C + re, 6, 6, v), M($ + 1, C - 4 + re, 4, 4, "#fdd"), M($ + 1, C - 5 + re, 4, 1, "#333"), (ee + Z * 9 + W * 5) % 120 >= 3 && (M($ + 2, C - 3 + re, 1, 1, "#333"), M($ + 4, C - 3 + re, 1, 1, "#333")), M($ + 1, C + 6, 1, 2, v), M($ + 4, C + 6, 1, 2, v);
        }
        ue > 5 && (_.fillStyle = h, _.font = `${3 * x}px monospace`, _.fillText(`+${ue - 5}`, (X + 10) * x, (U - 6) * x)), ue > 0 && (_.fillStyle = h, _.fillRect((X + 6) * x, (U - 30) * x, 9 * x, 9 * x), _.fillStyle = "#0f172a", _.font = `bold ${5 * x}px monospace`, _.textAlign = "center", _.fillText(String(ue), (X + 10.5) * x, (U - 24) * x), _.textAlign = "left"), _.fillStyle = ve ? "#e2e8f0" : "#6b7280", _.font = `${3.4 * x}px monospace`, _.textAlign = "center";
        const ke = D.name.length > 12 ? D.name.slice(0, 11) + "…" : D.name;
        _.fillText(ke, X * x, (f - 4) * x), _.textAlign = "left";
      }
      T.current = oe;
      const be = S.reduce((Z, D) => {
        var X;
        return Z + (((X = se[D.id]) == null ? void 0 : X.length) || 0);
      }, 0);
      _.fillStyle = "#f90", _.font = `bold ${3.6 * x}px monospace`, _.fillText(`${be} card${be !== 1 ? "s" : ""} · ${ie} milestone${ie !== 1 ? "s" : ""}`, 4 * x, 8 * x);
    }, y = () => {
      m.current++, K(), u.current = requestAnimationFrame(y);
    };
    return u.current = requestAnimationFrame(y), () => {
      u.current && cancelAnimationFrame(u.current);
    };
  }, [V, f, w]), /* @__PURE__ */ e("div", { ref: l, className: "w-full mb-5", children: /* @__PURE__ */ e(
    "canvas",
    {
      ref: o,
      onClick: (R) => {
        const B = o.current;
        if (!B) return;
        const _ = B.getBoundingClientRect(), M = (R.clientX - _.left) / _.width * (B.width / x), K = T.current.find((y) => M >= y.x && M <= y.x + y.w);
        K && i(K.id);
      },
      style: {
        width: "100%",
        height: j + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function Zr({ active: t, onChange: r, counts: i }) {
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
      ].map((l) => {
        const m = t === l.id, u = i[l.id];
        return /* @__PURE__ */ a(
          "button",
          {
            onClick: () => r(l.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: m ? "var(--accent)" : "transparent",
              color: m ? "var(--bg)" : "var(--muted)"
            },
            children: [
              l.label,
              u > 0 && /* @__PURE__ */ e(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: m ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: m ? "var(--bg)" : "var(--muted)" },
                  children: u
                }
              )
            ]
          },
          l.id
        );
      })
    }
  );
}
function Ne({ title: t, children: r }) {
  return /* @__PURE__ */ a("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ e("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: t }),
    r
  ] });
}
function qe({ rows: t, empty: r = "None recorded" }) {
  return t.length ? /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: t.map((i) => /* @__PURE__ */ a("div", { className: "rounded-md px-2 py-1.5", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)" }, children: [
    /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-[11px]", children: [
      /* @__PURE__ */ e("span", { className: "font-medium min-w-0 break-words", style: { color: "var(--text)" }, children: i.title }),
      /* @__PURE__ */ a("span", { className: "ml-auto flex gap-1 flex-shrink-0", children: [
        i.level && /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: i.level === "required" ? "var(--warn)" : "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: i.level }),
        i.status && /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: /fail|block|open|pending/i.test(i.status) ? "var(--warn)" : "var(--ok)", background: "var(--bg-hover, var(--border))" }, children: i.status })
      ] })
    ] }),
    i.detail && /* @__PURE__ */ e("div", { className: "mt-0.5 text-[10px] break-words", style: { color: "var(--muted)" }, children: i.detail }),
    i.ref && (i.url ? /* @__PURE__ */ e("a", { href: i.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: i.ref }) : /* @__PURE__ */ e("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: i.ref }))
  ] }, i.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: r });
}
function ge({ label: t, value: r, status: i }) {
  return /* @__PURE__ */ a("div", { className: "min-w-0", children: [
    /* @__PURE__ */ e("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: t }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-0.5 break-words", style: { color: De(r) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      De(r),
      i && /* @__PURE__ */ a("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        De(i),
        ")"
      ] })
    ] })
  ] });
}
function Jr({ card: t, inspection: r, producerSession: i, onClose: o, onOpenProducer: l, onApprove: m, onReject: u, onInterject: g }) {
  const d = r.routing, T = () => {
    const x = window.prompt(`Why reject revision ${r.revision ?? "unknown"}?`);
    x != null && x.trim() && u && (u(x.trim()), o());
  };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (x) => {
        x.currentTarget === x.target && o();
      },
      children: /* @__PURE__ */ a(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": `gate-inspection-${t.id}`,
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(860px, calc(100vw - 32px))", maxHeight: "min(88vh, 860px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ a("header", { className: "px-5 py-4 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ e("h2", { id: `gate-inspection-${t.id}`, className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Gate result inspection" }),
                  /* @__PURE__ */ e("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)", background: `color-mix(in srgb, ${r.ready ? "var(--ok)" : "var(--warn)"} 14%, transparent)` }, children: r.ready ? "review-ready" : "not review-ready" }),
                  /* @__PURE__ */ a("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: [
                    "revision ",
                    r.revision ?? "unobservable"
                  ] })
                ] }),
                /* @__PURE__ */ e("div", { className: "text-[12px] mt-1 truncate", style: { color: "var(--text)" }, children: t.title }),
                /* @__PURE__ */ a("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: [
                  r.gate || t.stage,
                  " reviews ",
                  r.producerStep || "unobservable producer",
                  " · status ",
                  r.reviewStatus
                ] })
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  onClick: o,
                  "aria-label": "Close gate inspection",
                  className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                  style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ a("div", { className: "overflow-y-auto p-4 flex flex-col gap-3", children: [
              /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { background: r.ready ? "color-mix(in srgb, var(--ok) 8%, transparent)" : "color-mix(in srgb, var(--warn) 8%, transparent)", border: `1px solid color-mix(in srgb, ${r.ready ? "var(--ok)" : "var(--warn)"} 38%, var(--border))` }, children: [
                /* @__PURE__ */ e("div", { className: "text-[11px] font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)" }, children: r.ready ? "Bundle is structurally ready for review" : `${r.missing.length} readiness gap${r.missing.length === 1 ? "" : "s"}` }),
                !r.ready && /* @__PURE__ */ e("ul", { className: "mt-1.5 pl-4 list-disc text-[10px] space-y-0.5", style: { color: "var(--muted)" }, children: r.missing.map((x) => /* @__PURE__ */ e("li", { children: x }, x)) }),
                r.preferredShortfalls.length > 0 && /* @__PURE__ */ a("div", { className: "mt-2 text-[10px]", style: { color: "var(--muted)" }, children: [
                  "Preferred shortfalls (non-blocking): ",
                  r.preferredShortfalls.join(" · ")
                ] }),
                /* @__PURE__ */ e("div", { className: "text-[9px] mt-2", style: { color: "var(--muted)" }, children: "Inspection is read-only; deterministic runtime remains authoritative for movement and readiness enforcement." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ a(Ne, { title: "Result summary", children: [
                  /* @__PURE__ */ e("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: r.summary ? "var(--text)" : "var(--warn)" }, children: r.summary || "No result summary was published." }),
                  /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ e(ge, { label: "Envelope", value: r.envelopeId }),
                    /* @__PURE__ */ e(ge, { label: "Created", value: r.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ e(Ne, { title: "Changes since prior revision", children: /* @__PURE__ */ e(qe, { rows: r.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ e(Ne, { title: "Artifacts and evidence references", children: r.artifacts.length ? /* @__PURE__ */ e("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: r.artifacts.map((x) => /* @__PURE__ */ a("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ e("span", { className: "font-medium", style: { color: "var(--text)" }, children: x.label }),
                  x.kind && /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: x.kind })
                ] }),
                x.preview && /* @__PURE__ */ e("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: x.preview }),
                x.ref && (x.url ? /* @__PURE__ */ e("a", { href: x.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: x.ref }) : /* @__PURE__ */ e("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: x.ref }))
              ] }, x.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(Ne, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ e(qe, { rows: r.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ e(Ne, { title: "Research and citations", children: /* @__PURE__ */ e(qe, { rows: r.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(Ne, { title: "Intent and requirement coverage", children: /* @__PURE__ */ e(qe, { rows: r.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ e(Ne, { title: "Omissions and deviations", children: /* @__PURE__ */ e(qe, { rows: r.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ a(Ne, { title: "Card topology and integration", children: [
                /* @__PURE__ */ a("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ e(ge, { label: "Action", value: r.topology.action }),
                  /* @__PURE__ */ e(ge, { label: "Integration owner", value: r.topology.integrationOwner }),
                  /* @__PURE__ */ e(ge, { label: "Integration status", value: r.topology.integrationStatus }),
                  /* @__PURE__ */ e(ge, { label: "Required children incomplete", value: r.topology.incompleteRequiredChildren.length })
                ] }),
                r.topology.children.length > 0 ? /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: r.topology.children.map((x) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: x.label }),
                  /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: x.required ? "var(--warn)" : "var(--muted)" }, children: x.required ? "required" : "optional" }),
                  /* @__PURE__ */ e("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(x.status) ? "var(--ok)" : "var(--warn)" }, children: x.status })
                ] }, x.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(Ne, { title: "Budget consumption", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ e(ge, { label: "Allocated", value: r.budget.allocated }),
                  /* @__PURE__ */ e(ge, { label: "Consumed", value: r.budget.consumed }),
                  /* @__PURE__ */ e(ge, { label: "Remaining", value: r.budget.remaining })
                ] }) }),
                /* @__PURE__ */ e(Ne, { title: "Routing and runtime provenance", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ e(ge, { label: "Assigned profile", value: d.assignedProfile }),
                  /* @__PURE__ */ e(ge, { label: "Effective profile", value: d.effectiveProfile }),
                  /* @__PURE__ */ e(ge, { label: "Model requested", value: d.model.requested }),
                  /* @__PURE__ */ e(ge, { label: "Model applied", value: d.model.applied, status: d.model.status }),
                  /* @__PURE__ */ e(ge, { label: "Provider / version", value: d.model.provider || d.model.version ? [d.model.provider, d.model.version].filter(Boolean) : null }),
                  /* @__PURE__ */ e(ge, { label: "Effort requested", value: d.effort.requested }),
                  /* @__PURE__ */ e(ge, { label: "Effort applied", value: d.effort.applied, status: d.effort.status }),
                  /* @__PURE__ */ e(ge, { label: "Tools available", value: d.tools.actual, status: d.tools.status }),
                  /* @__PURE__ */ e(ge, { label: "Skills available", value: d.skills.actual, status: d.skills.status }),
                  /* @__PURE__ */ e(ge, { label: "Network scope", value: d.network.actual, status: d.network.status }),
                  /* @__PURE__ */ e(ge, { label: "Write scope", value: d.write.actual, status: d.write.status }),
                  /* @__PURE__ */ e(ge, { label: "Worktree / branch", value: d.worktree })
                ] }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ e(Ne, { title: "Validation and evidence", children: /* @__PURE__ */ e(qe, { rows: r.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ e(Ne, { title: "Known risks", children: /* @__PURE__ */ e(qe, { rows: r.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ e(Ne, { title: "Open decisions and questions", children: /* @__PURE__ */ e(qe, { rows: r.decisions, empty: "No open decisions recorded" }) })
              ] })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex items-center gap-2 flex-wrap", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              m && /* @__PURE__ */ a("button", { onClick: () => {
                m(), o();
              }, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--ok)", color: "var(--bg)" }, children: [
                "Approve",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              u && /* @__PURE__ */ a("button", { onClick: T, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--danger)", color: "var(--bg)" }, children: [
                "Reject",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              g && /* @__PURE__ */ e("button", { onClick: g, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: "Interject on this revision" }),
              i && l && /* @__PURE__ */ a("button", { onClick: l, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: [
                "Open producer · ",
                i.step
              ] }),
              /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: r.producerSessionRef || "producer session reference unobservable" })
            ] })
          ]
        }
      )
    }
  );
}
function _t({ card: t, config: r, isGate: i, cardStatus: o, effectiveCapability: l, producerStep: m, producerSession: u, onOpenProducer: g, onApprove: d, onReject: T, onCycleTrust: x, onCycleDepth: j, onSetBudget: f, onInterject: w, onResolveDecision: V, onOpenOrchestrator: I, liveView: q, allCards: O, onOpenCard: R }) {
  var le, ke, W, de, $;
  const B = i ? "var(--warn)" : o.kind === "idle" ? "var(--border-strong, var(--border))" : o.color, _ = t.trust || r.trust, M = t.depth || r.depth, K = ((le = t.parked) == null ? void 0 : le.length) || 0, y = Object.values(t.step_sessions || {}).some(
    (C) => !!C.last_response_at && !C.chat_disabled_at && !C.superseded && (!C.last_response_handled_at || C.last_response_handled_at < C.last_response_at)
  ), [ee, S] = N(!1), [se, ie] = N(""), [ne, oe] = N(!1), [be, Z] = N(!1), D = xe(() => Dr(t), [t]), X = xe(() => Br(t, O || []), [t, O]), pe = xe(() => Gr(t), [t]), ue = xe(() => {
    if (!pe) return null;
    const C = (O || []).find((v) => v.id === pe);
    return C ? { id: C.id, title: C.title } : null;
  }, [pe, O]), ve = D.length > 0 || X.length > 0 || !!ue, h = xe(
    () => i ? Cr(t, m) : null,
    [t, i, m]
  ), P = () => {
    const C = window.prompt(`Why reject revision ${(h == null ? void 0 : h.revision) ?? "unknown"}?`);
    C != null && C.trim() && T && T(C.trim());
  }, U = (t.decisions || []).filter((C) => !C.chosen && !C.resolved_at && (!!C.action || !!C.options));
  return /* @__PURE__ */ a(
    "div",
    {
      id: `card-${t.id}`,
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${B}`
      },
      children: [
        /* @__PURE__ */ e("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: t.title }),
        ((ke = t.source) == null ? void 0 : ke.repo) && /* @__PURE__ */ a(
          "a",
          {
            href: t.source.url || void 0,
            target: "_blank",
            rel: "noreferrer",
            className: "text-[11px] mt-0.5 inline-block truncate max-w-full hover:underline",
            style: { color: "var(--muted)" },
            children: [
              t.source.repo,
              t.source.issue ? `#${t.source.issue}` : ""
            ]
          }
        ),
        (() => {
          var v;
          const C = (v = t.step_summaries) == null ? void 0 : v[t.stage];
          return C != null && C.headline ? /* @__PURE__ */ a("div", { className: "mt-1 flex items-start gap-1 text-[11px] leading-snug", title: C.description || C.headline, children: [
            C.needs_human ? /* @__PURE__ */ e("span", { "aria-label": "needs you", title: "Needs you", style: { color: "var(--warn)" }, children: "🔴" }) : /* @__PURE__ */ e("span", { "aria-hidden": "true", style: { color: "var(--muted)" }, children: "•" }),
            /* @__PURE__ */ e("span", { className: "truncate", style: { color: C.needs_human ? "var(--warn)" : "var(--text)" }, children: C.headline })
          ] }) : null;
        })(),
        /* @__PURE__ */ a("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ e("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "⚙ modes" }),
          /* @__PURE__ */ a(
            Ce,
            {
              color: Rt[_],
              active: !!t.trust,
              onClick: x,
              title: `trust: ${_}${t.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🛡 ",
                _
              ]
            }
          ),
          /* @__PURE__ */ a(
            Ce,
            {
              color: $t[M],
              active: !!t.depth,
              onClick: j,
              title: `depth: ${M}${t.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🔬 ",
                M
              ]
            }
          ),
          /* @__PURE__ */ a(
            Ce,
            {
              color: l === "coordinator" ? "var(--warn)" : "var(--info)",
              active: l !== "auto-derived",
              title: `capability: ${l}; actual authority is runtime handshake-verified`,
              children: [
                "🧰 ",
                l === "auto-derived" ? "auto" : l
              ]
            }
          ),
          f && /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-0.5", title: "Decomposition/effort budget for this card", children: [
            /* @__PURE__ */ e("span", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "💰" }),
            /* @__PURE__ */ e(Ir, { budget: t.budget, depth: M, onSave: f })
          ] })
        ] }),
        /* @__PURE__ */ a(
          "div",
          {
            className: "mt-1.5 flex items-center gap-1 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "🏷 state" }),
              /* @__PURE__ */ e(
                Ce,
                {
                  color: o.color,
                  active: o.kind !== "idle",
                  title: `${o.label}${o.reason ? ` — ${o.reason}` : ""}`,
                  children: o.label
                }
              ),
              /* @__PURE__ */ a(
                Ce,
                {
                  color: t.sot === "local" ? "var(--warn)" : t.sot === "github" ? "var(--info)" : "var(--muted)",
                  active: t.sot === "local",
                  title: t.sot === "local" ? "Local stage authority; linked cards retry guarded GitHub convergence" : t.sot === "github" ? "GitHub issue label is stage authority" : "Source-of-truth field is unrecorded",
                  children: [
                    t.sot === "github" ? "🌐" : t.sot === "local" ? "💾" : "❔",
                    " sot:",
                    t.sot || "unknown"
                  ]
                }
              ),
              t.lifecycle && /* @__PURE__ */ a(Ce, { color: "var(--muted)", title: `card lifecycle: ${t.lifecycle}`, children: [
                "🔄 ",
                t.lifecycle
              ] }),
              K > 0 && /* @__PURE__ */ a(Ce, { color: "var(--warn)", title: `${K} parked idea(s)`, children: [
                "⏸ ",
                K
              ] }),
              y && /* @__PURE__ */ e(Ce, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
              typeof ((W = t.effort) == null ? void 0 : W.total) == "number" && t.effort.total > 0 && /* @__PURE__ */ a(Ce, { color: "var(--info)", title: `estimated effort: ${t.effort.total} points`, children: [
                "⚡ ",
                t.effort.total
              ] }),
              t.backstep_history && t.backstep_history.length > 0 && /* @__PURE__ */ a(
                Ce,
                {
                  color: "var(--danger)",
                  title: `stepped back ${t.backstep_history.length}× — last: ${t.backstep_history[t.backstep_history.length - 1].reason}`,
                  children: [
                    "↩ ",
                    t.backstep_history.length
                  ]
                }
              ),
              t.decisions && t.decisions.length > 0 && (() => {
                const C = t.decisions[t.decisions.length - 1];
                return /* @__PURE__ */ a(
                  Ce,
                  {
                    color: "var(--accent)",
                    title: `${t.decisions.length} decision${t.decisions.length === 1 ? "" : "s"} — last: ${C.question || C.kind || ""}${C.action ? ` → ${C.action}` : ""}${C.rationale ? `
${C.rationale}` : ""}`,
                    children: [
                      "⚖ ",
                      t.decisions.length
                    ]
                  }
                );
              })()
            ]
          }
        ),
        i && h && /* @__PURE__ */ a(
          "div",
          {
            "data-gate-inspection-summary": !0,
            className: "mt-2.5 rounded-md p-2",
            style: { background: h.ready ? "color-mix(in srgb, var(--ok) 7%, transparent)" : "color-mix(in srgb, var(--warn) 7%, transparent)", border: `1px solid color-mix(in srgb, ${h.ready ? "var(--ok)" : "var(--warn)"} 32%, var(--border))` },
            children: [
              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
                /* @__PURE__ */ e("span", { className: "font-semibold", style: { color: h.ready ? "var(--ok)" : "var(--warn)" }, children: h.ready ? "Review-ready" : "Not review-ready" }),
                /* @__PURE__ */ a("span", { className: "ml-auto", style: { color: "var(--muted)" }, children: [
                  "r",
                  h.revision ?? "?"
                ] }),
                /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: h.reviewStatus })
              ] }),
              /* @__PURE__ */ e("div", { className: "mt-1 text-[11px] leading-snug overflow-hidden", style: { color: h.summary ? "var(--text)" : "var(--warn)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: h.summary || "No review bundle summary published." }),
              !h.ready && /* @__PURE__ */ a("div", { className: "mt-1 text-[9px]", style: { color: "var(--muted)" }, children: [
                h.missing.length,
                " readiness gap",
                h.missing.length === 1 ? "" : "s"
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  type: "button",
                  onClick: () => oe(!0),
                  className: "mt-1.5 text-[10px] font-semibold hover:underline",
                  style: { color: "var(--accent)" },
                  children: "Inspect result bundle →"
                }
              )
            ]
          }
        ),
        i && d && T && /* @__PURE__ */ a("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          (() => {
            const C = (t.gate_commands || []).filter((we) => we.gate === t.stage), v = C.length ? C[C.length - 1] : void 0, re = (v == null ? void 0 : v.status) === "pending", Ae = (v == null ? void 0 : v.status) === "rejected", Se = (v == null ? void 0 : v.status) === "applied" || (v == null ? void 0 : v.status) === "approved";
            return /* @__PURE__ */ a(He, { children: [
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: re,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--ok)", color: "var(--bg)" },
                  onClick: d,
                  title: re ? "A gate command is being processed…" : "Approve this gate",
                  children: [
                    re && (v == null ? void 0 : v.action) === "approve" && /* @__PURE__ */ e(Qe, { size: 10 }),
                    re && (v == null ? void 0 : v.action) === "approve" ? "Approving…" : "✓ Approve"
                  ]
                }
              ),
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: re,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--danger)", color: "var(--bg)" },
                  onClick: P,
                  children: [
                    re && (v == null ? void 0 : v.action) === "reject" && /* @__PURE__ */ e(Qe, { size: 10 }),
                    re && (v == null ? void 0 : v.action) === "reject" ? "Rejecting…" : "✕ Reject"
                  ]
                }
              ),
              re && /* @__PURE__ */ a("span", { className: "text-[10px] inline-flex items-center gap-1", style: { color: "var(--muted)" }, children: [
                /* @__PURE__ */ e(Qe, { size: 10 }),
                " ",
                v == null ? void 0 : v.action,
                " sent — runtime processing…"
              ] }),
              Ae && /* @__PURE__ */ a(
                "span",
                {
                  className: "text-[10px]",
                  style: { color: "var(--danger)" },
                  title: (v == null ? void 0 : v.rejection_reason) || "rejected",
                  children: [
                    "⚠ ",
                    v == null ? void 0 : v.action,
                    " rejected: ",
                    (v == null ? void 0 : v.rejection_reason) || "see gate result"
                  ]
                }
              ),
              Se && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--ok)" }, children: [
                "✓ ",
                v == null ? void 0 : v.action,
                " applied"
              ] })
            ] });
          })(),
          u && g && /* @__PURE__ */ a(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
              style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
              onClick: g,
              title: `Open the ${u.step} producer session${u.retained ? " (held for this gate)" : ""}`,
              children: [
                /* @__PURE__ */ e("span", { "aria-hidden": "true", children: "↗" }),
                "Open producer · ",
                u.step
              ]
            }
          ),
          (t.stage === "gate-review" || /review/i.test(t.stage || "")) && (() => {
            var Se, we, ye;
            const C = (Se = t.source) == null ? void 0 : Se.repo;
            if (!C) return null;
            const v = (we = t.artifacts) == null ? void 0 : we.pr_url, re = v && ((ye = /\/pull\/(\d+)/.exec(v)) == null ? void 0 : ye[1]), Ae = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + C)}` + (re ? `&pr=${re}` : "");
            return /* @__PURE__ */ a(
              "a",
              {
                href: Ae,
                title: v ? `Deep-review PR #${re} in Code Review Sage` : `Open Code Review Sage for ${C}`,
                className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
                style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: [
                  /* @__PURE__ */ a("svg", { width: "11", height: "11", viewBox: "0 0 16 16", fill: "none", children: [
                    /* @__PURE__ */ e("circle", { cx: "7", cy: "7", r: "4.5", stroke: "currentColor", strokeWidth: "1.5" }),
                    /* @__PURE__ */ e("path", { d: "M10.5 10.5L14 14", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                  ] }),
                  "Review in Sage"
                ]
              }
            );
          })()
        ] }),
        V && U.map((C) => /* @__PURE__ */ a(
          "div",
          {
            className: "mt-2 p-1.5 rounded-md text-[11px]",
            style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
            children: [
              /* @__PURE__ */ a("div", { style: { color: "var(--text, var(--muted))" }, children: [
                "⚖ ",
                C.question || C.kind
              ] }),
              /* @__PURE__ */ a("div", { className: "mt-1 text-[10px]", style: { color: "var(--muted)" }, children: [
                "This records acknowledgement only; it does not enact ",
                C.action || "the proposed pipeline change",
                "."
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  className: "mt-1 px-2 py-0.5 rounded font-semibold",
                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                  onClick: () => V(C.id),
                  children: "Acknowledge & continue"
                }
              )
            ]
          },
          C.id
        )),
        q && /* @__PURE__ */ e(sa, { live: q }),
        (w || I) && /* @__PURE__ */ a(
          "div",
          {
            className: "mt-2 flex items-center gap-2 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase tracking-wider select-none", style: { color: "var(--muted)" }, children: "⚡ actions" }),
              w && (ee ? /* @__PURE__ */ a("div", { className: "w-full flex flex-col gap-1", children: [
                /* @__PURE__ */ e(
                  "textarea",
                  {
                    value: se,
                    onChange: (C) => ie(C.target.value),
                    placeholder: "Interject: design/spec note, re-scope…",
                    rows: 2,
                    className: "w-full text-[11px] px-2 py-1 rounded outline-none resize-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                ),
                /* @__PURE__ */ a("div", { className: "flex gap-1.5", children: [
                  /* @__PURE__ */ e(
                    "button",
                    {
                      className: "text-[11px] px-2 py-0.5 rounded font-semibold",
                      style: { background: "var(--accent)", color: "var(--bg)" },
                      onClick: () => {
                        se.trim() && (w("note", se.trim()), ie(""), S(!1));
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
                        S(!1), ie("");
                      },
                      children: "Cancel"
                    }
                  )
                ] })
              ] }) : /* @__PURE__ */ e(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  onClick: () => S(!0),
                  children: "✏️ interject"
                }
              )),
              I && /* @__PURE__ */ e(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: (de = t.orchestrator_session) != null && de.slot_key ? "Open this pipeline’s orchestrator session" : "Trigger an inspectable orchestrator session for this card",
                  onClick: () => I(),
                  children: ($ = t.orchestrator_session) != null && $.slot_key ? "⚙ open orchestrator" : "⚙ orchestrator"
                }
              ),
              ve && /* @__PURE__ */ a(
                "button",
                {
                  className: "text-[10px] hover:underline inline-flex items-center gap-0.5",
                  style: { color: "var(--muted)" },
                  title: "Card timeline — the ordered story of what happened",
                  onClick: () => Z(!0),
                  children: [
                    "📜 timeline",
                    D.some((C) => C.needs_human) ? " 🔴" : "",
                    X.length > 0 ? ` 🌿${X.length}` : ""
                  ]
                }
              )
            ]
          }
        ),
        be && /* @__PURE__ */ e(
          ca,
          {
            card: t,
            events: D,
            children: X,
            parent: ue,
            onOpenCard: R,
            onClose: () => Z(!1)
          }
        ),
        ne && h && /* @__PURE__ */ e(
          Jr,
          {
            card: t,
            inspection: h,
            producerSession: u,
            onClose: () => oe(!1),
            onOpenProducer: g,
            onApprove: d,
            onReject: T,
            onInterject: w ? () => {
              oe(!1), S(!0);
            } : void 0
          }
        )
      ]
    }
  );
}
function Ct({ title: t, count: r, children: i, id: o }) {
  return /* @__PURE__ */ a("div", { id: o, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
      /* @__PURE__ */ e("span", { className: "text-[11px] font-semibold uppercase tracking-wide truncate", style: { color: "var(--muted-strong, var(--muted))" }, children: t }),
      /* @__PURE__ */ e(
        "span",
        {
          className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
          children: r
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "flex flex-col gap-2", children: r === 0 ? /* @__PURE__ */ e(
      "div",
      {
        className: "text-[11px] rounded-lg py-3 px-2 text-center",
        style: { color: "var(--muted)", border: "1px dashed var(--border)" },
        children: "empty"
      }
    ) : i })
  ] });
}
function Qr({ config: t, onSet: r }) {
  function i({ label: o, value: l, options: m, tokens: u, onPick: g }) {
    return /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: o }),
      /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: m.map((d) => {
        const T = l === d;
        return /* @__PURE__ */ e(
          "button",
          {
            onClick: () => g(d),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: T ? u[d] : "var(--muted)",
              background: T ? `color-mix(in srgb, ${u[d]} 16%, transparent)` : "transparent",
              boxShadow: T ? `inset 0 0 0 1px color-mix(in srgb, ${u[d]} 45%, transparent)` : "none"
            },
            children: d
          },
          d
        );
      }) })
    ] });
  }
  return /* @__PURE__ */ a(
    "div",
    {
      className: "flex items-center gap-5 flex-wrap mb-4 px-3 py-2 rounded-lg",
      style: { background: "var(--card)", border: "1px solid var(--border)" },
      children: [
        /* @__PURE__ */ e("span", { className: "text-xs font-semibold", style: { color: "var(--muted-strong, var(--muted))" }, children: "Defaults" }),
        /* @__PURE__ */ e(i, { label: "Trust", value: t.trust, options: Fe, tokens: Rt, onPick: (o) => r({ trust: o }) }),
        /* @__PURE__ */ e(i, { label: "Depth", value: t.depth, options: Je, tokens: $t, onPick: (o) => r({ depth: o }) }),
        /* @__PURE__ */ e("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function ea({ cards: t }) {
  const r = t.flatMap(
    (i) => (i.parked || []).map((o) => {
      var l;
      return { ...o, cardTitle: i.title, repo: (l = i.source) == null ? void 0 : l.repo };
    })
  ).sort((i, o) => (o.at || "").localeCompare(i.at || ""));
  return r.length === 0 ? /* @__PURE__ */ a("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ a("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ e("div", { className: "flex flex-col gap-2 max-w-2xl", children: r.map((i) => /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: i.note }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ a("span", { children: [
        "from ",
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: i.cardTitle })
      ] }),
      i.phase && /* @__PURE__ */ a("span", { children: [
        "· parked at ",
        i.phase
      ] }),
      i.repo && /* @__PURE__ */ a("span", { children: [
        "· ",
        i.repo
      ] }),
      i.issue_url && /* @__PURE__ */ e("a", { href: i.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, i.id)) });
}
function ta({ repos: t, selected: r, onToggle: i, onClear: o, onAddWorkspace: l, onEdit: m }) {
  const u = t.reduce((T, x) => T + x.count, 0), g = r.size === 0, d = ({ name: T, count: x, label: j, checked: f, onClick: w, isAll: V }) => {
    const [I, q] = N(!1);
    return /* @__PURE__ */ a(
      "div",
      {
        onMouseEnter: () => q(!0),
        onMouseLeave: () => q(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: f ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: f ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ a(
            "button",
            {
              onClick: w,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                V ? /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: f ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ e(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: f ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${f ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: f && /* @__PURE__ */ e("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ e("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: f ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: j
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    children: x
                  }
                )
              ]
            }
          ),
          !V && T && /* @__PURE__ */ e(
            "button",
            {
              onClick: (O) => {
                O.stopPropagation(), m(T);
              },
              title: `Edit pipeline "${j}"`,
              "aria-label": `Edit pipeline ${j}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: I ? 1 : 0,
                pointerEvents: I ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (O) => {
                const R = O.currentTarget;
                R.style.color = "var(--accent)", R.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (O) => {
                const R = O.currentTarget;
                R.style.color = "var(--text-strong, var(--text))", R.style.borderColor = "var(--border-strong, var(--border))";
              },
              children: /* @__PURE__ */ e("svg", { width: "13", height: "13", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ e("path", { d: "M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) })
            }
          )
        ]
      }
    );
  };
  return /* @__PURE__ */ a(
    "div",
    {
      className: "flex-shrink-0 w-52 flex flex-col gap-1 pr-3 border-r self-stretch overflow-y-auto",
      style: { borderColor: "var(--border)" },
      children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between px-2.5 mb-1", children: [
          /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspaces" }),
          r.size > 0 && /* @__PURE__ */ e("button", { onClick: o, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ e(d, { isAll: !0, count: u, label: "All repos", checked: g, onClick: o }),
        t.map((T) => /* @__PURE__ */ e(
          d,
          {
            name: T.name,
            count: T.count,
            label: (ar.has(T.name) ? "Example: " : "") + (T.name.includes("/") ? T.name.split("/")[1] : T.name),
            checked: r.has(T.name),
            onClick: () => i(T.name)
          },
          T.name
        )),
        /* @__PURE__ */ a(
          "button",
          {
            onClick: l,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        r.size > 1 && /* @__PURE__ */ a("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          r.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const ra = [
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
function aa({ initial: t, agentProfiles: r, crews: i, repo: o, stepName: l, onSave: m, onSaveCrew: u, onClose: g }) {
  const [d, T] = N(t.name || ""), [x, j] = N(t.role || ""), [f, w] = N(t.tools || ["read"]), [V, I] = N(t.model || "auto"), [q, O] = N(t.crew || ""), [R, B] = N(t.addenda || []), [_, M] = N(t.capability || ""), [K, y] = N(t.trust || ""), [ee, S] = N(t.depth || ""), [se, ie] = N(!1), ne = r.find((h) => h.name === d), oe = i.find((h) => h.name === q), be = [.../* @__PURE__ */ new Set([...ra, ...f])], Z = (h) => {
    const P = Vr({ name: d, role: x, tools: f, model: V, crew: q, addenda: R, capability: _, trust: K, depth: ee }, h);
    T(P.name), w(P.tools || []), I(P.model || "auto"), P.capability && M(P.capability);
  }, D = (h) => w((P) => P.includes(h) ? P.filter((U) => U !== h) : [...P, h]), X = () => B((h) => {
    var P;
    return h.length >= 3 ? h : [...h, { crew: ((P = i[0]) == null ? void 0 : P.name) || "", when: "always", writes: "" }];
  }), pe = (h, P) => B((U) => U.map((le, ke) => ke === h ? { ...le, ...P } : le)), ue = (h) => B((P) => P.filter((U, le) => le !== h)), ve = d.trim().length > 0;
  return /* @__PURE__ */ a("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ a("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ e("button", { onClick: g, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ a("div", { className: "ml-1", children: [
        /* @__PURE__ */ e("div", { className: "text-sm font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Configure step execution" }),
        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Step request + capability profile + optional global crew route" })
      ] }),
      /* @__PURE__ */ e(
        "span",
        {
          className: "ml-auto text-[10px] px-2 py-1 rounded font-semibold",
          style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" },
          children: "UI configuration"
        }
      )
    ] }),
    /* @__PURE__ */ a("div", { className: "px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto", children: [
      r.length > 0 && /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent profile preset" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: () => ie(!0),
              className: "text-[10px] px-2 py-1 rounded-md font-semibold",
              style: { color: "var(--accent)", border: "1px solid var(--border)" },
              children: "Browse agents & crews"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: r.map((h) => /* @__PURE__ */ e(
          "button",
          {
            onClick: () => Z(h),
            disabled: h.status !== "loaded",
            title: h.description || h.name,
            className: "text-[11px] px-2 py-1 rounded-md font-medium disabled:opacity-40",
            style: {
              background: d === h.name ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: d === h.name ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: d === h.name ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: h.name
          },
          h.name
        )) }),
        ne && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1.5 rounded-md px-2 py-1.5", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
          "Loaded config: model ",
          /* @__PURE__ */ e("code", { children: ne.model || "auto" }),
          " · ",
          ne.tools.length,
          " declared tool",
          ne.tools.length === 1 ? "" : "s",
          " · ",
          ne.allowedTools.length,
          " auto-approved. The step objective below remains pipeline-local."
        ] })
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: d,
            onChange: (h) => T(h.target.value),
            placeholder: "e.g. impl-agent",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Role / prompt" }),
        /* @__PURE__ */ e(
          "textarea",
          {
            value: x,
            onChange: (h) => j(h.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: be.map((h) => {
          const P = f.includes(h);
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => D(h),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: P ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: P ? "var(--accent)" : "var(--muted)",
                boxShadow: P ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: h
            },
            h
          );
        }) })
      ] }),
      /* @__PURE__ */ a("div", { className: "rounded-md p-2.5", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ a("div", { children: [
            /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Capability profile" }),
            /* @__PURE__ */ e("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: "Trust = when · depth = how much · capability = what authority" })
          ] }),
          /* @__PURE__ */ a(
            "select",
            {
              value: _,
              onChange: (h) => M(h.target.value),
              className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "auto-derived" }),
                ["readonly", "authoring", "builder", "coordinator"].map((h) => /* @__PURE__ */ e("option", { value: h, children: h }, h))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "text-[10px] mt-2", style: { color: _ === "coordinator" ? "var(--warn)" : "var(--muted)" }, children: [
          "The tools above are requested/declared—not proof of runtime access. Actual crew authority comes from its ",
          /* @__PURE__ */ e("code", { children: "kiro_agent" }),
          " profile; widening remains trust-gated and handshake-verified."
        ] })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: V,
            onChange: (h) => I(h.target.value),
            placeholder: "auto",
            className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Crew" }),
          /* @__PURE__ */ a(
            "select",
            {
              value: q,
              onChange: (h) => O(h.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "— none (use step agent) —" }),
                i.map((h) => /* @__PURE__ */ e("option", { value: h.name, children: h.name }, h.name))
              ]
            }
          )
        ] }),
        oe && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: [
          "Global route ",
          /* @__PURE__ */ e("code", { children: oe.name }),
          " → ",
          /* @__PURE__ */ e("code", { children: oe.kiroAgent || "profile unknown" }),
          oe.workspace ? ` · workspace ${oe.workspace}` : "",
          oe.description ? ` · ${oe.description}` : ""
        ] })
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: X,
              disabled: R.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        R.length === 0 && /* @__PURE__ */ e("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        R.map((h, P) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ e(
            "select",
            {
              value: h.crew,
              onChange: (U) => pe(P, { crew: U.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: i.map((U) => /* @__PURE__ */ e("option", { value: U.name, children: U.name }, U.name))
            }
          ),
          /* @__PURE__ */ a(
            "select",
            {
              value: h.when || "always",
              onChange: (U) => pe(P, { when: U.target.value }),
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
              value: h.writes || "",
              onChange: (U) => pe(P, { writes: U.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ e("button", { onClick: () => ue(P), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ e("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ e("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, P))
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Fe].map((h) => {
          const P = K === h;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => y(h),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: P ? h ? Rt[h] : "var(--text)" : "var(--muted)", background: P ? "var(--bg-hover, var(--border))" : "transparent" },
              children: h || "inherit"
            },
            h || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Je].map((h) => {
          const P = ee === h;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => S(h),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: P ? h ? $t[h] : "var(--text)" : "var(--muted)", background: P ? "var(--bg-hover, var(--border))" : "transparent" },
              children: h || "inherit"
            },
            h || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ a("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ e("button", { onClick: g, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ e(
        "button",
        {
          disabled: !ve,
          onClick: () => m({
            name: d.trim(),
            role: x.trim() || void 0,
            tools: f,
            model: V.trim() && V.trim() !== "auto" ? V.trim() : void 0,
            crew: q || void 0,
            addenda: R.length ? R.filter((h) => h.crew) : void 0,
            capability: _ || void 0,
            trust: K || void 0,
            depth: ee || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save step"
        }
      )
    ] }),
    se && /* @__PURE__ */ e(
      qt,
      {
        profiles: r,
        crews: i,
        context: `${o || "unassigned pipeline"} · ${l || "unnamed step"}`,
        onSaveCrew: u,
        onClose: () => ie(!1),
        onSelectProfile: (h) => {
          Z(h), ie(!1);
        },
        onSelectCrew: (h) => {
          O(h.name), ie(!1);
        }
      }
    )
  ] });
}
function Xt({ candidates: t, existingRepos: r, defaults: i, agentProfiles: o, crews: l, onCreate: m, onSaveCrew: u, onClose: g, editPipeline: d, cardCount: T, isExample: x, onDelete: j }) {
  var nt, vt, ht, bt, xt, ot, ft, Oe, ze, Be, n, c, p, k, E;
  const f = !!d, [w, V] = N((d == null ? void 0 : d.repo) || ""), [I, q] = N((d == null ? void 0 : d.workspace) || "default"), [O, R] = N((d == null ? void 0 : d.repo_path) || ""), [B, _] = N((d == null ? void 0 : d.source) || "manual"), [M, K] = N((d == null ? void 0 : d.trust) || i.trust), [y, ee] = N((d == null ? void 0 : d.depth) || i.depth), S = d == null ? void 0 : d.budget, [se, ie] = N(
    S ? S.max_child_cards === "unlimited" && S.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [ne, oe] = N(
    () => S && S.max_child_cards !== "unlimited" && S.effort_ceiling !== "unlimited" ? { ...S } : Yt((d == null ? void 0 : d.depth) || i.depth)
  ), [be, Z] = N((d == null ? void 0 : d.backlog_intake) ?? !0), [D, X] = N((d == null ? void 0 : d.results_in_repo) ?? !1), [pe, ue] = N((d == null ? void 0 : d.conversation_log) ?? !1), [ve, h] = N(((d == null ? void 0 : d.trusted_authors) || []).join(`
`)), [P, U] = N((d == null ? void 0 : d.self_enabling) ?? !1), [le, ke] = N((d == null ? void 0 : d.approach) || "simplified"), [W, de] = N((d == null ? void 0 : d.sync_mode) || "poll"), [$, C] = N(() => {
    var s;
    return (s = d == null ? void 0 : d.steps) != null && s.length ? d.steps.map((b) => ({ ...b })) : At.map((b) => ({ ...b }));
  }), [v, re] = N(null), [Ae, Se] = N(""), [we, ye] = N("settings"), [Et, et] = N(!1), tt = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", me = (s, b) => C((L) => L.map((F, G) => G === s ? { ...F, ...b } : F)), Lt = (s) => C((b) => b.filter((L, F) => F !== s)), Ue = (s, b) => C((L) => {
    const F = s + b;
    if (F < 0 || F >= L.length) return L;
    const G = [...L];
    return [G[s], G[F]] = [G[F], G[s]], G;
  }), dt = (s) => C((b) => [...b, {
    id: `${s}-${Math.random().toString(36).slice(2, 6)}`,
    name: s === "gate" ? "New Gate" : "New Step",
    type: s,
    agent: s === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), jt = (s) => {
    V(s.repo || ""), q(s.workspace || "default"), R(s.path || ""), _(s.source);
  }, je = (s) => {
    let b = (s || "").trim();
    if (!b) return "";
    const L = b.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return L && (b = L[1]), b.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, pt = (s) => {
    const b = /github\.com|gitlab\.com/i.test(s);
    V(b ? je(s) : s), _("manual");
  }, ut = [...new Map(
    ve.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).map((s) => [s.toLowerCase(), s])
  ).values()], rt = ut.every((s) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(s)), Ke = /^[A-Za-z0-9_.-]{1,80}$/.test(I), mt = (/^[^/\s]+\/[^/\s]+$/.test(je(w)) || t.some((s) => s.repo && s.repo === w)) && rt && Ke, Ve = !f && r.has(je(w)), at = ({ value: s, options: b, tokens: L, onPick: F }) => /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: b.map((G) => {
    const Y = s === G;
    return /* @__PURE__ */ e(
      "button",
      {
        onClick: () => F(G),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: Y ? L[G] : "var(--muted)",
          background: Y ? `color-mix(in srgb, ${L[G]} 16%, transparent)` : "transparent",
          boxShadow: Y ? `inset 0 0 0 1px color-mix(in srgb, ${L[G]} 45%, transparent)` : "none"
        },
        children: G
      },
      G
    );
  }) }), Re = { "issue-radar": [], workspace: [], manual: [] };
  t.forEach((s) => {
    var b;
    (Re[b = s.source] || (Re[b] = [])).push(s);
  });
  const Ot = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" }, gt = f ? ["settings", "webhook", "danger"] : ["settings", "webhook"];
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: g,
      children: /* @__PURE__ */ a(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (s) => s.stopPropagation(),
          children: [
            Et && /* @__PURE__ */ e(
              qt,
              {
                profiles: o,
                crews: l,
                context: w || I,
                onSaveCrew: u,
                onClose: () => et(!1)
              }
            ),
            v !== null ? /* @__PURE__ */ e(
              aa,
              {
                initial: {
                  name: ((vt = (nt = $[v]) == null ? void 0 : nt.agent) == null ? void 0 : vt.name) || "",
                  role: (bt = (ht = $[v]) == null ? void 0 : ht.agent) == null ? void 0 : bt.role,
                  tools: (ot = (xt = $[v]) == null ? void 0 : xt.agent) == null ? void 0 : ot.tools,
                  model: (Oe = (ft = $[v]) == null ? void 0 : ft.agent) == null ? void 0 : Oe.model,
                  crew: (Be = (ze = $[v]) == null ? void 0 : ze.agent) == null ? void 0 : Be.crew,
                  addenda: (n = $[v]) == null ? void 0 : n.addenda,
                  capability: (c = $[v]) == null ? void 0 : c.capability,
                  trust: (p = $[v]) == null ? void 0 : p.trust,
                  depth: (k = $[v]) == null ? void 0 : k.depth
                },
                agentProfiles: o,
                crews: l,
                repo: w,
                stepName: ((E = $[v]) == null ? void 0 : E.name) || "",
                onSaveCrew: u,
                onClose: () => re(null),
                onSave: (s) => {
                  me(v, {
                    agent: { name: s.name, role: s.role, tools: s.tools, model: s.model, crew: s.crew },
                    addenda: s.addenda,
                    capability: s.capability,
                    trust: s.trust,
                    depth: s.depth
                  }), re(null);
                }
              }
            ) : /* @__PURE__ */ a(He, { children: [
              /* @__PURE__ */ a("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { children: [
                  /* @__PURE__ */ e("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: f ? "Edit Pipeline" : "New Pipeline" }),
                  /* @__PURE__ */ e("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: f ? w.includes("/") ? w.split("/")[1] : w : "Configure a pipeline for a repository or workspace" })
                ] }),
                /* @__PURE__ */ e("button", { onClick: g, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
              ] }),
              /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: gt.map((s) => {
                const b = we === s, L = s === "danger";
                return /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => ye(s),
                    className: "text-[12px] px-3 py-2 font-semibold transition-all",
                    style: {
                      color: b ? L ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                      borderBottom: `2px solid ${b ? L ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                      marginBottom: "-1px"
                    },
                    children: s === "settings" ? "Settings" : s === "webhook" ? "Webhook · app-wide" : "Danger Zone"
                  },
                  s
                );
              }) }),
              /* @__PURE__ */ a(
                "div",
                {
                  className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                  style: { display: we === "settings" ? "flex" : "none" },
                  children: [
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: w,
                          onChange: (s) => pt(s.target.value),
                          onPaste: (s) => {
                            const b = s.clipboardData.getData("text");
                            /github\.com|gitlab\.com/i.test(b) && (s.preventDefault(), pt(b));
                          },
                          placeholder: "https://github.com/owner/name  ·  or  owner/name",
                          disabled: f,
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Ve ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                        }
                      ),
                      !f && w && je(w) !== w && /* @__PURE__ */ a("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                        "→ ",
                        /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: je(w) })
                      ] }),
                      Ve && /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                      /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((s) => Re[s].length > 0 && /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Ot[s] }),
                        /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1.5", children: Re[s].map((b) => {
                          const L = `${s}:${b.workspace || b.repo}:${b.path || ""}`, F = b.source === "workspace" ? I === b.workspace && O === (b.path || "") : w === b.repo;
                          return /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => jt(b),
                              disabled: !!b.repo && r.has(b.repo),
                              title: b.detail || b.repo || b.workspace,
                              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                              style: {
                                background: F ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                                color: F ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                                boxShadow: F ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                              },
                              children: b.label || (b.repo.includes("/") ? b.repo.split("/")[1] : b.repo) || b.workspace
                            },
                            L
                          );
                        }) })
                      ] }, s)) })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspace partition" }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: I,
                          onChange: (s) => q(s.target.value.trim()),
                          placeholder: "default",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Ke ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: Ke ? "var(--muted)" : "var(--danger)" }, children: [
                        "Partitions results and ledgers. It is independent from ",
                        /* @__PURE__ */ e("code", { children: "owner/name" }),
                        " and never inferred from a filesystem path."
                      ] })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Local checkout path" }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: O,
                          onChange: (s) => R(s.target.value),
                          placeholder: "/absolute/path/to/checkout",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ e("div", { className: "text-[10px] mt-1", style: { color: "var(--muted)" }, children: "Required before code or repo-mirrored results run. Mutable steps block rather than use the shared checkout when this path is absent or unverifiable." })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                      /* @__PURE__ */ e(at, { value: M, options: Fe, tokens: Rt, onPick: K })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                      /* @__PURE__ */ e(at, { value: y, options: Je, tokens: $t, onPick: ee })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                        /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                      ] }),
                      /* @__PURE__ */ e(
                        at,
                        {
                          value: se,
                          options: ["depth", "custom", "unlimited"],
                          tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                          onPick: ie
                        }
                      )
                    ] }),
                    se === "depth" && (() => {
                      const s = Yt(y);
                      return /* @__PURE__ */ a("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                        "Follows ",
                        /* @__PURE__ */ e("strong", { children: y }),
                        ": ",
                        String(s.max_child_cards),
                        " child cards · ",
                        String(s.effort_ceiling),
                        " effort points · max ",
                        s.max_feature_size,
                        " · ",
                        s.addenda,
                        " addenda"
                      ] });
                    })(),
                    se === "unlimited" && /* @__PURE__ */ e("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                    se === "custom" && /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max child cards",
                        /* @__PURE__ */ e(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: ne.max_child_cards,
                            onChange: (s) => oe((b) => ({ ...b, max_child_cards: Math.max(0, Number(s.target.value) || 0) })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                          }
                        )
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Effort ceiling",
                        /* @__PURE__ */ e(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: ne.effort_ceiling,
                            onChange: (s) => oe((b) => ({ ...b, effort_ceiling: Math.max(0, Number(s.target.value) || 0) })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                          }
                        )
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max feature size",
                        /* @__PURE__ */ e(
                          "select",
                          {
                            value: ne.max_feature_size,
                            onChange: (s) => oe((b) => ({ ...b, max_feature_size: s.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["S", "M", "L", "XL"].map((s) => /* @__PURE__ */ e("option", { children: s }, s))
                          }
                        )
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Addenda",
                        /* @__PURE__ */ e(
                          "select",
                          {
                            value: ne.addenda,
                            onChange: (s) => oe((b) => ({ ...b, addenda: s.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["none", "obvious", "proactive"].map((s) => /* @__PURE__ */ e("option", { children: s }, s))
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { className: "min-w-0 pr-3", children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "GitHub sync mode" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: W === "webhook" ? "Webhook is the fast path; the safety-net poll reconciles this pipeline on a longer window. Requires the app-wide webhook receiver enabled — falls back to polling if it is not." : "Poll reconciles this pipeline every cycle (default). Correct when no webhook is configured." })
                      ] }),
                      /* @__PURE__ */ e("div", { className: "flex rounded-md overflow-hidden flex-shrink-0", style: { border: "1px solid var(--border)" }, children: ["poll", "webhook"].map((s) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => de(s),
                          className: "text-[11px] px-2.5 py-1 font-semibold",
                          style: {
                            background: W === s ? "var(--accent)" : "transparent",
                            color: W === s ? "var(--bg)" : "var(--muted)"
                          },
                          children: s === "poll" ? "Poll" : "Webhook"
                        },
                        s
                      )) })
                    ] }),
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Backlog auto-intake" }),
                        /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                          "Back-feed open ",
                          /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
                          " issues as cards"
                        ] })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => Z((s) => !s),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: be ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: be ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                        /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                          "Also commit results & the pipeline conversation to a ",
                          /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: ".dlc-yolo/" }),
                          " copy in the owned repo (always kept in app data)"
                        ] })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => X((s) => !s),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: D ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: D ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Pipeline conversation log" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Opt in to the review-oriented command transcript; off means no log file is created" })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => ue((s) => !s),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: pe ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: pe ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trusted GitHub authors · optional" }),
                      /* @__PURE__ */ e(
                        "textarea",
                        {
                          value: ve,
                          onChange: (s) => h(s.target.value),
                          rows: 2,
                          placeholder: "Defaults to the authenticated GitHub user",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${rt ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: rt ? "var(--muted)" : "var(--danger)" }, children: [
                        "One login per line. Empty never means allow-all; it falls back to the authenticated ",
                        /* @__PURE__ */ e("code", { children: "gh" }),
                        " user."
                      ] })
                    ] }),
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => U((s) => !s),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: P ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: P ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    P && /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                      ] }),
                      /* @__PURE__ */ e("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((s) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => ke(s),
                          className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                          style: {
                            background: le === s ? "var(--accent)" : "transparent",
                            color: le === s ? "var(--bg)" : "var(--muted)",
                            border: `1px solid ${le === s ? "var(--accent)" : "var(--border)"}`
                          },
                          children: s
                        },
                        s
                      )) })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ a("div", { className: "flex items-center justify-between mb-1.5", children: [
                        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                        /* @__PURE__ */ a("div", { className: "flex gap-1", children: [
                          /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => et(!0),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--muted)", border: "1px solid var(--border)" },
                              children: "Agents & crews"
                            }
                          ),
                          /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => dt("agent"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                              children: "+ agent"
                            }
                          ),
                          /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => dt("gate"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                              children: "+ gate"
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: $.map((s, b) => {
                        var L, F;
                        return /* @__PURE__ */ a(
                          "div",
                          {
                            className: "rounded-md p-2",
                            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${s.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                            children: [
                              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ a("div", { className: "flex flex-col", children: [
                                  /* @__PURE__ */ e("button", { onClick: () => Ue(b, -1), disabled: b === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                  /* @__PURE__ */ e("button", { onClick: () => Ue(b, 1), disabled: b === $.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                                ] }),
                                /* @__PURE__ */ e(
                                  "input",
                                  {
                                    value: s.name,
                                    onChange: (G) => me(b, { name: G.target.value, id: tt(G.target.value) }),
                                    className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                  }
                                ),
                                /* @__PURE__ */ e(
                                  "span",
                                  {
                                    className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                    style: { color: s.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${s.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                    children: s.type
                                  }
                                ),
                                /* @__PURE__ */ e("button", { onClick: () => Lt(b), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                              ] }),
                              s.type === "agent" && /* @__PURE__ */ a("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                                /* @__PURE__ */ a(
                                  "button",
                                  {
                                    onClick: () => re(b),
                                    className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                    style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                    children: [
                                      "⚙ ",
                                      (L = s.agent) != null && L.name ? `Agent: ${s.agent.name}` : "Configure agent"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                                /* @__PURE__ */ a(
                                  "select",
                                  {
                                    value: s.trigger || "ask",
                                    onChange: (G) => me(b, { trigger: G.target.value === "ask" ? void 0 : G.target.value }),
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
                                /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: s.capability ? "var(--accent)" : "var(--muted)" }, title: "Actual authority is verified from the assigned capability profile at runtime", children: [
                                  "cap: ",
                                  s.capability || "auto"
                                ] }),
                                (s.trust || s.depth) && /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [s.trust, s.depth].filter(Boolean).join(" · ") }),
                                s.addenda && s.addenda.length > 0 && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                  "+",
                                  s.addenda.length,
                                  " addendum",
                                  s.addenda.length === 1 ? "" : "s"
                                ] }),
                                ((F = s.agent) == null ? void 0 : F.role) && /* @__PURE__ */ e("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: s.agent.role })
                              ] }),
                              s.type === "gate" && /* @__PURE__ */ a("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                                /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                                /* @__PURE__ */ a(
                                  "select",
                                  {
                                    value: s.trust || "",
                                    onChange: (G) => me(b, { trust: G.target.value || void 0 }),
                                    className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                    children: [
                                      /* @__PURE__ */ e("option", { value: "", children: "inherit" }),
                                      Fe.map((G) => /* @__PURE__ */ e("option", { value: G, children: G }, G))
                                    ]
                                  }
                                )
                              ] })
                            ]
                          },
                          s.id
                        );
                      }) })
                    ] })
                  ]
                }
              ),
              we === "webhook" && /* @__PURE__ */ e("div", { className: "px-5 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ e(jr, {}) }),
              f && we === "danger" && j && (() => {
                const s = w.includes("/") ? w.split("/")[1] : w, b = Ae.trim() === s;
                return /* @__PURE__ */ e("div", { className: "px-5 pb-4 pt-4", children: x ? /* @__PURE__ */ a(
                  "div",
                  {
                    className: "rounded-lg p-4 flex flex-col gap-3",
                    style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                    children: [
                      /* @__PURE__ */ a("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "This is a bundled ",
                        /* @__PURE__ */ e("strong", { children: "example" }),
                        " pipeline (",
                        T ?? 0,
                        " sample card",
                        (T ?? 0) === 1 ? "" : "s",
                        "). Remove it any time — it's demo data, not real work."
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => {
                            j(w), g();
                          },
                          className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                          style: { background: "var(--accent)", color: "var(--bg)" },
                          children: "Remove Example"
                        }
                      )
                    ]
                  }
                ) : /* @__PURE__ */ a(
                  "div",
                  {
                    className: "rounded-lg p-4 flex flex-col gap-3",
                    style: { border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))", background: "color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)" },
                    children: [
                      /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold uppercase tracking-wide", style: { color: "var(--danger, #ef4444)" }, children: "Danger Zone" }),
                      /* @__PURE__ */ a("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "Deleting removes this pipeline and its ",
                        T ?? 0,
                        " card",
                        (T ?? 0) === 1 ? "" : "s",
                        " from DLC-YOLO's local state. It does ",
                        /* @__PURE__ */ e("strong", { children: "not" }),
                        " touch GitHub issues or labels. This cannot be undone."
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Type ",
                        /* @__PURE__ */ e("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: s }),
                        " to confirm:"
                      ] }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: Ae,
                          onChange: (L) => Se(L.target.value),
                          placeholder: s,
                          className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                        }
                      ),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          disabled: !b,
                          onClick: () => {
                            j(w), g();
                          },
                          className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                          style: {
                            background: b ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                            color: b ? "#fff" : "var(--muted)",
                            cursor: b ? "pointer" : "not-allowed"
                          },
                          children: "Delete pipeline"
                        }
                      )
                    ]
                  }
                ) });
              })(),
              /* @__PURE__ */ a("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
                /* @__PURE__ */ e("button", { onClick: g, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: we === "settings" ? "Cancel" : "Close" }),
                we === "settings" && /* @__PURE__ */ e(
                  "button",
                  {
                    disabled: !mt || !f && Ve,
                    onClick: () => m({
                      repo: je(w),
                      workspace: I,
                      ...O.trim() ? { repo_path: O.trim() } : {},
                      source: B,
                      trust: M,
                      depth: y,
                      budget: se === "depth" ? void 0 : se === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : ne,
                      backlog_intake: be,
                      results_in_repo: D,
                      conversation_log: pe,
                      trusted_authors: ut,
                      self_enabling: P,
                      approach: le,
                      sync_mode: W,
                      steps: $.map((s) => ({ ...s, label: `dlc:${s.id}` }))
                    }),
                    className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                    style: { background: "var(--accent)", color: "var(--bg)" },
                    children: f ? "Save Pipeline" : "Create Pipeline"
                  }
                )
              ] })
            ] })
          ]
        }
      )
    }
  );
}
function Qe({ size: t = 12 }) {
  return /* @__PURE__ */ a("svg", { className: "animate-spin flex-shrink-0", width: t, height: t, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ e("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ e("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
const na = {
  investigate: "🔎",
  requirements: "📝",
  design: "📐",
  tasks: "🧩",
  implement: "🔨",
  review: "🔍",
  pr: "🚀",
  intent: "🎯"
};
function oa(t, r) {
  const [i, o] = N(""), l = fe(""), m = fe(""), u = fe(null);
  return m.current = t || "", _e(() => {
    if (!r || !m.current.startsWith(l.current)) {
      l.current = m.current, o(m.current);
      return;
    }
    const g = () => {
      const d = m.current, T = l.current;
      if (T.length >= d.length) {
        u.current = null;
        return;
      }
      const x = Math.max(1, Math.ceil((d.length - T.length) / 12));
      l.current = d.slice(0, T.length + x), o(l.current), u.current = requestAnimationFrame(g);
    };
    return u.current == null && (u.current = requestAnimationFrame(g)), () => {
      u.current != null && (cancelAnimationFrame(u.current), u.current = null);
    };
  }, [t, r]), i;
}
function sa({ live: t }) {
  const [r, i] = N(!0), o = fe(null), l = oa(t.tail, t.active);
  _e(() => {
    o.current && (o.current.scrollTop = o.current.scrollHeight);
  }, [l]);
  const m = na[t.stage] || "⚙";
  return /* @__PURE__ */ a("div", { className: "mt-2", style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" }, children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
      /* @__PURE__ */ a(
        "button",
        {
          className: "inline-flex items-center gap-1 hover:underline",
          onClick: () => i((u) => !u),
          title: "Toggle live output",
          style: { color: "var(--muted)" },
          children: [
            /* @__PURE__ */ e("span", { "aria-hidden": "true", children: r ? "▾" : "▸" }),
            /* @__PURE__ */ a("span", { className: "uppercase tracking-wider", children: [
              m,
              " ",
              t.stage
            ] })
          ]
        }
      ),
      /* @__PURE__ */ a("span", { style: { color: t.active ? "var(--accent)" : "var(--muted)" }, children: [
        "· ",
        t.active ? t.phase : "idle"
      ] }),
      t.active && /* @__PURE__ */ e(Qe, { size: 10 }),
      /* @__PURE__ */ e(
        "button",
        {
          className: "ml-auto hover:underline",
          onClick: t.onOpen,
          title: "Open the full step session",
          style: { color: "var(--accent)" },
          children: "open ↗"
        }
      )
    ] }),
    r && /* @__PURE__ */ e(
      "div",
      {
        ref: o,
        className: "mt-1 text-[10px] font-mono leading-snug overflow-y-auto whitespace-pre-wrap break-words",
        style: {
          maxHeight: "3.6em",
          color: "var(--muted)",
          background: "var(--bg-elevated, var(--bg))",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "4px 6px"
        },
        children: l || (t.active ? "thinking…" : "no live output")
      }
    )
  ] });
}
const la = {
  loop: "⚙",
  "step-agent": "🤖",
  orchestrator: "🧠",
  human: "🧑"
}, ia = {
  loop: "var(--muted)",
  "step-agent": "var(--info)",
  orchestrator: "var(--accent)",
  human: "var(--ok)"
};
function ca({ card: t, events: r, children: i, parent: o, onOpenCard: l, onClose: m }) {
  const u = i && i.length > 0 || !!o;
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (g) => {
        g.currentTarget === g.target && m();
      },
      children: /* @__PURE__ */ a(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Card timeline",
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(680px, calc(100vw - 32px))", maxHeight: "min(84vh, 760px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ a("header", { className: "px-5 py-3.5 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ e("h2", { className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "📜 Timeline" }),
                /* @__PURE__ */ e("div", { className: "text-[12px] mt-0.5 truncate", style: { color: "var(--text)" }, children: t.title })
              ] }),
              /* @__PURE__ */ e("button", { onClick: m, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ a("div", { className: "px-4 py-3 overflow-y-auto", children: [
              u && /* @__PURE__ */ a("div", { className: "mb-3 pb-3", style: { borderBottom: "1px dashed var(--border)" }, children: [
                /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "🌿 fan-out" }),
                o && /* @__PURE__ */ a(
                  "button",
                  {
                    className: "flex items-center gap-1.5 text-[12px] hover:underline mb-1",
                    onClick: () => l == null ? void 0 : l(o.id),
                    style: { color: "var(--accent)" },
                    title: "Open the integration parent",
                    children: [
                      "↑ parent · ",
                      /* @__PURE__ */ e("span", { className: "truncate max-w-[420px]", style: { color: "var(--text)" }, children: o.title })
                    ]
                  }
                ),
                i.map((g) => /* @__PURE__ */ a(
                  "button",
                  {
                    className: "flex items-center gap-1.5 text-[12px] hover:underline w-full text-left",
                    onClick: () => l == null ? void 0 : l(g.id),
                    title: "Open this child card",
                    style: { color: "var(--text)" },
                    children: [
                      /* @__PURE__ */ e("span", { "aria-hidden": "true", style: { color: "var(--accent)" }, children: "↳" }),
                      /* @__PURE__ */ e("span", { className: "truncate flex-1", children: g.title }),
                      /* @__PURE__ */ a("span", { className: "text-[9px] flex-shrink-0", style: { color: g.lifecycle === "retired" ? "var(--ok)" : "var(--muted)" }, children: [
                        g.stage || "",
                        g.lifecycle ? ` · ${g.lifecycle}` : "",
                        g.required === !1 ? " · optional" : ""
                      ] })
                    ]
                  },
                  g.id
                )),
                i.length > 0 && r.length === 0 && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1.5 italic", style: { color: "var(--muted)" }, children: [
                  "This card fanned its work out to the ",
                  i.length,
                  " child card",
                  i.length > 1 ? "s" : "",
                  " above — the story lives there."
                ] })
              ] }),
              r.length === 0 ? /* @__PURE__ */ e("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: u ? "No events recorded on this card directly." : "No recorded events yet." }) : /* @__PURE__ */ e("ol", { className: "flex flex-col gap-2", children: r.map((g) => /* @__PURE__ */ a("li", { className: "flex gap-2 text-[12px]", children: [
                /* @__PURE__ */ e("span", { title: g.actor, "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", children: la[g.actor] || "•" }),
                /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-baseline gap-1.5 flex-wrap", children: [
                    /* @__PURE__ */ a("span", { className: "font-medium", style: { color: g.needs_human ? "var(--warn)" : "var(--text)" }, children: [
                      g.needs_human && "🔴 ",
                      g.headline
                    ] }),
                    g.cls === "decision" && /* @__PURE__ */ e("span", { className: "text-[9px] px-1 rounded-full", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: "decision" }),
                    /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: g.at ? g.at.replace("T", " ").replace("Z", "") : "" })
                  ] }),
                  g.detail && /* @__PURE__ */ e("div", { className: "text-[10px] mt-0.5 leading-snug", style: { color: "var(--muted)" }, children: g.detail }),
                  /* @__PURE__ */ a("div", { className: "text-[9px] mt-0.5", style: { color: ia[g.actor] || "var(--muted)" }, children: [
                    g.actor,
                    g.step ? ` · ${g.step}` : "",
                    g.executor ? ` · ${g.executor}` : ""
                  ] })
                ] })
              ] }, g.id)) })
            ] })
          ]
        }
      )
    }
  );
}
function ga() {
  const t = Zt(), r = cr(), [i, o] = N([]), [l, m] = N([]), [u, g] = N(ct), [d, T] = N(!0), [x, j] = N("pipeline"), [f, w] = N(/* @__PURE__ */ new Set()), [V, I] = N(!1), [q, O] = N(null), [R, B] = N([]), [_, M] = N([]), [K, y] = N([]), [ee, S] = N(!1), [se, ie] = N(!1), [ne, oe] = N(!1), [be, Z] = N([]), D = fe(null), X = fe(!1), pe = fe(!1), ue = fe(/* @__PURE__ */ new Set()), ve = fe(/* @__PURE__ */ new Set()), [h, P] = N({}), U = ae(
    (n) => t.get("/api/file-read?path=" + encodeURIComponent(n)),
    [t]
  ), le = ae(async (n = !1) => {
    try {
      const c = !pe.current || n ? await St(U) : await Wt(U, Pe);
      Pe = c.path, pe.current = !0;
      const p = c.data;
      o(p.cards || []), m(p.pipelines || []), g({ ...ct, ...p.config || {} });
    } catch (c) {
      console.error("Failed to fetch cards:", c);
    } finally {
      T(!1);
    }
  }, [U]), ke = xe(() => {
    const n = /* @__PURE__ */ new Map();
    return l.forEach((c) => {
      n.has(c.repo) || n.set(c.repo, 0);
    }), i.forEach((c) => {
      var k;
      const p = ((k = c.source) == null ? void 0 : k.repo) || "unlinked";
      n.set(p, (n.get(p) || 0) + 1);
    }), [...n.entries()].map(([c, p]) => ({ name: c, count: p })).sort((c, p) => p.count - c.count);
  }, [i, l]), W = xe(
    () => f.size === 0 ? i : i.filter((n) => {
      var c;
      return f.has(((c = n.source) == null ? void 0 : c.repo) || "unlinked");
    }),
    [i, f]
  );
  _e(() => {
    ve.current = new Set(i.map((n) => n.id)), ue.current = new Set(i.flatMap(
      (n) => Object.values(n.step_sessions || {}).filter((c) => !!c.slot_key && !c.chat_disabled_at && !c.superseded).map((c) => c.slot_key)
    ));
  }, [i]), _e(() => {
    let n = !1, c = null, p, k = 0;
    const E = () => {
      if (n) return;
      const s = window.location.protocol === "https:" ? "wss:" : "ws:";
      c = new WebSocket(`${s}//${window.location.host}/api/ws`), c.onopen = () => {
        k = 0;
      }, c.onmessage = (b) => {
        if (typeof b.data == "string")
          try {
            const L = JSON.parse(b.data), F = L == null ? void 0 : L.data;
            if (L.type === "slots" && Array.isArray(F)) {
              const Y = new Set(ue.current), J = [];
              for (const A of F) {
                const he = (A == null ? void 0 : A.key) || (A == null ? void 0 : A.slot) || (A == null ? void 0 : A.name), Q = String((A == null ? void 0 : A.title) || (A == null ? void 0 : A.name) || "");
                typeof he == "string" && he.startsWith("cron-") && [...ve.current].some((te) => Q.includes(te)) && Y.add(he), typeof he == "string" && (A != null && A.running) && Y.has(he) && J.push(he);
              }
              ue.current = Y, J.length && P((A) => {
                let he = A;
                for (const Q of J) {
                  const te = Dt(A[Q]);
                  te !== A[Q] && (he = { ...he, [Q]: te });
                }
                return he;
              });
              return;
            }
            const G = F == null ? void 0 : F.slot;
            if (!G || !ue.current.has(G)) return;
            L.type === "chat_status" && String(F.status || "").toLowerCase().startsWith("thinking") || L.type === "chat_thinking" ? P((Y) => {
              const J = Dt(Y[G], L.type === "chat_status");
              return J === Y[G] ? Y : { ...Y, [G]: J };
            }) : L.type === "chat_chunk" && typeof F.content == "string" ? P((Y) => {
              const J = vr(Y[G], F.content, Number(F.seq));
              return J === Y[G] ? Y : { ...Y, [G]: J };
            }) : L.type === "chat_done" && P((Y) => {
              const J = hr(Y[G]);
              return J === Y[G] ? Y : { ...Y, [G]: J };
            });
          } catch {
          }
      }, c.onclose = () => {
        if (n) return;
        const b = Math.min(1e3 * 2 ** k++, 15e3);
        p = setTimeout(E, b);
      }, c.onerror = () => c == null ? void 0 : c.close();
    };
    return E(), () => {
      n = !0, p && clearTimeout(p), c == null || c.close();
    };
  }, []), _e(() => {
    if (!ne) return;
    const n = (c) => {
      c.key === "Escape" && oe(!1);
    };
    return window.addEventListener("keydown", n), () => window.removeEventListener("keydown", n);
  }, [ne]);
  const de = 6e5, $ = xe(() => {
    var c, p, k, E;
    const n = [];
    for (const s of W) {
      const b = s.step_status || {}, L = s.step_sessions || {}, F = l.find((Y) => Y.id === s.pipeline_id) || l.find((Y) => {
        var J;
        return Y.repo === ((J = s.source) == null ? void 0 : J.repo);
      }), G = /* @__PURE__ */ new Set([...Object.keys(b), ...Object.keys(L)]);
      for (const Y of G) {
        const J = b[Y] || "idle", A = L[Y], he = J === "pending" || J === "error", Q = !!(A != null && A.slot_key) && !A.chat_disabled_at && !A.superseded;
        if (!he && !Q) continue;
        const te = (c = s.pending_at) == null ? void 0 : c[Y], Ye = he && !!te && Date.now() - new Date(te).getTime() > de, $e = (p = F == null ? void 0 : F.steps) == null ? void 0 : p.find((Xe) => Xe.id === Y), yt = (A == null ? void 0 : A.agent) || ((k = $e == null ? void 0 : $e.agent) == null ? void 0 : k.crew) || ((E = $e == null ? void 0 : $e.agent) == null ? void 0 : E.name) || "orchestrator", Ge = A == null ? void 0 : A.agent_id, nr = A == null ? void 0 : A.slot_key, or = A == null ? void 0 : A.session_key, sr = Ge ? be.some((Xe) => Xe.id === Ge) : he && be.some((Xe) => (Xe.task || "").includes(s.id) || (Xe.task || "").includes(s.title)), lr = !!(A != null && A.last_response_at) && (!A.last_response_handled_at || A.last_response_handled_at < A.last_response_at);
        n.push({ cardId: s.id, card: s.title || s.id, step: Y, agent: yt, stale: Ye, status: J, live: sr, responsePending: lr, agentId: Ge, slotKey: nr, sessionKey: or, sessionName: A == null ? void 0 : A.name });
      }
    }
    return n;
  }, [W, l, be]), C = xe(() => {
    var E;
    let n;
    if (f.size === 1) {
      const s = [...f][0];
      n = (E = l.find((b) => b.repo === s)) == null ? void 0 : E.steps;
    } else l.length === 1 && (n = l[0].steps);
    const c = (n && n.length ? n : At).map((s) => ({ ...s })), p = new Set(c.map((s) => s.id)), k = [];
    return p.has("intake") || k.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), k.push(...c), p.has("done") || k.push({ id: "done", name: "Done", type: "agent" }), k;
  }, [f, l]), v = xe(() => C.map((n) => n.id), [C]), re = ae((n) => {
    var c;
    return ((c = C.find((p) => p.id === n)) == null ? void 0 : c.type) === "gate" || n.startsWith("gate-");
  }, [C]), Ae = ae((n) => {
    var c, p;
    return ((p = (c = C.find((k) => k.id === n)) == null ? void 0 : c.agent) == null ? void 0 : p.name) || Yr[n] || "unknown";
  }, [C]), Se = ae((n) => {
    var E, s;
    const c = n.step_sessions || {}, p = Object.entries(c).find(
      ([, b]) => b.retained_for_gate === n.stage && b.retention !== "released"
    );
    let k = ((E = n.gate_review) == null ? void 0 : E.producer_step) || (p == null ? void 0 : p[0]);
    if (!k) {
      const b = l.find((J) => J.id === n.pipeline_id) || l.find((J) => {
        var A;
        return J.repo === ((A = n.source) == null ? void 0 : A.repo);
      }), L = (s = b == null ? void 0 : b.steps) != null && s.length ? b.steps : At, F = [
        { id: "intake", name: "Intake", type: "agent" },
        ...L.filter((J) => J.id !== "intake" && J.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], G = F.findIndex((J) => J.id === n.stage), Y = G >= 0 ? F[G] : void 0;
      if (k = Y == null ? void 0 : Y.reviews_step, !k && G >= 0)
        for (let J = G - 1; J >= 0; J--) {
          const A = F[J];
          if (!(A.id === "intake" || A.id === "done") && A.type !== "gate" && !A.id.startsWith("gate-")) {
            k = A.id;
            break;
          }
        }
    }
    return k;
  }, [l]), we = ae((n) => {
    const c = Se(n);
    if (!c) return;
    const p = (n.step_sessions || {})[c];
    if (!(!(p != null && p.slot_key) || p.chat_disabled_at || p.superseded))
      return {
        step: c,
        slotKey: p.slot_key,
        retained: p.retention === "held-for-gate"
      };
  }, [Se]);
  _e(() => {
    const n = async () => {
      try {
        const k = Pe.slice(0, Pe.lastIndexOf("/")), E = (k ? k + "/" : "") + "live_spawns.json", s = await t.get("/api/file-read?path=" + encodeURIComponent(E));
        X.current = !1;
        const b = s != null && s.at ? Date.now() - new Date(s.at).getTime() < 18e4 : !0;
        Z(b && Array.isArray(s == null ? void 0 : s.runs) ? s.runs : []);
      } catch {
        X.current = !0, Z([]);
      }
    };
    let c = 0;
    le(!0).then(n);
    const p = setInterval(() => {
      c += 1;
      const k = c % 12 === 0;
      le(k).then(() => {
        X.current || n();
      });
    }, 1e4);
    return () => clearInterval(p);
  }, [le, t]);
  const ye = ae(async () => {
    ie(!0);
    let n = [];
    try {
      const p = await U("~/.kiro/crew/config.json");
      n = Fr(p == null ? void 0 : p.agents), M(n);
    } catch (p) {
      console.warn("crew roster (config.json) unreadable:", p), M([]);
    }
    const c = await Promise.all(Hr(n).map(async (p) => {
      const k = Ur(p, n);
      if (!k) return It(null, p);
      try {
        const E = await U(k);
        return It(E, p, k);
      } catch {
        return It(null, p, k);
      }
    }));
    y(c), ie(!1);
  }, [U]), Et = ae(() => {
    S(!0), ye();
  }, [ye]), et = ae((n) => {
    ye().then(() => O(n));
  }, [ye]), tt = ae(async (n) => {
    await t.post("/apps/dlc-yolo/api/agents/crew", {
      mode: n.mode,
      name: n.name,
      kiro_agent: n.kiroAgent,
      workspace: n.workspace || null,
      memory_store: n.memoryStore || null
    }), await ye();
  }, [t, ye]), me = ae(async (n) => {
    try {
      const c = await St(U);
      Pe = c.path, c.data.cards = c.data.cards || [], n(c.data);
      let p = c;
      try {
        p = await St(U), Pe = p.path, p.data.cards = p.data.cards || [], n(p.data);
      } catch {
        p = c;
      }
      await t.post("/api/file-write", {
        path: p.path,
        content: JSON.stringify(p.data, null, 2)
      }), le();
    } catch (c) {
      console.error("Failed to mutate state:", c);
    }
  }, [t, le, U]), Lt = ae((n) => {
    g((c) => ({ ...c, ...n })), me((c) => {
      c.config = { ...ct, ...c.config || {}, ...n };
    });
  }, [me]), Ue = ae((n, c, p, k) => {
    const E = (/* @__PURE__ */ new Date()).toISOString(), s = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    me((b) => {
      var J;
      const L = b.cards.find((A) => A.id === n);
      if (!L || L.stage !== c) return;
      if (k === void 0 && p.type === "interject") {
        const A = p.text.trim();
        if (!A) return;
        L.interjection = L.interjection || [], L.interjection.some((he) => he.id === s) || L.interjection.push({
          id: s,
          at: E,
          step: c,
          kind: p.kind,
          text: A,
          by: "user",
          status: "pending"
        }), L.updated_at = E;
        return;
      }
      if ((((J = L.gate_review) == null ? void 0 : J.result_revision) ?? null) !== k) return;
      const G = p.type === "reject" ? p.reason.trim() : void 0, Y = p.type === "interject" ? p.text.trim() : void 0;
      p.type === "reject" && !G || p.type === "interject" && !Y || (L.gate_commands = L.gate_commands || [], L.gate_commands.some((A) => A.id === s) || L.gate_commands.push({
        id: s,
        gate: c,
        action: p.type,
        expected_revision: k ?? null,
        actor: "user",
        at: E,
        status: "pending",
        ...G ? { reason: G } : {},
        ...p.type === "interject" ? { kind: p.kind, text: Y } : {}
      }), L.updated_at = E);
    });
  }, [me]), dt = ae((n, c) => {
    me((p) => {
      const k = p.cards.find((s) => s.id === n);
      if (!k) return;
      const E = (k.decisions || []).find((s) => s.id === c);
      E && (E.chosen = "acknowledged", E.status = "acknowledged", E.resolved_at = (/* @__PURE__ */ new Date()).toISOString()), k.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [me]), jt = ae(async (n) => {
    var p, k, E;
    const c = (p = n.orchestrator_session) == null ? void 0 : p.slot_key;
    if (c) {
      r(`/chat?sid=${encodeURIComponent(c)}`);
      return;
    }
    try {
      const s = await t.post("/apps/dlc-yolo/api/orchestrator/trigger", { card_id: n.id });
      if (s != null && s.slot_key) {
        r(`/chat?sid=${encodeURIComponent(s.slot_key)}`);
        return;
      }
    } catch {
    }
    for (let s = 0; s < 8; s++) {
      await new Promise((b) => setTimeout(b, 2e3));
      try {
        const L = (E = (k = ((await Wt(U, Pe)).data.cards || []).find((F) => F.id === n.id)) == null ? void 0 : k.orchestrator_session) == null ? void 0 : E.slot_key;
        if (L) {
          le(), r(`/chat?sid=${encodeURIComponent(L)}`);
          return;
        }
      } catch {
      }
    }
    le();
  }, [t, r, U, le]), je = ae((n) => {
    me((c) => {
      var E;
      const p = c.cards.find((s) => s.id === n);
      if (!p) return;
      const k = p.trust || ((E = c.config) == null ? void 0 : E.trust) || ct.trust;
      p.trust = Fe[(Fe.indexOf(k) + 1) % Fe.length], p.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [me]), pt = ae((n) => {
    me((c) => {
      var E;
      const p = c.cards.find((s) => s.id === n);
      if (!p) return;
      const k = p.depth || ((E = c.config) == null ? void 0 : E.depth) || ct.depth;
      p.depth = Je[(Je.indexOf(k) + 1) % Je.length], p.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [me]), ut = ae((n, c) => {
    me((p) => {
      const k = p.cards.find((E) => E.id === n);
      k && (c ? k.budget = { ...c } : delete k.budget, k.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [me]), rt = ae((n) => {
    w((c) => {
      const p = new Set(c);
      return p.has(n) ? p.delete(n) : p.add(n), p;
    });
  }, []), Ke = ae(() => w(/* @__PURE__ */ new Set()), []), mt = ae(async () => {
    const n = ye(), c = [];
    try {
      const p = await t.get("/api/file-read?path=~/.kiro/crew/config.json"), k = (p == null ? void 0 : p.workspaces) || {};
      Object.entries(k).forEach(([E, s]) => {
        const b = typeof (s == null ? void 0 : s.repo) == "string" && /^[^/\s]+\/[^/\s]+$/.test(s.repo) ? s.repo : "";
        c.push({
          repo: b,
          workspace: E,
          label: E,
          source: "workspace",
          detail: (s == null ? void 0 : s.dir) || E,
          path: typeof (s == null ? void 0 : s.dir) == "string" ? s.dir : void 0
        });
      });
    } catch (p) {
      console.warn("workspaces registry unreadable:", p);
    }
    try {
      const p = await t.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((p == null ? void 0 : p.repos) || []).forEach((k) => {
        k != null && k.owner && (k != null && k.repo) && c.push({ repo: `${k.owner}/${k.repo}`, source: "issue-radar", detail: `${k.provider || "github"} · ${k.host || "github.com"}` });
      });
    } catch (p) {
      console.warn("issue-radar config unreadable (app may not be installed):", p);
    }
    B(c), await n, I(!0);
  }, [t, ye]), Ve = ae(async (n) => {
    const c = (/* @__PURE__ */ new Date()).toISOString(), p = "pl-" + Math.random().toString(36).slice(2, 10);
    await me((k) => {
      k.pipelines = k.pipelines || [];
      const E = k.pipelines.find((s) => s.repo === n.repo);
      E ? (E.source = n.source, E.workspace = n.workspace, n.repo_path ? E.repo_path = n.repo_path : delete E.repo_path, E.trust = n.trust, E.depth = n.depth, n.budget ? E.budget = n.budget : delete E.budget, E.backlog_intake = n.backlog_intake, E.results_in_repo = n.results_in_repo, E.conversation_log = n.conversation_log, n.trusted_authors.length ? E.trusted_authors = n.trusted_authors : delete E.trusted_authors, E.self_enabling = n.self_enabling, E.approach = n.approach, n.sync_mode ? E.sync_mode = n.sync_mode : delete E.sync_mode, E.steps = n.steps) : k.pipelines.push({
        id: p,
        repo: n.repo,
        workspace: n.workspace,
        ...n.repo_path ? { repo_path: n.repo_path } : {},
        source: n.source,
        trust: n.trust,
        depth: n.depth,
        backlog_intake: n.backlog_intake,
        ...n.budget ? { budget: n.budget } : {},
        results_in_repo: n.results_in_repo,
        conversation_log: n.conversation_log,
        ...n.trusted_authors.length ? { trusted_authors: n.trusted_authors } : {},
        self_enabling: n.self_enabling,
        approach: n.approach,
        ...n.sync_mode && n.sync_mode !== "poll" ? { sync_mode: n.sync_mode } : {},
        sot: "github",
        steps: n.steps,
        created_at: c
      });
    }), I(!1), O(null), w(/* @__PURE__ */ new Set([n.repo]));
  }, [me]), at = ae(async (n) => {
    await me((c) => {
      c.pipelines = (c.pipelines || []).filter((p) => p.repo !== n), c.cards = (c.cards || []).filter((p) => {
        var k;
        return (((k = p.source) == null ? void 0 : k.repo) || "unlinked") !== n;
      });
    }), w((c) => {
      const p = new Set(c);
      return p.delete(n), p;
    });
  }, [me]), Re = xe(() => v.reduce((n, c) => (n[c] = W.filter((p) => p.stage === c), n), {}), [W, v]), Ot = ae((n) => {
    var c;
    (c = document.getElementById(`stage-col-${n}`)) == null || c.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), gt = xe(() => {
    const n = {};
    return W.forEach((c) => {
      var k;
      const p = ((k = c.source) == null ? void 0 : k.repo) || "unlinked";
      (n[p] || (n[p] = [])).push(c);
    }), n;
  }, [W]), nt = xe(() => {
    const n = {};
    return W.forEach((c) => {
      const p = Ae(c.stage);
      (n[p] || (n[p] = [])).push(c);
    }), n;
  }, [W, Ae]), vt = xe(() => {
    const n = Object.fromEntries(Ft.map((c) => [c, []]));
    return W.forEach((c) => {
      var s, b;
      const p = l.find((L) => L.id === c.pipeline_id) || l.find((L) => {
        var F;
        return L.repo === ((F = c.source) == null ? void 0 : F.repo);
      }), k = ((b = (s = p == null ? void 0 : p.steps) == null ? void 0 : s.find((L) => L.id === c.stage)) == null ? void 0 : b.type) === "gate" || re(c.stage), E = $.some((L) => L.cardId === c.id && L.step === c.stage && L.live);
      n[Kt(c, { isGate: k, liveObserved: E }).kind].push(c);
    }), Object.fromEntries(Ft.filter((c) => n[c].length > 0).map((c) => [er[c].label, n[c]]));
  }, [W, l, re, $]), ht = W.filter((n) => n.stage !== "done").length, bt = W.filter((n) => re(n.stage)).length, xt = W.filter((n) => n.stage === "done").length, ot = W.reduce((n, c) => {
    var p;
    return n + (((p = c.parked) == null ? void 0 : p.length) || 0);
  }, 0), ft = {
    pipeline: W.length,
    workspace: Object.keys(gt).length,
    crew: Object.keys(nt).length,
    status: W.length,
    backlog: ot
  }, Oe = $.some((n) => {
    var c, p;
    return !!n.slotKey && ((c = h[n.slotKey]) == null ? void 0 : c.active) && ((p = h[n.slotKey]) == null ? void 0 : p.phase) === "generating";
  }), ze = $.some((n) => {
    var c, p;
    return !!n.slotKey && ((c = h[n.slotKey]) == null ? void 0 : c.active) && ((p = h[n.slotKey]) == null ? void 0 : p.phase) === "thinking";
  }), Be = (n) => {
    var Y, J, A, he;
    const c = l.find((Q) => Q.id === n.pipeline_id) || l.find((Q) => {
      var te;
      return Q.repo === ((te = n.source) == null ? void 0 : te.repo);
    }), p = ((J = (Y = c == null ? void 0 : c.steps) == null ? void 0 : Y.find((Q) => Q.id === n.stage)) == null ? void 0 : J.type) === "gate" || re(n.stage), k = p ? ((A = n.gate_review) == null ? void 0 : A.result_revision) ?? null : void 0, E = p ? Se(n) : void 0, s = p ? we(n) : void 0, b = $.some((Q) => Q.cardId === n.id && Q.step === n.stage && Q.live), L = Kt(n, { isGate: p, liveObserved: b }), F = (he = c == null ? void 0 : c.steps) == null ? void 0 : he.find((Q) => Q.id === n.stage), G = n.capability || (F == null ? void 0 : F.capability) || "auto-derived";
    return {
      card: n,
      config: u,
      isGate: p,
      cardStatus: L,
      effectiveCapability: G,
      producerStep: E,
      producerSession: s,
      onOpenProducer: s ? () => r(`/chat?sid=${encodeURIComponent(s.slotKey)}`) : void 0,
      onApprove: p ? () => Ue(n.id, n.stage, { type: "approve" }, k) : void 0,
      onReject: p ? (Q) => Ue(n.id, n.stage, { type: "reject", reason: Q }, k) : void 0,
      onCycleTrust: () => je(n.id),
      onCycleDepth: () => pt(n.id),
      onSetBudget: (Q) => ut(n.id, Q),
      onInterject: (Q, te) => Ue(
        n.id,
        n.stage,
        { type: "interject", kind: Q, text: te },
        k
      ),
      onResolveDecision: (Q) => dt(n.id, Q),
      onOpenOrchestrator: () => jt(n),
      liveView: (() => {
        var $e, yt;
        const Q = (yt = ($e = n.step_sessions) == null ? void 0 : $e[n.stage]) == null ? void 0 : yt.slot_key, te = Q ? h[Q] : void 0, Ye = $.some((Ge) => Ge.cardId === n.id && Ge.step === n.stage && Ge.live);
        if (!(!Q || !(te != null && te.active) && !Ye))
          return {
            stage: n.stage,
            phase: (te == null ? void 0 : te.phase) || "running",
            tail: (te == null ? void 0 : te.tail) || "",
            active: !!(te != null && te.active) && Ye,
            seq: (te == null ? void 0 : te.seq) || 0,
            slotKey: Q,
            onOpen: () => r(`/chat?sid=${encodeURIComponent(Q)}`)
          };
      })(),
      allCards: W,
      onOpenCard: (Q) => {
        const te = document.getElementById(`card-${Q}`);
        if (te) {
          te.scrollIntoView({ behavior: "smooth", block: "center" });
          const Ye = te.style.outline;
          te.style.outline = "2px solid var(--accent)", setTimeout(() => {
            te.style.outline = Ye;
          }, 1400);
        }
      }
    };
  };
  return /* @__PURE__ */ a(He, { children: [
    /* @__PURE__ */ e(dr, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    ee && /* @__PURE__ */ e(
      qt,
      {
        profiles: K,
        crews: _,
        loading: se,
        context: f.size === 1 ? [...f][0] : void 0,
        onRefresh: () => {
          ye();
        },
        onSaveCrew: tt,
        onClose: () => S(!1)
      }
    ),
    ne && /* @__PURE__ */ e(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (n) => {
          n.currentTarget === n.target && oe(!1);
        },
        children: /* @__PURE__ */ a(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "agent-sessions-title",
            className: "flex flex-col rounded-xl overflow-hidden",
            style: { width: "min(680px, calc(100vw - 32px))", maxHeight: "min(76vh, 680px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" },
            children: [
              /* @__PURE__ */ a("header", { className: "flex items-start gap-4 px-5 py-4", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ e("h2", { id: "agent-sessions-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agent sessions" }),
                    /* @__PURE__ */ e("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: $.length })
                  ] }),
                  /* @__PURE__ */ e("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "Live activity from enabled chats linked to pipeline cards." })
                ] }),
                /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => oe(!1),
                    "aria-label": "Close agent sessions",
                    className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                    style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ e("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: $.length === 0 ? /* @__PURE__ */ e("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : $.map((n) => {
                const c = n.slotKey ? h[n.slotKey] : void 0;
                return /* @__PURE__ */ a(
                  "div",
                  {
                    className: "rounded-lg px-3 py-2.5",
                    style: { background: n.responsePending ? "color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))" : "var(--bg, transparent)", border: "1px solid var(--border)" },
                    children: [
                      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-[11px] min-w-0", children: [
                        /* @__PURE__ */ e(
                          "span",
                          {
                            className: n.status === "pending" || n.responsePending ? "inline-block animate-pulse flex-shrink-0" : "inline-block flex-shrink-0",
                            style: { width: 7, height: 7, borderRadius: 999, background: n.stale ? "var(--warn)" : n.responsePending || n.status === "pending" ? "var(--accent)" : "var(--muted)" }
                          }
                        ),
                        /* @__PURE__ */ e("span", { className: "font-semibold flex-shrink-0", style: { color: "var(--accent)" }, title: n.sessionName || void 0, children: n.agent }),
                        /* @__PURE__ */ a("span", { className: "truncate", style: { color: "var(--muted)" }, children: [
                          "· ",
                          n.step
                        ] }),
                        /* @__PURE__ */ e("span", { className: "ml-auto truncate max-w-[220px]", style: { color: "var(--text, var(--muted))" }, title: n.card, children: n.card }),
                        /* @__PURE__ */ e("span", { className: "flex-shrink-0", style: { color: n.responsePending ? "var(--warn)" : n.status === "pending" ? "var(--ok)" : "var(--muted)" }, children: n.responsePending ? "response" : n.status }),
                        n.stale && /* @__PURE__ */ e("span", { style: { color: "var(--warn)" }, title: "stale — will be reclaimed", children: "↻" })
                      ] }),
                      (c == null ? void 0 : c.active) && c.phase === "thinking" && /* @__PURE__ */ a("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                        /* @__PURE__ */ e(Qe, { size: 13 }),
                        /* @__PURE__ */ e("span", { children: "Thinking" })
                      ] }),
                      (c == null ? void 0 : c.active) && c.phase === "generating" && c.tail && /* @__PURE__ */ a("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                        /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                        /* @__PURE__ */ a("span", { className: "font-mono text-[11px] truncate", children: [
                          "Generating · …",
                          c.tail
                        ] })
                      ] }),
                      n.slotKey && /* @__PURE__ */ a(
                        "button",
                        {
                          className: "mt-2 ml-4 font-mono",
                          style: { color: "var(--muted)", fontSize: 10, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
                          title: `Copy openable slot ${n.slotKey} (${n.sessionName || n.sessionKey}); open it from Chats`,
                          onClick: () => {
                            var p;
                            try {
                              (p = navigator.clipboard) == null || p.writeText(n.slotKey || "");
                            } catch {
                            }
                          },
                          children: [
                            "copy ",
                            n.slotKey.slice(0, 18)
                          ]
                        }
                      )
                    ]
                  },
                  `${n.card}:${n.step}`
                );
              }) }),
              /* @__PURE__ */ e("footer", { className: "px-5 py-3 text-[10px]", style: { color: "var(--muted)", borderTop: "1px solid var(--border)" }, children: "Thinking and text tails come directly from live dashboard events. Terminal turns stay linked until chat is explicitly disabled." })
            ]
          }
        )
      }
    ),
    V && /* @__PURE__ */ e(
      Xt,
      {
        candidates: R,
        existingRepos: new Set(l.map((n) => n.repo)),
        defaults: u,
        agentProfiles: K,
        crews: _,
        onCreate: Ve,
        onSaveCrew: tt,
        onClose: () => I(!1)
      }
    ),
    q && /* @__PURE__ */ e(
      Xt,
      {
        candidates: R,
        existingRepos: new Set(l.map((n) => n.repo)),
        defaults: u,
        agentProfiles: K,
        crews: _,
        editPipeline: l.find((n) => n.repo === q) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + q, repo: q, source: "manual", trust: u.trust, depth: u.depth, backlog_intake: !0, sot: "github", steps: At.map((n) => ({ ...n })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: i.filter((n) => {
          var c;
          return (((c = n.source) == null ? void 0 : c.repo) || "unlinked") === q;
        }).length,
        isExample: ar.has(q),
        onCreate: Ve,
        onSaveCrew: tt,
        onDelete: at,
        onClose: () => O(null)
      }
    ),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ e(Xr, { steps: C, cardsByStage: Re, onNodeClick: Ot }),
      /* @__PURE__ */ a("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3", children: [
        /* @__PURE__ */ e(kt, { label: "Active", value: String(ht), accent: !0 }),
        /* @__PURE__ */ e(kt, { label: "Gated", value: String(bt) }),
        /* @__PURE__ */ e(kt, { label: "Done", value: String(xt) }),
        /* @__PURE__ */ e(kt, { label: "Parked", value: String(ot) })
      ] }),
      /* @__PURE__ */ e(
        Or,
        {
          repos: ke.map((n) => n.name),
          selectedRepos: [...f],
          onNewPipeline: () => {
            mt();
          },
          onConfigure: et,
          onOpenAgents: Et
        }
      ),
      /* @__PURE__ */ a("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ e(
          ta,
          {
            repos: ke,
            selected: f,
            onToggle: rt,
            onClear: Ke,
            onAddWorkspace: mt,
            onEdit: et
          }
        ),
        /* @__PURE__ */ a("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ a("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ e(Zr, { active: x, onChange: j, counts: ft }),
            /* @__PURE__ */ a(
              "button",
              {
                onClick: () => oe(!0),
                "aria-haspopup": "dialog",
                "aria-expanded": ne,
                className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Open enabled agent sessions and see live activity",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: Oe || ze || $.some((n) => n.status === "pending" || n.responsePending) ? "var(--accent)" : "var(--muted)" },
                children: [
                  ze ? /* @__PURE__ */ e(Qe, { size: 11 }) : /* @__PURE__ */ e(
                    "span",
                    {
                      className: Oe || $.some((n) => n.status === "pending" || n.responsePending) ? "inline-block animate-pulse" : "inline-block",
                      style: { width: 7, height: 7, borderRadius: 999, background: Oe ? "var(--ok)" : $.some((n) => n.responsePending) ? "var(--warn)" : $.some((n) => n.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: $.length ? 1 : 0.5 }
                    }
                  ),
                  /* @__PURE__ */ e("span", { className: "font-semibold", children: $.length ? `${$.length} session${$.length === 1 ? "" : "s"}` : "no sessions" }),
                  ze && /* @__PURE__ */ e("span", { children: "· thinking" }),
                  Oe && /* @__PURE__ */ e("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                  !ze && !Oe && $.filter((n) => n.status === "pending").length > 0 && /* @__PURE__ */ a("span", { children: [
                    "· ",
                    $.filter((n) => n.status === "pending").length,
                    " running"
                  ] }),
                  $.some((n) => n.responsePending) && /* @__PURE__ */ e("span", { style: { color: "var(--warn)" }, children: "· response" }),
                  $.some((n) => n.stale) && /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
                    "· ",
                    $.filter((n) => n.stale).length,
                    " stale ↻"
                  ] })
                ]
              }
            ),
            f.size > 0 && /* @__PURE__ */ a(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  f.size === 1 ? [...f][0] : `${f.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ e("button", { onClick: Ke, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ e(Qr, { config: u, onSet: Lt }),
          d ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : x === "backlog" ? /* @__PURE__ */ e(ea, { cards: W }) : /* @__PURE__ */ a("div", { ref: D, className: "flex gap-3 overflow-x-auto pb-4", children: [
            x === "pipeline" && C.map((n) => /* @__PURE__ */ e(Ct, { id: `stage-col-${n.id}`, title: n.name, count: (Re[n.id] || []).length, children: (Re[n.id] || []).map((c) => /* @__PURE__ */ e(_t, { ...Be(c) }, c.id)) }, n.id)),
            x === "workspace" && Object.entries(gt).map(([n, c]) => /* @__PURE__ */ e(Ct, { title: n, count: c.length, children: c.map((p) => /* @__PURE__ */ e(_t, { ...Be(p) }, p.id)) }, n)),
            x === "crew" && Object.entries(nt).map(([n, c]) => /* @__PURE__ */ e(Ct, { title: n, count: c.length, children: c.map((p) => /* @__PURE__ */ e(_t, { ...Be(p) }, p.id)) }, n)),
            x === "status" && Object.entries(vt).map(([n, c]) => /* @__PURE__ */ e(Ct, { title: n, count: c.length, children: c.map((p) => /* @__PURE__ */ e(_t, { ...Be(p) }, p.id)) }, n))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  ga as default
};
