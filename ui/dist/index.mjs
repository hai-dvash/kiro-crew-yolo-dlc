import { jsx as t, Fragment as Xe, jsxs as n } from "react/jsx-runtime";
import { useChatLauncher as Ar, useAppApi as Rr, useNavigate as zr } from "@kirocrew/app-sdk";
import { PageHeader as Fr, StatCard as Yt } from "@kirocrew/app-sdk/ui";
import { useState as N, useCallback as se, useEffect as qe, useMemo as Te, useRef as De } from "react";
import { createPortal as Pr } from "react-dom";
const pr = 16e3, Tr = (() => {
  try {
    const e = Number(typeof localStorage < "u" && localStorage.getItem("dlc-live-buffer-chars"));
    return Number.isFinite(e) && e >= 512 ? e : pr;
  } catch {
    return pr;
  }
})(), Ur = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), Wr = /^[.,!?;:%)\]}]$/u, Hr = /^[(\[{]$/u;
function Gr(e, r = 3) {
  const a = (String(e || "").match(Ur) || []).slice(-Math.max(0, r));
  return a.reduce((l, d, m) => {
    if (m === 0) return d;
    const i = a[m - 1];
    return Wr.test(d) || Hr.test(i) ? l + d : l + " " + d;
  }, "");
}
function ur(e, r = !1) {
  return e != null && e.active && !r ? e : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function sr(e, r, o) {
  if (!r || e != null && e.active && Number.isFinite(o) && Number.isFinite(e.seq) && o <= e.seq)
    return e;
  const l = ((e != null && e.active ? e.buffer : "") + r).slice(-Tr);
  return { buffer: l, tail: Gr(l, 3), active: !0, phase: "generating", seq: Number(o) || 0 };
}
function mr(e) {
  return e && { ...e, active: !1, phase: "idle" };
}
function Kr(e) {
  if (!e || typeof e != "object") return null;
  const r = Array.isArray(e.lines) ? e.lines : [];
  if (!r.length) return null;
  const o = r.map((d, m) => ({ l: d, _i: m })).sort((d, m) => {
    var f, h, w, b;
    const i = (Number((f = d.l) == null ? void 0 : f.seq) || 0) - (Number((h = m.l) == null ? void 0 : h.seq) || 0);
    if (i) return i;
    const c = String(((w = d.l) == null ? void 0 : w.at) || "").localeCompare(String(((b = m.l) == null ? void 0 : b.at) || ""));
    return c || d._i - m._i;
  }).map((d) => d.l), a = o.map((d) => String((d == null ? void 0 : d.note) || "")).filter(Boolean).join(" · ").slice(-Tr);
  if (!a) return null;
  const l = o[o.length - 1] || {};
  return {
    buffer: a,
    tail: a,
    // whole trail suffix — it is already short, human sentences
    active: !0,
    phase: String(l.phase || "running"),
    seq: Number(l.seq) || o.length,
    source: "progress-trail"
  };
}
const Vr = /* @__PURE__ */ new Set(["done", "advanced"]), Xr = /* @__PURE__ */ new Set([
  "done",
  "advanced",
  "completed",
  "consumed",
  "integrated",
  "waived",
  "omitted"
]), st = (e) => !!e && typeof e == "object" && !Array.isArray(e), X = (e) => st(e) ? e : {}, we = (e) => Array.isArray(e) ? e : e == null ? [] : [e], U = (...e) => e.find((r) => r != null && r !== "");
function ft(e) {
  if (e == null || e === "") return "unobservable";
  if (typeof e == "boolean") return e ? "yes" : "no";
  if (typeof e == "string" || typeof e == "number") return String(e);
  if (Array.isArray(e)) return e.length ? e.map(ft).join(" · ") : "none";
  if (st(e)) {
    const r = Object.entries(e);
    return r.length ? r.map(([o, a]) => `${o}: ${ft(a)}`).join(" · ") : "none";
  }
  return String(e);
}
function ut(e) {
  return we(e).map((r, o) => {
    if (!st(r))
      return { key: `item-${o}`, title: ft(r), detail: null, status: null, level: null, ref: null, url: null };
    const a = U(
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
    ) || `item ${o + 1}`, l = U(
      r.summary,
      r.detail,
      r.description,
      r.rationale,
      r.result,
      r.note,
      r.reason,
      r.path,
      r.ref
    ), d = U(
      r.enforcement,
      r.level,
      r.priority,
      r.required === !0 ? "required" : void 0
    ), m = U(
      r.status,
      r.outcome,
      r.state,
      r.passed === !0 ? "passed" : void 0,
      r.passed === !1 ? "failed" : void 0
    ), i = U(r.url, r.path, r.ref), c = typeof i == "string" && /^https?:\/\//.test(i) ? i : null;
    return {
      key: String(U(r.id, r.key, r.path, r.ref, `item-${o}`)),
      title: String(a),
      detail: l == null || String(l) === String(a) ? null : ft(l),
      status: m == null ? null : String(m),
      level: d == null ? null : String(d),
      ref: i == null ? null : String(i),
      url: c
    };
  });
}
function Yr(e) {
  return we(e).filter((r) => r != null).map((r, o) => {
    const a = X(r), l = st(r) ? U(a.url, a.path, a.ref, a.id) : String(r), d = st(r) ? U(a.label, a.name, a.kind, a.id, a.path, a.ref, `artifact ${o + 1}`) : String(r), m = U(a.url, typeof l == "string" && /^https?:\/\//.test(l) ? l : void 0), i = U(a.preview, a.summary, a.description, a.evidence, a.detail);
    return {
      key: String(U(a.id, a.path, a.ref, `artifact-${o}`)),
      label: String(d),
      ref: l == null ? null : String(l),
      url: typeof m == "string" && /^https?:\/\//.test(m) ? m : null,
      preview: i == null ? null : ft(i),
      kind: a.kind == null ? null : String(a.kind),
      status: a.status == null ? null : String(a.status)
    };
  });
}
function Zr(e) {
  return we(e.children).map((o, a) => {
    const l = X(o), d = l.required !== !1 && !["optional", "preferred", "advisory"].includes(
      String(U(l.enforcement, l.level, "required")).toLowerCase()
    ), m = String(U(l.status, l.state, "unobservable"));
    return {
      key: String(U(l.id, l.card_id, l.issue, `child-${a}`)),
      label: String(U(l.title, l.name, l.card_id, l.id, l.issue, `child ${a + 1}`)),
      required: d,
      status: m,
      complete: Xr.has(m.toLowerCase())
    };
  });
}
const jr = /* @__PURE__ */ new Set([
  "done",
  "completed",
  "covered",
  "satisfied",
  "validated",
  "met",
  "passed",
  "approved"
]);
function Jr(e, r) {
  const o = X(e == null ? void 0 : e.execution_envelope);
  return o.step === r ? o : we(e == null ? void 0 : e.execution_envelope_history).map(X).reverse().find((a) => a.step === r) || {};
}
function Er(e) {
  return typeof e == "string" ? e.trim().length > 0 : st(e) ? [
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
  ].some((r) => e[r] !== void 0 && e[r] !== null && e[r] !== "" && (!Array.isArray(e[r]) || e[r].length > 0)) : !1;
}
function gr(e, r) {
  const o = we(e.validation_and_evidence).map(X);
  return we(r).map(String).filter((a) => !o.some((l) => {
    const d = String(U(l.kind, l.type, l.id, "")).toLowerCase(), m = String(U(l.status, "")).toLowerCase();
    return (d === a.toLowerCase() || we(l.satisfies).map(String).includes(a)) && jr.has(m) && Er(l);
  }));
}
function Qr(e, r) {
  const o = we(e.findings).map(X);
  if (!o.length) return !1;
  if (!r) return !0;
  const a = we(U(e.sources, e.consulted_sources)).map(X).filter((d) => typeof d.url == "string" && /^https?:\/\//.test(d.url) && d.title && d.accessed_at && U(d.source_type, d.type)), l = new Set(a.flatMap((d) => [d.id && String(d.id), d.url]).filter(Boolean));
  return l.size > 0 && o.every((d) => {
    const m = we(U(d.source_ids, d.sources)).map(String);
    return d.claim && m.some((i) => l.has(i));
  });
}
function en(e, r, o, a) {
  const l = X(e == null ? void 0 : e.intent_integrity), d = l.status === "violation" ? [`intent integrity (${we(l.violations).join(", ")})`] : [], m = Jr(e, r), i = we(X(m.observations).controls_runtime);
  if (Number(m.schema_version || 0) < 2 || !i.includes("result_scope"))
    return { missing: d, preferredShortfalls: [] };
  const c = [...d], f = [];
  o.envelope_id !== m.id && c.push("result bound to the active envelope revision");
  const h = we(e == null ? void 0 : e.decisions).map(X).filter((k) => k.step && k.step !== r || k.envelope_id && k.envelope_id !== m.id ? !1 : k.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(k.kind)), w = h.filter((k) => {
    const re = String(U(k.status, "")).toLowerCase();
    return k.chosen === void 0 && k.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(re);
  }), b = X(m.questions);
  w.length && c.push("all qualified questions resolved before completion"), w.length > 1 && b.cadence === "one-at-a-time" && c.push("one-at-a-time question cadence"), Number.isInteger(b.max_rounds) && h.length > b.max_rounds && c.push(`question rounds within max_rounds=${b.max_rounds}`);
  const v = X(m.result_scope), x = X(v.enforcement), y = new Map(we(a.intent_and_requirement_coverage).map(X).filter((k) => U(k.intent_id, k.constraint_id, k.id)).map((k) => [String(U(k.intent_id, k.constraint_id, k.id)), k]));
  for (const k of [...we(v.required_outcome_ids), ...we(v.hard_constraint_ids)]) {
    const re = y.get(String(k)) || {}, T = String(U(re.status, "")).toLowerCase(), ye = we(U(re.evidence_refs, re.requirement_refs, re.refs));
    (!jr.has(T) || !ye.some(Er)) && c.push(`required intent coverage ${k}`);
  }
  const B = we(a.alternatives);
  if (Number.isInteger(v.alternatives) && B.length < v.alternatives) {
    const k = `${v.alternatives} material alternatives`;
    x.alternatives === "required" ? c.push(k) : x.alternatives === "preferred" && f.push(k);
  }
  const O = gr(a, v.evidence), E = gr(a, v.validation);
  x.evidence === "required" ? c.push(...O.map((k) => `required evidence ${k.toLowerCase()}`)) : x.evidence === "preferred" && f.push(...O.map((k) => `preferred evidence ${k.toLowerCase()}`)), x.validation === "required" ? c.push(...E.map((k) => `required validation ${k.toLowerCase()}`)) : x.validation === "preferred" && f.push(...E.map((k) => `preferred validation ${k.toLowerCase()}`));
  const F = X(m.research_policy), $ = X(e == null ? void 0 : e.research_artifacts)[r], P = we(U(a.research_and_citations, $)).map(X), J = P.filter((k) => Qr(
    k,
    F.citations === "required"
  ));
  return F.mode === "required" && !J.length && c.push("required research with claim-level citations"), Number.isInteger(F.max_passes) && P.length > F.max_passes && c.push(`research passes within max_passes=${F.max_passes}`), F.mode === "on-demand" && P.length && !J.length && f.push("complete citations for used research"), {
    missing: [...new Set(c)],
    preferredShortfalls: [...new Set(f)]
  };
}
function tn(e, r, o) {
  const a = X(e.runtime_handshakes), l = X(e.runtime_handshake), d = X(a[r] || (l.step == null || l.step === r ? l : {})), m = X(d.assignment), i = X(d.capabilities), c = X(i.tools), f = X(i.skills), h = X(d.routing), w = X(h.model), b = X(h.reasoning_effort), v = X(d.scope), x = X(v.worktree), y = X(o.routing_and_provenance), B = X(y.model), O = X(y.reasoning_effort), E = X(y.assignment), F = U(c.profile_declared, c.declared, y.declared_tools), $ = U(c.actual, y.actual_tools), P = U(f.profile_declared, f.declared, y.declared_skills), J = U(f.actual, y.actual_skills);
  return {
    assignedProfile: U(
      E.assigned_profile,
      y.assigned_profile,
      m.assigned_profile
    ) ?? null,
    effectiveProfile: U(
      E.effective_profile,
      y.effective_profile,
      m.effective_profile
    ) ?? null,
    model: {
      requested: U(B.requested, y.requested_model, w.requested) ?? null,
      applied: U(B.applied, y.applied_model, w.applied) ?? null,
      provider: U(B.provider, y.resolved_provider, w.provider) ?? null,
      version: U(B.version, y.model_version, w.version) ?? null,
      status: U(
        B.status,
        y.model_resolution_status,
        w.status,
        U(B.applied, y.applied_model, w.applied) != null ? "observed" : "unobservable"
      )
    },
    effort: {
      requested: U(O.requested, y.requested_effort, b.requested) ?? null,
      applied: U(O.applied, y.applied_effort, b.applied) ?? null,
      status: U(
        O.status,
        y.effort_resolution_status,
        b.status,
        U(O.applied, y.applied_effort, b.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: F == null ? null : we(F),
      actual: $ == null ? null : we($),
      status: U(c.status, y.tools_status, $ != null ? "observed" : "unobservable")
    },
    skills: {
      declared: P == null ? null : we(P),
      actual: J == null ? null : we(J),
      status: U(f.status, y.skills_status, J != null ? "observed" : "unobservable")
    },
    network: X(v.network),
    write: X(v.write),
    worktree: Object.keys(x).length ? x : null
  };
}
function rn(e, r) {
  const o = X(e == null ? void 0 : e.gate_review), a = X(o.bundle), l = U(o.gate, e == null ? void 0 : e.stage), d = U(o.producer_step, r), m = X(e == null ? void 0 : e.step_sessions), i = Number.isInteger(o.result_revision) ? o.result_revision : null, c = U(o.status, "unobservable"), f = d ? X(e == null ? void 0 : e.step_status)[d] : void 0, h = Yr(a.artifacts), w = X(a.card_topology), b = Zr(w), v = U(w.action, "unobservable"), x = ["fan-in", "unify"].includes(String(v).toLowerCase()), y = x ? b.filter((J) => J.required && !J.complete) : [], B = [];
  (!(e != null && e.gate_review) || !st(e.gate_review)) && B.push("result bundle record"), (!o.bundle || !st(o.bundle)) && B.push("declared result bundle"), d || B.push("producer binding"), i === null && B.push("result revision"), l && (e != null && e.stage) && l !== e.stage && B.push("gate binding matches current stage"), c !== "awaiting-review" && B.push(`review status awaiting-review (currently ${c})`), Vr.has(String(f || "").toLowerCase()) || B.push(`terminal producer status (currently ${f || "unobservable"})`), U(a.summary) || B.push("result summary"), h.length === 0 && B.push("referenced artifact");
  const O = h.filter((J) => !J.ref);
  O.length > 0 && B.push(`artifact reference (${O.length} missing)`), x && b.length === 0 && B.push("declared fan-in child set"), y.length > 0 && B.push(`required child fan-in (${y.length} incomplete)`);
  const E = en(e, d, o, a);
  B.push(...E.missing);
  const F = we(e == null ? void 0 : e.decisions).filter((J) => {
    const k = X(J);
    return !k.chosen && (!d || !k.step || k.step === d);
  }), $ = ut([
    ...we(a.decisions_and_questions),
    ...F
  ]), P = tn(e || {}, d, a);
  return {
    gate: l || null,
    producerStep: d || null,
    producerSessionRef: U(
      o.producer_session_ref,
      d && st(m[d]) ? `step_sessions.${d}` : void 0
    ) || null,
    envelopeId: U(o.envelope_id) || null,
    revision: i,
    reviewStatus: c,
    createdAt: U(o.created_at) || null,
    ready: B.length === 0,
    missing: B,
    summary: U(a.summary) || null,
    changes: ut(a.changes_since_prior),
    artifacts: h,
    coverage: ut(a.intent_and_requirement_coverage),
    alternatives: ut(a.alternatives),
    research: ut(U(
      a.research_and_citations,
      d && X(e == null ? void 0 : e.research_artifacts)[d]
    )),
    preferredShortfalls: E.preferredShortfalls,
    decisions: $,
    topology: {
      action: v,
      integrationOwner: U(w.integration_owner, w.owner) || null,
      integrationStatus: U(w.integration_status, w.status) || null,
      children: b,
      incompleteRequiredChildren: y
    },
    budget: {
      allocated: X(a.budget).allocated ?? null,
      consumed: X(a.budget).consumed ?? null,
      remaining: X(a.budget).remaining ?? null
    },
    routing: P,
    validation: ut(a.validation_and_evidence),
    risks: ut(a.known_risks),
    deviations: ut(a.omissions_and_deviations)
  };
}
const nn = "~/.dlc-yolo/.statepath", vt = "~/.dlc-yolo/state.json", hr = "/tmp/dlc-yolo/state.json", nr = "/apps/dlc-yolo/api/state", an = 1, vr = 4096, on = 3072;
function sn(e) {
  let r = e;
  if (typeof e == "string") {
    if (new TextEncoder().encode(e).length > vr) return null;
    try {
      r = JSON.parse(e);
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
  if (new TextEncoder().encode(o).length > vr) return null;
  const a = Object.keys(r).sort();
  if (a.length !== 2 || a[0] !== "path" || a[1] !== "schema_version" || r.schema_version !== an || typeof r.path != "string") return null;
  const l = r.path;
  return !l.startsWith("/") || l.length === 0 || l.length > on || l.includes("\0") || l.includes("\r") || l.includes(`
`) || l.split("/").some((d) => d === "." || d === "..") ? null : l;
}
async function er(e, r) {
  const o = [];
  if (typeof r == "function")
    try {
      const a = await r(nr), l = typeof a == "string" ? JSON.parse(a) : a;
      if (l && typeof l == "object" && !Array.isArray(l) && (Array.isArray(l.cards) || Array.isArray(l.pipelines)))
        return { path: nr, data: l, source: "endpoint" };
      o.push("endpoint read returned non-card body — falling through");
    } catch (a) {
      o.push(`endpoint read FAILED (pre-restart?): ${a && a.message ? a.message : a}`);
    }
  try {
    const a = await e(nn), l = sn(a);
    if (o.push(`pointer-read OK, target=${l || "INVALID"}`), l)
      try {
        return { path: l, data: await e(l), source: "pointer" };
      } catch (d) {
        o.push(`pointer-target read FAILED: ${d && d.message ? d.message : d}`);
      }
  } catch (a) {
    o.push(`pointer read FAILED: ${a && a.message ? a.message : a}`);
  }
  try {
    return { path: vt, data: await e(vt), source: "durable" };
  } catch (a) {
    o.push(`durable read FAILED: ${a && a.message ? a.message : a}`);
  }
  try {
    return { path: hr, data: await e(hr), source: "scratch" };
  } catch (a) {
    return o.push(`scratch read FAILED: ${a && a.message ? a.message : a}`), console.warn("[dlc-yolo] all state tiers failed:", o.join(" | ")), { path: vt, data: { cards: [], pipelines: [], config: {} }, source: "unresolved" };
  }
}
async function fr(e, r, o) {
  if (typeof o == "function")
    try {
      const a = await o(nr), l = typeof a == "string" ? JSON.parse(a) : a;
      if (l && typeof l == "object" && !Array.isArray(l) && (Array.isArray(l.cards) || Array.isArray(l.pipelines)))
        return { path: nr, data: l, source: "endpoint" };
    } catch {
    }
  try {
    return { path: r, data: await e(r), source: "current" };
  } catch {
    return er(e, o);
  }
}
const ln = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
function cn(e) {
  const r = /* @__PURE__ */ new Map();
  for (const o of String(e || "").split(/[\n,]/)) {
    const a = o.trim();
    ln.test(a) && !r.has(a.toLowerCase()) && r.set(a.toLowerCase(), a);
  }
  return [...r.values()].sort((o, a) => o.toLowerCase().localeCompare(a.toLowerCase()));
}
const dn = {
  "receiver-disabled": "Enable and save the receiver above first.",
  "receiver-secret-missing": "Set a webhook secret above before exposing the port.",
  "receiver-allowlist-empty": "Add at least one allowed repository above first.",
  "receiver-port-mismatch": "Save the receiver on this port before starting the tunnel.",
  "receiver-not-listening": "The receiver is not listening yet — save it, then Refresh.",
  "receiver-config-invalid": "Repair the stored receiver configuration first."
};
function br(e) {
  return e === "listening" ? "var(--ok)" : e === "misconfigured" || e === "failed" ? "var(--danger, #ef4444)" : "var(--muted)";
}
function Dt(e) {
  const r = (e == null ? void 0 : e.message) || String(e);
  return /(?:404|not found)/i.test(r) ? "Webhook backend unavailable in the running gateway. Restart KiroCrew after syncing this app, then refresh this tab." : r;
}
function Lr() {
  var V, oe;
  const e = Rr(), [r, o] = N(null), [a, l] = N(!1), [d, m] = N("8765"), [i, c] = N(""), [f, h] = N(""), [w, b] = N(""), [v, x] = N(!1), [y, B] = N(!1), [O, E] = N(!0), [F, $] = N(!1), [P, J] = N(""), k = se((A) => {
    o(A), l(!!A.enabled), m(String(A.port || 8765)), c((A.repositories || []).join(`
`)), h(A.inbox_path || ""), B(!!A.autosync), b(""), x(!1);
  }, []), re = se(async () => {
    E(!0), J("");
    try {
      k(await e.get("/apps/dlc-yolo/api/webhook/config"));
    } catch (A) {
      J(Dt(A));
    } finally {
      E(!1);
    }
  }, [e, k]);
  qe(() => {
    re();
  }, [re]);
  const [T, ye] = N(null), [pe, he] = N(!1), Ne = se(async () => {
    try {
      ye(await e.get("/apps/dlc-yolo/api/tunnel/status"));
    } catch {
      ye(null);
    }
  }, [e]);
  qe(() => {
    Ne();
  }, [Ne]);
  const je = se(async () => {
    he(!0);
    try {
      ye(await e.post("/apps/dlc-yolo/api/tunnel/start", {}));
    } catch (A) {
      J(Dt(A));
    } finally {
      he(!1);
    }
  }, [e]), ee = se(async () => {
    he(!0);
    try {
      ye(await e.post("/apps/dlc-yolo/api/tunnel/stop", {}));
    } catch (A) {
      J(Dt(A));
    } finally {
      he(!1);
    }
  }, [e]), [H, ne] = N(null), [Ee, Le] = N(!1), Ae = se(async () => {
    try {
      ne(await e.get("/apps/dlc-yolo/api/crons/status"));
    } catch {
      ne(null);
    }
  }, [e]);
  qe(() => {
    Ae();
  }, [Ae]);
  const C = se(async (A) => {
    Le(!0);
    try {
      const le = A ? "/apps/dlc-yolo/api/crons/pause" : "/apps/dlc-yolo/api/crons/resume";
      ne(await e.post(le, {}));
    } catch (le) {
      J(Dt(le));
    } finally {
      Le(!1);
    }
  }, [e]), K = Te(() => cn(i), [i]), ae = Number(d), Ce = typeof TextEncoder > "u" ? w.length : new TextEncoder().encode(w).length, Ue = !!(r != null && r.secret_configured) || Ce >= 32, ce = Number.isInteger(ae) && ae >= 1024 && ae <= 65535 && (!a || K.length > 0 && Ue) && (!f.trim() || f.trim().startsWith("/")), te = async () => {
    if (!(!(r != null && r.editable) || !ce)) {
      $(!0), J("");
      try {
        const A = {
          enabled: a,
          port: ae,
          repositories: K,
          inbox_path: f.trim() || null,
          clear_secret: v,
          autosync: y
        };
        w && (A.secret = w), k(await e.post("/apps/dlc-yolo/api/webhook/config", A));
      } catch (A) {
        J(Dt(A));
      } finally {
        $(!1);
      }
    }
  };
  return /* @__PURE__ */ n(
    "section",
    {
      "data-pipeline-webhook-settings": !0,
      "aria-labelledby": "webhook-settings-title",
      className: "w-full rounded-lg overflow-hidden flex flex-col",
      style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))" },
      children: [
        /* @__PURE__ */ t("header", { className: "px-4 py-3 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ n("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ t("h2", { id: "webhook-settings-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "GitHub webhook" }),
            /* @__PURE__ */ t(
              "span",
              {
                className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: "App-wide"
              }
            ),
            r && /* @__PURE__ */ t(
              "span",
              {
                className: "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                style: { color: br(r.listener), background: `color-mix(in srgb, ${br(r.listener)} 13%, transparent)` },
                children: r.listener
              }
            )
          ] }),
          /* @__PURE__ */ t("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "Shared by every pipeline. This authenticated control owns the app-wide loopback receiver; the secret is write-only and never returned." })
        ] }) }),
        /* @__PURE__ */ n("div", { className: "px-4 py-4 flex flex-col gap-4", children: [
          O ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: "Loading receiver configuration…" }) : r && /* @__PURE__ */ n(Xe, { children: [
            r.configuration_source === "environment" && /* @__PURE__ */ t("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))", background: "color-mix(in srgb, var(--warn) 7%, transparent)" }, children: "Gateway environment variables currently own this configuration, so the UI is read-only. Remove those overrides and restart the gateway to transfer authority to this form." }),
            r.configuration_source === "invalid" && /* @__PURE__ */ n("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid var(--danger, #ef4444)" }, children: [
              "Stored configuration failed secure validation and was not loaded. Repair or remove the app-owned config file before using this form.",
              r.configuration_error && /* @__PURE__ */ n("div", { className: "mt-1 font-mono", children: [
                "Reason: ",
                r.configuration_error
              ] })
            ] }),
            /* @__PURE__ */ n("label", { className: "flex items-center justify-between cursor-pointer", children: [
              /* @__PURE__ */ n("div", { children: [
                /* @__PURE__ */ t("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Enable receiver" }),
                /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Applies immediately for UI-managed settings; polling remains reconciliation." })
              ] }),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  disabled: !r.editable,
                  onClick: () => l((A) => !A),
                  "aria-pressed": a,
                  className: "rounded-full transition-all relative disabled:opacity-50",
                  style: { background: a ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                  children: /* @__PURE__ */ t("span", { className: "absolute top-0.5 rounded-full transition-all", style: { height: 18, width: 18, background: "var(--bg)", left: a ? 20 : 2 } })
                }
              )
            ] }),
            /* @__PURE__ */ n("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
              /* @__PURE__ */ n("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Loopback port",
                /* @__PURE__ */ t(
                  "input",
                  {
                    type: "number",
                    min: 1024,
                    max: 65535,
                    value: d,
                    disabled: !r.editable,
                    onChange: (A) => m(A.target.value),
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ n("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Fixed listener route",
                /* @__PURE__ */ n(
                  "div",
                  {
                    className: "mt-1 px-3 py-2 rounded-md text-sm font-mono normal-case",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
                    children: [
                      "127.0.0.1:",
                      Number.isFinite(ae) ? ae : "—",
                      "/github"
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ n("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "Repository allowlist · one owner/repo per line",
              /* @__PURE__ */ t(
                "textarea",
                {
                  rows: 4,
                  value: i,
                  disabled: !r.editable,
                  onChange: (A) => c(A.target.value),
                  placeholder: "owner/repo",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ n("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "Durable inbox override · optional absolute path",
              /* @__PURE__ */ t(
                "input",
                {
                  value: f,
                  disabled: !r.editable,
                  onChange: (A) => h(A.target.value),
                  placeholder: "Uses the state directory by default",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ n("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "GitHub webhook secret · ",
              r.secret_configured ? "configured; leave blank to keep" : "minimum 32 bytes",
              /* @__PURE__ */ t(
                "input",
                {
                  type: "password",
                  autoComplete: "new-password",
                  value: w,
                  disabled: !r.editable,
                  onChange: (A) => b(A.target.value),
                  placeholder: r.secret_configured ? "•••••••••••••••• (unchanged)" : "Enter a new secret",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            !a && r.secret_configured && r.editable && /* @__PURE__ */ n("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer", style: { color: "var(--muted)" }, children: [
              /* @__PURE__ */ t("input", { type: "checkbox", checked: v, onChange: (A) => x(A.target.checked) }),
              "Remove the stored secret when saving the disabled receiver"
            ] }),
            /* @__PURE__ */ n(
              "div",
              {
                className: "rounded-md p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ n("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Source" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: r.configuration_source })
                  ] }),
                  /* @__PURE__ */ n("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Allowlist" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: r.allowed_repository_count })
                  ] }),
                  /* @__PURE__ */ n("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Pending" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: ((V = r.inbox) == null ? void 0 : V.pending) ?? "—" })
                  ] }),
                  /* @__PURE__ */ n("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Processed" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: ((oe = r.inbox) == null ? void 0 : oe.processed) ?? "—" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ n("div", { className: "text-[11px] leading-5", style: { color: "var(--muted)" }, children: [
              "Configure GitHub for ",
              /* @__PURE__ */ t("strong", { children: "Issues" }),
              " and ",
              /* @__PURE__ */ t("strong", { children: "Labels" }),
              " events and use the same secret. A public relay/tunnel may forward only its ",
              /* @__PURE__ */ t("code", { children: "/github" }),
              " route to this loopback listener—never expose the dashboard or general API."
            ] }),
            /* @__PURE__ */ n(
              "div",
              {
                "data-cloudflare-tunnel": !0,
                className: "rounded-md p-3 flex flex-col gap-2",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ n("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ t("span", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Cloudflare tunnel" }),
                    /* @__PURE__ */ t(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: T != null && T.running ? "var(--ok)" : "var(--muted)", border: "1px solid var(--border)" },
                        children: T ? T.running ? "running" : T.installed ? "stopped" : "not installed" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ t("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "The receiver is loopback-only, so GitHub needs a public relay. Start a Cloudflare quick tunnel here, or run the shown command yourself. cloudflared is never installed automatically." }),
                  T && !T.installed && /* @__PURE__ */ n("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "cloudflared is not installed. Install it, then Refresh status.",
                    T.install_hint && /* @__PURE__ */ t("pre", { className: "mt-1 whitespace-pre-wrap font-mono text-[10px]", style: { color: "var(--text)" }, children: T.install_hint })
                  ] }),
                  (T == null ? void 0 : T.running) && T.payload_url && /* @__PURE__ */ n("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "GitHub payload URL",
                    /* @__PURE__ */ t(
                      "input",
                      {
                        readOnly: !0,
                        value: T.payload_url,
                        onFocus: (A) => A.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ok)" }
                      }
                    )
                  ] }),
                  (T == null ? void 0 : T.command) && /* @__PURE__ */ n("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "Command ",
                    T.running ? "running" : "to run yourself",
                    /* @__PURE__ */ t(
                      "input",
                      {
                        readOnly: !0,
                        value: T.command,
                        onFocus: (A) => A.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }
                      }
                    )
                  ] }),
                  (T == null ? void 0 : T.last_error) && /* @__PURE__ */ n("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Tunnel: ",
                    T.last_error
                  ] }),
                  T && T.installed && !T.running && T.receiver_ready === !1 && /* @__PURE__ */ n("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "Won't expose the port until the receiver is ready: ",
                    dn[T.receiver_block_reason || ""] || T.receiver_block_reason
                  ] }),
                  /* @__PURE__ */ n("div", { className: "flex gap-2", children: [
                    T != null && T.running ? /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void ee(),
                        disabled: pe,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--danger, #ef4444)", color: "var(--bg)" },
                        children: pe ? "Stopping…" : "Stop tunnel"
                      }
                    ) : /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void je(),
                        disabled: pe || !(T != null && T.installed) || (T == null ? void 0 : T.receiver_ready) === !1,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: pe ? "Starting…" : "Start tunnel"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Ne(),
                        disabled: pe,
                        className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50",
                        style: { color: "var(--muted)" },
                        children: "Refresh"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("p", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
                    "Exposes only the receiver's ",
                    /* @__PURE__ */ t("code", { children: "/github" }),
                    " route; every delivery is HMAC-verified. Quick-tunnel URLs change each restart — update the GitHub payload URL when it does."
                  ] }),
                  /* @__PURE__ */ n("label", { className: "flex items-start gap-2 mt-1 cursor-pointer", style: { color: "var(--text)" }, children: [
                    /* @__PURE__ */ t(
                      "input",
                      {
                        type: "checkbox",
                        checked: y,
                        disabled: !(r != null && r.editable),
                        onChange: (A) => B(A.target.checked),
                        className: "mt-0.5"
                      }
                    ),
                    /* @__PURE__ */ n("span", { className: "text-[11px]", children: [
                      /* @__PURE__ */ t("span", { className: "font-medium", children: "Auto-sync the GitHub webhook URL" }),
                      " — on tunnel start, re-point each allowed repo's webhook to the new ",
                      /* @__PURE__ */ t("code", { children: "…trycloudflare.com/github" }),
                      " URL via ",
                      /* @__PURE__ */ t("code", { children: "gh" }),
                      ". Only rewrites a hook already on a quick-tunnel host (a hand-set stable URL is never touched). Save to apply."
                    ] })
                  ] }),
                  (T == null ? void 0 : T.autosync) && T.autosync.enabled && /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: T.autosync.error ? "var(--danger, #ef4444)" : "var(--ok)" }, children: T.autosync.error ? `Auto-sync failed: ${T.autosync.error}` : `Auto-synced ${(T.autosync.results || []).filter((A) => A.action === "updated").length} hook(s) → ${T.autosync.payload_url}` })
                ]
              }
            ),
            /* @__PURE__ */ n(
              "div",
              {
                "data-automation-crons": !0,
                className: "rounded-md p-3 flex flex-col gap-2",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ n("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ t("span", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Automation crons" }),
                    H && H.available && /* @__PURE__ */ t(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: H.all_paused ? "var(--warn)" : "var(--ok)", border: "1px solid var(--border)" },
                        children: H.all_paused ? "paused" : H.any_active ? "running" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ t("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "DLC-YOLO's three background jobs (advance · spawns · backlog-intake). Pause them for a webhook-only or maintenance setup; the webhook receiver keeps working while paused (a verified delivery still wakes advance when resumed). Polling stops while paused." }),
                  H && !H.available && /* @__PURE__ */ n("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Cron control unavailable",
                    H.error ? `: ${H.error}` : "",
                    "."
                  ] }),
                  H && H.available && H.jobs.length > 0 && /* @__PURE__ */ t("div", { className: "flex flex-col gap-1", children: H.jobs.map((A) => /* @__PURE__ */ n(
                    "div",
                    {
                      className: "flex items-center justify-between text-[11px] font-mono",
                      style: { color: "var(--muted)" },
                      children: [
                        /* @__PURE__ */ t("span", { children: A.basename }),
                        /* @__PURE__ */ t("span", { style: { color: A.paused ? "var(--warn)" : "var(--ok)" }, children: A.paused ? "paused" : "active" })
                      ]
                    },
                    A.id
                  )) }),
                  /* @__PURE__ */ n("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void C(!0),
                        disabled: Ee || !(H != null && H.available) || (H == null ? void 0 : H.all_paused),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--warn)", color: "var(--bg)" },
                        children: Ee ? "…" : "Pause all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void C(!1),
                        disabled: Ee || !(H != null && H.available) || (H == null ? void 0 : H.any_active),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: Ee ? "…" : "Resume all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Ae(),
                        disabled: Ee,
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
          P && /* @__PURE__ */ t("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))" }, children: P })
        ] }),
        /* @__PURE__ */ n("footer", { className: "px-4 py-3 flex justify-between gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--card)" }, children: [
          /* @__PURE__ */ t("button", { onClick: () => void re(), disabled: O || F, className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50", style: { color: "var(--muted)" }, children: "Refresh status" }),
          (r == null ? void 0 : r.editable) && /* @__PURE__ */ t(
            "button",
            {
              onClick: () => void te(),
              disabled: !ce || F,
              className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
              style: { background: "var(--accent)", color: "var(--bg)" },
              children: F ? "Applying…" : "Save & apply"
            }
          )
        ] })
      ]
    }
  );
}
function pn({ repos: e, selectedRepos: r, onNewPipeline: o, onConfigure: a, onOpenAgents: l }) {
  const { openChat: d } = Ar(), m = r.length === 1 ? r[0] : e.length === 1 ? e[0] : "", i = "/dlc-yolo", c = "text-[10px] leading-none px-1.5 py-1 rounded font-semibold";
  return /* @__PURE__ */ t(Xe, { children: /* @__PURE__ */ n("div", { "data-dlc-command-controls": !0, className: "mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap", children: [
    /* @__PURE__ */ t(
      "button",
      {
        onClick: () => d({ message: i }),
        title: "Open the DLC-YOLO command session; choose the next command action there",
        className: c,
        style: { background: "var(--accent)", color: "var(--bg)" },
        children: "✨ Command session"
      }
    ),
    /* @__PURE__ */ t(
      "button",
      {
        onClick: () => m ? a(m) : o(),
        className: c,
        style: { color: "var(--muted)", border: "1px solid var(--border)" },
        children: m ? "Edit pipeline" : "New pipeline"
      }
    ),
    /* @__PURE__ */ t(
      "button",
      {
        onClick: l,
        className: c,
        style: { color: "var(--muted)", border: "1px solid var(--border)" },
        children: "Agent config"
      }
    ),
    m && /* @__PURE__ */ n("span", { className: "text-[10px] truncate max-w-[300px]", style: { color: "var(--muted)" }, children: [
      "Target: ",
      m
    ] })
  ] }) });
}
const Zt = {
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
};
function Bt(e) {
  return e ? e.max_child_cards === "unlimited" && e.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth";
}
function un({ budget: e, depth: r, onSave: o }) {
  const [a, l] = N(!1), [d, m] = N(Bt(e)), [i, c] = N(
    Bt(e) === "custom" ? { ...e } : { ...Zt[r] || Zt.standard }
  ), f = () => {
    const b = Bt(e);
    m(b), c(b === "custom" ? { ...e } : { ...Zt[r] || Zt.standard }), l(!0);
  }, h = () => {
    o(d === "depth" ? void 0 : d === "unlimited" ? {
      max_child_cards: "unlimited",
      effort_ceiling: "unlimited",
      max_feature_size: "XL",
      addenda: "proactive"
    } : { ...i }), l(!1);
  }, w = Bt(e) === "depth" ? "budget: depth" : Bt(e) === "unlimited" ? "budget: unlimited" : "budget: custom";
  return /* @__PURE__ */ n("div", { className: "relative", children: [
    /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        onClick: f,
        title: "Edit this card's explicit budget override",
        className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
        style: { color: e ? "var(--accent)" : "var(--muted)", border: `1px solid ${e ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)"}`, background: e ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" },
        children: w
      }
    ),
    a && /* @__PURE__ */ n(
      "div",
      {
        className: "absolute z-40 mt-1 left-0 w-72 rounded-lg p-3 flex flex-col gap-2",
        style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 12px 36px rgba(0,0,0,.35)" },
        children: [
          /* @__PURE__ */ t("div", { className: "text-[11px] font-semibold", style: { color: "var(--text)" }, children: "Card budget override" }),
          /* @__PURE__ */ t("div", { className: "grid grid-cols-3 gap-1", children: ["depth", "custom", "unlimited"].map((b) => /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              onClick: () => m(b),
              className: "text-[10px] px-2 py-1 rounded font-semibold",
              style: { color: d === b ? "var(--bg)" : "var(--muted)", background: d === b ? "var(--accent)" : "var(--bg-hover, var(--border))" },
              children: b === "depth" ? "follow depth" : b
            },
            b
          )) }),
          d === "depth" && /* @__PURE__ */ n("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
            "Removes ",
            /* @__PURE__ */ t("code", { children: "card.budget" }),
            "; effective budget follows ",
            r || "standard",
            " depth."
          ] }),
          d === "unlimited" && /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: "var(--warn)" }, children: "Literal unlimited child/effort caps · XL · proactive addenda." }),
          d === "custom" && /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ n("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Child cards",
              /* @__PURE__ */ t(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: i.max_child_cards,
                  onChange: (b) => c((v) => ({ ...v, max_child_cards: Math.max(0, Number(b.target.value) || 0) })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ n("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Effort ceiling",
              /* @__PURE__ */ t(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: i.effort_ceiling,
                  onChange: (b) => c((v) => ({ ...v, effort_ceiling: Math.max(0, Number(b.target.value) || 0) })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ n("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Max feature",
              /* @__PURE__ */ t(
                "select",
                {
                  value: i.max_feature_size,
                  onChange: (b) => c((v) => ({ ...v, max_feature_size: b.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["S", "M", "L", "XL"].map((b) => /* @__PURE__ */ t("option", { children: b }, b))
                }
              )
            ] }),
            /* @__PURE__ */ n("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Addenda",
              /* @__PURE__ */ t(
                "select",
                {
                  value: i.addenda,
                  onChange: (b) => c((v) => ({ ...v, addenda: b.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["none", "obvious", "proactive"].map((b) => /* @__PURE__ */ t("option", { children: b }, b))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ n("div", { className: "flex justify-end gap-2 mt-1", children: [
            /* @__PURE__ */ t("button", { type: "button", onClick: () => l(!1), className: "text-[10px] px-2 py-1", style: { color: "var(--muted)" }, children: "Cancel" }),
            /* @__PURE__ */ t("button", { type: "button", onClick: h, className: "text-[10px] px-2 py-1 rounded font-semibold", style: { background: "var(--accent)", color: "var(--bg)" }, children: "Save budget" })
          ] })
        ]
      }
    )
  ] });
}
const xr = [
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
], Or = {
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
}, mn = /* @__PURE__ */ new Set(["retired", "merged"]), yr = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked"]);
function gn(e) {
  const r = e == null ? void 0 : e.execution_schedule;
  if (!r || typeof r != "object") return null;
  const o = r.nodes;
  if (!o || typeof o != "object") return null;
  const a = r.current_node_id;
  return typeof a == "string" && o[a] && typeof o[a] == "object" ? o[a] : Object.values(o).find((l) => l && typeof l == "object" && l.step === e.stage) || null;
}
function kr(e, r) {
  const o = e == null ? void 0 : e[r], a = o && typeof o == "object" ? o[e.stage] : null;
  return typeof a == "string" && a.trim() ? a.trim() : null;
}
function hn(e, r) {
  const o = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", a = Array.isArray(e == null ? void 0 : e.decisions) ? e.decisions.filter((d) => d && !d.chosen && !d.resolved_at && (d.step === o || !d.step) && Array.isArray(d.options) && d.options.length) : [], l = (r || "").toLowerCase();
  return a.length ? { severity: "decision", label: "Choose an option", color: "var(--accent)" } : /capability|missing|not in inventory|no crew|external|unavailable|cannot proceed without a tool/.test(l) ? { severity: "hard", label: "Blocked · needs setup", color: "var(--danger)" } : /approv|confirm|sign.?off|awaiting.*human|needs.?you/.test(l) ? { severity: "approval", label: "Needs approval", color: "var(--warn)" } : { severity: "attention", label: "Needs input", color: "var(--warn)" };
}
function wr(e, { isGate: r = !1, liveObserved: o = !1 } = {}) {
  const a = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", l = typeof (e == null ? void 0 : e.lifecycle) == "string" ? e.lifecycle.toLowerCase() : "", d = e != null && e.step_status && typeof e.step_status == "object" ? String(e.step_status[a] || "") : "", m = gn(e), i = typeof (m == null ? void 0 : m.status) == "string" ? m.status : "", c = e != null && e.step_sessions && typeof e.step_sessions == "object" ? e.step_sessions[a] : null, f = yr.has(l) || i === "cancelling" || (c == null ? void 0 : c.writes_allowed) === !1 || !!(c != null && c.cancel_requested_at), h = a === "done" || mn.has(l) || ["completed", "cancelled", "superseded"].includes(i);
  let w, b = null, v = null, x = null, y = null;
  if (h)
    w = "terminal", b = i === "cancelled" || yr.has(l) ? `terminal ${l || i}` : l || i || a || null;
  else if (f)
    w = "cancelling", b = "writes revoked; awaiting terminal observation";
  else if (d === "blocked" || i === "blocked") {
    w = "blocked", b = kr(e, "block_reason") || ((m == null ? void 0 : m.wait_reasons) || [])[0] || "step blocked";
    const O = hn(e, b);
    v = O.severity, x = O.label, y = O.color;
  } else d === "error" || i === "failed" ? (w = "error", b = kr(e, "error_reason") || (m == null ? void 0 : m.dispatch_error) || "step error") : r || i === "gate-wait" ? w = "waiting-gate" : o ? w = "running-observed" : d === "pending" || i === "running" ? (w = "pending-unconfirmed", b = "no current live observation") : ["queued", "dependency-wait", "permit-wait"].includes(i) ? (w = "queued", b = Array.isArray(m == null ? void 0 : m.wait_reasons) ? m.wait_reasons.join(" · ") : null) : i === "ready" ? w = "ready" : w = "idle";
  const B = Or[w];
  return {
    kind: w,
    reason: b,
    severity: v,
    label: x || B.label,
    color: y || B.color
  };
}
const Rt = { LOOP: "loop", STEP: "step-agent", ORCH: "orchestrator", HUMAN: "human" };
function yt(e) {
  return typeof e == "string" ? e : "";
}
function vn(e) {
  if (!e || typeof e != "object") return [];
  const r = [], o = (a) => {
    a && a.at && r.push(a);
  };
  for (const a of e.history || [])
    !a || typeof a != "object" || o({
      id: `hist:${a.at}:${a.to}`,
      at: yt(a.at),
      actor: Rt.LOOP,
      kind: "promoted",
      step: a.to,
      cls: "notification",
      needs_human: !1,
      headline: `advanced ${a.from || "?"} → ${a.to || "?"}`,
      detail: a.agent ? `by ${a.agent}` : ""
    });
  for (const [a, l] of Object.entries(e.step_summaries || {})) {
    if (!l || typeof l != "object" || !l.headline) continue;
    const d = l.status === "blocked";
    o({
      id: `summ:${a}:${l.at || l.status}`,
      at: yt(l.at) || yt(e.updated_at),
      actor: Rt.STEP,
      kind: d ? "blocked" : l.status === "error" ? "error" : "step-done",
      step: a,
      cls: "notification",
      needs_human: !!l.needs_human,
      headline: l.headline,
      detail: l.description || "",
      executor: l.executor || null
    });
  }
  for (const a of e.gate_history || [])
    !a || typeof a != "object" || o({
      id: `gate:${a.at}:${a.gate}`,
      at: yt(a.at),
      actor: Rt.HUMAN,
      kind: a.decision === "rejected" ? "rejected" : a.decision === "approved" ? "approved" : "gate",
      step: a.gate,
      cls: "decision",
      needs_human: !1,
      headline: `you ${a.decision || "acted on"} ${a.gate}`,
      detail: a.notes || ""
    });
  for (const a of e.decisions || []) {
    if (!a || typeof a != "object") continue;
    const l = !!a.chosen || !!a.resolved_at;
    o({
      id: `dec:${a.id || a.at}`,
      at: yt(a.at),
      actor: Rt.ORCH,
      kind: l ? "resolved" : "decision",
      step: a.step,
      cls: "decision",
      needs_human: !l,
      headline: l ? `resolved: ${a.chosen || a.action || a.kind || "decision"}` : `decision needed: ${a.question || a.kind || "a fork"}`,
      detail: a.rationale || a.question || ""
    });
  }
  for (const a of e.backstep_history || [])
    !a || typeof a != "object" || o({
      id: `back:${a.at}`,
      at: yt(a.at),
      actor: Rt.ORCH,
      kind: "back-stepped",
      step: a.to,
      cls: "notification",
      needs_human: !1,
      headline: `stepped back ${a.from || "?"} → ${a.to || "?"}`,
      detail: a.reason || ""
    });
  for (const a of e.parked || [])
    !a || typeof a != "object" || o({
      id: `park:${a.id || a.at}`,
      at: yt(a.at),
      actor: Rt.ORCH,
      kind: "parked",
      step: a.phase,
      cls: "notification",
      needs_human: !1,
      headline: `parked to backlog: ${a.note || "idea"}`,
      detail: a.issue_url || ""
    });
  return r.map((a, l) => ({ ...a, _i: l })).sort((a, l) => a.at < l.at ? -1 : a.at > l.at ? 1 : a._i - l._i).map(({ _i: a, ...l }) => l);
}
const fn = /^\[([a-z0-9-]+)\s*[·.]\s*f?\d+\]\s*(.*)$/i;
function Ir(e) {
  const r = fn.exec(String(e || ""));
  return r ? { parentId: r[1], rest: r[2] } : null;
}
function bn(e, r) {
  var d;
  if (!e) return [];
  const o = [], a = /* @__PURE__ */ new Set(), l = (m) => {
    m && !a.has(m.id) && (a.add(m.id), o.push(m));
  };
  for (const m of ((d = e.topology) == null ? void 0 : d.children) || []) {
    const i = typeof m == "string" ? m : m == null ? void 0 : m.card_id, c = (r || []).find((f) => f.id === i);
    c && l({ id: c.id, title: c.title, stage: c.stage, lifecycle: c.lifecycle, required: (m == null ? void 0 : m.required) !== !1 });
  }
  for (const m of r || []) {
    const i = Ir(m.title);
    i && i.parentId === e.id && l({ id: m.id, title: m.title, stage: m.stage, lifecycle: m.lifecycle, required: !0 });
  }
  return o;
}
function xn(e) {
  var o;
  const r = Ir(e == null ? void 0 : e.title);
  return r ? r.parentId : ((o = e == null ? void 0 : e.topology) == null ? void 0 : o.integration_owner) || (e == null ? void 0 : e.parent_card) || null;
}
const Nr = ["webhook", "loop", "orchestrator", "crew", "step-agent", "human"], qr = {
  webhook: "⬇",
  loop: "⚙",
  orchestrator: "🧠",
  crew: "👥",
  "step-agent": "🤖",
  human: "🧑"
};
function Pe(e) {
  return typeof e == "string" ? e : "";
}
function yn(e) {
  return String(e || "").slice(0, 8);
}
function kn(e, r) {
  var m;
  const o = e.id, a = ((m = e.execution_schedule) == null ? void 0 : m.nodes) || {};
  for (const [i, c] of Object.entries(a)) {
    if (!c || typeof c != "object") continue;
    const f = Pe(c.terminal_at) || Pe(c.session_at) || Pe(c.ready_at) || Pe(c.created_at);
    r({
      id: `sched:${i}`,
      at: f,
      actor: "step-agent",
      kind: `step-${c.status || "node"}`,
      cardId: o,
      step: c.step,
      node_id: i,
      headline: `${c.step || c.kind || "step"} · ${c.status || "node"}`,
      detail: c.concurrency_class ? `class ${c.concurrency_class}` : ""
    });
  }
  for (const i of e.event_outbox || [])
    !i || typeof i != "object" || r({
      id: i.id || `outbox:${o}:${i.subject}:${i.time}`,
      at: Pe(i.time),
      actor: "step-agent",
      kind: (i.type || "").split(".").pop() || "event",
      cardId: o,
      step: i.subject,
      run_id: i.run_id,
      envelope_id: i.envelope_id,
      caused_by: i.correlation_id && i.correlation_id !== o ? i.correlation_id : void 0,
      headline: `${i.subject || "step"} → ${i.terminal_status || i.type || "event"}`,
      detail: i.observed_status ? `observed: ${i.observed_status}` : i.run_id ? `run ${yn(i.run_id)}` : ""
    });
  for (const i of e.history || []) {
    if (!i || typeof i != "object") continue;
    const c = i.agent || "", f = /cron|advance/i.test(c) ? "loop" : /human|user/i.test(c) ? "human" : "loop";
    r({
      id: `hist:${o}:${i.at}:${i.to}`,
      at: Pe(i.at),
      actor: f,
      kind: "promoted",
      cardId: o,
      step: i.to,
      inferred: f === "loop" && /cron|advance/i.test(c) ? !1 : void 0,
      headline: `advanced ${i.from || "?"} → ${i.to || "?"}`,
      detail: c ? `by ${c}` : ""
    });
  }
  for (const i of e.decisions || []) {
    if (!i || typeof i != "object") continue;
    const c = i.status === "resolved" || !!i.chosen || !!i.resolved_at;
    r({
      id: `dec:${i.id || o + i.step}`,
      at: Pe(i.at) || Pe(i.resolved_at),
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
  for (const i of e.gate_history || []) {
    if (!i || typeof i != "object") continue;
    const c = /user|human/i.test(i.actor || "");
    r({
      id: `gate:${o}:${i.at}:${i.gate}`,
      at: Pe(i.at),
      actor: c ? "human" : "orchestrator",
      kind: i.decision === "rejected" ? "gate-rejected" : "gate-approved",
      cardId: o,
      step: i.gate,
      headline: `${c ? "human" : i.actor || "system"} ${i.decision || "acted"} ${i.gate}`,
      detail: i.notes || (i.result_revision != null ? `rev ${i.result_revision}` : "")
    });
  }
  const l = e.orchestrator_session;
  l && l.at && r({
    id: `orch:${o}:${l.session_key || l.at}`,
    at: Pe(l.at),
    actor: "orchestrator",
    kind: "orchestrator-session",
    cardId: o,
    session_key: l.session_key,
    headline: "orchestrator session",
    detail: l.name || l.slot_key || ""
  });
  const d = e.orchestrator_trigger;
  d && d.at && (!l || d.at !== l.at) && r({
    id: `orchtrig:${o}:${d.at}`,
    at: Pe(d.at),
    actor: "orchestrator",
    kind: "orchestrator-trigger",
    cardId: o,
    session_key: d.session_key,
    headline: `orchestrator trigger · ${d.status || ""}`,
    detail: ""
  });
  for (const [i, c] of Object.entries(e.step_sessions || {}))
    !c || typeof c != "object" || !c.at || r({
      id: `sess:${o}:${i}:${c.at}`,
      at: Pe(c.at),
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
function wn(e, r) {
  for (const o of (e == null ? void 0 : e.github_webhook_history) || [])
    !o || typeof o != "object" || r({
      id: `wh:${o.delivery_id}`,
      at: Pe(o.at) || Pe(o.received_at) || Pe(o.time),
      actor: "webhook",
      kind: `webhook-${o.status || "received"}`,
      cardId: o.card_id,
      caused_by: void 0,
      headline: `${o.event}.${o.action} #${o.issue_number ?? "?"}`,
      detail: `${o.repository || ""}${o.status ? ` · ${o.status}` : ""}${o.reason ? ` (${o.reason})` : ""}`
    });
}
function Nn(e, r, o) {
  const a = e == null ? void 0 : e.id, l = (r || []).filter((f) => {
    var h;
    return f && (f.pipeline_id === a || !f.pipeline_id && ((h = f.source) == null ? void 0 : h.repo) === (e == null ? void 0 : e.repo));
  }), d = [], m = (f) => {
    f && f.at && d.push({ glyph: qr[f.actor] || "•", ...f });
  };
  for (const f of l) kn(f, m);
  wn(o, m);
  const i = Object.fromEntries(Nr.map((f, h) => [f, h]));
  d.sort((f, h) => (f.at < h.at ? -1 : f.at > h.at ? 1 : 0) || (i[f.actor] ?? 9) - (i[h.actor] ?? 9) || (f.id < h.id ? -1 : f.id > h.id ? 1 : 0));
  const c = Nr.filter((f) => d.some((h) => h.actor === f));
  return { events: d, actors: c, now: (o == null ? void 0 : o.scheduler_state) || null };
}
const _n = [
  "request:re-spec",
  "request:retry",
  "request:back-step",
  "request:park",
  "request:cancel"
], ir = 500, cr = {
  "request:retry": { label: "Retry step", reasonRequired: !1, confirm: "Re-run this failed step?" },
  "request:re-spec": { label: "Re-spec", reasonRequired: !1, confirm: "Ask the orchestrator to re-scope this card?" },
  "request:back-step": { label: "Back-step", reasonRequired: !1, confirm: "Propose stepping this card back a level?" },
  "request:park": { label: "Park", reasonRequired: !1, confirm: "Park this card to the backlog?" },
  "request:cancel": {
    label: "Cancel",
    reasonRequired: !1,
    confirm: "Cancel cooperatively: writes are revoked, the live turn may NOT stop immediately, and the permit/worktree are retained until terminal observation. Continue?"
  }
};
function Cn() {
  var r, o;
  return `ui-${(((o = (r = globalThis.crypto) == null ? void 0 : r.randomUUID) == null ? void 0 : o.call(r)) || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16)}`;
}
function Sn(e, r) {
  if (!_n.includes(e)) return { ok: !1, error: `unknown request kind: ${e}` };
  const o = cr[e], a = String(r || "").trim();
  return o.reasonRequired && !a ? { ok: !1, error: "a reason is required for this request" } : a.length > ir ? { ok: !1, error: `reason exceeds ${ir} chars` } : { ok: !0 };
}
function $n({ id: e, kind: r, text: o, card: a, now: l, boundary: d }) {
  const m = Sn(r, o);
  if (!m.ok) throw new Error(m.error);
  const i = a == null ? void 0 : a.stage, c = a != null && a.step_status && typeof a.step_status == "object" ? a.step_status[i] ?? null : null, f = {
    id: e,
    at: l,
    step: i,
    kind: r,
    text: String(o || "").trim().slice(0, ir),
    by: "user",
    status: "pending",
    expected: { stage: i ?? null, step_status: c }
  };
  return r === "request:back-step" && d && (f.boundary = d), f;
}
function An(e, r) {
  const o = Array.isArray(e) ? e : [];
  return o.some((a) => a && a.id === r.id) ? o : [...o, r];
}
const Mr = [
  "ready",
  "queued",
  "running",
  "pending",
  "blocked",
  "error",
  "cancelling",
  "terminal"
];
function Rn(e, r) {
  const o = Object.fromEntries(Mr.map((d) => [d, 0])), a = r && typeof r == "object" ? r : {};
  o.ready = (a.ready_node_ids || []).length, o.running = (a.running_node_ids || []).length, o.blocked = (a.blocked_node_ids || []).length, o.queued = (a.selected_node_ids || []).length;
  const l = [];
  for (const d of e || []) {
    if (!d || typeof d != "object") continue;
    const m = d.stage, i = d.step_status && typeof d.step_status == "object" ? d.step_status[m] : null;
    d.writes_allowed === !1 || d.cancel_requested_at ? o.cancelling += 1 : i === "error" ? o.error += 1 : i === "blocked" ? o.blocked += 1 : i === "pending" ? o.pending += 1 : (i === "done" || d.lifecycle === "retired" || d.lifecycle === "merged") && (o.terminal += 1);
    const c = d.block_reason && typeof d.block_reason == "object" ? d.block_reason[m] : null;
    c && l.push({ card: d.id, reason: String(c) });
  }
  return { counts: o, waitReasons: l.slice(0, 50) };
}
function Jt(e) {
  if (!e || typeof e != "object")
    return { available: !1, label: "unavailable", authority_active: !1, verified: !1 };
  const r = !!e.authority_active, o = String(e.parity_status || ""), a = o === "verified" || e.verified === !0;
  return {
    available: !0,
    authority_active: r,
    verified: a,
    parity_status: o || (a ? "verified" : "unknown"),
    digest_match: e.digest_match === void 0 ? null : !!e.digest_match,
    failure_code: e.failure_code || e.error || null,
    // never surface paths/prose from the minimized model
    label: r ? a ? "verified" : "blocked" : "authority inactive"
  };
}
const _r = /^[A-Za-z0-9._-]{1,128}$/;
function zt({ values: e, empty: r = "none declared" }) {
  return e.length ? /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1", children: e.map((o) => /* @__PURE__ */ t(
    "code",
    {
      className: "text-[10px] px-1.5 py-0.5 rounded",
      style: { color: "var(--text)", background: "var(--bg-hover, var(--border))", border: "1px solid var(--border)" },
      children: o
    },
    o
  )) }) : /* @__PURE__ */ t("span", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: r });
}
function mt({ label: e, value: r }) {
  return /* @__PURE__ */ n("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]", children: [
    /* @__PURE__ */ t("span", { className: "uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ t("span", { className: "break-words", style: { color: r ? "var(--text)" : "var(--muted)" }, children: r || "not set" })
  ] });
}
function Tn({ profiles: e, initial: r, onSave: o, onClose: a }) {
  var F;
  const l = r ? "update" : "create", [d, m] = N((r == null ? void 0 : r.name) || ""), [i, c] = N((r == null ? void 0 : r.kiroAgent) || ((F = e.find(($) => $.status === "loaded")) == null ? void 0 : F.name) || ""), [f, h] = N((r == null ? void 0 : r.workspace) || ""), [w, b] = N((r == null ? void 0 : r.memoryStore) || ""), [v, x] = N(!1), [y, B] = N(""), O = _r.test(d.trim()) && _r.test(i.trim()) && new TextEncoder().encode(f.trim()).length <= 256 && new TextEncoder().encode(w.trim()).length <= 256, E = async () => {
    if (!(!O || v)) {
      x(!0), B("");
      try {
        await o({
          mode: l,
          name: d.trim(),
          kiroAgent: i.trim(),
          workspace: f.trim() || void 0,
          memoryStore: w.trim() || void 0
        });
      } catch ($) {
        B(($ == null ? void 0 : $.message) || String($)), x(!1);
      }
    }
  };
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[80] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 68%, transparent)", backdropFilter: "blur(3px)" },
      onMouseDown: ($) => {
        $.currentTarget === $.target && !v && a();
      },
      children: /* @__PURE__ */ n(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "crew-route-editor-title",
          className: "w-full max-w-lg rounded-xl overflow-hidden",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ n("header", { className: "px-5 py-4 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ t("h3", { id: "crew-route-editor-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: l === "create" ? "New global crew route" : `Edit ${r == null ? void 0 : r.name}` }),
                /* @__PURE__ */ t("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "UI-managed routing record backed by the sanctioned KiroCrew agent CLI—no chat handoff." })
              ] }),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: a,
                  disabled: v,
                  "aria-label": "Close crew route editor",
                  className: "w-8 h-8 rounded-lg text-lg disabled:opacity-40",
                  style: { color: "var(--muted)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ n("div", { className: "px-5 py-4 flex flex-col gap-3.5", children: [
              /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Crew name",
                /* @__PURE__ */ t(
                  "input",
                  {
                    value: d,
                    onChange: ($) => m($.target.value),
                    disabled: l === "update",
                    placeholder: "e.g. dlcyolo-secure-review",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none disabled:opacity-60",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Kiro agent authority profile",
                /* @__PURE__ */ t(
                  "input",
                  {
                    list: "dlc-agent-profile-options",
                    value: i,
                    onChange: ($) => c($.target.value),
                    placeholder: "dlcyolo-readonly",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                ),
                /* @__PURE__ */ t("datalist", { id: "dlc-agent-profile-options", children: e.map(($) => /* @__PURE__ */ t("option", { value: $.name }, $.name)) })
              ] }),
              /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Workspace ",
                /* @__PURE__ */ t("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ t(
                  "input",
                  {
                    value: f,
                    onChange: ($) => h($.target.value),
                    placeholder: l === "update" ? "Blank keeps the current value" : "Default workspace",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Memory store ",
                /* @__PURE__ */ t("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ t(
                  "input",
                  {
                    value: w,
                    onChange: ($) => b($.target.value),
                    placeholder: l === "update" ? "Blank keeps the current value" : "Default memory store",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ n("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                "This edits the global crew → ",
                /* @__PURE__ */ t("code", { children: "kiro_agent" }),
                " route. Profile prompts, tools, and approval policy remain source-managed declarations; pipeline-local objectives stay in Pipeline Setup."
              ] }),
              y && /* @__PURE__ */ t("div", { className: "text-[11px] rounded-md px-3 py-2", style: { color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))" }, children: y })
            ] }),
            /* @__PURE__ */ n("footer", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              /* @__PURE__ */ t("button", { onClick: a, disabled: v, className: "text-[11px] px-3 py-1.5 rounded-md disabled:opacity-40", style: { color: "var(--muted)" }, children: "Cancel" }),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => void E(),
                  disabled: !O || v,
                  className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: v ? "Saving…" : l === "create" ? "Create crew route" : "Save crew route"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function dr({ profiles: e, crews: r, loading: o = !1, context: a, onRefresh: l, onClose: d, onSelectProfile: m, onSelectCrew: i, onSaveCrew: c }) {
  var P, J;
  const [f, h] = N("agents"), [w, b] = N(((P = e[0]) == null ? void 0 : P.name) || ""), [v, x] = N(((J = r[0]) == null ? void 0 : J.name) || ""), [y, B] = N(null);
  qe(() => {
    var k;
    e.some((re) => re.name === w) || b(((k = e[0]) == null ? void 0 : k.name) || "");
  }, [e, w]), qe(() => {
    var k;
    r.some((re) => re.name === v) || x(((k = r[0]) == null ? void 0 : k.name) || "");
  }, [r, v]);
  const O = e.find((k) => k.name === w), E = r.find((k) => k.name === v), F = Te(
    () => E != null && E.kiroAgent ? e.find((k) => k.name === E.kiroAgent) : void 0,
    [E, e]
  ), $ = O != null && O.prompt ? O.prompt.length > 1200 ? `${O.prompt.slice(0, 1200)}…` : O.prompt : "";
  return /* @__PURE__ */ n(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 62%, transparent)", backdropFilter: "blur(2px)" },
      onMouseDown: (k) => {
        k.currentTarget === k.target && d();
      },
      children: [
        /* @__PURE__ */ n(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "agent-crew-catalog-title",
            className: "w-full max-w-4xl rounded-xl overflow-hidden flex flex-col",
            style: { height: "min(78vh, 760px)", background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" },
            children: [
              /* @__PURE__ */ n("header", { className: "px-5 py-4 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ t("h2", { id: "agent-crew-catalog-title", className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agents & crews" }),
                  /* @__PURE__ */ t("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "KiroCrew agent templates define prompts/tools/approval policy. Global crew records route to one template plus workspace and memory." }),
                  a && /* @__PURE__ */ n("p", { className: "text-[10px] mt-1", style: { color: "var(--accent)" }, children: [
                    "Pipeline context: ",
                    a
                  ] })
                ] }),
                l && /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: l,
                    disabled: o,
                    className: "text-[11px] px-2.5 py-1.5 rounded-md disabled:opacity-50",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: o ? "Refreshing…" : "Refresh"
                  }
                ),
                c && /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: () => {
                      h("crews"), B({ mode: "create" });
                    },
                    className: "text-[11px] px-2.5 py-1.5 rounded-md font-semibold",
                    style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))" },
                    children: "+ New crew route"
                  }
                ),
                /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: d,
                    "aria-label": "Close agents and crews",
                    className: "w-8 h-8 rounded-lg text-lg leading-none",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: [["agents", `Agent templates · ${e.length}`], ["crews", `Global crews · ${r.length}`]].map(([k, re]) => /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => h(k),
                  className: "text-[12px] px-3 py-2 font-semibold",
                  style: { color: f === k ? "var(--accent)" : "var(--muted)", borderBottom: `2px solid ${f === k ? "var(--accent)" : "transparent"}`, marginBottom: -1 },
                  children: re
                },
                k
              )) }),
              /* @__PURE__ */ t("div", { className: "flex min-h-0 flex-1", children: f === "agents" ? /* @__PURE__ */ n(Xe, { children: [
                /* @__PURE__ */ n("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  e.map((k) => /* @__PURE__ */ n(
                    "button",
                    {
                      onClick: () => b(k.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: k.name === w ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: k.name === w ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold truncate", children: k.name }),
                        /* @__PURE__ */ t("div", { className: "text-[9px] mt-0.5", style: { color: k.status === "loaded" ? "var(--ok)" : "var(--warn)" }, children: k.status === "loaded" ? "config loaded" : "config unavailable" })
                      ]
                    },
                    k.name
                  )),
                  !e.length && /* @__PURE__ */ t("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No referenced profiles." })
                ] }),
                /* @__PURE__ */ t("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: O ? /* @__PURE__ */ n("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ n("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ t("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: O.name }),
                      /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: O.description || "No description declared." })
                    ] }),
                    m && /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => m(O),
                        disabled: O.status !== "loaded",
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Use for this step"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ t(mt, { label: "Model", value: O.model || "auto / provider default" }),
                    /* @__PURE__ */ t(mt, { label: "Config source", value: O.sourcePath }),
                    /* @__PURE__ */ t(mt, { label: "Prompt", value: O.prompt ? O.prompt.startsWith("file://") ? O.prompt : "inline prompt" : void 0 })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Declared tools" }),
                    /* @__PURE__ */ t(zt, { values: O.tools })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Auto-approved tools" }),
                    /* @__PURE__ */ t(zt, { values: O.allowedTools })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Resources / skills" }),
                    /* @__PURE__ */ t(zt, { values: O.resources })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "MCP servers" }),
                    /* @__PURE__ */ t(zt, { values: O.mcpServers })
                  ] }),
                  $ && /* @__PURE__ */ n("details", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ t("summary", { className: "text-[11px] cursor-pointer", style: { color: "var(--accent)" }, children: "Prompt preview" }),
                    /* @__PURE__ */ t("pre", { className: "mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto", style: { color: "var(--muted)" }, children: $ })
                  ] }),
                  /* @__PURE__ */ t("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 28%, var(--border))" }, children: "These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access." })
                ] }) : /* @__PURE__ */ t("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select an agent template." }) })
              ] }) : /* @__PURE__ */ n(Xe, { children: [
                /* @__PURE__ */ n("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  r.map((k) => /* @__PURE__ */ n(
                    "button",
                    {
                      onClick: () => x(k.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: k.name === v ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: k.name === v ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold truncate", children: k.name }),
                        /* @__PURE__ */ n("div", { className: "text-[9px] mt-0.5 truncate", style: { color: "var(--muted)" }, children: [
                          "→ ",
                          k.kiroAgent || "profile not declared"
                        ] })
                      ]
                    },
                    k.name
                  )),
                  !r.length && /* @__PURE__ */ t("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No global crews found." })
                ] }),
                /* @__PURE__ */ t("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: E ? /* @__PURE__ */ n("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ n("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ t("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: E.name }),
                      /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: E.description || "No description declared." })
                    ] }),
                    c && /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => B({ mode: "update", crew: E }),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { color: "var(--accent)", border: "1px solid var(--border)" },
                        children: "Edit route"
                      }
                    ),
                    i && /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => i(E),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Route step here"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ t(mt, { label: "kiro_agent", value: E.kiroAgent }),
                    /* @__PURE__ */ t(mt, { label: "Workspace", value: E.workspace }),
                    /* @__PURE__ */ t(mt, { label: "Memory store", value: E.memoryStore }),
                    /* @__PURE__ */ t(mt, { label: "Model override", value: E.model }),
                    /* @__PURE__ */ t(mt, { label: "Source", value: E.source })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Selection triggers" }),
                    /* @__PURE__ */ t(zt, { values: E.triggers })
                  ] }),
                  E.kiroAgent && /* @__PURE__ */ n("div", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Authority profile" }),
                    /* @__PURE__ */ n("div", { className: "flex items-center gap-2 mt-1.5", children: [
                      /* @__PURE__ */ t("code", { className: "text-[12px]", style: { color: "var(--accent)" }, children: E.kiroAgent }),
                      /* @__PURE__ */ t("span", { className: "text-[10px]", style: { color: (F == null ? void 0 : F.status) === "loaded" ? "var(--ok)" : "var(--warn)" }, children: (F == null ? void 0 : F.status) === "loaded" ? "loaded" : "unavailable" }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => {
                            b(E.kiroAgent || ""), h("agents");
                          },
                          className: "ml-auto text-[10px] px-2 py-1 rounded",
                          style: { color: "var(--accent)", border: "1px solid var(--border)" },
                          children: "View profile"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ n("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--accent) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))" }, children: [
                    "This crew entry is a thin global routing record. Its tools and approval policy come from the linked ",
                    /* @__PURE__ */ t("code", { children: "kiro_agent" }),
                    " template; they are not duplicated on the crew."
                  ] })
                ] }) : /* @__PURE__ */ t("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select a global crew." }) })
              ] }) })
            ]
          }
        ),
        y && c && /* @__PURE__ */ t(
          Tn,
          {
            profiles: e,
            initial: y.mode === "update" ? y.crew : void 0,
            onClose: () => B(null),
            onSave: async (k) => {
              await c(k), x(k.name), B(null);
            }
          }
        )
      ]
    }
  );
}
const Dr = Object.freeze([
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
]), jn = /^[A-Za-z0-9._-]{1,128}$/;
function rt(e) {
  return typeof e == "string" && jn.test(e);
}
function ot(e) {
  return typeof e == "string" && e.trim() ? e.trim() : void 0;
}
function tr(e) {
  return Array.isArray(e) ? [...new Set(e.filter((r) => typeof r == "string" && r.trim()).map((r) => r.trim()))] : [];
}
function En(e) {
  return !e || typeof e != "object" || Array.isArray(e) ? [] : Object.entries(e).filter(([r, o]) => rt(r) && o && typeof o == "object" && !Array.isArray(o)).map(([r, o]) => ({
    name: r,
    kiroAgent: rt(o.kiro_agent) ? o.kiro_agent : void 0,
    workspace: ot(o.workspace),
    memoryStore: ot(o.memory_store ?? o.memoryStore),
    model: ot(o.model),
    description: ot(o.description),
    triggers: tr(o.triggers),
    source: ot(o.source)
  })).sort((r, o) => r.name.localeCompare(o.name));
}
function Ln(e, r = Dr) {
  const o = [];
  for (const l of r)
    rt(l) && !o.includes(l) && o.push(l);
  const a = (Array.isArray(e) ? e : []).map((l) => l == null ? void 0 : l.kiroAgent).filter(rt).sort((l, d) => l.localeCompare(d));
  for (const l of a)
    o.includes(l) || o.push(l);
  return o;
}
function On(e, r, o = Dr) {
  if (!rt(e)) return;
  if (o.includes(e)) return `~/.kiro/crew/apps/dlc-yolo/agents/${e}.json`;
  const a = [...new Set(
    (Array.isArray(r) ? r : []).filter((l) => (l == null ? void 0 : l.kiroAgent) === e).map((l) => l == null ? void 0 : l.source).filter(rt)
  )];
  if (a.length === 1)
    return `~/.kiro/agents/${a[0]}--${e}.json`;
}
function lr(e, r, o) {
  const a = rt(r) ? r : "unknown", l = !!e && typeof e == "object" && !Array.isArray(e), d = l && rt(e.name) ? e.name : a, m = l && e.mcpServers && typeof e.mcpServers == "object" ? Object.keys(e.mcpServers).filter(rt) : [];
  return {
    name: d,
    description: l ? ot(e.description) : void 0,
    prompt: l ? ot(e.prompt) : void 0,
    model: l ? ot(e.model) : void 0,
    tools: l ? tr(e.tools) : [],
    allowedTools: l ? tr(e.allowedTools) : [],
    resources: l ? tr(e.resources) : [],
    mcpServers: m,
    status: l ? "loaded" : "unavailable",
    sourcePath: ot(o)
  };
}
function In(e) {
  const r = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(e || "");
  return r == null ? void 0 : r[1];
}
function qn(e, r) {
  if (!r || !rt(r.name)) return { ...e };
  const o = In(r.name);
  return {
    ...e,
    name: r.name,
    tools: [...r.tools || []],
    model: r.model || "auto",
    ...o ? { capability: o } : {}
  };
}
let gt = vt;
const Cr = (e) => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
})[e], rr = [
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
], Br = /* @__PURE__ */ new Set([
  "example-org/web-app",
  "example-org/dashboard",
  "example-org/api-core"
]), Mn = {
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
}, kt = ["manual", "assisted", "autonomous"], Lt = ["quick", "standard", "deep"], Ft = { trust: "assisted", depth: "standard" }, ar = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, or = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Dn() {
  const [e, r] = N(null), o = se((d) => new Promise((m) => {
    r({ ...d, resolve: m });
  }), []), a = se((d) => {
    e == null || e.resolve(d), r(null);
  }, [e]), l = e ? /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[80] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" },
      onMouseDown: (d) => {
        d.currentTarget === d.target && a(!1);
      },
      children: /* @__PURE__ */ n(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(420px, calc(100vw - 32px))", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ n("div", { className: "px-5 pt-4 pb-3", children: [
              e.title && /* @__PURE__ */ t("h2", { className: "text-[14px] font-semibold mb-1", style: { color: "var(--text-strong, var(--text))" }, children: e.title }),
              /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--text)" }, children: e.message })
            ] }),
            /* @__PURE__ */ n("footer", { className: "px-5 py-3 flex items-center justify-end gap-2", style: { borderTop: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => a(!1),
                  className: "text-[12px] px-3 py-1.5 rounded-md",
                  style: { color: "var(--muted)", border: "1px solid var(--border)" },
                  children: e.cancelLabel || "Cancel"
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => a(!0),
                  className: "text-[12px] px-3 py-1.5 rounded-md font-semibold",
                  style: { background: e.danger ? "var(--danger, #e66)" : "var(--accent)", color: "var(--bg)" },
                  children: e.confirmLabel || "Confirm"
                }
              )
            ] })
          ]
        }
      )
    }
  ) : null;
  return [o, l];
}
function Ze({ color: e, children: r, title: o, onClick: a, active: l }) {
  return /* @__PURE__ */ t(
    "button",
    {
      type: "button",
      title: o,
      onClick: a,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: e,
        background: `color-mix(in srgb, ${e} 14%, transparent)`,
        boxShadow: l ? `inset 0 0 0 1px color-mix(in srgb, ${e} 55%, transparent)` : "none",
        opacity: a && !l ? 0.85 : 1,
        cursor: a ? "pointer" : "default"
      },
      children: r
    }
  );
}
const Qt = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Bn({ steps: e, cardsByStage: r, onNodeClick: o }) {
  const a = De(null), l = De(null), d = De(0), m = De(null), i = De(e), c = De(r), f = De([]);
  i.current = e, c.current = r;
  const h = 3, w = 116, b = w / h, v = b - 26, [x, y] = N(880);
  qe(() => {
    const E = l.current;
    if (!E) return;
    const F = new ResizeObserver(($) => {
      const P = Math.max(360, Math.floor($[0].contentRect.width));
      y(P);
    });
    return F.observe(E), () => F.disconnect();
  }, []);
  const B = (E) => E.type === "gate" || E.id.startsWith("gate-");
  return qe(() => {
    const E = a.current;
    if (!E) return;
    const F = Math.floor(x / h);
    E.width = F * h, E.height = b * h;
    const $ = E.getContext("2d");
    if (!$) return;
    const P = (re, T, ye, pe, he) => {
      $.fillStyle = he, $.fillRect(re * h, T * h, ye * h, pe * h);
    }, J = () => {
      const re = d.current, T = i.current, ye = c.current, pe = Math.max(1, T.length);
      Math.max(1, ...T.map((ee) => {
        var H;
        return ((H = ye[ee.id]) == null ? void 0 : H.length) || 0;
      })), P(0, 0, F, v, "#0f172a");
      for (let ee = 0; ee < F / 5; ee++) {
        const H = ee * 37 % F, ne = ee * 13 % (v - 4);
        Math.sin(re * 0.03 + ee * 2.1) > 0.35 && P(H, ne, 1, 1, "#e2e8f0");
      }
      P(F - 26, 8, 10, 10, "#fde68a"), P(F - 24, 7, 8, 8, "#0f172a");
      for (let ee = 0; ee < F; ee += 16)
        for (let H = v; H < b; H += 16)
          P(ee, H, 16, 16, ee / 16 + H / 16 & 1 ? "#33261a" : "#2a1f14");
      P(0, v - 2, F, 2, "#4a3520");
      const he = F / pe, Ne = [];
      for (let ee = 0; ee < T.length; ee++) {
        const H = T[ee], ne = Math.round(he * (ee + 0.5)), Le = (ye[H.id] || []).length, Ae = Le > 0, C = Qt[ee % Qt.length], K = B(H), ae = v - 2;
        if (Ne.push({ x: ne - Math.floor(he / 2), w: Math.floor(he), id: H.id }), ee < T.length - 1) {
          const ce = Math.round(he * (ee + 1.5));
          for (let te = ne + 8; te < ce - 8; te += 4) P(te, v - 1, 2, 1, "#4a3520");
        }
        if (K) {
          const ce = ae - 20, te = Ae ? "#f39c12" : "#3a3222";
          P(ne - 3, ce, 6, 20, Ae ? "#5c4a2a" : "#2a2418");
          for (let V = 0; V < 5; V++) P(ne - V, ce - 5 + V, V * 2 + 1, 1, te);
          for (let V = 0; V < 5; V++) P(ne - (4 - V), ce - V, (4 - V) * 2 + 1, 1, te);
          if (Ae) {
            const V = (Math.sin(re * 0.08) + 1) / 2;
            $.globalAlpha = 0.35 + V * 0.4, P(ne - 1, ce - 6, 2, 2, "#ffd27a"), $.globalAlpha = 1;
          }
        } else {
          const ce = ae - 14;
          if (P(ne - 10, ce, 20, 3, "#7a5c47"), P(ne - 10, ce - 1, 20, 1, C), P(ne - 9, ce + 3, 2, 8, "#5c4033"), P(ne + 7, ce + 3, 2, 8, "#5c4033"), P(ne - 5, ce - 9, 10, 9, "#333"), P(ne - 4, ce - 8, 8, 7, Ae ? "#0a2a0a" : "#1a1a1a"), Ae)
            for (let te = 0; te < 3; te++) {
              const V = 2 + (re + te * 7) % 5;
              P(ne - 3, ce - 7 + te * 2, V, 0.8, "#33ff33");
            }
        }
        const Ce = Math.min(Le, 5);
        for (let ce = 0; ce < Ce; ce++) {
          const te = Ce > 1 ? (ce - (Ce - 1) / 2) * 8 : 0, V = Math.round(ne + te) - 3, oe = ae - (K ? 2 : 4), A = Qt[(ee + ce) % Qt.length], le = Math.sin(re * 0.08 + ee + ce) > 0 ? 1 : 0;
          $.fillStyle = "rgba(0,0,0,0.18)", $.fillRect(V * h, (oe + 8) * h, 6 * h, h), P(V, oe + le, 6, 6, A), P(V + 1, oe - 4 + le, 4, 4, "#fdd"), P(V + 1, oe - 5 + le, 4, 1, "#333"), (re + ee * 9 + ce * 5) % 120 >= 3 && (P(V + 2, oe - 3 + le, 1, 1, "#333"), P(V + 4, oe - 3 + le, 1, 1, "#333")), P(V + 1, oe + 6, 1, 2, A), P(V + 4, oe + 6, 1, 2, A);
        }
        Le > 5 && ($.fillStyle = C, $.font = `${3 * h}px monospace`, $.fillText(`+${Le - 5}`, (ne + 10) * h, (ae - 6) * h)), Le > 0 && ($.fillStyle = C, $.fillRect((ne + 6) * h, (ae - 30) * h, 9 * h, 9 * h), $.fillStyle = "#0f172a", $.font = `bold ${5 * h}px monospace`, $.textAlign = "center", $.fillText(String(Le), (ne + 10.5) * h, (ae - 24) * h), $.textAlign = "left"), $.fillStyle = Ae ? "#e2e8f0" : "#6b7280", $.font = `${3.4 * h}px monospace`, $.textAlign = "center";
        const Ue = H.name.length > 12 ? H.name.slice(0, 11) + "…" : H.name;
        $.fillText(Ue, ne * h, (b - 4) * h), $.textAlign = "left";
      }
      f.current = Ne;
      const je = T.reduce((ee, H) => {
        var ne;
        return ee + (((ne = ye[H.id]) == null ? void 0 : ne.length) || 0);
      }, 0);
      $.fillStyle = "#f90", $.font = `bold ${3.6 * h}px monospace`, $.fillText(`${je} card${je !== 1 ? "s" : ""} · ${pe} milestone${pe !== 1 ? "s" : ""}`, 4 * h, 8 * h);
    }, k = () => {
      d.current++, J(), m.current = requestAnimationFrame(k);
    };
    return m.current = requestAnimationFrame(k), () => {
      m.current && cancelAnimationFrame(m.current);
    };
  }, [x, b, v]), /* @__PURE__ */ t("div", { ref: l, className: "w-full mb-5", children: /* @__PURE__ */ t(
    "canvas",
    {
      ref: a,
      onClick: (E) => {
        const F = a.current;
        if (!F) return;
        const $ = F.getBoundingClientRect(), P = (E.clientX - $.left) / $.width * (F.width / h), J = f.current.find((k) => P >= k.x && P <= k.x + k.w);
        J && o(J.id);
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
function zn({ active: e, onChange: r, counts: o }) {
  return /* @__PURE__ */ t(
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
        const d = e === l.id, m = o[l.id];
        return /* @__PURE__ */ n(
          "button",
          {
            onClick: () => r(l.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: d ? "var(--accent)" : "transparent",
              color: d ? "var(--bg)" : "var(--muted)"
            },
            children: [
              l.label,
              m > 0 && /* @__PURE__ */ t(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: d ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: d ? "var(--bg)" : "var(--muted)" },
                  children: m
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
function Ve({ title: e, children: r }) {
  return /* @__PURE__ */ n("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ t("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: e }),
    r
  ] });
}
function ht({ rows: e, empty: r = "None recorded" }) {
  return e.length ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: e.map((o) => /* @__PURE__ */ n("div", { className: "rounded-md px-2 py-1.5", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)" }, children: [
    /* @__PURE__ */ n("div", { className: "flex items-start gap-2 text-[11px]", children: [
      /* @__PURE__ */ t("span", { className: "font-medium min-w-0 break-words", style: { color: "var(--text)" }, children: o.title }),
      /* @__PURE__ */ n("span", { className: "ml-auto flex gap-1 flex-shrink-0", children: [
        o.level && /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: o.level === "required" ? "var(--warn)" : "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: o.level }),
        o.status && /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: /fail|block|open|pending/i.test(o.status) ? "var(--warn)" : "var(--ok)", background: "var(--bg-hover, var(--border))" }, children: o.status })
      ] })
    ] }),
    o.detail && /* @__PURE__ */ t("div", { className: "mt-0.5 text-[10px] break-words", style: { color: "var(--muted)" }, children: o.detail }),
    o.ref && (o.url ? /* @__PURE__ */ t("a", { href: o.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: o.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: o.ref }))
  ] }, o.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: r });
}
function $e({ label: e, value: r, status: o }) {
  return /* @__PURE__ */ n("div", { className: "min-w-0", children: [
    /* @__PURE__ */ t("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ n("div", { className: "text-[11px] mt-0.5 break-words", style: { color: ft(r) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      ft(r),
      o && /* @__PURE__ */ n("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        ft(o),
        ")"
      ] })
    ] })
  ] });
}
function Fn({ card: e, inspection: r, producerSession: o, onClose: a, onOpenProducer: l, onApprove: d, onReject: m, onInterject: i }) {
  const c = r.routing, f = () => {
    const h = window.prompt(`Why reject revision ${r.revision ?? "unknown"}?`);
    h != null && h.trim() && m && (m(h.trim()), a());
  };
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (h) => {
        h.currentTarget === h.target && a();
      },
      children: /* @__PURE__ */ n(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": `gate-inspection-${e.id}`,
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(860px, calc(100vw - 32px))", maxHeight: "min(88vh, 860px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ n("header", { className: "px-5 py-4 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ n("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ t("h2", { id: `gate-inspection-${e.id}`, className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Gate result inspection" }),
                  /* @__PURE__ */ t("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)", background: `color-mix(in srgb, ${r.ready ? "var(--ok)" : "var(--warn)"} 14%, transparent)` }, children: r.ready ? "review-ready" : "not review-ready" }),
                  /* @__PURE__ */ n("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: [
                    "revision ",
                    r.revision ?? "unobservable"
                  ] })
                ] }),
                /* @__PURE__ */ t("div", { className: "text-[12px] mt-1 truncate", style: { color: "var(--text)" }, children: e.title }),
                /* @__PURE__ */ n("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: [
                  r.gate || e.stage,
                  " reviews ",
                  r.producerStep || "unobservable producer",
                  " · status ",
                  r.reviewStatus
                ] })
              ] }),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: a,
                  "aria-label": "Close gate inspection",
                  className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                  style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ n("div", { className: "overflow-y-auto p-4 flex flex-col gap-3", children: [
              /* @__PURE__ */ n("div", { className: "rounded-lg p-3", style: { background: r.ready ? "color-mix(in srgb, var(--ok) 8%, transparent)" : "color-mix(in srgb, var(--warn) 8%, transparent)", border: `1px solid color-mix(in srgb, ${r.ready ? "var(--ok)" : "var(--warn)"} 38%, var(--border))` }, children: [
                /* @__PURE__ */ t("div", { className: "text-[11px] font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)" }, children: r.ready ? "Bundle is structurally ready for review" : `${r.missing.length} readiness gap${r.missing.length === 1 ? "" : "s"}` }),
                !r.ready && /* @__PURE__ */ t("ul", { className: "mt-1.5 pl-4 list-disc text-[10px] space-y-0.5", style: { color: "var(--muted)" }, children: r.missing.map((h) => /* @__PURE__ */ t("li", { children: h }, h)) }),
                r.preferredShortfalls.length > 0 && /* @__PURE__ */ n("div", { className: "mt-2 text-[10px]", style: { color: "var(--muted)" }, children: [
                  "Preferred shortfalls (non-blocking): ",
                  r.preferredShortfalls.join(" · ")
                ] }),
                /* @__PURE__ */ t("div", { className: "text-[9px] mt-2", style: { color: "var(--muted)" }, children: "Inspection is read-only; deterministic runtime remains authoritative for movement and readiness enforcement." })
              ] }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ n(Ve, { title: "Result summary", children: [
                  /* @__PURE__ */ t("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: r.summary ? "var(--text)" : "var(--warn)" }, children: r.summary || "No result summary was published." }),
                  /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ t($e, { label: "Envelope", value: r.envelopeId }),
                    /* @__PURE__ */ t($e, { label: "Created", value: r.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ t(Ve, { title: "Changes since prior revision", children: /* @__PURE__ */ t(ht, { rows: r.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ t(Ve, { title: "Artifacts and evidence references", children: r.artifacts.length ? /* @__PURE__ */ t("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: r.artifacts.map((h) => /* @__PURE__ */ n("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ n("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ t("span", { className: "font-medium", style: { color: "var(--text)" }, children: h.label }),
                  h.kind && /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: h.kind })
                ] }),
                h.preview && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: h.preview }),
                h.ref && (h.url ? /* @__PURE__ */ t("a", { href: h.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: h.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: h.ref }))
              ] }, h.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ve, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ t(ht, { rows: r.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ t(Ve, { title: "Research and citations", children: /* @__PURE__ */ t(ht, { rows: r.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ve, { title: "Intent and requirement coverage", children: /* @__PURE__ */ t(ht, { rows: r.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ t(Ve, { title: "Omissions and deviations", children: /* @__PURE__ */ t(ht, { rows: r.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ n(Ve, { title: "Card topology and integration", children: [
                /* @__PURE__ */ n("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ t($e, { label: "Action", value: r.topology.action }),
                  /* @__PURE__ */ t($e, { label: "Integration owner", value: r.topology.integrationOwner }),
                  /* @__PURE__ */ t($e, { label: "Integration status", value: r.topology.integrationStatus }),
                  /* @__PURE__ */ t($e, { label: "Required children incomplete", value: r.topology.incompleteRequiredChildren.length })
                ] }),
                r.topology.children.length > 0 ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: r.topology.children.map((h) => /* @__PURE__ */ n("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: h.label }),
                  /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: h.required ? "var(--warn)" : "var(--muted)" }, children: h.required ? "required" : "optional" }),
                  /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(h.status) ? "var(--ok)" : "var(--warn)" }, children: h.status })
                ] }, h.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ve, { title: "Budget consumption", children: /* @__PURE__ */ n("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ t($e, { label: "Allocated", value: r.budget.allocated }),
                  /* @__PURE__ */ t($e, { label: "Consumed", value: r.budget.consumed }),
                  /* @__PURE__ */ t($e, { label: "Remaining", value: r.budget.remaining })
                ] }) }),
                /* @__PURE__ */ t(Ve, { title: "Routing and runtime provenance", children: /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ t($e, { label: "Assigned profile", value: c.assignedProfile }),
                  /* @__PURE__ */ t($e, { label: "Effective profile", value: c.effectiveProfile }),
                  /* @__PURE__ */ t($e, { label: "Model requested", value: c.model.requested }),
                  /* @__PURE__ */ t($e, { label: "Model applied", value: c.model.applied, status: c.model.status }),
                  /* @__PURE__ */ t($e, { label: "Provider / version", value: c.model.provider || c.model.version ? [c.model.provider, c.model.version].filter(Boolean) : null }),
                  /* @__PURE__ */ t($e, { label: "Effort requested", value: c.effort.requested }),
                  /* @__PURE__ */ t($e, { label: "Effort applied", value: c.effort.applied, status: c.effort.status }),
                  /* @__PURE__ */ t($e, { label: "Tools available", value: c.tools.actual, status: c.tools.status }),
                  /* @__PURE__ */ t($e, { label: "Skills available", value: c.skills.actual, status: c.skills.status }),
                  /* @__PURE__ */ t($e, { label: "Network scope", value: c.network.actual, status: c.network.status }),
                  /* @__PURE__ */ t($e, { label: "Write scope", value: c.write.actual, status: c.write.status }),
                  /* @__PURE__ */ t($e, { label: "Worktree / branch", value: c.worktree })
                ] }) })
              ] }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ t(Ve, { title: "Validation and evidence", children: /* @__PURE__ */ t(ht, { rows: r.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ t(Ve, { title: "Known risks", children: /* @__PURE__ */ t(ht, { rows: r.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ t(Ve, { title: "Open decisions and questions", children: /* @__PURE__ */ t(ht, { rows: r.decisions, empty: "No open decisions recorded" }) })
              ] })
            ] }),
            /* @__PURE__ */ n("footer", { className: "px-5 py-3 flex items-center gap-2 flex-wrap", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              d && /* @__PURE__ */ n("button", { onClick: () => {
                d(), a();
              }, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--ok)", color: "var(--bg)" }, children: [
                "Approve",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              m && /* @__PURE__ */ n("button", { onClick: f, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--danger)", color: "var(--bg)" }, children: [
                "Reject",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              i && /* @__PURE__ */ t("button", { onClick: i, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: "Interject on this revision" }),
              o && l && /* @__PURE__ */ n("button", { onClick: l, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: [
                "Open producer · ",
                o.step
              ] }),
              /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: r.producerSessionRef || "producer session reference unobservable" })
            ] })
          ]
        }
      )
    }
  );
}
function Pn({ card: e, openChat: r }) {
  const o = e.bootstrap, a = e.intent_contract || e.intent;
  if (!o && !a) return null;
  const l = `pipeline ${e.pipeline_id || ""} card ${e.id} (${e.title})`, d = (f, h) => /* @__PURE__ */ t(
    "button",
    {
      className: "text-[10px] px-2 py-0.5 rounded hover:opacity-80",
      style: { color: "var(--accent)", border: "1px solid var(--border)" },
      title: "Opens /dlc-yolo with this context — nothing is created in the browser",
      onClick: () => r({ message: `/dlc-yolo ${f} for ${l}` }),
      children: h
    }
  ), m = o ? String(o.status || "not-run") : "n/a", i = Array.isArray(o == null ? void 0 : o.crews_created) ? o.crews_created : [], c = Array.isArray(o == null ? void 0 : o.issues_opened) ? o.issues_opened : [];
  return /* @__PURE__ */ n("div", { className: "mt-2 pt-2", style: { borderTop: "1px dashed var(--border)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: "🌱 self-enablement" }),
    /* @__PURE__ */ n("div", { className: "flex flex-col gap-1 text-[10px]", children: [
      /* @__PURE__ */ n("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "① setup" }),
        /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: String(e.self_enable_mode || "default") })
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "② intent" }),
        /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: a ? String(a.classification || a.status || "present") : "not run" }),
        d("resolve intent", "Resolve intent"),
        d("skip intent", "Skip intent")
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "③ per-step" }),
        d(`elaborate step ${e.stage}`, "Elaborate step")
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "④ bootstrap" }),
        /* @__PURE__ */ t("span", { style: { color: m === "done" ? "var(--ok)" : "var(--muted)" }, children: m }),
        i.length > 0 && /* @__PURE__ */ n("span", { style: { color: "var(--muted)" }, children: [
          "· crews ",
          i.length
        ] }),
        c.length > 0 && /* @__PURE__ */ n("span", { style: { color: "var(--muted)" }, children: [
          "· issues ",
          c.length
        ] }),
        o != null && o.blocking_reason ? /* @__PURE__ */ n("span", { style: { color: "var(--warn)" }, children: [
          "· ",
          String(o.blocking_reason)
        ] }) : null,
        d("resume bootstrap", "Resume bootstrap")
      ] }),
      m === "done" && /* @__PURE__ */ t("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "Replaying bootstrap is idempotent intent, not a promise." })
    ] })
  ] });
}
function Un({ cards: e, schedulerState: r, statePath: o, readAppFile: a, onClose: l }) {
  const d = Te(() => Rn(e, r), [e, r]), [m, i] = N(Jt(null)), [c, f] = N([]), [h, w] = N([]);
  qe(() => {
    const x = `${o.replace(/\/state\.json$/, "")}/workspaces/default/data/ledger/projections/status.json`;
    let y = !1;
    return a(x).then((B) => {
      if (!y)
        try {
          i(Jt(JSON.parse(B.content || "null")));
        } catch {
          i(Jt(null));
        }
    }).catch(() => {
      y || i(Jt(null));
    }), () => {
      y = !0;
    };
  }, [o, a]), qe(() => {
    const v = [], x = [];
    for (const y of e) {
      const B = y.step_sessions;
      if (B) for (const [E, F] of Object.entries(B)) v.push({ card: y.id, step: E, slot: F == null ? void 0 : F.slot_key });
      const O = y.worktree_lease;
      O && x.push({ card: y.id, branch: O.branch, status: O.status });
    }
    f(v.slice(0, 60)), w(x.slice(0, 60));
  }, [e]);
  const b = ({ title: v, children: x }) => /* @__PURE__ */ n("div", { className: "mb-4", children: [
    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: v }),
    x
  ] });
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
      onMouseDown: (v) => {
        v.currentTarget === v.target && l();
      },
      children: /* @__PURE__ */ n(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Operations",
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(760px, calc(100vw - 32px))", maxHeight: "min(88vh, 880px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ n("header", { className: "px-5 py-3 flex items-center gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ t("h2", { className: "text-[15px] font-semibold flex-1", style: { color: "var(--text-strong, var(--text))" }, children: "🛠 Operations" }),
              /* @__PURE__ */ t("button", { onClick: l, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ n("div", { className: "px-5 py-3 overflow-y-auto text-[11px]", children: [
              /* @__PURE__ */ n(b, { title: "Runtime / scheduler", children: [
                /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-2", children: Mr.map((v) => /* @__PURE__ */ n("span", { className: "px-2 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: d.counts[v] ? "var(--text)" : "var(--muted)" }, children: [
                  v,
                  " ",
                  d.counts[v]
                ] }, v)) }),
                d.waitReasons.length > 0 && /* @__PURE__ */ t("div", { className: "mt-2", children: d.waitReasons.map((v, x) => /* @__PURE__ */ n("div", { style: { color: "var(--muted)" }, children: [
                  "⛔ ",
                  v.card,
                  ": ",
                  v.reason
                ] }, x)) })
              ] }),
              /* @__PURE__ */ t(b, { title: "Projection parity", children: m.available ? /* @__PURE__ */ n("div", { children: [
                /* @__PURE__ */ n("div", { style: { color: m.verified ? "var(--ok)" : "var(--warn)" }, children: [
                  m.label,
                  " · authority ",
                  m.authority_active ? "active" : "inactive"
                ] }),
                m.digest_match !== null && /* @__PURE__ */ n("div", { style: { color: "var(--muted)" }, children: [
                  "digest match: ",
                  String(m.digest_match)
                ] }),
                m.failure_code && /* @__PURE__ */ n("div", { style: { color: "var(--warn)" }, children: [
                  "failure: ",
                  m.failure_code
                ] }),
                /* @__PURE__ */ t("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "last-known-good runs.json preserved when blocked" })
              ] }) : /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: "unavailable" }) }),
              /* @__PURE__ */ t(b, { title: "Webhook", children: /* @__PURE__ */ t(Lr, {}) }),
              /* @__PURE__ */ n(b, { title: "Sessions & worktrees", children: [
                /* @__PURE__ */ n("div", { className: "mb-1", style: { color: "var(--muted)" }, children: [
                  c.length,
                  " session(s) · ",
                  h.length,
                  " lease(s)"
                ] }),
                c.slice(0, 12).map((v, x) => /* @__PURE__ */ n("div", { style: { color: "var(--text)" }, children: [
                  v.card,
                  " · ",
                  v.step,
                  v.slot ? ` · ${v.slot}` : ""
                ] }, x)),
                h.slice(0, 12).map((v, x) => /* @__PURE__ */ n("div", { style: { color: "var(--muted)" }, children: [
                  "🌿 ",
                  v.card,
                  " · ",
                  v.branch || "—",
                  " · ",
                  v.status || "—"
                ] }, `l${x}`))
              ] })
            ] })
          ]
        }
      )
    }
  );
}
function xe(e, r) {
  return r == null || r === "" ? null : /* @__PURE__ */ n("div", { className: "flex gap-2 text-[11px] py-0.5", children: [
    /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: "var(--muted)", minWidth: "110px" }, children: e }),
    /* @__PURE__ */ t("span", { className: "min-w-0 break-words", style: { color: "var(--text)" }, children: String(r) })
  ] });
}
function Sr(e) {
  return typeof e == "string" && /^https?:\/\//i.test(e);
}
function Wn({ card: e, cardStatus: r, effectiveCapability: o, onClose: a }) {
  var w, b, v;
  const [l, d] = N("overview"), m = [
    ["overview", "Overview"],
    ["results", "Results"],
    ["history", "Decisions & history"],
    ["execution", "Execution"]
  ], i = e.execution_schedule, c = i != null && i.current_node_id ? (w = i == null ? void 0 : i.nodes) == null ? void 0 : w[i.current_node_id] : void 0, f = e.worktree_lease, h = e.topology;
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (x) => {
        x.currentTarget === x.target && a();
      },
      children: /* @__PURE__ */ n(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Card details",
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(760px, calc(100vw - 32px))", maxHeight: "min(88vh, 860px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ n("header", { className: "px-5 py-3 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ t("div", { className: "text-[14px] font-semibold truncate", style: { color: "var(--text-strong, var(--text))" }, children: e.title }),
                /* @__PURE__ */ n("div", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: [
                  e.stage,
                  " · ",
                  r.label
                ] })
              ] }),
              /* @__PURE__ */ t("button", { onClick: a, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ t("nav", { className: "flex gap-1 px-3 pt-2", style: { borderBottom: "1px solid var(--border)" }, children: m.map(([x, y]) => /* @__PURE__ */ t(
              "button",
              {
                onClick: () => d(x),
                className: "text-[11px] px-2.5 py-1 rounded-t-md",
                style: {
                  color: l === x ? "var(--accent)" : "var(--muted)",
                  borderBottom: l === x ? "2px solid var(--accent)" : "2px solid transparent"
                },
                children: y
              },
              x
            )) }),
            /* @__PURE__ */ n("div", { className: "px-5 py-3 overflow-y-auto text-[11px]", children: [
              l === "overview" && /* @__PURE__ */ n("div", { children: [
                (b = e.source) != null && b.url && Sr(e.source.url) ? xe("source", null) || /* @__PURE__ */ n("div", { className: "text-[11px] py-0.5", children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--muted)", minWidth: 110, display: "inline-block" }, children: "source" }),
                  /* @__PURE__ */ n("a", { href: e.source.url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: [
                    e.source.repo,
                    e.source.issue ? `#${e.source.issue}` : ""
                  ] })
                ] }) : xe("source", (v = e.source) == null ? void 0 : v.repo),
                xe("pipeline", e.pipeline_id),
                xe("workspace", e.workspace),
                xe("stage", e.stage),
                xe("lifecycle", e.lifecycle),
                xe("SoT", e.sot),
                xe("status", `${r.label}${r.reason ? ` — ${r.reason}` : ""}`),
                xe("trust", e.trust ? `${e.trust} (override)` : "inherited"),
                xe("depth", e.depth ? `${e.depth} (override)` : "inherited"),
                xe("capability", o),
                xe("effort", e.effort ? JSON.stringify(e.effort) : null),
                xe("writes_allowed", e.writes_allowed === !1 ? "false (cancel requested)" : null)
              ] }),
              l === "results" && /* @__PURE__ */ n("div", { children: [
                Object.entries(e.step_summaries || {}).map(([x, y]) => /* @__PURE__ */ n("div", { className: "mb-2", children: [
                  /* @__PURE__ */ n("div", { className: "font-medium", style: { color: "var(--text)" }, children: [
                    x,
                    ": ",
                    (y == null ? void 0 : y.headline) || "—"
                  ] }),
                  (y == null ? void 0 : y.description) && /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: y.description }),
                  (y == null ? void 0 : y.executor) && /* @__PURE__ */ n("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: [
                    "executor ",
                    y.executor
                  ] })
                ] }, x)),
                Object.entries(e.artifacts || {}).map(([x, y]) => /* @__PURE__ */ t("div", { className: "py-0.5", children: Sr(y) ? /* @__PURE__ */ t("a", { href: y, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: x }) : /* @__PURE__ */ n("span", { style: { color: "var(--text)" }, children: [
                  x,
                  ": ",
                  /* @__PURE__ */ t("code", { style: { color: "var(--muted)" }, children: String(y) })
                ] }) }, x)),
                !e.step_summaries && !e.artifacts && /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: "No results recorded." })
              ] }),
              l === "history" && /* @__PURE__ */ n("div", { children: [
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-1 mb-1", style: { color: "var(--muted)" }, children: "Decisions" }),
                (e.decisions || []).map((x, y) => /* @__PURE__ */ n("div", { className: "py-0.5", style: { color: "var(--text)" }, children: [
                  String(x.status) === "open" ? "🔴 " : "✓ ",
                  String(x.kind),
                  " — ",
                  String(x.question || x.chosen || x.action || "")
                ] }, y)),
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Stage history" }),
                (e.history || []).map((x, y) => /* @__PURE__ */ n("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                  String(x.from),
                  " → ",
                  String(x.to),
                  " · ",
                  String(x.agent || ""),
                  " · ",
                  String(x.at || "")
                ] }, y)),
                (e.gate_history || []).length > 0 && /* @__PURE__ */ n(Xe, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Gates" }),
                  (e.gate_history || []).map((x, y) => /* @__PURE__ */ n("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.decision),
                    " ",
                    String(x.gate),
                    " · ",
                    String(x.actor || "")
                  ] }, y))
                ] }),
                (e.interjection || []).length > 0 && /* @__PURE__ */ n(Xe, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Requests / interjections" }),
                  (e.interjection || []).map((x, y) => /* @__PURE__ */ n("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.kind),
                    " · ",
                    String(x.status),
                    x.reason ? ` (${String(x.reason)})` : ""
                  ] }, y))
                ] })
              ] }),
              l === "execution" && /* @__PURE__ */ n("div", { children: [
                xe("current node", i == null ? void 0 : i.current_node_id),
                xe("node status", c == null ? void 0 : c.status),
                xe("permit", c == null ? void 0 : c.permit_id),
                xe("concurrency class", c == null ? void 0 : c.concurrency_class),
                xe("model (requested)", e.model_request),
                xe("model (applied)", e.model_applied),
                h && /* @__PURE__ */ n(Xe, { children: [
                  xe("topology", h.action),
                  xe("integration owner", h.integration_owner),
                  xe("children", Array.isArray(h.children) ? `${h.children.length}` : null)
                ] }),
                f && /* @__PURE__ */ n(Xe, { children: [
                  xe("worktree branch", f.branch),
                  xe("lease status", f.status),
                  xe("lease locked", f.locked ? "true" : null)
                ] }),
                xe("cancel requested", e.cancel_requested_at),
                e.writes_allowed === !1 && xe("terminal observed", "pending (cooperative cancel in progress)")
              ] })
            ] }),
            /* @__PURE__ */ t("footer", { className: "px-5 py-2 text-[9px]", style: { borderTop: "1px solid var(--border)", color: "var(--muted)" }, children: "Read-only view. Use 🔧 maintain to request changes; gate actions use the gate controls." })
          ]
        }
      )
    }
  );
}
function Hn({ onRequest: e }) {
  const [r, o] = N(!1), a = De(null), [l, d] = N(null), [m, i] = Dn(), c = async (h) => {
    console.info("[dlc-yolo maintain] click:", h);
    const w = cr[h];
    if (o(!1), !await m({
      message: w.confirm,
      confirmLabel: w.label,
      danger: h === "request:cancel"
    })) {
      console.info("[dlc-yolo maintain] cancelled");
      return;
    }
    console.info("[dlc-yolo maintain] confirmed -> onRequest", h), e(h, "");
  }, f = () => {
    o((h) => {
      const w = !h;
      if (w && a.current) {
        const b = a.current.getBoundingClientRect();
        d({ top: b.bottom + 4, left: b.left });
      }
      return w;
    });
  };
  return qe(() => {
    if (!r) return;
    const h = () => o(!1);
    return window.addEventListener("scroll", h, !0), window.addEventListener("resize", h), () => {
      window.removeEventListener("scroll", h, !0), window.removeEventListener("resize", h);
    };
  }, [r]), /* @__PURE__ */ n("div", { className: "relative inline-block", children: [
    i,
    /* @__PURE__ */ t(
      "button",
      {
        ref: a,
        className: "text-[10px] hover:underline",
        style: { color: "var(--muted)" },
        title: "Request re-spec / retry / back-step / park / cancel",
        onClick: f,
        children: "🔧 maintain"
      }
    ),
    r && l && Pr(
      /* @__PURE__ */ n(Xe, { children: [
        /* @__PURE__ */ t(
          "div",
          {
            style: { position: "fixed", inset: 0, zIndex: 2147483646 },
            onMouseDown: () => o(!1)
          }
        ),
        /* @__PURE__ */ t(
          "div",
          {
            className: "rounded-md py-1 text-[11px]",
            style: {
              position: "fixed",
              top: l.top,
              left: l.left,
              zIndex: 2147483647,
              background: "var(--bg-elevated, var(--bg))",
              border: "1px solid var(--border-strong, var(--border))",
              boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
              minWidth: "120px"
            },
            children: Object.entries(cr).map(([h, w]) => /* @__PURE__ */ t(
              "button",
              {
                className: "block w-full text-left px-3 py-1 hover:opacity-80",
                style: { color: h === "request:cancel" ? "var(--danger, #e66)" : "var(--text)" },
                onClick: () => c(h),
                children: w.label
              },
              h
            ))
          }
        )
      ] }),
      document.body
    )
  ] });
}
function Gn({ card: e, decision: r, onClose: o, onResolve: a }) {
  var c, f, h;
  const l = r.options || [], d = ((c = l.find((w) => w.recommended === !0)) == null ? void 0 : c.id) || ((f = l.find((w) => w.id && (r.rationale || "").toLowerCase().includes((w.id + ")").toLowerCase()))) == null ? void 0 : f.id) || ((h = l[0]) == null ? void 0 : h.id), [m, i] = N(d || "");
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[72] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (w) => {
        w.currentTarget === w.target && o();
      },
      children: /* @__PURE__ */ n(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": `decision-resolve-${r.id}`,
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(560px, calc(100vw - 32px))", maxHeight: "min(80vh, 640px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ n("header", { className: "px-5 py-4 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ n("h2", { id: `decision-resolve-${r.id}`, className: "text-[14px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: [
                  "⚖ Choose an option",
                  r.step ? ` · ${r.step}` : ""
                ] }),
                /* @__PURE__ */ t("div", { className: "text-[12px] mt-1", style: { color: "var(--text)" }, children: r.question || r.kind }),
                /* @__PURE__ */ t("div", { className: "text-[10px] mt-0.5 truncate", style: { color: "var(--muted)" }, children: e.title })
              ] }),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: o,
                  "aria-label": "Close decision",
                  className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                  style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ n("div", { className: "overflow-y-auto p-4 flex flex-col gap-2", children: [
              l.map((w, b) => {
                const v = w.id || String.fromCharCode(65 + b), x = m === (w.id || v), y = (w.id || v) === d;
                return /* @__PURE__ */ n(
                  "label",
                  {
                    className: "flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer",
                    style: {
                      background: x ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--bg-hover, transparent)",
                      border: `1px solid ${x ? "var(--accent)" : "var(--border)"}`
                    },
                    children: [
                      /* @__PURE__ */ t(
                        "input",
                        {
                          type: "radio",
                          name: `decision-${r.id}`,
                          className: "mt-0.5",
                          checked: x,
                          onChange: () => i(w.id || v)
                        }
                      ),
                      /* @__PURE__ */ n("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ n("div", { className: "text-[12px] font-semibold flex items-center gap-1.5", style: { color: "var(--text-strong, var(--text))" }, children: [
                          "Option ",
                          v,
                          y && /* @__PURE__ */ t("span", { className: "text-[10px] font-normal", style: { color: "var(--accent)" }, children: "⭐ recommended" })
                        ] }),
                        /* @__PURE__ */ t("div", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: w.note }),
                        w.risk && /* @__PURE__ */ n("div", { className: "text-[10px] mt-0.5", style: { color: "var(--warn, var(--muted))" }, children: [
                          "risk: ",
                          w.risk
                        ] })
                      ] })
                    ]
                  },
                  v
                );
              }),
              r.rationale && /* @__PURE__ */ n("div", { className: "text-[10px] italic mt-1 p-2 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, transparent)" }, children: [
                "Agent rationale: ",
                r.rationale
              ] })
            ] }),
            /* @__PURE__ */ n("footer", { className: "px-5 py-3 flex items-center justify-end gap-2", style: { borderTop: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: o,
                  className: "text-[12px] px-3 py-1.5 rounded-md",
                  style: { color: "var(--muted)", border: "1px solid var(--border)" },
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  disabled: !m,
                  onClick: () => {
                    m && (a(m), o());
                  },
                  className: "text-[12px] px-3 py-1.5 rounded-md font-semibold",
                  style: { background: m ? "var(--accent)" : "var(--border)", color: m ? "var(--bg)" : "var(--muted)", cursor: m ? "pointer" : "not-allowed" },
                  children: "Resolve on this branch"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function Tt({ card: e, config: r, isGate: o, cardStatus: a, effectiveCapability: l, producerStep: d, producerSession: m, onOpenProducer: i, onApprove: c, onReject: f, onCycleTrust: h, onCycleDepth: w, onSetBudget: b, onInterject: v, onResolveDecision: x, onOpenOrchestrator: y, liveView: B, allCards: O, onOpenCard: E, onRequest: F, onOpenStepSession: $, onCancelCard: P }) {
  var it, nt, wt, Oe, bt, ct, Qe, fe, Nt, et;
  const J = o ? "var(--warn)" : a.kind === "idle" ? "var(--border-strong, var(--border))" : a.color, k = e.trust || r.trust, re = e.depth || r.depth, T = ((it = e.parked) == null ? void 0 : it.length) || 0, ye = Object.values(e.step_sessions || {}).some(
    (S) => !!S.last_response_at && !S.chat_disabled_at && !S.superseded && (!S.last_response_handled_at || S.last_response_handled_at < S.last_response_at)
  ), [pe, he] = N(""), [Ne, je] = N(!1), [ee, H] = N(null), [ne, Ee] = N(!1), [Le, Ae] = N(!1), { openChat: C } = Ar(), K = Te(() => vn(e), [e]), ae = Te(() => bn(e, O || []), [e, O]), Ce = Te(() => xn(e), [e]), Ue = Te(() => {
    if (!Ce) return null;
    const S = (O || []).find((L) => L.id === Ce);
    return S ? { id: S.id, title: S.title } : null;
  }, [Ce, O]), ce = K.length > 0 || ae.length > 0 || !!Ue, te = Te(
    () => o ? rn(e, d) : null,
    [e, o, d]
  ), V = () => {
    const S = window.prompt(`Why reject revision ${(te == null ? void 0 : te.revision) ?? "unknown"}?`);
    S != null && S.trim() && f && f(S.trim());
  }, oe = (e.decisions || []).filter((S) => !S.chosen && !S.resolved_at && (!!S.action || !!S.options)), [A, le] = N(!1), [Be, Ge] = N(!1), [_e, ue] = N("live"), [lt, ve] = N(() => {
    const S = Number(typeof localStorage < "u" && localStorage.getItem("dlc-live-wing-width"));
    return Number.isFinite(S) && S >= 220 ? S : 320;
  }), We = (wt = (nt = e.step_sessions) == null ? void 0 : nt[e.stage]) == null ? void 0 : wt.slot_key, Je = (() => {
    var ze, Ye, xt, dt;
    const S = (ze = e.step_results) == null ? void 0 : ze[e.stage], L = S && typeof S == "object" && S.bundle && typeof S.bundle == "object" ? S.bundle.summary : void 0;
    if (typeof L == "string" && L.trim()) return L;
    const be = (Ye = e.step_progress) == null ? void 0 : Ye[e.stage], Se = be && typeof be == "object" && Array.isArray(be.lines) ? be.lines : [];
    if (Se.length) {
      const pt = Se.map((at) => String((at == null ? void 0 : at.note) || "")).filter(Boolean);
      if (pt.length) return pt.join(`
`);
    }
    const Ie = (dt = (xt = e.step_summaries) == null ? void 0 : xt[e.stage]) == null ? void 0 : dt.headline;
    return typeof Ie == "string" && Ie.trim() ? Ie : "";
  })(), me = B || (We ? {
    stage: e.stage,
    phase: "idle",
    tail: Je,
    buffer: Je,
    active: !1,
    seq: 0,
    slotKey: We,
    onOpen: () => navigate(`/chat?sid=${encodeURIComponent(We)}`)
  } : null);
  return /* @__PURE__ */ n(
    "div",
    {
      id: `card-${e.id}`,
      "data-card-root": !0,
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${J}`,
        position: "relative",
        // Each card is its own stacking context. Sibling cards in a column share zIndex:1, so
        // without isolation their stacking falls back to DOM order and a card's absolutely-
        // positioned children (the live-wing handle/panel at left:100%, ~46px tall, plus the
        // panel's drop-shadow) composite against neighbouring cards — a lower card paints over
        // the previous card's handle/shadow region, reading as vertical overlap (most visible in
        // the ✅ Done column, where retired cards keep a producer session so the wing still
        // mounts). `isolation:isolate` scopes every card's descendants to its own box so nothing
        // can bleed onto a sibling; the column's gap-2 then separates them cleanly.
        isolation: "isolate",
        // Closed, zIndex:1 among siblings is fine (isolation contains the handle/shadow). But an
        // OPEN wing extends past the card's right edge over the neighbour's area, and — trapped in
        // this card's stacking context at zIndex:1 like every sibling — a LATER sibling card paints
        // over it (the "decision/live wing z-index" bug). Lift the whole card above its siblings
        // while its wing is open so the trapped wing wins.
        zIndex: A ? 40 : 1
      },
      children: [
        (() => {
          const S = ($ || []).find((L) => L.step === e.stage);
          return S ? /* @__PURE__ */ n(
            "button",
            {
              onClick: () => S.open(),
              className: "text-[13px] font-medium leading-snug truncate text-left w-full hover:underline inline-flex items-center gap-1 group",
              title: `Open the ${e.stage} step session`,
              style: { color: "var(--text-strong, var(--text))", cursor: "pointer" },
              children: [
                /* @__PURE__ */ t("span", { className: "truncate", children: e.title }),
                /* @__PURE__ */ t("span", { className: "opacity-40 group-hover:opacity-100 flex-shrink-0", style: { color: "var(--accent)" }, "aria-hidden": "true", children: "↗" })
              ]
            }
          ) : /* @__PURE__ */ t("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: e.title });
        })(),
        ((Oe = e.source) == null ? void 0 : Oe.repo) && /* @__PURE__ */ n(
          "a",
          {
            href: e.source.url || void 0,
            target: "_blank",
            rel: "noreferrer",
            className: "text-[11px] mt-0.5 inline-block truncate max-w-full hover:underline",
            style: { color: "var(--muted)" },
            children: [
              e.source.repo,
              e.source.issue ? `#${e.source.issue}` : ""
            ]
          }
        ),
        (() => {
          var L;
          const S = (L = e.step_summaries) == null ? void 0 : L[e.stage];
          return S != null && S.headline ? /* @__PURE__ */ n("div", { className: "mt-1 flex items-start gap-1 text-[11px] leading-snug", title: S.description || S.headline, children: [
            S.needs_human ? /* @__PURE__ */ t("span", { "aria-label": "needs you", title: "Needs you", style: { color: "var(--warn)" }, children: "🔴" }) : /* @__PURE__ */ t("span", { "aria-hidden": "true", style: { color: "var(--muted)" }, children: "•" }),
            /* @__PURE__ */ t("span", { className: "truncate", style: { color: S.needs_human ? "var(--warn)" : "var(--text)" }, children: S.headline })
          ] }) : null;
        })(),
        /* @__PURE__ */ n("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "⚙ modes" }),
          /* @__PURE__ */ n(
            Ze,
            {
              color: ar[k],
              active: !!e.trust,
              onClick: h,
              title: `trust: ${k}${e.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🛡 ",
                k
              ]
            }
          ),
          /* @__PURE__ */ n(
            Ze,
            {
              color: or[re],
              active: !!e.depth,
              onClick: w,
              title: `depth: ${re}${e.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🔬 ",
                re
              ]
            }
          ),
          /* @__PURE__ */ n(
            Ze,
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
          b && /* @__PURE__ */ n("span", { className: "inline-flex items-center gap-0.5", title: "Decomposition/effort budget for this card", children: [
            /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "💰" }),
            /* @__PURE__ */ t(un, { budget: e.budget, depth: re, onSave: b })
          ] })
        ] }),
        /* @__PURE__ */ n(
          "div",
          {
            className: "mt-1.5 flex items-center gap-1 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "🏷 state" }),
              /* @__PURE__ */ t(
                Ze,
                {
                  color: a.color,
                  active: a.kind !== "idle",
                  title: `${a.label}${a.reason ? ` — ${a.reason}` : ""}`,
                  children: a.label
                }
              ),
              /* @__PURE__ */ n(
                Ze,
                {
                  color: e.sot === "local" ? "var(--warn)" : e.sot === "github" ? "var(--info)" : "var(--muted)",
                  active: e.sot === "local",
                  title: e.sot === "local" ? "Local stage authority; linked cards retry guarded GitHub convergence" : e.sot === "github" ? "GitHub issue label is stage authority" : "Source-of-truth field is unrecorded",
                  children: [
                    e.sot === "github" ? "🌐" : e.sot === "local" ? "💾" : "❔",
                    " sot:",
                    e.sot || "unknown"
                  ]
                }
              ),
              e.lifecycle && /* @__PURE__ */ n(Ze, { color: "var(--muted)", title: `card lifecycle: ${e.lifecycle}`, children: [
                "🔄 ",
                e.lifecycle
              ] }),
              T > 0 && /* @__PURE__ */ n(Ze, { color: "var(--warn)", title: `${T} parked idea(s)`, children: [
                "⏸ ",
                T
              ] }),
              ye && /* @__PURE__ */ t(Ze, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
              typeof ((bt = e.effort) == null ? void 0 : bt.total) == "number" && e.effort.total > 0 && /* @__PURE__ */ n(Ze, { color: "var(--info)", title: `estimated effort: ${e.effort.total} points`, children: [
                "⚡ ",
                e.effort.total
              ] }),
              e.backstep_history && e.backstep_history.length > 0 && /* @__PURE__ */ n(
                Ze,
                {
                  color: "var(--danger)",
                  title: `stepped back ${e.backstep_history.length}× — last: ${e.backstep_history[e.backstep_history.length - 1].reason}`,
                  children: [
                    "↩ ",
                    e.backstep_history.length
                  ]
                }
              ),
              e.decisions && e.decisions.length > 0 && (() => {
                const S = e.decisions[e.decisions.length - 1];
                return /* @__PURE__ */ n(
                  Ze,
                  {
                    color: "var(--accent)",
                    title: `${e.decisions.length} decision${e.decisions.length === 1 ? "" : "s"} — last: ${S.question || S.kind || ""}${S.action ? ` → ${S.action}` : ""}${S.rationale ? `
${S.rationale}` : ""}`,
                    children: [
                      "⚖ ",
                      e.decisions.length
                    ]
                  }
                );
              })()
            ]
          }
        ),
        o && te && /* @__PURE__ */ n(
          "div",
          {
            "data-gate-inspection-summary": !0,
            className: "mt-2.5 rounded-md p-2",
            style: { background: te.ready ? "color-mix(in srgb, var(--ok) 7%, transparent)" : "color-mix(in srgb, var(--warn) 7%, transparent)", border: `1px solid color-mix(in srgb, ${te.ready ? "var(--ok)" : "var(--warn)"} 32%, var(--border))` },
            children: [
              /* @__PURE__ */ n("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
                /* @__PURE__ */ t("span", { className: "font-semibold", style: { color: te.ready ? "var(--ok)" : "var(--warn)" }, children: te.ready ? "Review-ready" : "Not review-ready" }),
                /* @__PURE__ */ n("span", { className: "ml-auto", style: { color: "var(--muted)" }, children: [
                  "r",
                  te.revision ?? "?"
                ] }),
                /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: te.reviewStatus })
              ] }),
              /* @__PURE__ */ t("div", { className: "mt-1 text-[11px] leading-snug overflow-hidden", style: { color: te.summary ? "var(--text)" : "var(--warn)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: te.summary || "No review bundle summary published." }),
              !te.ready && /* @__PURE__ */ n("div", { className: "mt-1 text-[9px]", style: { color: "var(--muted)" }, children: [
                te.missing.length,
                " readiness gap",
                te.missing.length === 1 ? "" : "s"
              ] }),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  onClick: () => je(!0),
                  className: "mt-1.5 text-[10px] font-semibold hover:underline",
                  style: { color: "var(--accent)" },
                  children: "Inspect result bundle →"
                }
              )
            ]
          }
        ),
        o && c && f && /* @__PURE__ */ n("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          (() => {
            const S = (e.gate_commands || []).filter((ze) => ze.gate === e.stage), L = S.length ? S[S.length - 1] : void 0, be = (L == null ? void 0 : L.status) === "pending", Se = (L == null ? void 0 : L.status) === "rejected", Ie = (L == null ? void 0 : L.status) === "applied" || (L == null ? void 0 : L.status) === "approved";
            return /* @__PURE__ */ n(Xe, { children: [
              /* @__PURE__ */ n(
                "button",
                {
                  disabled: be,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--ok)", color: "var(--bg)" },
                  onClick: c,
                  title: be ? "A gate command is being processed…" : "Approve this gate",
                  children: [
                    be && (L == null ? void 0 : L.action) === "approve" && /* @__PURE__ */ t(Et, { size: 10 }),
                    be && (L == null ? void 0 : L.action) === "approve" ? "Approving…" : "✓ Approve"
                  ]
                }
              ),
              /* @__PURE__ */ n(
                "button",
                {
                  disabled: be,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--danger)", color: "var(--bg)" },
                  onClick: V,
                  children: [
                    be && (L == null ? void 0 : L.action) === "reject" && /* @__PURE__ */ t(Et, { size: 10 }),
                    be && (L == null ? void 0 : L.action) === "reject" ? "Rejecting…" : "✕ Reject"
                  ]
                }
              ),
              be && /* @__PURE__ */ n("span", { className: "text-[10px] inline-flex items-center gap-1", style: { color: "var(--muted)" }, children: [
                /* @__PURE__ */ t(Et, { size: 10 }),
                " ",
                L == null ? void 0 : L.action,
                " sent — runtime processing…"
              ] }),
              Se && /* @__PURE__ */ n(
                "span",
                {
                  className: "text-[10px]",
                  style: { color: "var(--danger)" },
                  title: (L == null ? void 0 : L.rejection_reason) || "rejected",
                  children: [
                    "⚠ ",
                    L == null ? void 0 : L.action,
                    " rejected: ",
                    (L == null ? void 0 : L.rejection_reason) || "see gate result"
                  ]
                }
              ),
              Ie && /* @__PURE__ */ n("span", { className: "text-[10px]", style: { color: "var(--ok)" }, children: [
                "✓ ",
                L == null ? void 0 : L.action,
                " applied"
              ] })
            ] });
          })(),
          m && i && /* @__PURE__ */ n(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
              style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
              onClick: i,
              title: `Open the ${m.step} producer session${m.retained ? " (held for this gate)" : ""}`,
              children: [
                /* @__PURE__ */ t("span", { "aria-hidden": "true", children: "↗" }),
                "Open producer · ",
                m.step
              ]
            }
          ),
          (e.stage === "gate-review" || /review/i.test(e.stage || "")) && (() => {
            var Ie, ze, Ye;
            const S = (Ie = e.source) == null ? void 0 : Ie.repo;
            if (!S) return null;
            const L = (ze = e.artifacts) == null ? void 0 : ze.pr_url, be = L && ((Ye = /\/pull\/(\d+)/.exec(L)) == null ? void 0 : Ye[1]), Se = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + S)}` + (be ? `&pr=${be}` : "");
            return /* @__PURE__ */ n(
              "a",
              {
                href: Se,
                title: L ? `Deep-review PR #${be} in Code Review Sage` : `Open Code Review Sage for ${S}`,
                className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
                style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: [
                  /* @__PURE__ */ n("svg", { width: "11", height: "11", viewBox: "0 0 16 16", fill: "none", children: [
                    /* @__PURE__ */ t("circle", { cx: "7", cy: "7", r: "4.5", stroke: "currentColor", strokeWidth: "1.5" }),
                    /* @__PURE__ */ t("path", { d: "M10.5 10.5L14 14", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                  ] }),
                  "Review in Sage"
                ]
              }
            );
          })()
        ] }),
        (() => {
          const S = e.block_reason || {}, L = new Set(oe.map((Se) => Se.step).filter(Boolean)), be = Object.entries(S).filter(([Se]) => !L.has(Se));
          return be.length ? be.map(([Se, Ie]) => /* @__PURE__ */ n(
            "div",
            {
              className: "mt-2 p-2 rounded-md text-[11px]",
              style: { background: "color-mix(in srgb, var(--danger, #e66) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--danger, #e66) 35%, var(--border))" },
              children: [
                /* @__PURE__ */ n("div", { className: "font-semibold", style: { color: "var(--danger, #e66)" }, children: [
                  "⏸ Blocked · ",
                  Se
                ] }),
                /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: Ie }),
                v && /* @__PURE__ */ t(
                  "button",
                  {
                    className: "mt-1.5 text-[10px] px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--accent)", color: "var(--bg)" },
                    onClick: () => le(!0),
                    children: "✏️ interject to unblock"
                  }
                )
              ]
            },
            `block-${Se}`
          )) : null;
        })(),
        x && oe.length > 0 && /* @__PURE__ */ n(
          "button",
          {
            onClick: () => {
              ue("decision"), le(!0);
            },
            className: "mt-2 w-full text-left px-2 py-1.5 rounded-md text-[11px] flex items-center gap-1.5 hover:opacity-90",
            style: {
              background: "color-mix(in srgb, var(--warn, var(--accent)) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--warn, var(--accent)) 40%, var(--border))",
              color: "var(--text)"
            },
            title: "Open the decision panel in the wing",
            children: [
              /* @__PURE__ */ t("span", { "aria-hidden": "true", children: "⚖" }),
              /* @__PURE__ */ n("span", { className: "truncate", children: [
                oe.length === 1 ? "Decision needs you" : `${oe.length} decisions need you`,
                (ct = oe[0]) != null && ct.step ? ` · ${oe[0].step}` : ""
              ] }),
              /* @__PURE__ */ t("span", { className: "ml-auto opacity-70", "aria-hidden": "true", children: "›" })
            ]
          }
        ),
        (me || oe.length > 0) && /* @__PURE__ */ n(Xe, { children: [
          /* @__PURE__ */ t(
            "div",
            {
              role: "region",
              "aria-label": "Live session",
              style: {
                position: "absolute",
                top: 0,
                left: "100%",
                height: "100%",
                width: `${lt}px`,
                overflow: "hidden",
                zIndex: 0,
                pointerEvents: A ? "auto" : "none"
              },
              children: /* @__PURE__ */ n(
                "div",
                {
                  className: Be ? void 0 : "dlc-wing-slide",
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: "100%",
                    transform: A ? "translateX(0)" : "translateX(-100%)",
                    willChange: "transform",
                    background: "var(--card)",
                    color: "var(--card-fg, var(--text))",
                    border: "1px solid var(--border)",
                    borderRight: `2px solid ${J}`,
                    borderRadius: "8px 0 0 8px",
                    boxShadow: "-4px 0 18px rgba(0,0,0,0.35)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                  },
                  children: [
                    /* @__PURE__ */ t(
                      "div",
                      {
                        onMouseDown: (S) => {
                          S.preventDefault();
                          const L = S.clientX, be = lt;
                          let Se = be;
                          Ge(!0);
                          const Ie = (Ye) => {
                            Se = Math.min(720, Math.max(240, be + (Ye.clientX - L))), ve(Se);
                          }, ze = () => {
                            Ge(!1);
                            try {
                              localStorage.setItem("dlc-live-wing-width", String(Se));
                            } catch {
                            }
                            window.removeEventListener("mousemove", Ie), window.removeEventListener("mouseup", ze);
                          };
                          window.addEventListener("mousemove", Ie), window.addEventListener("mouseup", ze);
                        },
                        title: "Drag to resize",
                        style: {
                          position: "absolute",
                          top: 0,
                          right: 0,
                          width: "6px",
                          height: "100%",
                          cursor: "ew-resize",
                          zIndex: 2
                        }
                      }
                    ),
                    /* @__PURE__ */ n(
                      "div",
                      {
                        className: "flex items-center gap-1.5 px-2 py-1.5 text-[10px]",
                        style: { borderBottom: "1px solid var(--border)" },
                        children: [
                          _e === "decision" ? /* @__PURE__ */ t("span", { className: "uppercase tracking-wider", style: { color: "var(--accent)" }, children: "⚖ decision needed" }) : /* @__PURE__ */ n("span", { className: "uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                            ea[(me == null ? void 0 : me.stage) || e.stage] || "⚙",
                            " ",
                            (me == null ? void 0 : me.stage) || e.stage,
                            " · live session"
                          ] }),
                          _e === "live" && (me == null ? void 0 : me.active) && /* @__PURE__ */ t(Et, { size: 10 }),
                          _e === "live" && me && /* @__PURE__ */ t(
                            "button",
                            {
                              className: "ml-auto hover:underline",
                              onClick: me.onOpen,
                              style: { color: "var(--accent)" },
                              title: "Open the full step session",
                              children: "open ↗"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              className: _e === "decision" ? "ml-auto hover:underline" : "hover:underline",
                              onClick: () => le(!1),
                              style: { color: "var(--muted)" },
                              title: "Collapse",
                              children: "✕"
                            }
                          )
                        ]
                      }
                    ),
                    _e === "decision" ? /* @__PURE__ */ t(
                      ra,
                      {
                        card: e,
                        decisions: oe,
                        onResolveDecision: x,
                        onInterject: v,
                        onClose: () => le(!1)
                      }
                    ) : /* @__PURE__ */ t(na, { tail: (me == null ? void 0 : me.buffer) || (me == null ? void 0 : me.tail) || "", active: !!(me != null && me.active) }),
                    _e === "live" && v && /* @__PURE__ */ n("div", { className: "px-2 py-1.5 flex items-center gap-1.5", style: { borderTop: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: pe,
                          onChange: (S) => he(S.target.value),
                          onKeyDown: (S) => {
                            S.key === "Enter" && pe.trim() && (v("note", pe.trim()), he(""));
                          },
                          placeholder: "Message this session…",
                          className: "flex-1 text-[10px] px-2 py-1 rounded",
                          style: {
                            background: "var(--bg-elevated, var(--bg))",
                            color: "var(--text)",
                            border: "1px solid var(--border)",
                            outline: "none"
                          },
                          title: "Interject into the running session — steers it live, or lands at its next response"
                        }
                      ),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => {
                            pe.trim() && (v("note", pe.trim()), he(""));
                          },
                          disabled: !pe.trim(),
                          className: "text-[10px] px-2 py-1 rounded font-semibold",
                          style: {
                            background: pe.trim() ? "var(--accent)" : "var(--border)",
                            color: pe.trim() ? "var(--bg)" : "var(--muted)",
                            cursor: pe.trim() ? "pointer" : "default"
                          },
                          title: "Send the interjection",
                          children: "Send"
                        }
                      )
                    ] })
                  ]
                }
              )
            }
          ),
          me && /* @__PURE__ */ t(
            "button",
            {
              className: Be ? void 0 : "dlc-wing-slide",
              "aria-label": A && _e === "live" ? "Collapse live session panel" : "Open live session panel",
              title: A && _e === "live" ? "Collapse live session" : "Open live session",
              onClick: () => {
                ue("live"), le((S) => !(S && _e === "live"));
              },
              style: {
                position: "absolute",
                top: "10px",
                left: "100%",
                zIndex: 1,
                width: "14px",
                height: "46px",
                cursor: "pointer",
                padding: 0,
                transform: A ? `translateX(${lt}px)` : "translateX(0)",
                transition: Be ? "none" : void 0,
                willChange: "transform",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: me.active ? "var(--accent)" : "var(--border)",
                color: "var(--bg)",
                border: "none",
                borderRadius: "0 6px 6px 0",
                boxShadow: "1px 0 4px rgba(0,0,0,0.25)"
              },
              children: /* @__PURE__ */ t("span", { style: { fontSize: "9px", lineHeight: 1 }, "aria-hidden": "true", children: A && _e === "live" ? "›" : "‹" })
            }
          ),
          oe.length > 0 && /* @__PURE__ */ t(
            "button",
            {
              className: Be ? void 0 : "dlc-wing-slide",
              "aria-label": A && _e === "decision" ? "Collapse decision panel" : "Open decision panel",
              title: A && _e === "decision" ? "Collapse decision" : `${oe.length} decision${oe.length === 1 ? "" : "s"} awaiting you`,
              onClick: () => {
                ue("decision"), le((S) => !(S && _e === "decision"));
              },
              style: {
                position: "absolute",
                top: me ? "62px" : "10px",
                left: "100%",
                zIndex: 1,
                width: "14px",
                height: "46px",
                cursor: "pointer",
                padding: 0,
                transform: A ? `translateX(${lt}px)` : "translateX(0)",
                transition: Be ? "none" : void 0,
                willChange: "transform",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--warn, var(--accent))",
                color: "var(--bg)",
                border: "none",
                borderRadius: "0 6px 6px 0",
                boxShadow: "1px 0 4px rgba(0,0,0,0.25)"
              },
              children: /* @__PURE__ */ t("span", { style: { fontSize: "10px", lineHeight: 1 }, "aria-hidden": "true", children: "⚖" })
            }
          )
        ] }),
        /* @__PURE__ */ t(Pn, { card: e, openChat: C }),
        (v || y || $ && $.length || P) && /* @__PURE__ */ n(
          "div",
          {
            className: "mt-2 flex items-center gap-2 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider select-none", style: { color: "var(--muted)" }, children: "⚡ actions" }),
              B && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: "Open the live session wing to watch output and steer this session",
                  onClick: () => le(!0),
                  children: "💬 steer session"
                }
              ),
              y && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: (Qe = e.orchestrator_session) != null && Qe.slot_key || (fe = e.orchestrator_session) != null && fe.session_key ? "Open this pipeline’s orchestrator session" : "Trigger an inspectable orchestrator session for this card",
                  onClick: () => y(),
                  children: (Nt = e.orchestrator_session) != null && Nt.slot_key || (et = e.orchestrator_session) != null && et.session_key ? "⚙ open orchestrator" : "⚙ orchestrator"
                }
              ),
              ce && /* @__PURE__ */ n(
                "button",
                {
                  className: "text-[10px] hover:underline inline-flex items-center gap-0.5",
                  style: { color: "var(--muted)" },
                  title: "Card timeline — the ordered story of what happened",
                  onClick: () => Ee(!0),
                  children: [
                    "📜 timeline",
                    K.some((S) => S.needs_human) ? " 🔴" : "",
                    ae.length > 0 ? ` 🌿${ae.length}` : ""
                  ]
                }
              ),
              F && /* @__PURE__ */ t(Hn, { onRequest: F }),
              ($ || []).map((S) => /* @__PURE__ */ n(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--accent)" },
                  title: `Open the ${S.step} step session`,
                  onClick: () => S.open(),
                  children: [
                    "⚙ ",
                    S.step
                  ]
                },
                S.step
              )),
              P && !["cancelled", "canceled", "retired", "merged"].includes(String(e.lifecycle || "")) && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--danger, #e66)" },
                  title: "Cancel this card (cooperative — revokes writes, retains worktree until terminal)",
                  onClick: () => P(),
                  children: "⏹ cancel"
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: "Card details (read-only)",
                  onClick: () => Ae(!0),
                  children: "🔍 details"
                }
              )
            ]
          }
        ),
        ne && /* @__PURE__ */ t(
          sa,
          {
            card: e,
            events: K,
            children: ae,
            parent: Ue,
            onOpenCard: E,
            onClose: () => Ee(!1)
          }
        ),
        Le && /* @__PURE__ */ t(
          Wn,
          {
            card: e,
            cardStatus: a,
            effectiveCapability: String(l),
            onClose: () => Ae(!1)
          }
        ),
        Ne && te && /* @__PURE__ */ t(
          Fn,
          {
            card: e,
            inspection: te,
            producerSession: m,
            onClose: () => je(!1),
            onOpenProducer: i,
            onApprove: c,
            onReject: f,
            onInterject: v ? () => {
              je(!1), le(!0);
            } : void 0
          }
        ),
        ee && x && (() => {
          const S = (e.decisions || []).find((L) => L.id === ee);
          return S ? /* @__PURE__ */ t(
            Gn,
            {
              card: e,
              decision: S,
              onClose: () => H(null),
              onResolve: (L) => x(S.id, L)
            }
          ) : null;
        })()
      ]
    }
  );
}
function jt({ title: e, count: r, children: o, id: a }) {
  return /* @__PURE__ */ n("div", { id: a, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ n("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
      /* @__PURE__ */ t("span", { className: "text-[11px] font-semibold uppercase tracking-wide truncate", style: { color: "var(--muted-strong, var(--muted))" }, children: e }),
      /* @__PURE__ */ t(
        "span",
        {
          className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
          children: r
        }
      )
    ] }),
    /* @__PURE__ */ t("div", { className: "flex flex-col gap-2", children: r === 0 ? /* @__PURE__ */ t(
      "div",
      {
        className: "text-[11px] rounded-lg py-3 px-2 text-center",
        style: { color: "var(--muted)", border: "1px dashed var(--border)" },
        children: "empty"
      }
    ) : o })
  ] });
}
function Kn({ config: e, onSet: r }) {
  function o({ label: a, value: l, options: d, tokens: m, onPick: i }) {
    return /* @__PURE__ */ n("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: a }),
      /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: d.map((c) => {
        const f = l === c;
        return /* @__PURE__ */ t(
          "button",
          {
            onClick: () => i(c),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: f ? m[c] : "var(--muted)",
              background: f ? `color-mix(in srgb, ${m[c]} 16%, transparent)` : "transparent",
              boxShadow: f ? `inset 0 0 0 1px color-mix(in srgb, ${m[c]} 45%, transparent)` : "none"
            },
            children: c
          },
          c
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
        /* @__PURE__ */ t("span", { className: "text-xs font-semibold", style: { color: "var(--muted-strong, var(--muted))" }, children: "Defaults" }),
        /* @__PURE__ */ t(o, { label: "Trust", value: e.trust, options: kt, tokens: ar, onPick: (a) => r({ trust: a }) }),
        /* @__PURE__ */ t(o, { label: "Depth", value: e.depth, options: Lt, tokens: or, onPick: (a) => r({ depth: a }) }),
        /* @__PURE__ */ t("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
const Vn = {
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
function Xn({ pipeline: e, cards: r, extras: o, onOpenCard: a }) {
  const { events: l, actors: d, now: m } = Te(
    () => Nn(e, r, o),
    [e, r, o]
  );
  return e ? l.length === 0 ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "No recorded events for this pipeline yet." }) : /* @__PURE__ */ n("div", { className: "w-full overflow-x-auto pb-4", children: [
    m && /* @__PURE__ */ n("div", { className: "text-[10px] mb-2 flex flex-wrap gap-2", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ t("span", { children: "now:" }),
      /* @__PURE__ */ n("span", { children: [
        "▶ running ",
        (m.running_node_ids || []).length
      ] }),
      /* @__PURE__ */ n("span", { children: [
        "◷ ready ",
        (m.ready_node_ids || []).length
      ] }),
      /* @__PURE__ */ n("span", { style: { color: "var(--warn)" }, children: [
        "⛔ blocked ",
        (m.blocked_node_ids || []).length
      ] })
    ] }),
    /* @__PURE__ */ t("div", { className: "text-[10px] mb-2 flex flex-wrap gap-3", style: { color: "var(--muted)" }, children: d.map((i) => /* @__PURE__ */ n("span", { children: [
      qr[i] || "•",
      " ",
      i
    ] }, i)) }),
    /* @__PURE__ */ t("ol", { className: "flex flex-col gap-1.5", style: { borderLeft: "1px solid var(--border)", paddingLeft: "10px" }, children: l.map((i) => {
      const c = Vn[i.kind] || "var(--text)";
      return /* @__PURE__ */ n("li", { className: "flex items-start gap-2 text-[11px]", children: [
        /* @__PURE__ */ t("span", { className: "text-[9px] flex-shrink-0 mt-0.5 tabular-nums", style: { color: "var(--muted)", minWidth: "62px" }, children: i.at ? i.at.replace("T", " ").replace("Z", "").slice(5) : "" }),
        /* @__PURE__ */ t("span", { "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", title: i.actor, children: i.glyph }),
        /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ n(
            "button",
            {
              className: "text-left hover:underline",
              onClick: () => i.cardId && (a == null ? void 0 : a(i.cardId)),
              title: i.cardId ? "Open card" : void 0,
              style: { color: c },
              children: [
                i.headline,
                i.inferred && /* @__PURE__ */ t("span", { className: "ml-1 text-[8px] px-1 rounded-full", style: { color: "var(--muted)", border: "1px solid var(--border)" }, children: "~inferred" }),
                i.needs_human && /* @__PURE__ */ t("span", { className: "ml-1", children: "🔴" })
              ]
            }
          ),
          i.detail && /* @__PURE__ */ n("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: [
            i.detail,
            i.cardId ? ` · ${i.cardId}` : ""
          ] })
        ] })
      ] }, i.id);
    }) })
  ] }) : /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "No pipeline selected." });
}
function Yn({ cards: e }) {
  const r = e.flatMap(
    (o) => (o.parked || []).map((a) => {
      var l;
      return { ...a, cardTitle: o.title, repo: (l = o.source) == null ? void 0 : l.repo };
    })
  ).sort((o, a) => (a.at || "").localeCompare(o.at || ""));
  return r.length === 0 ? /* @__PURE__ */ n("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ n("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ t("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ t("div", { className: "flex flex-col gap-2 max-w-2xl", children: r.map((o) => /* @__PURE__ */ n("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: o.note }),
    /* @__PURE__ */ n("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ n("span", { children: [
        "from ",
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: o.cardTitle })
      ] }),
      o.phase && /* @__PURE__ */ n("span", { children: [
        "· parked at ",
        o.phase
      ] }),
      o.repo && /* @__PURE__ */ n("span", { children: [
        "· ",
        o.repo
      ] }),
      o.issue_url && /* @__PURE__ */ t("a", { href: o.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, o.id)) });
}
function Zn({ repos: e, selected: r, onToggle: o, onClear: a, onAddWorkspace: l, onEdit: d }) {
  const m = e.reduce((f, h) => f + h.count, 0), i = r.size === 0, c = ({ name: f, count: h, label: w, checked: b, onClick: v, isAll: x }) => {
    const [y, B] = N(!1);
    return /* @__PURE__ */ n(
      "div",
      {
        onMouseEnter: () => B(!0),
        onMouseLeave: () => B(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: b ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: b ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ n(
            "button",
            {
              onClick: v,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                x ? /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: b ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ t(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: b ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${b ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: b && /* @__PURE__ */ t("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ t("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ t(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: b ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: w
                  }
                ),
                /* @__PURE__ */ t(
                  "span",
                  {
                    className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0",
                    style: { background: "var(--bg-hover, var(--border))", color: "var(--muted)" },
                    children: h
                  }
                )
              ]
            }
          ),
          !x && f && /* @__PURE__ */ t(
            "button",
            {
              onClick: (O) => {
                O.stopPropagation(), d(f);
              },
              title: `Edit pipeline "${w}"`,
              "aria-label": `Edit pipeline ${w}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: y ? 1 : 0,
                pointerEvents: y ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (O) => {
                const E = O.currentTarget;
                E.style.color = "var(--accent)", E.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (O) => {
                const E = O.currentTarget;
                E.style.color = "var(--text-strong, var(--text))", E.style.borderColor = "var(--border-strong, var(--border))";
              },
              children: /* @__PURE__ */ t("svg", { width: "13", height: "13", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ t("path", { d: "M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) })
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
          /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspaces" }),
          r.size > 0 && /* @__PURE__ */ t("button", { onClick: a, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ t(c, { isAll: !0, count: m, label: "All repos", checked: i, onClick: a }),
        e.map((f) => /* @__PURE__ */ t(
          c,
          {
            name: f.name,
            count: f.count,
            label: (Br.has(f.name) ? "Example: " : "") + (f.name.includes("/") ? f.name.split("/")[1] : f.name),
            checked: r.has(f.name),
            onClick: () => o(f.name)
          },
          f.name
        )),
        /* @__PURE__ */ n(
          "button",
          {
            onClick: l,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ t("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        r.size > 1 && /* @__PURE__ */ n("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          r.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const Jn = [
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
function Qn({ initial: e, agentProfiles: r, crews: o, repo: a, stepName: l, onSave: d, onSaveCrew: m, onClose: i }) {
  const [c, f] = N(e.name || ""), [h, w] = N(e.role || ""), [b, v] = N(e.tools || ["read"]), [x, y] = N(e.model || "auto"), [B, O] = N(e.crew || ""), [E, F] = N(e.addenda || []), [$, P] = N(e.capability || ""), [J, k] = N(e.trust || ""), [re, T] = N(e.depth || ""), [ye, pe] = N(!1), he = r.find((C) => C.name === c), Ne = o.find((C) => C.name === B), je = [.../* @__PURE__ */ new Set([...Jn, ...b])], ee = (C) => {
    const K = qn({ name: c, role: h, tools: b, model: x, crew: B, addenda: E, capability: $, trust: J, depth: re }, C);
    f(K.name), v(K.tools || []), y(K.model || "auto"), K.capability && P(K.capability);
  }, H = (C) => v((K) => K.includes(C) ? K.filter((ae) => ae !== C) : [...K, C]), ne = () => F((C) => {
    var K;
    return C.length >= 3 ? C : [...C, { crew: ((K = o[0]) == null ? void 0 : K.name) || "", when: "always", writes: "" }];
  }), Ee = (C, K) => F((ae) => ae.map((Ce, Ue) => Ue === C ? { ...Ce, ...K } : Ce)), Le = (C) => F((K) => K.filter((ae, Ce) => Ce !== C)), Ae = c.trim().length > 0;
  return /* @__PURE__ */ n("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ n("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ t("button", { onClick: i, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ n("div", { className: "ml-1", children: [
        /* @__PURE__ */ t("div", { className: "text-sm font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Configure step execution" }),
        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Step request + capability profile + optional global crew route" })
      ] }),
      /* @__PURE__ */ t(
        "span",
        {
          className: "ml-auto text-[10px] px-2 py-1 rounded font-semibold",
          style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" },
          children: "UI configuration"
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { className: "px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto", children: [
      r.length > 0 && /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ n("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent profile preset" }),
          /* @__PURE__ */ t(
            "button",
            {
              onClick: () => pe(!0),
              className: "text-[10px] px-2 py-1 rounded-md font-semibold",
              style: { color: "var(--accent)", border: "1px solid var(--border)" },
              children: "Browse agents & crews"
            }
          )
        ] }),
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: r.map((C) => /* @__PURE__ */ t(
          "button",
          {
            onClick: () => ee(C),
            disabled: C.status !== "loaded",
            title: C.description || C.name,
            className: "text-[11px] px-2 py-1 rounded-md font-medium disabled:opacity-40",
            style: {
              background: c === C.name ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: c === C.name ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: c === C.name ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: C.name
          },
          C.name
        )) }),
        he && /* @__PURE__ */ n("div", { className: "text-[10px] mt-1.5 rounded-md px-2 py-1.5", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
          "Loaded config: model ",
          /* @__PURE__ */ t("code", { children: he.model || "auto" }),
          " · ",
          he.tools.length,
          " declared tool",
          he.tools.length === 1 ? "" : "s",
          " · ",
          he.allowedTools.length,
          " auto-approved. The step objective below remains pipeline-local."
        ] })
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: c,
            onChange: (C) => f(C.target.value),
            placeholder: "e.g. impl-agent",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Role / prompt" }),
        /* @__PURE__ */ t(
          "textarea",
          {
            value: h,
            onChange: (C) => w(C.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: je.map((C) => {
          const K = b.includes(C);
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => H(C),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: K ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: K ? "var(--accent)" : "var(--muted)",
                boxShadow: K ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: C
            },
            C
          );
        }) })
      ] }),
      /* @__PURE__ */ n("div", { className: "rounded-md p-2.5", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ n("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ n("div", { children: [
            /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Capability profile" }),
            /* @__PURE__ */ t("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: "Trust = when · depth = how much · capability = what authority" })
          ] }),
          /* @__PURE__ */ n(
            "select",
            {
              value: $,
              onChange: (C) => P(C.target.value),
              className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "auto-derived" }),
                ["readonly", "authoring", "builder", "coordinator"].map((C) => /* @__PURE__ */ t("option", { value: C, children: C }, C))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ n("div", { className: "text-[10px] mt-2", style: { color: $ === "coordinator" ? "var(--warn)" : "var(--muted)" }, children: [
          "The tools above are requested/declared—not proof of runtime access. Actual crew authority comes from its ",
          /* @__PURE__ */ t("code", { children: "kiro_agent" }),
          " profile; widening remains trust-gated and handshake-verified."
        ] })
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: x,
            onChange: (C) => y(C.target.value),
            placeholder: "auto",
            className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Crew" }),
          /* @__PURE__ */ n(
            "select",
            {
              value: B,
              onChange: (C) => O(C.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "— none (use step agent) —" }),
                o.map((C) => /* @__PURE__ */ t("option", { value: C.name, children: C.name }, C.name))
              ]
            }
          )
        ] }),
        Ne && /* @__PURE__ */ n("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: [
          "Global route ",
          /* @__PURE__ */ t("code", { children: Ne.name }),
          " → ",
          /* @__PURE__ */ t("code", { children: Ne.kiroAgent || "profile unknown" }),
          Ne.workspace ? ` · workspace ${Ne.workspace}` : "",
          Ne.description ? ` · ${Ne.description}` : ""
        ] })
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ n("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ t(
            "button",
            {
              onClick: ne,
              disabled: E.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ t("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        E.length === 0 && /* @__PURE__ */ t("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        E.map((C, K) => /* @__PURE__ */ n("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ t(
            "select",
            {
              value: C.crew,
              onChange: (ae) => Ee(K, { crew: ae.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: o.map((ae) => /* @__PURE__ */ t("option", { value: ae.name, children: ae.name }, ae.name))
            }
          ),
          /* @__PURE__ */ n(
            "select",
            {
              value: C.when || "always",
              onChange: (ae) => Ee(K, { when: ae.target.value }),
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
              value: C.writes || "",
              onChange: (ae) => Ee(K, { writes: ae.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ t("button", { onClick: () => Le(K), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ t("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ t("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, K))
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...kt].map((C) => {
          const K = J === C;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => k(C),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: K ? C ? ar[C] : "var(--text)" : "var(--muted)", background: K ? "var(--bg-hover, var(--border))" : "transparent" },
              children: C || "inherit"
            },
            C || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Lt].map((C) => {
          const K = re === C;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => T(C),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: K ? C ? or[C] : "var(--text)" : "var(--muted)", background: K ? "var(--bg-hover, var(--border))" : "transparent" },
              children: C || "inherit"
            },
            C || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ n("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ t("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ t(
        "button",
        {
          disabled: !Ae,
          onClick: () => d({
            name: c.trim(),
            role: h.trim() || void 0,
            tools: b,
            model: x.trim() && x.trim() !== "auto" ? x.trim() : void 0,
            crew: B || void 0,
            addenda: E.length ? E.filter((C) => C.crew) : void 0,
            capability: $ || void 0,
            trust: J || void 0,
            depth: re || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save step"
        }
      )
    ] }),
    ye && /* @__PURE__ */ t(
      dr,
      {
        profiles: r,
        crews: o,
        context: `${a || "unassigned pipeline"} · ${l || "unnamed step"}`,
        onSaveCrew: m,
        onClose: () => pe(!1),
        onSelectProfile: (C) => {
          ee(C), pe(!1);
        },
        onSelectCrew: (C) => {
          O(C.name), pe(!1);
        }
      }
    )
  ] });
}
function $r({ candidates: e, existingRepos: r, defaults: o, agentProfiles: a, crews: l, onCreate: d, onSaveCrew: m, onClose: i, editPipeline: c, cardCount: f, isExample: h, onDelete: w }) {
  var Ie, ze, Ye, xt, dt, pt, at, Pt, _t, Ct, St, Ut, Ot, It, Wt;
  const b = !!c, [v, x] = N((c == null ? void 0 : c.repo) || ""), [y, B] = N((c == null ? void 0 : c.workspace) || "default"), [O, E] = N((c == null ? void 0 : c.repo_path) || ""), [F, $] = N((c == null ? void 0 : c.source) || "manual"), [P, J] = N((c == null ? void 0 : c.trust) || o.trust), [k, re] = N((c == null ? void 0 : c.depth) || o.depth), T = c == null ? void 0 : c.budget, [ye, pe] = N(
    T ? T.max_child_cards === "unlimited" && T.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [he, Ne] = N(
    () => T && T.max_child_cards !== "unlimited" && T.effort_ceiling !== "unlimited" ? { ...T } : Cr((c == null ? void 0 : c.depth) || o.depth)
  ), [je, ee] = N((c == null ? void 0 : c.backlog_intake) ?? !0), [H, ne] = N((c == null ? void 0 : c.results_in_repo) ?? !1), [Ee, Le] = N((c == null ? void 0 : c.conversation_log) ?? !1), [Ae, C] = N(((c == null ? void 0 : c.trusted_authors) || []).join(`
`)), [K, ae] = N((c == null ? void 0 : c.self_enabling) ?? !1), [Ce, Ue] = N((c == null ? void 0 : c.approach) || "simplified"), [ce, te] = N((c == null ? void 0 : c.sync_mode) || "poll"), [V, oe] = N(() => {
    var g;
    return (g = c == null ? void 0 : c.steps) != null && g.length ? c.steps.map((j) => ({ ...j })) : rr.map((j) => ({ ...j }));
  }), [A, le] = N(null), [Be, Ge] = N(""), [_e, ue] = N("settings"), [lt, ve] = N(!1), We = (g) => g.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", Je = (g, j) => oe((ke) => ke.map((Re, de) => de === g ? { ...Re, ...j } : Re)), me = (g) => oe((j) => j.filter((ke, Re) => Re !== g)), it = (g, j) => oe((ke) => {
    const Re = g + j;
    if (Re < 0 || Re >= ke.length) return ke;
    const de = [...ke];
    return [de[g], de[Re]] = [de[Re], de[g]], de;
  }), nt = (g) => oe((j) => [...j, {
    id: `${g}-${Math.random().toString(36).slice(2, 6)}`,
    name: g === "gate" ? "New Gate" : "New Step",
    type: g,
    agent: g === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), wt = (g) => {
    x(g.repo || ""), B(g.workspace || "default"), E(g.path || ""), $(g.source);
  }, Oe = (g) => {
    let j = (g || "").trim();
    if (!j) return "";
    const ke = j.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return ke && (j = ke[1]), j.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, bt = (g) => {
    const j = /github\.com|gitlab\.com/i.test(g);
    x(j ? Oe(g) : g), $("manual");
  }, ct = [...new Map(
    Ae.split(/[\n,]/).map((g) => g.trim()).filter(Boolean).map((g) => [g.toLowerCase(), g])
  ).values()], Qe = ct.every((g) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(g)), fe = /^[A-Za-z0-9_.-]{1,80}$/.test(y), Nt = (/^[^/\s]+\/[^/\s]+$/.test(Oe(v)) || e.some((g) => g.repo && g.repo === v)) && Qe && fe, et = !b && r.has(Oe(v)), S = ({ value: g, options: j, tokens: ke, onPick: Re }) => /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: j.map((de) => {
    const qt = g === de;
    return /* @__PURE__ */ t(
      "button",
      {
        onClick: () => Re(de),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: qt ? ke[de] : "var(--muted)",
          background: qt ? `color-mix(in srgb, ${ke[de]} 16%, transparent)` : "transparent",
          boxShadow: qt ? `inset 0 0 0 1px color-mix(in srgb, ${ke[de]} 45%, transparent)` : "none"
        },
        children: de
      },
      de
    );
  }) }), L = { "issue-radar": [], workspace: [], manual: [] };
  e.forEach((g) => {
    var j;
    (L[j = g.source] || (L[j] = [])).push(g);
  });
  const be = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" }, Se = b ? ["settings", "webhook", "danger"] : ["settings", "webhook"];
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: i,
      children: /* @__PURE__ */ n(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (g) => g.stopPropagation(),
          children: [
            lt && /* @__PURE__ */ t(
              dr,
              {
                profiles: a,
                crews: l,
                context: v || y,
                onSaveCrew: m,
                onClose: () => ve(!1)
              }
            ),
            A !== null ? /* @__PURE__ */ t(
              Qn,
              {
                initial: {
                  name: ((ze = (Ie = V[A]) == null ? void 0 : Ie.agent) == null ? void 0 : ze.name) || "",
                  role: (xt = (Ye = V[A]) == null ? void 0 : Ye.agent) == null ? void 0 : xt.role,
                  tools: (pt = (dt = V[A]) == null ? void 0 : dt.agent) == null ? void 0 : pt.tools,
                  model: (Pt = (at = V[A]) == null ? void 0 : at.agent) == null ? void 0 : Pt.model,
                  crew: (Ct = (_t = V[A]) == null ? void 0 : _t.agent) == null ? void 0 : Ct.crew,
                  addenda: (St = V[A]) == null ? void 0 : St.addenda,
                  capability: (Ut = V[A]) == null ? void 0 : Ut.capability,
                  trust: (Ot = V[A]) == null ? void 0 : Ot.trust,
                  depth: (It = V[A]) == null ? void 0 : It.depth
                },
                agentProfiles: a,
                crews: l,
                repo: v,
                stepName: ((Wt = V[A]) == null ? void 0 : Wt.name) || "",
                onSaveCrew: m,
                onClose: () => le(null),
                onSave: (g) => {
                  Je(A, {
                    agent: { name: g.name, role: g.role, tools: g.tools, model: g.model, crew: g.crew },
                    addenda: g.addenda,
                    capability: g.capability,
                    trust: g.trust,
                    depth: g.depth
                  }), le(null);
                }
              }
            ) : /* @__PURE__ */ n(Xe, { children: [
              /* @__PURE__ */ n("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ n("div", { children: [
                  /* @__PURE__ */ t("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: b ? "Edit Pipeline" : "New Pipeline" }),
                  /* @__PURE__ */ t("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: b ? v.includes("/") ? v.split("/")[1] : v : "Configure a pipeline for a repository or workspace" })
                ] }),
                /* @__PURE__ */ t("button", { onClick: i, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
              ] }),
              /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: Se.map((g) => {
                const j = _e === g, ke = g === "danger";
                return /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: () => ue(g),
                    className: "text-[12px] px-3 py-2 font-semibold transition-all",
                    style: {
                      color: j ? ke ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                      borderBottom: `2px solid ${j ? ke ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                      marginBottom: "-1px"
                    },
                    children: g === "settings" ? "Settings" : g === "webhook" ? "Webhook · app-wide" : "Danger Zone"
                  },
                  g
                );
              }) }),
              /* @__PURE__ */ n(
                "div",
                {
                  className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                  style: { display: _e === "settings" ? "flex" : "none" },
                  children: [
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: v,
                          onChange: (g) => bt(g.target.value),
                          onPaste: (g) => {
                            const j = g.clipboardData.getData("text");
                            /github\.com|gitlab\.com/i.test(j) && (g.preventDefault(), bt(j));
                          },
                          placeholder: "https://github.com/owner/name  ·  or  owner/name",
                          disabled: b,
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${et ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                        }
                      ),
                      !b && v && Oe(v) !== v && /* @__PURE__ */ n("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                        "→ ",
                        /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: Oe(v) })
                      ] }),
                      et && /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                      /* @__PURE__ */ t("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((g) => L[g].length > 0 && /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: be[g] }),
                        /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1.5", children: L[g].map((j) => {
                          const ke = `${g}:${j.workspace || j.repo}:${j.path || ""}`, Re = j.source === "workspace" ? y === j.workspace && O === (j.path || "") : v === j.repo;
                          return /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => wt(j),
                              disabled: !!j.repo && r.has(j.repo),
                              title: j.detail || j.repo || j.workspace,
                              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                              style: {
                                background: Re ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                                color: Re ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                                boxShadow: Re ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                              },
                              children: j.label || (j.repo.includes("/") ? j.repo.split("/")[1] : j.repo) || j.workspace
                            },
                            ke
                          );
                        }) })
                      ] }, g)) })
                    ] }),
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspace partition" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: y,
                          onChange: (g) => B(g.target.value.trim()),
                          placeholder: "default",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${fe ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ n("div", { className: "text-[10px] mt-1", style: { color: fe ? "var(--muted)" : "var(--danger)" }, children: [
                        "Partitions results and ledgers. It is independent from ",
                        /* @__PURE__ */ t("code", { children: "owner/name" }),
                        " and never inferred from a filesystem path."
                      ] })
                    ] }),
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Local checkout path" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: O,
                          onChange: (g) => E(g.target.value),
                          placeholder: "/absolute/path/to/checkout",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ t("div", { className: "text-[10px] mt-1", style: { color: "var(--muted)" }, children: "Required before code or repo-mirrored results run. Mutable steps block rather than use the shared checkout when this path is absent or unverifiable." })
                    ] }),
                    /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                      /* @__PURE__ */ t(S, { value: P, options: kt, tokens: ar, onPick: J })
                    ] }),
                    /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                      /* @__PURE__ */ t(S, { value: k, options: Lt, tokens: or, onPick: re })
                    ] }),
                    /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                        /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                      ] }),
                      /* @__PURE__ */ t(
                        S,
                        {
                          value: ye,
                          options: ["depth", "custom", "unlimited"],
                          tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                          onPick: pe
                        }
                      )
                    ] }),
                    ye === "depth" && (() => {
                      const g = Cr(k);
                      return /* @__PURE__ */ n("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                        "Follows ",
                        /* @__PURE__ */ t("strong", { children: k }),
                        ": ",
                        String(g.max_child_cards),
                        " child cards · ",
                        String(g.effort_ceiling),
                        " effort points · max ",
                        g.max_feature_size,
                        " · ",
                        g.addenda,
                        " addenda"
                      ] });
                    })(),
                    ye === "unlimited" && /* @__PURE__ */ t("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                    ye === "custom" && /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max child cards",
                        /* @__PURE__ */ t(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: he.max_child_cards,
                            onChange: (g) => Ne((j) => ({ ...j, max_child_cards: Math.max(0, Number(g.target.value) || 0) })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                          }
                        )
                      ] }),
                      /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Effort ceiling",
                        /* @__PURE__ */ t(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: he.effort_ceiling,
                            onChange: (g) => Ne((j) => ({ ...j, effort_ceiling: Math.max(0, Number(g.target.value) || 0) })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                          }
                        )
                      ] }),
                      /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max feature size",
                        /* @__PURE__ */ t(
                          "select",
                          {
                            value: he.max_feature_size,
                            onChange: (g) => Ne((j) => ({ ...j, max_feature_size: g.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["S", "M", "L", "XL"].map((g) => /* @__PURE__ */ t("option", { children: g }, g))
                          }
                        )
                      ] }),
                      /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Addenda",
                        /* @__PURE__ */ t(
                          "select",
                          {
                            value: he.addenda,
                            onChange: (g) => Ne((j) => ({ ...j, addenda: g.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["none", "obvious", "proactive"].map((g) => /* @__PURE__ */ t("option", { children: g }, g))
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ n("div", { className: "min-w-0 pr-3", children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "GitHub sync mode" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: ce === "webhook" ? "Webhook is the fast path; the safety-net poll reconciles this pipeline on a longer window. Requires the app-wide webhook receiver enabled — falls back to polling if it is not." : "Poll reconciles this pipeline every cycle (default). Correct when no webhook is configured." })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex rounded-md overflow-hidden flex-shrink-0", style: { border: "1px solid var(--border)" }, children: ["poll", "webhook"].map((g) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => te(g),
                          className: "text-[11px] px-2.5 py-1 font-semibold",
                          style: {
                            background: ce === g ? "var(--accent)" : "transparent",
                            color: ce === g ? "var(--bg)" : "var(--muted)"
                          },
                          children: g === "poll" ? "Poll" : "Webhook"
                        },
                        g
                      )) })
                    ] }),
                    /* @__PURE__ */ n("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Backlog auto-intake" }),
                        /* @__PURE__ */ n("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                          "Back-feed open ",
                          /* @__PURE__ */ t("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
                          " issues as cards"
                        ] })
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => ee((g) => !g),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: je ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: je ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ n("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                        /* @__PURE__ */ n("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                          "Also commit results & the pipeline conversation to a ",
                          /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: ".dlc-yolo/" }),
                          " copy in the owned repo (always kept in app data)"
                        ] })
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => ne((g) => !g),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: H ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: H ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ n("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Pipeline conversation log" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Opt in to the review-oriented command transcript; off means no log file is created" })
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => Le((g) => !g),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: Ee ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: Ee ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trusted GitHub authors · optional" }),
                      /* @__PURE__ */ t(
                        "textarea",
                        {
                          value: Ae,
                          onChange: (g) => C(g.target.value),
                          rows: 2,
                          placeholder: "Defaults to the authenticated GitHub user",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Qe ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ n("div", { className: "text-[10px] mt-1", style: { color: Qe ? "var(--muted)" : "var(--danger)" }, children: [
                        "One login per line. Empty never means allow-all; it falls back to the authenticated ",
                        /* @__PURE__ */ t("code", { children: "gh" }),
                        " user."
                      ] })
                    ] }),
                    /* @__PURE__ */ n("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => ae((g) => !g),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: K ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: K ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    K && /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((g) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => Ue(g),
                          className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                          style: {
                            background: Ce === g ? "var(--accent)" : "transparent",
                            color: Ce === g ? "var(--bg)" : "var(--muted)",
                            border: `1px solid ${Ce === g ? "var(--accent)" : "var(--border)"}`
                          },
                          children: g
                        },
                        g
                      )) })
                    ] }),
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ n("div", { className: "flex items-center justify-between mb-1.5", children: [
                        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                        /* @__PURE__ */ n("div", { className: "flex gap-1", children: [
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => ve(!0),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--muted)", border: "1px solid var(--border)" },
                              children: "Agents & crews"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => nt("agent"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                              children: "+ agent"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => nt("gate"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                              children: "+ gate"
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: V.map((g, j) => {
                        var ke, Re;
                        return /* @__PURE__ */ n(
                          "div",
                          {
                            className: "rounded-md p-2",
                            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${g.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                            children: [
                              /* @__PURE__ */ n("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ n("div", { className: "flex flex-col", children: [
                                  /* @__PURE__ */ t("button", { onClick: () => it(j, -1), disabled: j === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                  /* @__PURE__ */ t("button", { onClick: () => it(j, 1), disabled: j === V.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                                ] }),
                                /* @__PURE__ */ t(
                                  "input",
                                  {
                                    value: g.name,
                                    onChange: (de) => Je(j, { name: de.target.value, id: We(de.target.value) }),
                                    className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                  }
                                ),
                                /* @__PURE__ */ t(
                                  "span",
                                  {
                                    className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                    style: { color: g.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${g.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                    children: g.type
                                  }
                                ),
                                /* @__PURE__ */ t("button", { onClick: () => me(j), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                              ] }),
                              g.type === "agent" && /* @__PURE__ */ n("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                                /* @__PURE__ */ n(
                                  "button",
                                  {
                                    onClick: () => le(j),
                                    className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                    style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                    children: [
                                      "⚙ ",
                                      (ke = g.agent) != null && ke.name ? `Agent: ${g.agent.name}` : "Configure agent"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                                /* @__PURE__ */ n(
                                  "select",
                                  {
                                    value: g.trigger || "ask",
                                    onChange: (de) => Je(j, { trigger: de.target.value === "ask" ? void 0 : de.target.value }),
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
                                /* @__PURE__ */ n("span", { className: "text-[10px]", style: { color: g.capability ? "var(--accent)" : "var(--muted)" }, title: "Actual authority is verified from the assigned capability profile at runtime", children: [
                                  "cap: ",
                                  g.capability || "auto"
                                ] }),
                                (g.trust || g.depth) && /* @__PURE__ */ t("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [g.trust, g.depth].filter(Boolean).join(" · ") }),
                                g.addenda && g.addenda.length > 0 && /* @__PURE__ */ n("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                  "+",
                                  g.addenda.length,
                                  " addendum",
                                  g.addenda.length === 1 ? "" : "s"
                                ] }),
                                ((Re = g.agent) == null ? void 0 : Re.role) && /* @__PURE__ */ t("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: g.agent.role })
                              ] }),
                              g.type === "gate" && /* @__PURE__ */ n("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                                /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                                /* @__PURE__ */ n(
                                  "select",
                                  {
                                    value: g.trust || "",
                                    onChange: (de) => Je(j, { trust: de.target.value || void 0 }),
                                    className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                    children: [
                                      /* @__PURE__ */ t("option", { value: "", children: "inherit" }),
                                      kt.map((de) => /* @__PURE__ */ t("option", { value: de, children: de }, de))
                                    ]
                                  }
                                )
                              ] })
                            ]
                          },
                          g.id
                        );
                      }) })
                    ] })
                  ]
                }
              ),
              _e === "webhook" && /* @__PURE__ */ t("div", { className: "px-5 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ t(Lr, {}) }),
              b && _e === "danger" && w && (() => {
                const g = v.includes("/") ? v.split("/")[1] : v, j = Be.trim() === g;
                return /* @__PURE__ */ t("div", { className: "px-5 pb-4 pt-4", children: h ? /* @__PURE__ */ n(
                  "div",
                  {
                    className: "rounded-lg p-4 flex flex-col gap-3",
                    style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                    children: [
                      /* @__PURE__ */ n("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "This is a bundled ",
                        /* @__PURE__ */ t("strong", { children: "example" }),
                        " pipeline (",
                        f ?? 0,
                        " sample card",
                        (f ?? 0) === 1 ? "" : "s",
                        "). Remove it any time — it's demo data, not real work."
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => {
                            w(v), i();
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
                      /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold uppercase tracking-wide", style: { color: "var(--danger, #ef4444)" }, children: "Danger Zone" }),
                      /* @__PURE__ */ n("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "Deleting removes this pipeline and its ",
                        f ?? 0,
                        " card",
                        (f ?? 0) === 1 ? "" : "s",
                        " from DLC-YOLO's local state. It does ",
                        /* @__PURE__ */ t("strong", { children: "not" }),
                        " touch GitHub issues or labels. This cannot be undone."
                      ] }),
                      /* @__PURE__ */ n("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Type ",
                        /* @__PURE__ */ t("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: g }),
                        " to confirm:"
                      ] }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: Be,
                          onChange: (ke) => Ge(ke.target.value),
                          placeholder: g,
                          className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                        }
                      ),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          disabled: !j,
                          onClick: () => {
                            w(v), i();
                          },
                          className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                          style: {
                            background: j ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                            color: j ? "#fff" : "var(--muted)",
                            cursor: j ? "pointer" : "not-allowed"
                          },
                          children: "Delete pipeline"
                        }
                      )
                    ]
                  }
                ) });
              })(),
              /* @__PURE__ */ n("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
                /* @__PURE__ */ t("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: _e === "settings" ? "Cancel" : "Close" }),
                _e === "settings" && /* @__PURE__ */ t(
                  "button",
                  {
                    disabled: !Nt || !b && et,
                    onClick: () => d({
                      repo: Oe(v),
                      workspace: y,
                      ...O.trim() ? { repo_path: O.trim() } : {},
                      source: F,
                      trust: P,
                      depth: k,
                      budget: ye === "depth" ? void 0 : ye === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : he,
                      backlog_intake: je,
                      results_in_repo: H,
                      conversation_log: Ee,
                      trusted_authors: ct,
                      self_enabling: K,
                      approach: Ce,
                      sync_mode: ce,
                      steps: V.map((g) => ({ ...g, label: `dlc:${g.id}` }))
                    }),
                    className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                    style: { background: "var(--accent)", color: "var(--bg)" },
                    children: b ? "Save Pipeline" : "Create Pipeline"
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
function Et({ size: e = 12 }) {
  return /* @__PURE__ */ n("svg", { className: "animate-spin flex-shrink-0", width: e, height: e, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ t("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ t("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
const ea = {
  investigate: "🔎",
  requirements: "📝",
  design: "📐",
  tasks: "🧩",
  implement: "🔨",
  review: "🔍",
  pr: "🚀",
  intent: "🎯"
};
function ta(e, r) {
  const [o, a] = N(""), l = De(""), d = De(""), m = De(null);
  return d.current = e || "", qe(() => {
    if (!r || !d.current.startsWith(l.current)) {
      l.current = d.current, a(d.current);
      return;
    }
    const i = () => {
      const c = d.current, f = l.current;
      if (f.length >= c.length) {
        m.current = null;
        return;
      }
      const h = Math.max(1, Math.ceil((c.length - f.length) / 12));
      l.current = c.slice(0, f.length + h), a(l.current), m.current = requestAnimationFrame(i);
    };
    return m.current == null && (m.current = requestAnimationFrame(i)), () => {
      m.current != null && (cancelAnimationFrame(m.current), m.current = null);
    };
  }, [e, r]), o;
}
(() => {
  try {
    const e = Number(typeof localStorage < "u" && localStorage.getItem("dlc-live-peek-lines"));
    return Number.isFinite(e) && e >= 2 && e <= 40 ? e : 14;
  } catch {
    return 14;
  }
})();
function ra({ card: e, decisions: r, onResolveDecision: o, onInterject: a, onClose: l }) {
  var h, w, b;
  const [d, m] = N(""), i = r[0];
  if (!i) return /* @__PURE__ */ t("div", { className: "flex-1 p-3 text-[11px]", style: { color: "var(--muted)" }, children: "No pending decision." });
  const c = i.options || [], f = ((h = c.find((v) => v.recommended === !0)) == null ? void 0 : h.id) || ((w = c.find((v) => v.id && (i.rationale || "").toLowerCase().includes((v.id + ")").toLowerCase()))) == null ? void 0 : w.id) || ((b = c[0]) == null ? void 0 : b.id);
  return /* @__PURE__ */ n("div", { className: "flex-1 overflow-y-auto p-2.5 flex flex-col gap-2 text-[11px]", style: { color: "var(--text)" }, children: [
    /* @__PURE__ */ n("div", { className: "font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: [
      i.question || i.kind || "Decision needed",
      i.step ? /* @__PURE__ */ n("span", { className: "font-normal", style: { color: "var(--muted)" }, children: [
        " · ",
        i.step
      ] }) : null
    ] }),
    c.length > 0 ? c.map((v, x) => {
      const y = v.id || String.fromCharCode(65 + x), B = (v.id || y) === f;
      return /* @__PURE__ */ n(
        "button",
        {
          onClick: () => {
            o == null || o(i.id, v.id || y), l();
          },
          className: "text-left p-2 rounded-md hover:opacity-90",
          style: {
            background: B ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--bg-elevated, var(--bg))",
            border: `1px solid ${B ? "var(--accent)" : "var(--border)"}`
          },
          children: [
            /* @__PURE__ */ n("div", { className: "font-semibold flex items-center gap-1.5", style: { color: "var(--text-strong, var(--text))" }, children: [
              "Option ",
              y,
              B && /* @__PURE__ */ t("span", { className: "text-[9px] font-normal", style: { color: "var(--accent)" }, children: "⭐ recommended" })
            ] }),
            v.note && /* @__PURE__ */ t("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: v.note }),
            v.risk && /* @__PURE__ */ n("div", { className: "text-[10px] mt-0.5", style: { color: "var(--warn, var(--muted))" }, children: [
              "risk: ",
              v.risk
            ] })
          ]
        },
        y
      );
    }) : /* @__PURE__ */ t("div", { className: "text-[10px] italic p-2 rounded", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))" }, children: "Advisory decision — no options to choose. Acknowledge, or answer in words below." }),
    i.rationale && /* @__PURE__ */ n("div", { className: "text-[10px] italic p-2 rounded", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))" }, children: [
      "Agent rationale: ",
      i.rationale
    ] }),
    c.length === 0 && /* @__PURE__ */ t(
      "button",
      {
        onClick: () => {
          o == null || o(i.id), l();
        },
        className: "text-[10px] px-2 py-1 rounded font-semibold self-start",
        style: { background: "var(--accent)", color: "var(--bg)" },
        children: "Acknowledge"
      }
    ),
    a && /* @__PURE__ */ n("div", { className: "mt-1 flex items-center gap-1.5", children: [
      /* @__PURE__ */ t(
        "input",
        {
          value: d,
          onChange: (v) => m(v.target.value),
          onKeyDown: (v) => {
            v.key === "Enter" && d.trim() && (a("note", d.trim()), m(""));
          },
          placeholder: "Answer in words…",
          className: "flex-1 text-[10px] px-2 py-1 rounded",
          style: { background: "var(--bg-elevated, var(--bg))", color: "var(--text)", border: "1px solid var(--border)", outline: "none" }
        }
      ),
      /* @__PURE__ */ t(
        "button",
        {
          onClick: () => {
            d.trim() && (a("note", d.trim()), m(""));
          },
          disabled: !d.trim(),
          className: "text-[10px] px-2 py-1 rounded font-semibold",
          style: { background: d.trim() ? "var(--accent)" : "var(--border)", color: d.trim() ? "var(--bg)" : "var(--muted)", cursor: d.trim() ? "pointer" : "default" },
          children: "Send"
        }
      )
    ] }),
    r.length > 1 && /* @__PURE__ */ n("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: [
      "+",
      r.length - 1,
      " more decision",
      r.length - 1 === 1 ? "" : "s",
      " queued"
    ] })
  ] });
}
function na({ tail: e, active: r }) {
  const a = ta(e, r), l = !String(a || "").trim(), d = r ? "linear-gradient(to bottom, transparent 0, #000 30px)" : "linear-gradient(to bottom, #000 calc(100% - 30px), transparent 100%)";
  return /* @__PURE__ */ t("div", { className: `flex-1 min-h-0 flex flex-col overflow-hidden ${r ? "justify-end" : "justify-start"}`, style: { background: "#0a0c10" }, children: /* @__PURE__ */ t(
    "div",
    {
      className: "min-h-0 px-3 py-2 break-words overflow-hidden",
      style: {
        fontSize: "12px",
        lineHeight: "1.55",
        color: "#e8eef5",
        fontFamily: '"DejaVu Sans Mono", "Ubuntu Mono", "SF Mono", "JetBrains Mono", Consolas, "Liberation Mono", monospace',
        whiteSpace: "pre-wrap",
        maxHeight: "100%",
        WebkitMaskImage: l ? void 0 : d,
        maskImage: l ? void 0 : d
      },
      children: l ? /* @__PURE__ */ t("span", { style: { color: "#5a6b7d" }, children: r ? "waiting for output…" : "— session idle —" }) : /* @__PURE__ */ n("span", { children: [
        r && /* @__PURE__ */ t("span", { style: { color: "#5a6b7d" }, children: "… " }),
        /* @__PURE__ */ t("span", { style: { color: "#e6edf3" }, children: a }),
        r && /* @__PURE__ */ t("span", { className: "dlc-cursor", style: { color: "#7ee787" }, children: "▍" })
      ] })
    }
  ) });
}
const aa = {
  loop: "⚙",
  "step-agent": "🤖",
  orchestrator: "🧠",
  human: "🧑"
}, oa = {
  loop: "var(--muted)",
  "step-agent": "var(--info)",
  orchestrator: "var(--accent)",
  human: "var(--ok)"
};
function sa({ card: e, events: r, children: o, parent: a, onOpenCard: l, onClose: d }) {
  const m = o && o.length > 0 || !!a;
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (i) => {
        i.currentTarget === i.target && d();
      },
      children: /* @__PURE__ */ n(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Card timeline",
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(680px, calc(100vw - 32px))", maxHeight: "min(84vh, 760px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ n("header", { className: "px-5 py-3.5 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ t("h2", { className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "📜 Timeline" }),
                /* @__PURE__ */ t("div", { className: "text-[12px] mt-0.5 truncate", style: { color: "var(--text)" }, children: e.title })
              ] }),
              /* @__PURE__ */ t("button", { onClick: d, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ n("div", { className: "px-4 py-3 overflow-y-auto", children: [
              m && /* @__PURE__ */ n("div", { className: "mb-3 pb-3", style: { borderBottom: "1px dashed var(--border)" }, children: [
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "🌿 fan-out" }),
                a && /* @__PURE__ */ n(
                  "button",
                  {
                    className: "flex items-center gap-1.5 text-[12px] hover:underline mb-1",
                    onClick: () => l == null ? void 0 : l(a.id),
                    style: { color: "var(--accent)" },
                    title: "Open the integration parent",
                    children: [
                      "↑ parent · ",
                      /* @__PURE__ */ t("span", { className: "truncate max-w-[420px]", style: { color: "var(--text)" }, children: a.title })
                    ]
                  }
                ),
                o.map((i) => /* @__PURE__ */ n(
                  "button",
                  {
                    className: "flex items-center gap-1.5 text-[12px] hover:underline w-full text-left",
                    onClick: () => l == null ? void 0 : l(i.id),
                    title: "Open this child card",
                    style: { color: "var(--text)" },
                    children: [
                      /* @__PURE__ */ t("span", { "aria-hidden": "true", style: { color: "var(--accent)" }, children: "↳" }),
                      /* @__PURE__ */ t("span", { className: "truncate flex-1", children: i.title }),
                      /* @__PURE__ */ n("span", { className: "text-[9px] flex-shrink-0", style: { color: i.lifecycle === "retired" ? "var(--ok)" : "var(--muted)" }, children: [
                        i.stage || "",
                        i.lifecycle ? ` · ${i.lifecycle}` : "",
                        i.required === !1 ? " · optional" : ""
                      ] })
                    ]
                  },
                  i.id
                )),
                o.length > 0 && r.length === 0 && /* @__PURE__ */ n("div", { className: "text-[10px] mt-1.5 italic", style: { color: "var(--muted)" }, children: [
                  "This card fanned its work out to the ",
                  o.length,
                  " child card",
                  o.length > 1 ? "s" : "",
                  " above — the story lives there."
                ] })
              ] }),
              r.length === 0 ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: m ? "No events recorded on this card directly." : "No recorded events yet." }) : /* @__PURE__ */ t("ol", { className: "flex flex-col gap-2", children: r.map((i) => /* @__PURE__ */ n("li", { className: "flex gap-2 text-[12px]", children: [
                /* @__PURE__ */ t("span", { title: i.actor, "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", children: aa[i.actor] || "•" }),
                /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ n("div", { className: "flex items-baseline gap-1.5 flex-wrap", children: [
                    /* @__PURE__ */ n("span", { className: "font-medium", style: { color: i.needs_human ? "var(--warn)" : "var(--text)" }, children: [
                      i.needs_human && "🔴 ",
                      i.headline
                    ] }),
                    i.cls === "decision" && /* @__PURE__ */ t("span", { className: "text-[9px] px-1 rounded-full", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: "decision" }),
                    /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: i.at ? i.at.replace("T", " ").replace("Z", "") : "" })
                  ] }),
                  i.detail && /* @__PURE__ */ t("div", { className: "text-[10px] mt-0.5 leading-snug", style: { color: "var(--muted)" }, children: i.detail }),
                  /* @__PURE__ */ n("div", { className: "text-[9px] mt-0.5", style: { color: oa[i.actor] || "var(--muted)" }, children: [
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
function ua() {
  const e = Rr(), r = zr();
  qe(() => {
    console.info(
      "[dlc-yolo] UI bundle build: v42 (wing-open zIndex lift). prefers-reduced-motion:",
      typeof window < "u" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "REDUCE — drawer re-asserted, should play" : "no-preference"
    );
  }, []);
  const [o, a] = N([]), [l, d] = N([]), [m, i] = N({}), [c, f] = N(Ft), [h, w] = N(!0), [b, v] = N("pipeline"), [x, y] = N(/* @__PURE__ */ new Set()), [B, O] = N(!1), [E, F] = N(null), [$, P] = N([]), [J, k] = N([]), [re, T] = N([]), [ye, pe] = N(!1), [he, Ne] = N(!1), [je, ee] = N(!1), [H, ne] = N(!1), [Ee, Le] = N(!1), [Ae, C] = N(!1), [K, ae] = N([]), Ce = De(null);
  qe(() => {
    const s = Ce.current;
    if (!s) return;
    let p = !1, u = 0, _ = 0, R = 0;
    const D = 'button, a, input, textarea, select, [role="button"], .pill, [data-card-root], [data-no-pan]', I = (Z) => {
      Z.button !== 0 || Z.target.closest(D) || (p = !0, R = 0, u = Z.clientX, _ = s.scrollLeft, s.style.cursor = "grabbing", s.style.userSelect = "none");
    }, q = (Z) => {
      var G;
      if (!p) return;
      const Y = Z.clientX - u;
      R = Math.max(R, Math.abs(Y)), s.scrollLeft = _ - Y, R > 3 && ((G = s.setPointerCapture) == null || G.call(s, Z.pointerId));
    }, z = () => {
      p && (p = !1, s.style.cursor = "grab", s.style.userSelect = "");
    };
    return s.style.cursor = "grab", s.addEventListener("pointerdown", I), window.addEventListener("pointermove", q), window.addEventListener("pointerup", z), window.addEventListener("pointercancel", z), () => {
      s.removeEventListener("pointerdown", I), window.removeEventListener("pointermove", q), window.removeEventListener("pointerup", z), window.removeEventListener("pointercancel", z);
    };
  }, [h, b]);
  const Ue = De(!1), ce = De(!1), te = De(/* @__PURE__ */ new Set()), V = De(/* @__PURE__ */ new Set()), [oe, A] = N({}), le = se(
    (s) => e.get("/api/file-read?path=" + encodeURIComponent(s)),
    [e]
  ), Be = se((s) => e.get(s), [e]), Ge = se(async (s = !1) => {
    try {
      const p = !ce.current || s ? await er(le, Be) : await fr(le, gt, Be);
      gt = p.source === "endpoint" ? vt : p.path, ce.current = p.source !== "unresolved";
      let u = p.data;
      if (typeof u == "string")
        try {
          u = JSON.parse(u);
        } catch {
          u = null;
        }
      (!u || typeof u != "object" || Array.isArray(u)) && (u = { cards: [], pipelines: [], config: {} }), console.info(
        "[dlc-yolo] state resolved:",
        p.source,
        "from",
        p.path,
        "| rawType",
        typeof p.data,
        "| cards",
        Array.isArray(u.cards) ? u.cards.length : "none",
        "| pipelines",
        Array.isArray(u.pipelines) ? u.pipelines.length : "none"
      ), a(u.cards || []), d(u.pipelines || []), i({ github_webhook_history: u.github_webhook_history || [], scheduler_state: u.scheduler_state || null }), f({ ...Ft, ...u.config || {} });
    } catch (p) {
      console.error("Failed to fetch cards:", p);
    } finally {
      w(!1);
    }
  }, [le, Be]), _e = Te(() => {
    const s = /* @__PURE__ */ new Map();
    return l.forEach((p) => {
      s.has(p.repo) || s.set(p.repo, 0);
    }), o.forEach((p) => {
      var _;
      const u = ((_ = p.source) == null ? void 0 : _.repo) || "unlinked";
      s.set(u, (s.get(u) || 0) + 1);
    }), [...s.entries()].map(([p, u]) => ({ name: p, count: u })).sort((p, u) => u.count - p.count);
  }, [o, l]), ue = Te(
    () => x.size === 0 ? o : o.filter((s) => {
      var p;
      return x.has(((p = s.source) == null ? void 0 : p.repo) || "unlinked");
    }),
    [o, x]
  );
  qe(() => {
    V.current = new Set(o.map((s) => s.id)), te.current = new Set(o.flatMap(
      (s) => Object.values(s.step_sessions || {}).filter((p) => !!p.slot_key && !p.chat_disabled_at && !p.superseded).map((p) => p.slot_key)
    ));
  }, [o]), qe(() => {
    let s = !1, p = null, u, _ = 0;
    const R = () => {
      if (s) return;
      const D = window.location.protocol === "https:" ? "wss:" : "ws:";
      p = new WebSocket(`${D}//${window.location.host}/api/ws`), p.onopen = () => {
        _ = 0;
      }, p.onmessage = (I) => {
        if (typeof I.data == "string")
          try {
            const q = JSON.parse(I.data), z = q == null ? void 0 : q.data;
            if (q.type === "slots" && Array.isArray(z)) {
              const Y = new Set(te.current), G = [];
              for (const W of z) {
                const M = (W == null ? void 0 : W.key) || (W == null ? void 0 : W.slot) || (W == null ? void 0 : W.name), Me = String((W == null ? void 0 : W.title) || (W == null ? void 0 : W.name) || "");
                typeof M == "string" && M.startsWith("cron-") && [...V.current].some((Fe) => Me.includes(Fe)) && Y.add(M), typeof M == "string" && (W != null && W.running) && Y.has(M) && G.push(M);
              }
              te.current = Y, G.length && A((W) => {
                let M = W;
                for (const Me of G) {
                  const Fe = ur(W[Me]);
                  Fe !== W[Me] && (M = { ...M, [Me]: Fe });
                }
                return M;
              });
              return;
            }
            if (q.type === "subagent_spawn" || q.type === "subagent_chunk" || q.type === "subagent_done") {
              const Y = typeof (z == null ? void 0 : z.id) == "string" ? z.id : null;
              if (!Y || !V.current.has(Y)) return;
              const G = `card:${Y}`;
              A((W) => {
                const M = W[G];
                if (q.type === "subagent_spawn") {
                  const Fe = typeof (z == null ? void 0 : z.agent) == "string" ? z.agent : z != null && z.task ? String(z.task).slice(0, 40) : "agent", Q = (M != null && M.buffer ? `
` : "") + `── ${Fe} ──
`, ge = sr(
                    M != null && M.active ? M : { buffer: (M == null ? void 0 : M.buffer) || "", tail: "", active: !0, phase: "crew", seq: (M == null ? void 0 : M.seq) || 0 },
                    Q,
                    ((M == null ? void 0 : M.seq) || 0) + 1
                  );
                  return { ...W, [G]: ge };
                }
                if (q.type === "subagent_chunk" && typeof z.text == "string") {
                  const Fe = sr(M, z.text, Number(z.seq));
                  return Fe === M ? W : { ...W, [G]: Fe };
                }
                const Me = mr(M);
                return Me === M ? W : { ...W, [G]: Me };
              });
              return;
            }
            const Z = z == null ? void 0 : z.slot;
            if (!Z || !te.current.has(Z))
              return;
            q.type === "chat_status" && String(z.status || "").toLowerCase().startsWith("thinking") || q.type === "chat_thinking" ? A((Y) => {
              const G = ur(Y[Z], q.type === "chat_status");
              return G === Y[Z] ? Y : { ...Y, [Z]: G };
            }) : q.type === "chat_chunk" && typeof z.content == "string" ? A((Y) => {
              const G = sr(Y[Z], z.content, Number(z.seq));
              return G === Y[Z] ? Y : { ...Y, [Z]: G };
            }) : q.type === "chat_done" && A((Y) => {
              const G = mr(Y[Z]);
              return G === Y[Z] ? Y : { ...Y, [Z]: G };
            });
          } catch {
          }
      }, p.onclose = () => {
        if (s) return;
        const I = Math.min(1e3 * 2 ** _++, 15e3);
        u = setTimeout(R, I);
      }, p.onerror = () => p == null ? void 0 : p.close();
    };
    return R(), () => {
      s = !0, u && clearTimeout(u), p == null || p.close();
    };
  }, []), qe(() => {
    if (!je) return;
    const s = (p) => {
      p.key === "Escape" && ee(!1);
    };
    return window.addEventListener("keydown", s), () => window.removeEventListener("keydown", s);
  }, [je]);
  const lt = 6e5, ve = Te(() => {
    var u, _, R, D;
    const s = [], p = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked", "retired"]);
    for (const I of ue) {
      if (p.has(String(I.lifecycle || "").toLowerCase())) continue;
      const q = I.step_status || {}, z = I.step_sessions || {}, Z = l.find((G) => G.id === I.pipeline_id) || l.find((G) => {
        var W;
        return G.repo === ((W = I.source) == null ? void 0 : W.repo);
      }), Y = /* @__PURE__ */ new Set([...Object.keys(q), ...Object.keys(z)]);
      for (const G of Y) {
        const W = q[G] || "idle", M = z[G], Me = W === "pending" || W === "error", Fe = !!(M && (M.chat_disabled_at || M.superseded || M.retired_at || M.cron_pause_observed_at || M.retention === "released")), Q = !!(M != null && M.slot_key) && !Fe;
        if (!Me && !Q || !Me && Fe) continue;
        const ge = (u = I.pending_at) == null ? void 0 : u[G], tt = Me && !!ge && Date.now() - new Date(ge).getTime() > lt, ie = (_ = Z == null ? void 0 : Z.steps) == null ? void 0 : _.find((He) => He.id === G), Ke = (M == null ? void 0 : M.agent) || ((R = ie == null ? void 0 : ie.agent) == null ? void 0 : R.crew) || ((D = ie == null ? void 0 : ie.agent) == null ? void 0 : D.name) || "orchestrator", At = M == null ? void 0 : M.agent_id, Gt = M == null ? void 0 : M.slot_key, Kt = M == null ? void 0 : M.session_key, Vt = At ? K.some((He) => He.id === At) : Me && K.some((He) => (He.task || "").includes(I.id) || (He.task || "").includes(I.title)), Xt = !!(M != null && M.last_response_at) && (!M.last_response_handled_at || M.last_response_handled_at < M.last_response_at);
        s.push({ cardId: I.id, card: I.title || I.id, step: G, agent: Ke, stale: tt, status: W, live: Vt, responsePending: Xt, agentId: At, slotKey: Gt, sessionKey: Kt, sessionName: M == null ? void 0 : M.name });
      }
    }
    return s;
  }, [ue, l, K]), We = Te(() => {
    var R;
    let s;
    if (x.size === 1) {
      const D = [...x][0];
      s = (R = l.find((I) => I.repo === D)) == null ? void 0 : R.steps;
    } else l.length === 1 && (s = l[0].steps);
    const p = (s && s.length ? s : rr).map((D) => ({ ...D })), u = new Set(p.map((D) => D.id)), _ = [];
    return u.has("intake") || _.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), _.push(...p), u.has("done") || _.push({ id: "done", name: "Done", type: "agent" }), _;
  }, [x, l]), Je = Te(() => We.map((s) => s.id), [We]), me = se((s) => {
    var p;
    return ((p = We.find((u) => u.id === s)) == null ? void 0 : p.type) === "gate" || s.startsWith("gate-");
  }, [We]), it = se((s) => {
    var p, u;
    return ((u = (p = We.find((_) => _.id === s)) == null ? void 0 : p.agent) == null ? void 0 : u.name) || Mn[s] || "unknown";
  }, [We]), nt = se((s) => {
    var R, D;
    const p = s.step_sessions || {}, u = Object.entries(p).find(
      ([, I]) => I.retained_for_gate === s.stage && I.retention !== "released"
    );
    let _ = ((R = s.gate_review) == null ? void 0 : R.producer_step) || (u == null ? void 0 : u[0]);
    if (!_) {
      const I = l.find((G) => G.id === s.pipeline_id) || l.find((G) => {
        var W;
        return G.repo === ((W = s.source) == null ? void 0 : W.repo);
      }), q = (D = I == null ? void 0 : I.steps) != null && D.length ? I.steps : rr, z = [
        { id: "intake", name: "Intake", type: "agent" },
        ...q.filter((G) => G.id !== "intake" && G.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], Z = z.findIndex((G) => G.id === s.stage), Y = Z >= 0 ? z[Z] : void 0;
      if (_ = Y == null ? void 0 : Y.reviews_step, !_ && Z >= 0)
        for (let G = Z - 1; G >= 0; G--) {
          const W = z[G];
          if (!(W.id === "intake" || W.id === "done") && W.type !== "gate" && !W.id.startsWith("gate-")) {
            _ = W.id;
            break;
          }
        }
    }
    return _;
  }, [l]), wt = se((s) => {
    const p = nt(s);
    if (!p) return;
    const u = (s.step_sessions || {})[p];
    if (!(!(u != null && u.slot_key) || u.chat_disabled_at || u.superseded))
      return {
        step: p,
        slotKey: u.slot_key,
        retained: u.retention === "held-for-gate"
      };
  }, [nt]);
  qe(() => {
    const s = async () => {
      try {
        const _ = gt.slice(0, gt.lastIndexOf("/")), R = (_ ? _ + "/" : "") + "live_spawns.json", D = await e.get("/api/file-read?path=" + encodeURIComponent(R));
        Ue.current = !1;
        const I = D != null && D.at ? Date.now() - new Date(D.at).getTime() < 18e4 : !0;
        ae(I && Array.isArray(D == null ? void 0 : D.runs) ? D.runs : []);
      } catch {
        Ue.current = !0, ae([]);
      }
    };
    let p = 0;
    Ge(!0).then(s);
    const u = setInterval(() => {
      p += 1;
      const _ = p % 12 === 0;
      Ge(_).then(() => {
        Ue.current || s();
      });
    }, 1e4);
    return () => clearInterval(u);
  }, [Ge, e]);
  const Oe = se(async () => {
    Ne(!0);
    let s = [];
    try {
      const u = await le("~/.kiro/crew/config.json");
      s = En(u == null ? void 0 : u.agents), k(s);
    } catch (u) {
      console.warn("crew roster (config.json) unreadable:", u), k([]);
    }
    const p = await Promise.all(Ln(s).map(async (u) => {
      const _ = On(u, s);
      if (!_) return lr(null, u);
      try {
        const R = await le(_);
        return lr(R, u, _);
      } catch {
        return lr(null, u, _);
      }
    }));
    T(p), Ne(!1);
  }, [le]), bt = se(() => {
    pe(!0), Oe();
  }, [Oe]), ct = se((s) => {
    Oe().then(() => F(s));
  }, [Oe]), Qe = se(async (s) => {
    await e.post("/apps/dlc-yolo/api/agents/crew", {
      mode: s.mode,
      name: s.name,
      kiro_agent: s.kiroAgent,
      workspace: s.workspace || null,
      memory_store: s.memoryStore || null
    }), await Oe();
  }, [e, Oe]), fe = se(async (s) => {
    try {
      const p = await er(le, Be);
      gt = p.source === "endpoint" ? vt : p.path, p.data.cards = p.data.cards || [], s(p.data);
      let u = p;
      try {
        u = await er(le, Be), gt = u.source === "endpoint" ? vt : u.path, u.data.cards = u.data.cards || [], s(u.data);
      } catch {
        u = p;
      }
      try {
        await e.post("/apps/dlc-yolo/api/state", u.data);
      } catch (_) {
        console.warn("[dlc-yolo] uncapped state POST failed; falling back to file-write (capped):", _), await e.post("/api/file-write", {
          path: u.source === "endpoint" ? vt : u.path,
          content: JSON.stringify(u.data, null, 2)
        });
      }
      Ge();
    } catch (p) {
      console.error("Failed to mutate state:", p);
    }
  }, [e, Ge, le, Be]), Nt = se((s) => {
    f((p) => ({ ...p, ...s })), fe((p) => {
      p.config = { ...Ft, ...p.config || {}, ...s };
    });
  }, [fe]), et = se((s, p, u, _) => {
    const R = (/* @__PURE__ */ new Date()).toISOString(), D = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    fe((I) => {
      var G;
      const q = I.cards.find((W) => W.id === s);
      if (!q || q.stage !== p) return;
      if (_ === void 0 && u.type === "interject") {
        const W = u.text.trim();
        if (!W) return;
        q.interjection = q.interjection || [], q.interjection.some((M) => M.id === D) || q.interjection.push({
          id: D,
          at: R,
          step: p,
          kind: u.kind,
          text: W,
          by: "user",
          status: "pending"
        }), q.updated_at = R;
        return;
      }
      if ((((G = q.gate_review) == null ? void 0 : G.result_revision) ?? null) !== _) return;
      const Z = u.type === "reject" ? u.reason.trim() : void 0, Y = u.type === "interject" ? u.text.trim() : void 0;
      u.type === "reject" && !Z || u.type === "interject" && !Y || (q.gate_commands = q.gate_commands || [], q.gate_commands.some((W) => W.id === D) || q.gate_commands.push({
        id: D,
        gate: p,
        action: u.type,
        expected_revision: _ ?? null,
        actor: "user",
        at: R,
        status: "pending",
        ...Z ? { reason: Z } : {},
        ...u.type === "interject" ? { kind: u.kind, text: Y } : {}
      }), q.updated_at = R);
    });
  }, [fe]), S = se((s, p, u) => {
    const _ = (/* @__PURE__ */ new Date()).toISOString(), R = Cn();
    fe((D) => {
      const I = D.cards.find((z) => z.id === s);
      if (!I) {
        console.warn("[dlc-yolo maintain] card not found in state:", s);
        return;
      }
      let q;
      try {
        q = $n({ id: R, kind: p, text: u, card: I, now: _ });
      } catch (z) {
        console.warn("[dlc-yolo maintain] buildRequest threw:", z);
        return;
      }
      I.interjection = An(I.interjection, q), I.updated_at = _, console.info("[dlc-yolo maintain] appended request to card", s, "- interjection count now", (I.interjection || []).length);
    });
  }, [fe]), L = se((s) => {
    if (!window.confirm("Cancel this card? Writes are revoked cooperatively — a live turn may not stop immediately, and its worktree is retained until terminal observation.")) return;
    const p = (/* @__PURE__ */ new Date()).toISOString();
    fe((u) => {
      const _ = u.cards.find((R) => R.id === s);
      _ && (_.lifecycle = "cancelled", _.writes_allowed = !1, _.cancel_requested_at = p, _.updated_at = p);
    });
  }, [fe]), be = se((s, p, u) => {
    fe((_) => {
      const R = _.cards.find((I) => I.id === s);
      if (!R) return;
      const D = (R.decisions || []).find((I) => I.id === p);
      if (D) {
        const I = (/* @__PURE__ */ new Date()).toISOString();
        D.chosen = u && u.trim() ? u.trim() : "acknowledged", D.status = u ? "resolved" : "acknowledged", D.resolved_at = I, D.resolved_by = "user";
      }
      R.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [fe]), Se = se(async (s) => {
    var _, R, D;
    const u = ((I) => {
      var Z;
      const q = I == null ? void 0 : I.orchestrator_session;
      if (q != null && q.slot_key) return q.slot_key;
      if (q != null && q.session_key) return q.session_key.replace(/^cron:/, "cron-");
      const z = (Z = l.find((Y) => Y.id === (I == null ? void 0 : I.pipeline_id))) == null ? void 0 : Z.orchestrator_session;
      return (z == null ? void 0 : z.slot_key) || (z != null && z.session_key ? z.session_key.replace(/^cron:/, "cron-") : void 0);
    })(s);
    if (u) {
      r(`/chat?sid=${encodeURIComponent(u)}`);
      return;
    }
    try {
      const I = await e.post("/apps/dlc-yolo/api/orchestrator/trigger", { card_id: s.id });
      if (I != null && I.slot_key) {
        r(`/chat?sid=${encodeURIComponent(I.slot_key)}`);
        return;
      }
    } catch {
    }
    for (let I = 0; I < 8; I++) {
      await new Promise((q) => setTimeout(q, 2e3));
      try {
        const q = await fr(le, gt), z = (q.data.cards || []).find((G) => G.id === s.id), Z = (_ = (q.data.pipelines || []).find((G) => G.id === (z == null ? void 0 : z.pipeline_id))) == null ? void 0 : _.orchestrator_session, Y = ((R = z == null ? void 0 : z.orchestrator_session) == null ? void 0 : R.slot_key) || (((D = z == null ? void 0 : z.orchestrator_session) == null ? void 0 : D.session_key) || (Z == null ? void 0 : Z.session_key) || "").replace(/^cron:/, "cron-") || (Z == null ? void 0 : Z.slot_key);
        if (Y) {
          Ge(), r(`/chat?sid=${encodeURIComponent(Y)}`);
          return;
        }
      } catch {
      }
    }
    Ge();
  }, [e, r, le, Ge]), Ie = se((s) => {
    fe((p) => {
      var R;
      const u = p.cards.find((D) => D.id === s);
      if (!u) return;
      const _ = u.trust || ((R = p.config) == null ? void 0 : R.trust) || Ft.trust;
      u.trust = kt[(kt.indexOf(_) + 1) % kt.length], u.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [fe]), ze = se((s) => {
    fe((p) => {
      var R;
      const u = p.cards.find((D) => D.id === s);
      if (!u) return;
      const _ = u.depth || ((R = p.config) == null ? void 0 : R.depth) || Ft.depth;
      u.depth = Lt[(Lt.indexOf(_) + 1) % Lt.length], u.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [fe]), Ye = se((s, p) => {
    fe((u) => {
      const _ = u.cards.find((R) => R.id === s);
      _ && (p ? _.budget = { ...p } : delete _.budget, _.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [fe]), xt = se((s) => {
    y((p) => {
      const u = new Set(p);
      return u.has(s) ? u.delete(s) : u.add(s), u;
    });
  }, []), dt = se(() => y(/* @__PURE__ */ new Set()), []), pt = se(async () => {
    const s = Oe(), p = [];
    try {
      const u = await e.get("/api/file-read?path=~/.kiro/crew/config.json"), _ = (u == null ? void 0 : u.workspaces) || {};
      Object.entries(_).forEach(([R, D]) => {
        const I = typeof (D == null ? void 0 : D.repo) == "string" && /^[^/\s]+\/[^/\s]+$/.test(D.repo) ? D.repo : "";
        p.push({
          repo: I,
          workspace: R,
          label: R,
          source: "workspace",
          detail: (D == null ? void 0 : D.dir) || R,
          path: typeof (D == null ? void 0 : D.dir) == "string" ? D.dir : void 0
        });
      });
    } catch (u) {
      console.warn("workspaces registry unreadable:", u);
    }
    try {
      const u = await e.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((u == null ? void 0 : u.repos) || []).forEach((_) => {
        _ != null && _.owner && (_ != null && _.repo) && p.push({ repo: `${_.owner}/${_.repo}`, source: "issue-radar", detail: `${_.provider || "github"} · ${_.host || "github.com"}` });
      });
    } catch (u) {
      console.warn("issue-radar config unreadable (app may not be installed):", u);
    }
    P(p), await s, O(!0);
  }, [e, Oe]), at = se(async (s) => {
    const p = (/* @__PURE__ */ new Date()).toISOString(), u = "pl-" + Math.random().toString(36).slice(2, 10);
    await fe((_) => {
      _.pipelines = _.pipelines || [];
      const R = _.pipelines.find((D) => D.repo === s.repo);
      R ? (R.source = s.source, R.workspace = s.workspace, s.repo_path ? R.repo_path = s.repo_path : delete R.repo_path, R.trust = s.trust, R.depth = s.depth, s.budget ? R.budget = s.budget : delete R.budget, R.backlog_intake = s.backlog_intake, R.results_in_repo = s.results_in_repo, R.conversation_log = s.conversation_log, s.trusted_authors.length ? R.trusted_authors = s.trusted_authors : delete R.trusted_authors, R.self_enabling = s.self_enabling, R.approach = s.approach, s.sync_mode ? R.sync_mode = s.sync_mode : delete R.sync_mode, R.steps = s.steps) : _.pipelines.push({
        id: u,
        repo: s.repo,
        workspace: s.workspace,
        ...s.repo_path ? { repo_path: s.repo_path } : {},
        source: s.source,
        trust: s.trust,
        depth: s.depth,
        backlog_intake: s.backlog_intake,
        ...s.budget ? { budget: s.budget } : {},
        results_in_repo: s.results_in_repo,
        conversation_log: s.conversation_log,
        ...s.trusted_authors.length ? { trusted_authors: s.trusted_authors } : {},
        self_enabling: s.self_enabling,
        approach: s.approach,
        ...s.sync_mode && s.sync_mode !== "poll" ? { sync_mode: s.sync_mode } : {},
        sot: "github",
        steps: s.steps,
        created_at: p
      });
    }), O(!1), F(null), y(/* @__PURE__ */ new Set([s.repo]));
  }, [fe]), Pt = se(async (s) => {
    await fe((p) => {
      p.pipelines = (p.pipelines || []).filter((u) => u.repo !== s), p.cards = (p.cards || []).filter((u) => {
        var _;
        return (((_ = u.source) == null ? void 0 : _.repo) || "unlinked") !== s;
      });
    }), y((p) => {
      const u = new Set(p);
      return u.delete(s), u;
    });
  }, [fe]), _t = Te(() => {
    const s = /* @__PURE__ */ new Set(["retired", "cancelled", "canceled", "merged", "superseded"]);
    return Je.reduce((p, u) => (p[u] = ue.filter((_) => _.stage === u && !s.has(String(_.lifecycle || ""))), p), {});
  }, [ue, Je]), Ct = Te(
    () => ue.filter((s) => ["retired", "merged"].includes(String(s.lifecycle || ""))),
    [ue]
  ), St = Te(
    () => ue.filter((s) => ["cancelled", "canceled", "superseded"].includes(String(s.lifecycle || ""))),
    [ue]
  ), Ut = se((s) => {
    var p;
    (p = document.getElementById(`stage-col-${s}`)) == null || p.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), Ot = Te(() => {
    const s = {};
    return ue.forEach((p) => {
      var _;
      const u = ((_ = p.source) == null ? void 0 : _.repo) || "unlinked";
      (s[u] || (s[u] = [])).push(p);
    }), s;
  }, [ue]), It = Te(() => {
    const s = {};
    return ue.forEach((p) => {
      const u = it(p.stage);
      (s[u] || (s[u] = [])).push(p);
    }), s;
  }, [ue, it]), Wt = Te(() => {
    const s = Object.fromEntries(xr.map((p) => [p, []]));
    return ue.forEach((p) => {
      var D, I;
      const u = l.find((q) => q.id === p.pipeline_id) || l.find((q) => {
        var z;
        return q.repo === ((z = p.source) == null ? void 0 : z.repo);
      }), _ = ((I = (D = u == null ? void 0 : u.steps) == null ? void 0 : D.find((q) => q.id === p.stage)) == null ? void 0 : I.type) === "gate" || me(p.stage), R = ve.some((q) => q.cardId === p.id && q.step === p.stage && q.live);
      s[wr(p, { isGate: _, liveObserved: R }).kind].push(p);
    }), Object.fromEntries(xr.filter((p) => s[p].length > 0).map((p) => [Or[p].label, s[p]]));
  }, [ue, l, me, ve]), g = /* @__PURE__ */ new Set(["retired", "merged", "cancelled", "canceled", "superseded"]), j = ue.filter((s) => !g.has(String(s.lifecycle || ""))).length, ke = ue.filter((s) => me(s.stage) && !g.has(String(s.lifecycle || ""))).length, Re = ue.filter((s) => g.has(String(s.lifecycle || ""))).length, de = ue.reduce((s, p) => {
    var u;
    return s + (((u = p.parked) == null ? void 0 : u.length) || 0);
  }, 0), qt = {
    pipeline: ue.length,
    workspace: Object.keys(Ot).length,
    crew: Object.keys(It).length,
    status: ue.length,
    backlog: de
  }, Mt = ve.some((s) => {
    var p, u;
    return !!s.slotKey && ((p = oe[s.slotKey]) == null ? void 0 : p.active) && ((u = oe[s.slotKey]) == null ? void 0 : u.phase) === "generating";
  }), Ht = ve.some((s) => {
    var p, u;
    return !!s.slotKey && ((p = oe[s.slotKey]) == null ? void 0 : p.active) && ((u = oe[s.slotKey]) == null ? void 0 : u.phase) === "thinking";
  }), $t = (s) => {
    var W, M, Me, Fe;
    const p = l.find((Q) => Q.id === s.pipeline_id) || l.find((Q) => {
      var ge;
      return Q.repo === ((ge = s.source) == null ? void 0 : ge.repo);
    }), u = ((M = (W = p == null ? void 0 : p.steps) == null ? void 0 : W.find((Q) => Q.id === s.stage)) == null ? void 0 : M.type) === "gate" || me(s.stage), _ = ["cancelled", "canceled", "retired", "merged", "superseded"].includes(String(s.lifecycle || "")), R = u && !_, D = R ? ((Me = s.gate_review) == null ? void 0 : Me.result_revision) ?? null : void 0, I = R ? nt(s) : void 0, q = R ? wt(s) : void 0, z = ve.some((Q) => Q.cardId === s.id && Q.step === s.stage && Q.live), Z = wr(s, { isGate: R, liveObserved: z }), Y = (Fe = p == null ? void 0 : p.steps) == null ? void 0 : Fe.find((Q) => Q.id === s.stage), G = s.capability || (Y == null ? void 0 : Y.capability) || "auto-derived";
    return {
      card: s,
      config: c,
      isGate: R,
      cardStatus: Z,
      effectiveCapability: G,
      producerStep: I,
      producerSession: q,
      onOpenProducer: q ? () => r(`/chat?sid=${encodeURIComponent(q.slotKey)}`) : void 0,
      onApprove: R ? () => et(s.id, s.stage, { type: "approve" }, D) : void 0,
      onReject: R ? (Q) => et(s.id, s.stage, { type: "reject", reason: Q }, D) : void 0,
      onCycleTrust: () => Ie(s.id),
      onCycleDepth: () => ze(s.id),
      onSetBudget: (Q) => Ye(s.id, Q),
      onInterject: (Q, ge) => et(
        s.id,
        s.stage,
        { type: "interject", kind: Q, text: ge },
        D
      ),
      onResolveDecision: (Q, ge) => be(s.id, Q, ge),
      onOpenOrchestrator: () => Se(s),
      liveView: (() => {
        var Gt, Kt, Vt, Xt;
        const Q = (Kt = (Gt = s.step_sessions) == null ? void 0 : Gt[s.stage]) == null ? void 0 : Kt.slot_key, ge = Q ? oe[Q] : void 0, tt = ve.some((He) => He.cardId === s.id && He.step === s.stage && He.live), ie = oe[`card:${s.id}`], Ke = Kr((Vt = s.step_progress) == null ? void 0 : Vt[s.stage]), At = !!Ke && (tt || ((Xt = s.step_status) == null ? void 0 : Xt[s.stage]) === "pending");
        if (Ke && (At || ie != null && ie.buffer || ie != null && ie.tail)) {
          const He = !!(ie != null && ie.active);
          return {
            stage: s.stage,
            phase: He ? "crew" : Ke.phase,
            tail: He && (ie == null ? void 0 : ie.tail) || Ke.tail,
            buffer: Ke.buffer || Ke.tail || "",
            active: !!(At || He),
            seq: Ke.seq,
            slotKey: Q || "",
            source: "progress-trail",
            onOpen: () => Q && r(`/chat?sid=${encodeURIComponent(Q)}`)
          };
        }
        if (ie && (ie.buffer || ie.tail))
          return {
            stage: s.stage,
            phase: ie.active ? "crew" : "idle",
            tail: ie.tail || "",
            buffer: ie.buffer || "",
            active: !!ie.active,
            seq: ie.seq || 0,
            slotKey: Q || "",
            onOpen: () => Q && r(`/chat?sid=${encodeURIComponent(Q)}`)
          };
        if (ge != null && ge.active)
          return {
            stage: s.stage,
            phase: ge.phase || "running",
            tail: ge.tail || "",
            buffer: ge.buffer || "",
            active: !!ge.active && tt,
            seq: ge.seq || 0,
            slotKey: Q,
            onOpen: () => r(`/chat?sid=${encodeURIComponent(Q)}`)
          };
      })(),
      allCards: ue,
      onRequest: (Q, ge) => S(s.id, Q, ge),
      onOpenStepSession: (() => {
        const Q = s.step_sessions;
        if (!Q || typeof Q != "object") return;
        const ge = Object.entries(Q).map(([tt, ie]) => {
          const Ke = (ie == null ? void 0 : ie.slot_key) || (ie != null && ie.session_key ? ie.session_key.replace(/^cron:/, "cron-") : void 0);
          return Ke ? { step: tt, open: () => r(`/chat?sid=${encodeURIComponent(Ke)}`) } : null;
        }).filter((tt) => tt !== null);
        return ge.length ? ge : void 0;
      })(),
      onCancelCard: () => L(s.id),
      onOpenCard: (Q) => {
        const ge = document.getElementById(`card-${Q}`);
        if (ge) {
          ge.scrollIntoView({ behavior: "smooth", block: "center" });
          const tt = ge.style.outline;
          ge.style.outline = "2px solid var(--accent)", setTimeout(() => {
            ge.style.outline = tt;
          }, 1400);
        }
      }
    };
  };
  return /* @__PURE__ */ n(Xe, { children: [
    /* @__PURE__ */ t("style", { children: `
.dlc-yolo-root, .dlc-yolo-root * { font-family: "Ubuntu", "Ubuntu Sans", "DejaVu Sans", "Segoe UI", "Inter", Roboto, "Helvetica Neue", Arial, sans-serif; font-weight: 400; }
.dlc-yolo-root .pill, .dlc-yolo-root button { font-weight: 500; }
@keyframes dlcCursorBlink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
.dlc-wing-slide { transition: transform 420ms cubic-bezier(.32,.72,.28,1); }
.dlc-cursor { animation: dlcCursorBlink 1.1s step-end infinite; }
/* The host injects a reduced-motion reset whose selector :not([data-virtuoso-scroller] *) has the
   SAME (0,1,0) specificity as a single class, so it wins on source order (it loads later) and zeroes
   our durations. Use a doubled-class selector (0,2,0) to definitively win, so the wing's slide
   (a brief, user-triggered spatial cue) still plays under the user's reduced-motion setting. */
@media (prefers-reduced-motion: reduce) {
  .dlc-wing-slide.dlc-wing-slide { transition-duration: 420ms !important; }
  .dlc-cursor.dlc-cursor { animation-duration: 1.1s !important; animation-iteration-count: infinite !important; }
}
` }),
    /* @__PURE__ */ n("div", { className: "dlc-yolo-root", children: [
      /* @__PURE__ */ t(Fr, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
      ye && /* @__PURE__ */ t(
        dr,
        {
          profiles: re,
          crews: J,
          loading: he,
          context: x.size === 1 ? [...x][0] : void 0,
          onRefresh: () => {
            Oe();
          },
          onSaveCrew: Qe,
          onClose: () => pe(!1)
        }
      ),
      H && /* @__PURE__ */ t(
        "div",
        {
          className: "fixed inset-0 z-50 flex items-center justify-center p-4",
          style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
          onMouseDown: (s) => {
            s.currentTarget === s.target && ne(!1);
          },
          children: /* @__PURE__ */ n(
            "section",
            {
              role: "dialog",
              "aria-modal": "true",
              "aria-label": "Pipeline event tree",
              className: "flex flex-col rounded-xl overflow-hidden",
              style: { width: "min(920px, calc(100vw - 32px))", maxHeight: "min(88vh, 900px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
              children: [
                /* @__PURE__ */ n("header", { className: "px-5 py-3.5 flex items-center gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ t("h2", { className: "text-[15px] font-semibold flex-1", style: { color: "var(--text-strong, var(--text))" }, children: "🌲 Pipeline event tree" }),
                  /* @__PURE__ */ t("button", { onClick: () => ne(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
                ] }),
                /* @__PURE__ */ t("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ t(
                  Xn,
                  {
                    pipeline: l.find((s) => ue.some((p) => p.pipeline_id === s.id)) || l[0],
                    cards: ue,
                    extras: m,
                    onOpenCard: (s) => {
                      ne(!1), v("pipeline"), setTimeout(() => {
                        const p = document.getElementById(`card-${s}`);
                        if (p) {
                          p.scrollIntoView({ behavior: "smooth", block: "center" });
                          const u = p.style.outline;
                          p.style.outline = "2px solid var(--accent)", setTimeout(() => {
                            p.style.outline = u;
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
      Ee && /* @__PURE__ */ t(
        "div",
        {
          className: "fixed inset-0 z-50 flex items-center justify-center p-4",
          style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
          onMouseDown: (s) => {
            s.currentTarget === s.target && Le(!1);
          },
          children: /* @__PURE__ */ n(
            "section",
            {
              role: "dialog",
              "aria-modal": "true",
              "aria-label": "Backlog",
              className: "flex flex-col rounded-xl overflow-hidden",
              style: { width: "min(820px, calc(100vw - 32px))", maxHeight: "min(88vh, 900px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
              children: [
                /* @__PURE__ */ n("header", { className: "px-5 py-3.5 flex items-center gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ n("h2", { className: "text-[15px] font-semibold flex-1", style: { color: "var(--text-strong, var(--text))" }, children: [
                    "📋 Backlog",
                    de ? ` · ${de}` : ""
                  ] }),
                  /* @__PURE__ */ t("button", { onClick: () => Le(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
                ] }),
                /* @__PURE__ */ t("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ t(Yn, { cards: ue }) })
              ]
            }
          )
        }
      ),
      Ae && /* @__PURE__ */ t(
        Un,
        {
          cards: ue,
          schedulerState: m.scheduler_state,
          statePath: gt,
          readAppFile: le,
          onClose: () => C(!1)
        }
      ),
      je && /* @__PURE__ */ t(
        "div",
        {
          className: "fixed inset-0 z-50 flex items-center justify-center p-4",
          style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
          onMouseDown: (s) => {
            s.currentTarget === s.target && ee(!1);
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
                      /* @__PURE__ */ t("h2", { id: "agent-sessions-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agent sessions" }),
                      /* @__PURE__ */ t("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: ve.length })
                    ] }),
                    /* @__PURE__ */ t("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "Live activity from enabled chats linked to pipeline cards." })
                  ] }),
                  /* @__PURE__ */ t(
                    "button",
                    {
                      onClick: () => ee(!1),
                      "aria-label": "Close agent sessions",
                      className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                      style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                      children: "×"
                    }
                  )
                ] }),
                /* @__PURE__ */ t("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: ve.length === 0 ? /* @__PURE__ */ t("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : ve.map((s) => {
                  const p = s.slotKey ? oe[s.slotKey] : void 0;
                  return /* @__PURE__ */ n(
                    "div",
                    {
                      className: "rounded-lg px-3 py-2.5",
                      style: { background: s.responsePending ? "color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))" : "var(--bg, transparent)", border: "1px solid var(--border)" },
                      children: [
                        /* @__PURE__ */ n("div", { className: "flex items-center gap-2 text-[11px] min-w-0", children: [
                          /* @__PURE__ */ t(
                            "span",
                            {
                              className: s.status === "pending" || s.responsePending ? "inline-block animate-pulse flex-shrink-0" : "inline-block flex-shrink-0",
                              style: { width: 7, height: 7, borderRadius: 999, background: s.stale ? "var(--warn)" : s.responsePending || s.status === "pending" ? "var(--accent)" : "var(--muted)" }
                            }
                          ),
                          /* @__PURE__ */ t("span", { className: "font-semibold flex-shrink-0", style: { color: "var(--accent)" }, title: s.sessionName || void 0, children: s.agent }),
                          /* @__PURE__ */ n("span", { className: "truncate", style: { color: "var(--muted)" }, children: [
                            "· ",
                            s.step
                          ] }),
                          /* @__PURE__ */ t("span", { className: "ml-auto truncate max-w-[220px]", style: { color: "var(--text, var(--muted))" }, title: s.card, children: s.card }),
                          /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: s.responsePending ? "var(--warn)" : s.status === "pending" ? "var(--ok)" : "var(--muted)" }, children: s.responsePending ? "response" : s.status }),
                          s.stale && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, title: "stale — will be reclaimed", children: "↻" })
                        ] }),
                        (p == null ? void 0 : p.active) && p.phase === "thinking" && /* @__PURE__ */ n("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                          /* @__PURE__ */ t(Et, { size: 13 }),
                          /* @__PURE__ */ t("span", { children: "Thinking" })
                        ] }),
                        (p == null ? void 0 : p.active) && p.phase === "generating" && p.tail && /* @__PURE__ */ n("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                          /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                          /* @__PURE__ */ n("span", { className: "font-mono text-[11px] truncate", children: [
                            "Generating · …",
                            p.tail
                          ] })
                        ] }),
                        s.slotKey && /* @__PURE__ */ n(
                          "button",
                          {
                            className: "mt-2 ml-4 font-mono",
                            style: { color: "var(--muted)", fontSize: 10, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
                            title: `Copy openable slot ${s.slotKey} (${s.sessionName || s.sessionKey}); open it from Chats`,
                            onClick: () => {
                              var u;
                              try {
                                (u = navigator.clipboard) == null || u.writeText(s.slotKey || "");
                              } catch {
                              }
                            },
                            children: [
                              "copy ",
                              s.slotKey.slice(0, 18)
                            ]
                          }
                        )
                      ]
                    },
                    `${s.card}:${s.step}`
                  );
                }) }),
                /* @__PURE__ */ t("footer", { className: "px-5 py-3 text-[10px]", style: { color: "var(--muted)", borderTop: "1px solid var(--border)" }, children: "Thinking and text tails come directly from live dashboard events. Terminal turns stay linked until chat is explicitly disabled." })
              ]
            }
          )
        }
      ),
      B && /* @__PURE__ */ t(
        $r,
        {
          candidates: $,
          existingRepos: new Set(l.map((s) => s.repo)),
          defaults: c,
          agentProfiles: re,
          crews: J,
          onCreate: at,
          onSaveCrew: Qe,
          onClose: () => O(!1)
        }
      ),
      E && /* @__PURE__ */ t(
        $r,
        {
          candidates: $,
          existingRepos: new Set(l.map((s) => s.repo)),
          defaults: c,
          agentProfiles: re,
          crews: J,
          editPipeline: l.find((s) => s.repo === E) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
          { id: "pl-" + E, repo: E, source: "manual", trust: c.trust, depth: c.depth, backlog_intake: !0, sot: "github", steps: rr.map((s) => ({ ...s })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
          cardCount: o.filter((s) => {
            var p;
            return (((p = s.source) == null ? void 0 : p.repo) || "unlinked") === E;
          }).length,
          isExample: Br.has(E),
          onCreate: at,
          onSaveCrew: Qe,
          onDelete: Pt,
          onClose: () => F(null)
        }
      ),
      /* @__PURE__ */ n("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
        /* @__PURE__ */ t(Bn, { steps: We, cardsByStage: _t, onNodeClick: Ut }),
        /* @__PURE__ */ n("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3", children: [
          /* @__PURE__ */ t(Yt, { label: "Active", value: String(j), accent: !0 }),
          /* @__PURE__ */ t(Yt, { label: "Gated", value: String(ke) }),
          /* @__PURE__ */ t(Yt, { label: "Done", value: String(Re) }),
          /* @__PURE__ */ t(Yt, { label: "Parked", value: String(de) })
        ] }),
        /* @__PURE__ */ t(
          pn,
          {
            repos: _e.map((s) => s.name),
            selectedRepos: [...x],
            onNewPipeline: () => {
              pt();
            },
            onConfigure: ct,
            onOpenAgents: bt
          }
        ),
        /* @__PURE__ */ n("div", { className: "flex gap-4 items-start", children: [
          /* @__PURE__ */ t(
            Zn,
            {
              repos: _e,
              selected: x,
              onToggle: xt,
              onClear: dt,
              onAddWorkspace: pt,
              onEdit: ct
            }
          ),
          /* @__PURE__ */ n("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ n("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
              /* @__PURE__ */ t(zn, { active: b, onChange: v, counts: qt }),
              /* @__PURE__ */ n(
                "button",
                {
                  onClick: () => ne(!0),
                  "aria-haspopup": "dialog",
                  className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Pipeline event tree — everything happening across the pipeline",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                  children: [
                    "🌲 ",
                    /* @__PURE__ */ t("span", { className: "font-semibold", children: "Tree" })
                  ]
                }
              ),
              /* @__PURE__ */ n(
                "button",
                {
                  onClick: () => Le(!0),
                  "aria-haspopup": "dialog",
                  className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Parked backlog ideas",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                  children: [
                    "📋 ",
                    /* @__PURE__ */ t("span", { className: "font-semibold", children: "Backlog" }),
                    de ? /* @__PURE__ */ n("span", { style: { color: "var(--accent)" }, children: [
                      "· ",
                      de
                    ] }) : null
                  ]
                }
              ),
              /* @__PURE__ */ n(
                "button",
                {
                  onClick: () => C(!0),
                  "aria-haspopup": "dialog",
                  className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Operations — runtime, projection parity, webhook, sessions",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                  children: [
                    "🛠 ",
                    /* @__PURE__ */ t("span", { className: "font-semibold", children: "Ops" })
                  ]
                }
              ),
              /* @__PURE__ */ n(
                "button",
                {
                  onClick: () => ee(!0),
                  "aria-haspopup": "dialog",
                  "aria-expanded": je,
                  className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Open enabled agent sessions and see live activity",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: Mt || Ht || ve.some((s) => s.status === "pending" || s.responsePending) ? "var(--accent)" : "var(--muted)" },
                  children: [
                    Ht ? /* @__PURE__ */ t(Et, { size: 11 }) : /* @__PURE__ */ t(
                      "span",
                      {
                        className: Mt || ve.some((s) => s.status === "pending" || s.responsePending) ? "inline-block animate-pulse" : "inline-block",
                        style: { width: 7, height: 7, borderRadius: 999, background: Mt ? "var(--ok)" : ve.some((s) => s.responsePending) ? "var(--warn)" : ve.some((s) => s.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: ve.length ? 1 : 0.5 }
                      }
                    ),
                    /* @__PURE__ */ t("span", { className: "font-semibold", children: ve.length ? `${ve.length} session${ve.length === 1 ? "" : "s"}` : "no sessions" }),
                    Ht && /* @__PURE__ */ t("span", { children: "· thinking" }),
                    Mt && /* @__PURE__ */ t("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                    !Ht && !Mt && ve.filter((s) => s.status === "pending").length > 0 && /* @__PURE__ */ n("span", { children: [
                      "· ",
                      ve.filter((s) => s.status === "pending").length,
                      " running"
                    ] }),
                    ve.some((s) => s.responsePending) && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, children: "· response" }),
                    ve.some((s) => s.stale) && /* @__PURE__ */ n("span", { style: { color: "var(--warn)" }, children: [
                      "· ",
                      ve.filter((s) => s.stale).length,
                      " stale ↻"
                    ] })
                  ]
                }
              ),
              x.size > 0 && /* @__PURE__ */ n(
                "span",
                {
                  className: "text-[11px] px-2 py-1 rounded-md font-medium",
                  style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                  children: [
                    x.size === 1 ? [...x][0] : `${x.size} workspaces`,
                    " · ",
                    /* @__PURE__ */ t("button", { onClick: dt, className: "underline hover:opacity-80", children: "clear" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ t(Kn, { config: c, onSet: Nt }),
            h ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : /* @__PURE__ */ n("div", { ref: Ce, className: "flex gap-3 overflow-x-auto pb-4 pr-4", children: [
              "                ",
              b === "pipeline" && We.map((s) => /* @__PURE__ */ t(jt, { id: `stage-col-${s.id}`, title: s.name, count: (_t[s.id] || []).length, children: (_t[s.id] || []).map((p) => /* @__PURE__ */ t(Tt, { ...$t(p) }, p.id)) }, s.id)),
              b === "pipeline" && Ct.length > 0 && /* @__PURE__ */ t("div", { className: "flex-shrink-0 pl-3", style: { borderLeft: "2px dashed var(--border-strong, var(--border))" }, children: /* @__PURE__ */ t(jt, { id: "stage-col-done", title: "✅ Done", count: Ct.length, children: Ct.map((s) => /* @__PURE__ */ t(Tt, { ...$t(s) }, s.id)) }) }),
              b === "pipeline" && St.length > 0 && /* @__PURE__ */ t(jt, { id: "stage-col-cancelled", title: "⏹ Cancelled", count: St.length, children: St.map((s) => /* @__PURE__ */ t(Tt, { ...$t(s) }, s.id)) }),
              b === "workspace" && Object.entries(Ot).map(([s, p]) => /* @__PURE__ */ t(jt, { title: s, count: p.length, children: p.map((u) => /* @__PURE__ */ t(Tt, { ...$t(u) }, u.id)) }, s)),
              b === "crew" && Object.entries(It).map(([s, p]) => /* @__PURE__ */ t(jt, { title: s, count: p.length, children: p.map((u) => /* @__PURE__ */ t(Tt, { ...$t(u) }, u.id)) }, s)),
              b === "status" && Object.entries(Wt).map(([s, p]) => /* @__PURE__ */ t(jt, { title: s, count: p.length, children: p.map((u) => /* @__PURE__ */ t(Tt, { ...$t(u) }, u.id)) }, s))
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  ua as default
};
