import { jsx as e, Fragment as ze, jsxs as a } from "react/jsx-runtime";
import { useChatLauncher as fr, useAppApi as yr, useNavigate as Er } from "@kirocrew/app-sdk";
import { PageHeader as Or, StatCard as Wt } from "@kirocrew/app-sdk/ui";
import { useState as w, useCallback as le, useEffect as Ee, useMemo as Ce, useRef as Ae } from "react";
const Lr = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), qr = /^[.,!?;:%)\]}]$/u, Ir = /^[(\[{]$/u;
function Mr(t, r = 3) {
  const s = (String(t || "").match(Lr) || []).slice(-Math.max(0, r));
  return s.reduce((l, p, u) => {
    if (u === 0) return p;
    const i = s[u - 1];
    return qr.test(p) || Ir.test(i) ? l + p : l + " " + p;
  }, "");
}
function nr(t, r = !1) {
  return t != null && t.active && !r ? t : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function Dr(t, r, o) {
  if (!r || t != null && t.active && Number.isFinite(o) && Number.isFinite(t.seq) && o <= t.seq)
    return t;
  const l = ((t != null && t.active ? t.buffer : "") + r).slice(-512);
  return { buffer: l, tail: Mr(l, 3), active: !0, phase: "generating", seq: Number(o) || 0 };
}
function Br(t) {
  return t && { ...t, active: !1, phase: "idle" };
}
const zr = /* @__PURE__ */ new Set(["done", "advanced"]), Pr = /* @__PURE__ */ new Set([
  "done",
  "advanced",
  "completed",
  "consumed",
  "integrated",
  "waived",
  "omitted"
]), Ve = (t) => !!t && typeof t == "object" && !Array.isArray(t), H = (t) => Ve(t) ? t : {}, xe = (t) => Array.isArray(t) ? t : t == null ? [] : [t], P = (...t) => t.find((r) => r != null && r !== "");
function tt(t) {
  if (t == null || t === "") return "unobservable";
  if (typeof t == "boolean") return t ? "yes" : "no";
  if (typeof t == "string" || typeof t == "number") return String(t);
  if (Array.isArray(t)) return t.length ? t.map(tt).join(" · ") : "none";
  if (Ve(t)) {
    const r = Object.entries(t);
    return r.length ? r.map(([o, s]) => `${o}: ${tt(s)}`).join(" · ") : "none";
  }
  return String(t);
}
function Ze(t) {
  return xe(t).map((r, o) => {
    if (!Ve(r))
      return { key: `item-${o}`, title: tt(r), detail: null, status: null, level: null, ref: null, url: null };
    const s = P(
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
    ) || `item ${o + 1}`, l = P(
      r.summary,
      r.detail,
      r.description,
      r.rationale,
      r.result,
      r.note,
      r.reason,
      r.path,
      r.ref
    ), p = P(
      r.enforcement,
      r.level,
      r.priority,
      r.required === !0 ? "required" : void 0
    ), u = P(
      r.status,
      r.outcome,
      r.state,
      r.passed === !0 ? "passed" : void 0,
      r.passed === !1 ? "failed" : void 0
    ), i = P(r.url, r.path, r.ref), c = typeof i == "string" && /^https?:\/\//.test(i) ? i : null;
    return {
      key: String(P(r.id, r.key, r.path, r.ref, `item-${o}`)),
      title: String(s),
      detail: l == null || String(l) === String(s) ? null : tt(l),
      status: u == null ? null : String(u),
      level: p == null ? null : String(p),
      ref: i == null ? null : String(i),
      url: c
    };
  });
}
function Wr(t) {
  return xe(t).filter((r) => r != null).map((r, o) => {
    const s = H(r), l = Ve(r) ? P(s.url, s.path, s.ref, s.id) : String(r), p = Ve(r) ? P(s.label, s.name, s.kind, s.id, s.path, s.ref, `artifact ${o + 1}`) : String(r), u = P(s.url, typeof l == "string" && /^https?:\/\//.test(l) ? l : void 0), i = P(s.preview, s.summary, s.description, s.evidence, s.detail);
    return {
      key: String(P(s.id, s.path, s.ref, `artifact-${o}`)),
      label: String(p),
      ref: l == null ? null : String(l),
      url: typeof u == "string" && /^https?:\/\//.test(u) ? u : null,
      preview: i == null ? null : tt(i),
      kind: s.kind == null ? null : String(s.kind),
      status: s.status == null ? null : String(s.status)
    };
  });
}
function Ur(t) {
  return xe(t.children).map((o, s) => {
    const l = H(o), p = l.required !== !1 && !["optional", "preferred", "advisory"].includes(
      String(P(l.enforcement, l.level, "required")).toLowerCase()
    ), u = String(P(l.status, l.state, "unobservable"));
    return {
      key: String(P(l.id, l.card_id, l.issue, `child-${s}`)),
      label: String(P(l.title, l.name, l.card_id, l.id, l.issue, `child ${s + 1}`)),
      required: p,
      status: u,
      complete: Pr.has(u.toLowerCase())
    };
  });
}
const kr = /* @__PURE__ */ new Set([
  "done",
  "completed",
  "covered",
  "satisfied",
  "validated",
  "met",
  "passed",
  "approved"
]);
function Gr(t, r) {
  const o = H(t == null ? void 0 : t.execution_envelope);
  return o.step === r ? o : xe(t == null ? void 0 : t.execution_envelope_history).map(H).reverse().find((s) => s.step === r) || {};
}
function wr(t) {
  return typeof t == "string" ? t.trim().length > 0 : Ve(t) ? [
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
function or(t, r) {
  const o = xe(t.validation_and_evidence).map(H);
  return xe(r).map(String).filter((s) => !o.some((l) => {
    const p = String(P(l.kind, l.type, l.id, "")).toLowerCase(), u = String(P(l.status, "")).toLowerCase();
    return (p === s.toLowerCase() || xe(l.satisfies).map(String).includes(s)) && kr.has(u) && wr(l);
  }));
}
function Fr(t, r) {
  const o = xe(t.findings).map(H);
  if (!o.length) return !1;
  if (!r) return !0;
  const s = xe(P(t.sources, t.consulted_sources)).map(H).filter((p) => typeof p.url == "string" && /^https?:\/\//.test(p.url) && p.title && p.accessed_at && P(p.source_type, p.type)), l = new Set(s.flatMap((p) => [p.id && String(p.id), p.url]).filter(Boolean));
  return l.size > 0 && o.every((p) => {
    const u = xe(P(p.source_ids, p.sources)).map(String);
    return p.claim && u.some((i) => l.has(i));
  });
}
function Hr(t, r, o, s) {
  const l = H(t == null ? void 0 : t.intent_integrity), p = l.status === "violation" ? [`intent integrity (${xe(l.violations).join(", ")})`] : [], u = Gr(t, r), i = xe(H(u.observations).controls_runtime);
  if (Number(u.schema_version || 0) < 2 || !i.includes("result_scope"))
    return { missing: p, preferredShortfalls: [] };
  const c = [...p], g = [];
  o.envelope_id !== u.id && c.push("result bound to the active envelope revision");
  const v = xe(t == null ? void 0 : t.decisions).map(H).filter((y) => y.step && y.step !== r || y.envelope_id && y.envelope_id !== u.id ? !1 : y.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(y.kind)), E = v.filter((y) => {
    const J = String(P(y.status, "")).toLowerCase();
    return y.chosen === void 0 && y.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(J);
  }), f = H(u.questions);
  E.length && c.push("all qualified questions resolved before completion"), E.length > 1 && f.cadence === "one-at-a-time" && c.push("one-at-a-time question cadence"), Number.isInteger(f.max_rounds) && v.length > f.max_rounds && c.push(`question rounds within max_rounds=${f.max_rounds}`);
  const b = H(u.result_scope), x = H(b.enforcement), k = new Map(xe(s.intent_and_requirement_coverage).map(H).filter((y) => P(y.intent_id, y.constraint_id, y.id)).map((y) => [String(P(y.intent_id, y.constraint_id, y.id)), y]));
  for (const y of [...xe(b.required_outcome_ids), ...xe(b.hard_constraint_ids)]) {
    const J = k.get(String(y)) || {}, S = String(P(J.status, "")).toLowerCase(), he = xe(P(J.evidence_refs, J.requirement_refs, J.refs));
    (!kr.has(S) || !he.some(wr)) && c.push(`required intent coverage ${y}`);
  }
  const D = xe(s.alternatives);
  if (Number.isInteger(b.alternatives) && D.length < b.alternatives) {
    const y = `${b.alternatives} material alternatives`;
    x.alternatives === "required" ? c.push(y) : x.alternatives === "preferred" && g.push(y);
  }
  const q = or(s, b.evidence), A = or(s, b.validation);
  x.evidence === "required" ? c.push(...q.map((y) => `required evidence ${y.toLowerCase()}`)) : x.evidence === "preferred" && g.push(...q.map((y) => `preferred evidence ${y.toLowerCase()}`)), x.validation === "required" ? c.push(...A.map((y) => `required validation ${y.toLowerCase()}`)) : x.validation === "preferred" && g.push(...A.map((y) => `preferred validation ${y.toLowerCase()}`));
  const I = H(u.research_policy), C = H(t == null ? void 0 : t.research_artifacts)[r], B = xe(P(s.research_and_citations, C)).map(H), X = B.filter((y) => Fr(
    y,
    I.citations === "required"
  ));
  return I.mode === "required" && !X.length && c.push("required research with claim-level citations"), Number.isInteger(I.max_passes) && B.length > I.max_passes && c.push(`research passes within max_passes=${I.max_passes}`), I.mode === "on-demand" && B.length && !X.length && g.push("complete citations for used research"), {
    missing: [...new Set(c)],
    preferredShortfalls: [...new Set(g)]
  };
}
function Kr(t, r, o) {
  const s = H(t.runtime_handshakes), l = H(t.runtime_handshake), p = H(s[r] || (l.step == null || l.step === r ? l : {})), u = H(p.assignment), i = H(p.capabilities), c = H(i.tools), g = H(i.skills), v = H(p.routing), E = H(v.model), f = H(v.reasoning_effort), b = H(p.scope), x = H(b.worktree), k = H(o.routing_and_provenance), D = H(k.model), q = H(k.reasoning_effort), A = H(k.assignment), I = P(c.profile_declared, c.declared, k.declared_tools), C = P(c.actual, k.actual_tools), B = P(g.profile_declared, g.declared, k.declared_skills), X = P(g.actual, k.actual_skills);
  return {
    assignedProfile: P(
      A.assigned_profile,
      k.assigned_profile,
      u.assigned_profile
    ) ?? null,
    effectiveProfile: P(
      A.effective_profile,
      k.effective_profile,
      u.effective_profile
    ) ?? null,
    model: {
      requested: P(D.requested, k.requested_model, E.requested) ?? null,
      applied: P(D.applied, k.applied_model, E.applied) ?? null,
      provider: P(D.provider, k.resolved_provider, E.provider) ?? null,
      version: P(D.version, k.model_version, E.version) ?? null,
      status: P(
        D.status,
        k.model_resolution_status,
        E.status,
        P(D.applied, k.applied_model, E.applied) != null ? "observed" : "unobservable"
      )
    },
    effort: {
      requested: P(q.requested, k.requested_effort, f.requested) ?? null,
      applied: P(q.applied, k.applied_effort, f.applied) ?? null,
      status: P(
        q.status,
        k.effort_resolution_status,
        f.status,
        P(q.applied, k.applied_effort, f.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: I == null ? null : xe(I),
      actual: C == null ? null : xe(C),
      status: P(c.status, k.tools_status, C != null ? "observed" : "unobservable")
    },
    skills: {
      declared: B == null ? null : xe(B),
      actual: X == null ? null : xe(X),
      status: P(g.status, k.skills_status, X != null ? "observed" : "unobservable")
    },
    network: H(b.network),
    write: H(b.write),
    worktree: Object.keys(x).length ? x : null
  };
}
function Vr(t, r) {
  const o = H(t == null ? void 0 : t.gate_review), s = H(o.bundle), l = P(o.gate, t == null ? void 0 : t.stage), p = P(o.producer_step, r), u = H(t == null ? void 0 : t.step_sessions), i = Number.isInteger(o.result_revision) ? o.result_revision : null, c = P(o.status, "unobservable"), g = p ? H(t == null ? void 0 : t.step_status)[p] : void 0, v = Wr(s.artifacts), E = H(s.card_topology), f = Ur(E), b = P(E.action, "unobservable"), x = ["fan-in", "unify"].includes(String(b).toLowerCase()), k = x ? f.filter((X) => X.required && !X.complete) : [], D = [];
  (!(t != null && t.gate_review) || !Ve(t.gate_review)) && D.push("result bundle record"), (!o.bundle || !Ve(o.bundle)) && D.push("declared result bundle"), p || D.push("producer binding"), i === null && D.push("result revision"), l && (t != null && t.stage) && l !== t.stage && D.push("gate binding matches current stage"), c !== "awaiting-review" && D.push(`review status awaiting-review (currently ${c})`), zr.has(String(g || "").toLowerCase()) || D.push(`terminal producer status (currently ${g || "unobservable"})`), P(s.summary) || D.push("result summary"), v.length === 0 && D.push("referenced artifact");
  const q = v.filter((X) => !X.ref);
  q.length > 0 && D.push(`artifact reference (${q.length} missing)`), x && f.length === 0 && D.push("declared fan-in child set"), k.length > 0 && D.push(`required child fan-in (${k.length} incomplete)`);
  const A = Hr(t, p, o, s);
  D.push(...A.missing);
  const I = xe(t == null ? void 0 : t.decisions).filter((X) => {
    const y = H(X);
    return !y.chosen && (!p || !y.step || y.step === p);
  }), C = Ze([
    ...xe(s.decisions_and_questions),
    ...I
  ]), B = Kr(t || {}, p, s);
  return {
    gate: l || null,
    producerStep: p || null,
    producerSessionRef: P(
      o.producer_session_ref,
      p && Ve(u[p]) ? `step_sessions.${p}` : void 0
    ) || null,
    envelopeId: P(o.envelope_id) || null,
    revision: i,
    reviewStatus: c,
    createdAt: P(o.created_at) || null,
    ready: D.length === 0,
    missing: D,
    summary: P(s.summary) || null,
    changes: Ze(s.changes_since_prior),
    artifacts: v,
    coverage: Ze(s.intent_and_requirement_coverage),
    alternatives: Ze(s.alternatives),
    research: Ze(P(
      s.research_and_citations,
      p && H(t == null ? void 0 : t.research_artifacts)[p]
    )),
    preferredShortfalls: A.preferredShortfalls,
    decisions: C,
    topology: {
      action: b,
      integrationOwner: P(E.integration_owner, E.owner) || null,
      integrationStatus: P(E.integration_status, E.status) || null,
      children: f,
      incompleteRequiredChildren: k
    },
    budget: {
      allocated: H(s.budget).allocated ?? null,
      consumed: H(s.budget).consumed ?? null,
      remaining: H(s.budget).remaining ?? null
    },
    routing: B,
    validation: Ze(s.validation_and_evidence),
    risks: Ze(s.known_risks),
    deviations: Ze(s.omissions_and_deviations)
  };
}
const Xr = "~/.dlc-yolo/.statepath", er = "~/.dlc-yolo/state.json", sr = "/tmp/dlc-yolo/state.json", Yr = 1, lr = 4096, Zr = 3072;
function Jr(t) {
  let r = t;
  if (typeof t == "string") {
    if (new TextEncoder().encode(t).length > lr) return null;
    try {
      r = JSON.parse(t);
    } catch {
      return null;
    }
  }
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  let o;
  try {
    o = JSON.stringify(r);
  } catch {
    return null;
  }
  if (new TextEncoder().encode(o).length > lr) return null;
  const s = Object.keys(r).sort();
  if (s.length !== 2 || s[0] !== "path" || s[1] !== "schema_version" || r.schema_version !== Yr || typeof r.path != "string") return null;
  const l = r.path;
  return !l.startsWith("/") || l.length === 0 || l.length > Zr || l.includes("\0") || l.includes("\r") || l.includes(`
`) || l.split("/").some((p) => p === "." || p === "..") ? null : l;
}
async function Ht(t) {
  try {
    const r = await t(Xr), o = Jr(r);
    if (o)
      try {
        return { path: o, data: await t(o), source: "pointer" };
      } catch {
      }
  } catch {
  }
  try {
    return { path: er, data: await t(er), source: "durable" };
  } catch {
    return { path: sr, data: await t(sr), source: "scratch" };
  }
}
async function ir(t, r) {
  try {
    return { path: r, data: await t(r), source: "current" };
  } catch {
    return Ht(t);
  }
}
const Qr = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
function ea(t) {
  const r = /* @__PURE__ */ new Map();
  for (const o of String(t || "").split(/[\n,]/)) {
    const s = o.trim();
    Qr.test(s) && !r.has(s.toLowerCase()) && r.set(s.toLowerCase(), s);
  }
  return [...r.values()].sort((o, s) => o.toLowerCase().localeCompare(s.toLowerCase()));
}
const ta = {
  "receiver-disabled": "Enable and save the receiver above first.",
  "receiver-secret-missing": "Set a webhook secret above before exposing the port.",
  "receiver-allowlist-empty": "Add at least one allowed repository above first.",
  "receiver-port-mismatch": "Save the receiver on this port before starting the tunnel.",
  "receiver-not-listening": "The receiver is not listening yet — save it, then Refresh.",
  "receiver-config-invalid": "Repair the stored receiver configuration first."
};
function cr(t) {
  return t === "listening" ? "var(--ok)" : t === "misconfigured" || t === "failed" ? "var(--danger, #ef4444)" : "var(--muted)";
}
function jt(t) {
  const r = (t == null ? void 0 : t.message) || String(t);
  return /(?:404|not found)/i.test(r) ? "Webhook backend unavailable in the running gateway. Restart KiroCrew after syncing this app, then refresh this tab." : r;
}
function Nr() {
  var F, ve;
  const t = yr(), [r, o] = w(null), [s, l] = w(!1), [p, u] = w("8765"), [i, c] = w(""), [g, v] = w(""), [E, f] = w(""), [b, x] = w(!1), [k, D] = w(!1), [q, A] = w(!0), [I, C] = w(!1), [B, X] = w(""), y = le((O) => {
    o(O), l(!!O.enabled), u(String(O.port || 8765)), c((O.repositories || []).join(`
`)), v(O.inbox_path || ""), D(!!O.autosync), f(""), x(!1);
  }, []), J = le(async () => {
    A(!0), X("");
    try {
      y(await t.get("/apps/dlc-yolo/api/webhook/config"));
    } catch (O) {
      X(jt(O));
    } finally {
      A(!1);
    }
  }, [t, y]);
  Ee(() => {
    J();
  }, [J]);
  const [S, he] = w(null), [ye, ie] = w(!1), me = le(async () => {
    try {
      he(await t.get("/apps/dlc-yolo/api/tunnel/status"));
    } catch {
      he(null);
    }
  }, [t]);
  Ee(() => {
    me();
  }, [me]);
  const Se = le(async () => {
    ie(!0);
    try {
      he(await t.post("/apps/dlc-yolo/api/tunnel/start", {}));
    } catch (O) {
      X(jt(O));
    } finally {
      ie(!1);
    }
  }, [t]), Q = le(async () => {
    ie(!0);
    try {
      he(await t.post("/apps/dlc-yolo/api/tunnel/stop", {}));
    } catch (O) {
      X(jt(O));
    } finally {
      ie(!1);
    }
  }, [t]), [z, ee] = w(null), [$e, Te] = w(!1), _e = le(async () => {
    try {
      ee(await t.get("/apps/dlc-yolo/api/crons/status"));
    } catch {
      ee(null);
    }
  }, [t]);
  Ee(() => {
    _e();
  }, [_e]);
  const _ = le(async (O) => {
    Te(!0);
    try {
      const ce = O ? "/apps/dlc-yolo/api/crons/pause" : "/apps/dlc-yolo/api/crons/resume";
      ee(await t.post(ce, {}));
    } catch (ce) {
      X(jt(ce));
    } finally {
      Te(!1);
    }
  }, [t]), U = Ce(() => ea(i), [i]), te = Number(p), we = typeof TextEncoder > "u" ? E.length : new TextEncoder().encode(E).length, Oe = !!(r != null && r.secret_configured) || we >= 32, oe = Number.isInteger(te) && te >= 1024 && te <= 65535 && (!s || U.length > 0 && Oe) && (!g.trim() || g.trim().startsWith("/")), Z = async () => {
    if (!(!(r != null && r.editable) || !oe)) {
      C(!0), X("");
      try {
        const O = {
          enabled: s,
          port: te,
          repositories: U,
          inbox_path: g.trim() || null,
          clear_secret: b,
          autosync: k
        };
        E && (O.secret = E), y(await t.post("/apps/dlc-yolo/api/webhook/config", O));
      } catch (O) {
        X(jt(O));
      } finally {
        C(!1);
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
                style: { color: cr(r.listener), background: `color-mix(in srgb, ${cr(r.listener)} 13%, transparent)` },
                children: r.listener
              }
            )
          ] }),
          /* @__PURE__ */ e("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "Shared by every pipeline. This authenticated control owns the app-wide loopback receiver; the secret is write-only and never returned." })
        ] }) }),
        /* @__PURE__ */ a("div", { className: "px-4 py-4 flex flex-col gap-4", children: [
          q ? /* @__PURE__ */ e("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: "Loading receiver configuration…" }) : r && /* @__PURE__ */ a(ze, { children: [
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
                  onClick: () => l((O) => !O),
                  "aria-pressed": s,
                  className: "rounded-full transition-all relative disabled:opacity-50",
                  style: { background: s ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                  children: /* @__PURE__ */ e("span", { className: "absolute top-0.5 rounded-full transition-all", style: { height: 18, width: 18, background: "var(--bg)", left: s ? 20 : 2 } })
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
                    value: p,
                    disabled: !r.editable,
                    onChange: (O) => u(O.target.value),
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
                      Number.isFinite(te) ? te : "—",
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
                  value: i,
                  disabled: !r.editable,
                  onChange: (O) => c(O.target.value),
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
                  value: g,
                  disabled: !r.editable,
                  onChange: (O) => v(O.target.value),
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
                  value: E,
                  disabled: !r.editable,
                  onChange: (O) => f(O.target.value),
                  placeholder: r.secret_configured ? "•••••••••••••••• (unchanged)" : "Enter a new secret",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            !s && r.secret_configured && r.editable && /* @__PURE__ */ a("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer", style: { color: "var(--muted)" }, children: [
              /* @__PURE__ */ e("input", { type: "checkbox", checked: b, onChange: (O) => x(O.target.checked) }),
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
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: ((F = r.inbox) == null ? void 0 : F.pending) ?? "—" })
                  ] }),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Processed" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: ((ve = r.inbox) == null ? void 0 : ve.processed) ?? "—" })
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
                        onFocus: (O) => O.currentTarget.select(),
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
                        onFocus: (O) => O.currentTarget.select(),
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
                    ta[S.receiver_block_reason || ""] || S.receiver_block_reason
                  ] }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    S != null && S.running ? /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void Q(),
                        disabled: ye,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--danger, #ef4444)", color: "var(--bg)" },
                        children: ye ? "Stopping…" : "Stop tunnel"
                      }
                    ) : /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void Se(),
                        disabled: ye || !(S != null && S.installed) || (S == null ? void 0 : S.receiver_ready) === !1,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: ye ? "Starting…" : "Start tunnel"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void me(),
                        disabled: ye,
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
                        checked: k,
                        disabled: !(r != null && r.editable),
                        onChange: (O) => D(O.target.checked),
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
                  (S == null ? void 0 : S.autosync) && S.autosync.enabled && /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: S.autosync.error ? "var(--danger, #ef4444)" : "var(--ok)" }, children: S.autosync.error ? `Auto-sync failed: ${S.autosync.error}` : `Auto-synced ${(S.autosync.results || []).filter((O) => O.action === "updated").length} hook(s) → ${S.autosync.payload_url}` })
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
                    z && z.available && /* @__PURE__ */ e(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: z.all_paused ? "var(--warn)" : "var(--ok)", border: "1px solid var(--border)" },
                        children: z.all_paused ? "paused" : z.any_active ? "running" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ e("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "DLC-YOLO's three background jobs (advance · spawns · backlog-intake). Pause them for a webhook-only or maintenance setup; the webhook receiver keeps working while paused (a verified delivery still wakes advance when resumed). Polling stops while paused." }),
                  z && !z.available && /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Cron control unavailable",
                    z.error ? `: ${z.error}` : "",
                    "."
                  ] }),
                  z && z.available && z.jobs.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-col gap-1", children: z.jobs.map((O) => /* @__PURE__ */ a(
                    "div",
                    {
                      className: "flex items-center justify-between text-[11px] font-mono",
                      style: { color: "var(--muted)" },
                      children: [
                        /* @__PURE__ */ e("span", { children: O.basename }),
                        /* @__PURE__ */ e("span", { style: { color: O.paused ? "var(--warn)" : "var(--ok)" }, children: O.paused ? "paused" : "active" })
                      ]
                    },
                    O.id
                  )) }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void _(!0),
                        disabled: $e || !(z != null && z.available) || (z == null ? void 0 : z.all_paused),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--warn)", color: "var(--bg)" },
                        children: $e ? "…" : "Pause all"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void _(!1),
                        disabled: $e || !(z != null && z.available) || (z == null ? void 0 : z.any_active),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: $e ? "…" : "Resume all"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void _e(),
                        disabled: $e,
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
          B && /* @__PURE__ */ e("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))" }, children: B })
        ] }),
        /* @__PURE__ */ a("footer", { className: "px-4 py-3 flex justify-between gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--card)" }, children: [
          /* @__PURE__ */ e("button", { onClick: () => void J(), disabled: q || I, className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50", style: { color: "var(--muted)" }, children: "Refresh status" }),
          (r == null ? void 0 : r.editable) && /* @__PURE__ */ e(
            "button",
            {
              onClick: () => void Z(),
              disabled: !oe || I,
              className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
              style: { background: "var(--accent)", color: "var(--bg)" },
              children: I ? "Applying…" : "Save & apply"
            }
          )
        ] })
      ]
    }
  );
}
function ra({ repos: t, selectedRepos: r, onNewPipeline: o, onConfigure: s, onOpenAgents: l }) {
  const { openChat: p } = fr(), u = r.length === 1 ? r[0] : t.length === 1 ? t[0] : "", i = "/dlc-yolo", c = "text-[10px] leading-none px-1.5 py-1 rounded font-semibold";
  return /* @__PURE__ */ e(ze, { children: /* @__PURE__ */ a("div", { "data-dlc-command-controls": !0, className: "mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap", children: [
    /* @__PURE__ */ e(
      "button",
      {
        onClick: () => p({ message: i }),
        title: "Open the DLC-YOLO command session; choose the next command action there",
        className: c,
        style: { background: "var(--accent)", color: "var(--bg)" },
        children: "✨ Command session"
      }
    ),
    /* @__PURE__ */ e(
      "button",
      {
        onClick: () => u ? s(u) : o(),
        className: c,
        style: { color: "var(--muted)", border: "1px solid var(--border)" },
        children: u ? "Edit pipeline" : "New pipeline"
      }
    ),
    /* @__PURE__ */ e(
      "button",
      {
        onClick: l,
        className: c,
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
const Ut = {
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
};
function Et(t) {
  return t ? t.max_child_cards === "unlimited" && t.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth";
}
function aa({ budget: t, depth: r, onSave: o }) {
  const [s, l] = w(!1), [p, u] = w(Et(t)), [i, c] = w(
    Et(t) === "custom" ? { ...t } : { ...Ut[r] || Ut.standard }
  ), g = () => {
    const f = Et(t);
    u(f), c(f === "custom" ? { ...t } : { ...Ut[r] || Ut.standard }), l(!0);
  }, v = () => {
    o(p === "depth" ? void 0 : p === "unlimited" ? {
      max_child_cards: "unlimited",
      effort_ceiling: "unlimited",
      max_feature_size: "XL",
      addenda: "proactive"
    } : { ...i }), l(!1);
  }, E = Et(t) === "depth" ? "budget: depth" : Et(t) === "unlimited" ? "budget: unlimited" : "budget: custom";
  return /* @__PURE__ */ a("div", { className: "relative", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        onClick: g,
        title: "Edit this card's explicit budget override",
        className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
        style: { color: t ? "var(--accent)" : "var(--muted)", border: `1px solid ${t ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)"}`, background: t ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" },
        children: E
      }
    ),
    s && /* @__PURE__ */ a(
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
              style: { color: p === f ? "var(--bg)" : "var(--muted)", background: p === f ? "var(--accent)" : "var(--bg-hover, var(--border))" },
              children: f === "depth" ? "follow depth" : f
            },
            f
          )) }),
          p === "depth" && /* @__PURE__ */ a("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
            "Removes ",
            /* @__PURE__ */ e("code", { children: "card.budget" }),
            "; effective budget follows ",
            r || "standard",
            " depth."
          ] }),
          p === "unlimited" && /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: "var(--warn)" }, children: "Literal unlimited child/effort caps · XL · proactive addenda." }),
          p === "custom" && /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Child cards",
              /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: i.max_child_cards,
                  onChange: (f) => c((b) => ({ ...b, max_child_cards: Math.max(0, Number(f.target.value) || 0) })),
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
                  value: i.effort_ceiling,
                  onChange: (f) => c((b) => ({ ...b, effort_ceiling: Math.max(0, Number(f.target.value) || 0) })),
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
                  value: i.max_feature_size,
                  onChange: (f) => c((b) => ({ ...b, max_feature_size: f.target.value })),
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
                  value: i.addenda,
                  onChange: (f) => c((b) => ({ ...b, addenda: f.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["none", "obvious", "proactive"].map((f) => /* @__PURE__ */ e("option", { children: f }, f))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ a("div", { className: "flex justify-end gap-2 mt-1", children: [
            /* @__PURE__ */ e("button", { type: "button", onClick: () => l(!1), className: "text-[10px] px-2 py-1", style: { color: "var(--muted)" }, children: "Cancel" }),
            /* @__PURE__ */ e("button", { type: "button", onClick: v, className: "text-[10px] px-2 py-1 rounded font-semibold", style: { background: "var(--accent)", color: "var(--bg)" }, children: "Save budget" })
          ] })
        ]
      }
    )
  ] });
}
const dr = [
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
], _r = {
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
}, na = /* @__PURE__ */ new Set(["retired", "merged"]), pr = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked"]);
function oa(t) {
  const r = t == null ? void 0 : t.execution_schedule;
  if (!r || typeof r != "object") return null;
  const o = r.nodes;
  if (!o || typeof o != "object") return null;
  const s = r.current_node_id;
  return typeof s == "string" && o[s] && typeof o[s] == "object" ? o[s] : Object.values(o).find((l) => l && typeof l == "object" && l.step === t.stage) || null;
}
function ur(t, r) {
  const o = t == null ? void 0 : t[r], s = o && typeof o == "object" ? o[t.stage] : null;
  return typeof s == "string" && s.trim() ? s.trim() : null;
}
function mr(t, { isGate: r = !1, liveObserved: o = !1 } = {}) {
  const s = typeof (t == null ? void 0 : t.stage) == "string" ? t.stage : "", l = typeof (t == null ? void 0 : t.lifecycle) == "string" ? t.lifecycle.toLowerCase() : "", p = t != null && t.step_status && typeof t.step_status == "object" ? String(t.step_status[s] || "") : "", u = oa(t), i = typeof (u == null ? void 0 : u.status) == "string" ? u.status : "", c = t != null && t.step_sessions && typeof t.step_sessions == "object" ? t.step_sessions[s] : null, g = pr.has(l) || i === "cancelling" || (c == null ? void 0 : c.writes_allowed) === !1 || !!(c != null && c.cancel_requested_at), v = s === "done" || na.has(l) || ["completed", "cancelled", "superseded"].includes(i);
  let E, f = null;
  return v ? (E = "terminal", f = i === "cancelled" || pr.has(l) ? `terminal ${l || i}` : l || i || s || null) : g ? (E = "cancelling", f = "writes revoked; awaiting terminal observation") : p === "blocked" || i === "blocked" ? (E = "blocked", f = ur(t, "block_reason") || ((u == null ? void 0 : u.wait_reasons) || [])[0] || "step blocked") : p === "error" || i === "failed" ? (E = "error", f = ur(t, "error_reason") || (u == null ? void 0 : u.dispatch_error) || "step error") : r || i === "gate-wait" ? E = "waiting-gate" : o ? E = "running-observed" : p === "pending" || i === "running" ? (E = "pending-unconfirmed", f = "no current live observation") : ["queued", "dependency-wait", "permit-wait"].includes(i) ? (E = "queued", f = Array.isArray(u == null ? void 0 : u.wait_reasons) ? u.wait_reasons.join(" · ") : null) : i === "ready" ? E = "ready" : E = "idle", { kind: E, reason: f, ..._r[E] };
}
const vt = { LOOP: "loop", STEP: "step-agent", ORCH: "orchestrator", HUMAN: "human" };
function ot(t) {
  return typeof t == "string" ? t : "";
}
function sa(t) {
  if (!t || typeof t != "object") return [];
  const r = [], o = (s) => {
    s && s.at && r.push(s);
  };
  for (const s of t.history || [])
    !s || typeof s != "object" || o({
      id: `hist:${s.at}:${s.to}`,
      at: ot(s.at),
      actor: vt.LOOP,
      kind: "promoted",
      step: s.to,
      cls: "notification",
      needs_human: !1,
      headline: `advanced ${s.from || "?"} → ${s.to || "?"}`,
      detail: s.agent ? `by ${s.agent}` : ""
    });
  for (const [s, l] of Object.entries(t.step_summaries || {})) {
    if (!l || typeof l != "object" || !l.headline) continue;
    const p = l.status === "blocked";
    o({
      id: `summ:${s}:${l.at || l.status}`,
      at: ot(l.at) || ot(t.updated_at),
      actor: vt.STEP,
      kind: p ? "blocked" : l.status === "error" ? "error" : "step-done",
      step: s,
      cls: "notification",
      needs_human: !!l.needs_human,
      headline: l.headline,
      detail: l.description || "",
      executor: l.executor || null
    });
  }
  for (const s of t.gate_history || [])
    !s || typeof s != "object" || o({
      id: `gate:${s.at}:${s.gate}`,
      at: ot(s.at),
      actor: vt.HUMAN,
      kind: s.decision === "rejected" ? "rejected" : s.decision === "approved" ? "approved" : "gate",
      step: s.gate,
      cls: "decision",
      needs_human: !1,
      headline: `you ${s.decision || "acted on"} ${s.gate}`,
      detail: s.notes || ""
    });
  for (const s of t.decisions || []) {
    if (!s || typeof s != "object") continue;
    const l = !!s.chosen || !!s.resolved_at;
    o({
      id: `dec:${s.id || s.at}`,
      at: ot(s.at),
      actor: vt.ORCH,
      kind: l ? "resolved" : "decision",
      step: s.step,
      cls: "decision",
      needs_human: !l,
      headline: l ? `resolved: ${s.chosen || s.action || s.kind || "decision"}` : `decision needed: ${s.question || s.kind || "a fork"}`,
      detail: s.rationale || s.question || ""
    });
  }
  for (const s of t.backstep_history || [])
    !s || typeof s != "object" || o({
      id: `back:${s.at}`,
      at: ot(s.at),
      actor: vt.ORCH,
      kind: "back-stepped",
      step: s.to,
      cls: "notification",
      needs_human: !1,
      headline: `stepped back ${s.from || "?"} → ${s.to || "?"}`,
      detail: s.reason || ""
    });
  for (const s of t.parked || [])
    !s || typeof s != "object" || o({
      id: `park:${s.id || s.at}`,
      at: ot(s.at),
      actor: vt.ORCH,
      kind: "parked",
      step: s.phase,
      cls: "notification",
      needs_human: !1,
      headline: `parked to backlog: ${s.note || "idea"}`,
      detail: s.issue_url || ""
    });
  return r.map((s, l) => ({ ...s, _i: l })).sort((s, l) => s.at < l.at ? -1 : s.at > l.at ? 1 : s._i - l._i).map(({ _i: s, ...l }) => l);
}
const la = /^\[([a-z0-9-]+)\s*[·.]\s*f?\d+\]\s*(.*)$/i;
function Cr(t) {
  const r = la.exec(String(t || ""));
  return r ? { parentId: r[1], rest: r[2] } : null;
}
function ia(t, r) {
  var p;
  if (!t) return [];
  const o = [], s = /* @__PURE__ */ new Set(), l = (u) => {
    u && !s.has(u.id) && (s.add(u.id), o.push(u));
  };
  for (const u of ((p = t.topology) == null ? void 0 : p.children) || []) {
    const i = typeof u == "string" ? u : u == null ? void 0 : u.card_id, c = (r || []).find((g) => g.id === i);
    c && l({ id: c.id, title: c.title, stage: c.stage, lifecycle: c.lifecycle, required: (u == null ? void 0 : u.required) !== !1 });
  }
  for (const u of r || []) {
    const i = Cr(u.title);
    i && i.parentId === t.id && l({ id: u.id, title: u.title, stage: u.stage, lifecycle: u.lifecycle, required: !0 });
  }
  return o;
}
function ca(t) {
  var o;
  const r = Cr(t == null ? void 0 : t.title);
  return r ? r.parentId : ((o = t == null ? void 0 : t.topology) == null ? void 0 : o.integration_owner) || (t == null ? void 0 : t.parent_card) || null;
}
const hr = ["webhook", "loop", "orchestrator", "crew", "step-agent", "human"], Sr = {
  webhook: "⬇",
  loop: "⚙",
  orchestrator: "🧠",
  crew: "👥",
  "step-agent": "🤖",
  human: "🧑"
};
function je(t) {
  return typeof t == "string" ? t : "";
}
function da(t) {
  return String(t || "").slice(0, 8);
}
function pa(t, r) {
  var u;
  const o = t.id, s = ((u = t.execution_schedule) == null ? void 0 : u.nodes) || {};
  for (const [i, c] of Object.entries(s)) {
    if (!c || typeof c != "object") continue;
    const g = je(c.terminal_at) || je(c.session_at) || je(c.ready_at) || je(c.created_at);
    r({
      id: `sched:${i}`,
      at: g,
      actor: "step-agent",
      kind: `step-${c.status || "node"}`,
      cardId: o,
      step: c.step,
      node_id: i,
      headline: `${c.step || c.kind || "step"} · ${c.status || "node"}`,
      detail: c.concurrency_class ? `class ${c.concurrency_class}` : ""
    });
  }
  for (const i of t.event_outbox || [])
    !i || typeof i != "object" || r({
      id: i.id || `outbox:${o}:${i.subject}:${i.time}`,
      at: je(i.time),
      actor: "step-agent",
      kind: (i.type || "").split(".").pop() || "event",
      cardId: o,
      step: i.subject,
      run_id: i.run_id,
      envelope_id: i.envelope_id,
      caused_by: i.correlation_id && i.correlation_id !== o ? i.correlation_id : void 0,
      headline: `${i.subject || "step"} → ${i.terminal_status || i.type || "event"}`,
      detail: i.observed_status ? `observed: ${i.observed_status}` : i.run_id ? `run ${da(i.run_id)}` : ""
    });
  for (const i of t.history || []) {
    if (!i || typeof i != "object") continue;
    const c = i.agent || "", g = /cron|advance/i.test(c) ? "loop" : /human|user/i.test(c) ? "human" : "loop";
    r({
      id: `hist:${o}:${i.at}:${i.to}`,
      at: je(i.at),
      actor: g,
      kind: "promoted",
      cardId: o,
      step: i.to,
      inferred: g === "loop" && /cron|advance/i.test(c) ? !1 : void 0,
      headline: `advanced ${i.from || "?"} → ${i.to || "?"}`,
      detail: c ? `by ${c}` : ""
    });
  }
  for (const i of t.decisions || []) {
    if (!i || typeof i != "object") continue;
    const c = i.status === "resolved" || !!i.chosen || !!i.resolved_at;
    r({
      id: `dec:${i.id || o + i.step}`,
      at: je(i.at) || je(i.resolved_at),
      actor: "orchestrator",
      kind: c ? "decision-resolved" : "decision-open",
      cardId: o,
      step: i.step,
      envelope_id: i.envelope_id,
      needs_human: !c && i.resolution === "human-required",
      headline: c ? `decision resolved: ${i.kind || "fork"}` : `decision: ${i.kind || "fork"}`,
      detail: (i.question || "").slice(0, 160)
    });
  }
  for (const i of t.gate_history || []) {
    if (!i || typeof i != "object") continue;
    const c = /user|human/i.test(i.actor || "");
    r({
      id: `gate:${o}:${i.at}:${i.gate}`,
      at: je(i.at),
      actor: c ? "human" : "orchestrator",
      kind: i.decision === "rejected" ? "gate-rejected" : "gate-approved",
      cardId: o,
      step: i.gate,
      headline: `${c ? "human" : i.actor || "system"} ${i.decision || "acted"} ${i.gate}`,
      detail: i.notes || (i.result_revision != null ? `rev ${i.result_revision}` : "")
    });
  }
  const l = t.orchestrator_session;
  l && l.at && r({
    id: `orch:${o}:${l.session_key || l.at}`,
    at: je(l.at),
    actor: "orchestrator",
    kind: "orchestrator-session",
    cardId: o,
    session_key: l.session_key,
    headline: "orchestrator session",
    detail: l.name || l.slot_key || ""
  });
  const p = t.orchestrator_trigger;
  p && p.at && (!l || p.at !== l.at) && r({
    id: `orchtrig:${o}:${p.at}`,
    at: je(p.at),
    actor: "orchestrator",
    kind: "orchestrator-trigger",
    cardId: o,
    session_key: p.session_key,
    headline: `orchestrator trigger · ${p.status || ""}`,
    detail: ""
  });
  for (const [i, c] of Object.entries(t.step_sessions || {}))
    !c || typeof c != "object" || !c.at || r({
      id: `sess:${o}:${i}:${c.at}`,
      at: je(c.at),
      actor: "crew",
      kind: "session",
      cardId: o,
      step: i,
      session_key: c.slot_key || c.session_key,
      headline: `crew session · ${i}`,
      detail: c.executor || c.working_dir || "",
      inferred: !0
    });
}
function ua(t, r) {
  for (const o of (t == null ? void 0 : t.github_webhook_history) || [])
    !o || typeof o != "object" || r({
      id: `wh:${o.delivery_id}`,
      at: je(o.at) || je(o.received_at) || je(o.time),
      actor: "webhook",
      kind: `webhook-${o.status || "received"}`,
      cardId: o.card_id,
      caused_by: void 0,
      headline: `${o.event}.${o.action} #${o.issue_number ?? "?"}`,
      detail: `${o.repository || ""}${o.status ? ` · ${o.status}` : ""}${o.reason ? ` (${o.reason})` : ""}`
    });
}
function ma(t, r, o) {
  const s = t == null ? void 0 : t.id, l = (r || []).filter((g) => {
    var v;
    return g && (g.pipeline_id === s || !g.pipeline_id && ((v = g.source) == null ? void 0 : v.repo) === (t == null ? void 0 : t.repo));
  }), p = [], u = (g) => {
    g && g.at && p.push({ glyph: Sr[g.actor] || "•", ...g });
  };
  for (const g of l) pa(g, u);
  ua(o, u);
  const i = Object.fromEntries(hr.map((g, v) => [g, v]));
  p.sort((g, v) => (g.at < v.at ? -1 : g.at > v.at ? 1 : 0) || (i[g.actor] ?? 9) - (i[v.actor] ?? 9) || (g.id < v.id ? -1 : g.id > v.id ? 1 : 0));
  const c = hr.filter((g) => p.some((v) => v.actor === g));
  return { events: p, actors: c, now: (o == null ? void 0 : o.scheduler_state) || null };
}
const ha = [
  "request:re-spec",
  "request:retry",
  "request:back-step",
  "request:park",
  "request:cancel"
], tr = 500, rr = {
  "request:retry": { label: "Retry step", reasonRequired: !1, confirm: "Re-run this failed step?" },
  "request:re-spec": { label: "Re-spec", reasonRequired: !1, confirm: "Ask the orchestrator to re-scope this card?" },
  "request:back-step": { label: "Back-step", reasonRequired: !0, confirm: "Propose stepping this card back a level? A reason is required." },
  "request:park": { label: "Park", reasonRequired: !0, confirm: "Park this card to the backlog? A reason is required." },
  "request:cancel": {
    label: "Cancel",
    reasonRequired: !1,
    confirm: "Cancel cooperatively: writes are revoked, the live turn may NOT stop immediately, and the permit/worktree are retained until terminal observation. Continue?"
  }
};
function va() {
  var r, o;
  return `ui-${(((o = (r = globalThis.crypto) == null ? void 0 : r.randomUUID) == null ? void 0 : o.call(r)) || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16)}`;
}
function ga(t, r) {
  if (!ha.includes(t)) return { ok: !1, error: `unknown request kind: ${t}` };
  const o = rr[t], s = String(r || "").trim();
  return o.reasonRequired && !s ? { ok: !1, error: "a reason is required for this request" } : s.length > tr ? { ok: !1, error: `reason exceeds ${tr} chars` } : { ok: !0 };
}
function ba({ id: t, kind: r, text: o, card: s, now: l, boundary: p }) {
  const u = ga(r, o);
  if (!u.ok) throw new Error(u.error);
  const i = s == null ? void 0 : s.stage, c = s != null && s.step_status && typeof s.step_status == "object" ? s.step_status[i] ?? null : null, g = {
    id: t,
    at: l,
    step: i,
    kind: r,
    text: String(o || "").trim().slice(0, tr),
    by: "user",
    status: "pending",
    expected: { stage: i ?? null, step_status: c }
  };
  return r === "request:back-step" && p && (g.boundary = p), g;
}
function xa(t, r) {
  const o = Array.isArray(t) ? t : [];
  return o.some((s) => s && s.id === r.id) ? o : [...o, r];
}
const $r = [
  "ready",
  "queued",
  "running",
  "pending",
  "blocked",
  "error",
  "cancelling",
  "terminal"
];
function fa(t, r) {
  const o = Object.fromEntries($r.map((p) => [p, 0])), s = r && typeof r == "object" ? r : {};
  o.ready = (s.ready_node_ids || []).length, o.running = (s.running_node_ids || []).length, o.blocked = (s.blocked_node_ids || []).length, o.queued = (s.selected_node_ids || []).length;
  const l = [];
  for (const p of t || []) {
    if (!p || typeof p != "object") continue;
    const u = p.stage, i = p.step_status && typeof p.step_status == "object" ? p.step_status[u] : null;
    p.writes_allowed === !1 || p.cancel_requested_at ? o.cancelling += 1 : i === "error" ? o.error += 1 : i === "blocked" ? o.blocked += 1 : i === "pending" ? o.pending += 1 : (i === "done" || p.lifecycle === "retired" || p.lifecycle === "merged") && (o.terminal += 1);
    const c = p.block_reason && typeof p.block_reason == "object" ? p.block_reason[u] : null;
    c && l.push({ card: p.id, reason: String(c) });
  }
  return { counts: o, waitReasons: l.slice(0, 50) };
}
function Gt(t) {
  if (!t || typeof t != "object")
    return { available: !1, label: "unavailable", authority_active: !1, verified: !1 };
  const r = !!t.authority_active, o = String(t.parity_status || ""), s = o === "verified" || t.verified === !0;
  return {
    available: !0,
    authority_active: r,
    verified: s,
    parity_status: o || (s ? "verified" : "unknown"),
    digest_match: t.digest_match === void 0 ? null : !!t.digest_match,
    failure_code: t.failure_code || t.error || null,
    // never surface paths/prose from the minimized model
    label: r ? s ? "verified" : "blocked" : "authority inactive"
  };
}
const vr = /^[A-Za-z0-9._-]{1,128}$/;
function Ot({ values: t, empty: r = "none declared" }) {
  return t.length ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1", children: t.map((o) => /* @__PURE__ */ e(
    "code",
    {
      className: "text-[10px] px-1.5 py-0.5 rounded",
      style: { color: "var(--text)", background: "var(--bg-hover, var(--border))", border: "1px solid var(--border)" },
      children: o
    },
    o
  )) }) : /* @__PURE__ */ e("span", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: r });
}
function Je({ label: t, value: r }) {
  return /* @__PURE__ */ a("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]", children: [
    /* @__PURE__ */ e("span", { className: "uppercase tracking-wide", style: { color: "var(--muted)" }, children: t }),
    /* @__PURE__ */ e("span", { className: "break-words", style: { color: r ? "var(--text)" : "var(--muted)" }, children: r || "not set" })
  ] });
}
function ya({ profiles: t, initial: r, onSave: o, onClose: s }) {
  var I;
  const l = r ? "update" : "create", [p, u] = w((r == null ? void 0 : r.name) || ""), [i, c] = w((r == null ? void 0 : r.kiroAgent) || ((I = t.find((C) => C.status === "loaded")) == null ? void 0 : I.name) || ""), [g, v] = w((r == null ? void 0 : r.workspace) || ""), [E, f] = w((r == null ? void 0 : r.memoryStore) || ""), [b, x] = w(!1), [k, D] = w(""), q = vr.test(p.trim()) && vr.test(i.trim()) && new TextEncoder().encode(g.trim()).length <= 256 && new TextEncoder().encode(E.trim()).length <= 256, A = async () => {
    if (!(!q || b)) {
      x(!0), D("");
      try {
        await o({
          mode: l,
          name: p.trim(),
          kiroAgent: i.trim(),
          workspace: g.trim() || void 0,
          memoryStore: E.trim() || void 0
        });
      } catch (C) {
        D((C == null ? void 0 : C.message) || String(C)), x(!1);
      }
    }
  };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[80] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 68%, transparent)", backdropFilter: "blur(3px)" },
      onMouseDown: (C) => {
        C.currentTarget === C.target && !b && s();
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
                  onClick: s,
                  disabled: b,
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
                    value: p,
                    onChange: (C) => u(C.target.value),
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
                    value: i,
                    onChange: (C) => c(C.target.value),
                    placeholder: "dlcyolo-readonly",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                ),
                /* @__PURE__ */ e("datalist", { id: "dlc-agent-profile-options", children: t.map((C) => /* @__PURE__ */ e("option", { value: C.name }, C.name)) })
              ] }),
              /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Workspace ",
                /* @__PURE__ */ e("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    value: g,
                    onChange: (C) => v(C.target.value),
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
                    value: E,
                    onChange: (C) => f(C.target.value),
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
              k && /* @__PURE__ */ e("div", { className: "text-[11px] rounded-md px-3 py-2", style: { color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))" }, children: k })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              /* @__PURE__ */ e("button", { onClick: s, disabled: b, className: "text-[11px] px-3 py-1.5 rounded-md disabled:opacity-40", style: { color: "var(--muted)" }, children: "Cancel" }),
              /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => void A(),
                  disabled: !q || b,
                  className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: b ? "Saving…" : l === "create" ? "Create crew route" : "Save crew route"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function ar({ profiles: t, crews: r, loading: o = !1, context: s, onRefresh: l, onClose: p, onSelectProfile: u, onSelectCrew: i, onSaveCrew: c }) {
  var B, X;
  const [g, v] = w("agents"), [E, f] = w(((B = t[0]) == null ? void 0 : B.name) || ""), [b, x] = w(((X = r[0]) == null ? void 0 : X.name) || ""), [k, D] = w(null);
  Ee(() => {
    var y;
    t.some((J) => J.name === E) || f(((y = t[0]) == null ? void 0 : y.name) || "");
  }, [t, E]), Ee(() => {
    var y;
    r.some((J) => J.name === b) || x(((y = r[0]) == null ? void 0 : y.name) || "");
  }, [r, b]);
  const q = t.find((y) => y.name === E), A = r.find((y) => y.name === b), I = Ce(
    () => A != null && A.kiroAgent ? t.find((y) => y.name === A.kiroAgent) : void 0,
    [A, t]
  ), C = q != null && q.prompt ? q.prompt.length > 1200 ? `${q.prompt.slice(0, 1200)}…` : q.prompt : "";
  return /* @__PURE__ */ a(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 62%, transparent)", backdropFilter: "blur(2px)" },
      onMouseDown: (y) => {
        y.currentTarget === y.target && p();
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
                  s && /* @__PURE__ */ a("p", { className: "text-[10px] mt-1", style: { color: "var(--accent)" }, children: [
                    "Pipeline context: ",
                    s
                  ] })
                ] }),
                l && /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: l,
                    disabled: o,
                    className: "text-[11px] px-2.5 py-1.5 rounded-md disabled:opacity-50",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: o ? "Refreshing…" : "Refresh"
                  }
                ),
                c && /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => {
                      v("crews"), D({ mode: "create" });
                    },
                    className: "text-[11px] px-2.5 py-1.5 rounded-md font-semibold",
                    style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))" },
                    children: "+ New crew route"
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: p,
                    "aria-label": "Close agents and crews",
                    className: "w-8 h-8 rounded-lg text-lg leading-none",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: [["agents", `Agent templates · ${t.length}`], ["crews", `Global crews · ${r.length}`]].map(([y, J]) => /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => v(y),
                  className: "text-[12px] px-3 py-2 font-semibold",
                  style: { color: g === y ? "var(--accent)" : "var(--muted)", borderBottom: `2px solid ${g === y ? "var(--accent)" : "transparent"}`, marginBottom: -1 },
                  children: J
                },
                y
              )) }),
              /* @__PURE__ */ e("div", { className: "flex min-h-0 flex-1", children: g === "agents" ? /* @__PURE__ */ a(ze, { children: [
                /* @__PURE__ */ a("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  t.map((y) => /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: () => f(y.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: y.name === E ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: y.name === E ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold truncate", children: y.name }),
                        /* @__PURE__ */ e("div", { className: "text-[9px] mt-0.5", style: { color: y.status === "loaded" ? "var(--ok)" : "var(--warn)" }, children: y.status === "loaded" ? "config loaded" : "config unavailable" })
                      ]
                    },
                    y.name
                  )),
                  !t.length && /* @__PURE__ */ e("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No referenced profiles." })
                ] }),
                /* @__PURE__ */ e("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: q ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ e("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: q.name }),
                      /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: q.description || "No description declared." })
                    ] }),
                    u && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => u(q),
                        disabled: q.status !== "loaded",
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Use for this step"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ a("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ e(Je, { label: "Model", value: q.model || "auto / provider default" }),
                    /* @__PURE__ */ e(Je, { label: "Config source", value: q.sourcePath }),
                    /* @__PURE__ */ e(Je, { label: "Prompt", value: q.prompt ? q.prompt.startsWith("file://") ? q.prompt : "inline prompt" : void 0 })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Declared tools" }),
                    /* @__PURE__ */ e(Ot, { values: q.tools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Auto-approved tools" }),
                    /* @__PURE__ */ e(Ot, { values: q.allowedTools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Resources / skills" }),
                    /* @__PURE__ */ e(Ot, { values: q.resources })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "MCP servers" }),
                    /* @__PURE__ */ e(Ot, { values: q.mcpServers })
                  ] }),
                  C && /* @__PURE__ */ a("details", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ e("summary", { className: "text-[11px] cursor-pointer", style: { color: "var(--accent)" }, children: "Prompt preview" }),
                    /* @__PURE__ */ e("pre", { className: "mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto", style: { color: "var(--muted)" }, children: C })
                  ] }),
                  /* @__PURE__ */ e("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 28%, var(--border))" }, children: "These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access." })
                ] }) : /* @__PURE__ */ e("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select an agent template." }) })
              ] }) : /* @__PURE__ */ a(ze, { children: [
                /* @__PURE__ */ a("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  r.map((y) => /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: () => x(y.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: y.name === b ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: y.name === b ? "var(--accent)" : "var(--text)" },
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
                /* @__PURE__ */ e("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: A ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ e("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: A.name }),
                      /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: A.description || "No description declared." })
                    ] }),
                    c && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => D({ mode: "update", crew: A }),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { color: "var(--accent)", border: "1px solid var(--border)" },
                        children: "Edit route"
                      }
                    ),
                    i && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => i(A),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Route step here"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ a("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ e(Je, { label: "kiro_agent", value: A.kiroAgent }),
                    /* @__PURE__ */ e(Je, { label: "Workspace", value: A.workspace }),
                    /* @__PURE__ */ e(Je, { label: "Memory store", value: A.memoryStore }),
                    /* @__PURE__ */ e(Je, { label: "Model override", value: A.model }),
                    /* @__PURE__ */ e(Je, { label: "Source", value: A.source })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Selection triggers" }),
                    /* @__PURE__ */ e(Ot, { values: A.triggers })
                  ] }),
                  A.kiroAgent && /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Authority profile" }),
                    /* @__PURE__ */ a("div", { className: "flex items-center gap-2 mt-1.5", children: [
                      /* @__PURE__ */ e("code", { className: "text-[12px]", style: { color: "var(--accent)" }, children: A.kiroAgent }),
                      /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: (I == null ? void 0 : I.status) === "loaded" ? "var(--ok)" : "var(--warn)" }, children: (I == null ? void 0 : I.status) === "loaded" ? "loaded" : "unavailable" }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => {
                            f(A.kiroAgent || ""), v("agents");
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
        k && c && /* @__PURE__ */ e(
          ya,
          {
            profiles: t,
            initial: k.mode === "update" ? k.crew : void 0,
            onClose: () => D(null),
            onSave: async (y) => {
              await c(y), x(y.name), D(null);
            }
          }
        )
      ]
    }
  );
}
const Tr = Object.freeze([
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
]), ka = /^[A-Za-z0-9._-]{1,128}$/;
function Ge(t) {
  return typeof t == "string" && ka.test(t);
}
function Ke(t) {
  return typeof t == "string" && t.trim() ? t.trim() : void 0;
}
function Kt(t) {
  return Array.isArray(t) ? [...new Set(t.filter((r) => typeof r == "string" && r.trim()).map((r) => r.trim()))] : [];
}
function wa(t) {
  return !t || typeof t != "object" || Array.isArray(t) ? [] : Object.entries(t).filter(([r, o]) => Ge(r) && o && typeof o == "object" && !Array.isArray(o)).map(([r, o]) => ({
    name: r,
    kiroAgent: Ge(o.kiro_agent) ? o.kiro_agent : void 0,
    workspace: Ke(o.workspace),
    memoryStore: Ke(o.memory_store ?? o.memoryStore),
    model: Ke(o.model),
    description: Ke(o.description),
    triggers: Kt(o.triggers),
    source: Ke(o.source)
  })).sort((r, o) => r.name.localeCompare(o.name));
}
function Na(t, r = Tr) {
  const o = [];
  for (const l of r)
    Ge(l) && !o.includes(l) && o.push(l);
  const s = (Array.isArray(t) ? t : []).map((l) => l == null ? void 0 : l.kiroAgent).filter(Ge).sort((l, p) => l.localeCompare(p));
  for (const l of s)
    o.includes(l) || o.push(l);
  return o;
}
function _a(t, r, o = Tr) {
  if (!Ge(t)) return;
  if (o.includes(t)) return `~/.kiro/crew/apps/dlc-yolo/agents/${t}.json`;
  const s = [...new Set(
    (Array.isArray(r) ? r : []).filter((l) => (l == null ? void 0 : l.kiroAgent) === t).map((l) => l == null ? void 0 : l.source).filter(Ge)
  )];
  if (s.length === 1)
    return `~/.kiro/agents/${s[0]}--${t}.json`;
}
function Qt(t, r, o) {
  const s = Ge(r) ? r : "unknown", l = !!t && typeof t == "object" && !Array.isArray(t), p = l && Ge(t.name) ? t.name : s, u = l && t.mcpServers && typeof t.mcpServers == "object" ? Object.keys(t.mcpServers).filter(Ge) : [];
  return {
    name: p,
    description: l ? Ke(t.description) : void 0,
    prompt: l ? Ke(t.prompt) : void 0,
    model: l ? Ke(t.model) : void 0,
    tools: l ? Kt(t.tools) : [],
    allowedTools: l ? Kt(t.allowedTools) : [],
    resources: l ? Kt(t.resources) : [],
    mcpServers: u,
    status: l ? "loaded" : "unavailable",
    sourcePath: Ke(o)
  };
}
function Ca(t) {
  const r = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(t || "");
  return r == null ? void 0 : r[1];
}
function Sa(t, r) {
  if (!r || !Ge(r.name)) return { ...t };
  const o = Ca(r.name);
  return {
    ...t,
    name: r.name,
    tools: [...r.tools || []],
    model: r.model || "auto",
    ...o ? { capability: o } : {}
  };
}
let Qe = er;
const gr = (t) => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
})[t], Vt = [
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
], Rr = /* @__PURE__ */ new Set([
  "example-org/web-app",
  "example-org/dashboard",
  "example-org/api-core"
]), $a = {
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
}, st = ["manual", "assisted", "autonomous"], xt = ["quick", "standard", "deep"], Lt = { trust: "assisted", depth: "standard" }, Xt = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, Yt = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Be({ color: t, children: r, title: o, onClick: s, active: l }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      title: o,
      onClick: s,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: t,
        background: `color-mix(in srgb, ${t} 14%, transparent)`,
        boxShadow: l ? `inset 0 0 0 1px color-mix(in srgb, ${t} 55%, transparent)` : "none",
        opacity: s && !l ? 0.85 : 1,
        cursor: s ? "pointer" : "default"
      },
      children: r
    }
  );
}
const Ft = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Ta({ steps: t, cardsByStage: r, onNodeClick: o }) {
  const s = Ae(null), l = Ae(null), p = Ae(0), u = Ae(null), i = Ae(t), c = Ae(r), g = Ae([]);
  i.current = t, c.current = r;
  const v = 3, E = 116, f = E / v, b = f - 26, [x, k] = w(880);
  Ee(() => {
    const A = l.current;
    if (!A) return;
    const I = new ResizeObserver((C) => {
      const B = Math.max(360, Math.floor(C[0].contentRect.width));
      k(B);
    });
    return I.observe(A), () => I.disconnect();
  }, []);
  const D = (A) => A.type === "gate" || A.id.startsWith("gate-");
  return Ee(() => {
    const A = s.current;
    if (!A) return;
    const I = Math.floor(x / v);
    A.width = I * v, A.height = f * v;
    const C = A.getContext("2d");
    if (!C) return;
    const B = (J, S, he, ye, ie) => {
      C.fillStyle = ie, C.fillRect(J * v, S * v, he * v, ye * v);
    }, X = () => {
      const J = p.current, S = i.current, he = c.current, ye = Math.max(1, S.length);
      Math.max(1, ...S.map((Q) => {
        var z;
        return ((z = he[Q.id]) == null ? void 0 : z.length) || 0;
      })), B(0, 0, I, b, "#0f172a");
      for (let Q = 0; Q < I / 5; Q++) {
        const z = Q * 37 % I, ee = Q * 13 % (b - 4);
        Math.sin(J * 0.03 + Q * 2.1) > 0.35 && B(z, ee, 1, 1, "#e2e8f0");
      }
      B(I - 26, 8, 10, 10, "#fde68a"), B(I - 24, 7, 8, 8, "#0f172a");
      for (let Q = 0; Q < I; Q += 16)
        for (let z = b; z < f; z += 16)
          B(Q, z, 16, 16, Q / 16 + z / 16 & 1 ? "#33261a" : "#2a1f14");
      B(0, b - 2, I, 2, "#4a3520");
      const ie = I / ye, me = [];
      for (let Q = 0; Q < S.length; Q++) {
        const z = S[Q], ee = Math.round(ie * (Q + 0.5)), Te = (he[z.id] || []).length, _e = Te > 0, _ = Ft[Q % Ft.length], U = D(z), te = b - 2;
        if (me.push({ x: ee - Math.floor(ie / 2), w: Math.floor(ie), id: z.id }), Q < S.length - 1) {
          const oe = Math.round(ie * (Q + 1.5));
          for (let Z = ee + 8; Z < oe - 8; Z += 4) B(Z, b - 1, 2, 1, "#4a3520");
        }
        if (U) {
          const oe = te - 20, Z = _e ? "#f39c12" : "#3a3222";
          B(ee - 3, oe, 6, 20, _e ? "#5c4a2a" : "#2a2418");
          for (let F = 0; F < 5; F++) B(ee - F, oe - 5 + F, F * 2 + 1, 1, Z);
          for (let F = 0; F < 5; F++) B(ee - (4 - F), oe - F, (4 - F) * 2 + 1, 1, Z);
          if (_e) {
            const F = (Math.sin(J * 0.08) + 1) / 2;
            C.globalAlpha = 0.35 + F * 0.4, B(ee - 1, oe - 6, 2, 2, "#ffd27a"), C.globalAlpha = 1;
          }
        } else {
          const oe = te - 14;
          if (B(ee - 10, oe, 20, 3, "#7a5c47"), B(ee - 10, oe - 1, 20, 1, _), B(ee - 9, oe + 3, 2, 8, "#5c4033"), B(ee + 7, oe + 3, 2, 8, "#5c4033"), B(ee - 5, oe - 9, 10, 9, "#333"), B(ee - 4, oe - 8, 8, 7, _e ? "#0a2a0a" : "#1a1a1a"), _e)
            for (let Z = 0; Z < 3; Z++) {
              const F = 2 + (J + Z * 7) % 5;
              B(ee - 3, oe - 7 + Z * 2, F, 0.8, "#33ff33");
            }
        }
        const we = Math.min(Te, 5);
        for (let oe = 0; oe < we; oe++) {
          const Z = we > 1 ? (oe - (we - 1) / 2) * 8 : 0, F = Math.round(ee + Z) - 3, ve = te - (U ? 2 : 4), O = Ft[(Q + oe) % Ft.length], ce = Math.sin(J * 0.08 + Q + oe) > 0 ? 1 : 0;
          C.fillStyle = "rgba(0,0,0,0.18)", C.fillRect(F * v, (ve + 8) * v, 6 * v, v), B(F, ve + ce, 6, 6, O), B(F + 1, ve - 4 + ce, 4, 4, "#fdd"), B(F + 1, ve - 5 + ce, 4, 1, "#333"), (J + Q * 9 + oe * 5) % 120 >= 3 && (B(F + 2, ve - 3 + ce, 1, 1, "#333"), B(F + 4, ve - 3 + ce, 1, 1, "#333")), B(F + 1, ve + 6, 1, 2, O), B(F + 4, ve + 6, 1, 2, O);
        }
        Te > 5 && (C.fillStyle = _, C.font = `${3 * v}px monospace`, C.fillText(`+${Te - 5}`, (ee + 10) * v, (te - 6) * v)), Te > 0 && (C.fillStyle = _, C.fillRect((ee + 6) * v, (te - 30) * v, 9 * v, 9 * v), C.fillStyle = "#0f172a", C.font = `bold ${5 * v}px monospace`, C.textAlign = "center", C.fillText(String(Te), (ee + 10.5) * v, (te - 24) * v), C.textAlign = "left"), C.fillStyle = _e ? "#e2e8f0" : "#6b7280", C.font = `${3.4 * v}px monospace`, C.textAlign = "center";
        const Oe = z.name.length > 12 ? z.name.slice(0, 11) + "…" : z.name;
        C.fillText(Oe, ee * v, (f - 4) * v), C.textAlign = "left";
      }
      g.current = me;
      const Se = S.reduce((Q, z) => {
        var ee;
        return Q + (((ee = he[z.id]) == null ? void 0 : ee.length) || 0);
      }, 0);
      C.fillStyle = "#f90", C.font = `bold ${3.6 * v}px monospace`, C.fillText(`${Se} card${Se !== 1 ? "s" : ""} · ${ye} milestone${ye !== 1 ? "s" : ""}`, 4 * v, 8 * v);
    }, y = () => {
      p.current++, X(), u.current = requestAnimationFrame(y);
    };
    return u.current = requestAnimationFrame(y), () => {
      u.current && cancelAnimationFrame(u.current);
    };
  }, [x, f, b]), /* @__PURE__ */ e("div", { ref: l, className: "w-full mb-5", children: /* @__PURE__ */ e(
    "canvas",
    {
      ref: s,
      onClick: (A) => {
        const I = s.current;
        if (!I) return;
        const C = I.getBoundingClientRect(), B = (A.clientX - C.left) / C.width * (I.width / v), X = g.current.find((y) => B >= y.x && B <= y.x + y.w);
        X && o(X.id);
      },
      style: {
        width: "100%",
        height: E + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function Ra({ active: t, onChange: r, counts: o }) {
  return /* @__PURE__ */ e(
    "div",
    {
      className: "flex gap-0.5 p-0.5 rounded-lg w-fit",
      style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" },
      children: [
        { id: "pipeline", label: "Pipeline" },
        { id: "workspace", label: "Workspace" },
        { id: "crew", label: "Crew" },
        { id: "status", label: "Status" }
      ].map((l) => {
        const p = t === l.id, u = o[l.id];
        return /* @__PURE__ */ a(
          "button",
          {
            onClick: () => r(l.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: p ? "var(--accent)" : "transparent",
              color: p ? "var(--bg)" : "var(--muted)"
            },
            children: [
              l.label,
              u > 0 && /* @__PURE__ */ e(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: p ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: p ? "var(--bg)" : "var(--muted)" },
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
function Me({ title: t, children: r }) {
  return /* @__PURE__ */ a("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ e("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: t }),
    r
  ] });
}
function et({ rows: t, empty: r = "None recorded" }) {
  return t.length ? /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: t.map((o) => /* @__PURE__ */ a("div", { className: "rounded-md px-2 py-1.5", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)" }, children: [
    /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-[11px]", children: [
      /* @__PURE__ */ e("span", { className: "font-medium min-w-0 break-words", style: { color: "var(--text)" }, children: o.title }),
      /* @__PURE__ */ a("span", { className: "ml-auto flex gap-1 flex-shrink-0", children: [
        o.level && /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: o.level === "required" ? "var(--warn)" : "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: o.level }),
        o.status && /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: /fail|block|open|pending/i.test(o.status) ? "var(--warn)" : "var(--ok)", background: "var(--bg-hover, var(--border))" }, children: o.status })
      ] })
    ] }),
    o.detail && /* @__PURE__ */ e("div", { className: "mt-0.5 text-[10px] break-words", style: { color: "var(--muted)" }, children: o.detail }),
    o.ref && (o.url ? /* @__PURE__ */ e("a", { href: o.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: o.ref }) : /* @__PURE__ */ e("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: o.ref }))
  ] }, o.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: r });
}
function Ne({ label: t, value: r, status: o }) {
  return /* @__PURE__ */ a("div", { className: "min-w-0", children: [
    /* @__PURE__ */ e("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: t }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-0.5 break-words", style: { color: tt(r) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      tt(r),
      o && /* @__PURE__ */ a("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        tt(o),
        ")"
      ] })
    ] })
  ] });
}
function Aa({ card: t, inspection: r, producerSession: o, onClose: s, onOpenProducer: l, onApprove: p, onReject: u, onInterject: i }) {
  const c = r.routing, g = () => {
    const v = window.prompt(`Why reject revision ${r.revision ?? "unknown"}?`);
    v != null && v.trim() && u && (u(v.trim()), s());
  };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (v) => {
        v.currentTarget === v.target && s();
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
                  onClick: s,
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
                !r.ready && /* @__PURE__ */ e("ul", { className: "mt-1.5 pl-4 list-disc text-[10px] space-y-0.5", style: { color: "var(--muted)" }, children: r.missing.map((v) => /* @__PURE__ */ e("li", { children: v }, v)) }),
                r.preferredShortfalls.length > 0 && /* @__PURE__ */ a("div", { className: "mt-2 text-[10px]", style: { color: "var(--muted)" }, children: [
                  "Preferred shortfalls (non-blocking): ",
                  r.preferredShortfalls.join(" · ")
                ] }),
                /* @__PURE__ */ e("div", { className: "text-[9px] mt-2", style: { color: "var(--muted)" }, children: "Inspection is read-only; deterministic runtime remains authoritative for movement and readiness enforcement." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ a(Me, { title: "Result summary", children: [
                  /* @__PURE__ */ e("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: r.summary ? "var(--text)" : "var(--warn)" }, children: r.summary || "No result summary was published." }),
                  /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ e(Ne, { label: "Envelope", value: r.envelopeId }),
                    /* @__PURE__ */ e(Ne, { label: "Created", value: r.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ e(Me, { title: "Changes since prior revision", children: /* @__PURE__ */ e(et, { rows: r.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ e(Me, { title: "Artifacts and evidence references", children: r.artifacts.length ? /* @__PURE__ */ e("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: r.artifacts.map((v) => /* @__PURE__ */ a("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ e("span", { className: "font-medium", style: { color: "var(--text)" }, children: v.label }),
                  v.kind && /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: v.kind })
                ] }),
                v.preview && /* @__PURE__ */ e("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: v.preview }),
                v.ref && (v.url ? /* @__PURE__ */ e("a", { href: v.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: v.ref }) : /* @__PURE__ */ e("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: v.ref }))
              ] }, v.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(Me, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ e(et, { rows: r.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ e(Me, { title: "Research and citations", children: /* @__PURE__ */ e(et, { rows: r.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(Me, { title: "Intent and requirement coverage", children: /* @__PURE__ */ e(et, { rows: r.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ e(Me, { title: "Omissions and deviations", children: /* @__PURE__ */ e(et, { rows: r.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ a(Me, { title: "Card topology and integration", children: [
                /* @__PURE__ */ a("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ e(Ne, { label: "Action", value: r.topology.action }),
                  /* @__PURE__ */ e(Ne, { label: "Integration owner", value: r.topology.integrationOwner }),
                  /* @__PURE__ */ e(Ne, { label: "Integration status", value: r.topology.integrationStatus }),
                  /* @__PURE__ */ e(Ne, { label: "Required children incomplete", value: r.topology.incompleteRequiredChildren.length })
                ] }),
                r.topology.children.length > 0 ? /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: r.topology.children.map((v) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: v.label }),
                  /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: v.required ? "var(--warn)" : "var(--muted)" }, children: v.required ? "required" : "optional" }),
                  /* @__PURE__ */ e("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(v.status) ? "var(--ok)" : "var(--warn)" }, children: v.status })
                ] }, v.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(Me, { title: "Budget consumption", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ e(Ne, { label: "Allocated", value: r.budget.allocated }),
                  /* @__PURE__ */ e(Ne, { label: "Consumed", value: r.budget.consumed }),
                  /* @__PURE__ */ e(Ne, { label: "Remaining", value: r.budget.remaining })
                ] }) }),
                /* @__PURE__ */ e(Me, { title: "Routing and runtime provenance", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ e(Ne, { label: "Assigned profile", value: c.assignedProfile }),
                  /* @__PURE__ */ e(Ne, { label: "Effective profile", value: c.effectiveProfile }),
                  /* @__PURE__ */ e(Ne, { label: "Model requested", value: c.model.requested }),
                  /* @__PURE__ */ e(Ne, { label: "Model applied", value: c.model.applied, status: c.model.status }),
                  /* @__PURE__ */ e(Ne, { label: "Provider / version", value: c.model.provider || c.model.version ? [c.model.provider, c.model.version].filter(Boolean) : null }),
                  /* @__PURE__ */ e(Ne, { label: "Effort requested", value: c.effort.requested }),
                  /* @__PURE__ */ e(Ne, { label: "Effort applied", value: c.effort.applied, status: c.effort.status }),
                  /* @__PURE__ */ e(Ne, { label: "Tools available", value: c.tools.actual, status: c.tools.status }),
                  /* @__PURE__ */ e(Ne, { label: "Skills available", value: c.skills.actual, status: c.skills.status }),
                  /* @__PURE__ */ e(Ne, { label: "Network scope", value: c.network.actual, status: c.network.status }),
                  /* @__PURE__ */ e(Ne, { label: "Write scope", value: c.write.actual, status: c.write.status }),
                  /* @__PURE__ */ e(Ne, { label: "Worktree / branch", value: c.worktree })
                ] }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ e(Me, { title: "Validation and evidence", children: /* @__PURE__ */ e(et, { rows: r.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ e(Me, { title: "Known risks", children: /* @__PURE__ */ e(et, { rows: r.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ e(Me, { title: "Open decisions and questions", children: /* @__PURE__ */ e(et, { rows: r.decisions, empty: "No open decisions recorded" }) })
              ] })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex items-center gap-2 flex-wrap", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              p && /* @__PURE__ */ a("button", { onClick: () => {
                p(), s();
              }, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--ok)", color: "var(--bg)" }, children: [
                "Approve",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              u && /* @__PURE__ */ a("button", { onClick: g, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--danger)", color: "var(--bg)" }, children: [
                "Reject",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              i && /* @__PURE__ */ e("button", { onClick: i, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: "Interject on this revision" }),
              o && l && /* @__PURE__ */ a("button", { onClick: l, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: [
                "Open producer · ",
                o.step
              ] }),
              /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: r.producerSessionRef || "producer session reference unobservable" })
            ] })
          ]
        }
      )
    }
  );
}
function ja({ card: t, openChat: r }) {
  const o = t.bootstrap, s = t.intent_contract || t.intent;
  if (!o && !s) return null;
  const l = `pipeline ${t.pipeline_id || ""} card ${t.id} (${t.title})`, p = (g, v) => /* @__PURE__ */ e(
    "button",
    {
      className: "text-[10px] px-2 py-0.5 rounded hover:opacity-80",
      style: { color: "var(--accent)", border: "1px solid var(--border)" },
      title: "Opens /dlc-yolo with this context — nothing is created in the browser",
      onClick: () => r({ message: `/dlc-yolo ${g} for ${l}` }),
      children: v
    }
  ), u = o ? String(o.status || "not-run") : "n/a", i = Array.isArray(o == null ? void 0 : o.crews_created) ? o.crews_created : [], c = Array.isArray(o == null ? void 0 : o.issues_opened) ? o.issues_opened : [];
  return /* @__PURE__ */ a("div", { className: "mt-2 pt-2", style: { borderTop: "1px dashed var(--border)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: "🌱 self-enablement" }),
    /* @__PURE__ */ a("div", { className: "flex flex-col gap-1 text-[10px]", children: [
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: "① setup" }),
        /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: String(t.self_enable_mode || "default") })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: "② intent" }),
        /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: s ? String(s.classification || s.status || "present") : "not run" }),
        p("resolve intent", "Resolve intent"),
        p("skip intent", "Skip intent")
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: "③ per-step" }),
        p(`elaborate step ${t.stage}`, "Elaborate step")
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: "④ bootstrap" }),
        /* @__PURE__ */ e("span", { style: { color: u === "done" ? "var(--ok)" : "var(--muted)" }, children: u }),
        i.length > 0 && /* @__PURE__ */ a("span", { style: { color: "var(--muted)" }, children: [
          "· crews ",
          i.length
        ] }),
        c.length > 0 && /* @__PURE__ */ a("span", { style: { color: "var(--muted)" }, children: [
          "· issues ",
          c.length
        ] }),
        o != null && o.blocking_reason ? /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
          "· ",
          String(o.blocking_reason)
        ] }) : null,
        p("resume bootstrap", "Resume bootstrap")
      ] }),
      u === "done" && /* @__PURE__ */ e("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "Replaying bootstrap is idempotent intent, not a promise." })
    ] })
  ] });
}
function Ea({ cards: t, schedulerState: r, statePath: o, readAppFile: s, onClose: l }) {
  const p = Ce(() => fa(t, r), [t, r]), [u, i] = w(Gt(null)), [c, g] = w([]), [v, E] = w([]);
  Ee(() => {
    const x = `${o.replace(/\/state\.json$/, "")}/workspaces/default/data/ledger/projections/status.json`;
    let k = !1;
    return s(x).then((D) => {
      if (!k)
        try {
          i(Gt(JSON.parse(D.content || "null")));
        } catch {
          i(Gt(null));
        }
    }).catch(() => {
      k || i(Gt(null));
    }), () => {
      k = !0;
    };
  }, [o, s]), Ee(() => {
    const b = [], x = [];
    for (const k of t) {
      const D = k.step_sessions;
      if (D) for (const [A, I] of Object.entries(D)) b.push({ card: k.id, step: A, slot: I == null ? void 0 : I.slot_key });
      const q = k.worktree_lease;
      q && x.push({ card: k.id, branch: q.branch, status: q.status });
    }
    g(b.slice(0, 60)), E(x.slice(0, 60));
  }, [t]);
  const f = ({ title: b, children: x }) => /* @__PURE__ */ a("div", { className: "mb-4", children: [
    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: b }),
    x
  ] });
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
      onMouseDown: (b) => {
        b.currentTarget === b.target && l();
      },
      children: /* @__PURE__ */ a(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Operations",
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(760px, calc(100vw - 32px))", maxHeight: "min(88vh, 880px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ a("header", { className: "px-5 py-3 flex items-center gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ e("h2", { className: "text-[15px] font-semibold flex-1", style: { color: "var(--text-strong, var(--text))" }, children: "🛠 Operations" }),
              /* @__PURE__ */ e("button", { onClick: l, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ a("div", { className: "px-5 py-3 overflow-y-auto text-[11px]", children: [
              /* @__PURE__ */ a(f, { title: "Runtime / scheduler", children: [
                /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2", children: $r.map((b) => /* @__PURE__ */ a("span", { className: "px-2 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: p.counts[b] ? "var(--text)" : "var(--muted)" }, children: [
                  b,
                  " ",
                  p.counts[b]
                ] }, b)) }),
                p.waitReasons.length > 0 && /* @__PURE__ */ e("div", { className: "mt-2", children: p.waitReasons.map((b, x) => /* @__PURE__ */ a("div", { style: { color: "var(--muted)" }, children: [
                  "⛔ ",
                  b.card,
                  ": ",
                  b.reason
                ] }, x)) })
              ] }),
              /* @__PURE__ */ e(f, { title: "Projection parity", children: u.available ? /* @__PURE__ */ a("div", { children: [
                /* @__PURE__ */ a("div", { style: { color: u.verified ? "var(--ok)" : "var(--warn)" }, children: [
                  u.label,
                  " · authority ",
                  u.authority_active ? "active" : "inactive"
                ] }),
                u.digest_match !== null && /* @__PURE__ */ a("div", { style: { color: "var(--muted)" }, children: [
                  "digest match: ",
                  String(u.digest_match)
                ] }),
                u.failure_code && /* @__PURE__ */ a("div", { style: { color: "var(--warn)" }, children: [
                  "failure: ",
                  u.failure_code
                ] }),
                /* @__PURE__ */ e("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "last-known-good runs.json preserved when blocked" })
              ] }) : /* @__PURE__ */ e("div", { style: { color: "var(--muted)" }, children: "unavailable" }) }),
              /* @__PURE__ */ e(f, { title: "Webhook", children: /* @__PURE__ */ e(Nr, {}) }),
              /* @__PURE__ */ a(f, { title: "Sessions & worktrees", children: [
                /* @__PURE__ */ a("div", { className: "mb-1", style: { color: "var(--muted)" }, children: [
                  c.length,
                  " session(s) · ",
                  v.length,
                  " lease(s)"
                ] }),
                c.slice(0, 12).map((b, x) => /* @__PURE__ */ a("div", { style: { color: "var(--text)" }, children: [
                  b.card,
                  " · ",
                  b.step,
                  b.slot ? ` · ${b.slot}` : ""
                ] }, x)),
                v.slice(0, 12).map((b, x) => /* @__PURE__ */ a("div", { style: { color: "var(--muted)" }, children: [
                  "🌿 ",
                  b.card,
                  " · ",
                  b.branch || "—",
                  " · ",
                  b.status || "—"
                ] }, `l${x}`))
              ] })
            ] })
          ]
        }
      )
    }
  );
}
function ue(t, r) {
  return r == null || r === "" ? null : /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px] py-0.5", children: [
    /* @__PURE__ */ e("span", { className: "flex-shrink-0", style: { color: "var(--muted)", minWidth: "110px" }, children: t }),
    /* @__PURE__ */ e("span", { className: "min-w-0 break-words", style: { color: "var(--text)" }, children: String(r) })
  ] });
}
function br(t) {
  return typeof t == "string" && /^https?:\/\//i.test(t);
}
function Oa({ card: t, cardStatus: r, effectiveCapability: o, onClose: s }) {
  var E, f, b;
  const [l, p] = w("overview"), u = [
    ["overview", "Overview"],
    ["results", "Results"],
    ["history", "Decisions & history"],
    ["execution", "Execution"]
  ], i = t.execution_schedule, c = i != null && i.current_node_id ? (E = i == null ? void 0 : i.nodes) == null ? void 0 : E[i.current_node_id] : void 0, g = t.worktree_lease, v = t.topology;
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (x) => {
        x.currentTarget === x.target && s();
      },
      children: /* @__PURE__ */ a(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Card details",
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(760px, calc(100vw - 32px))", maxHeight: "min(88vh, 860px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ a("header", { className: "px-5 py-3 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ e("div", { className: "text-[14px] font-semibold truncate", style: { color: "var(--text-strong, var(--text))" }, children: t.title }),
                /* @__PURE__ */ a("div", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: [
                  t.stage,
                  " · ",
                  r.label
                ] })
              ] }),
              /* @__PURE__ */ e("button", { onClick: s, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ e("nav", { className: "flex gap-1 px-3 pt-2", style: { borderBottom: "1px solid var(--border)" }, children: u.map(([x, k]) => /* @__PURE__ */ e(
              "button",
              {
                onClick: () => p(x),
                className: "text-[11px] px-2.5 py-1 rounded-t-md",
                style: {
                  color: l === x ? "var(--accent)" : "var(--muted)",
                  borderBottom: l === x ? "2px solid var(--accent)" : "2px solid transparent"
                },
                children: k
              },
              x
            )) }),
            /* @__PURE__ */ a("div", { className: "px-5 py-3 overflow-y-auto text-[11px]", children: [
              l === "overview" && /* @__PURE__ */ a("div", { children: [
                (f = t.source) != null && f.url && br(t.source.url) ? ue("source", null) || /* @__PURE__ */ a("div", { className: "text-[11px] py-0.5", children: [
                  /* @__PURE__ */ e("span", { style: { color: "var(--muted)", minWidth: 110, display: "inline-block" }, children: "source" }),
                  /* @__PURE__ */ a("a", { href: t.source.url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: [
                    t.source.repo,
                    t.source.issue ? `#${t.source.issue}` : ""
                  ] })
                ] }) : ue("source", (b = t.source) == null ? void 0 : b.repo),
                ue("pipeline", t.pipeline_id),
                ue("workspace", t.workspace),
                ue("stage", t.stage),
                ue("lifecycle", t.lifecycle),
                ue("SoT", t.sot),
                ue("status", `${r.label}${r.reason ? ` — ${r.reason}` : ""}`),
                ue("trust", t.trust ? `${t.trust} (override)` : "inherited"),
                ue("depth", t.depth ? `${t.depth} (override)` : "inherited"),
                ue("capability", o),
                ue("effort", t.effort ? JSON.stringify(t.effort) : null),
                ue("writes_allowed", t.writes_allowed === !1 ? "false (cancel requested)" : null)
              ] }),
              l === "results" && /* @__PURE__ */ a("div", { children: [
                Object.entries(t.step_summaries || {}).map(([x, k]) => /* @__PURE__ */ a("div", { className: "mb-2", children: [
                  /* @__PURE__ */ a("div", { className: "font-medium", style: { color: "var(--text)" }, children: [
                    x,
                    ": ",
                    (k == null ? void 0 : k.headline) || "—"
                  ] }),
                  (k == null ? void 0 : k.description) && /* @__PURE__ */ e("div", { style: { color: "var(--muted)" }, children: k.description }),
                  (k == null ? void 0 : k.executor) && /* @__PURE__ */ a("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: [
                    "executor ",
                    k.executor
                  ] })
                ] }, x)),
                Object.entries(t.artifacts || {}).map(([x, k]) => /* @__PURE__ */ e("div", { className: "py-0.5", children: br(k) ? /* @__PURE__ */ e("a", { href: k, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: x }) : /* @__PURE__ */ a("span", { style: { color: "var(--text)" }, children: [
                  x,
                  ": ",
                  /* @__PURE__ */ e("code", { style: { color: "var(--muted)" }, children: String(k) })
                ] }) }, x)),
                !t.step_summaries && !t.artifacts && /* @__PURE__ */ e("div", { style: { color: "var(--muted)" }, children: "No results recorded." })
              ] }),
              l === "history" && /* @__PURE__ */ a("div", { children: [
                /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mt-1 mb-1", style: { color: "var(--muted)" }, children: "Decisions" }),
                (t.decisions || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--text)" }, children: [
                  String(x.status) === "open" ? "🔴 " : "✓ ",
                  String(x.kind),
                  " — ",
                  String(x.question || x.chosen || x.action || "")
                ] }, k)),
                /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Stage history" }),
                (t.history || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                  String(x.from),
                  " → ",
                  String(x.to),
                  " · ",
                  String(x.agent || ""),
                  " · ",
                  String(x.at || "")
                ] }, k)),
                (t.gate_history || []).length > 0 && /* @__PURE__ */ a(ze, { children: [
                  /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Gates" }),
                  (t.gate_history || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.decision),
                    " ",
                    String(x.gate),
                    " · ",
                    String(x.actor || "")
                  ] }, k))
                ] }),
                (t.interjection || []).length > 0 && /* @__PURE__ */ a(ze, { children: [
                  /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Requests / interjections" }),
                  (t.interjection || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.kind),
                    " · ",
                    String(x.status),
                    x.reason ? ` (${String(x.reason)})` : ""
                  ] }, k))
                ] })
              ] }),
              l === "execution" && /* @__PURE__ */ a("div", { children: [
                ue("current node", i == null ? void 0 : i.current_node_id),
                ue("node status", c == null ? void 0 : c.status),
                ue("permit", c == null ? void 0 : c.permit_id),
                ue("concurrency class", c == null ? void 0 : c.concurrency_class),
                ue("model (requested)", t.model_request),
                ue("model (applied)", t.model_applied),
                v && /* @__PURE__ */ a(ze, { children: [
                  ue("topology", v.action),
                  ue("integration owner", v.integration_owner),
                  ue("children", Array.isArray(v.children) ? `${v.children.length}` : null)
                ] }),
                g && /* @__PURE__ */ a(ze, { children: [
                  ue("worktree branch", g.branch),
                  ue("lease status", g.status),
                  ue("lease locked", g.locked ? "true" : null)
                ] }),
                ue("cancel requested", t.cancel_requested_at),
                t.writes_allowed === !1 && ue("terminal observed", "pending (cooperative cancel in progress)")
              ] })
            ] }),
            /* @__PURE__ */ e("footer", { className: "px-5 py-2 text-[9px]", style: { borderTop: "1px solid var(--border)", color: "var(--muted)" }, children: "Read-only view. Use 🔧 maintain to request changes; gate actions use the gate controls." })
          ]
        }
      )
    }
  );
}
function La({ onRequest: t }) {
  const [r, o] = w(!1), s = (l) => {
    const p = rr[l];
    let u = "";
    if (p.reasonRequired) {
      const i = window.prompt(p.confirm);
      if (!i || !i.trim()) return;
      u = i.trim();
    } else if (!window.confirm(p.confirm))
      return;
    t(l, u), o(!1);
  };
  return /* @__PURE__ */ a("div", { className: "relative inline-block", children: [
    /* @__PURE__ */ e(
      "button",
      {
        className: "text-[10px] hover:underline",
        style: { color: "var(--muted)" },
        title: "Request re-spec / retry / back-step / park / cancel",
        onClick: () => o((l) => !l),
        children: "🔧 maintain"
      }
    ),
    r && /* @__PURE__ */ e(
      "div",
      {
        className: "absolute z-20 mt-1 rounded-md py-1 text-[11px]",
        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 8px 28px rgba(0,0,0,0.4)", minWidth: "120px" },
        children: Object.entries(rr).map(([l, p]) => /* @__PURE__ */ e(
          "button",
          {
            className: "block w-full text-left px-3 py-1 hover:opacity-80",
            style: { color: l === "request:cancel" ? "var(--danger, #e66)" : "var(--text)" },
            onClick: () => s(l),
            children: p.label
          },
          l
        ))
      }
    )
  ] });
}
function gt({ card: t, config: r, isGate: o, cardStatus: s, effectiveCapability: l, producerStep: p, producerSession: u, onOpenProducer: i, onApprove: c, onReject: g, onCycleTrust: v, onCycleDepth: E, onSetBudget: f, onInterject: b, onResolveDecision: x, onOpenOrchestrator: k, liveView: D, allCards: q, onOpenCard: A, onRequest: I, onOpenStepSession: C, onCancelCard: B }) {
  var O, ce, Le, rt, ae, lt, pe;
  const X = o ? "var(--warn)" : s.kind === "idle" ? "var(--border-strong, var(--border))" : s.color, y = t.trust || r.trust, J = t.depth || r.depth, S = ((O = t.parked) == null ? void 0 : O.length) || 0, he = Object.values(t.step_sessions || {}).some(
    ($) => !!$.last_response_at && !$.chat_disabled_at && !$.superseded && (!$.last_response_handled_at || $.last_response_handled_at < $.last_response_at)
  ), [ye, ie] = w(!1), [me, Se] = w(""), [Q, z] = w(!1), [ee, $e] = w(!1), [Te, _e] = w(!1), { openChat: _ } = fr(), U = Ce(() => sa(t), [t]), te = Ce(() => ia(t, q || []), [t, q]), we = Ce(() => ca(t), [t]), Oe = Ce(() => {
    if (!we) return null;
    const $ = (q || []).find((W) => W.id === we);
    return $ ? { id: $.id, title: $.title } : null;
  }, [we, q]), oe = U.length > 0 || te.length > 0 || !!Oe, Z = Ce(
    () => o ? Vr(t, p) : null,
    [t, o, p]
  ), F = () => {
    const $ = window.prompt(`Why reject revision ${(Z == null ? void 0 : Z.revision) ?? "unknown"}?`);
    $ != null && $.trim() && g && g($.trim());
  }, ve = (t.decisions || []).filter(($) => !$.chosen && !$.resolved_at && (!!$.action || !!$.options));
  return /* @__PURE__ */ a(
    "div",
    {
      id: `card-${t.id}`,
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${X}`
      },
      children: [
        (() => {
          const $ = (C || []).find((W) => W.step === t.stage);
          return $ ? /* @__PURE__ */ a(
            "button",
            {
              onClick: () => $.open(),
              className: "text-[13px] font-medium leading-snug truncate text-left w-full hover:underline inline-flex items-center gap-1 group",
              title: `Open the ${t.stage} step session`,
              style: { color: "var(--text-strong, var(--text))", cursor: "pointer" },
              children: [
                /* @__PURE__ */ e("span", { className: "truncate", children: t.title }),
                /* @__PURE__ */ e("span", { className: "opacity-40 group-hover:opacity-100 flex-shrink-0", style: { color: "var(--accent)" }, "aria-hidden": "true", children: "↗" })
              ]
            }
          ) : /* @__PURE__ */ e("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: t.title });
        })(),
        ((ce = t.source) == null ? void 0 : ce.repo) && /* @__PURE__ */ a(
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
          var W;
          const $ = (W = t.step_summaries) == null ? void 0 : W[t.stage];
          return $ != null && $.headline ? /* @__PURE__ */ a("div", { className: "mt-1 flex items-start gap-1 text-[11px] leading-snug", title: $.description || $.headline, children: [
            $.needs_human ? /* @__PURE__ */ e("span", { "aria-label": "needs you", title: "Needs you", style: { color: "var(--warn)" }, children: "🔴" }) : /* @__PURE__ */ e("span", { "aria-hidden": "true", style: { color: "var(--muted)" }, children: "•" }),
            /* @__PURE__ */ e("span", { className: "truncate", style: { color: $.needs_human ? "var(--warn)" : "var(--text)" }, children: $.headline })
          ] }) : null;
        })(),
        /* @__PURE__ */ a("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ e("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "⚙ modes" }),
          /* @__PURE__ */ a(
            Be,
            {
              color: Xt[y],
              active: !!t.trust,
              onClick: v,
              title: `trust: ${y}${t.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🛡 ",
                y
              ]
            }
          ),
          /* @__PURE__ */ a(
            Be,
            {
              color: Yt[J],
              active: !!t.depth,
              onClick: E,
              title: `depth: ${J}${t.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🔬 ",
                J
              ]
            }
          ),
          /* @__PURE__ */ a(
            Be,
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
            /* @__PURE__ */ e(aa, { budget: t.budget, depth: J, onSave: f })
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
                Be,
                {
                  color: s.color,
                  active: s.kind !== "idle",
                  title: `${s.label}${s.reason ? ` — ${s.reason}` : ""}`,
                  children: s.label
                }
              ),
              /* @__PURE__ */ a(
                Be,
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
              t.lifecycle && /* @__PURE__ */ a(Be, { color: "var(--muted)", title: `card lifecycle: ${t.lifecycle}`, children: [
                "🔄 ",
                t.lifecycle
              ] }),
              S > 0 && /* @__PURE__ */ a(Be, { color: "var(--warn)", title: `${S} parked idea(s)`, children: [
                "⏸ ",
                S
              ] }),
              he && /* @__PURE__ */ e(Be, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
              typeof ((Le = t.effort) == null ? void 0 : Le.total) == "number" && t.effort.total > 0 && /* @__PURE__ */ a(Be, { color: "var(--info)", title: `estimated effort: ${t.effort.total} points`, children: [
                "⚡ ",
                t.effort.total
              ] }),
              t.backstep_history && t.backstep_history.length > 0 && /* @__PURE__ */ a(
                Be,
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
                const $ = t.decisions[t.decisions.length - 1];
                return /* @__PURE__ */ a(
                  Be,
                  {
                    color: "var(--accent)",
                    title: `${t.decisions.length} decision${t.decisions.length === 1 ? "" : "s"} — last: ${$.question || $.kind || ""}${$.action ? ` → ${$.action}` : ""}${$.rationale ? `
${$.rationale}` : ""}`,
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
        o && Z && /* @__PURE__ */ a(
          "div",
          {
            "data-gate-inspection-summary": !0,
            className: "mt-2.5 rounded-md p-2",
            style: { background: Z.ready ? "color-mix(in srgb, var(--ok) 7%, transparent)" : "color-mix(in srgb, var(--warn) 7%, transparent)", border: `1px solid color-mix(in srgb, ${Z.ready ? "var(--ok)" : "var(--warn)"} 32%, var(--border))` },
            children: [
              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
                /* @__PURE__ */ e("span", { className: "font-semibold", style: { color: Z.ready ? "var(--ok)" : "var(--warn)" }, children: Z.ready ? "Review-ready" : "Not review-ready" }),
                /* @__PURE__ */ a("span", { className: "ml-auto", style: { color: "var(--muted)" }, children: [
                  "r",
                  Z.revision ?? "?"
                ] }),
                /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: Z.reviewStatus })
              ] }),
              /* @__PURE__ */ e("div", { className: "mt-1 text-[11px] leading-snug overflow-hidden", style: { color: Z.summary ? "var(--text)" : "var(--warn)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: Z.summary || "No review bundle summary published." }),
              !Z.ready && /* @__PURE__ */ a("div", { className: "mt-1 text-[9px]", style: { color: "var(--muted)" }, children: [
                Z.missing.length,
                " readiness gap",
                Z.missing.length === 1 ? "" : "s"
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
        o && c && g && /* @__PURE__ */ a("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          (() => {
            const $ = (t.gate_commands || []).filter((Fe) => Fe.gate === t.stage), W = $.length ? $[$.length - 1] : void 0, ke = (W == null ? void 0 : W.status) === "pending", Xe = (W == null ? void 0 : W.status) === "rejected", De = (W == null ? void 0 : W.status) === "applied" || (W == null ? void 0 : W.status) === "approved";
            return /* @__PURE__ */ a(ze, { children: [
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: ke,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--ok)", color: "var(--bg)" },
                  onClick: c,
                  title: ke ? "A gate command is being processed…" : "Approve this gate",
                  children: [
                    ke && (W == null ? void 0 : W.action) === "approve" && /* @__PURE__ */ e(ft, { size: 10 }),
                    ke && (W == null ? void 0 : W.action) === "approve" ? "Approving…" : "✓ Approve"
                  ]
                }
              ),
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: ke,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--danger)", color: "var(--bg)" },
                  onClick: F,
                  children: [
                    ke && (W == null ? void 0 : W.action) === "reject" && /* @__PURE__ */ e(ft, { size: 10 }),
                    ke && (W == null ? void 0 : W.action) === "reject" ? "Rejecting…" : "✕ Reject"
                  ]
                }
              ),
              ke && /* @__PURE__ */ a("span", { className: "text-[10px] inline-flex items-center gap-1", style: { color: "var(--muted)" }, children: [
                /* @__PURE__ */ e(ft, { size: 10 }),
                " ",
                W == null ? void 0 : W.action,
                " sent — runtime processing…"
              ] }),
              Xe && /* @__PURE__ */ a(
                "span",
                {
                  className: "text-[10px]",
                  style: { color: "var(--danger)" },
                  title: (W == null ? void 0 : W.rejection_reason) || "rejected",
                  children: [
                    "⚠ ",
                    W == null ? void 0 : W.action,
                    " rejected: ",
                    (W == null ? void 0 : W.rejection_reason) || "see gate result"
                  ]
                }
              ),
              De && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--ok)" }, children: [
                "✓ ",
                W == null ? void 0 : W.action,
                " applied"
              ] })
            ] });
          })(),
          u && i && /* @__PURE__ */ a(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
              style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
              onClick: i,
              title: `Open the ${u.step} producer session${u.retained ? " (held for this gate)" : ""}`,
              children: [
                /* @__PURE__ */ e("span", { "aria-hidden": "true", children: "↗" }),
                "Open producer · ",
                u.step
              ]
            }
          ),
          (t.stage === "gate-review" || /review/i.test(t.stage || "")) && (() => {
            var De, Fe, qe;
            const $ = (De = t.source) == null ? void 0 : De.repo;
            if (!$) return null;
            const W = (Fe = t.artifacts) == null ? void 0 : Fe.pr_url, ke = W && ((qe = /\/pull\/(\d+)/.exec(W)) == null ? void 0 : qe[1]), Xe = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + $)}` + (ke ? `&pr=${ke}` : "");
            return /* @__PURE__ */ a(
              "a",
              {
                href: Xe,
                title: W ? `Deep-review PR #${ke} in Code Review Sage` : `Open Code Review Sage for ${$}`,
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
        x && ve.map(($) => /* @__PURE__ */ a(
          "div",
          {
            className: "mt-2 p-1.5 rounded-md text-[11px]",
            style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
            children: [
              /* @__PURE__ */ a("div", { style: { color: "var(--text, var(--muted))" }, children: [
                "⚖ ",
                $.question || $.kind
              ] }),
              /* @__PURE__ */ a("div", { className: "mt-1 text-[10px]", style: { color: "var(--muted)" }, children: [
                "This records acknowledgement only; it does not enact ",
                $.action || "the proposed pipeline change",
                "."
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  className: "mt-1 px-2 py-0.5 rounded font-semibold",
                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                  onClick: () => x($.id),
                  children: "Acknowledge & continue"
                }
              )
            ]
          },
          $.id
        )),
        D && /* @__PURE__ */ e(Ga, { live: D }),
        /* @__PURE__ */ e(ja, { card: t, openChat: _ }),
        (b || k || C && C.length || B) && /* @__PURE__ */ a(
          "div",
          {
            className: "mt-2 flex items-center gap-2 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[9px] uppercase tracking-wider select-none", style: { color: "var(--muted)" }, children: "⚡ actions" }),
              b && (ye ? /* @__PURE__ */ a("div", { className: "w-full flex flex-col gap-1", children: [
                /* @__PURE__ */ e(
                  "textarea",
                  {
                    value: me,
                    onChange: ($) => Se($.target.value),
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
                        me.trim() && (b("note", me.trim()), Se(""), ie(!1));
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
                        ie(!1), Se("");
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
                  onClick: () => ie(!0),
                  children: "✏️ interject"
                }
              )),
              k && /* @__PURE__ */ e(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: (rt = t.orchestrator_session) != null && rt.slot_key || (ae = t.orchestrator_session) != null && ae.session_key ? "Open this pipeline’s orchestrator session" : "Trigger an inspectable orchestrator session for this card",
                  onClick: () => k(),
                  children: (lt = t.orchestrator_session) != null && lt.slot_key || (pe = t.orchestrator_session) != null && pe.session_key ? "⚙ open orchestrator" : "⚙ orchestrator"
                }
              ),
              oe && /* @__PURE__ */ a(
                "button",
                {
                  className: "text-[10px] hover:underline inline-flex items-center gap-0.5",
                  style: { color: "var(--muted)" },
                  title: "Card timeline — the ordered story of what happened",
                  onClick: () => $e(!0),
                  children: [
                    "📜 timeline",
                    U.some(($) => $.needs_human) ? " 🔴" : "",
                    te.length > 0 ? ` 🌿${te.length}` : ""
                  ]
                }
              ),
              I && /* @__PURE__ */ e(La, { onRequest: I }),
              (C || []).map(($) => /* @__PURE__ */ a(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--accent)" },
                  title: `Open the ${$.step} step session`,
                  onClick: () => $.open(),
                  children: [
                    "⚙ ",
                    $.step
                  ]
                },
                $.step
              )),
              B && !["cancelled", "canceled", "retired", "merged"].includes(String(t.lifecycle || "")) && /* @__PURE__ */ e(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--danger, #e66)" },
                  title: "Cancel this card (cooperative — revokes writes, retains worktree until terminal)",
                  onClick: () => B(),
                  children: "⏹ cancel"
                }
              ),
              /* @__PURE__ */ e(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: "Card details (read-only)",
                  onClick: () => _e(!0),
                  children: "🔍 details"
                }
              )
            ]
          }
        ),
        ee && /* @__PURE__ */ e(
          Ka,
          {
            card: t,
            events: U,
            children: te,
            parent: Oe,
            onOpenCard: A,
            onClose: () => $e(!1)
          }
        ),
        Te && /* @__PURE__ */ e(
          Oa,
          {
            card: t,
            cardStatus: s,
            effectiveCapability: String(l),
            onClose: () => _e(!1)
          }
        ),
        Q && Z && /* @__PURE__ */ e(
          Aa,
          {
            card: t,
            inspection: Z,
            producerSession: u,
            onClose: () => z(!1),
            onOpenProducer: i,
            onApprove: c,
            onReject: g,
            onInterject: b ? () => {
              z(!1), ie(!0);
            } : void 0
          }
        )
      ]
    }
  );
}
function bt({ title: t, count: r, children: o, id: s }) {
  return /* @__PURE__ */ a("div", { id: s, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
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
    ) : o })
  ] });
}
function qa({ config: t, onSet: r }) {
  function o({ label: s, value: l, options: p, tokens: u, onPick: i }) {
    return /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: s }),
      /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: p.map((c) => {
        const g = l === c;
        return /* @__PURE__ */ e(
          "button",
          {
            onClick: () => i(c),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: g ? u[c] : "var(--muted)",
              background: g ? `color-mix(in srgb, ${u[c]} 16%, transparent)` : "transparent",
              boxShadow: g ? `inset 0 0 0 1px color-mix(in srgb, ${u[c]} 45%, transparent)` : "none"
            },
            children: c
          },
          c
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
        /* @__PURE__ */ e(o, { label: "Trust", value: t.trust, options: st, tokens: Xt, onPick: (s) => r({ trust: s }) }),
        /* @__PURE__ */ e(o, { label: "Depth", value: t.depth, options: xt, tokens: Yt, onPick: (s) => r({ depth: s }) }),
        /* @__PURE__ */ e("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
const Ia = {
  "step-completed": "var(--ok)",
  completed: "var(--ok)",
  "step-running": "var(--info)",
  "step-blocked": "var(--warn)",
  blocked: "var(--warn)",
  errored: "var(--danger, #e66)",
  "decision-open": "var(--warn)",
  "decision-resolved": "var(--accent)",
  "gate-approved": "var(--ok)",
  "gate-rejected": "var(--danger, #e66)",
  promoted: "var(--muted)"
};
function Ma({ pipeline: t, cards: r, extras: o, onOpenCard: s }) {
  const { events: l, actors: p, now: u } = Ce(
    () => ma(t, r, o),
    [t, r, o]
  );
  return t ? l.length === 0 ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "No recorded events for this pipeline yet." }) : /* @__PURE__ */ a("div", { className: "w-full overflow-x-auto pb-4", children: [
    u && /* @__PURE__ */ a("div", { className: "text-[10px] mb-2 flex flex-wrap gap-2", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ e("span", { children: "now:" }),
      /* @__PURE__ */ a("span", { children: [
        "▶ running ",
        (u.running_node_ids || []).length
      ] }),
      /* @__PURE__ */ a("span", { children: [
        "◷ ready ",
        (u.ready_node_ids || []).length
      ] }),
      /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
        "⛔ blocked ",
        (u.blocked_node_ids || []).length
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "text-[10px] mb-2 flex flex-wrap gap-3", style: { color: "var(--muted)" }, children: p.map((i) => /* @__PURE__ */ a("span", { children: [
      Sr[i] || "•",
      " ",
      i
    ] }, i)) }),
    /* @__PURE__ */ e("ol", { className: "flex flex-col gap-1.5", style: { borderLeft: "1px solid var(--border)", paddingLeft: "10px" }, children: l.map((i) => {
      const c = Ia[i.kind] || "var(--text)";
      return /* @__PURE__ */ a("li", { className: "flex items-start gap-2 text-[11px]", children: [
        /* @__PURE__ */ e("span", { className: "text-[9px] flex-shrink-0 mt-0.5 tabular-nums", style: { color: "var(--muted)", minWidth: "62px" }, children: i.at ? i.at.replace("T", " ").replace("Z", "").slice(5) : "" }),
        /* @__PURE__ */ e("span", { "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", title: i.actor, children: i.glyph }),
        /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ a(
            "button",
            {
              className: "text-left hover:underline",
              onClick: () => i.cardId && (s == null ? void 0 : s(i.cardId)),
              title: i.cardId ? "Open card" : void 0,
              style: { color: c },
              children: [
                i.headline,
                i.inferred && /* @__PURE__ */ e("span", { className: "ml-1 text-[8px] px-1 rounded-full", style: { color: "var(--muted)", border: "1px solid var(--border)" }, children: "~inferred" }),
                i.needs_human && /* @__PURE__ */ e("span", { className: "ml-1", children: "🔴" })
              ]
            }
          ),
          i.detail && /* @__PURE__ */ a("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: [
            i.detail,
            i.cardId ? ` · ${i.cardId}` : ""
          ] })
        ] })
      ] }, i.id);
    }) })
  ] }) : /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "No pipeline selected." });
}
function Da({ cards: t }) {
  const r = t.flatMap(
    (o) => (o.parked || []).map((s) => {
      var l;
      return { ...s, cardTitle: o.title, repo: (l = o.source) == null ? void 0 : l.repo };
    })
  ).sort((o, s) => (s.at || "").localeCompare(o.at || ""));
  return r.length === 0 ? /* @__PURE__ */ a("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ a("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ e("div", { className: "flex flex-col gap-2 max-w-2xl", children: r.map((o) => /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: o.note }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ a("span", { children: [
        "from ",
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: o.cardTitle })
      ] }),
      o.phase && /* @__PURE__ */ a("span", { children: [
        "· parked at ",
        o.phase
      ] }),
      o.repo && /* @__PURE__ */ a("span", { children: [
        "· ",
        o.repo
      ] }),
      o.issue_url && /* @__PURE__ */ e("a", { href: o.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, o.id)) });
}
function Ba({ repos: t, selected: r, onToggle: o, onClear: s, onAddWorkspace: l, onEdit: p }) {
  const u = t.reduce((g, v) => g + v.count, 0), i = r.size === 0, c = ({ name: g, count: v, label: E, checked: f, onClick: b, isAll: x }) => {
    const [k, D] = w(!1);
    return /* @__PURE__ */ a(
      "div",
      {
        onMouseEnter: () => D(!0),
        onMouseLeave: () => D(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: f ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: f ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ a(
            "button",
            {
              onClick: b,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                x ? /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: f ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ e(
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
                    children: E
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    children: v
                  }
                )
              ]
            }
          ),
          !x && g && /* @__PURE__ */ e(
            "button",
            {
              onClick: (q) => {
                q.stopPropagation(), p(g);
              },
              title: `Edit pipeline "${E}"`,
              "aria-label": `Edit pipeline ${E}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: k ? 1 : 0,
                pointerEvents: k ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (q) => {
                const A = q.currentTarget;
                A.style.color = "var(--accent)", A.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (q) => {
                const A = q.currentTarget;
                A.style.color = "var(--text-strong, var(--text))", A.style.borderColor = "var(--border-strong, var(--border))";
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
          r.size > 0 && /* @__PURE__ */ e("button", { onClick: s, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ e(c, { isAll: !0, count: u, label: "All repos", checked: i, onClick: s }),
        t.map((g) => /* @__PURE__ */ e(
          c,
          {
            name: g.name,
            count: g.count,
            label: (Rr.has(g.name) ? "Example: " : "") + (g.name.includes("/") ? g.name.split("/")[1] : g.name),
            checked: r.has(g.name),
            onClick: () => o(g.name)
          },
          g.name
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
const za = [
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
function Pa({ initial: t, agentProfiles: r, crews: o, repo: s, stepName: l, onSave: p, onSaveCrew: u, onClose: i }) {
  const [c, g] = w(t.name || ""), [v, E] = w(t.role || ""), [f, b] = w(t.tools || ["read"]), [x, k] = w(t.model || "auto"), [D, q] = w(t.crew || ""), [A, I] = w(t.addenda || []), [C, B] = w(t.capability || ""), [X, y] = w(t.trust || ""), [J, S] = w(t.depth || ""), [he, ye] = w(!1), ie = r.find((_) => _.name === c), me = o.find((_) => _.name === D), Se = [.../* @__PURE__ */ new Set([...za, ...f])], Q = (_) => {
    const U = Sa({ name: c, role: v, tools: f, model: x, crew: D, addenda: A, capability: C, trust: X, depth: J }, _);
    g(U.name), b(U.tools || []), k(U.model || "auto"), U.capability && B(U.capability);
  }, z = (_) => b((U) => U.includes(_) ? U.filter((te) => te !== _) : [...U, _]), ee = () => I((_) => {
    var U;
    return _.length >= 3 ? _ : [..._, { crew: ((U = o[0]) == null ? void 0 : U.name) || "", when: "always", writes: "" }];
  }), $e = (_, U) => I((te) => te.map((we, Oe) => Oe === _ ? { ...we, ...U } : we)), Te = (_) => I((U) => U.filter((te, we) => we !== _)), _e = c.trim().length > 0;
  return /* @__PURE__ */ a("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ a("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ e("button", { onClick: i, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
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
              onClick: () => ye(!0),
              className: "text-[10px] px-2 py-1 rounded-md font-semibold",
              style: { color: "var(--accent)", border: "1px solid var(--border)" },
              children: "Browse agents & crews"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: r.map((_) => /* @__PURE__ */ e(
          "button",
          {
            onClick: () => Q(_),
            disabled: _.status !== "loaded",
            title: _.description || _.name,
            className: "text-[11px] px-2 py-1 rounded-md font-medium disabled:opacity-40",
            style: {
              background: c === _.name ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: c === _.name ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: c === _.name ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: _.name
          },
          _.name
        )) }),
        ie && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1.5 rounded-md px-2 py-1.5", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
          "Loaded config: model ",
          /* @__PURE__ */ e("code", { children: ie.model || "auto" }),
          " · ",
          ie.tools.length,
          " declared tool",
          ie.tools.length === 1 ? "" : "s",
          " · ",
          ie.allowedTools.length,
          " auto-approved. The step objective below remains pipeline-local."
        ] })
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: c,
            onChange: (_) => g(_.target.value),
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
            value: v,
            onChange: (_) => E(_.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: Se.map((_) => {
          const U = f.includes(_);
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => z(_),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: U ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: U ? "var(--accent)" : "var(--muted)",
                boxShadow: U ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: _
            },
            _
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
              value: C,
              onChange: (_) => B(_.target.value),
              className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "auto-derived" }),
                ["readonly", "authoring", "builder", "coordinator"].map((_) => /* @__PURE__ */ e("option", { value: _, children: _ }, _))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "text-[10px] mt-2", style: { color: C === "coordinator" ? "var(--warn)" : "var(--muted)" }, children: [
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
            value: x,
            onChange: (_) => k(_.target.value),
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
              value: D,
              onChange: (_) => q(_.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "— none (use step agent) —" }),
                o.map((_) => /* @__PURE__ */ e("option", { value: _.name, children: _.name }, _.name))
              ]
            }
          )
        ] }),
        me && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: [
          "Global route ",
          /* @__PURE__ */ e("code", { children: me.name }),
          " → ",
          /* @__PURE__ */ e("code", { children: me.kiroAgent || "profile unknown" }),
          me.workspace ? ` · workspace ${me.workspace}` : "",
          me.description ? ` · ${me.description}` : ""
        ] })
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: ee,
              disabled: A.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        A.length === 0 && /* @__PURE__ */ e("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        A.map((_, U) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ e(
            "select",
            {
              value: _.crew,
              onChange: (te) => $e(U, { crew: te.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: o.map((te) => /* @__PURE__ */ e("option", { value: te.name, children: te.name }, te.name))
            }
          ),
          /* @__PURE__ */ a(
            "select",
            {
              value: _.when || "always",
              onChange: (te) => $e(U, { when: te.target.value }),
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
              value: _.writes || "",
              onChange: (te) => $e(U, { writes: te.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ e("button", { onClick: () => Te(U), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ e("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ e("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, U))
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...st].map((_) => {
          const U = X === _;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => y(_),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: U ? _ ? Xt[_] : "var(--text)" : "var(--muted)", background: U ? "var(--bg-hover, var(--border))" : "transparent" },
              children: _ || "inherit"
            },
            _ || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...xt].map((_) => {
          const U = J === _;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => S(_),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: U ? _ ? Yt[_] : "var(--text)" : "var(--muted)", background: U ? "var(--bg-hover, var(--border))" : "transparent" },
              children: _ || "inherit"
            },
            _ || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ a("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ e("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ e(
        "button",
        {
          disabled: !_e,
          onClick: () => p({
            name: c.trim(),
            role: v.trim() || void 0,
            tools: f,
            model: x.trim() && x.trim() !== "auto" ? x.trim() : void 0,
            crew: D || void 0,
            addenda: A.length ? A.filter((_) => _.crew) : void 0,
            capability: C || void 0,
            trust: X || void 0,
            depth: J || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save step"
        }
      )
    ] }),
    he && /* @__PURE__ */ e(
      ar,
      {
        profiles: r,
        crews: o,
        context: `${s || "unassigned pipeline"} · ${l || "unnamed step"}`,
        onSaveCrew: u,
        onClose: () => ye(!1),
        onSelectProfile: (_) => {
          Q(_), ye(!1);
        },
        onSelectCrew: (_) => {
          q(_.name), ye(!1);
        }
      }
    )
  ] });
}
function xr({ candidates: t, existingRepos: r, defaults: o, agentProfiles: s, crews: l, onCreate: p, onSaveCrew: u, onClose: i, editPipeline: c, cardCount: g, isExample: v, onDelete: E }) {
  var qt, It, Mt, Ct, St, $t, Dt, ct, dt, pt, Bt, Tt, Rt, zt, ut;
  const f = !!c, [b, x] = w((c == null ? void 0 : c.repo) || ""), [k, D] = w((c == null ? void 0 : c.workspace) || "default"), [q, A] = w((c == null ? void 0 : c.repo_path) || ""), [I, C] = w((c == null ? void 0 : c.source) || "manual"), [B, X] = w((c == null ? void 0 : c.trust) || o.trust), [y, J] = w((c == null ? void 0 : c.depth) || o.depth), S = c == null ? void 0 : c.budget, [he, ye] = w(
    S ? S.max_child_cards === "unlimited" && S.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [ie, me] = w(
    () => S && S.max_child_cards !== "unlimited" && S.effort_ceiling !== "unlimited" ? { ...S } : gr((c == null ? void 0 : c.depth) || o.depth)
  ), [Se, Q] = w((c == null ? void 0 : c.backlog_intake) ?? !0), [z, ee] = w((c == null ? void 0 : c.results_in_repo) ?? !1), [$e, Te] = w((c == null ? void 0 : c.conversation_log) ?? !1), [_e, _] = w(((c == null ? void 0 : c.trusted_authors) || []).join(`
`)), [U, te] = w((c == null ? void 0 : c.self_enabling) ?? !1), [we, Oe] = w((c == null ? void 0 : c.approach) || "simplified"), [oe, Z] = w((c == null ? void 0 : c.sync_mode) || "poll"), [F, ve] = w(() => {
    var h;
    return (h = c == null ? void 0 : c.steps) != null && h.length ? c.steps.map((T) => ({ ...T })) : Vt.map((T) => ({ ...T }));
  }), [O, ce] = w(null), [Le, rt] = w(""), [ae, lt] = w("settings"), [pe, $] = w(!1), W = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", ke = (h, T) => ve((ge) => ge.map((be, de) => de === h ? { ...be, ...T } : be)), Xe = (h) => ve((T) => T.filter((ge, be) => be !== h)), De = (h, T) => ve((ge) => {
    const be = h + T;
    if (be < 0 || be >= ge.length) return ge;
    const de = [...ge];
    return [de[h], de[be]] = [de[be], de[h]], de;
  }), Fe = (h) => ve((T) => [...T, {
    id: `${h}-${Math.random().toString(36).slice(2, 6)}`,
    name: h === "gate" ? "New Gate" : "New Step",
    type: h,
    agent: h === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), qe = (h) => {
    x(h.repo || ""), D(h.workspace || "default"), A(h.path || ""), C(h.source);
  }, Ye = (h) => {
    let T = (h || "").trim();
    if (!T) return "";
    const ge = T.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return ge && (T = ge[1]), T.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, yt = (h) => {
    const T = /github\.com|gitlab\.com/i.test(h);
    x(T ? Ye(h) : h), C("manual");
  }, it = [...new Map(
    _e.split(/[\n,]/).map((h) => h.trim()).filter(Boolean).map((h) => [h.toLowerCase(), h])
  ).values()], fe = it.every((h) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(h)), kt = /^[A-Za-z0-9_.-]{1,80}$/.test(k), wt = (/^[^/\s]+\/[^/\s]+$/.test(Ye(b)) || t.some((h) => h.repo && h.repo === b)) && fe && kt, Nt = !f && r.has(Ye(b)), _t = ({ value: h, options: T, tokens: ge, onPick: be }) => /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: T.map((de) => {
    const He = h === de;
    return /* @__PURE__ */ e(
      "button",
      {
        onClick: () => be(de),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: He ? ge[de] : "var(--muted)",
          background: He ? `color-mix(in srgb, ${ge[de]} 16%, transparent)` : "transparent",
          boxShadow: He ? `inset 0 0 0 1px color-mix(in srgb, ${ge[de]} 45%, transparent)` : "none"
        },
        children: de
      },
      de
    );
  }) }), at = { "issue-radar": [], workspace: [], manual: [] };
  t.forEach((h) => {
    var T;
    (at[T = h.source] || (at[T] = [])).push(h);
  });
  const Zt = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" }, Jt = f ? ["settings", "webhook", "danger"] : ["settings", "webhook"];
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: i,
      children: /* @__PURE__ */ a(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (h) => h.stopPropagation(),
          children: [
            pe && /* @__PURE__ */ e(
              ar,
              {
                profiles: s,
                crews: l,
                context: b || k,
                onSaveCrew: u,
                onClose: () => $(!1)
              }
            ),
            O !== null ? /* @__PURE__ */ e(
              Pa,
              {
                initial: {
                  name: ((It = (qt = F[O]) == null ? void 0 : qt.agent) == null ? void 0 : It.name) || "",
                  role: (Ct = (Mt = F[O]) == null ? void 0 : Mt.agent) == null ? void 0 : Ct.role,
                  tools: ($t = (St = F[O]) == null ? void 0 : St.agent) == null ? void 0 : $t.tools,
                  model: (ct = (Dt = F[O]) == null ? void 0 : Dt.agent) == null ? void 0 : ct.model,
                  crew: (pt = (dt = F[O]) == null ? void 0 : dt.agent) == null ? void 0 : pt.crew,
                  addenda: (Bt = F[O]) == null ? void 0 : Bt.addenda,
                  capability: (Tt = F[O]) == null ? void 0 : Tt.capability,
                  trust: (Rt = F[O]) == null ? void 0 : Rt.trust,
                  depth: (zt = F[O]) == null ? void 0 : zt.depth
                },
                agentProfiles: s,
                crews: l,
                repo: b,
                stepName: ((ut = F[O]) == null ? void 0 : ut.name) || "",
                onSaveCrew: u,
                onClose: () => ce(null),
                onSave: (h) => {
                  ke(O, {
                    agent: { name: h.name, role: h.role, tools: h.tools, model: h.model, crew: h.crew },
                    addenda: h.addenda,
                    capability: h.capability,
                    trust: h.trust,
                    depth: h.depth
                  }), ce(null);
                }
              }
            ) : /* @__PURE__ */ a(ze, { children: [
              /* @__PURE__ */ a("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { children: [
                  /* @__PURE__ */ e("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: f ? "Edit Pipeline" : "New Pipeline" }),
                  /* @__PURE__ */ e("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: f ? b.includes("/") ? b.split("/")[1] : b : "Configure a pipeline for a repository or workspace" })
                ] }),
                /* @__PURE__ */ e("button", { onClick: i, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
              ] }),
              /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: Jt.map((h) => {
                const T = ae === h, ge = h === "danger";
                return /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => lt(h),
                    className: "text-[12px] px-3 py-2 font-semibold transition-all",
                    style: {
                      color: T ? ge ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                      borderBottom: `2px solid ${T ? ge ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                      marginBottom: "-1px"
                    },
                    children: h === "settings" ? "Settings" : h === "webhook" ? "Webhook · app-wide" : "Danger Zone"
                  },
                  h
                );
              }) }),
              /* @__PURE__ */ a(
                "div",
                {
                  className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                  style: { display: ae === "settings" ? "flex" : "none" },
                  children: [
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: b,
                          onChange: (h) => yt(h.target.value),
                          onPaste: (h) => {
                            const T = h.clipboardData.getData("text");
                            /github\.com|gitlab\.com/i.test(T) && (h.preventDefault(), yt(T));
                          },
                          placeholder: "https://github.com/owner/name  ·  or  owner/name",
                          disabled: f,
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Nt ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                        }
                      ),
                      !f && b && Ye(b) !== b && /* @__PURE__ */ a("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                        "→ ",
                        /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: Ye(b) })
                      ] }),
                      Nt && /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                      /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((h) => at[h].length > 0 && /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Zt[h] }),
                        /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1.5", children: at[h].map((T) => {
                          const ge = `${h}:${T.workspace || T.repo}:${T.path || ""}`, be = T.source === "workspace" ? k === T.workspace && q === (T.path || "") : b === T.repo;
                          return /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => qe(T),
                              disabled: !!T.repo && r.has(T.repo),
                              title: T.detail || T.repo || T.workspace,
                              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                              style: {
                                background: be ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                                color: be ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                                boxShadow: be ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                              },
                              children: T.label || (T.repo.includes("/") ? T.repo.split("/")[1] : T.repo) || T.workspace
                            },
                            ge
                          );
                        }) })
                      ] }, h)) })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspace partition" }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: k,
                          onChange: (h) => D(h.target.value.trim()),
                          placeholder: "default",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${kt ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: kt ? "var(--muted)" : "var(--danger)" }, children: [
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
                          value: q,
                          onChange: (h) => A(h.target.value),
                          placeholder: "/absolute/path/to/checkout",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ e("div", { className: "text-[10px] mt-1", style: { color: "var(--muted)" }, children: "Required before code or repo-mirrored results run. Mutable steps block rather than use the shared checkout when this path is absent or unverifiable." })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                      /* @__PURE__ */ e(_t, { value: B, options: st, tokens: Xt, onPick: X })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                      /* @__PURE__ */ e(_t, { value: y, options: xt, tokens: Yt, onPick: J })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                        /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                      ] }),
                      /* @__PURE__ */ e(
                        _t,
                        {
                          value: he,
                          options: ["depth", "custom", "unlimited"],
                          tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                          onPick: ye
                        }
                      )
                    ] }),
                    he === "depth" && (() => {
                      const h = gr(y);
                      return /* @__PURE__ */ a("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                        "Follows ",
                        /* @__PURE__ */ e("strong", { children: y }),
                        ": ",
                        String(h.max_child_cards),
                        " child cards · ",
                        String(h.effort_ceiling),
                        " effort points · max ",
                        h.max_feature_size,
                        " · ",
                        h.addenda,
                        " addenda"
                      ] });
                    })(),
                    he === "unlimited" && /* @__PURE__ */ e("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                    he === "custom" && /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max child cards",
                        /* @__PURE__ */ e(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: ie.max_child_cards,
                            onChange: (h) => me((T) => ({ ...T, max_child_cards: Math.max(0, Number(h.target.value) || 0) })),
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
                            value: ie.effort_ceiling,
                            onChange: (h) => me((T) => ({ ...T, effort_ceiling: Math.max(0, Number(h.target.value) || 0) })),
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
                            value: ie.max_feature_size,
                            onChange: (h) => me((T) => ({ ...T, max_feature_size: h.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["S", "M", "L", "XL"].map((h) => /* @__PURE__ */ e("option", { children: h }, h))
                          }
                        )
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Addenda",
                        /* @__PURE__ */ e(
                          "select",
                          {
                            value: ie.addenda,
                            onChange: (h) => me((T) => ({ ...T, addenda: h.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["none", "obvious", "proactive"].map((h) => /* @__PURE__ */ e("option", { children: h }, h))
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { className: "min-w-0 pr-3", children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "GitHub sync mode" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: oe === "webhook" ? "Webhook is the fast path; the safety-net poll reconciles this pipeline on a longer window. Requires the app-wide webhook receiver enabled — falls back to polling if it is not." : "Poll reconciles this pipeline every cycle (default). Correct when no webhook is configured." })
                      ] }),
                      /* @__PURE__ */ e("div", { className: "flex rounded-md overflow-hidden flex-shrink-0", style: { border: "1px solid var(--border)" }, children: ["poll", "webhook"].map((h) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => Z(h),
                          className: "text-[11px] px-2.5 py-1 font-semibold",
                          style: {
                            background: oe === h ? "var(--accent)" : "transparent",
                            color: oe === h ? "var(--bg)" : "var(--muted)"
                          },
                          children: h === "poll" ? "Poll" : "Webhook"
                        },
                        h
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
                          onClick: () => Q((h) => !h),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: Se ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: Se ? 20 : 2 }
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
                          onClick: () => ee((h) => !h),
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
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Pipeline conversation log" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Opt in to the review-oriented command transcript; off means no log file is created" })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => Te((h) => !h),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: $e ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: $e ? 20 : 2 }
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
                          value: _e,
                          onChange: (h) => _(h.target.value),
                          rows: 2,
                          placeholder: "Defaults to the authenticated GitHub user",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${fe ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: fe ? "var(--muted)" : "var(--danger)" }, children: [
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
                          onClick: () => te((h) => !h),
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
                    U && /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                      ] }),
                      /* @__PURE__ */ e("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((h) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => Oe(h),
                          className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                          style: {
                            background: we === h ? "var(--accent)" : "transparent",
                            color: we === h ? "var(--bg)" : "var(--muted)",
                            border: `1px solid ${we === h ? "var(--accent)" : "var(--border)"}`
                          },
                          children: h
                        },
                        h
                      )) })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ a("div", { className: "flex items-center justify-between mb-1.5", children: [
                        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                        /* @__PURE__ */ a("div", { className: "flex gap-1", children: [
                          /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => $(!0),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--muted)", border: "1px solid var(--border)" },
                              children: "Agents & crews"
                            }
                          ),
                          /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => Fe("agent"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                              children: "+ agent"
                            }
                          ),
                          /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => Fe("gate"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                              children: "+ gate"
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: F.map((h, T) => {
                        var ge, be;
                        return /* @__PURE__ */ a(
                          "div",
                          {
                            className: "rounded-md p-2",
                            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${h.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                            children: [
                              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ a("div", { className: "flex flex-col", children: [
                                  /* @__PURE__ */ e("button", { onClick: () => De(T, -1), disabled: T === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                  /* @__PURE__ */ e("button", { onClick: () => De(T, 1), disabled: T === F.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                                ] }),
                                /* @__PURE__ */ e(
                                  "input",
                                  {
                                    value: h.name,
                                    onChange: (de) => ke(T, { name: de.target.value, id: W(de.target.value) }),
                                    className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                  }
                                ),
                                /* @__PURE__ */ e(
                                  "span",
                                  {
                                    className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                    style: { color: h.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${h.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                    children: h.type
                                  }
                                ),
                                /* @__PURE__ */ e("button", { onClick: () => Xe(T), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                              ] }),
                              h.type === "agent" && /* @__PURE__ */ a("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                                /* @__PURE__ */ a(
                                  "button",
                                  {
                                    onClick: () => ce(T),
                                    className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                    style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                    children: [
                                      "⚙ ",
                                      (ge = h.agent) != null && ge.name ? `Agent: ${h.agent.name}` : "Configure agent"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                                /* @__PURE__ */ a(
                                  "select",
                                  {
                                    value: h.trigger || "ask",
                                    onChange: (de) => ke(T, { trigger: de.target.value === "ask" ? void 0 : de.target.value }),
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
                                /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: h.capability ? "var(--accent)" : "var(--muted)" }, title: "Actual authority is verified from the assigned capability profile at runtime", children: [
                                  "cap: ",
                                  h.capability || "auto"
                                ] }),
                                (h.trust || h.depth) && /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [h.trust, h.depth].filter(Boolean).join(" · ") }),
                                h.addenda && h.addenda.length > 0 && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                  "+",
                                  h.addenda.length,
                                  " addendum",
                                  h.addenda.length === 1 ? "" : "s"
                                ] }),
                                ((be = h.agent) == null ? void 0 : be.role) && /* @__PURE__ */ e("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: h.agent.role })
                              ] }),
                              h.type === "gate" && /* @__PURE__ */ a("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                                /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                                /* @__PURE__ */ a(
                                  "select",
                                  {
                                    value: h.trust || "",
                                    onChange: (de) => ke(T, { trust: de.target.value || void 0 }),
                                    className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                    children: [
                                      /* @__PURE__ */ e("option", { value: "", children: "inherit" }),
                                      st.map((de) => /* @__PURE__ */ e("option", { value: de, children: de }, de))
                                    ]
                                  }
                                )
                              ] })
                            ]
                          },
                          h.id
                        );
                      }) })
                    ] })
                  ]
                }
              ),
              ae === "webhook" && /* @__PURE__ */ e("div", { className: "px-5 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ e(Nr, {}) }),
              f && ae === "danger" && E && (() => {
                const h = b.includes("/") ? b.split("/")[1] : b, T = Le.trim() === h;
                return /* @__PURE__ */ e("div", { className: "px-5 pb-4 pt-4", children: v ? /* @__PURE__ */ a(
                  "div",
                  {
                    className: "rounded-lg p-4 flex flex-col gap-3",
                    style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                    children: [
                      /* @__PURE__ */ a("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "This is a bundled ",
                        /* @__PURE__ */ e("strong", { children: "example" }),
                        " pipeline (",
                        g ?? 0,
                        " sample card",
                        (g ?? 0) === 1 ? "" : "s",
                        "). Remove it any time — it's demo data, not real work."
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => {
                            E(b), i();
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
                        g ?? 0,
                        " card",
                        (g ?? 0) === 1 ? "" : "s",
                        " from DLC-YOLO's local state. It does ",
                        /* @__PURE__ */ e("strong", { children: "not" }),
                        " touch GitHub issues or labels. This cannot be undone."
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Type ",
                        /* @__PURE__ */ e("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: h }),
                        " to confirm:"
                      ] }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: Le,
                          onChange: (ge) => rt(ge.target.value),
                          placeholder: h,
                          className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                        }
                      ),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          disabled: !T,
                          onClick: () => {
                            E(b), i();
                          },
                          className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                          style: {
                            background: T ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                            color: T ? "#fff" : "var(--muted)",
                            cursor: T ? "pointer" : "not-allowed"
                          },
                          children: "Delete pipeline"
                        }
                      )
                    ]
                  }
                ) });
              })(),
              /* @__PURE__ */ a("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
                /* @__PURE__ */ e("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: ae === "settings" ? "Cancel" : "Close" }),
                ae === "settings" && /* @__PURE__ */ e(
                  "button",
                  {
                    disabled: !wt || !f && Nt,
                    onClick: () => p({
                      repo: Ye(b),
                      workspace: k,
                      ...q.trim() ? { repo_path: q.trim() } : {},
                      source: I,
                      trust: B,
                      depth: y,
                      budget: he === "depth" ? void 0 : he === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : ie,
                      backlog_intake: Se,
                      results_in_repo: z,
                      conversation_log: $e,
                      trusted_authors: it,
                      self_enabling: U,
                      approach: we,
                      sync_mode: oe,
                      steps: F.map((h) => ({ ...h, label: `dlc:${h.id}` }))
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
function ft({ size: t = 12 }) {
  return /* @__PURE__ */ a("svg", { className: "animate-spin flex-shrink-0", width: t, height: t, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ e("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ e("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
const Wa = {
  investigate: "🔎",
  requirements: "📝",
  design: "📐",
  tasks: "🧩",
  implement: "🔨",
  review: "🔍",
  pr: "🚀",
  intent: "🎯"
};
function Ua(t, r) {
  const [o, s] = w(""), l = Ae(""), p = Ae(""), u = Ae(null);
  return p.current = t || "", Ee(() => {
    if (!r || !p.current.startsWith(l.current)) {
      l.current = p.current, s(p.current);
      return;
    }
    const i = () => {
      const c = p.current, g = l.current;
      if (g.length >= c.length) {
        u.current = null;
        return;
      }
      const v = Math.max(1, Math.ceil((c.length - g.length) / 12));
      l.current = c.slice(0, g.length + v), s(l.current), u.current = requestAnimationFrame(i);
    };
    return u.current == null && (u.current = requestAnimationFrame(i)), () => {
      u.current != null && (cancelAnimationFrame(u.current), u.current = null);
    };
  }, [t, r]), o;
}
function Ga({ live: t }) {
  const [r, o] = w(!0), s = Ae(null), l = Ua(t.tail, t.active);
  Ee(() => {
    s.current && (s.current.scrollTop = s.current.scrollHeight);
  }, [l]);
  const p = Wa[t.stage] || "⚙";
  return /* @__PURE__ */ a("div", { className: "mt-2", style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" }, children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
      /* @__PURE__ */ a(
        "button",
        {
          className: "inline-flex items-center gap-1 hover:underline",
          onClick: () => o((u) => !u),
          title: "Toggle live output",
          style: { color: "var(--muted)" },
          children: [
            /* @__PURE__ */ e("span", { "aria-hidden": "true", children: r ? "▾" : "▸" }),
            /* @__PURE__ */ a("span", { className: "uppercase tracking-wider", children: [
              p,
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
      t.active && /* @__PURE__ */ e(ft, { size: 10 }),
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
        ref: s,
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
const Fa = {
  loop: "⚙",
  "step-agent": "🤖",
  orchestrator: "🧠",
  human: "🧑"
}, Ha = {
  loop: "var(--muted)",
  "step-agent": "var(--info)",
  orchestrator: "var(--accent)",
  human: "var(--ok)"
};
function Ka({ card: t, events: r, children: o, parent: s, onOpenCard: l, onClose: p }) {
  const u = o && o.length > 0 || !!s;
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (i) => {
        i.currentTarget === i.target && p();
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
              /* @__PURE__ */ e("button", { onClick: p, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ a("div", { className: "px-4 py-3 overflow-y-auto", children: [
              u && /* @__PURE__ */ a("div", { className: "mb-3 pb-3", style: { borderBottom: "1px dashed var(--border)" }, children: [
                /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "🌿 fan-out" }),
                s && /* @__PURE__ */ a(
                  "button",
                  {
                    className: "flex items-center gap-1.5 text-[12px] hover:underline mb-1",
                    onClick: () => l == null ? void 0 : l(s.id),
                    style: { color: "var(--accent)" },
                    title: "Open the integration parent",
                    children: [
                      "↑ parent · ",
                      /* @__PURE__ */ e("span", { className: "truncate max-w-[420px]", style: { color: "var(--text)" }, children: s.title })
                    ]
                  }
                ),
                o.map((i) => /* @__PURE__ */ a(
                  "button",
                  {
                    className: "flex items-center gap-1.5 text-[12px] hover:underline w-full text-left",
                    onClick: () => l == null ? void 0 : l(i.id),
                    title: "Open this child card",
                    style: { color: "var(--text)" },
                    children: [
                      /* @__PURE__ */ e("span", { "aria-hidden": "true", style: { color: "var(--accent)" }, children: "↳" }),
                      /* @__PURE__ */ e("span", { className: "truncate flex-1", children: i.title }),
                      /* @__PURE__ */ a("span", { className: "text-[9px] flex-shrink-0", style: { color: i.lifecycle === "retired" ? "var(--ok)" : "var(--muted)" }, children: [
                        i.stage || "",
                        i.lifecycle ? ` · ${i.lifecycle}` : "",
                        i.required === !1 ? " · optional" : ""
                      ] })
                    ]
                  },
                  i.id
                )),
                o.length > 0 && r.length === 0 && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1.5 italic", style: { color: "var(--muted)" }, children: [
                  "This card fanned its work out to the ",
                  o.length,
                  " child card",
                  o.length > 1 ? "s" : "",
                  " above — the story lives there."
                ] })
              ] }),
              r.length === 0 ? /* @__PURE__ */ e("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: u ? "No events recorded on this card directly." : "No recorded events yet." }) : /* @__PURE__ */ e("ol", { className: "flex flex-col gap-2", children: r.map((i) => /* @__PURE__ */ a("li", { className: "flex gap-2 text-[12px]", children: [
                /* @__PURE__ */ e("span", { title: i.actor, "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", children: Fa[i.actor] || "•" }),
                /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-baseline gap-1.5 flex-wrap", children: [
                    /* @__PURE__ */ a("span", { className: "font-medium", style: { color: i.needs_human ? "var(--warn)" : "var(--text)" }, children: [
                      i.needs_human && "🔴 ",
                      i.headline
                    ] }),
                    i.cls === "decision" && /* @__PURE__ */ e("span", { className: "text-[9px] px-1 rounded-full", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: "decision" }),
                    /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: i.at ? i.at.replace("T", " ").replace("Z", "") : "" })
                  ] }),
                  i.detail && /* @__PURE__ */ e("div", { className: "text-[10px] mt-0.5 leading-snug", style: { color: "var(--muted)" }, children: i.detail }),
                  /* @__PURE__ */ a("div", { className: "text-[9px] mt-0.5", style: { color: Ha[i.actor] || "var(--muted)" }, children: [
                    i.actor,
                    i.step ? ` · ${i.step}` : "",
                    i.executor ? ` · ${i.executor}` : ""
                  ] })
                ] })
              ] }, i.id)) })
            ] })
          ]
        }
      )
    }
  );
}
function Ja() {
  const t = yr(), r = Er(), [o, s] = w([]), [l, p] = w([]), [u, i] = w({}), [c, g] = w(Lt), [v, E] = w(!0), [f, b] = w("pipeline"), [x, k] = w(/* @__PURE__ */ new Set()), [D, q] = w(!1), [A, I] = w(null), [C, B] = w([]), [X, y] = w([]), [J, S] = w([]), [he, ye] = w(!1), [ie, me] = w(!1), [Se, Q] = w(!1), [z, ee] = w(!1), [$e, Te] = w(!1), [_e, _] = w(!1), [U, te] = w([]), we = Ae(null), Oe = Ae(!1), oe = Ae(!1), Z = Ae(/* @__PURE__ */ new Set()), F = Ae(/* @__PURE__ */ new Set()), [ve, O] = w({}), ce = le(
    (n) => t.get("/api/file-read?path=" + encodeURIComponent(n)),
    [t]
  ), Le = le(async (n = !1) => {
    try {
      const d = !oe.current || n ? await Ht(ce) : await ir(ce, Qe);
      Qe = d.path, oe.current = !0;
      const m = d.data;
      s(m.cards || []), p(m.pipelines || []), i({ github_webhook_history: m.github_webhook_history || [], scheduler_state: m.scheduler_state || null }), g({ ...Lt, ...m.config || {} });
    } catch (d) {
      console.error("Failed to fetch cards:", d);
    } finally {
      E(!1);
    }
  }, [ce]), rt = Ce(() => {
    const n = /* @__PURE__ */ new Map();
    return l.forEach((d) => {
      n.has(d.repo) || n.set(d.repo, 0);
    }), o.forEach((d) => {
      var N;
      const m = ((N = d.source) == null ? void 0 : N.repo) || "unlinked";
      n.set(m, (n.get(m) || 0) + 1);
    }), [...n.entries()].map(([d, m]) => ({ name: d, count: m })).sort((d, m) => m.count - d.count);
  }, [o, l]), ae = Ce(
    () => x.size === 0 ? o : o.filter((n) => {
      var d;
      return x.has(((d = n.source) == null ? void 0 : d.repo) || "unlinked");
    }),
    [o, x]
  );
  Ee(() => {
    F.current = new Set(o.map((n) => n.id)), Z.current = new Set(o.flatMap(
      (n) => Object.values(n.step_sessions || {}).filter((d) => !!d.slot_key && !d.chat_disabled_at && !d.superseded).map((d) => d.slot_key)
    ));
  }, [o]), Ee(() => {
    let n = !1, d = null, m, N = 0;
    const R = () => {
      if (n) return;
      const j = window.location.protocol === "https:" ? "wss:" : "ws:";
      d = new WebSocket(`${j}//${window.location.host}/api/ws`), d.onopen = () => {
        N = 0;
      }, d.onmessage = (G) => {
        if (typeof G.data == "string")
          try {
            const M = JSON.parse(G.data), V = M == null ? void 0 : M.data;
            if (M.type === "slots" && Array.isArray(V)) {
              const K = new Set(Z.current), Y = [];
              for (const L of V) {
                const Re = (L == null ? void 0 : L.key) || (L == null ? void 0 : L.slot) || (L == null ? void 0 : L.name), Pe = String((L == null ? void 0 : L.title) || (L == null ? void 0 : L.name) || "");
                typeof Re == "string" && Re.startsWith("cron-") && [...F.current].some((We) => Pe.includes(We)) && K.add(Re), typeof Re == "string" && (L != null && L.running) && K.has(Re) && Y.push(Re);
              }
              Z.current = K, Y.length && O((L) => {
                let Re = L;
                for (const Pe of Y) {
                  const We = nr(L[Pe]);
                  We !== L[Pe] && (Re = { ...Re, [Pe]: We });
                }
                return Re;
              });
              return;
            }
            const se = V == null ? void 0 : V.slot;
            if (!se || !Z.current.has(se)) return;
            M.type === "chat_status" && String(V.status || "").toLowerCase().startsWith("thinking") || M.type === "chat_thinking" ? O((K) => {
              const Y = nr(K[se], M.type === "chat_status");
              return Y === K[se] ? K : { ...K, [se]: Y };
            }) : M.type === "chat_chunk" && typeof V.content == "string" ? O((K) => {
              const Y = Dr(K[se], V.content, Number(V.seq));
              return Y === K[se] ? K : { ...K, [se]: Y };
            }) : M.type === "chat_done" && O((K) => {
              const Y = Br(K[se]);
              return Y === K[se] ? K : { ...K, [se]: Y };
            });
          } catch {
          }
      }, d.onclose = () => {
        if (n) return;
        const G = Math.min(1e3 * 2 ** N++, 15e3);
        m = setTimeout(R, G);
      }, d.onerror = () => d == null ? void 0 : d.close();
    };
    return R(), () => {
      n = !0, m && clearTimeout(m), d == null || d.close();
    };
  }, []), Ee(() => {
    if (!Se) return;
    const n = (d) => {
      d.key === "Escape" && Q(!1);
    };
    return window.addEventListener("keydown", n), () => window.removeEventListener("keydown", n);
  }, [Se]);
  const lt = 6e5, pe = Ce(() => {
    var d, m, N, R;
    const n = [];
    for (const j of ae) {
      const G = j.step_status || {}, M = j.step_sessions || {}, V = l.find((K) => K.id === j.pipeline_id) || l.find((K) => {
        var Y;
        return K.repo === ((Y = j.source) == null ? void 0 : Y.repo);
      }), se = /* @__PURE__ */ new Set([...Object.keys(G), ...Object.keys(M)]);
      for (const K of se) {
        const Y = G[K] || "idle", L = M[K], Re = Y === "pending" || Y === "error", Pe = !!(L != null && L.slot_key) && !L.chat_disabled_at && !L.superseded;
        if (!Re && !Pe) continue;
        const We = (d = j.pending_at) == null ? void 0 : d[K], ne = Re && !!We && Date.now() - new Date(We).getTime() > lt, re = (m = V == null ? void 0 : V.steps) == null ? void 0 : m.find((ht) => ht.id === K), Ue = (L == null ? void 0 : L.agent) || ((N = re == null ? void 0 : re.agent) == null ? void 0 : N.crew) || ((R = re == null ? void 0 : re.agent) == null ? void 0 : R.name) || "orchestrator", Ie = L == null ? void 0 : L.agent_id, nt = L == null ? void 0 : L.slot_key, At = L == null ? void 0 : L.session_key, Ar = Ie ? U.some((ht) => ht.id === Ie) : Re && U.some((ht) => (ht.task || "").includes(j.id) || (ht.task || "").includes(j.title)), jr = !!(L != null && L.last_response_at) && (!L.last_response_handled_at || L.last_response_handled_at < L.last_response_at);
        n.push({ cardId: j.id, card: j.title || j.id, step: K, agent: Ue, stale: ne, status: Y, live: Ar, responsePending: jr, agentId: Ie, slotKey: nt, sessionKey: At, sessionName: L == null ? void 0 : L.name });
      }
    }
    return n;
  }, [ae, l, U]), $ = Ce(() => {
    var R;
    let n;
    if (x.size === 1) {
      const j = [...x][0];
      n = (R = l.find((G) => G.repo === j)) == null ? void 0 : R.steps;
    } else l.length === 1 && (n = l[0].steps);
    const d = (n && n.length ? n : Vt).map((j) => ({ ...j })), m = new Set(d.map((j) => j.id)), N = [];
    return m.has("intake") || N.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), N.push(...d), m.has("done") || N.push({ id: "done", name: "Done", type: "agent" }), N;
  }, [x, l]), W = Ce(() => $.map((n) => n.id), [$]), ke = le((n) => {
    var d;
    return ((d = $.find((m) => m.id === n)) == null ? void 0 : d.type) === "gate" || n.startsWith("gate-");
  }, [$]), Xe = le((n) => {
    var d, m;
    return ((m = (d = $.find((N) => N.id === n)) == null ? void 0 : d.agent) == null ? void 0 : m.name) || $a[n] || "unknown";
  }, [$]), De = le((n) => {
    var R, j;
    const d = n.step_sessions || {}, m = Object.entries(d).find(
      ([, G]) => G.retained_for_gate === n.stage && G.retention !== "released"
    );
    let N = ((R = n.gate_review) == null ? void 0 : R.producer_step) || (m == null ? void 0 : m[0]);
    if (!N) {
      const G = l.find((Y) => Y.id === n.pipeline_id) || l.find((Y) => {
        var L;
        return Y.repo === ((L = n.source) == null ? void 0 : L.repo);
      }), M = (j = G == null ? void 0 : G.steps) != null && j.length ? G.steps : Vt, V = [
        { id: "intake", name: "Intake", type: "agent" },
        ...M.filter((Y) => Y.id !== "intake" && Y.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], se = V.findIndex((Y) => Y.id === n.stage), K = se >= 0 ? V[se] : void 0;
      if (N = K == null ? void 0 : K.reviews_step, !N && se >= 0)
        for (let Y = se - 1; Y >= 0; Y--) {
          const L = V[Y];
          if (!(L.id === "intake" || L.id === "done") && L.type !== "gate" && !L.id.startsWith("gate-")) {
            N = L.id;
            break;
          }
        }
    }
    return N;
  }, [l]), Fe = le((n) => {
    const d = De(n);
    if (!d) return;
    const m = (n.step_sessions || {})[d];
    if (!(!(m != null && m.slot_key) || m.chat_disabled_at || m.superseded))
      return {
        step: d,
        slotKey: m.slot_key,
        retained: m.retention === "held-for-gate"
      };
  }, [De]);
  Ee(() => {
    const n = async () => {
      try {
        const N = Qe.slice(0, Qe.lastIndexOf("/")), R = (N ? N + "/" : "") + "live_spawns.json", j = await t.get("/api/file-read?path=" + encodeURIComponent(R));
        Oe.current = !1;
        const G = j != null && j.at ? Date.now() - new Date(j.at).getTime() < 18e4 : !0;
        te(G && Array.isArray(j == null ? void 0 : j.runs) ? j.runs : []);
      } catch {
        Oe.current = !0, te([]);
      }
    };
    let d = 0;
    Le(!0).then(n);
    const m = setInterval(() => {
      d += 1;
      const N = d % 12 === 0;
      Le(N).then(() => {
        Oe.current || n();
      });
    }, 1e4);
    return () => clearInterval(m);
  }, [Le, t]);
  const qe = le(async () => {
    me(!0);
    let n = [];
    try {
      const m = await ce("~/.kiro/crew/config.json");
      n = wa(m == null ? void 0 : m.agents), y(n);
    } catch (m) {
      console.warn("crew roster (config.json) unreadable:", m), y([]);
    }
    const d = await Promise.all(Na(n).map(async (m) => {
      const N = _a(m, n);
      if (!N) return Qt(null, m);
      try {
        const R = await ce(N);
        return Qt(R, m, N);
      } catch {
        return Qt(null, m, N);
      }
    }));
    S(d), me(!1);
  }, [ce]), Ye = le(() => {
    ye(!0), qe();
  }, [qe]), yt = le((n) => {
    qe().then(() => I(n));
  }, [qe]), it = le(async (n) => {
    await t.post("/apps/dlc-yolo/api/agents/crew", {
      mode: n.mode,
      name: n.name,
      kiro_agent: n.kiroAgent,
      workspace: n.workspace || null,
      memory_store: n.memoryStore || null
    }), await qe();
  }, [t, qe]), fe = le(async (n) => {
    try {
      const d = await Ht(ce);
      Qe = d.path, d.data.cards = d.data.cards || [], n(d.data);
      let m = d;
      try {
        m = await Ht(ce), Qe = m.path, m.data.cards = m.data.cards || [], n(m.data);
      } catch {
        m = d;
      }
      await t.post("/api/file-write", {
        path: m.path,
        content: JSON.stringify(m.data, null, 2)
      }), Le();
    } catch (d) {
      console.error("Failed to mutate state:", d);
    }
  }, [t, Le, ce]), kt = le((n) => {
    g((d) => ({ ...d, ...n })), fe((d) => {
      d.config = { ...Lt, ...d.config || {}, ...n };
    });
  }, [fe]), wt = le((n, d, m, N) => {
    const R = (/* @__PURE__ */ new Date()).toISOString(), j = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    fe((G) => {
      var Y;
      const M = G.cards.find((L) => L.id === n);
      if (!M || M.stage !== d) return;
      if (N === void 0 && m.type === "interject") {
        const L = m.text.trim();
        if (!L) return;
        M.interjection = M.interjection || [], M.interjection.some((Re) => Re.id === j) || M.interjection.push({
          id: j,
          at: R,
          step: d,
          kind: m.kind,
          text: L,
          by: "user",
          status: "pending"
        }), M.updated_at = R;
        return;
      }
      if ((((Y = M.gate_review) == null ? void 0 : Y.result_revision) ?? null) !== N) return;
      const se = m.type === "reject" ? m.reason.trim() : void 0, K = m.type === "interject" ? m.text.trim() : void 0;
      m.type === "reject" && !se || m.type === "interject" && !K || (M.gate_commands = M.gate_commands || [], M.gate_commands.some((L) => L.id === j) || M.gate_commands.push({
        id: j,
        gate: d,
        action: m.type,
        expected_revision: N ?? null,
        actor: "user",
        at: R,
        status: "pending",
        ...se ? { reason: se } : {},
        ...m.type === "interject" ? { kind: m.kind, text: K } : {}
      }), M.updated_at = R);
    });
  }, [fe]), Nt = le((n, d, m) => {
    const N = (/* @__PURE__ */ new Date()).toISOString(), R = va();
    fe((j) => {
      const G = j.cards.find((V) => V.id === n);
      if (!G) return;
      let M;
      try {
        M = ba({ id: R, kind: d, text: m, card: G, now: N });
      } catch {
        return;
      }
      G.interjection = xa(G.interjection, M), G.updated_at = N;
    });
  }, [fe]), _t = le((n) => {
    if (!window.confirm("Cancel this card? Writes are revoked cooperatively — a live turn may not stop immediately, and its worktree is retained until terminal observation.")) return;
    const d = (/* @__PURE__ */ new Date()).toISOString();
    fe((m) => {
      const N = m.cards.find((R) => R.id === n);
      N && (N.lifecycle = "cancelled", N.writes_allowed = !1, N.cancel_requested_at = d, N.updated_at = d);
    });
  }, [fe]), at = le((n, d) => {
    fe((m) => {
      const N = m.cards.find((j) => j.id === n);
      if (!N) return;
      const R = (N.decisions || []).find((j) => j.id === d);
      R && (R.chosen = "acknowledged", R.status = "acknowledged", R.resolved_at = (/* @__PURE__ */ new Date()).toISOString()), N.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [fe]), Zt = le(async (n) => {
    var N, R, j;
    const m = ((G) => {
      var se;
      const M = G == null ? void 0 : G.orchestrator_session;
      if (M != null && M.slot_key) return M.slot_key;
      if (M != null && M.session_key) return M.session_key.replace(/^cron:/, "cron-");
      const V = (se = l.find((K) => K.id === (G == null ? void 0 : G.pipeline_id))) == null ? void 0 : se.orchestrator_session;
      return (V == null ? void 0 : V.slot_key) || (V != null && V.session_key ? V.session_key.replace(/^cron:/, "cron-") : void 0);
    })(n);
    if (m) {
      r(`/chat?sid=${encodeURIComponent(m)}`);
      return;
    }
    try {
      const G = await t.post("/apps/dlc-yolo/api/orchestrator/trigger", { card_id: n.id });
      if (G != null && G.slot_key) {
        r(`/chat?sid=${encodeURIComponent(G.slot_key)}`);
        return;
      }
    } catch {
    }
    for (let G = 0; G < 8; G++) {
      await new Promise((M) => setTimeout(M, 2e3));
      try {
        const M = await ir(ce, Qe), V = (M.data.cards || []).find((Y) => Y.id === n.id), se = (N = (M.data.pipelines || []).find((Y) => Y.id === (V == null ? void 0 : V.pipeline_id))) == null ? void 0 : N.orchestrator_session, K = ((R = V == null ? void 0 : V.orchestrator_session) == null ? void 0 : R.slot_key) || (((j = V == null ? void 0 : V.orchestrator_session) == null ? void 0 : j.session_key) || (se == null ? void 0 : se.session_key) || "").replace(/^cron:/, "cron-") || (se == null ? void 0 : se.slot_key);
        if (K) {
          Le(), r(`/chat?sid=${encodeURIComponent(K)}`);
          return;
        }
      } catch {
      }
    }
    Le();
  }, [t, r, ce, Le]), Jt = le((n) => {
    fe((d) => {
      var R;
      const m = d.cards.find((j) => j.id === n);
      if (!m) return;
      const N = m.trust || ((R = d.config) == null ? void 0 : R.trust) || Lt.trust;
      m.trust = st[(st.indexOf(N) + 1) % st.length], m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [fe]), qt = le((n) => {
    fe((d) => {
      var R;
      const m = d.cards.find((j) => j.id === n);
      if (!m) return;
      const N = m.depth || ((R = d.config) == null ? void 0 : R.depth) || Lt.depth;
      m.depth = xt[(xt.indexOf(N) + 1) % xt.length], m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [fe]), It = le((n, d) => {
    fe((m) => {
      const N = m.cards.find((R) => R.id === n);
      N && (d ? N.budget = { ...d } : delete N.budget, N.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [fe]), Mt = le((n) => {
    k((d) => {
      const m = new Set(d);
      return m.has(n) ? m.delete(n) : m.add(n), m;
    });
  }, []), Ct = le(() => k(/* @__PURE__ */ new Set()), []), St = le(async () => {
    const n = qe(), d = [];
    try {
      const m = await t.get("/api/file-read?path=~/.kiro/crew/config.json"), N = (m == null ? void 0 : m.workspaces) || {};
      Object.entries(N).forEach(([R, j]) => {
        const G = typeof (j == null ? void 0 : j.repo) == "string" && /^[^/\s]+\/[^/\s]+$/.test(j.repo) ? j.repo : "";
        d.push({
          repo: G,
          workspace: R,
          label: R,
          source: "workspace",
          detail: (j == null ? void 0 : j.dir) || R,
          path: typeof (j == null ? void 0 : j.dir) == "string" ? j.dir : void 0
        });
      });
    } catch (m) {
      console.warn("workspaces registry unreadable:", m);
    }
    try {
      const m = await t.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((m == null ? void 0 : m.repos) || []).forEach((N) => {
        N != null && N.owner && (N != null && N.repo) && d.push({ repo: `${N.owner}/${N.repo}`, source: "issue-radar", detail: `${N.provider || "github"} · ${N.host || "github.com"}` });
      });
    } catch (m) {
      console.warn("issue-radar config unreadable (app may not be installed):", m);
    }
    B(d), await n, q(!0);
  }, [t, qe]), $t = le(async (n) => {
    const d = (/* @__PURE__ */ new Date()).toISOString(), m = "pl-" + Math.random().toString(36).slice(2, 10);
    await fe((N) => {
      N.pipelines = N.pipelines || [];
      const R = N.pipelines.find((j) => j.repo === n.repo);
      R ? (R.source = n.source, R.workspace = n.workspace, n.repo_path ? R.repo_path = n.repo_path : delete R.repo_path, R.trust = n.trust, R.depth = n.depth, n.budget ? R.budget = n.budget : delete R.budget, R.backlog_intake = n.backlog_intake, R.results_in_repo = n.results_in_repo, R.conversation_log = n.conversation_log, n.trusted_authors.length ? R.trusted_authors = n.trusted_authors : delete R.trusted_authors, R.self_enabling = n.self_enabling, R.approach = n.approach, n.sync_mode ? R.sync_mode = n.sync_mode : delete R.sync_mode, R.steps = n.steps) : N.pipelines.push({
        id: m,
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
        created_at: d
      });
    }), q(!1), I(null), k(/* @__PURE__ */ new Set([n.repo]));
  }, [fe]), Dt = le(async (n) => {
    await fe((d) => {
      d.pipelines = (d.pipelines || []).filter((m) => m.repo !== n), d.cards = (d.cards || []).filter((m) => {
        var N;
        return (((N = m.source) == null ? void 0 : N.repo) || "unlinked") !== n;
      });
    }), k((d) => {
      const m = new Set(d);
      return m.delete(n), m;
    });
  }, [fe]), ct = Ce(() => {
    const n = /* @__PURE__ */ new Set(["retired", "cancelled", "canceled", "merged", "superseded"]);
    return W.reduce((d, m) => (d[m] = ae.filter((N) => N.stage === m && !n.has(String(N.lifecycle || ""))), d), {});
  }, [ae, W]), dt = Ce(
    () => ae.filter((n) => ["retired", "merged"].includes(String(n.lifecycle || ""))),
    [ae]
  ), pt = Ce(
    () => ae.filter((n) => ["cancelled", "canceled", "superseded"].includes(String(n.lifecycle || ""))),
    [ae]
  ), Bt = le((n) => {
    var d;
    (d = document.getElementById(`stage-col-${n}`)) == null || d.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), Tt = Ce(() => {
    const n = {};
    return ae.forEach((d) => {
      var N;
      const m = ((N = d.source) == null ? void 0 : N.repo) || "unlinked";
      (n[m] || (n[m] = [])).push(d);
    }), n;
  }, [ae]), Rt = Ce(() => {
    const n = {};
    return ae.forEach((d) => {
      const m = Xe(d.stage);
      (n[m] || (n[m] = [])).push(d);
    }), n;
  }, [ae, Xe]), zt = Ce(() => {
    const n = Object.fromEntries(dr.map((d) => [d, []]));
    return ae.forEach((d) => {
      var j, G;
      const m = l.find((M) => M.id === d.pipeline_id) || l.find((M) => {
        var V;
        return M.repo === ((V = d.source) == null ? void 0 : V.repo);
      }), N = ((G = (j = m == null ? void 0 : m.steps) == null ? void 0 : j.find((M) => M.id === d.stage)) == null ? void 0 : G.type) === "gate" || ke(d.stage), R = pe.some((M) => M.cardId === d.id && M.step === d.stage && M.live);
      n[mr(d, { isGate: N, liveObserved: R }).kind].push(d);
    }), Object.fromEntries(dr.filter((d) => n[d].length > 0).map((d) => [_r[d].label, n[d]]));
  }, [ae, l, ke, pe]), ut = /* @__PURE__ */ new Set(["retired", "merged", "cancelled", "canceled", "superseded"]), h = ae.filter((n) => !ut.has(String(n.lifecycle || ""))).length, T = ae.filter((n) => ke(n.stage) && !ut.has(String(n.lifecycle || ""))).length, ge = ae.filter((n) => ut.has(String(n.lifecycle || ""))).length, be = ae.reduce((n, d) => {
    var m;
    return n + (((m = d.parked) == null ? void 0 : m.length) || 0);
  }, 0), de = {
    pipeline: ae.length,
    workspace: Object.keys(Tt).length,
    crew: Object.keys(Rt).length,
    status: ae.length,
    backlog: be
  }, He = pe.some((n) => {
    var d, m;
    return !!n.slotKey && ((d = ve[n.slotKey]) == null ? void 0 : d.active) && ((m = ve[n.slotKey]) == null ? void 0 : m.phase) === "generating";
  }), Pt = pe.some((n) => {
    var d, m;
    return !!n.slotKey && ((d = ve[n.slotKey]) == null ? void 0 : d.active) && ((m = ve[n.slotKey]) == null ? void 0 : m.phase) === "thinking";
  }), mt = (n) => {
    var L, Re, Pe, We;
    const d = l.find((ne) => ne.id === n.pipeline_id) || l.find((ne) => {
      var re;
      return ne.repo === ((re = n.source) == null ? void 0 : re.repo);
    }), m = ((Re = (L = d == null ? void 0 : d.steps) == null ? void 0 : L.find((ne) => ne.id === n.stage)) == null ? void 0 : Re.type) === "gate" || ke(n.stage), N = ["cancelled", "canceled", "retired", "merged", "superseded"].includes(String(n.lifecycle || "")), R = m && !N, j = R ? ((Pe = n.gate_review) == null ? void 0 : Pe.result_revision) ?? null : void 0, G = R ? De(n) : void 0, M = R ? Fe(n) : void 0, V = pe.some((ne) => ne.cardId === n.id && ne.step === n.stage && ne.live), se = mr(n, { isGate: R, liveObserved: V }), K = (We = d == null ? void 0 : d.steps) == null ? void 0 : We.find((ne) => ne.id === n.stage), Y = n.capability || (K == null ? void 0 : K.capability) || "auto-derived";
    return {
      card: n,
      config: c,
      isGate: R,
      cardStatus: se,
      effectiveCapability: Y,
      producerStep: G,
      producerSession: M,
      onOpenProducer: M ? () => r(`/chat?sid=${encodeURIComponent(M.slotKey)}`) : void 0,
      onApprove: R ? () => wt(n.id, n.stage, { type: "approve" }, j) : void 0,
      onReject: R ? (ne) => wt(n.id, n.stage, { type: "reject", reason: ne }, j) : void 0,
      onCycleTrust: () => Jt(n.id),
      onCycleDepth: () => qt(n.id),
      onSetBudget: (ne) => It(n.id, ne),
      onInterject: (ne, re) => wt(
        n.id,
        n.stage,
        { type: "interject", kind: ne, text: re },
        j
      ),
      onResolveDecision: (ne) => at(n.id, ne),
      onOpenOrchestrator: () => Zt(n),
      liveView: (() => {
        var Ie, nt;
        const ne = (nt = (Ie = n.step_sessions) == null ? void 0 : Ie[n.stage]) == null ? void 0 : nt.slot_key, re = ne ? ve[ne] : void 0, Ue = pe.some((At) => At.cardId === n.id && At.step === n.stage && At.live);
        if (!(!ne || !(re != null && re.active) && !Ue))
          return {
            stage: n.stage,
            phase: (re == null ? void 0 : re.phase) || "running",
            tail: (re == null ? void 0 : re.tail) || "",
            active: !!(re != null && re.active) && Ue,
            seq: (re == null ? void 0 : re.seq) || 0,
            slotKey: ne,
            onOpen: () => r(`/chat?sid=${encodeURIComponent(ne)}`)
          };
      })(),
      allCards: ae,
      onRequest: (ne, re) => Nt(n.id, ne, re),
      onOpenStepSession: (() => {
        const ne = n.step_sessions;
        if (!ne || typeof ne != "object") return;
        const re = Object.entries(ne).map(([Ue, Ie]) => {
          const nt = (Ie == null ? void 0 : Ie.slot_key) || (Ie != null && Ie.session_key ? Ie.session_key.replace(/^cron:/, "cron-") : void 0);
          return nt ? { step: Ue, open: () => r(`/chat?sid=${encodeURIComponent(nt)}`) } : null;
        }).filter((Ue) => Ue !== null);
        return re.length ? re : void 0;
      })(),
      onCancelCard: () => _t(n.id),
      onOpenCard: (ne) => {
        const re = document.getElementById(`card-${ne}`);
        if (re) {
          re.scrollIntoView({ behavior: "smooth", block: "center" });
          const Ue = re.style.outline;
          re.style.outline = "2px solid var(--accent)", setTimeout(() => {
            re.style.outline = Ue;
          }, 1400);
        }
      }
    };
  };
  return /* @__PURE__ */ a(ze, { children: [
    /* @__PURE__ */ e(Or, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    he && /* @__PURE__ */ e(
      ar,
      {
        profiles: J,
        crews: X,
        loading: ie,
        context: x.size === 1 ? [...x][0] : void 0,
        onRefresh: () => {
          qe();
        },
        onSaveCrew: it,
        onClose: () => ye(!1)
      }
    ),
    z && /* @__PURE__ */ e(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (n) => {
          n.currentTarget === n.target && ee(!1);
        },
        children: /* @__PURE__ */ a(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Pipeline event tree",
            className: "flex flex-col rounded-xl overflow-hidden",
            style: { width: "min(920px, calc(100vw - 32px))", maxHeight: "min(88vh, 900px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
            children: [
              /* @__PURE__ */ a("header", { className: "px-5 py-3.5 flex items-center gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ e("h2", { className: "text-[15px] font-semibold flex-1", style: { color: "var(--text-strong, var(--text))" }, children: "🌲 Pipeline event tree" }),
                /* @__PURE__ */ e("button", { onClick: () => ee(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
              ] }),
              /* @__PURE__ */ e("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ e(
                Ma,
                {
                  pipeline: l.find((n) => ae.some((d) => d.pipeline_id === n.id)) || l[0],
                  cards: ae,
                  extras: u,
                  onOpenCard: (n) => {
                    ee(!1), b("pipeline"), setTimeout(() => {
                      const d = document.getElementById(`card-${n}`);
                      if (d) {
                        d.scrollIntoView({ behavior: "smooth", block: "center" });
                        const m = d.style.outline;
                        d.style.outline = "2px solid var(--accent)", setTimeout(() => {
                          d.style.outline = m;
                        }, 1400);
                      }
                    }, 80);
                  }
                }
              ) })
            ]
          }
        )
      }
    ),
    $e && /* @__PURE__ */ e(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (n) => {
          n.currentTarget === n.target && Te(!1);
        },
        children: /* @__PURE__ */ a(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Backlog",
            className: "flex flex-col rounded-xl overflow-hidden",
            style: { width: "min(820px, calc(100vw - 32px))", maxHeight: "min(88vh, 900px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
            children: [
              /* @__PURE__ */ a("header", { className: "px-5 py-3.5 flex items-center gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("h2", { className: "text-[15px] font-semibold flex-1", style: { color: "var(--text-strong, var(--text))" }, children: [
                  "📋 Backlog",
                  be ? ` · ${be}` : ""
                ] }),
                /* @__PURE__ */ e("button", { onClick: () => Te(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
              ] }),
              /* @__PURE__ */ e("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ e(Da, { cards: ae }) })
            ]
          }
        )
      }
    ),
    _e && /* @__PURE__ */ e(
      Ea,
      {
        cards: ae,
        schedulerState: u.scheduler_state,
        statePath: Qe,
        readAppFile: ce,
        onClose: () => _(!1)
      }
    ),
    Se && /* @__PURE__ */ e(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (n) => {
          n.currentTarget === n.target && Q(!1);
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
                    /* @__PURE__ */ e("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: pe.length })
                  ] }),
                  /* @__PURE__ */ e("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "Live activity from enabled chats linked to pipeline cards." })
                ] }),
                /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => Q(!1),
                    "aria-label": "Close agent sessions",
                    className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                    style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ e("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: pe.length === 0 ? /* @__PURE__ */ e("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : pe.map((n) => {
                const d = n.slotKey ? ve[n.slotKey] : void 0;
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
                      (d == null ? void 0 : d.active) && d.phase === "thinking" && /* @__PURE__ */ a("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                        /* @__PURE__ */ e(ft, { size: 13 }),
                        /* @__PURE__ */ e("span", { children: "Thinking" })
                      ] }),
                      (d == null ? void 0 : d.active) && d.phase === "generating" && d.tail && /* @__PURE__ */ a("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                        /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                        /* @__PURE__ */ a("span", { className: "font-mono text-[11px] truncate", children: [
                          "Generating · …",
                          d.tail
                        ] })
                      ] }),
                      n.slotKey && /* @__PURE__ */ a(
                        "button",
                        {
                          className: "mt-2 ml-4 font-mono",
                          style: { color: "var(--muted)", fontSize: 10, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
                          title: `Copy openable slot ${n.slotKey} (${n.sessionName || n.sessionKey}); open it from Chats`,
                          onClick: () => {
                            var m;
                            try {
                              (m = navigator.clipboard) == null || m.writeText(n.slotKey || "");
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
    D && /* @__PURE__ */ e(
      xr,
      {
        candidates: C,
        existingRepos: new Set(l.map((n) => n.repo)),
        defaults: c,
        agentProfiles: J,
        crews: X,
        onCreate: $t,
        onSaveCrew: it,
        onClose: () => q(!1)
      }
    ),
    A && /* @__PURE__ */ e(
      xr,
      {
        candidates: C,
        existingRepos: new Set(l.map((n) => n.repo)),
        defaults: c,
        agentProfiles: J,
        crews: X,
        editPipeline: l.find((n) => n.repo === A) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + A, repo: A, source: "manual", trust: c.trust, depth: c.depth, backlog_intake: !0, sot: "github", steps: Vt.map((n) => ({ ...n })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: o.filter((n) => {
          var d;
          return (((d = n.source) == null ? void 0 : d.repo) || "unlinked") === A;
        }).length,
        isExample: Rr.has(A),
        onCreate: $t,
        onSaveCrew: it,
        onDelete: Dt,
        onClose: () => I(null)
      }
    ),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ e(Ta, { steps: $, cardsByStage: ct, onNodeClick: Bt }),
      /* @__PURE__ */ a("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3", children: [
        /* @__PURE__ */ e(Wt, { label: "Active", value: String(h), accent: !0 }),
        /* @__PURE__ */ e(Wt, { label: "Gated", value: String(T) }),
        /* @__PURE__ */ e(Wt, { label: "Done", value: String(ge) }),
        /* @__PURE__ */ e(Wt, { label: "Parked", value: String(be) })
      ] }),
      /* @__PURE__ */ e(
        ra,
        {
          repos: rt.map((n) => n.name),
          selectedRepos: [...x],
          onNewPipeline: () => {
            St();
          },
          onConfigure: yt,
          onOpenAgents: Ye
        }
      ),
      /* @__PURE__ */ a("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ e(
          Ba,
          {
            repos: rt,
            selected: x,
            onToggle: Mt,
            onClear: Ct,
            onAddWorkspace: St,
            onEdit: yt
          }
        ),
        /* @__PURE__ */ a("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ a("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ e(Ra, { active: f, onChange: b, counts: de }),
            /* @__PURE__ */ a(
              "button",
              {
                onClick: () => ee(!0),
                "aria-haspopup": "dialog",
                className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Pipeline event tree — everything happening across the pipeline",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                children: [
                  "🌲 ",
                  /* @__PURE__ */ e("span", { className: "font-semibold", children: "Tree" })
                ]
              }
            ),
            /* @__PURE__ */ a(
              "button",
              {
                onClick: () => Te(!0),
                "aria-haspopup": "dialog",
                className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Parked backlog ideas",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                children: [
                  "📋 ",
                  /* @__PURE__ */ e("span", { className: "font-semibold", children: "Backlog" }),
                  be ? /* @__PURE__ */ a("span", { style: { color: "var(--accent)" }, children: [
                    "· ",
                    be
                  ] }) : null
                ]
              }
            ),
            /* @__PURE__ */ a(
              "button",
              {
                onClick: () => _(!0),
                "aria-haspopup": "dialog",
                className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Operations — runtime, projection parity, webhook, sessions",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                children: [
                  "🛠 ",
                  /* @__PURE__ */ e("span", { className: "font-semibold", children: "Ops" })
                ]
              }
            ),
            /* @__PURE__ */ a(
              "button",
              {
                onClick: () => Q(!0),
                "aria-haspopup": "dialog",
                "aria-expanded": Se,
                className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Open enabled agent sessions and see live activity",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: He || Pt || pe.some((n) => n.status === "pending" || n.responsePending) ? "var(--accent)" : "var(--muted)" },
                children: [
                  Pt ? /* @__PURE__ */ e(ft, { size: 11 }) : /* @__PURE__ */ e(
                    "span",
                    {
                      className: He || pe.some((n) => n.status === "pending" || n.responsePending) ? "inline-block animate-pulse" : "inline-block",
                      style: { width: 7, height: 7, borderRadius: 999, background: He ? "var(--ok)" : pe.some((n) => n.responsePending) ? "var(--warn)" : pe.some((n) => n.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: pe.length ? 1 : 0.5 }
                    }
                  ),
                  /* @__PURE__ */ e("span", { className: "font-semibold", children: pe.length ? `${pe.length} session${pe.length === 1 ? "" : "s"}` : "no sessions" }),
                  Pt && /* @__PURE__ */ e("span", { children: "· thinking" }),
                  He && /* @__PURE__ */ e("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                  !Pt && !He && pe.filter((n) => n.status === "pending").length > 0 && /* @__PURE__ */ a("span", { children: [
                    "· ",
                    pe.filter((n) => n.status === "pending").length,
                    " running"
                  ] }),
                  pe.some((n) => n.responsePending) && /* @__PURE__ */ e("span", { style: { color: "var(--warn)" }, children: "· response" }),
                  pe.some((n) => n.stale) && /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
                    "· ",
                    pe.filter((n) => n.stale).length,
                    " stale ↻"
                  ] })
                ]
              }
            ),
            x.size > 0 && /* @__PURE__ */ a(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  x.size === 1 ? [...x][0] : `${x.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ e("button", { onClick: Ct, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ e(qa, { config: c, onSet: kt }),
          v ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : /* @__PURE__ */ a("div", { ref: we, className: "flex gap-3 overflow-x-auto pb-4", children: [
            f === "pipeline" && $.map((n) => /* @__PURE__ */ e(bt, { id: `stage-col-${n.id}`, title: n.name, count: (ct[n.id] || []).length, children: (ct[n.id] || []).map((d) => /* @__PURE__ */ e(gt, { ...mt(d) }, d.id)) }, n.id)),
            f === "pipeline" && dt.length > 0 && /* @__PURE__ */ e("div", { className: "flex-shrink-0 pl-3", style: { borderLeft: "2px dashed var(--border-strong, var(--border))" }, children: /* @__PURE__ */ e(bt, { id: "stage-col-done", title: "✅ Done", count: dt.length, children: dt.map((n) => /* @__PURE__ */ e(gt, { ...mt(n) }, n.id)) }) }),
            f === "pipeline" && pt.length > 0 && /* @__PURE__ */ e(bt, { id: "stage-col-cancelled", title: "⏹ Cancelled", count: pt.length, children: pt.map((n) => /* @__PURE__ */ e(gt, { ...mt(n) }, n.id)) }),
            f === "workspace" && Object.entries(Tt).map(([n, d]) => /* @__PURE__ */ e(bt, { title: n, count: d.length, children: d.map((m) => /* @__PURE__ */ e(gt, { ...mt(m) }, m.id)) }, n)),
            f === "crew" && Object.entries(Rt).map(([n, d]) => /* @__PURE__ */ e(bt, { title: n, count: d.length, children: d.map((m) => /* @__PURE__ */ e(gt, { ...mt(m) }, m.id)) }, n)),
            f === "status" && Object.entries(zt).map(([n, d]) => /* @__PURE__ */ e(bt, { title: n, count: d.length, children: d.map((m) => /* @__PURE__ */ e(gt, { ...mt(m) }, m.id)) }, n))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  Ja as default
};
