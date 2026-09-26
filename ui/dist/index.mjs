import { jsx as t, Fragment as Ve, jsxs as n } from "react/jsx-runtime";
import { useChatLauncher as Ar, useAppApi as Rr, useNavigate as zr } from "@kirocrew/app-sdk";
import { PageHeader as Fr, StatCard as Yt } from "@kirocrew/app-sdk/ui";
import { useState as N, useCallback as oe, useEffect as qe, useMemo as Te, useRef as De } from "react";
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
function sr(e, r, s) {
  if (!r || e != null && e.active && Number.isFinite(s) && Number.isFinite(e.seq) && s <= e.seq)
    return e;
  const l = ((e != null && e.active ? e.buffer : "") + r).slice(-Tr);
  return { buffer: l, tail: Gr(l, 3), active: !0, phase: "generating", seq: Number(s) || 0 };
}
function mr(e) {
  return e && { ...e, active: !1, phase: "idle" };
}
function Kr(e) {
  if (!e || typeof e != "object") return null;
  const r = Array.isArray(e.lines) ? e.lines : [];
  if (!r.length) return null;
  const s = r.map((d, m) => ({ l: d, _i: m })).sort((d, m) => {
    var v, h, _, x;
    const i = (Number((v = d.l) == null ? void 0 : v.seq) || 0) - (Number((h = m.l) == null ? void 0 : h.seq) || 0);
    if (i) return i;
    const c = String(((_ = d.l) == null ? void 0 : _.at) || "").localeCompare(String(((x = m.l) == null ? void 0 : x.at) || ""));
    return c || d._i - m._i;
  }).map((d) => d.l), a = s.map((d) => String((d == null ? void 0 : d.note) || "")).filter(Boolean).join(" · ").slice(-Tr);
  if (!a) return null;
  const l = s[s.length - 1] || {};
  return {
    buffer: a,
    tail: a,
    // whole trail suffix — it is already short, human sentences
    active: !0,
    phase: String(l.phase || "running"),
    seq: Number(l.seq) || s.length,
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
]), st = (e) => !!e && typeof e == "object" && !Array.isArray(e), X = (e) => st(e) ? e : {}, ke = (e) => Array.isArray(e) ? e : e == null ? [] : [e], U = (...e) => e.find((r) => r != null && r !== "");
function ht(e) {
  if (e == null || e === "") return "unobservable";
  if (typeof e == "boolean") return e ? "yes" : "no";
  if (typeof e == "string" || typeof e == "number") return String(e);
  if (Array.isArray(e)) return e.length ? e.map(ht).join(" · ") : "none";
  if (st(e)) {
    const r = Object.entries(e);
    return r.length ? r.map(([s, a]) => `${s}: ${ht(a)}`).join(" · ") : "none";
  }
  return String(e);
}
function dt(e) {
  return ke(e).map((r, s) => {
    if (!st(r))
      return { key: `item-${s}`, title: ht(r), detail: null, status: null, level: null, ref: null, url: null };
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
    ) || `item ${s + 1}`, l = U(
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
      key: String(U(r.id, r.key, r.path, r.ref, `item-${s}`)),
      title: String(a),
      detail: l == null || String(l) === String(a) ? null : ht(l),
      status: m == null ? null : String(m),
      level: d == null ? null : String(d),
      ref: i == null ? null : String(i),
      url: c
    };
  });
}
function Yr(e) {
  return ke(e).filter((r) => r != null).map((r, s) => {
    const a = X(r), l = st(r) ? U(a.url, a.path, a.ref, a.id) : String(r), d = st(r) ? U(a.label, a.name, a.kind, a.id, a.path, a.ref, `artifact ${s + 1}`) : String(r), m = U(a.url, typeof l == "string" && /^https?:\/\//.test(l) ? l : void 0), i = U(a.preview, a.summary, a.description, a.evidence, a.detail);
    return {
      key: String(U(a.id, a.path, a.ref, `artifact-${s}`)),
      label: String(d),
      ref: l == null ? null : String(l),
      url: typeof m == "string" && /^https?:\/\//.test(m) ? m : null,
      preview: i == null ? null : ht(i),
      kind: a.kind == null ? null : String(a.kind),
      status: a.status == null ? null : String(a.status)
    };
  });
}
function Zr(e) {
  return ke(e.children).map((s, a) => {
    const l = X(s), d = l.required !== !1 && !["optional", "preferred", "advisory"].includes(
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
  const s = X(e == null ? void 0 : e.execution_envelope);
  return s.step === r ? s : ke(e == null ? void 0 : e.execution_envelope_history).map(X).reverse().find((a) => a.step === r) || {};
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
  const s = ke(e.validation_and_evidence).map(X);
  return ke(r).map(String).filter((a) => !s.some((l) => {
    const d = String(U(l.kind, l.type, l.id, "")).toLowerCase(), m = String(U(l.status, "")).toLowerCase();
    return (d === a.toLowerCase() || ke(l.satisfies).map(String).includes(a)) && jr.has(m) && Er(l);
  }));
}
function Qr(e, r) {
  const s = ke(e.findings).map(X);
  if (!s.length) return !1;
  if (!r) return !0;
  const a = ke(U(e.sources, e.consulted_sources)).map(X).filter((d) => typeof d.url == "string" && /^https?:\/\//.test(d.url) && d.title && d.accessed_at && U(d.source_type, d.type)), l = new Set(a.flatMap((d) => [d.id && String(d.id), d.url]).filter(Boolean));
  return l.size > 0 && s.every((d) => {
    const m = ke(U(d.source_ids, d.sources)).map(String);
    return d.claim && m.some((i) => l.has(i));
  });
}
function en(e, r, s, a) {
  const l = X(e == null ? void 0 : e.intent_integrity), d = l.status === "violation" ? [`intent integrity (${ke(l.violations).join(", ")})`] : [], m = Jr(e, r), i = ke(X(m.observations).controls_runtime);
  if (Number(m.schema_version || 0) < 2 || !i.includes("result_scope"))
    return { missing: d, preferredShortfalls: [] };
  const c = [...d], v = [];
  s.envelope_id !== m.id && c.push("result bound to the active envelope revision");
  const h = ke(e == null ? void 0 : e.decisions).map(X).filter((k) => k.step && k.step !== r || k.envelope_id && k.envelope_id !== m.id ? !1 : k.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(k.kind)), _ = h.filter((k) => {
    const re = String(U(k.status, "")).toLowerCase();
    return k.chosen === void 0 && k.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(re);
  }), x = X(m.questions);
  _.length && c.push("all qualified questions resolved before completion"), _.length > 1 && x.cadence === "one-at-a-time" && c.push("one-at-a-time question cadence"), Number.isInteger(x.max_rounds) && h.length > x.max_rounds && c.push(`question rounds within max_rounds=${x.max_rounds}`);
  const b = X(m.result_scope), y = X(b.enforcement), w = new Map(ke(a.intent_and_requirement_coverage).map(X).filter((k) => U(k.intent_id, k.constraint_id, k.id)).map((k) => [String(U(k.intent_id, k.constraint_id, k.id)), k]));
  for (const k of [...ke(b.required_outcome_ids), ...ke(b.hard_constraint_ids)]) {
    const re = w.get(String(k)) || {}, R = String(U(re.status, "")).toLowerCase(), xe = ke(U(re.evidence_refs, re.requirement_refs, re.refs));
    (!jr.has(R) || !xe.some(Er)) && c.push(`required intent coverage ${k}`);
  }
  const z = ke(a.alternatives);
  if (Number.isInteger(b.alternatives) && z.length < b.alternatives) {
    const k = `${b.alternatives} material alternatives`;
    y.alternatives === "required" ? c.push(k) : y.alternatives === "preferred" && v.push(k);
  }
  const L = gr(a, b.evidence), E = gr(a, b.validation);
  y.evidence === "required" ? c.push(...L.map((k) => `required evidence ${k.toLowerCase()}`)) : y.evidence === "preferred" && v.push(...L.map((k) => `preferred evidence ${k.toLowerCase()}`)), y.validation === "required" ? c.push(...E.map((k) => `required validation ${k.toLowerCase()}`)) : y.validation === "preferred" && v.push(...E.map((k) => `preferred validation ${k.toLowerCase()}`));
  const F = X(m.research_policy), $ = X(e == null ? void 0 : e.research_artifacts)[r], P = ke(U(a.research_and_citations, $)).map(X), J = P.filter((k) => Qr(
    k,
    F.citations === "required"
  ));
  return F.mode === "required" && !J.length && c.push("required research with claim-level citations"), Number.isInteger(F.max_passes) && P.length > F.max_passes && c.push(`research passes within max_passes=${F.max_passes}`), F.mode === "on-demand" && P.length && !J.length && v.push("complete citations for used research"), {
    missing: [...new Set(c)],
    preferredShortfalls: [...new Set(v)]
  };
}
function tn(e, r, s) {
  const a = X(e.runtime_handshakes), l = X(e.runtime_handshake), d = X(a[r] || (l.step == null || l.step === r ? l : {})), m = X(d.assignment), i = X(d.capabilities), c = X(i.tools), v = X(i.skills), h = X(d.routing), _ = X(h.model), x = X(h.reasoning_effort), b = X(d.scope), y = X(b.worktree), w = X(s.routing_and_provenance), z = X(w.model), L = X(w.reasoning_effort), E = X(w.assignment), F = U(c.profile_declared, c.declared, w.declared_tools), $ = U(c.actual, w.actual_tools), P = U(v.profile_declared, v.declared, w.declared_skills), J = U(v.actual, w.actual_skills);
  return {
    assignedProfile: U(
      E.assigned_profile,
      w.assigned_profile,
      m.assigned_profile
    ) ?? null,
    effectiveProfile: U(
      E.effective_profile,
      w.effective_profile,
      m.effective_profile
    ) ?? null,
    model: {
      requested: U(z.requested, w.requested_model, _.requested) ?? null,
      applied: U(z.applied, w.applied_model, _.applied) ?? null,
      provider: U(z.provider, w.resolved_provider, _.provider) ?? null,
      version: U(z.version, w.model_version, _.version) ?? null,
      status: U(
        z.status,
        w.model_resolution_status,
        _.status,
        U(z.applied, w.applied_model, _.applied) != null ? "observed" : "unobservable"
      )
    },
    effort: {
      requested: U(L.requested, w.requested_effort, x.requested) ?? null,
      applied: U(L.applied, w.applied_effort, x.applied) ?? null,
      status: U(
        L.status,
        w.effort_resolution_status,
        x.status,
        U(L.applied, w.applied_effort, x.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: F == null ? null : ke(F),
      actual: $ == null ? null : ke($),
      status: U(c.status, w.tools_status, $ != null ? "observed" : "unobservable")
    },
    skills: {
      declared: P == null ? null : ke(P),
      actual: J == null ? null : ke(J),
      status: U(v.status, w.skills_status, J != null ? "observed" : "unobservable")
    },
    network: X(b.network),
    write: X(b.write),
    worktree: Object.keys(y).length ? y : null
  };
}
function rn(e, r) {
  const s = X(e == null ? void 0 : e.gate_review), a = X(s.bundle), l = U(s.gate, e == null ? void 0 : e.stage), d = U(s.producer_step, r), m = X(e == null ? void 0 : e.step_sessions), i = Number.isInteger(s.result_revision) ? s.result_revision : null, c = U(s.status, "unobservable"), v = d ? X(e == null ? void 0 : e.step_status)[d] : void 0, h = Yr(a.artifacts), _ = X(a.card_topology), x = Zr(_), b = U(_.action, "unobservable"), y = ["fan-in", "unify"].includes(String(b).toLowerCase()), w = y ? x.filter((J) => J.required && !J.complete) : [], z = [];
  (!(e != null && e.gate_review) || !st(e.gate_review)) && z.push("result bundle record"), (!s.bundle || !st(s.bundle)) && z.push("declared result bundle"), d || z.push("producer binding"), i === null && z.push("result revision"), l && (e != null && e.stage) && l !== e.stage && z.push("gate binding matches current stage"), c !== "awaiting-review" && z.push(`review status awaiting-review (currently ${c})`), Vr.has(String(v || "").toLowerCase()) || z.push(`terminal producer status (currently ${v || "unobservable"})`), U(a.summary) || z.push("result summary"), h.length === 0 && z.push("referenced artifact");
  const L = h.filter((J) => !J.ref);
  L.length > 0 && z.push(`artifact reference (${L.length} missing)`), y && x.length === 0 && z.push("declared fan-in child set"), w.length > 0 && z.push(`required child fan-in (${w.length} incomplete)`);
  const E = en(e, d, s, a);
  z.push(...E.missing);
  const F = ke(e == null ? void 0 : e.decisions).filter((J) => {
    const k = X(J);
    return !k.chosen && (!d || !k.step || k.step === d);
  }), $ = dt([
    ...ke(a.decisions_and_questions),
    ...F
  ]), P = tn(e || {}, d, a);
  return {
    gate: l || null,
    producerStep: d || null,
    producerSessionRef: U(
      s.producer_session_ref,
      d && st(m[d]) ? `step_sessions.${d}` : void 0
    ) || null,
    envelopeId: U(s.envelope_id) || null,
    revision: i,
    reviewStatus: c,
    createdAt: U(s.created_at) || null,
    ready: z.length === 0,
    missing: z,
    summary: U(a.summary) || null,
    changes: dt(a.changes_since_prior),
    artifacts: h,
    coverage: dt(a.intent_and_requirement_coverage),
    alternatives: dt(a.alternatives),
    research: dt(U(
      a.research_and_citations,
      d && X(e == null ? void 0 : e.research_artifacts)[d]
    )),
    preferredShortfalls: E.preferredShortfalls,
    decisions: $,
    topology: {
      action: b,
      integrationOwner: U(_.integration_owner, _.owner) || null,
      integrationStatus: U(_.integration_status, _.status) || null,
      children: x,
      incompleteRequiredChildren: w
    },
    budget: {
      allocated: X(a.budget).allocated ?? null,
      consumed: X(a.budget).consumed ?? null,
      remaining: X(a.budget).remaining ?? null
    },
    routing: P,
    validation: dt(a.validation_and_evidence),
    risks: dt(a.known_risks),
    deviations: dt(a.omissions_and_deviations)
  };
}
const nn = "~/.dlc-yolo/.statepath", gt = "~/.dlc-yolo/state.json", hr = "/tmp/dlc-yolo/state.json", nr = "/apps/dlc-yolo/api/state", an = 1, vr = 4096, on = 3072;
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
  let s;
  try {
    s = JSON.stringify(r);
  } catch {
    return null;
  }
  if (new TextEncoder().encode(s).length > vr) return null;
  const a = Object.keys(r).sort();
  if (a.length !== 2 || a[0] !== "path" || a[1] !== "schema_version" || r.schema_version !== an || typeof r.path != "string") return null;
  const l = r.path;
  return !l.startsWith("/") || l.length === 0 || l.length > on || l.includes("\0") || l.includes("\r") || l.includes(`
`) || l.split("/").some((d) => d === "." || d === "..") ? null : l;
}
async function er(e, r) {
  const s = [];
  if (typeof r == "function")
    try {
      const a = await r(nr), l = typeof a == "string" ? JSON.parse(a) : a;
      if (l && typeof l == "object" && !Array.isArray(l) && (Array.isArray(l.cards) || Array.isArray(l.pipelines)))
        return { path: nr, data: l, source: "endpoint" };
      s.push("endpoint read returned non-card body — falling through");
    } catch (a) {
      s.push(`endpoint read FAILED (pre-restart?): ${a && a.message ? a.message : a}`);
    }
  try {
    const a = await e(nn), l = sn(a);
    if (s.push(`pointer-read OK, target=${l || "INVALID"}`), l)
      try {
        return { path: l, data: await e(l), source: "pointer" };
      } catch (d) {
        s.push(`pointer-target read FAILED: ${d && d.message ? d.message : d}`);
      }
  } catch (a) {
    s.push(`pointer read FAILED: ${a && a.message ? a.message : a}`);
  }
  try {
    return { path: gt, data: await e(gt), source: "durable" };
  } catch (a) {
    s.push(`durable read FAILED: ${a && a.message ? a.message : a}`);
  }
  try {
    return { path: hr, data: await e(hr), source: "scratch" };
  } catch (a) {
    return s.push(`scratch read FAILED: ${a && a.message ? a.message : a}`), console.warn("[dlc-yolo] all state tiers failed:", s.join(" | ")), { path: gt, data: { cards: [], pipelines: [], config: {} }, source: "unresolved" };
  }
}
async function fr(e, r, s) {
  if (typeof s == "function")
    try {
      const a = await s(nr), l = typeof a == "string" ? JSON.parse(a) : a;
      if (l && typeof l == "object" && !Array.isArray(l) && (Array.isArray(l.cards) || Array.isArray(l.pipelines)))
        return { path: nr, data: l, source: "endpoint" };
    } catch {
    }
  try {
    return { path: r, data: await e(r), source: "current" };
  } catch {
    return er(e, s);
  }
}
const ln = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
function cn(e) {
  const r = /* @__PURE__ */ new Map();
  for (const s of String(e || "").split(/[\n,]/)) {
    const a = s.trim();
    ln.test(a) && !r.has(a.toLowerCase()) && r.set(a.toLowerCase(), a);
  }
  return [...r.values()].sort((s, a) => s.toLowerCase().localeCompare(a.toLowerCase()));
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
  var V, fe;
  const e = Rr(), [r, s] = N(null), [a, l] = N(!1), [d, m] = N("8765"), [i, c] = N(""), [v, h] = N(""), [_, x] = N(""), [b, y] = N(!1), [w, z] = N(!1), [L, E] = N(!0), [F, $] = N(!1), [P, J] = N(""), k = oe((T) => {
    s(T), l(!!T.enabled), m(String(T.port || 8765)), c((T.repositories || []).join(`
`)), h(T.inbox_path || ""), z(!!T.autosync), x(""), y(!1);
  }, []), re = oe(async () => {
    E(!0), J("");
    try {
      k(await e.get("/apps/dlc-yolo/api/webhook/config"));
    } catch (T) {
      J(Dt(T));
    } finally {
      E(!1);
    }
  }, [e, k]);
  qe(() => {
    re();
  }, [re]);
  const [R, xe] = N(null), [pe, me] = N(!1), we = oe(async () => {
    try {
      xe(await e.get("/apps/dlc-yolo/api/tunnel/status"));
    } catch {
      xe(null);
    }
  }, [e]);
  qe(() => {
    we();
  }, [we]);
  const je = oe(async () => {
    me(!0);
    try {
      xe(await e.post("/apps/dlc-yolo/api/tunnel/start", {}));
    } catch (T) {
      J(Dt(T));
    } finally {
      me(!1);
    }
  }, [e]), ee = oe(async () => {
    me(!0);
    try {
      xe(await e.post("/apps/dlc-yolo/api/tunnel/stop", {}));
    } catch (T) {
      J(Dt(T));
    } finally {
      me(!1);
    }
  }, [e]), [W, ne] = N(null), [Ee, Le] = N(!1), Se = oe(async () => {
    try {
      ne(await e.get("/apps/dlc-yolo/api/crons/status"));
    } catch {
      ne(null);
    }
  }, [e]);
  qe(() => {
    Se();
  }, [Se]);
  const S = oe(async (T) => {
    Le(!0);
    try {
      const de = T ? "/apps/dlc-yolo/api/crons/pause" : "/apps/dlc-yolo/api/crons/resume";
      ne(await e.post(de, {}));
    } catch (de) {
      J(Dt(de));
    } finally {
      Le(!1);
    }
  }, [e]), K = Te(() => cn(i), [i]), ae = Number(d), _e = typeof TextEncoder > "u" ? _.length : new TextEncoder().encode(_).length, Fe = !!(r != null && r.secret_configured) || _e >= 32, le = Number.isInteger(ae) && ae >= 1024 && ae <= 65535 && (!a || K.length > 0 && Fe) && (!v.trim() || v.trim().startsWith("/")), te = async () => {
    if (!(!(r != null && r.editable) || !le)) {
      $(!0), J("");
      try {
        const T = {
          enabled: a,
          port: ae,
          repositories: K,
          inbox_path: v.trim() || null,
          clear_secret: b,
          autosync: w
        };
        _ && (T.secret = _), k(await e.post("/apps/dlc-yolo/api/webhook/config", T));
      } catch (T) {
        J(Dt(T));
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
          L ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: "Loading receiver configuration…" }) : r && /* @__PURE__ */ n(Ve, { children: [
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
                  onClick: () => l((T) => !T),
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
                    onChange: (T) => m(T.target.value),
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
                  onChange: (T) => c(T.target.value),
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
                  value: v,
                  disabled: !r.editable,
                  onChange: (T) => h(T.target.value),
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
                  value: _,
                  disabled: !r.editable,
                  onChange: (T) => x(T.target.value),
                  placeholder: r.secret_configured ? "•••••••••••••••• (unchanged)" : "Enter a new secret",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            !a && r.secret_configured && r.editable && /* @__PURE__ */ n("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer", style: { color: "var(--muted)" }, children: [
              /* @__PURE__ */ t("input", { type: "checkbox", checked: b, onChange: (T) => y(T.target.checked) }),
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
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: ((fe = r.inbox) == null ? void 0 : fe.processed) ?? "—" })
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
                        style: { color: R != null && R.running ? "var(--ok)" : "var(--muted)", border: "1px solid var(--border)" },
                        children: R ? R.running ? "running" : R.installed ? "stopped" : "not installed" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ t("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "The receiver is loopback-only, so GitHub needs a public relay. Start a Cloudflare quick tunnel here, or run the shown command yourself. cloudflared is never installed automatically." }),
                  R && !R.installed && /* @__PURE__ */ n("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "cloudflared is not installed. Install it, then Refresh status.",
                    R.install_hint && /* @__PURE__ */ t("pre", { className: "mt-1 whitespace-pre-wrap font-mono text-[10px]", style: { color: "var(--text)" }, children: R.install_hint })
                  ] }),
                  (R == null ? void 0 : R.running) && R.payload_url && /* @__PURE__ */ n("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "GitHub payload URL",
                    /* @__PURE__ */ t(
                      "input",
                      {
                        readOnly: !0,
                        value: R.payload_url,
                        onFocus: (T) => T.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ok)" }
                      }
                    )
                  ] }),
                  (R == null ? void 0 : R.command) && /* @__PURE__ */ n("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "Command ",
                    R.running ? "running" : "to run yourself",
                    /* @__PURE__ */ t(
                      "input",
                      {
                        readOnly: !0,
                        value: R.command,
                        onFocus: (T) => T.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }
                      }
                    )
                  ] }),
                  (R == null ? void 0 : R.last_error) && /* @__PURE__ */ n("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Tunnel: ",
                    R.last_error
                  ] }),
                  R && R.installed && !R.running && R.receiver_ready === !1 && /* @__PURE__ */ n("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "Won't expose the port until the receiver is ready: ",
                    dn[R.receiver_block_reason || ""] || R.receiver_block_reason
                  ] }),
                  /* @__PURE__ */ n("div", { className: "flex gap-2", children: [
                    R != null && R.running ? /* @__PURE__ */ t(
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
                        disabled: pe || !(R != null && R.installed) || (R == null ? void 0 : R.receiver_ready) === !1,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: pe ? "Starting…" : "Start tunnel"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void we(),
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
                        checked: w,
                        disabled: !(r != null && r.editable),
                        onChange: (T) => z(T.target.checked),
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
                  (R == null ? void 0 : R.autosync) && R.autosync.enabled && /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: R.autosync.error ? "var(--danger, #ef4444)" : "var(--ok)" }, children: R.autosync.error ? `Auto-sync failed: ${R.autosync.error}` : `Auto-synced ${(R.autosync.results || []).filter((T) => T.action === "updated").length} hook(s) → ${R.autosync.payload_url}` })
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
                    W && W.available && /* @__PURE__ */ t(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: W.all_paused ? "var(--warn)" : "var(--ok)", border: "1px solid var(--border)" },
                        children: W.all_paused ? "paused" : W.any_active ? "running" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ t("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "DLC-YOLO's three background jobs (advance · spawns · backlog-intake). Pause them for a webhook-only or maintenance setup; the webhook receiver keeps working while paused (a verified delivery still wakes advance when resumed). Polling stops while paused." }),
                  W && !W.available && /* @__PURE__ */ n("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Cron control unavailable",
                    W.error ? `: ${W.error}` : "",
                    "."
                  ] }),
                  W && W.available && W.jobs.length > 0 && /* @__PURE__ */ t("div", { className: "flex flex-col gap-1", children: W.jobs.map((T) => /* @__PURE__ */ n(
                    "div",
                    {
                      className: "flex items-center justify-between text-[11px] font-mono",
                      style: { color: "var(--muted)" },
                      children: [
                        /* @__PURE__ */ t("span", { children: T.basename }),
                        /* @__PURE__ */ t("span", { style: { color: T.paused ? "var(--warn)" : "var(--ok)" }, children: T.paused ? "paused" : "active" })
                      ]
                    },
                    T.id
                  )) }),
                  /* @__PURE__ */ n("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void S(!0),
                        disabled: Ee || !(W != null && W.available) || (W == null ? void 0 : W.all_paused),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--warn)", color: "var(--bg)" },
                        children: Ee ? "…" : "Pause all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void S(!1),
                        disabled: Ee || !(W != null && W.available) || (W == null ? void 0 : W.any_active),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: Ee ? "…" : "Resume all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Se(),
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
          /* @__PURE__ */ t("button", { onClick: () => void re(), disabled: L || F, className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50", style: { color: "var(--muted)" }, children: "Refresh status" }),
          (r == null ? void 0 : r.editable) && /* @__PURE__ */ t(
            "button",
            {
              onClick: () => void te(),
              disabled: !le || F,
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
function pn({ repos: e, selectedRepos: r, onNewPipeline: s, onConfigure: a, onOpenAgents: l }) {
  const { openChat: d } = Ar(), m = r.length === 1 ? r[0] : e.length === 1 ? e[0] : "", i = "/dlc-yolo", c = "text-[10px] leading-none px-1.5 py-1 rounded font-semibold";
  return /* @__PURE__ */ t(Ve, { children: /* @__PURE__ */ n("div", { "data-dlc-command-controls": !0, className: "mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap", children: [
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
        onClick: () => m ? a(m) : s(),
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
function un({ budget: e, depth: r, onSave: s }) {
  const [a, l] = N(!1), [d, m] = N(Bt(e)), [i, c] = N(
    Bt(e) === "custom" ? { ...e } : { ...Zt[r] || Zt.standard }
  ), v = () => {
    const x = Bt(e);
    m(x), c(x === "custom" ? { ...e } : { ...Zt[r] || Zt.standard }), l(!0);
  }, h = () => {
    s(d === "depth" ? void 0 : d === "unlimited" ? {
      max_child_cards: "unlimited",
      effort_ceiling: "unlimited",
      max_feature_size: "XL",
      addenda: "proactive"
    } : { ...i }), l(!1);
  }, _ = Bt(e) === "depth" ? "budget: depth" : Bt(e) === "unlimited" ? "budget: unlimited" : "budget: custom";
  return /* @__PURE__ */ n("div", { className: "relative", children: [
    /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        onClick: v,
        title: "Edit this card's explicit budget override",
        className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
        style: { color: e ? "var(--accent)" : "var(--muted)", border: `1px solid ${e ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)"}`, background: e ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" },
        children: _
      }
    ),
    a && /* @__PURE__ */ n(
      "div",
      {
        className: "absolute z-40 mt-1 left-0 w-72 rounded-lg p-3 flex flex-col gap-2",
        style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 12px 36px rgba(0,0,0,.35)" },
        children: [
          /* @__PURE__ */ t("div", { className: "text-[11px] font-semibold", style: { color: "var(--text)" }, children: "Card budget override" }),
          /* @__PURE__ */ t("div", { className: "grid grid-cols-3 gap-1", children: ["depth", "custom", "unlimited"].map((x) => /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              onClick: () => m(x),
              className: "text-[10px] px-2 py-1 rounded font-semibold",
              style: { color: d === x ? "var(--bg)" : "var(--muted)", background: d === x ? "var(--accent)" : "var(--bg-hover, var(--border))" },
              children: x === "depth" ? "follow depth" : x
            },
            x
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
                  onChange: (x) => c((b) => ({ ...b, max_child_cards: Math.max(0, Number(x.target.value) || 0) })),
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
                  onChange: (x) => c((b) => ({ ...b, effort_ceiling: Math.max(0, Number(x.target.value) || 0) })),
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
                  onChange: (x) => c((b) => ({ ...b, max_feature_size: x.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["S", "M", "L", "XL"].map((x) => /* @__PURE__ */ t("option", { children: x }, x))
                }
              )
            ] }),
            /* @__PURE__ */ n("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Addenda",
              /* @__PURE__ */ t(
                "select",
                {
                  value: i.addenda,
                  onChange: (x) => c((b) => ({ ...b, addenda: x.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["none", "obvious", "proactive"].map((x) => /* @__PURE__ */ t("option", { children: x }, x))
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
  const s = r.nodes;
  if (!s || typeof s != "object") return null;
  const a = r.current_node_id;
  return typeof a == "string" && s[a] && typeof s[a] == "object" ? s[a] : Object.values(s).find((l) => l && typeof l == "object" && l.step === e.stage) || null;
}
function kr(e, r) {
  const s = e == null ? void 0 : e[r], a = s && typeof s == "object" ? s[e.stage] : null;
  return typeof a == "string" && a.trim() ? a.trim() : null;
}
function hn(e, r) {
  const s = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", a = Array.isArray(e == null ? void 0 : e.decisions) ? e.decisions.filter((d) => d && !d.chosen && !d.resolved_at && (d.step === s || !d.step) && Array.isArray(d.options) && d.options.length) : [], l = (r || "").toLowerCase();
  return a.length ? { severity: "decision", label: "Choose an option", color: "var(--accent)" } : /capability|missing|not in inventory|no crew|external|unavailable|cannot proceed without a tool/.test(l) ? { severity: "hard", label: "Blocked · needs setup", color: "var(--danger)" } : /approv|confirm|sign.?off|awaiting.*human|needs.?you/.test(l) ? { severity: "approval", label: "Needs approval", color: "var(--warn)" } : { severity: "attention", label: "Needs input", color: "var(--warn)" };
}
function wr(e, { isGate: r = !1, liveObserved: s = !1 } = {}) {
  const a = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", l = typeof (e == null ? void 0 : e.lifecycle) == "string" ? e.lifecycle.toLowerCase() : "", d = e != null && e.step_status && typeof e.step_status == "object" ? String(e.step_status[a] || "") : "", m = gn(e), i = typeof (m == null ? void 0 : m.status) == "string" ? m.status : "", c = e != null && e.step_sessions && typeof e.step_sessions == "object" ? e.step_sessions[a] : null, v = yr.has(l) || i === "cancelling" || (c == null ? void 0 : c.writes_allowed) === !1 || !!(c != null && c.cancel_requested_at), h = a === "done" || mn.has(l) || ["completed", "cancelled", "superseded"].includes(i);
  let _, x = null, b = null, y = null, w = null;
  if (h)
    _ = "terminal", x = i === "cancelled" || yr.has(l) ? `terminal ${l || i}` : l || i || a || null;
  else if (v)
    _ = "cancelling", x = "writes revoked; awaiting terminal observation";
  else if (d === "blocked" || i === "blocked") {
    _ = "blocked", x = kr(e, "block_reason") || ((m == null ? void 0 : m.wait_reasons) || [])[0] || "step blocked";
    const L = hn(e, x);
    b = L.severity, y = L.label, w = L.color;
  } else d === "error" || i === "failed" ? (_ = "error", x = kr(e, "error_reason") || (m == null ? void 0 : m.dispatch_error) || "step error") : r || i === "gate-wait" ? _ = "waiting-gate" : s ? _ = "running-observed" : d === "pending" || i === "running" ? (_ = "pending-unconfirmed", x = "no current live observation") : ["queued", "dependency-wait", "permit-wait"].includes(i) ? (_ = "queued", x = Array.isArray(m == null ? void 0 : m.wait_reasons) ? m.wait_reasons.join(" · ") : null) : i === "ready" ? _ = "ready" : _ = "idle";
  const z = Or[_];
  return {
    kind: _,
    reason: x,
    severity: b,
    label: y || z.label,
    color: w || z.color
  };
}
const St = { LOOP: "loop", STEP: "step-agent", ORCH: "orchestrator", HUMAN: "human" };
function bt(e) {
  return typeof e == "string" ? e : "";
}
function vn(e) {
  if (!e || typeof e != "object") return [];
  const r = [], s = (a) => {
    a && a.at && r.push(a);
  };
  for (const a of e.history || [])
    !a || typeof a != "object" || s({
      id: `hist:${a.at}:${a.to}`,
      at: bt(a.at),
      actor: St.LOOP,
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
    s({
      id: `summ:${a}:${l.at || l.status}`,
      at: bt(l.at) || bt(e.updated_at),
      actor: St.STEP,
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
    !a || typeof a != "object" || s({
      id: `gate:${a.at}:${a.gate}`,
      at: bt(a.at),
      actor: St.HUMAN,
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
    s({
      id: `dec:${a.id || a.at}`,
      at: bt(a.at),
      actor: St.ORCH,
      kind: l ? "resolved" : "decision",
      step: a.step,
      cls: "decision",
      needs_human: !l,
      headline: l ? `resolved: ${a.chosen || a.action || a.kind || "decision"}` : `decision needed: ${a.question || a.kind || "a fork"}`,
      detail: a.rationale || a.question || ""
    });
  }
  for (const a of e.backstep_history || [])
    !a || typeof a != "object" || s({
      id: `back:${a.at}`,
      at: bt(a.at),
      actor: St.ORCH,
      kind: "back-stepped",
      step: a.to,
      cls: "notification",
      needs_human: !1,
      headline: `stepped back ${a.from || "?"} → ${a.to || "?"}`,
      detail: a.reason || ""
    });
  for (const a of e.parked || [])
    !a || typeof a != "object" || s({
      id: `park:${a.id || a.at}`,
      at: bt(a.at),
      actor: St.ORCH,
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
  const s = [], a = /* @__PURE__ */ new Set(), l = (m) => {
    m && !a.has(m.id) && (a.add(m.id), s.push(m));
  };
  for (const m of ((d = e.topology) == null ? void 0 : d.children) || []) {
    const i = typeof m == "string" ? m : m == null ? void 0 : m.card_id, c = (r || []).find((v) => v.id === i);
    c && l({ id: c.id, title: c.title, stage: c.stage, lifecycle: c.lifecycle, required: (m == null ? void 0 : m.required) !== !1 });
  }
  for (const m of r || []) {
    const i = Ir(m.title);
    i && i.parentId === e.id && l({ id: m.id, title: m.title, stage: m.stage, lifecycle: m.lifecycle, required: !0 });
  }
  return s;
}
function xn(e) {
  var s;
  const r = Ir(e == null ? void 0 : e.title);
  return r ? r.parentId : ((s = e == null ? void 0 : e.topology) == null ? void 0 : s.integration_owner) || (e == null ? void 0 : e.parent_card) || null;
}
const Nr = ["webhook", "loop", "orchestrator", "crew", "step-agent", "human"], qr = {
  webhook: "⬇",
  loop: "⚙",
  orchestrator: "🧠",
  crew: "👥",
  "step-agent": "🤖",
  human: "🧑"
};
function ze(e) {
  return typeof e == "string" ? e : "";
}
function yn(e) {
  return String(e || "").slice(0, 8);
}
function kn(e, r) {
  var m;
  const s = e.id, a = ((m = e.execution_schedule) == null ? void 0 : m.nodes) || {};
  for (const [i, c] of Object.entries(a)) {
    if (!c || typeof c != "object") continue;
    const v = ze(c.terminal_at) || ze(c.session_at) || ze(c.ready_at) || ze(c.created_at);
    r({
      id: `sched:${i}`,
      at: v,
      actor: "step-agent",
      kind: `step-${c.status || "node"}`,
      cardId: s,
      step: c.step,
      node_id: i,
      headline: `${c.step || c.kind || "step"} · ${c.status || "node"}`,
      detail: c.concurrency_class ? `class ${c.concurrency_class}` : ""
    });
  }
  for (const i of e.event_outbox || [])
    !i || typeof i != "object" || r({
      id: i.id || `outbox:${s}:${i.subject}:${i.time}`,
      at: ze(i.time),
      actor: "step-agent",
      kind: (i.type || "").split(".").pop() || "event",
      cardId: s,
      step: i.subject,
      run_id: i.run_id,
      envelope_id: i.envelope_id,
      caused_by: i.correlation_id && i.correlation_id !== s ? i.correlation_id : void 0,
      headline: `${i.subject || "step"} → ${i.terminal_status || i.type || "event"}`,
      detail: i.observed_status ? `observed: ${i.observed_status}` : i.run_id ? `run ${yn(i.run_id)}` : ""
    });
  for (const i of e.history || []) {
    if (!i || typeof i != "object") continue;
    const c = i.agent || "", v = /cron|advance/i.test(c) ? "loop" : /human|user/i.test(c) ? "human" : "loop";
    r({
      id: `hist:${s}:${i.at}:${i.to}`,
      at: ze(i.at),
      actor: v,
      kind: "promoted",
      cardId: s,
      step: i.to,
      inferred: v === "loop" && /cron|advance/i.test(c) ? !1 : void 0,
      headline: `advanced ${i.from || "?"} → ${i.to || "?"}`,
      detail: c ? `by ${c}` : ""
    });
  }
  for (const i of e.decisions || []) {
    if (!i || typeof i != "object") continue;
    const c = i.status === "resolved" || !!i.chosen || !!i.resolved_at;
    r({
      id: `dec:${i.id || s + i.step}`,
      at: ze(i.at) || ze(i.resolved_at),
      actor: "orchestrator",
      kind: c ? "decision-resolved" : "decision-open",
      cardId: s,
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
      id: `gate:${s}:${i.at}:${i.gate}`,
      at: ze(i.at),
      actor: c ? "human" : "orchestrator",
      kind: i.decision === "rejected" ? "gate-rejected" : "gate-approved",
      cardId: s,
      step: i.gate,
      headline: `${c ? "human" : i.actor || "system"} ${i.decision || "acted"} ${i.gate}`,
      detail: i.notes || (i.result_revision != null ? `rev ${i.result_revision}` : "")
    });
  }
  const l = e.orchestrator_session;
  l && l.at && r({
    id: `orch:${s}:${l.session_key || l.at}`,
    at: ze(l.at),
    actor: "orchestrator",
    kind: "orchestrator-session",
    cardId: s,
    session_key: l.session_key,
    headline: "orchestrator session",
    detail: l.name || l.slot_key || ""
  });
  const d = e.orchestrator_trigger;
  d && d.at && (!l || d.at !== l.at) && r({
    id: `orchtrig:${s}:${d.at}`,
    at: ze(d.at),
    actor: "orchestrator",
    kind: "orchestrator-trigger",
    cardId: s,
    session_key: d.session_key,
    headline: `orchestrator trigger · ${d.status || ""}`,
    detail: ""
  });
  for (const [i, c] of Object.entries(e.step_sessions || {}))
    !c || typeof c != "object" || !c.at || r({
      id: `sess:${s}:${i}:${c.at}`,
      at: ze(c.at),
      actor: "crew",
      kind: "session",
      cardId: s,
      step: i,
      session_key: c.slot_key || c.session_key,
      headline: `crew session · ${i}`,
      detail: c.executor || c.working_dir || "",
      inferred: !0
    });
}
function wn(e, r) {
  for (const s of (e == null ? void 0 : e.github_webhook_history) || [])
    !s || typeof s != "object" || r({
      id: `wh:${s.delivery_id}`,
      at: ze(s.at) || ze(s.received_at) || ze(s.time),
      actor: "webhook",
      kind: `webhook-${s.status || "received"}`,
      cardId: s.card_id,
      caused_by: void 0,
      headline: `${s.event}.${s.action} #${s.issue_number ?? "?"}`,
      detail: `${s.repository || ""}${s.status ? ` · ${s.status}` : ""}${s.reason ? ` (${s.reason})` : ""}`
    });
}
function Nn(e, r, s) {
  const a = e == null ? void 0 : e.id, l = (r || []).filter((v) => {
    var h;
    return v && (v.pipeline_id === a || !v.pipeline_id && ((h = v.source) == null ? void 0 : h.repo) === (e == null ? void 0 : e.repo));
  }), d = [], m = (v) => {
    v && v.at && d.push({ glyph: qr[v.actor] || "•", ...v });
  };
  for (const v of l) kn(v, m);
  wn(s, m);
  const i = Object.fromEntries(Nr.map((v, h) => [v, h]));
  d.sort((v, h) => (v.at < h.at ? -1 : v.at > h.at ? 1 : 0) || (i[v.actor] ?? 9) - (i[h.actor] ?? 9) || (v.id < h.id ? -1 : v.id > h.id ? 1 : 0));
  const c = Nr.filter((v) => d.some((h) => h.actor === v));
  return { events: d, actors: c, now: (s == null ? void 0 : s.scheduler_state) || null };
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
  var r, s;
  return `ui-${(((s = (r = globalThis.crypto) == null ? void 0 : r.randomUUID) == null ? void 0 : s.call(r)) || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16)}`;
}
function Sn(e, r) {
  if (!_n.includes(e)) return { ok: !1, error: `unknown request kind: ${e}` };
  const s = cr[e], a = String(r || "").trim();
  return s.reasonRequired && !a ? { ok: !1, error: "a reason is required for this request" } : a.length > ir ? { ok: !1, error: `reason exceeds ${ir} chars` } : { ok: !0 };
}
function $n({ id: e, kind: r, text: s, card: a, now: l, boundary: d }) {
  const m = Sn(r, s);
  if (!m.ok) throw new Error(m.error);
  const i = a == null ? void 0 : a.stage, c = a != null && a.step_status && typeof a.step_status == "object" ? a.step_status[i] ?? null : null, v = {
    id: e,
    at: l,
    step: i,
    kind: r,
    text: String(s || "").trim().slice(0, ir),
    by: "user",
    status: "pending",
    expected: { stage: i ?? null, step_status: c }
  };
  return r === "request:back-step" && d && (v.boundary = d), v;
}
function An(e, r) {
  const s = Array.isArray(e) ? e : [];
  return s.some((a) => a && a.id === r.id) ? s : [...s, r];
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
  const s = Object.fromEntries(Mr.map((d) => [d, 0])), a = r && typeof r == "object" ? r : {};
  s.ready = (a.ready_node_ids || []).length, s.running = (a.running_node_ids || []).length, s.blocked = (a.blocked_node_ids || []).length, s.queued = (a.selected_node_ids || []).length;
  const l = [];
  for (const d of e || []) {
    if (!d || typeof d != "object") continue;
    const m = d.stage, i = d.step_status && typeof d.step_status == "object" ? d.step_status[m] : null;
    d.writes_allowed === !1 || d.cancel_requested_at ? s.cancelling += 1 : i === "error" ? s.error += 1 : i === "blocked" ? s.blocked += 1 : i === "pending" ? s.pending += 1 : (i === "done" || d.lifecycle === "retired" || d.lifecycle === "merged") && (s.terminal += 1);
    const c = d.block_reason && typeof d.block_reason == "object" ? d.block_reason[m] : null;
    c && l.push({ card: d.id, reason: String(c) });
  }
  return { counts: s, waitReasons: l.slice(0, 50) };
}
function Jt(e) {
  if (!e || typeof e != "object")
    return { available: !1, label: "unavailable", authority_active: !1, verified: !1 };
  const r = !!e.authority_active, s = String(e.parity_status || ""), a = s === "verified" || e.verified === !0;
  return {
    available: !0,
    authority_active: r,
    verified: a,
    parity_status: s || (a ? "verified" : "unknown"),
    digest_match: e.digest_match === void 0 ? null : !!e.digest_match,
    failure_code: e.failure_code || e.error || null,
    // never surface paths/prose from the minimized model
    label: r ? a ? "verified" : "blocked" : "authority inactive"
  };
}
const _r = /^[A-Za-z0-9._-]{1,128}$/;
function zt({ values: e, empty: r = "none declared" }) {
  return e.length ? /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1", children: e.map((s) => /* @__PURE__ */ t(
    "code",
    {
      className: "text-[10px] px-1.5 py-0.5 rounded",
      style: { color: "var(--text)", background: "var(--bg-hover, var(--border))", border: "1px solid var(--border)" },
      children: s
    },
    s
  )) }) : /* @__PURE__ */ t("span", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: r });
}
function pt({ label: e, value: r }) {
  return /* @__PURE__ */ n("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]", children: [
    /* @__PURE__ */ t("span", { className: "uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ t("span", { className: "break-words", style: { color: r ? "var(--text)" : "var(--muted)" }, children: r || "not set" })
  ] });
}
function Tn({ profiles: e, initial: r, onSave: s, onClose: a }) {
  var F;
  const l = r ? "update" : "create", [d, m] = N((r == null ? void 0 : r.name) || ""), [i, c] = N((r == null ? void 0 : r.kiroAgent) || ((F = e.find(($) => $.status === "loaded")) == null ? void 0 : F.name) || ""), [v, h] = N((r == null ? void 0 : r.workspace) || ""), [_, x] = N((r == null ? void 0 : r.memoryStore) || ""), [b, y] = N(!1), [w, z] = N(""), L = _r.test(d.trim()) && _r.test(i.trim()) && new TextEncoder().encode(v.trim()).length <= 256 && new TextEncoder().encode(_.trim()).length <= 256, E = async () => {
    if (!(!L || b)) {
      y(!0), z("");
      try {
        await s({
          mode: l,
          name: d.trim(),
          kiroAgent: i.trim(),
          workspace: v.trim() || void 0,
          memoryStore: _.trim() || void 0
        });
      } catch ($) {
        z(($ == null ? void 0 : $.message) || String($)), y(!1);
      }
    }
  };
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[80] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 68%, transparent)", backdropFilter: "blur(3px)" },
      onMouseDown: ($) => {
        $.currentTarget === $.target && !b && a();
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
                  disabled: b,
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
                    value: v,
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
                    value: _,
                    onChange: ($) => x($.target.value),
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
              w && /* @__PURE__ */ t("div", { className: "text-[11px] rounded-md px-3 py-2", style: { color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))" }, children: w })
            ] }),
            /* @__PURE__ */ n("footer", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              /* @__PURE__ */ t("button", { onClick: a, disabled: b, className: "text-[11px] px-3 py-1.5 rounded-md disabled:opacity-40", style: { color: "var(--muted)" }, children: "Cancel" }),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => void E(),
                  disabled: !L || b,
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
function dr({ profiles: e, crews: r, loading: s = !1, context: a, onRefresh: l, onClose: d, onSelectProfile: m, onSelectCrew: i, onSaveCrew: c }) {
  var P, J;
  const [v, h] = N("agents"), [_, x] = N(((P = e[0]) == null ? void 0 : P.name) || ""), [b, y] = N(((J = r[0]) == null ? void 0 : J.name) || ""), [w, z] = N(null);
  qe(() => {
    var k;
    e.some((re) => re.name === _) || x(((k = e[0]) == null ? void 0 : k.name) || "");
  }, [e, _]), qe(() => {
    var k;
    r.some((re) => re.name === b) || y(((k = r[0]) == null ? void 0 : k.name) || "");
  }, [r, b]);
  const L = e.find((k) => k.name === _), E = r.find((k) => k.name === b), F = Te(
    () => E != null && E.kiroAgent ? e.find((k) => k.name === E.kiroAgent) : void 0,
    [E, e]
  ), $ = L != null && L.prompt ? L.prompt.length > 1200 ? `${L.prompt.slice(0, 1200)}…` : L.prompt : "";
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
                    disabled: s,
                    className: "text-[11px] px-2.5 py-1.5 rounded-md disabled:opacity-50",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: s ? "Refreshing…" : "Refresh"
                  }
                ),
                c && /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: () => {
                      h("crews"), z({ mode: "create" });
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
                  style: { color: v === k ? "var(--accent)" : "var(--muted)", borderBottom: `2px solid ${v === k ? "var(--accent)" : "transparent"}`, marginBottom: -1 },
                  children: re
                },
                k
              )) }),
              /* @__PURE__ */ t("div", { className: "flex min-h-0 flex-1", children: v === "agents" ? /* @__PURE__ */ n(Ve, { children: [
                /* @__PURE__ */ n("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  e.map((k) => /* @__PURE__ */ n(
                    "button",
                    {
                      onClick: () => x(k.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: k.name === _ ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: k.name === _ ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold truncate", children: k.name }),
                        /* @__PURE__ */ t("div", { className: "text-[9px] mt-0.5", style: { color: k.status === "loaded" ? "var(--ok)" : "var(--warn)" }, children: k.status === "loaded" ? "config loaded" : "config unavailable" })
                      ]
                    },
                    k.name
                  )),
                  !e.length && /* @__PURE__ */ t("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No referenced profiles." })
                ] }),
                /* @__PURE__ */ t("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: L ? /* @__PURE__ */ n("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ n("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ n("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ t("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: L.name }),
                      /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: L.description || "No description declared." })
                    ] }),
                    m && /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => m(L),
                        disabled: L.status !== "loaded",
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Use for this step"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ t(pt, { label: "Model", value: L.model || "auto / provider default" }),
                    /* @__PURE__ */ t(pt, { label: "Config source", value: L.sourcePath }),
                    /* @__PURE__ */ t(pt, { label: "Prompt", value: L.prompt ? L.prompt.startsWith("file://") ? L.prompt : "inline prompt" : void 0 })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Declared tools" }),
                    /* @__PURE__ */ t(zt, { values: L.tools })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Auto-approved tools" }),
                    /* @__PURE__ */ t(zt, { values: L.allowedTools })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Resources / skills" }),
                    /* @__PURE__ */ t(zt, { values: L.resources })
                  ] }),
                  /* @__PURE__ */ n("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "MCP servers" }),
                    /* @__PURE__ */ t(zt, { values: L.mcpServers })
                  ] }),
                  $ && /* @__PURE__ */ n("details", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ t("summary", { className: "text-[11px] cursor-pointer", style: { color: "var(--accent)" }, children: "Prompt preview" }),
                    /* @__PURE__ */ t("pre", { className: "mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto", style: { color: "var(--muted)" }, children: $ })
                  ] }),
                  /* @__PURE__ */ t("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 28%, var(--border))" }, children: "These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access." })
                ] }) : /* @__PURE__ */ t("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select an agent template." }) })
              ] }) : /* @__PURE__ */ n(Ve, { children: [
                /* @__PURE__ */ n("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  r.map((k) => /* @__PURE__ */ n(
                    "button",
                    {
                      onClick: () => y(k.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: k.name === b ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: k.name === b ? "var(--accent)" : "var(--text)" },
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
                        onClick: () => z({ mode: "update", crew: E }),
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
                    /* @__PURE__ */ t(pt, { label: "kiro_agent", value: E.kiroAgent }),
                    /* @__PURE__ */ t(pt, { label: "Workspace", value: E.workspace }),
                    /* @__PURE__ */ t(pt, { label: "Memory store", value: E.memoryStore }),
                    /* @__PURE__ */ t(pt, { label: "Model override", value: E.model }),
                    /* @__PURE__ */ t(pt, { label: "Source", value: E.source })
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
                            x(E.kiroAgent || ""), h("agents");
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
        w && c && /* @__PURE__ */ t(
          Tn,
          {
            profiles: e,
            initial: w.mode === "update" ? w.crew : void 0,
            onClose: () => z(null),
            onSave: async (k) => {
              await c(k), y(k.name), z(null);
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
function tt(e) {
  return typeof e == "string" && jn.test(e);
}
function ot(e) {
  return typeof e == "string" && e.trim() ? e.trim() : void 0;
}
function tr(e) {
  return Array.isArray(e) ? [...new Set(e.filter((r) => typeof r == "string" && r.trim()).map((r) => r.trim()))] : [];
}
function En(e) {
  return !e || typeof e != "object" || Array.isArray(e) ? [] : Object.entries(e).filter(([r, s]) => tt(r) && s && typeof s == "object" && !Array.isArray(s)).map(([r, s]) => ({
    name: r,
    kiroAgent: tt(s.kiro_agent) ? s.kiro_agent : void 0,
    workspace: ot(s.workspace),
    memoryStore: ot(s.memory_store ?? s.memoryStore),
    model: ot(s.model),
    description: ot(s.description),
    triggers: tr(s.triggers),
    source: ot(s.source)
  })).sort((r, s) => r.name.localeCompare(s.name));
}
function Ln(e, r = Dr) {
  const s = [];
  for (const l of r)
    tt(l) && !s.includes(l) && s.push(l);
  const a = (Array.isArray(e) ? e : []).map((l) => l == null ? void 0 : l.kiroAgent).filter(tt).sort((l, d) => l.localeCompare(d));
  for (const l of a)
    s.includes(l) || s.push(l);
  return s;
}
function On(e, r, s = Dr) {
  if (!tt(e)) return;
  if (s.includes(e)) return `~/.kiro/crew/apps/dlc-yolo/agents/${e}.json`;
  const a = [...new Set(
    (Array.isArray(r) ? r : []).filter((l) => (l == null ? void 0 : l.kiroAgent) === e).map((l) => l == null ? void 0 : l.source).filter(tt)
  )];
  if (a.length === 1)
    return `~/.kiro/agents/${a[0]}--${e}.json`;
}
function lr(e, r, s) {
  const a = tt(r) ? r : "unknown", l = !!e && typeof e == "object" && !Array.isArray(e), d = l && tt(e.name) ? e.name : a, m = l && e.mcpServers && typeof e.mcpServers == "object" ? Object.keys(e.mcpServers).filter(tt) : [];
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
    sourcePath: ot(s)
  };
}
function In(e) {
  const r = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(e || "");
  return r == null ? void 0 : r[1];
}
function qn(e, r) {
  if (!r || !tt(r.name)) return { ...e };
  const s = In(r.name);
  return {
    ...e,
    name: r.name,
    tools: [...r.tools || []],
    model: r.model || "auto",
    ...s ? { capability: s } : {}
  };
}
let ut = gt;
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
}, xt = ["manual", "assisted", "autonomous"], Tt = ["quick", "standard", "deep"], Ft = { trust: "assisted", depth: "standard" }, ar = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, or = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Dn() {
  const [e, r] = N(null), s = oe((d) => new Promise((m) => {
    r({ ...d, resolve: m });
  }), []), a = oe((d) => {
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
  return [s, l];
}
function Ye({ color: e, children: r, title: s, onClick: a, active: l }) {
  return /* @__PURE__ */ t(
    "button",
    {
      type: "button",
      title: s,
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
function Bn({ steps: e, cardsByStage: r, onNodeClick: s }) {
  const a = De(null), l = De(null), d = De(0), m = De(null), i = De(e), c = De(r), v = De([]);
  i.current = e, c.current = r;
  const h = 3, _ = 116, x = _ / h, b = x - 26, [y, w] = N(880);
  qe(() => {
    const E = l.current;
    if (!E) return;
    const F = new ResizeObserver(($) => {
      const P = Math.max(360, Math.floor($[0].contentRect.width));
      w(P);
    });
    return F.observe(E), () => F.disconnect();
  }, []);
  const z = (E) => E.type === "gate" || E.id.startsWith("gate-");
  return qe(() => {
    const E = a.current;
    if (!E) return;
    const F = Math.floor(y / h);
    E.width = F * h, E.height = x * h;
    const $ = E.getContext("2d");
    if (!$) return;
    const P = (re, R, xe, pe, me) => {
      $.fillStyle = me, $.fillRect(re * h, R * h, xe * h, pe * h);
    }, J = () => {
      const re = d.current, R = i.current, xe = c.current, pe = Math.max(1, R.length);
      Math.max(1, ...R.map((ee) => {
        var W;
        return ((W = xe[ee.id]) == null ? void 0 : W.length) || 0;
      })), P(0, 0, F, b, "#0f172a");
      for (let ee = 0; ee < F / 5; ee++) {
        const W = ee * 37 % F, ne = ee * 13 % (b - 4);
        Math.sin(re * 0.03 + ee * 2.1) > 0.35 && P(W, ne, 1, 1, "#e2e8f0");
      }
      P(F - 26, 8, 10, 10, "#fde68a"), P(F - 24, 7, 8, 8, "#0f172a");
      for (let ee = 0; ee < F; ee += 16)
        for (let W = b; W < x; W += 16)
          P(ee, W, 16, 16, ee / 16 + W / 16 & 1 ? "#33261a" : "#2a1f14");
      P(0, b - 2, F, 2, "#4a3520");
      const me = F / pe, we = [];
      for (let ee = 0; ee < R.length; ee++) {
        const W = R[ee], ne = Math.round(me * (ee + 0.5)), Le = (xe[W.id] || []).length, Se = Le > 0, S = Qt[ee % Qt.length], K = z(W), ae = b - 2;
        if (we.push({ x: ne - Math.floor(me / 2), w: Math.floor(me), id: W.id }), ee < R.length - 1) {
          const le = Math.round(me * (ee + 1.5));
          for (let te = ne + 8; te < le - 8; te += 4) P(te, b - 1, 2, 1, "#4a3520");
        }
        if (K) {
          const le = ae - 20, te = Se ? "#f39c12" : "#3a3222";
          P(ne - 3, le, 6, 20, Se ? "#5c4a2a" : "#2a2418");
          for (let V = 0; V < 5; V++) P(ne - V, le - 5 + V, V * 2 + 1, 1, te);
          for (let V = 0; V < 5; V++) P(ne - (4 - V), le - V, (4 - V) * 2 + 1, 1, te);
          if (Se) {
            const V = (Math.sin(re * 0.08) + 1) / 2;
            $.globalAlpha = 0.35 + V * 0.4, P(ne - 1, le - 6, 2, 2, "#ffd27a"), $.globalAlpha = 1;
          }
        } else {
          const le = ae - 14;
          if (P(ne - 10, le, 20, 3, "#7a5c47"), P(ne - 10, le - 1, 20, 1, S), P(ne - 9, le + 3, 2, 8, "#5c4033"), P(ne + 7, le + 3, 2, 8, "#5c4033"), P(ne - 5, le - 9, 10, 9, "#333"), P(ne - 4, le - 8, 8, 7, Se ? "#0a2a0a" : "#1a1a1a"), Se)
            for (let te = 0; te < 3; te++) {
              const V = 2 + (re + te * 7) % 5;
              P(ne - 3, le - 7 + te * 2, V, 0.8, "#33ff33");
            }
        }
        const _e = Math.min(Le, 5);
        for (let le = 0; le < _e; le++) {
          const te = _e > 1 ? (le - (_e - 1) / 2) * 8 : 0, V = Math.round(ne + te) - 3, fe = ae - (K ? 2 : 4), T = Qt[(ee + le) % Qt.length], de = Math.sin(re * 0.08 + ee + le) > 0 ? 1 : 0;
          $.fillStyle = "rgba(0,0,0,0.18)", $.fillRect(V * h, (fe + 8) * h, 6 * h, h), P(V, fe + de, 6, 6, T), P(V + 1, fe - 4 + de, 4, 4, "#fdd"), P(V + 1, fe - 5 + de, 4, 1, "#333"), (re + ee * 9 + le * 5) % 120 >= 3 && (P(V + 2, fe - 3 + de, 1, 1, "#333"), P(V + 4, fe - 3 + de, 1, 1, "#333")), P(V + 1, fe + 6, 1, 2, T), P(V + 4, fe + 6, 1, 2, T);
        }
        Le > 5 && ($.fillStyle = S, $.font = `${3 * h}px monospace`, $.fillText(`+${Le - 5}`, (ne + 10) * h, (ae - 6) * h)), Le > 0 && ($.fillStyle = S, $.fillRect((ne + 6) * h, (ae - 30) * h, 9 * h, 9 * h), $.fillStyle = "#0f172a", $.font = `bold ${5 * h}px monospace`, $.textAlign = "center", $.fillText(String(Le), (ne + 10.5) * h, (ae - 24) * h), $.textAlign = "left"), $.fillStyle = Se ? "#e2e8f0" : "#6b7280", $.font = `${3.4 * h}px monospace`, $.textAlign = "center";
        const Fe = W.name.length > 12 ? W.name.slice(0, 11) + "…" : W.name;
        $.fillText(Fe, ne * h, (x - 4) * h), $.textAlign = "left";
      }
      v.current = we;
      const je = R.reduce((ee, W) => {
        var ne;
        return ee + (((ne = xe[W.id]) == null ? void 0 : ne.length) || 0);
      }, 0);
      $.fillStyle = "#f90", $.font = `bold ${3.6 * h}px monospace`, $.fillText(`${je} card${je !== 1 ? "s" : ""} · ${pe} milestone${pe !== 1 ? "s" : ""}`, 4 * h, 8 * h);
    }, k = () => {
      d.current++, J(), m.current = requestAnimationFrame(k);
    };
    return m.current = requestAnimationFrame(k), () => {
      m.current && cancelAnimationFrame(m.current);
    };
  }, [y, x, b]), /* @__PURE__ */ t("div", { ref: l, className: "w-full mb-5", children: /* @__PURE__ */ t(
    "canvas",
    {
      ref: a,
      onClick: (E) => {
        const F = a.current;
        if (!F) return;
        const $ = F.getBoundingClientRect(), P = (E.clientX - $.left) / $.width * (F.width / h), J = v.current.find((k) => P >= k.x && P <= k.x + k.w);
        J && s(J.id);
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
function zn({ active: e, onChange: r, counts: s }) {
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
        const d = e === l.id, m = s[l.id];
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
function Ke({ title: e, children: r }) {
  return /* @__PURE__ */ n("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ t("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: e }),
    r
  ] });
}
function mt({ rows: e, empty: r = "None recorded" }) {
  return e.length ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: e.map((s) => /* @__PURE__ */ n("div", { className: "rounded-md px-2 py-1.5", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)" }, children: [
    /* @__PURE__ */ n("div", { className: "flex items-start gap-2 text-[11px]", children: [
      /* @__PURE__ */ t("span", { className: "font-medium min-w-0 break-words", style: { color: "var(--text)" }, children: s.title }),
      /* @__PURE__ */ n("span", { className: "ml-auto flex gap-1 flex-shrink-0", children: [
        s.level && /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: s.level === "required" ? "var(--warn)" : "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: s.level }),
        s.status && /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: /fail|block|open|pending/i.test(s.status) ? "var(--warn)" : "var(--ok)", background: "var(--bg-hover, var(--border))" }, children: s.status })
      ] })
    ] }),
    s.detail && /* @__PURE__ */ t("div", { className: "mt-0.5 text-[10px] break-words", style: { color: "var(--muted)" }, children: s.detail }),
    s.ref && (s.url ? /* @__PURE__ */ t("a", { href: s.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: s.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: s.ref }))
  ] }, s.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: r });
}
function Ce({ label: e, value: r, status: s }) {
  return /* @__PURE__ */ n("div", { className: "min-w-0", children: [
    /* @__PURE__ */ t("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ n("div", { className: "text-[11px] mt-0.5 break-words", style: { color: ht(r) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      ht(r),
      s && /* @__PURE__ */ n("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        ht(s),
        ")"
      ] })
    ] })
  ] });
}
function Fn({ card: e, inspection: r, producerSession: s, onClose: a, onOpenProducer: l, onApprove: d, onReject: m, onInterject: i }) {
  const c = r.routing, v = () => {
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
                /* @__PURE__ */ n(Ke, { title: "Result summary", children: [
                  /* @__PURE__ */ t("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: r.summary ? "var(--text)" : "var(--warn)" }, children: r.summary || "No result summary was published." }),
                  /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ t(Ce, { label: "Envelope", value: r.envelopeId }),
                    /* @__PURE__ */ t(Ce, { label: "Created", value: r.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ t(Ke, { title: "Changes since prior revision", children: /* @__PURE__ */ t(mt, { rows: r.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ t(Ke, { title: "Artifacts and evidence references", children: r.artifacts.length ? /* @__PURE__ */ t("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: r.artifacts.map((h) => /* @__PURE__ */ n("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ n("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ t("span", { className: "font-medium", style: { color: "var(--text)" }, children: h.label }),
                  h.kind && /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: h.kind })
                ] }),
                h.preview && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: h.preview }),
                h.ref && (h.url ? /* @__PURE__ */ t("a", { href: h.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: h.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: h.ref }))
              ] }, h.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ke, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ t(mt, { rows: r.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ t(Ke, { title: "Research and citations", children: /* @__PURE__ */ t(mt, { rows: r.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ke, { title: "Intent and requirement coverage", children: /* @__PURE__ */ t(mt, { rows: r.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ t(Ke, { title: "Omissions and deviations", children: /* @__PURE__ */ t(mt, { rows: r.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ n(Ke, { title: "Card topology and integration", children: [
                /* @__PURE__ */ n("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ t(Ce, { label: "Action", value: r.topology.action }),
                  /* @__PURE__ */ t(Ce, { label: "Integration owner", value: r.topology.integrationOwner }),
                  /* @__PURE__ */ t(Ce, { label: "Integration status", value: r.topology.integrationStatus }),
                  /* @__PURE__ */ t(Ce, { label: "Required children incomplete", value: r.topology.incompleteRequiredChildren.length })
                ] }),
                r.topology.children.length > 0 ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: r.topology.children.map((h) => /* @__PURE__ */ n("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: h.label }),
                  /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: h.required ? "var(--warn)" : "var(--muted)" }, children: h.required ? "required" : "optional" }),
                  /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(h.status) ? "var(--ok)" : "var(--warn)" }, children: h.status })
                ] }, h.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ke, { title: "Budget consumption", children: /* @__PURE__ */ n("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ t(Ce, { label: "Allocated", value: r.budget.allocated }),
                  /* @__PURE__ */ t(Ce, { label: "Consumed", value: r.budget.consumed }),
                  /* @__PURE__ */ t(Ce, { label: "Remaining", value: r.budget.remaining })
                ] }) }),
                /* @__PURE__ */ t(Ke, { title: "Routing and runtime provenance", children: /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ t(Ce, { label: "Assigned profile", value: c.assignedProfile }),
                  /* @__PURE__ */ t(Ce, { label: "Effective profile", value: c.effectiveProfile }),
                  /* @__PURE__ */ t(Ce, { label: "Model requested", value: c.model.requested }),
                  /* @__PURE__ */ t(Ce, { label: "Model applied", value: c.model.applied, status: c.model.status }),
                  /* @__PURE__ */ t(Ce, { label: "Provider / version", value: c.model.provider || c.model.version ? [c.model.provider, c.model.version].filter(Boolean) : null }),
                  /* @__PURE__ */ t(Ce, { label: "Effort requested", value: c.effort.requested }),
                  /* @__PURE__ */ t(Ce, { label: "Effort applied", value: c.effort.applied, status: c.effort.status }),
                  /* @__PURE__ */ t(Ce, { label: "Tools available", value: c.tools.actual, status: c.tools.status }),
                  /* @__PURE__ */ t(Ce, { label: "Skills available", value: c.skills.actual, status: c.skills.status }),
                  /* @__PURE__ */ t(Ce, { label: "Network scope", value: c.network.actual, status: c.network.status }),
                  /* @__PURE__ */ t(Ce, { label: "Write scope", value: c.write.actual, status: c.write.status }),
                  /* @__PURE__ */ t(Ce, { label: "Worktree / branch", value: c.worktree })
                ] }) })
              ] }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ t(Ke, { title: "Validation and evidence", children: /* @__PURE__ */ t(mt, { rows: r.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ t(Ke, { title: "Known risks", children: /* @__PURE__ */ t(mt, { rows: r.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ t(Ke, { title: "Open decisions and questions", children: /* @__PURE__ */ t(mt, { rows: r.decisions, empty: "No open decisions recorded" }) })
              ] })
            ] }),
            /* @__PURE__ */ n("footer", { className: "px-5 py-3 flex items-center gap-2 flex-wrap", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              d && /* @__PURE__ */ n("button", { onClick: () => {
                d(), a();
              }, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--ok)", color: "var(--bg)" }, children: [
                "Approve",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              m && /* @__PURE__ */ n("button", { onClick: v, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--danger)", color: "var(--bg)" }, children: [
                "Reject",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              i && /* @__PURE__ */ t("button", { onClick: i, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: "Interject on this revision" }),
              s && l && /* @__PURE__ */ n("button", { onClick: l, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: [
                "Open producer · ",
                s.step
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
  const s = e.bootstrap, a = e.intent_contract || e.intent;
  if (!s && !a) return null;
  const l = `pipeline ${e.pipeline_id || ""} card ${e.id} (${e.title})`, d = (v, h) => /* @__PURE__ */ t(
    "button",
    {
      className: "text-[10px] px-2 py-0.5 rounded hover:opacity-80",
      style: { color: "var(--accent)", border: "1px solid var(--border)" },
      title: "Opens /dlc-yolo with this context — nothing is created in the browser",
      onClick: () => r({ message: `/dlc-yolo ${v} for ${l}` }),
      children: h
    }
  ), m = s ? String(s.status || "not-run") : "n/a", i = Array.isArray(s == null ? void 0 : s.crews_created) ? s.crews_created : [], c = Array.isArray(s == null ? void 0 : s.issues_opened) ? s.issues_opened : [];
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
        s != null && s.blocking_reason ? /* @__PURE__ */ n("span", { style: { color: "var(--warn)" }, children: [
          "· ",
          String(s.blocking_reason)
        ] }) : null,
        d("resume bootstrap", "Resume bootstrap")
      ] }),
      m === "done" && /* @__PURE__ */ t("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "Replaying bootstrap is idempotent intent, not a promise." })
    ] })
  ] });
}
function Un({ cards: e, schedulerState: r, statePath: s, readAppFile: a, onClose: l }) {
  const d = Te(() => Rn(e, r), [e, r]), [m, i] = N(Jt(null)), [c, v] = N([]), [h, _] = N([]);
  qe(() => {
    const y = `${s.replace(/\/state\.json$/, "")}/workspaces/default/data/ledger/projections/status.json`;
    let w = !1;
    return a(y).then((z) => {
      if (!w)
        try {
          i(Jt(JSON.parse(z.content || "null")));
        } catch {
          i(Jt(null));
        }
    }).catch(() => {
      w || i(Jt(null));
    }), () => {
      w = !0;
    };
  }, [s, a]), qe(() => {
    const b = [], y = [];
    for (const w of e) {
      const z = w.step_sessions;
      if (z) for (const [E, F] of Object.entries(z)) b.push({ card: w.id, step: E, slot: F == null ? void 0 : F.slot_key });
      const L = w.worktree_lease;
      L && y.push({ card: w.id, branch: L.branch, status: L.status });
    }
    v(b.slice(0, 60)), _(y.slice(0, 60));
  }, [e]);
  const x = ({ title: b, children: y }) => /* @__PURE__ */ n("div", { className: "mb-4", children: [
    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: b }),
    y
  ] });
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
      onMouseDown: (b) => {
        b.currentTarget === b.target && l();
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
              /* @__PURE__ */ n(x, { title: "Runtime / scheduler", children: [
                /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-2", children: Mr.map((b) => /* @__PURE__ */ n("span", { className: "px-2 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: d.counts[b] ? "var(--text)" : "var(--muted)" }, children: [
                  b,
                  " ",
                  d.counts[b]
                ] }, b)) }),
                d.waitReasons.length > 0 && /* @__PURE__ */ t("div", { className: "mt-2", children: d.waitReasons.map((b, y) => /* @__PURE__ */ n("div", { style: { color: "var(--muted)" }, children: [
                  "⛔ ",
                  b.card,
                  ": ",
                  b.reason
                ] }, y)) })
              ] }),
              /* @__PURE__ */ t(x, { title: "Projection parity", children: m.available ? /* @__PURE__ */ n("div", { children: [
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
              /* @__PURE__ */ t(x, { title: "Webhook", children: /* @__PURE__ */ t(Lr, {}) }),
              /* @__PURE__ */ n(x, { title: "Sessions & worktrees", children: [
                /* @__PURE__ */ n("div", { className: "mb-1", style: { color: "var(--muted)" }, children: [
                  c.length,
                  " session(s) · ",
                  h.length,
                  " lease(s)"
                ] }),
                c.slice(0, 12).map((b, y) => /* @__PURE__ */ n("div", { style: { color: "var(--text)" }, children: [
                  b.card,
                  " · ",
                  b.step,
                  b.slot ? ` · ${b.slot}` : ""
                ] }, y)),
                h.slice(0, 12).map((b, y) => /* @__PURE__ */ n("div", { style: { color: "var(--muted)" }, children: [
                  "🌿 ",
                  b.card,
                  " · ",
                  b.branch || "—",
                  " · ",
                  b.status || "—"
                ] }, `l${y}`))
              ] })
            ] })
          ]
        }
      )
    }
  );
}
function be(e, r) {
  return r == null || r === "" ? null : /* @__PURE__ */ n("div", { className: "flex gap-2 text-[11px] py-0.5", children: [
    /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: "var(--muted)", minWidth: "110px" }, children: e }),
    /* @__PURE__ */ t("span", { className: "min-w-0 break-words", style: { color: "var(--text)" }, children: String(r) })
  ] });
}
function Sr(e) {
  return typeof e == "string" && /^https?:\/\//i.test(e);
}
function Wn({ card: e, cardStatus: r, effectiveCapability: s, onClose: a }) {
  var _, x, b;
  const [l, d] = N("overview"), m = [
    ["overview", "Overview"],
    ["results", "Results"],
    ["history", "Decisions & history"],
    ["execution", "Execution"]
  ], i = e.execution_schedule, c = i != null && i.current_node_id ? (_ = i == null ? void 0 : i.nodes) == null ? void 0 : _[i.current_node_id] : void 0, v = e.worktree_lease, h = e.topology;
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (y) => {
        y.currentTarget === y.target && a();
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
            /* @__PURE__ */ t("nav", { className: "flex gap-1 px-3 pt-2", style: { borderBottom: "1px solid var(--border)" }, children: m.map(([y, w]) => /* @__PURE__ */ t(
              "button",
              {
                onClick: () => d(y),
                className: "text-[11px] px-2.5 py-1 rounded-t-md",
                style: {
                  color: l === y ? "var(--accent)" : "var(--muted)",
                  borderBottom: l === y ? "2px solid var(--accent)" : "2px solid transparent"
                },
                children: w
              },
              y
            )) }),
            /* @__PURE__ */ n("div", { className: "px-5 py-3 overflow-y-auto text-[11px]", children: [
              l === "overview" && /* @__PURE__ */ n("div", { children: [
                (x = e.source) != null && x.url && Sr(e.source.url) ? be("source", null) || /* @__PURE__ */ n("div", { className: "text-[11px] py-0.5", children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--muted)", minWidth: 110, display: "inline-block" }, children: "source" }),
                  /* @__PURE__ */ n("a", { href: e.source.url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: [
                    e.source.repo,
                    e.source.issue ? `#${e.source.issue}` : ""
                  ] })
                ] }) : be("source", (b = e.source) == null ? void 0 : b.repo),
                be("pipeline", e.pipeline_id),
                be("workspace", e.workspace),
                be("stage", e.stage),
                be("lifecycle", e.lifecycle),
                be("SoT", e.sot),
                be("status", `${r.label}${r.reason ? ` — ${r.reason}` : ""}`),
                be("trust", e.trust ? `${e.trust} (override)` : "inherited"),
                be("depth", e.depth ? `${e.depth} (override)` : "inherited"),
                be("capability", s),
                be("effort", e.effort ? JSON.stringify(e.effort) : null),
                be("writes_allowed", e.writes_allowed === !1 ? "false (cancel requested)" : null)
              ] }),
              l === "results" && /* @__PURE__ */ n("div", { children: [
                Object.entries(e.step_summaries || {}).map(([y, w]) => /* @__PURE__ */ n("div", { className: "mb-2", children: [
                  /* @__PURE__ */ n("div", { className: "font-medium", style: { color: "var(--text)" }, children: [
                    y,
                    ": ",
                    (w == null ? void 0 : w.headline) || "—"
                  ] }),
                  (w == null ? void 0 : w.description) && /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: w.description }),
                  (w == null ? void 0 : w.executor) && /* @__PURE__ */ n("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: [
                    "executor ",
                    w.executor
                  ] })
                ] }, y)),
                Object.entries(e.artifacts || {}).map(([y, w]) => /* @__PURE__ */ t("div", { className: "py-0.5", children: Sr(w) ? /* @__PURE__ */ t("a", { href: w, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: y }) : /* @__PURE__ */ n("span", { style: { color: "var(--text)" }, children: [
                  y,
                  ": ",
                  /* @__PURE__ */ t("code", { style: { color: "var(--muted)" }, children: String(w) })
                ] }) }, y)),
                !e.step_summaries && !e.artifacts && /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: "No results recorded." })
              ] }),
              l === "history" && /* @__PURE__ */ n("div", { children: [
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-1 mb-1", style: { color: "var(--muted)" }, children: "Decisions" }),
                (e.decisions || []).map((y, w) => /* @__PURE__ */ n("div", { className: "py-0.5", style: { color: "var(--text)" }, children: [
                  String(y.status) === "open" ? "🔴 " : "✓ ",
                  String(y.kind),
                  " — ",
                  String(y.question || y.chosen || y.action || "")
                ] }, w)),
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Stage history" }),
                (e.history || []).map((y, w) => /* @__PURE__ */ n("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                  String(y.from),
                  " → ",
                  String(y.to),
                  " · ",
                  String(y.agent || ""),
                  " · ",
                  String(y.at || "")
                ] }, w)),
                (e.gate_history || []).length > 0 && /* @__PURE__ */ n(Ve, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Gates" }),
                  (e.gate_history || []).map((y, w) => /* @__PURE__ */ n("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(y.decision),
                    " ",
                    String(y.gate),
                    " · ",
                    String(y.actor || "")
                  ] }, w))
                ] }),
                (e.interjection || []).length > 0 && /* @__PURE__ */ n(Ve, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Requests / interjections" }),
                  (e.interjection || []).map((y, w) => /* @__PURE__ */ n("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(y.kind),
                    " · ",
                    String(y.status),
                    y.reason ? ` (${String(y.reason)})` : ""
                  ] }, w))
                ] })
              ] }),
              l === "execution" && /* @__PURE__ */ n("div", { children: [
                be("current node", i == null ? void 0 : i.current_node_id),
                be("node status", c == null ? void 0 : c.status),
                be("permit", c == null ? void 0 : c.permit_id),
                be("concurrency class", c == null ? void 0 : c.concurrency_class),
                be("model (requested)", e.model_request),
                be("model (applied)", e.model_applied),
                h && /* @__PURE__ */ n(Ve, { children: [
                  be("topology", h.action),
                  be("integration owner", h.integration_owner),
                  be("children", Array.isArray(h.children) ? `${h.children.length}` : null)
                ] }),
                v && /* @__PURE__ */ n(Ve, { children: [
                  be("worktree branch", v.branch),
                  be("lease status", v.status),
                  be("lease locked", v.locked ? "true" : null)
                ] }),
                be("cancel requested", e.cancel_requested_at),
                e.writes_allowed === !1 && be("terminal observed", "pending (cooperative cancel in progress)")
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
  const [r, s] = N(!1), a = De(null), [l, d] = N(null), [m, i] = Dn(), c = async (h) => {
    console.info("[dlc-yolo maintain] click:", h);
    const _ = cr[h];
    if (s(!1), !await m({
      message: _.confirm,
      confirmLabel: _.label,
      danger: h === "request:cancel"
    })) {
      console.info("[dlc-yolo maintain] cancelled");
      return;
    }
    console.info("[dlc-yolo maintain] confirmed -> onRequest", h), e(h, "");
  }, v = () => {
    s((h) => {
      const _ = !h;
      if (_ && a.current) {
        const x = a.current.getBoundingClientRect();
        d({ top: x.bottom + 4, left: x.left });
      }
      return _;
    });
  };
  return qe(() => {
    if (!r) return;
    const h = () => s(!1);
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
        onClick: v,
        children: "🔧 maintain"
      }
    ),
    r && l && Pr(
      /* @__PURE__ */ n(Ve, { children: [
        /* @__PURE__ */ t(
          "div",
          {
            style: { position: "fixed", inset: 0, zIndex: 2147483646 },
            onMouseDown: () => s(!1)
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
            children: Object.entries(cr).map(([h, _]) => /* @__PURE__ */ t(
              "button",
              {
                className: "block w-full text-left px-3 py-1 hover:opacity-80",
                style: { color: h === "request:cancel" ? "var(--danger, #e66)" : "var(--text)" },
                onClick: () => c(h),
                children: _.label
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
function Gn({ card: e, decision: r, onClose: s, onResolve: a }) {
  var c, v, h;
  const l = r.options || [], d = ((c = l.find((_) => _.recommended === !0)) == null ? void 0 : c.id) || ((v = l.find((_) => _.id && (r.rationale || "").toLowerCase().includes((_.id + ")").toLowerCase()))) == null ? void 0 : v.id) || ((h = l[0]) == null ? void 0 : h.id), [m, i] = N(d || "");
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[72] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (_) => {
        _.currentTarget === _.target && s();
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
                  onClick: s,
                  "aria-label": "Close decision",
                  className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                  style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ n("div", { className: "overflow-y-auto p-4 flex flex-col gap-2", children: [
              l.map((_, x) => {
                const b = _.id || String.fromCharCode(65 + x), y = m === (_.id || b), w = (_.id || b) === d;
                return /* @__PURE__ */ n(
                  "label",
                  {
                    className: "flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer",
                    style: {
                      background: y ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--bg-hover, transparent)",
                      border: `1px solid ${y ? "var(--accent)" : "var(--border)"}`
                    },
                    children: [
                      /* @__PURE__ */ t(
                        "input",
                        {
                          type: "radio",
                          name: `decision-${r.id}`,
                          className: "mt-0.5",
                          checked: y,
                          onChange: () => i(_.id || b)
                        }
                      ),
                      /* @__PURE__ */ n("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ n("div", { className: "text-[12px] font-semibold flex items-center gap-1.5", style: { color: "var(--text-strong, var(--text))" }, children: [
                          "Option ",
                          b,
                          w && /* @__PURE__ */ t("span", { className: "text-[10px] font-normal", style: { color: "var(--accent)" }, children: "⭐ recommended" })
                        ] }),
                        /* @__PURE__ */ t("div", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: _.note }),
                        _.risk && /* @__PURE__ */ n("div", { className: "text-[10px] mt-0.5", style: { color: "var(--warn, var(--muted))" }, children: [
                          "risk: ",
                          _.risk
                        ] })
                      ] })
                    ]
                  },
                  b
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
                  onClick: s,
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
                    m && (a(m), s());
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
function $t({ card: e, config: r, isGate: s, cardStatus: a, effectiveCapability: l, producerStep: d, producerSession: m, onOpenProducer: i, onApprove: c, onReject: v, onCycleTrust: h, onCycleDepth: _, onSetBudget: x, onInterject: b, onResolveDecision: y, onOpenOrchestrator: w, liveView: z, allCards: L, onOpenCard: E, onRequest: F, onOpenStepSession: $, onCancelCard: P }) {
  var Ze, rt, lt, nt, yt, Oe, ft, it, Je;
  const J = s ? "var(--warn)" : a.kind === "idle" ? "var(--border-strong, var(--border))" : a.color, k = e.trust || r.trust, re = e.depth || r.depth, R = ((Ze = e.parked) == null ? void 0 : Ze.length) || 0, xe = Object.values(e.step_sessions || {}).some(
    (f) => !!f.last_response_at && !f.chat_disabled_at && !f.superseded && (!f.last_response_handled_at || f.last_response_handled_at < f.last_response_at)
  ), [pe, me] = N(""), [we, je] = N(!1), [ee, W] = N(null), [ne, Ee] = N(!1), [Le, Se] = N(!1), { openChat: S } = Ar(), K = Te(() => vn(e), [e]), ae = Te(() => bn(e, L || []), [e, L]), _e = Te(() => xn(e), [e]), Fe = Te(() => {
    if (!_e) return null;
    const f = (L || []).find((O) => O.id === _e);
    return f ? { id: f.id, title: f.title } : null;
  }, [_e, L]), le = K.length > 0 || ae.length > 0 || !!Fe, te = Te(
    () => s ? rn(e, d) : null,
    [e, s, d]
  ), V = () => {
    const f = window.prompt(`Why reject revision ${(te == null ? void 0 : te.revision) ?? "unknown"}?`);
    f != null && f.trim() && v && v(f.trim());
  }, fe = (e.decisions || []).filter((f) => !f.chosen && !f.resolved_at && (!!f.action || !!f.options)), [T, de] = N(!1), [Ue, We] = N(!1), [He, ge] = N(() => {
    const f = Number(typeof localStorage < "u" && localStorage.getItem("dlc-live-wing-width"));
    return Number.isFinite(f) && f >= 220 ? f : 320;
  }), vt = (lt = (rt = e.step_sessions) == null ? void 0 : rt[e.stage]) == null ? void 0 : lt.slot_key, he = (() => {
    var Ie, Ae, at, Xe;
    const f = (Ie = e.step_results) == null ? void 0 : Ie[e.stage], O = f && typeof f == "object" && f.bundle && typeof f.bundle == "object" ? f.bundle.summary : void 0;
    if (typeof O == "string" && O.trim()) return O;
    const ie = (Ae = e.step_progress) == null ? void 0 : Ae[e.stage], ve = ie && typeof ie == "object" && Array.isArray(ie.lines) ? ie.lines : [];
    if (ve.length) {
      const Qe = ve.map((ct) => String((ct == null ? void 0 : ct.note) || "")).filter(Boolean);
      if (Qe.length) return Qe.join(`
`);
    }
    const Ne = (Xe = (at = e.step_summaries) == null ? void 0 : at[e.stage]) == null ? void 0 : Xe.headline;
    return typeof Ne == "string" && Ne.trim() ? Ne : "";
  })(), $e = z || (vt ? {
    stage: e.stage,
    phase: "idle",
    tail: he,
    buffer: he,
    active: !1,
    seq: 0,
    slotKey: vt,
    onOpen: () => navigate(`/chat?sid=${encodeURIComponent(vt)}`)
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
        zIndex: 1
      },
      children: [
        (() => {
          const f = ($ || []).find((O) => O.step === e.stage);
          return f ? /* @__PURE__ */ n(
            "button",
            {
              onClick: () => f.open(),
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
        ((nt = e.source) == null ? void 0 : nt.repo) && /* @__PURE__ */ n(
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
          var O;
          const f = (O = e.step_summaries) == null ? void 0 : O[e.stage];
          return f != null && f.headline ? /* @__PURE__ */ n("div", { className: "mt-1 flex items-start gap-1 text-[11px] leading-snug", title: f.description || f.headline, children: [
            f.needs_human ? /* @__PURE__ */ t("span", { "aria-label": "needs you", title: "Needs you", style: { color: "var(--warn)" }, children: "🔴" }) : /* @__PURE__ */ t("span", { "aria-hidden": "true", style: { color: "var(--muted)" }, children: "•" }),
            /* @__PURE__ */ t("span", { className: "truncate", style: { color: f.needs_human ? "var(--warn)" : "var(--text)" }, children: f.headline })
          ] }) : null;
        })(),
        /* @__PURE__ */ n("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "⚙ modes" }),
          /* @__PURE__ */ n(
            Ye,
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
            Ye,
            {
              color: or[re],
              active: !!e.depth,
              onClick: _,
              title: `depth: ${re}${e.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🔬 ",
                re
              ]
            }
          ),
          /* @__PURE__ */ n(
            Ye,
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
          x && /* @__PURE__ */ n("span", { className: "inline-flex items-center gap-0.5", title: "Decomposition/effort budget for this card", children: [
            /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "💰" }),
            /* @__PURE__ */ t(un, { budget: e.budget, depth: re, onSave: x })
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
                Ye,
                {
                  color: a.color,
                  active: a.kind !== "idle",
                  title: `${a.label}${a.reason ? ` — ${a.reason}` : ""}`,
                  children: a.label
                }
              ),
              /* @__PURE__ */ n(
                Ye,
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
              e.lifecycle && /* @__PURE__ */ n(Ye, { color: "var(--muted)", title: `card lifecycle: ${e.lifecycle}`, children: [
                "🔄 ",
                e.lifecycle
              ] }),
              R > 0 && /* @__PURE__ */ n(Ye, { color: "var(--warn)", title: `${R} parked idea(s)`, children: [
                "⏸ ",
                R
              ] }),
              xe && /* @__PURE__ */ t(Ye, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
              typeof ((yt = e.effort) == null ? void 0 : yt.total) == "number" && e.effort.total > 0 && /* @__PURE__ */ n(Ye, { color: "var(--info)", title: `estimated effort: ${e.effort.total} points`, children: [
                "⚡ ",
                e.effort.total
              ] }),
              e.backstep_history && e.backstep_history.length > 0 && /* @__PURE__ */ n(
                Ye,
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
                const f = e.decisions[e.decisions.length - 1];
                return /* @__PURE__ */ n(
                  Ye,
                  {
                    color: "var(--accent)",
                    title: `${e.decisions.length} decision${e.decisions.length === 1 ? "" : "s"} — last: ${f.question || f.kind || ""}${f.action ? ` → ${f.action}` : ""}${f.rationale ? `
${f.rationale}` : ""}`,
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
        s && te && /* @__PURE__ */ n(
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
        s && c && v && /* @__PURE__ */ n("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          (() => {
            const f = (e.gate_commands || []).filter((Ie) => Ie.gate === e.stage), O = f.length ? f[f.length - 1] : void 0, ie = (O == null ? void 0 : O.status) === "pending", ve = (O == null ? void 0 : O.status) === "rejected", Ne = (O == null ? void 0 : O.status) === "applied" || (O == null ? void 0 : O.status) === "approved";
            return /* @__PURE__ */ n(Ve, { children: [
              /* @__PURE__ */ n(
                "button",
                {
                  disabled: ie,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--ok)", color: "var(--bg)" },
                  onClick: c,
                  title: ie ? "A gate command is being processed…" : "Approve this gate",
                  children: [
                    ie && (O == null ? void 0 : O.action) === "approve" && /* @__PURE__ */ t(Rt, { size: 10 }),
                    ie && (O == null ? void 0 : O.action) === "approve" ? "Approving…" : "✓ Approve"
                  ]
                }
              ),
              /* @__PURE__ */ n(
                "button",
                {
                  disabled: ie,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--danger)", color: "var(--bg)" },
                  onClick: V,
                  children: [
                    ie && (O == null ? void 0 : O.action) === "reject" && /* @__PURE__ */ t(Rt, { size: 10 }),
                    ie && (O == null ? void 0 : O.action) === "reject" ? "Rejecting…" : "✕ Reject"
                  ]
                }
              ),
              ie && /* @__PURE__ */ n("span", { className: "text-[10px] inline-flex items-center gap-1", style: { color: "var(--muted)" }, children: [
                /* @__PURE__ */ t(Rt, { size: 10 }),
                " ",
                O == null ? void 0 : O.action,
                " sent — runtime processing…"
              ] }),
              ve && /* @__PURE__ */ n(
                "span",
                {
                  className: "text-[10px]",
                  style: { color: "var(--danger)" },
                  title: (O == null ? void 0 : O.rejection_reason) || "rejected",
                  children: [
                    "⚠ ",
                    O == null ? void 0 : O.action,
                    " rejected: ",
                    (O == null ? void 0 : O.rejection_reason) || "see gate result"
                  ]
                }
              ),
              Ne && /* @__PURE__ */ n("span", { className: "text-[10px]", style: { color: "var(--ok)" }, children: [
                "✓ ",
                O == null ? void 0 : O.action,
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
            var Ne, Ie, Ae;
            const f = (Ne = e.source) == null ? void 0 : Ne.repo;
            if (!f) return null;
            const O = (Ie = e.artifacts) == null ? void 0 : Ie.pr_url, ie = O && ((Ae = /\/pull\/(\d+)/.exec(O)) == null ? void 0 : Ae[1]), ve = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + f)}` + (ie ? `&pr=${ie}` : "");
            return /* @__PURE__ */ n(
              "a",
              {
                href: ve,
                title: O ? `Deep-review PR #${ie} in Code Review Sage` : `Open Code Review Sage for ${f}`,
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
          const f = e.block_reason || {}, O = new Set(fe.map((ve) => ve.step).filter(Boolean)), ie = Object.entries(f).filter(([ve]) => !O.has(ve));
          return ie.length ? ie.map(([ve, Ne]) => /* @__PURE__ */ n(
            "div",
            {
              className: "mt-2 p-2 rounded-md text-[11px]",
              style: { background: "color-mix(in srgb, var(--danger, #e66) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--danger, #e66) 35%, var(--border))" },
              children: [
                /* @__PURE__ */ n("div", { className: "font-semibold", style: { color: "var(--danger, #e66)" }, children: [
                  "⏸ Blocked · ",
                  ve
                ] }),
                /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: Ne }),
                b && /* @__PURE__ */ t(
                  "button",
                  {
                    className: "mt-1.5 text-[10px] px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--accent)", color: "var(--bg)" },
                    onClick: () => de(!0),
                    children: "✏️ interject to unblock"
                  }
                )
              ]
            },
            `block-${ve}`
          )) : null;
        })(),
        y && fe.map((f) => {
          var Ne, Ie;
          const O = f.step && ((Ne = e.block_reason) != null && Ne[f.step]) ? f.step : Object.keys(e.block_reason || {})[0], ie = O ? (Ie = e.block_reason) == null ? void 0 : Ie[O] : void 0, ve = f.options || [];
          return /* @__PURE__ */ n(
            "div",
            {
              className: "mt-2 p-2 rounded-md text-[11px]",
              style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
              children: [
                /* @__PURE__ */ n("div", { className: "font-semibold", style: { color: "var(--text, var(--muted))" }, children: [
                  "⚖ Decision needed",
                  f.step ? ` · ${f.step}` : "",
                  f.confidence ? ` · confidence ${f.confidence}` : ""
                ] }),
                /* @__PURE__ */ t("div", { className: "mt-1", style: { color: "var(--text, var(--muted))" }, children: f.question || f.kind }),
                ie && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: ie }),
                ve.length > 0 && /* @__PURE__ */ t("div", { className: "mt-1.5 flex flex-col gap-1", children: ve.map((Ae, at) => {
                  const Xe = Ae.id || String.fromCharCode(65 + at), Qe = Ae.recommended === !0 || f.chosen === Ae.id || (f.rationale || "").toLowerCase().includes((Ae.id || "").toLowerCase() + ")");
                  return /* @__PURE__ */ n(
                    "div",
                    {
                      className: "flex items-start gap-2 p-1 rounded",
                      style: { background: Qe ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent" },
                      children: [
                        /* @__PURE__ */ n(
                          "button",
                          {
                            className: "text-[10px] px-2 py-0.5 rounded font-semibold shrink-0",
                            style: { background: "var(--accent)", color: "var(--bg)" },
                            title: `Resolve this decision by selecting option ${Xe} — the step resumes on this branch`,
                            onClick: () => y(f.id, Ae.id || Xe),
                            children: [
                              "Choose ",
                              Xe
                            ]
                          }
                        ),
                        /* @__PURE__ */ n("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
                          Ae.note,
                          Ae.risk ? ` · risk: ${Ae.risk}` : "",
                          Qe ? "  ⭐ recommended" : ""
                        ] })
                      ]
                    },
                    Xe
                  );
                }) }),
                f.rationale && /* @__PURE__ */ n("div", { className: "mt-1 text-[10px] italic", style: { color: "var(--muted)" }, children: [
                  "Agent rationale: ",
                  f.rationale
                ] }),
                /* @__PURE__ */ n("div", { className: "mt-1.5 flex items-center gap-2", children: [
                  ve.length > 0 && /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded font-semibold",
                      style: { background: "var(--accent)", color: "var(--bg)" },
                      title: "Open a picker to select an option and resolve this decision",
                      onClick: () => W(f.id),
                      children: "⚖ resolve in picker…"
                    }
                  ),
                  /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded",
                      style: { color: "var(--muted)", border: "1px solid var(--border)" },
                      title: "Answer in your own words instead of choosing an option",
                      onClick: () => de(!0),
                      children: "✏️ answer in words"
                    }
                  ),
                  !ve.length && /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded font-semibold",
                      style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                      onClick: () => y(f.id),
                      children: "Acknowledge & continue"
                    }
                  )
                ] })
              ]
            },
            f.id
          );
        }),
        $e && /* @__PURE__ */ n(Ve, { children: [
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
                width: `${He}px`,
                overflow: "hidden",
                zIndex: 0,
                pointerEvents: T ? "auto" : "none"
              },
              children: /* @__PURE__ */ n(
                "div",
                {
                  className: Ue ? void 0 : "dlc-wing-slide",
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: "100%",
                    transform: T ? "translateX(0)" : "translateX(-100%)",
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
                        onMouseDown: (f) => {
                          f.preventDefault();
                          const O = f.clientX, ie = He;
                          let ve = ie;
                          We(!0);
                          const Ne = (Ae) => {
                            ve = Math.min(720, Math.max(240, ie + (Ae.clientX - O))), ge(ve);
                          }, Ie = () => {
                            We(!1);
                            try {
                              localStorage.setItem("dlc-live-wing-width", String(ve));
                            } catch {
                            }
                            window.removeEventListener("mousemove", Ne), window.removeEventListener("mouseup", Ie);
                          };
                          window.addEventListener("mousemove", Ne), window.addEventListener("mouseup", Ie);
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
                          /* @__PURE__ */ n("span", { className: "uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                            ea[$e.stage] || "⚙",
                            " ",
                            $e.stage,
                            " · live session"
                          ] }),
                          $e.active && /* @__PURE__ */ t(Rt, { size: 10 }),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              className: "ml-auto hover:underline",
                              onClick: $e.onOpen,
                              style: { color: "var(--accent)" },
                              title: "Open the full step session",
                              children: "open ↗"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              className: "hover:underline",
                              onClick: () => de(!1),
                              style: { color: "var(--muted)" },
                              title: "Collapse",
                              children: "✕"
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ t(ra, { tail: $e.buffer || $e.tail, active: $e.active }),
                    b && /* @__PURE__ */ n("div", { className: "px-2 py-1.5 flex items-center gap-1.5", style: { borderTop: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: pe,
                          onChange: (f) => me(f.target.value),
                          onKeyDown: (f) => {
                            f.key === "Enter" && pe.trim() && (b("note", pe.trim()), me(""));
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
                            pe.trim() && (b("note", pe.trim()), me(""));
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
          /* @__PURE__ */ t(
            "button",
            {
              className: Ue ? void 0 : "dlc-wing-slide",
              "aria-label": T ? "Collapse live session panel" : "Open live session panel",
              title: T ? "Collapse live session" : "Open live session",
              onClick: () => de((f) => !f),
              style: {
                position: "absolute",
                top: "10px",
                left: "100%",
                zIndex: 1,
                width: "14px",
                height: "46px",
                cursor: "pointer",
                padding: 0,
                transform: T ? `translateX(${He}px)` : "translateX(0)",
                transition: Ue ? "none" : void 0,
                willChange: "transform",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: $e.active ? "var(--accent)" : "var(--border)",
                color: "var(--bg)",
                border: "none",
                borderRadius: "0 6px 6px 0",
                boxShadow: "1px 0 4px rgba(0,0,0,0.25)"
              },
              children: /* @__PURE__ */ t("span", { style: { fontSize: "9px", lineHeight: 1 }, "aria-hidden": "true", children: T ? "›" : "‹" })
            }
          )
        ] }),
        /* @__PURE__ */ t(Pn, { card: e, openChat: S }),
        (b || w || $ && $.length || P) && /* @__PURE__ */ n(
          "div",
          {
            className: "mt-2 flex items-center gap-2 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider select-none", style: { color: "var(--muted)" }, children: "⚡ actions" }),
              z && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: "Open the live session wing to watch output and steer this session",
                  onClick: () => de(!0),
                  children: "💬 steer session"
                }
              ),
              w && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: (Oe = e.orchestrator_session) != null && Oe.slot_key || (ft = e.orchestrator_session) != null && ft.session_key ? "Open this pipeline’s orchestrator session" : "Trigger an inspectable orchestrator session for this card",
                  onClick: () => w(),
                  children: (it = e.orchestrator_session) != null && it.slot_key || (Je = e.orchestrator_session) != null && Je.session_key ? "⚙ open orchestrator" : "⚙ orchestrator"
                }
              ),
              le && /* @__PURE__ */ n(
                "button",
                {
                  className: "text-[10px] hover:underline inline-flex items-center gap-0.5",
                  style: { color: "var(--muted)" },
                  title: "Card timeline — the ordered story of what happened",
                  onClick: () => Ee(!0),
                  children: [
                    "📜 timeline",
                    K.some((f) => f.needs_human) ? " 🔴" : "",
                    ae.length > 0 ? ` 🌿${ae.length}` : ""
                  ]
                }
              ),
              F && /* @__PURE__ */ t(Hn, { onRequest: F }),
              ($ || []).map((f) => /* @__PURE__ */ n(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--accent)" },
                  title: `Open the ${f.step} step session`,
                  onClick: () => f.open(),
                  children: [
                    "⚙ ",
                    f.step
                  ]
                },
                f.step
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
                  onClick: () => Se(!0),
                  children: "🔍 details"
                }
              )
            ]
          }
        ),
        ne && /* @__PURE__ */ t(
          oa,
          {
            card: e,
            events: K,
            children: ae,
            parent: Fe,
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
            onClose: () => Se(!1)
          }
        ),
        we && te && /* @__PURE__ */ t(
          Fn,
          {
            card: e,
            inspection: te,
            producerSession: m,
            onClose: () => je(!1),
            onOpenProducer: i,
            onApprove: c,
            onReject: v,
            onInterject: b ? () => {
              je(!1), de(!0);
            } : void 0
          }
        ),
        ee && y && (() => {
          const f = (e.decisions || []).find((O) => O.id === ee);
          return f ? /* @__PURE__ */ t(
            Gn,
            {
              card: e,
              decision: f,
              onClose: () => W(null),
              onResolve: (O) => y(f.id, O)
            }
          ) : null;
        })()
      ]
    }
  );
}
function At({ title: e, count: r, children: s, id: a }) {
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
    ) : s })
  ] });
}
function Kn({ config: e, onSet: r }) {
  function s({ label: a, value: l, options: d, tokens: m, onPick: i }) {
    return /* @__PURE__ */ n("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: a }),
      /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: d.map((c) => {
        const v = l === c;
        return /* @__PURE__ */ t(
          "button",
          {
            onClick: () => i(c),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: v ? m[c] : "var(--muted)",
              background: v ? `color-mix(in srgb, ${m[c]} 16%, transparent)` : "transparent",
              boxShadow: v ? `inset 0 0 0 1px color-mix(in srgb, ${m[c]} 45%, transparent)` : "none"
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
        /* @__PURE__ */ t(s, { label: "Trust", value: e.trust, options: xt, tokens: ar, onPick: (a) => r({ trust: a }) }),
        /* @__PURE__ */ t(s, { label: "Depth", value: e.depth, options: Tt, tokens: or, onPick: (a) => r({ depth: a }) }),
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
function Xn({ pipeline: e, cards: r, extras: s, onOpenCard: a }) {
  const { events: l, actors: d, now: m } = Te(
    () => Nn(e, r, s),
    [e, r, s]
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
    (s) => (s.parked || []).map((a) => {
      var l;
      return { ...a, cardTitle: s.title, repo: (l = s.source) == null ? void 0 : l.repo };
    })
  ).sort((s, a) => (a.at || "").localeCompare(s.at || ""));
  return r.length === 0 ? /* @__PURE__ */ n("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ n("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ t("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ t("div", { className: "flex flex-col gap-2 max-w-2xl", children: r.map((s) => /* @__PURE__ */ n("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: s.note }),
    /* @__PURE__ */ n("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ n("span", { children: [
        "from ",
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: s.cardTitle })
      ] }),
      s.phase && /* @__PURE__ */ n("span", { children: [
        "· parked at ",
        s.phase
      ] }),
      s.repo && /* @__PURE__ */ n("span", { children: [
        "· ",
        s.repo
      ] }),
      s.issue_url && /* @__PURE__ */ t("a", { href: s.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, s.id)) });
}
function Zn({ repos: e, selected: r, onToggle: s, onClear: a, onAddWorkspace: l, onEdit: d }) {
  const m = e.reduce((v, h) => v + h.count, 0), i = r.size === 0, c = ({ name: v, count: h, label: _, checked: x, onClick: b, isAll: y }) => {
    const [w, z] = N(!1);
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
              onClick: b,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                y ? /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: x ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ t(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: x ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${x ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: x && /* @__PURE__ */ t("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ t("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ t(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: x ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: _
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
          !y && v && /* @__PURE__ */ t(
            "button",
            {
              onClick: (L) => {
                L.stopPropagation(), d(v);
              },
              title: `Edit pipeline "${_}"`,
              "aria-label": `Edit pipeline ${_}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: w ? 1 : 0,
                pointerEvents: w ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (L) => {
                const E = L.currentTarget;
                E.style.color = "var(--accent)", E.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (L) => {
                const E = L.currentTarget;
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
        e.map((v) => /* @__PURE__ */ t(
          c,
          {
            name: v.name,
            count: v.count,
            label: (Br.has(v.name) ? "Example: " : "") + (v.name.includes("/") ? v.name.split("/")[1] : v.name),
            checked: r.has(v.name),
            onClick: () => s(v.name)
          },
          v.name
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
function Qn({ initial: e, agentProfiles: r, crews: s, repo: a, stepName: l, onSave: d, onSaveCrew: m, onClose: i }) {
  const [c, v] = N(e.name || ""), [h, _] = N(e.role || ""), [x, b] = N(e.tools || ["read"]), [y, w] = N(e.model || "auto"), [z, L] = N(e.crew || ""), [E, F] = N(e.addenda || []), [$, P] = N(e.capability || ""), [J, k] = N(e.trust || ""), [re, R] = N(e.depth || ""), [xe, pe] = N(!1), me = r.find((S) => S.name === c), we = s.find((S) => S.name === z), je = [.../* @__PURE__ */ new Set([...Jn, ...x])], ee = (S) => {
    const K = qn({ name: c, role: h, tools: x, model: y, crew: z, addenda: E, capability: $, trust: J, depth: re }, S);
    v(K.name), b(K.tools || []), w(K.model || "auto"), K.capability && P(K.capability);
  }, W = (S) => b((K) => K.includes(S) ? K.filter((ae) => ae !== S) : [...K, S]), ne = () => F((S) => {
    var K;
    return S.length >= 3 ? S : [...S, { crew: ((K = s[0]) == null ? void 0 : K.name) || "", when: "always", writes: "" }];
  }), Ee = (S, K) => F((ae) => ae.map((_e, Fe) => Fe === S ? { ..._e, ...K } : _e)), Le = (S) => F((K) => K.filter((ae, _e) => _e !== S)), Se = c.trim().length > 0;
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
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: r.map((S) => /* @__PURE__ */ t(
          "button",
          {
            onClick: () => ee(S),
            disabled: S.status !== "loaded",
            title: S.description || S.name,
            className: "text-[11px] px-2 py-1 rounded-md font-medium disabled:opacity-40",
            style: {
              background: c === S.name ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: c === S.name ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: c === S.name ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: S.name
          },
          S.name
        )) }),
        me && /* @__PURE__ */ n("div", { className: "text-[10px] mt-1.5 rounded-md px-2 py-1.5", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
          "Loaded config: model ",
          /* @__PURE__ */ t("code", { children: me.model || "auto" }),
          " · ",
          me.tools.length,
          " declared tool",
          me.tools.length === 1 ? "" : "s",
          " · ",
          me.allowedTools.length,
          " auto-approved. The step objective below remains pipeline-local."
        ] })
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: c,
            onChange: (S) => v(S.target.value),
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
            onChange: (S) => _(S.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: je.map((S) => {
          const K = x.includes(S);
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => W(S),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: K ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: K ? "var(--accent)" : "var(--muted)",
                boxShadow: K ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: S
            },
            S
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
              onChange: (S) => P(S.target.value),
              className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "auto-derived" }),
                ["readonly", "authoring", "builder", "coordinator"].map((S) => /* @__PURE__ */ t("option", { value: S, children: S }, S))
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
            value: y,
            onChange: (S) => w(S.target.value),
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
              value: z,
              onChange: (S) => L(S.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "— none (use step agent) —" }),
                s.map((S) => /* @__PURE__ */ t("option", { value: S.name, children: S.name }, S.name))
              ]
            }
          )
        ] }),
        we && /* @__PURE__ */ n("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: [
          "Global route ",
          /* @__PURE__ */ t("code", { children: we.name }),
          " → ",
          /* @__PURE__ */ t("code", { children: we.kiroAgent || "profile unknown" }),
          we.workspace ? ` · workspace ${we.workspace}` : "",
          we.description ? ` · ${we.description}` : ""
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
        E.map((S, K) => /* @__PURE__ */ n("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ t(
            "select",
            {
              value: S.crew,
              onChange: (ae) => Ee(K, { crew: ae.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: s.map((ae) => /* @__PURE__ */ t("option", { value: ae.name, children: ae.name }, ae.name))
            }
          ),
          /* @__PURE__ */ n(
            "select",
            {
              value: S.when || "always",
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
              value: S.writes || "",
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
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...xt].map((S) => {
          const K = J === S;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => k(S),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: K ? S ? ar[S] : "var(--text)" : "var(--muted)", background: K ? "var(--bg-hover, var(--border))" : "transparent" },
              children: S || "inherit"
            },
            S || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Tt].map((S) => {
          const K = re === S;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => R(S),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: K ? S ? or[S] : "var(--text)" : "var(--muted)", background: K ? "var(--bg-hover, var(--border))" : "transparent" },
              children: S || "inherit"
            },
            S || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ n("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ t("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ t(
        "button",
        {
          disabled: !Se,
          onClick: () => d({
            name: c.trim(),
            role: h.trim() || void 0,
            tools: x,
            model: y.trim() && y.trim() !== "auto" ? y.trim() : void 0,
            crew: z || void 0,
            addenda: E.length ? E.filter((S) => S.crew) : void 0,
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
    xe && /* @__PURE__ */ t(
      dr,
      {
        profiles: r,
        crews: s,
        context: `${a || "unassigned pipeline"} · ${l || "unnamed step"}`,
        onSaveCrew: m,
        onClose: () => pe(!1),
        onSelectProfile: (S) => {
          ee(S), pe(!1);
        },
        onSelectCrew: (S) => {
          L(S.name), pe(!1);
        }
      }
    )
  ] });
}
function $r({ candidates: e, existingRepos: r, defaults: s, agentProfiles: a, crews: l, onCreate: d, onSaveCrew: m, onClose: i, editPipeline: c, cardCount: v, isExample: h, onDelete: _ }) {
  var at, Xe, Qe, ct, jt, Et, Lt, Pt, kt, wt, Nt, Ut, Ot, It, Wt;
  const x = !!c, [b, y] = N((c == null ? void 0 : c.repo) || ""), [w, z] = N((c == null ? void 0 : c.workspace) || "default"), [L, E] = N((c == null ? void 0 : c.repo_path) || ""), [F, $] = N((c == null ? void 0 : c.source) || "manual"), [P, J] = N((c == null ? void 0 : c.trust) || s.trust), [k, re] = N((c == null ? void 0 : c.depth) || s.depth), R = c == null ? void 0 : c.budget, [xe, pe] = N(
    R ? R.max_child_cards === "unlimited" && R.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [me, we] = N(
    () => R && R.max_child_cards !== "unlimited" && R.effort_ceiling !== "unlimited" ? { ...R } : Cr((c == null ? void 0 : c.depth) || s.depth)
  ), [je, ee] = N((c == null ? void 0 : c.backlog_intake) ?? !0), [W, ne] = N((c == null ? void 0 : c.results_in_repo) ?? !1), [Ee, Le] = N((c == null ? void 0 : c.conversation_log) ?? !1), [Se, S] = N(((c == null ? void 0 : c.trusted_authors) || []).join(`
`)), [K, ae] = N((c == null ? void 0 : c.self_enabling) ?? !1), [_e, Fe] = N((c == null ? void 0 : c.approach) || "simplified"), [le, te] = N((c == null ? void 0 : c.sync_mode) || "poll"), [V, fe] = N(() => {
    var g;
    return (g = c == null ? void 0 : c.steps) != null && g.length ? c.steps.map((j) => ({ ...j })) : rr.map((j) => ({ ...j }));
  }), [T, de] = N(null), [Ue, We] = N(""), [He, ge] = N("settings"), [vt, he] = N(!1), $e = (g) => g.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", Ze = (g, j) => fe((ye) => ye.map((Re, ce) => ce === g ? { ...Re, ...j } : Re)), rt = (g) => fe((j) => j.filter((ye, Re) => Re !== g)), lt = (g, j) => fe((ye) => {
    const Re = g + j;
    if (Re < 0 || Re >= ye.length) return ye;
    const ce = [...ye];
    return [ce[g], ce[Re]] = [ce[Re], ce[g]], ce;
  }), nt = (g) => fe((j) => [...j, {
    id: `${g}-${Math.random().toString(36).slice(2, 6)}`,
    name: g === "gate" ? "New Gate" : "New Step",
    type: g,
    agent: g === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), yt = (g) => {
    y(g.repo || ""), z(g.workspace || "default"), E(g.path || ""), $(g.source);
  }, Oe = (g) => {
    let j = (g || "").trim();
    if (!j) return "";
    const ye = j.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return ye && (j = ye[1]), j.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, ft = (g) => {
    const j = /github\.com|gitlab\.com/i.test(g);
    y(j ? Oe(g) : g), $("manual");
  }, it = [...new Map(
    Se.split(/[\n,]/).map((g) => g.trim()).filter(Boolean).map((g) => [g.toLowerCase(), g])
  ).values()], Je = it.every((g) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(g)), f = /^[A-Za-z0-9_.-]{1,80}$/.test(w), O = (/^[^/\s]+\/[^/\s]+$/.test(Oe(b)) || e.some((g) => g.repo && g.repo === b)) && Je && f, ie = !x && r.has(Oe(b)), ve = ({ value: g, options: j, tokens: ye, onPick: Re }) => /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: j.map((ce) => {
    const qt = g === ce;
    return /* @__PURE__ */ t(
      "button",
      {
        onClick: () => Re(ce),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: qt ? ye[ce] : "var(--muted)",
          background: qt ? `color-mix(in srgb, ${ye[ce]} 16%, transparent)` : "transparent",
          boxShadow: qt ? `inset 0 0 0 1px color-mix(in srgb, ${ye[ce]} 45%, transparent)` : "none"
        },
        children: ce
      },
      ce
    );
  }) }), Ne = { "issue-radar": [], workspace: [], manual: [] };
  e.forEach((g) => {
    var j;
    (Ne[j = g.source] || (Ne[j] = [])).push(g);
  });
  const Ie = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" }, Ae = x ? ["settings", "webhook", "danger"] : ["settings", "webhook"];
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
            vt && /* @__PURE__ */ t(
              dr,
              {
                profiles: a,
                crews: l,
                context: b || w,
                onSaveCrew: m,
                onClose: () => he(!1)
              }
            ),
            T !== null ? /* @__PURE__ */ t(
              Qn,
              {
                initial: {
                  name: ((Xe = (at = V[T]) == null ? void 0 : at.agent) == null ? void 0 : Xe.name) || "",
                  role: (ct = (Qe = V[T]) == null ? void 0 : Qe.agent) == null ? void 0 : ct.role,
                  tools: (Et = (jt = V[T]) == null ? void 0 : jt.agent) == null ? void 0 : Et.tools,
                  model: (Pt = (Lt = V[T]) == null ? void 0 : Lt.agent) == null ? void 0 : Pt.model,
                  crew: (wt = (kt = V[T]) == null ? void 0 : kt.agent) == null ? void 0 : wt.crew,
                  addenda: (Nt = V[T]) == null ? void 0 : Nt.addenda,
                  capability: (Ut = V[T]) == null ? void 0 : Ut.capability,
                  trust: (Ot = V[T]) == null ? void 0 : Ot.trust,
                  depth: (It = V[T]) == null ? void 0 : It.depth
                },
                agentProfiles: a,
                crews: l,
                repo: b,
                stepName: ((Wt = V[T]) == null ? void 0 : Wt.name) || "",
                onSaveCrew: m,
                onClose: () => de(null),
                onSave: (g) => {
                  Ze(T, {
                    agent: { name: g.name, role: g.role, tools: g.tools, model: g.model, crew: g.crew },
                    addenda: g.addenda,
                    capability: g.capability,
                    trust: g.trust,
                    depth: g.depth
                  }), de(null);
                }
              }
            ) : /* @__PURE__ */ n(Ve, { children: [
              /* @__PURE__ */ n("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ n("div", { children: [
                  /* @__PURE__ */ t("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: x ? "Edit Pipeline" : "New Pipeline" }),
                  /* @__PURE__ */ t("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: x ? b.includes("/") ? b.split("/")[1] : b : "Configure a pipeline for a repository or workspace" })
                ] }),
                /* @__PURE__ */ t("button", { onClick: i, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
              ] }),
              /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: Ae.map((g) => {
                const j = He === g, ye = g === "danger";
                return /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: () => ge(g),
                    className: "text-[12px] px-3 py-2 font-semibold transition-all",
                    style: {
                      color: j ? ye ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                      borderBottom: `2px solid ${j ? ye ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
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
                  style: { display: He === "settings" ? "flex" : "none" },
                  children: [
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: b,
                          onChange: (g) => ft(g.target.value),
                          onPaste: (g) => {
                            const j = g.clipboardData.getData("text");
                            /github\.com|gitlab\.com/i.test(j) && (g.preventDefault(), ft(j));
                          },
                          placeholder: "https://github.com/owner/name  ·  or  owner/name",
                          disabled: x,
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${ie ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                        }
                      ),
                      !x && b && Oe(b) !== b && /* @__PURE__ */ n("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                        "→ ",
                        /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: Oe(b) })
                      ] }),
                      ie && /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                      /* @__PURE__ */ t("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((g) => Ne[g].length > 0 && /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Ie[g] }),
                        /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1.5", children: Ne[g].map((j) => {
                          const ye = `${g}:${j.workspace || j.repo}:${j.path || ""}`, Re = j.source === "workspace" ? w === j.workspace && L === (j.path || "") : b === j.repo;
                          return /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => yt(j),
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
                            ye
                          );
                        }) })
                      ] }, g)) })
                    ] }),
                    /* @__PURE__ */ n("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspace partition" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: w,
                          onChange: (g) => z(g.target.value.trim()),
                          placeholder: "default",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${f ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ n("div", { className: "text-[10px] mt-1", style: { color: f ? "var(--muted)" : "var(--danger)" }, children: [
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
                          value: L,
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
                      /* @__PURE__ */ t(ve, { value: P, options: xt, tokens: ar, onPick: J })
                    ] }),
                    /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                      /* @__PURE__ */ t(ve, { value: k, options: Tt, tokens: or, onPick: re })
                    ] }),
                    /* @__PURE__ */ n("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ n("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                        /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                      ] }),
                      /* @__PURE__ */ t(
                        ve,
                        {
                          value: xe,
                          options: ["depth", "custom", "unlimited"],
                          tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                          onPick: pe
                        }
                      )
                    ] }),
                    xe === "depth" && (() => {
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
                    xe === "unlimited" && /* @__PURE__ */ t("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                    xe === "custom" && /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ n("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max child cards",
                        /* @__PURE__ */ t(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: me.max_child_cards,
                            onChange: (g) => we((j) => ({ ...j, max_child_cards: Math.max(0, Number(g.target.value) || 0) })),
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
                            value: me.effort_ceiling,
                            onChange: (g) => we((j) => ({ ...j, effort_ceiling: Math.max(0, Number(g.target.value) || 0) })),
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
                            value: me.max_feature_size,
                            onChange: (g) => we((j) => ({ ...j, max_feature_size: g.target.value })),
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
                            value: me.addenda,
                            onChange: (g) => we((j) => ({ ...j, addenda: g.target.value })),
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
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: le === "webhook" ? "Webhook is the fast path; the safety-net poll reconciles this pipeline on a longer window. Requires the app-wide webhook receiver enabled — falls back to polling if it is not." : "Poll reconciles this pipeline every cycle (default). Correct when no webhook is configured." })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex rounded-md overflow-hidden flex-shrink-0", style: { border: "1px solid var(--border)" }, children: ["poll", "webhook"].map((g) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => te(g),
                          className: "text-[11px] px-2.5 py-1 font-semibold",
                          style: {
                            background: le === g ? "var(--accent)" : "transparent",
                            color: le === g ? "var(--bg)" : "var(--muted)"
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
                          style: { background: W ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: W ? 20 : 2 }
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
                          value: Se,
                          onChange: (g) => S(g.target.value),
                          rows: 2,
                          placeholder: "Defaults to the authenticated GitHub user",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Je ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ n("div", { className: "text-[10px] mt-1", style: { color: Je ? "var(--muted)" : "var(--danger)" }, children: [
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
                          onClick: () => Fe(g),
                          className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                          style: {
                            background: _e === g ? "var(--accent)" : "transparent",
                            color: _e === g ? "var(--bg)" : "var(--muted)",
                            border: `1px solid ${_e === g ? "var(--accent)" : "var(--border)"}`
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
                              onClick: () => he(!0),
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
                        var ye, Re;
                        return /* @__PURE__ */ n(
                          "div",
                          {
                            className: "rounded-md p-2",
                            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${g.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                            children: [
                              /* @__PURE__ */ n("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ n("div", { className: "flex flex-col", children: [
                                  /* @__PURE__ */ t("button", { onClick: () => lt(j, -1), disabled: j === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                  /* @__PURE__ */ t("button", { onClick: () => lt(j, 1), disabled: j === V.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                                ] }),
                                /* @__PURE__ */ t(
                                  "input",
                                  {
                                    value: g.name,
                                    onChange: (ce) => Ze(j, { name: ce.target.value, id: $e(ce.target.value) }),
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
                                /* @__PURE__ */ t("button", { onClick: () => rt(j), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                              ] }),
                              g.type === "agent" && /* @__PURE__ */ n("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                                /* @__PURE__ */ n(
                                  "button",
                                  {
                                    onClick: () => de(j),
                                    className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                    style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                    children: [
                                      "⚙ ",
                                      (ye = g.agent) != null && ye.name ? `Agent: ${g.agent.name}` : "Configure agent"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                                /* @__PURE__ */ n(
                                  "select",
                                  {
                                    value: g.trigger || "ask",
                                    onChange: (ce) => Ze(j, { trigger: ce.target.value === "ask" ? void 0 : ce.target.value }),
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
                                    onChange: (ce) => Ze(j, { trust: ce.target.value || void 0 }),
                                    className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                    children: [
                                      /* @__PURE__ */ t("option", { value: "", children: "inherit" }),
                                      xt.map((ce) => /* @__PURE__ */ t("option", { value: ce, children: ce }, ce))
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
              He === "webhook" && /* @__PURE__ */ t("div", { className: "px-5 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ t(Lr, {}) }),
              x && He === "danger" && _ && (() => {
                const g = b.includes("/") ? b.split("/")[1] : b, j = Ue.trim() === g;
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
                        v ?? 0,
                        " sample card",
                        (v ?? 0) === 1 ? "" : "s",
                        "). Remove it any time — it's demo data, not real work."
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => {
                            _(b), i();
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
                        v ?? 0,
                        " card",
                        (v ?? 0) === 1 ? "" : "s",
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
                          value: Ue,
                          onChange: (ye) => We(ye.target.value),
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
                            _(b), i();
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
                /* @__PURE__ */ t("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: He === "settings" ? "Cancel" : "Close" }),
                He === "settings" && /* @__PURE__ */ t(
                  "button",
                  {
                    disabled: !O || !x && ie,
                    onClick: () => d({
                      repo: Oe(b),
                      workspace: w,
                      ...L.trim() ? { repo_path: L.trim() } : {},
                      source: F,
                      trust: P,
                      depth: k,
                      budget: xe === "depth" ? void 0 : xe === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : me,
                      backlog_intake: je,
                      results_in_repo: W,
                      conversation_log: Ee,
                      trusted_authors: it,
                      self_enabling: K,
                      approach: _e,
                      sync_mode: le,
                      steps: V.map((g) => ({ ...g, label: `dlc:${g.id}` }))
                    }),
                    className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                    style: { background: "var(--accent)", color: "var(--bg)" },
                    children: x ? "Save Pipeline" : "Create Pipeline"
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
function Rt({ size: e = 12 }) {
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
  const [s, a] = N(""), l = De(""), d = De(""), m = De(null);
  return d.current = e || "", qe(() => {
    if (!r || !d.current.startsWith(l.current)) {
      l.current = d.current, a(d.current);
      return;
    }
    const i = () => {
      const c = d.current, v = l.current;
      if (v.length >= c.length) {
        m.current = null;
        return;
      }
      const h = Math.max(1, Math.ceil((c.length - v.length) / 12));
      l.current = c.slice(0, v.length + h), a(l.current), m.current = requestAnimationFrame(i);
    };
    return m.current == null && (m.current = requestAnimationFrame(i)), () => {
      m.current != null && (cancelAnimationFrame(m.current), m.current = null);
    };
  }, [e, r]), s;
}
(() => {
  try {
    const e = Number(typeof localStorage < "u" && localStorage.getItem("dlc-live-peek-lines"));
    return Number.isFinite(e) && e >= 2 && e <= 40 ? e : 14;
  } catch {
    return 14;
  }
})();
function ra({ tail: e, active: r }) {
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
const na = {
  loop: "⚙",
  "step-agent": "🤖",
  orchestrator: "🧠",
  human: "🧑"
}, aa = {
  loop: "var(--muted)",
  "step-agent": "var(--info)",
  orchestrator: "var(--accent)",
  human: "var(--ok)"
};
function oa({ card: e, events: r, children: s, parent: a, onOpenCard: l, onClose: d }) {
  const m = s && s.length > 0 || !!a;
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
                s.map((i) => /* @__PURE__ */ n(
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
                s.length > 0 && r.length === 0 && /* @__PURE__ */ n("div", { className: "text-[10px] mt-1.5 italic", style: { color: "var(--muted)" }, children: [
                  "This card fanned its work out to the ",
                  s.length,
                  " child card",
                  s.length > 1 ? "s" : "",
                  " above — the story lives there."
                ] })
              ] }),
              r.length === 0 ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: m ? "No events recorded on this card directly." : "No recorded events yet." }) : /* @__PURE__ */ t("ol", { className: "flex flex-col gap-2", children: r.map((i) => /* @__PURE__ */ n("li", { className: "flex gap-2 text-[12px]", children: [
                /* @__PURE__ */ t("span", { title: i.actor, "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", children: na[i.actor] || "•" }),
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
                  /* @__PURE__ */ n("div", { className: "text-[9px] mt-0.5", style: { color: aa[i.actor] || "var(--muted)" }, children: [
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
function pa() {
  const e = Rr(), r = zr();
  qe(() => {
    console.info(
      "[dlc-yolo] UI bundle build: v40 (themed confirm modal, reason-free maintain). prefers-reduced-motion:",
      typeof window < "u" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "REDUCE — drawer re-asserted, should play" : "no-preference"
    );
  }, []);
  const [s, a] = N([]), [l, d] = N([]), [m, i] = N({}), [c, v] = N(Ft), [h, _] = N(!0), [x, b] = N("pipeline"), [y, w] = N(/* @__PURE__ */ new Set()), [z, L] = N(!1), [E, F] = N(null), [$, P] = N([]), [J, k] = N([]), [re, R] = N([]), [xe, pe] = N(!1), [me, we] = N(!1), [je, ee] = N(!1), [W, ne] = N(!1), [Ee, Le] = N(!1), [Se, S] = N(!1), [K, ae] = N([]), _e = De(null);
  qe(() => {
    const o = _e.current;
    if (!o) return;
    let p = !1, u = 0, C = 0, A = 0;
    const D = 'button, a, input, textarea, select, [role="button"], .pill, [data-card-root], [data-no-pan]', I = (Z) => {
      Z.button !== 0 || Z.target.closest(D) || (p = !0, A = 0, u = Z.clientX, C = o.scrollLeft, o.style.cursor = "grabbing", o.style.userSelect = "none");
    }, q = (Z) => {
      var G;
      if (!p) return;
      const Y = Z.clientX - u;
      A = Math.max(A, Math.abs(Y)), o.scrollLeft = C - Y, A > 3 && ((G = o.setPointerCapture) == null || G.call(o, Z.pointerId));
    }, B = () => {
      p && (p = !1, o.style.cursor = "grab", o.style.userSelect = "");
    };
    return o.style.cursor = "grab", o.addEventListener("pointerdown", I), window.addEventListener("pointermove", q), window.addEventListener("pointerup", B), window.addEventListener("pointercancel", B), () => {
      o.removeEventListener("pointerdown", I), window.removeEventListener("pointermove", q), window.removeEventListener("pointerup", B), window.removeEventListener("pointercancel", B);
    };
  }, [h, x]);
  const Fe = De(!1), le = De(!1), te = De(/* @__PURE__ */ new Set()), V = De(/* @__PURE__ */ new Set()), [fe, T] = N({}), de = oe(
    (o) => e.get("/api/file-read?path=" + encodeURIComponent(o)),
    [e]
  ), Ue = oe((o) => e.get(o), [e]), We = oe(async (o = !1) => {
    try {
      const p = !le.current || o ? await er(de, Ue) : await fr(de, ut, Ue);
      ut = p.source === "endpoint" ? gt : p.path, le.current = p.source !== "unresolved";
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
      ), a(u.cards || []), d(u.pipelines || []), i({ github_webhook_history: u.github_webhook_history || [], scheduler_state: u.scheduler_state || null }), v({ ...Ft, ...u.config || {} });
    } catch (p) {
      console.error("Failed to fetch cards:", p);
    } finally {
      _(!1);
    }
  }, [de, Ue]), He = Te(() => {
    const o = /* @__PURE__ */ new Map();
    return l.forEach((p) => {
      o.has(p.repo) || o.set(p.repo, 0);
    }), s.forEach((p) => {
      var C;
      const u = ((C = p.source) == null ? void 0 : C.repo) || "unlinked";
      o.set(u, (o.get(u) || 0) + 1);
    }), [...o.entries()].map(([p, u]) => ({ name: p, count: u })).sort((p, u) => u.count - p.count);
  }, [s, l]), ge = Te(
    () => y.size === 0 ? s : s.filter((o) => {
      var p;
      return y.has(((p = o.source) == null ? void 0 : p.repo) || "unlinked");
    }),
    [s, y]
  );
  qe(() => {
    V.current = new Set(s.map((o) => o.id)), te.current = new Set(s.flatMap(
      (o) => Object.values(o.step_sessions || {}).filter((p) => !!p.slot_key && !p.chat_disabled_at && !p.superseded).map((p) => p.slot_key)
    ));
  }, [s]), qe(() => {
    let o = !1, p = null, u, C = 0;
    const A = () => {
      if (o) return;
      const D = window.location.protocol === "https:" ? "wss:" : "ws:";
      p = new WebSocket(`${D}//${window.location.host}/api/ws`), p.onopen = () => {
        C = 0;
      }, p.onmessage = (I) => {
        if (typeof I.data == "string")
          try {
            const q = JSON.parse(I.data), B = q == null ? void 0 : q.data;
            if (q.type === "slots" && Array.isArray(B)) {
              const Y = new Set(te.current), G = [];
              for (const H of B) {
                const M = (H == null ? void 0 : H.key) || (H == null ? void 0 : H.slot) || (H == null ? void 0 : H.name), Me = String((H == null ? void 0 : H.title) || (H == null ? void 0 : H.name) || "");
                typeof M == "string" && M.startsWith("cron-") && [...V.current].some((Be) => Me.includes(Be)) && Y.add(M), typeof M == "string" && (H != null && H.running) && Y.has(M) && G.push(M);
              }
              te.current = Y, G.length && T((H) => {
                let M = H;
                for (const Me of G) {
                  const Be = ur(H[Me]);
                  Be !== H[Me] && (M = { ...M, [Me]: Be });
                }
                return M;
              });
              return;
            }
            if (q.type === "subagent_spawn" || q.type === "subagent_chunk" || q.type === "subagent_done") {
              const Y = typeof (B == null ? void 0 : B.id) == "string" ? B.id : null;
              if (!Y || !V.current.has(Y)) return;
              const G = `card:${Y}`;
              T((H) => {
                const M = H[G];
                if (q.type === "subagent_spawn") {
                  const Be = typeof (B == null ? void 0 : B.agent) == "string" ? B.agent : B != null && B.task ? String(B.task).slice(0, 40) : "agent", Q = (M != null && M.buffer ? `
` : "") + `── ${Be} ──
`, ue = sr(
                    M != null && M.active ? M : { buffer: (M == null ? void 0 : M.buffer) || "", tail: "", active: !0, phase: "crew", seq: (M == null ? void 0 : M.seq) || 0 },
                    Q,
                    ((M == null ? void 0 : M.seq) || 0) + 1
                  );
                  return { ...H, [G]: ue };
                }
                if (q.type === "subagent_chunk" && typeof B.text == "string") {
                  const Be = sr(M, B.text, Number(B.seq));
                  return Be === M ? H : { ...H, [G]: Be };
                }
                const Me = mr(M);
                return Me === M ? H : { ...H, [G]: Me };
              });
              return;
            }
            const Z = B == null ? void 0 : B.slot;
            if (!Z || !te.current.has(Z))
              return;
            q.type === "chat_status" && String(B.status || "").toLowerCase().startsWith("thinking") || q.type === "chat_thinking" ? T((Y) => {
              const G = ur(Y[Z], q.type === "chat_status");
              return G === Y[Z] ? Y : { ...Y, [Z]: G };
            }) : q.type === "chat_chunk" && typeof B.content == "string" ? T((Y) => {
              const G = sr(Y[Z], B.content, Number(B.seq));
              return G === Y[Z] ? Y : { ...Y, [Z]: G };
            }) : q.type === "chat_done" && T((Y) => {
              const G = mr(Y[Z]);
              return G === Y[Z] ? Y : { ...Y, [Z]: G };
            });
          } catch {
          }
      }, p.onclose = () => {
        if (o) return;
        const I = Math.min(1e3 * 2 ** C++, 15e3);
        u = setTimeout(A, I);
      }, p.onerror = () => p == null ? void 0 : p.close();
    };
    return A(), () => {
      o = !0, u && clearTimeout(u), p == null || p.close();
    };
  }, []), qe(() => {
    if (!je) return;
    const o = (p) => {
      p.key === "Escape" && ee(!1);
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, [je]);
  const vt = 6e5, he = Te(() => {
    var u, C, A, D;
    const o = [], p = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked", "retired"]);
    for (const I of ge) {
      if (p.has(String(I.lifecycle || "").toLowerCase())) continue;
      const q = I.step_status || {}, B = I.step_sessions || {}, Z = l.find((G) => G.id === I.pipeline_id) || l.find((G) => {
        var H;
        return G.repo === ((H = I.source) == null ? void 0 : H.repo);
      }), Y = /* @__PURE__ */ new Set([...Object.keys(q), ...Object.keys(B)]);
      for (const G of Y) {
        const H = q[G] || "idle", M = B[G], Me = H === "pending" || H === "error", Be = !!(M && (M.chat_disabled_at || M.superseded || M.retired_at || M.cron_pause_observed_at || M.retention === "released")), Q = !!(M != null && M.slot_key) && !Be;
        if (!Me && !Q || !Me && Be) continue;
        const ue = (u = I.pending_at) == null ? void 0 : u[G], et = Me && !!ue && Date.now() - new Date(ue).getTime() > vt, se = (C = Z == null ? void 0 : Z.steps) == null ? void 0 : C.find((Pe) => Pe.id === G), Ge = (M == null ? void 0 : M.agent) || ((A = se == null ? void 0 : se.agent) == null ? void 0 : A.crew) || ((D = se == null ? void 0 : se.agent) == null ? void 0 : D.name) || "orchestrator", Ct = M == null ? void 0 : M.agent_id, Gt = M == null ? void 0 : M.slot_key, Kt = M == null ? void 0 : M.session_key, Vt = Ct ? K.some((Pe) => Pe.id === Ct) : Me && K.some((Pe) => (Pe.task || "").includes(I.id) || (Pe.task || "").includes(I.title)), Xt = !!(M != null && M.last_response_at) && (!M.last_response_handled_at || M.last_response_handled_at < M.last_response_at);
        o.push({ cardId: I.id, card: I.title || I.id, step: G, agent: Ge, stale: et, status: H, live: Vt, responsePending: Xt, agentId: Ct, slotKey: Gt, sessionKey: Kt, sessionName: M == null ? void 0 : M.name });
      }
    }
    return o;
  }, [ge, l, K]), $e = Te(() => {
    var A;
    let o;
    if (y.size === 1) {
      const D = [...y][0];
      o = (A = l.find((I) => I.repo === D)) == null ? void 0 : A.steps;
    } else l.length === 1 && (o = l[0].steps);
    const p = (o && o.length ? o : rr).map((D) => ({ ...D })), u = new Set(p.map((D) => D.id)), C = [];
    return u.has("intake") || C.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), C.push(...p), u.has("done") || C.push({ id: "done", name: "Done", type: "agent" }), C;
  }, [y, l]), Ze = Te(() => $e.map((o) => o.id), [$e]), rt = oe((o) => {
    var p;
    return ((p = $e.find((u) => u.id === o)) == null ? void 0 : p.type) === "gate" || o.startsWith("gate-");
  }, [$e]), lt = oe((o) => {
    var p, u;
    return ((u = (p = $e.find((C) => C.id === o)) == null ? void 0 : p.agent) == null ? void 0 : u.name) || Mn[o] || "unknown";
  }, [$e]), nt = oe((o) => {
    var A, D;
    const p = o.step_sessions || {}, u = Object.entries(p).find(
      ([, I]) => I.retained_for_gate === o.stage && I.retention !== "released"
    );
    let C = ((A = o.gate_review) == null ? void 0 : A.producer_step) || (u == null ? void 0 : u[0]);
    if (!C) {
      const I = l.find((G) => G.id === o.pipeline_id) || l.find((G) => {
        var H;
        return G.repo === ((H = o.source) == null ? void 0 : H.repo);
      }), q = (D = I == null ? void 0 : I.steps) != null && D.length ? I.steps : rr, B = [
        { id: "intake", name: "Intake", type: "agent" },
        ...q.filter((G) => G.id !== "intake" && G.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], Z = B.findIndex((G) => G.id === o.stage), Y = Z >= 0 ? B[Z] : void 0;
      if (C = Y == null ? void 0 : Y.reviews_step, !C && Z >= 0)
        for (let G = Z - 1; G >= 0; G--) {
          const H = B[G];
          if (!(H.id === "intake" || H.id === "done") && H.type !== "gate" && !H.id.startsWith("gate-")) {
            C = H.id;
            break;
          }
        }
    }
    return C;
  }, [l]), yt = oe((o) => {
    const p = nt(o);
    if (!p) return;
    const u = (o.step_sessions || {})[p];
    if (!(!(u != null && u.slot_key) || u.chat_disabled_at || u.superseded))
      return {
        step: p,
        slotKey: u.slot_key,
        retained: u.retention === "held-for-gate"
      };
  }, [nt]);
  qe(() => {
    const o = async () => {
      try {
        const C = ut.slice(0, ut.lastIndexOf("/")), A = (C ? C + "/" : "") + "live_spawns.json", D = await e.get("/api/file-read?path=" + encodeURIComponent(A));
        Fe.current = !1;
        const I = D != null && D.at ? Date.now() - new Date(D.at).getTime() < 18e4 : !0;
        ae(I && Array.isArray(D == null ? void 0 : D.runs) ? D.runs : []);
      } catch {
        Fe.current = !0, ae([]);
      }
    };
    let p = 0;
    We(!0).then(o);
    const u = setInterval(() => {
      p += 1;
      const C = p % 12 === 0;
      We(C).then(() => {
        Fe.current || o();
      });
    }, 1e4);
    return () => clearInterval(u);
  }, [We, e]);
  const Oe = oe(async () => {
    we(!0);
    let o = [];
    try {
      const u = await de("~/.kiro/crew/config.json");
      o = En(u == null ? void 0 : u.agents), k(o);
    } catch (u) {
      console.warn("crew roster (config.json) unreadable:", u), k([]);
    }
    const p = await Promise.all(Ln(o).map(async (u) => {
      const C = On(u, o);
      if (!C) return lr(null, u);
      try {
        const A = await de(C);
        return lr(A, u, C);
      } catch {
        return lr(null, u, C);
      }
    }));
    R(p), we(!1);
  }, [de]), ft = oe(() => {
    pe(!0), Oe();
  }, [Oe]), it = oe((o) => {
    Oe().then(() => F(o));
  }, [Oe]), Je = oe(async (o) => {
    await e.post("/apps/dlc-yolo/api/agents/crew", {
      mode: o.mode,
      name: o.name,
      kiro_agent: o.kiroAgent,
      workspace: o.workspace || null,
      memory_store: o.memoryStore || null
    }), await Oe();
  }, [e, Oe]), f = oe(async (o) => {
    try {
      const p = await er(de, Ue);
      ut = p.source === "endpoint" ? gt : p.path, p.data.cards = p.data.cards || [], o(p.data);
      let u = p;
      try {
        u = await er(de, Ue), ut = u.source === "endpoint" ? gt : u.path, u.data.cards = u.data.cards || [], o(u.data);
      } catch {
        u = p;
      }
      try {
        await e.post("/apps/dlc-yolo/api/state", u.data);
      } catch (C) {
        console.warn("[dlc-yolo] uncapped state POST failed; falling back to file-write (capped):", C), await e.post("/api/file-write", {
          path: u.source === "endpoint" ? gt : u.path,
          content: JSON.stringify(u.data, null, 2)
        });
      }
      We();
    } catch (p) {
      console.error("Failed to mutate state:", p);
    }
  }, [e, We, de, Ue]), O = oe((o) => {
    v((p) => ({ ...p, ...o })), f((p) => {
      p.config = { ...Ft, ...p.config || {}, ...o };
    });
  }, [f]), ie = oe((o, p, u, C) => {
    const A = (/* @__PURE__ */ new Date()).toISOString(), D = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    f((I) => {
      var G;
      const q = I.cards.find((H) => H.id === o);
      if (!q || q.stage !== p) return;
      if (C === void 0 && u.type === "interject") {
        const H = u.text.trim();
        if (!H) return;
        q.interjection = q.interjection || [], q.interjection.some((M) => M.id === D) || q.interjection.push({
          id: D,
          at: A,
          step: p,
          kind: u.kind,
          text: H,
          by: "user",
          status: "pending"
        }), q.updated_at = A;
        return;
      }
      if ((((G = q.gate_review) == null ? void 0 : G.result_revision) ?? null) !== C) return;
      const Z = u.type === "reject" ? u.reason.trim() : void 0, Y = u.type === "interject" ? u.text.trim() : void 0;
      u.type === "reject" && !Z || u.type === "interject" && !Y || (q.gate_commands = q.gate_commands || [], q.gate_commands.some((H) => H.id === D) || q.gate_commands.push({
        id: D,
        gate: p,
        action: u.type,
        expected_revision: C ?? null,
        actor: "user",
        at: A,
        status: "pending",
        ...Z ? { reason: Z } : {},
        ...u.type === "interject" ? { kind: u.kind, text: Y } : {}
      }), q.updated_at = A);
    });
  }, [f]), ve = oe((o, p, u) => {
    const C = (/* @__PURE__ */ new Date()).toISOString(), A = Cn();
    f((D) => {
      const I = D.cards.find((B) => B.id === o);
      if (!I) {
        console.warn("[dlc-yolo maintain] card not found in state:", o);
        return;
      }
      let q;
      try {
        q = $n({ id: A, kind: p, text: u, card: I, now: C });
      } catch (B) {
        console.warn("[dlc-yolo maintain] buildRequest threw:", B);
        return;
      }
      I.interjection = An(I.interjection, q), I.updated_at = C, console.info("[dlc-yolo maintain] appended request to card", o, "- interjection count now", (I.interjection || []).length);
    });
  }, [f]), Ne = oe((o) => {
    if (!window.confirm("Cancel this card? Writes are revoked cooperatively — a live turn may not stop immediately, and its worktree is retained until terminal observation.")) return;
    const p = (/* @__PURE__ */ new Date()).toISOString();
    f((u) => {
      const C = u.cards.find((A) => A.id === o);
      C && (C.lifecycle = "cancelled", C.writes_allowed = !1, C.cancel_requested_at = p, C.updated_at = p);
    });
  }, [f]), Ie = oe((o, p, u) => {
    f((C) => {
      const A = C.cards.find((I) => I.id === o);
      if (!A) return;
      const D = (A.decisions || []).find((I) => I.id === p);
      if (D) {
        const I = (/* @__PURE__ */ new Date()).toISOString();
        D.chosen = u && u.trim() ? u.trim() : "acknowledged", D.status = u ? "resolved" : "acknowledged", D.resolved_at = I, D.resolved_by = "user";
      }
      A.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [f]), Ae = oe(async (o) => {
    var C, A, D;
    const u = ((I) => {
      var Z;
      const q = I == null ? void 0 : I.orchestrator_session;
      if (q != null && q.slot_key) return q.slot_key;
      if (q != null && q.session_key) return q.session_key.replace(/^cron:/, "cron-");
      const B = (Z = l.find((Y) => Y.id === (I == null ? void 0 : I.pipeline_id))) == null ? void 0 : Z.orchestrator_session;
      return (B == null ? void 0 : B.slot_key) || (B != null && B.session_key ? B.session_key.replace(/^cron:/, "cron-") : void 0);
    })(o);
    if (u) {
      r(`/chat?sid=${encodeURIComponent(u)}`);
      return;
    }
    try {
      const I = await e.post("/apps/dlc-yolo/api/orchestrator/trigger", { card_id: o.id });
      if (I != null && I.slot_key) {
        r(`/chat?sid=${encodeURIComponent(I.slot_key)}`);
        return;
      }
    } catch {
    }
    for (let I = 0; I < 8; I++) {
      await new Promise((q) => setTimeout(q, 2e3));
      try {
        const q = await fr(de, ut), B = (q.data.cards || []).find((G) => G.id === o.id), Z = (C = (q.data.pipelines || []).find((G) => G.id === (B == null ? void 0 : B.pipeline_id))) == null ? void 0 : C.orchestrator_session, Y = ((A = B == null ? void 0 : B.orchestrator_session) == null ? void 0 : A.slot_key) || (((D = B == null ? void 0 : B.orchestrator_session) == null ? void 0 : D.session_key) || (Z == null ? void 0 : Z.session_key) || "").replace(/^cron:/, "cron-") || (Z == null ? void 0 : Z.slot_key);
        if (Y) {
          We(), r(`/chat?sid=${encodeURIComponent(Y)}`);
          return;
        }
      } catch {
      }
    }
    We();
  }, [e, r, de, We]), at = oe((o) => {
    f((p) => {
      var A;
      const u = p.cards.find((D) => D.id === o);
      if (!u) return;
      const C = u.trust || ((A = p.config) == null ? void 0 : A.trust) || Ft.trust;
      u.trust = xt[(xt.indexOf(C) + 1) % xt.length], u.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [f]), Xe = oe((o) => {
    f((p) => {
      var A;
      const u = p.cards.find((D) => D.id === o);
      if (!u) return;
      const C = u.depth || ((A = p.config) == null ? void 0 : A.depth) || Ft.depth;
      u.depth = Tt[(Tt.indexOf(C) + 1) % Tt.length], u.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [f]), Qe = oe((o, p) => {
    f((u) => {
      const C = u.cards.find((A) => A.id === o);
      C && (p ? C.budget = { ...p } : delete C.budget, C.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [f]), ct = oe((o) => {
    w((p) => {
      const u = new Set(p);
      return u.has(o) ? u.delete(o) : u.add(o), u;
    });
  }, []), jt = oe(() => w(/* @__PURE__ */ new Set()), []), Et = oe(async () => {
    const o = Oe(), p = [];
    try {
      const u = await e.get("/api/file-read?path=~/.kiro/crew/config.json"), C = (u == null ? void 0 : u.workspaces) || {};
      Object.entries(C).forEach(([A, D]) => {
        const I = typeof (D == null ? void 0 : D.repo) == "string" && /^[^/\s]+\/[^/\s]+$/.test(D.repo) ? D.repo : "";
        p.push({
          repo: I,
          workspace: A,
          label: A,
          source: "workspace",
          detail: (D == null ? void 0 : D.dir) || A,
          path: typeof (D == null ? void 0 : D.dir) == "string" ? D.dir : void 0
        });
      });
    } catch (u) {
      console.warn("workspaces registry unreadable:", u);
    }
    try {
      const u = await e.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((u == null ? void 0 : u.repos) || []).forEach((C) => {
        C != null && C.owner && (C != null && C.repo) && p.push({ repo: `${C.owner}/${C.repo}`, source: "issue-radar", detail: `${C.provider || "github"} · ${C.host || "github.com"}` });
      });
    } catch (u) {
      console.warn("issue-radar config unreadable (app may not be installed):", u);
    }
    P(p), await o, L(!0);
  }, [e, Oe]), Lt = oe(async (o) => {
    const p = (/* @__PURE__ */ new Date()).toISOString(), u = "pl-" + Math.random().toString(36).slice(2, 10);
    await f((C) => {
      C.pipelines = C.pipelines || [];
      const A = C.pipelines.find((D) => D.repo === o.repo);
      A ? (A.source = o.source, A.workspace = o.workspace, o.repo_path ? A.repo_path = o.repo_path : delete A.repo_path, A.trust = o.trust, A.depth = o.depth, o.budget ? A.budget = o.budget : delete A.budget, A.backlog_intake = o.backlog_intake, A.results_in_repo = o.results_in_repo, A.conversation_log = o.conversation_log, o.trusted_authors.length ? A.trusted_authors = o.trusted_authors : delete A.trusted_authors, A.self_enabling = o.self_enabling, A.approach = o.approach, o.sync_mode ? A.sync_mode = o.sync_mode : delete A.sync_mode, A.steps = o.steps) : C.pipelines.push({
        id: u,
        repo: o.repo,
        workspace: o.workspace,
        ...o.repo_path ? { repo_path: o.repo_path } : {},
        source: o.source,
        trust: o.trust,
        depth: o.depth,
        backlog_intake: o.backlog_intake,
        ...o.budget ? { budget: o.budget } : {},
        results_in_repo: o.results_in_repo,
        conversation_log: o.conversation_log,
        ...o.trusted_authors.length ? { trusted_authors: o.trusted_authors } : {},
        self_enabling: o.self_enabling,
        approach: o.approach,
        ...o.sync_mode && o.sync_mode !== "poll" ? { sync_mode: o.sync_mode } : {},
        sot: "github",
        steps: o.steps,
        created_at: p
      });
    }), L(!1), F(null), w(/* @__PURE__ */ new Set([o.repo]));
  }, [f]), Pt = oe(async (o) => {
    await f((p) => {
      p.pipelines = (p.pipelines || []).filter((u) => u.repo !== o), p.cards = (p.cards || []).filter((u) => {
        var C;
        return (((C = u.source) == null ? void 0 : C.repo) || "unlinked") !== o;
      });
    }), w((p) => {
      const u = new Set(p);
      return u.delete(o), u;
    });
  }, [f]), kt = Te(() => {
    const o = /* @__PURE__ */ new Set(["retired", "cancelled", "canceled", "merged", "superseded"]);
    return Ze.reduce((p, u) => (p[u] = ge.filter((C) => C.stage === u && !o.has(String(C.lifecycle || ""))), p), {});
  }, [ge, Ze]), wt = Te(
    () => ge.filter((o) => ["retired", "merged"].includes(String(o.lifecycle || ""))),
    [ge]
  ), Nt = Te(
    () => ge.filter((o) => ["cancelled", "canceled", "superseded"].includes(String(o.lifecycle || ""))),
    [ge]
  ), Ut = oe((o) => {
    var p;
    (p = document.getElementById(`stage-col-${o}`)) == null || p.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), Ot = Te(() => {
    const o = {};
    return ge.forEach((p) => {
      var C;
      const u = ((C = p.source) == null ? void 0 : C.repo) || "unlinked";
      (o[u] || (o[u] = [])).push(p);
    }), o;
  }, [ge]), It = Te(() => {
    const o = {};
    return ge.forEach((p) => {
      const u = lt(p.stage);
      (o[u] || (o[u] = [])).push(p);
    }), o;
  }, [ge, lt]), Wt = Te(() => {
    const o = Object.fromEntries(xr.map((p) => [p, []]));
    return ge.forEach((p) => {
      var D, I;
      const u = l.find((q) => q.id === p.pipeline_id) || l.find((q) => {
        var B;
        return q.repo === ((B = p.source) == null ? void 0 : B.repo);
      }), C = ((I = (D = u == null ? void 0 : u.steps) == null ? void 0 : D.find((q) => q.id === p.stage)) == null ? void 0 : I.type) === "gate" || rt(p.stage), A = he.some((q) => q.cardId === p.id && q.step === p.stage && q.live);
      o[wr(p, { isGate: C, liveObserved: A }).kind].push(p);
    }), Object.fromEntries(xr.filter((p) => o[p].length > 0).map((p) => [Or[p].label, o[p]]));
  }, [ge, l, rt, he]), g = /* @__PURE__ */ new Set(["retired", "merged", "cancelled", "canceled", "superseded"]), j = ge.filter((o) => !g.has(String(o.lifecycle || ""))).length, ye = ge.filter((o) => rt(o.stage) && !g.has(String(o.lifecycle || ""))).length, Re = ge.filter((o) => g.has(String(o.lifecycle || ""))).length, ce = ge.reduce((o, p) => {
    var u;
    return o + (((u = p.parked) == null ? void 0 : u.length) || 0);
  }, 0), qt = {
    pipeline: ge.length,
    workspace: Object.keys(Ot).length,
    crew: Object.keys(It).length,
    status: ge.length,
    backlog: ce
  }, Mt = he.some((o) => {
    var p, u;
    return !!o.slotKey && ((p = fe[o.slotKey]) == null ? void 0 : p.active) && ((u = fe[o.slotKey]) == null ? void 0 : u.phase) === "generating";
  }), Ht = he.some((o) => {
    var p, u;
    return !!o.slotKey && ((p = fe[o.slotKey]) == null ? void 0 : p.active) && ((u = fe[o.slotKey]) == null ? void 0 : u.phase) === "thinking";
  }), _t = (o) => {
    var H, M, Me, Be;
    const p = l.find((Q) => Q.id === o.pipeline_id) || l.find((Q) => {
      var ue;
      return Q.repo === ((ue = o.source) == null ? void 0 : ue.repo);
    }), u = ((M = (H = p == null ? void 0 : p.steps) == null ? void 0 : H.find((Q) => Q.id === o.stage)) == null ? void 0 : M.type) === "gate" || rt(o.stage), C = ["cancelled", "canceled", "retired", "merged", "superseded"].includes(String(o.lifecycle || "")), A = u && !C, D = A ? ((Me = o.gate_review) == null ? void 0 : Me.result_revision) ?? null : void 0, I = A ? nt(o) : void 0, q = A ? yt(o) : void 0, B = he.some((Q) => Q.cardId === o.id && Q.step === o.stage && Q.live), Z = wr(o, { isGate: A, liveObserved: B }), Y = (Be = p == null ? void 0 : p.steps) == null ? void 0 : Be.find((Q) => Q.id === o.stage), G = o.capability || (Y == null ? void 0 : Y.capability) || "auto-derived";
    return {
      card: o,
      config: c,
      isGate: A,
      cardStatus: Z,
      effectiveCapability: G,
      producerStep: I,
      producerSession: q,
      onOpenProducer: q ? () => r(`/chat?sid=${encodeURIComponent(q.slotKey)}`) : void 0,
      onApprove: A ? () => ie(o.id, o.stage, { type: "approve" }, D) : void 0,
      onReject: A ? (Q) => ie(o.id, o.stage, { type: "reject", reason: Q }, D) : void 0,
      onCycleTrust: () => at(o.id),
      onCycleDepth: () => Xe(o.id),
      onSetBudget: (Q) => Qe(o.id, Q),
      onInterject: (Q, ue) => ie(
        o.id,
        o.stage,
        { type: "interject", kind: Q, text: ue },
        D
      ),
      onResolveDecision: (Q, ue) => Ie(o.id, Q, ue),
      onOpenOrchestrator: () => Ae(o),
      liveView: (() => {
        var Gt, Kt, Vt, Xt;
        const Q = (Kt = (Gt = o.step_sessions) == null ? void 0 : Gt[o.stage]) == null ? void 0 : Kt.slot_key, ue = Q ? fe[Q] : void 0, et = he.some((Pe) => Pe.cardId === o.id && Pe.step === o.stage && Pe.live), se = fe[`card:${o.id}`], Ge = Kr((Vt = o.step_progress) == null ? void 0 : Vt[o.stage]), Ct = !!Ge && (et || ((Xt = o.step_status) == null ? void 0 : Xt[o.stage]) === "pending");
        if (Ge && (Ct || se != null && se.buffer || se != null && se.tail)) {
          const Pe = !!(se != null && se.active);
          return {
            stage: o.stage,
            phase: Pe ? "crew" : Ge.phase,
            tail: Pe && (se == null ? void 0 : se.tail) || Ge.tail,
            buffer: Ge.buffer || Ge.tail || "",
            active: !!(Ct || Pe),
            seq: Ge.seq,
            slotKey: Q || "",
            source: "progress-trail",
            onOpen: () => Q && r(`/chat?sid=${encodeURIComponent(Q)}`)
          };
        }
        if (se && (se.buffer || se.tail))
          return {
            stage: o.stage,
            phase: se.active ? "crew" : "idle",
            tail: se.tail || "",
            buffer: se.buffer || "",
            active: !!se.active,
            seq: se.seq || 0,
            slotKey: Q || "",
            onOpen: () => Q && r(`/chat?sid=${encodeURIComponent(Q)}`)
          };
        if (ue != null && ue.active)
          return {
            stage: o.stage,
            phase: ue.phase || "running",
            tail: ue.tail || "",
            buffer: ue.buffer || "",
            active: !!ue.active && et,
            seq: ue.seq || 0,
            slotKey: Q,
            onOpen: () => r(`/chat?sid=${encodeURIComponent(Q)}`)
          };
      })(),
      allCards: ge,
      onRequest: (Q, ue) => ve(o.id, Q, ue),
      onOpenStepSession: (() => {
        const Q = o.step_sessions;
        if (!Q || typeof Q != "object") return;
        const ue = Object.entries(Q).map(([et, se]) => {
          const Ge = (se == null ? void 0 : se.slot_key) || (se != null && se.session_key ? se.session_key.replace(/^cron:/, "cron-") : void 0);
          return Ge ? { step: et, open: () => r(`/chat?sid=${encodeURIComponent(Ge)}`) } : null;
        }).filter((et) => et !== null);
        return ue.length ? ue : void 0;
      })(),
      onCancelCard: () => Ne(o.id),
      onOpenCard: (Q) => {
        const ue = document.getElementById(`card-${Q}`);
        if (ue) {
          ue.scrollIntoView({ behavior: "smooth", block: "center" });
          const et = ue.style.outline;
          ue.style.outline = "2px solid var(--accent)", setTimeout(() => {
            ue.style.outline = et;
          }, 1400);
        }
      }
    };
  };
  return /* @__PURE__ */ n(Ve, { children: [
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
      xe && /* @__PURE__ */ t(
        dr,
        {
          profiles: re,
          crews: J,
          loading: me,
          context: y.size === 1 ? [...y][0] : void 0,
          onRefresh: () => {
            Oe();
          },
          onSaveCrew: Je,
          onClose: () => pe(!1)
        }
      ),
      W && /* @__PURE__ */ t(
        "div",
        {
          className: "fixed inset-0 z-50 flex items-center justify-center p-4",
          style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
          onMouseDown: (o) => {
            o.currentTarget === o.target && ne(!1);
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
                    pipeline: l.find((o) => ge.some((p) => p.pipeline_id === o.id)) || l[0],
                    cards: ge,
                    extras: m,
                    onOpenCard: (o) => {
                      ne(!1), b("pipeline"), setTimeout(() => {
                        const p = document.getElementById(`card-${o}`);
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
          onMouseDown: (o) => {
            o.currentTarget === o.target && Le(!1);
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
                    ce ? ` · ${ce}` : ""
                  ] }),
                  /* @__PURE__ */ t("button", { onClick: () => Le(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
                ] }),
                /* @__PURE__ */ t("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ t(Yn, { cards: ge }) })
              ]
            }
          )
        }
      ),
      Se && /* @__PURE__ */ t(
        Un,
        {
          cards: ge,
          schedulerState: m.scheduler_state,
          statePath: ut,
          readAppFile: de,
          onClose: () => S(!1)
        }
      ),
      je && /* @__PURE__ */ t(
        "div",
        {
          className: "fixed inset-0 z-50 flex items-center justify-center p-4",
          style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
          onMouseDown: (o) => {
            o.currentTarget === o.target && ee(!1);
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
                      /* @__PURE__ */ t("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: he.length })
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
                /* @__PURE__ */ t("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: he.length === 0 ? /* @__PURE__ */ t("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : he.map((o) => {
                  const p = o.slotKey ? fe[o.slotKey] : void 0;
                  return /* @__PURE__ */ n(
                    "div",
                    {
                      className: "rounded-lg px-3 py-2.5",
                      style: { background: o.responsePending ? "color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))" : "var(--bg, transparent)", border: "1px solid var(--border)" },
                      children: [
                        /* @__PURE__ */ n("div", { className: "flex items-center gap-2 text-[11px] min-w-0", children: [
                          /* @__PURE__ */ t(
                            "span",
                            {
                              className: o.status === "pending" || o.responsePending ? "inline-block animate-pulse flex-shrink-0" : "inline-block flex-shrink-0",
                              style: { width: 7, height: 7, borderRadius: 999, background: o.stale ? "var(--warn)" : o.responsePending || o.status === "pending" ? "var(--accent)" : "var(--muted)" }
                            }
                          ),
                          /* @__PURE__ */ t("span", { className: "font-semibold flex-shrink-0", style: { color: "var(--accent)" }, title: o.sessionName || void 0, children: o.agent }),
                          /* @__PURE__ */ n("span", { className: "truncate", style: { color: "var(--muted)" }, children: [
                            "· ",
                            o.step
                          ] }),
                          /* @__PURE__ */ t("span", { className: "ml-auto truncate max-w-[220px]", style: { color: "var(--text, var(--muted))" }, title: o.card, children: o.card }),
                          /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: o.responsePending ? "var(--warn)" : o.status === "pending" ? "var(--ok)" : "var(--muted)" }, children: o.responsePending ? "response" : o.status }),
                          o.stale && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, title: "stale — will be reclaimed", children: "↻" })
                        ] }),
                        (p == null ? void 0 : p.active) && p.phase === "thinking" && /* @__PURE__ */ n("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                          /* @__PURE__ */ t(Rt, { size: 13 }),
                          /* @__PURE__ */ t("span", { children: "Thinking" })
                        ] }),
                        (p == null ? void 0 : p.active) && p.phase === "generating" && p.tail && /* @__PURE__ */ n("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                          /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                          /* @__PURE__ */ n("span", { className: "font-mono text-[11px] truncate", children: [
                            "Generating · …",
                            p.tail
                          ] })
                        ] }),
                        o.slotKey && /* @__PURE__ */ n(
                          "button",
                          {
                            className: "mt-2 ml-4 font-mono",
                            style: { color: "var(--muted)", fontSize: 10, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
                            title: `Copy openable slot ${o.slotKey} (${o.sessionName || o.sessionKey}); open it from Chats`,
                            onClick: () => {
                              var u;
                              try {
                                (u = navigator.clipboard) == null || u.writeText(o.slotKey || "");
                              } catch {
                              }
                            },
                            children: [
                              "copy ",
                              o.slotKey.slice(0, 18)
                            ]
                          }
                        )
                      ]
                    },
                    `${o.card}:${o.step}`
                  );
                }) }),
                /* @__PURE__ */ t("footer", { className: "px-5 py-3 text-[10px]", style: { color: "var(--muted)", borderTop: "1px solid var(--border)" }, children: "Thinking and text tails come directly from live dashboard events. Terminal turns stay linked until chat is explicitly disabled." })
              ]
            }
          )
        }
      ),
      z && /* @__PURE__ */ t(
        $r,
        {
          candidates: $,
          existingRepos: new Set(l.map((o) => o.repo)),
          defaults: c,
          agentProfiles: re,
          crews: J,
          onCreate: Lt,
          onSaveCrew: Je,
          onClose: () => L(!1)
        }
      ),
      E && /* @__PURE__ */ t(
        $r,
        {
          candidates: $,
          existingRepos: new Set(l.map((o) => o.repo)),
          defaults: c,
          agentProfiles: re,
          crews: J,
          editPipeline: l.find((o) => o.repo === E) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
          { id: "pl-" + E, repo: E, source: "manual", trust: c.trust, depth: c.depth, backlog_intake: !0, sot: "github", steps: rr.map((o) => ({ ...o })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
          cardCount: s.filter((o) => {
            var p;
            return (((p = o.source) == null ? void 0 : p.repo) || "unlinked") === E;
          }).length,
          isExample: Br.has(E),
          onCreate: Lt,
          onSaveCrew: Je,
          onDelete: Pt,
          onClose: () => F(null)
        }
      ),
      /* @__PURE__ */ n("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
        /* @__PURE__ */ t(Bn, { steps: $e, cardsByStage: kt, onNodeClick: Ut }),
        /* @__PURE__ */ n("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3", children: [
          /* @__PURE__ */ t(Yt, { label: "Active", value: String(j), accent: !0 }),
          /* @__PURE__ */ t(Yt, { label: "Gated", value: String(ye) }),
          /* @__PURE__ */ t(Yt, { label: "Done", value: String(Re) }),
          /* @__PURE__ */ t(Yt, { label: "Parked", value: String(ce) })
        ] }),
        /* @__PURE__ */ t(
          pn,
          {
            repos: He.map((o) => o.name),
            selectedRepos: [...y],
            onNewPipeline: () => {
              Et();
            },
            onConfigure: it,
            onOpenAgents: ft
          }
        ),
        /* @__PURE__ */ n("div", { className: "flex gap-4 items-start", children: [
          /* @__PURE__ */ t(
            Zn,
            {
              repos: He,
              selected: y,
              onToggle: ct,
              onClear: jt,
              onAddWorkspace: Et,
              onEdit: it
            }
          ),
          /* @__PURE__ */ n("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ n("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
              /* @__PURE__ */ t(zn, { active: x, onChange: b, counts: qt }),
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
                    ce ? /* @__PURE__ */ n("span", { style: { color: "var(--accent)" }, children: [
                      "· ",
                      ce
                    ] }) : null
                  ]
                }
              ),
              /* @__PURE__ */ n(
                "button",
                {
                  onClick: () => S(!0),
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
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: Mt || Ht || he.some((o) => o.status === "pending" || o.responsePending) ? "var(--accent)" : "var(--muted)" },
                  children: [
                    Ht ? /* @__PURE__ */ t(Rt, { size: 11 }) : /* @__PURE__ */ t(
                      "span",
                      {
                        className: Mt || he.some((o) => o.status === "pending" || o.responsePending) ? "inline-block animate-pulse" : "inline-block",
                        style: { width: 7, height: 7, borderRadius: 999, background: Mt ? "var(--ok)" : he.some((o) => o.responsePending) ? "var(--warn)" : he.some((o) => o.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: he.length ? 1 : 0.5 }
                      }
                    ),
                    /* @__PURE__ */ t("span", { className: "font-semibold", children: he.length ? `${he.length} session${he.length === 1 ? "" : "s"}` : "no sessions" }),
                    Ht && /* @__PURE__ */ t("span", { children: "· thinking" }),
                    Mt && /* @__PURE__ */ t("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                    !Ht && !Mt && he.filter((o) => o.status === "pending").length > 0 && /* @__PURE__ */ n("span", { children: [
                      "· ",
                      he.filter((o) => o.status === "pending").length,
                      " running"
                    ] }),
                    he.some((o) => o.responsePending) && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, children: "· response" }),
                    he.some((o) => o.stale) && /* @__PURE__ */ n("span", { style: { color: "var(--warn)" }, children: [
                      "· ",
                      he.filter((o) => o.stale).length,
                      " stale ↻"
                    ] })
                  ]
                }
              ),
              y.size > 0 && /* @__PURE__ */ n(
                "span",
                {
                  className: "text-[11px] px-2 py-1 rounded-md font-medium",
                  style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                  children: [
                    y.size === 1 ? [...y][0] : `${y.size} workspaces`,
                    " · ",
                    /* @__PURE__ */ t("button", { onClick: jt, className: "underline hover:opacity-80", children: "clear" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ t(Kn, { config: c, onSet: O }),
            h ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : /* @__PURE__ */ n("div", { ref: _e, className: "flex gap-3 overflow-x-auto pb-4 pr-4", children: [
              "                ",
              x === "pipeline" && $e.map((o) => /* @__PURE__ */ t(At, { id: `stage-col-${o.id}`, title: o.name, count: (kt[o.id] || []).length, children: (kt[o.id] || []).map((p) => /* @__PURE__ */ t($t, { ..._t(p) }, p.id)) }, o.id)),
              x === "pipeline" && wt.length > 0 && /* @__PURE__ */ t("div", { className: "flex-shrink-0 pl-3", style: { borderLeft: "2px dashed var(--border-strong, var(--border))" }, children: /* @__PURE__ */ t(At, { id: "stage-col-done", title: "✅ Done", count: wt.length, children: wt.map((o) => /* @__PURE__ */ t($t, { ..._t(o) }, o.id)) }) }),
              x === "pipeline" && Nt.length > 0 && /* @__PURE__ */ t(At, { id: "stage-col-cancelled", title: "⏹ Cancelled", count: Nt.length, children: Nt.map((o) => /* @__PURE__ */ t($t, { ..._t(o) }, o.id)) }),
              x === "workspace" && Object.entries(Ot).map(([o, p]) => /* @__PURE__ */ t(At, { title: o, count: p.length, children: p.map((u) => /* @__PURE__ */ t($t, { ..._t(u) }, u.id)) }, o)),
              x === "crew" && Object.entries(It).map(([o, p]) => /* @__PURE__ */ t(At, { title: o, count: p.length, children: p.map((u) => /* @__PURE__ */ t($t, { ..._t(u) }, u.id)) }, o)),
              x === "status" && Object.entries(Wt).map(([o, p]) => /* @__PURE__ */ t(At, { title: o, count: p.length, children: p.map((u) => /* @__PURE__ */ t($t, { ..._t(u) }, u.id)) }, o))
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  pa as default
};
