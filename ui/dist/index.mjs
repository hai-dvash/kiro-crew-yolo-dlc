import { jsx as t, Fragment as Xe, jsxs as a } from "react/jsx-runtime";
import { useChatLauncher as Ar, useAppApi as Rr, useNavigate as zr } from "@kirocrew/app-sdk";
import { PageHeader as Fr, StatCard as Yt } from "@kirocrew/app-sdk/ui";
import { useState as N, useCallback as ce, useEffect as ze, useMemo as Te, useRef as Be } from "react";
const pr = 16e3, Tr = (() => {
  try {
    const e = Number(typeof localStorage < "u" && localStorage.getItem("dlc-live-buffer-chars"));
    return Number.isFinite(e) && e >= 512 ? e : pr;
  } catch {
    return pr;
  }
})(), Ur = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), Wr = /^[.,!?;:%)\]}]$/u, Pr = /^[(\[{]$/u;
function Hr(e, r = 3) {
  const n = (String(e || "").match(Ur) || []).slice(-Math.max(0, r));
  return n.reduce((l, d, m) => {
    if (m === 0) return d;
    const i = n[m - 1];
    return Wr.test(d) || Pr.test(i) ? l + d : l + " " + d;
  }, "");
}
function ur(e, r = !1) {
  return e != null && e.active && !r ? e : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function sr(e, r, o) {
  if (!r || e != null && e.active && Number.isFinite(o) && Number.isFinite(e.seq) && o <= e.seq)
    return e;
  const l = ((e != null && e.active ? e.buffer : "") + r).slice(-Tr);
  return { buffer: l, tail: Hr(l, 3), active: !0, phase: "generating", seq: Number(o) || 0 };
}
function mr(e) {
  return e && { ...e, active: !1, phase: "idle" };
}
function Gr(e) {
  if (!e || typeof e != "object") return null;
  const r = Array.isArray(e.lines) ? e.lines : [];
  if (!r.length) return null;
  const o = r.map((d, m) => ({ l: d, _i: m })).sort((d, m) => {
    var b, g, S, y;
    const i = (Number((b = d.l) == null ? void 0 : b.seq) || 0) - (Number((g = m.l) == null ? void 0 : g.seq) || 0);
    if (i) return i;
    const c = String(((S = d.l) == null ? void 0 : S.at) || "").localeCompare(String(((y = m.l) == null ? void 0 : y.at) || ""));
    return c || d._i - m._i;
  }).map((d) => d.l), n = o.map((d) => String((d == null ? void 0 : d.note) || "")).filter(Boolean).join(" · ").slice(-Tr);
  if (!n) return null;
  const l = o[o.length - 1] || {};
  return {
    buffer: n,
    tail: n,
    // whole trail suffix — it is already short, human sentences
    active: !0,
    phase: String(l.phase || "running"),
    seq: Number(l.seq) || o.length,
    source: "progress-trail"
  };
}
const Kr = /* @__PURE__ */ new Set(["done", "advanced"]), Vr = /* @__PURE__ */ new Set([
  "done",
  "advanced",
  "completed",
  "consumed",
  "integrated",
  "waived",
  "omitted"
]), st = (e) => !!e && typeof e == "object" && !Array.isArray(e), X = (e) => st(e) ? e : {}, ke = (e) => Array.isArray(e) ? e : e == null ? [] : [e], W = (...e) => e.find((r) => r != null && r !== "");
function gt(e) {
  if (e == null || e === "") return "unobservable";
  if (typeof e == "boolean") return e ? "yes" : "no";
  if (typeof e == "string" || typeof e == "number") return String(e);
  if (Array.isArray(e)) return e.length ? e.map(gt).join(" · ") : "none";
  if (st(e)) {
    const r = Object.entries(e);
    return r.length ? r.map(([o, n]) => `${o}: ${gt(n)}`).join(" · ") : "none";
  }
  return String(e);
}
function dt(e) {
  return ke(e).map((r, o) => {
    if (!st(r))
      return { key: `item-${o}`, title: gt(r), detail: null, status: null, level: null, ref: null, url: null };
    const n = W(
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
    ) || `item ${o + 1}`, l = W(
      r.summary,
      r.detail,
      r.description,
      r.rationale,
      r.result,
      r.note,
      r.reason,
      r.path,
      r.ref
    ), d = W(
      r.enforcement,
      r.level,
      r.priority,
      r.required === !0 ? "required" : void 0
    ), m = W(
      r.status,
      r.outcome,
      r.state,
      r.passed === !0 ? "passed" : void 0,
      r.passed === !1 ? "failed" : void 0
    ), i = W(r.url, r.path, r.ref), c = typeof i == "string" && /^https?:\/\//.test(i) ? i : null;
    return {
      key: String(W(r.id, r.key, r.path, r.ref, `item-${o}`)),
      title: String(n),
      detail: l == null || String(l) === String(n) ? null : gt(l),
      status: m == null ? null : String(m),
      level: d == null ? null : String(d),
      ref: i == null ? null : String(i),
      url: c
    };
  });
}
function Xr(e) {
  return ke(e).filter((r) => r != null).map((r, o) => {
    const n = X(r), l = st(r) ? W(n.url, n.path, n.ref, n.id) : String(r), d = st(r) ? W(n.label, n.name, n.kind, n.id, n.path, n.ref, `artifact ${o + 1}`) : String(r), m = W(n.url, typeof l == "string" && /^https?:\/\//.test(l) ? l : void 0), i = W(n.preview, n.summary, n.description, n.evidence, n.detail);
    return {
      key: String(W(n.id, n.path, n.ref, `artifact-${o}`)),
      label: String(d),
      ref: l == null ? null : String(l),
      url: typeof m == "string" && /^https?:\/\//.test(m) ? m : null,
      preview: i == null ? null : gt(i),
      kind: n.kind == null ? null : String(n.kind),
      status: n.status == null ? null : String(n.status)
    };
  });
}
function Yr(e) {
  return ke(e.children).map((o, n) => {
    const l = X(o), d = l.required !== !1 && !["optional", "preferred", "advisory"].includes(
      String(W(l.enforcement, l.level, "required")).toLowerCase()
    ), m = String(W(l.status, l.state, "unobservable"));
    return {
      key: String(W(l.id, l.card_id, l.issue, `child-${n}`)),
      label: String(W(l.title, l.name, l.card_id, l.id, l.issue, `child ${n + 1}`)),
      required: d,
      status: m,
      complete: Vr.has(m.toLowerCase())
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
function Zr(e, r) {
  const o = X(e == null ? void 0 : e.execution_envelope);
  return o.step === r ? o : ke(e == null ? void 0 : e.execution_envelope_history).map(X).reverse().find((n) => n.step === r) || {};
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
function hr(e, r) {
  const o = ke(e.validation_and_evidence).map(X);
  return ke(r).map(String).filter((n) => !o.some((l) => {
    const d = String(W(l.kind, l.type, l.id, "")).toLowerCase(), m = String(W(l.status, "")).toLowerCase();
    return (d === n.toLowerCase() || ke(l.satisfies).map(String).includes(n)) && jr.has(m) && Er(l);
  }));
}
function Jr(e, r) {
  const o = ke(e.findings).map(X);
  if (!o.length) return !1;
  if (!r) return !0;
  const n = ke(W(e.sources, e.consulted_sources)).map(X).filter((d) => typeof d.url == "string" && /^https?:\/\//.test(d.url) && d.title && d.accessed_at && W(d.source_type, d.type)), l = new Set(n.flatMap((d) => [d.id && String(d.id), d.url]).filter(Boolean));
  return l.size > 0 && o.every((d) => {
    const m = ke(W(d.source_ids, d.sources)).map(String);
    return d.claim && m.some((i) => l.has(i));
  });
}
function Qr(e, r, o, n) {
  const l = X(e == null ? void 0 : e.intent_integrity), d = l.status === "violation" ? [`intent integrity (${ke(l.violations).join(", ")})`] : [], m = Zr(e, r), i = ke(X(m.observations).controls_runtime);
  if (Number(m.schema_version || 0) < 2 || !i.includes("result_scope"))
    return { missing: d, preferredShortfalls: [] };
  const c = [...d], b = [];
  o.envelope_id !== m.id && c.push("result bound to the active envelope revision");
  const g = ke(e == null ? void 0 : e.decisions).map(X).filter((k) => k.step && k.step !== r || k.envelope_id && k.envelope_id !== m.id ? !1 : k.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(k.kind)), S = g.filter((k) => {
    const te = String(W(k.status, "")).toLowerCase();
    return k.chosen === void 0 && k.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(te);
  }), y = X(m.questions);
  S.length && c.push("all qualified questions resolved before completion"), S.length > 1 && y.cadence === "one-at-a-time" && c.push("one-at-a-time question cadence"), Number.isInteger(y.max_rounds) && g.length > y.max_rounds && c.push(`question rounds within max_rounds=${y.max_rounds}`);
  const f = X(m.result_scope), x = X(f.enforcement), w = new Map(ke(n.intent_and_requirement_coverage).map(X).filter((k) => W(k.intent_id, k.constraint_id, k.id)).map((k) => [String(W(k.intent_id, k.constraint_id, k.id)), k]));
  for (const k of [...ke(f.required_outcome_ids), ...ke(f.hard_constraint_ids)]) {
    const te = w.get(String(k)) || {}, A = String(W(te.status, "")).toLowerCase(), xe = ke(W(te.evidence_refs, te.requirement_refs, te.refs));
    (!jr.has(A) || !xe.some(Er)) && c.push(`required intent coverage ${k}`);
  }
  const B = ke(n.alternatives);
  if (Number.isInteger(f.alternatives) && B.length < f.alternatives) {
    const k = `${f.alternatives} material alternatives`;
    x.alternatives === "required" ? c.push(k) : x.alternatives === "preferred" && b.push(k);
  }
  const O = hr(n, f.evidence), j = hr(n, f.validation);
  x.evidence === "required" ? c.push(...O.map((k) => `required evidence ${k.toLowerCase()}`)) : x.evidence === "preferred" && b.push(...O.map((k) => `preferred evidence ${k.toLowerCase()}`)), x.validation === "required" ? c.push(...j.map((k) => `required validation ${k.toLowerCase()}`)) : x.validation === "preferred" && b.push(...j.map((k) => `preferred validation ${k.toLowerCase()}`));
  const z = X(m.research_policy), $ = X(e == null ? void 0 : e.research_artifacts)[r], F = ke(W(n.research_and_citations, $)).map(X), Y = F.filter((k) => Jr(
    k,
    z.citations === "required"
  ));
  return z.mode === "required" && !Y.length && c.push("required research with claim-level citations"), Number.isInteger(z.max_passes) && F.length > z.max_passes && c.push(`research passes within max_passes=${z.max_passes}`), z.mode === "on-demand" && F.length && !Y.length && b.push("complete citations for used research"), {
    missing: [...new Set(c)],
    preferredShortfalls: [...new Set(b)]
  };
}
function ea(e, r, o) {
  const n = X(e.runtime_handshakes), l = X(e.runtime_handshake), d = X(n[r] || (l.step == null || l.step === r ? l : {})), m = X(d.assignment), i = X(d.capabilities), c = X(i.tools), b = X(i.skills), g = X(d.routing), S = X(g.model), y = X(g.reasoning_effort), f = X(d.scope), x = X(f.worktree), w = X(o.routing_and_provenance), B = X(w.model), O = X(w.reasoning_effort), j = X(w.assignment), z = W(c.profile_declared, c.declared, w.declared_tools), $ = W(c.actual, w.actual_tools), F = W(b.profile_declared, b.declared, w.declared_skills), Y = W(b.actual, w.actual_skills);
  return {
    assignedProfile: W(
      j.assigned_profile,
      w.assigned_profile,
      m.assigned_profile
    ) ?? null,
    effectiveProfile: W(
      j.effective_profile,
      w.effective_profile,
      m.effective_profile
    ) ?? null,
    model: {
      requested: W(B.requested, w.requested_model, S.requested) ?? null,
      applied: W(B.applied, w.applied_model, S.applied) ?? null,
      provider: W(B.provider, w.resolved_provider, S.provider) ?? null,
      version: W(B.version, w.model_version, S.version) ?? null,
      status: W(
        B.status,
        w.model_resolution_status,
        S.status,
        W(B.applied, w.applied_model, S.applied) != null ? "observed" : "unobservable"
      )
    },
    effort: {
      requested: W(O.requested, w.requested_effort, y.requested) ?? null,
      applied: W(O.applied, w.applied_effort, y.applied) ?? null,
      status: W(
        O.status,
        w.effort_resolution_status,
        y.status,
        W(O.applied, w.applied_effort, y.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: z == null ? null : ke(z),
      actual: $ == null ? null : ke($),
      status: W(c.status, w.tools_status, $ != null ? "observed" : "unobservable")
    },
    skills: {
      declared: F == null ? null : ke(F),
      actual: Y == null ? null : ke(Y),
      status: W(b.status, w.skills_status, Y != null ? "observed" : "unobservable")
    },
    network: X(f.network),
    write: X(f.write),
    worktree: Object.keys(x).length ? x : null
  };
}
function ta(e, r) {
  const o = X(e == null ? void 0 : e.gate_review), n = X(o.bundle), l = W(o.gate, e == null ? void 0 : e.stage), d = W(o.producer_step, r), m = X(e == null ? void 0 : e.step_sessions), i = Number.isInteger(o.result_revision) ? o.result_revision : null, c = W(o.status, "unobservable"), b = d ? X(e == null ? void 0 : e.step_status)[d] : void 0, g = Xr(n.artifacts), S = X(n.card_topology), y = Yr(S), f = W(S.action, "unobservable"), x = ["fan-in", "unify"].includes(String(f).toLowerCase()), w = x ? y.filter((Y) => Y.required && !Y.complete) : [], B = [];
  (!(e != null && e.gate_review) || !st(e.gate_review)) && B.push("result bundle record"), (!o.bundle || !st(o.bundle)) && B.push("declared result bundle"), d || B.push("producer binding"), i === null && B.push("result revision"), l && (e != null && e.stage) && l !== e.stage && B.push("gate binding matches current stage"), c !== "awaiting-review" && B.push(`review status awaiting-review (currently ${c})`), Kr.has(String(b || "").toLowerCase()) || B.push(`terminal producer status (currently ${b || "unobservable"})`), W(n.summary) || B.push("result summary"), g.length === 0 && B.push("referenced artifact");
  const O = g.filter((Y) => !Y.ref);
  O.length > 0 && B.push(`artifact reference (${O.length} missing)`), x && y.length === 0 && B.push("declared fan-in child set"), w.length > 0 && B.push(`required child fan-in (${w.length} incomplete)`);
  const j = Qr(e, d, o, n);
  B.push(...j.missing);
  const z = ke(e == null ? void 0 : e.decisions).filter((Y) => {
    const k = X(Y);
    return !k.chosen && (!d || !k.step || k.step === d);
  }), $ = dt([
    ...ke(n.decisions_and_questions),
    ...z
  ]), F = ea(e || {}, d, n);
  return {
    gate: l || null,
    producerStep: d || null,
    producerSessionRef: W(
      o.producer_session_ref,
      d && st(m[d]) ? `step_sessions.${d}` : void 0
    ) || null,
    envelopeId: W(o.envelope_id) || null,
    revision: i,
    reviewStatus: c,
    createdAt: W(o.created_at) || null,
    ready: B.length === 0,
    missing: B,
    summary: W(n.summary) || null,
    changes: dt(n.changes_since_prior),
    artifacts: g,
    coverage: dt(n.intent_and_requirement_coverage),
    alternatives: dt(n.alternatives),
    research: dt(W(
      n.research_and_citations,
      d && X(e == null ? void 0 : e.research_artifacts)[d]
    )),
    preferredShortfalls: j.preferredShortfalls,
    decisions: $,
    topology: {
      action: f,
      integrationOwner: W(S.integration_owner, S.owner) || null,
      integrationStatus: W(S.integration_status, S.status) || null,
      children: y,
      incompleteRequiredChildren: w
    },
    budget: {
      allocated: X(n.budget).allocated ?? null,
      consumed: X(n.budget).consumed ?? null,
      remaining: X(n.budget).remaining ?? null
    },
    routing: F,
    validation: dt(n.validation_and_evidence),
    risks: dt(n.known_risks),
    deviations: dt(n.omissions_and_deviations)
  };
}
const ra = "~/.dlc-yolo/.statepath", ht = "~/.dlc-yolo/state.json", gr = "/tmp/dlc-yolo/state.json", ar = "/apps/dlc-yolo/api/state", aa = 1, vr = 4096, na = 3072;
function oa(e) {
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
  const n = Object.keys(r).sort();
  if (n.length !== 2 || n[0] !== "path" || n[1] !== "schema_version" || r.schema_version !== aa || typeof r.path != "string") return null;
  const l = r.path;
  return !l.startsWith("/") || l.length === 0 || l.length > na || l.includes("\0") || l.includes("\r") || l.includes(`
`) || l.split("/").some((d) => d === "." || d === "..") ? null : l;
}
async function er(e, r) {
  const o = [];
  if (typeof r == "function")
    try {
      const n = await r(ar), l = typeof n == "string" ? JSON.parse(n) : n;
      if (l && typeof l == "object" && !Array.isArray(l) && (Array.isArray(l.cards) || Array.isArray(l.pipelines)))
        return { path: ar, data: l, source: "endpoint" };
      o.push("endpoint read returned non-card body — falling through");
    } catch (n) {
      o.push(`endpoint read FAILED (pre-restart?): ${n && n.message ? n.message : n}`);
    }
  try {
    const n = await e(ra), l = oa(n);
    if (o.push(`pointer-read OK, target=${l || "INVALID"}`), l)
      try {
        return { path: l, data: await e(l), source: "pointer" };
      } catch (d) {
        o.push(`pointer-target read FAILED: ${d && d.message ? d.message : d}`);
      }
  } catch (n) {
    o.push(`pointer read FAILED: ${n && n.message ? n.message : n}`);
  }
  try {
    return { path: ht, data: await e(ht), source: "durable" };
  } catch (n) {
    o.push(`durable read FAILED: ${n && n.message ? n.message : n}`);
  }
  try {
    return { path: gr, data: await e(gr), source: "scratch" };
  } catch (n) {
    return o.push(`scratch read FAILED: ${n && n.message ? n.message : n}`), console.warn("[dlc-yolo] all state tiers failed:", o.join(" | ")), { path: ht, data: { cards: [], pipelines: [], config: {} }, source: "unresolved" };
  }
}
async function br(e, r, o) {
  if (typeof o == "function")
    try {
      const n = await o(ar), l = typeof n == "string" ? JSON.parse(n) : n;
      if (l && typeof l == "object" && !Array.isArray(l) && (Array.isArray(l.cards) || Array.isArray(l.pipelines)))
        return { path: ar, data: l, source: "endpoint" };
    } catch {
    }
  try {
    return { path: r, data: await e(r), source: "current" };
  } catch {
    return er(e, o);
  }
}
const sa = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
function la(e) {
  const r = /* @__PURE__ */ new Map();
  for (const o of String(e || "").split(/[\n,]/)) {
    const n = o.trim();
    sa.test(n) && !r.has(n.toLowerCase()) && r.set(n.toLowerCase(), n);
  }
  return [...r.values()].sort((o, n) => o.toLowerCase().localeCompare(n.toLowerCase()));
}
const ia = {
  "receiver-disabled": "Enable and save the receiver above first.",
  "receiver-secret-missing": "Set a webhook secret above before exposing the port.",
  "receiver-allowlist-empty": "Add at least one allowed repository above first.",
  "receiver-port-mismatch": "Save the receiver on this port before starting the tunnel.",
  "receiver-not-listening": "The receiver is not listening yet — save it, then Refresh.",
  "receiver-config-invalid": "Repair the stored receiver configuration first."
};
function fr(e) {
  return e === "listening" ? "var(--ok)" : e === "misconfigured" || e === "failed" ? "var(--danger, #ef4444)" : "var(--muted)";
}
function Dt(e) {
  const r = (e == null ? void 0 : e.message) || String(e);
  return /(?:404|not found)/i.test(r) ? "Webhook backend unavailable in the running gateway. Restart KiroCrew after syncing this app, then refresh this tab." : r;
}
function Or() {
  var V, be;
  const e = Rr(), [r, o] = N(null), [n, l] = N(!1), [d, m] = N("8765"), [i, c] = N(""), [b, g] = N(""), [S, y] = N(""), [f, x] = N(!1), [w, B] = N(!1), [O, j] = N(!0), [z, $] = N(!1), [F, Y] = N(""), k = ce((R) => {
    o(R), l(!!R.enabled), m(String(R.port || 8765)), c((R.repositories || []).join(`
`)), g(R.inbox_path || ""), B(!!R.autosync), y(""), x(!1);
  }, []), te = ce(async () => {
    j(!0), Y("");
    try {
      k(await e.get("/apps/dlc-yolo/api/webhook/config"));
    } catch (R) {
      Y(Dt(R));
    } finally {
      j(!1);
    }
  }, [e, k]);
  ze(() => {
    te();
  }, [te]);
  const [A, xe] = N(null), [pe, me] = N(!1), we = ce(async () => {
    try {
      xe(await e.get("/apps/dlc-yolo/api/tunnel/status"));
    } catch {
      xe(null);
    }
  }, [e]);
  ze(() => {
    we();
  }, [we]);
  const je = ce(async () => {
    me(!0);
    try {
      xe(await e.post("/apps/dlc-yolo/api/tunnel/start", {}));
    } catch (R) {
      Y(Dt(R));
    } finally {
      me(!1);
    }
  }, [e]), J = ce(async () => {
    me(!0);
    try {
      xe(await e.post("/apps/dlc-yolo/api/tunnel/stop", {}));
    } catch (R) {
      Y(Dt(R));
    } finally {
      me(!1);
    }
  }, [e]), [P, re] = N(null), [Ee, Oe] = N(!1), Ce = ce(async () => {
    try {
      re(await e.get("/apps/dlc-yolo/api/crons/status"));
    } catch {
      re(null);
    }
  }, [e]);
  ze(() => {
    Ce();
  }, [Ce]);
  const C = ce(async (R) => {
    Oe(!0);
    try {
      const de = R ? "/apps/dlc-yolo/api/crons/pause" : "/apps/dlc-yolo/api/crons/resume";
      re(await e.post(de, {}));
    } catch (de) {
      Y(Dt(de));
    } finally {
      Oe(!1);
    }
  }, [e]), G = Te(() => la(i), [i]), ae = Number(d), _e = typeof TextEncoder > "u" ? S.length : new TextEncoder().encode(S).length, Fe = !!(r != null && r.secret_configured) || _e >= 32, se = Number.isInteger(ae) && ae >= 1024 && ae <= 65535 && (!n || G.length > 0 && Fe) && (!b.trim() || b.trim().startsWith("/")), Q = async () => {
    if (!(!(r != null && r.editable) || !se)) {
      $(!0), Y("");
      try {
        const R = {
          enabled: n,
          port: ae,
          repositories: G,
          inbox_path: b.trim() || null,
          clear_secret: f,
          autosync: w
        };
        S && (R.secret = S), k(await e.post("/apps/dlc-yolo/api/webhook/config", R));
      } catch (R) {
        Y(Dt(R));
      } finally {
        $(!1);
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
        /* @__PURE__ */ t("header", { className: "px-4 py-3 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
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
                style: { color: fr(r.listener), background: `color-mix(in srgb, ${fr(r.listener)} 13%, transparent)` },
                children: r.listener
              }
            )
          ] }),
          /* @__PURE__ */ t("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "Shared by every pipeline. This authenticated control owns the app-wide loopback receiver; the secret is write-only and never returned." })
        ] }) }),
        /* @__PURE__ */ a("div", { className: "px-4 py-4 flex flex-col gap-4", children: [
          O ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: "Loading receiver configuration…" }) : r && /* @__PURE__ */ a(Xe, { children: [
            r.configuration_source === "environment" && /* @__PURE__ */ t("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))", background: "color-mix(in srgb, var(--warn) 7%, transparent)" }, children: "Gateway environment variables currently own this configuration, so the UI is read-only. Remove those overrides and restart the gateway to transfer authority to this form." }),
            r.configuration_source === "invalid" && /* @__PURE__ */ a("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid var(--danger, #ef4444)" }, children: [
              "Stored configuration failed secure validation and was not loaded. Repair or remove the app-owned config file before using this form.",
              r.configuration_error && /* @__PURE__ */ a("div", { className: "mt-1 font-mono", children: [
                "Reason: ",
                r.configuration_error
              ] })
            ] }),
            /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
              /* @__PURE__ */ a("div", { children: [
                /* @__PURE__ */ t("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Enable receiver" }),
                /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Applies immediately for UI-managed settings; polling remains reconciliation." })
              ] }),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  disabled: !r.editable,
                  onClick: () => l((R) => !R),
                  "aria-pressed": n,
                  className: "rounded-full transition-all relative disabled:opacity-50",
                  style: { background: n ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                  children: /* @__PURE__ */ t("span", { className: "absolute top-0.5 rounded-full transition-all", style: { height: 18, width: 18, background: "var(--bg)", left: n ? 20 : 2 } })
                }
              )
            ] }),
            /* @__PURE__ */ a("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
              /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Loopback port",
                /* @__PURE__ */ t(
                  "input",
                  {
                    type: "number",
                    min: 1024,
                    max: 65535,
                    value: d,
                    disabled: !r.editable,
                    onChange: (R) => m(R.target.value),
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
                      Number.isFinite(ae) ? ae : "—",
                      "/github"
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "Repository allowlist · one owner/repo per line",
              /* @__PURE__ */ t(
                "textarea",
                {
                  rows: 4,
                  value: i,
                  disabled: !r.editable,
                  onChange: (R) => c(R.target.value),
                  placeholder: "owner/repo",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "Durable inbox override · optional absolute path",
              /* @__PURE__ */ t(
                "input",
                {
                  value: b,
                  disabled: !r.editable,
                  onChange: (R) => g(R.target.value),
                  placeholder: "Uses the state directory by default",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "GitHub webhook secret · ",
              r.secret_configured ? "configured; leave blank to keep" : "minimum 32 bytes",
              /* @__PURE__ */ t(
                "input",
                {
                  type: "password",
                  autoComplete: "new-password",
                  value: S,
                  disabled: !r.editable,
                  onChange: (R) => y(R.target.value),
                  placeholder: r.secret_configured ? "•••••••••••••••• (unchanged)" : "Enter a new secret",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            !n && r.secret_configured && r.editable && /* @__PURE__ */ a("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer", style: { color: "var(--muted)" }, children: [
              /* @__PURE__ */ t("input", { type: "checkbox", checked: f, onChange: (R) => x(R.target.checked) }),
              "Remove the stored secret when saving the disabled receiver"
            ] }),
            /* @__PURE__ */ a(
              "div",
              {
                className: "rounded-md p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Source" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: r.configuration_source })
                  ] }),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Allowlist" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: r.allowed_repository_count })
                  ] }),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Pending" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: ((V = r.inbox) == null ? void 0 : V.pending) ?? "—" })
                  ] }),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Processed" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: ((be = r.inbox) == null ? void 0 : be.processed) ?? "—" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ a("div", { className: "text-[11px] leading-5", style: { color: "var(--muted)" }, children: [
              "Configure GitHub for ",
              /* @__PURE__ */ t("strong", { children: "Issues" }),
              " and ",
              /* @__PURE__ */ t("strong", { children: "Labels" }),
              " events and use the same secret. A public relay/tunnel may forward only its ",
              /* @__PURE__ */ t("code", { children: "/github" }),
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
                    /* @__PURE__ */ t("span", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Cloudflare tunnel" }),
                    /* @__PURE__ */ t(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: A != null && A.running ? "var(--ok)" : "var(--muted)", border: "1px solid var(--border)" },
                        children: A ? A.running ? "running" : A.installed ? "stopped" : "not installed" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ t("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "The receiver is loopback-only, so GitHub needs a public relay. Start a Cloudflare quick tunnel here, or run the shown command yourself. cloudflared is never installed automatically." }),
                  A && !A.installed && /* @__PURE__ */ a("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "cloudflared is not installed. Install it, then Refresh status.",
                    A.install_hint && /* @__PURE__ */ t("pre", { className: "mt-1 whitespace-pre-wrap font-mono text-[10px]", style: { color: "var(--text)" }, children: A.install_hint })
                  ] }),
                  (A == null ? void 0 : A.running) && A.payload_url && /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "GitHub payload URL",
                    /* @__PURE__ */ t(
                      "input",
                      {
                        readOnly: !0,
                        value: A.payload_url,
                        onFocus: (R) => R.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ok)" }
                      }
                    )
                  ] }),
                  (A == null ? void 0 : A.command) && /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "Command ",
                    A.running ? "running" : "to run yourself",
                    /* @__PURE__ */ t(
                      "input",
                      {
                        readOnly: !0,
                        value: A.command,
                        onFocus: (R) => R.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }
                      }
                    )
                  ] }),
                  (A == null ? void 0 : A.last_error) && /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Tunnel: ",
                    A.last_error
                  ] }),
                  A && A.installed && !A.running && A.receiver_ready === !1 && /* @__PURE__ */ a("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "Won't expose the port until the receiver is ready: ",
                    ia[A.receiver_block_reason || ""] || A.receiver_block_reason
                  ] }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    A != null && A.running ? /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void J(),
                        disabled: pe,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--danger, #ef4444)", color: "var(--bg)" },
                        children: pe ? "Stopping…" : "Stop tunnel"
                      }
                    ) : /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void je(),
                        disabled: pe || !(A != null && A.installed) || (A == null ? void 0 : A.receiver_ready) === !1,
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
                  /* @__PURE__ */ a("p", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
                    "Exposes only the receiver's ",
                    /* @__PURE__ */ t("code", { children: "/github" }),
                    " route; every delivery is HMAC-verified. Quick-tunnel URLs change each restart — update the GitHub payload URL when it does."
                  ] }),
                  /* @__PURE__ */ a("label", { className: "flex items-start gap-2 mt-1 cursor-pointer", style: { color: "var(--text)" }, children: [
                    /* @__PURE__ */ t(
                      "input",
                      {
                        type: "checkbox",
                        checked: w,
                        disabled: !(r != null && r.editable),
                        onChange: (R) => B(R.target.checked),
                        className: "mt-0.5"
                      }
                    ),
                    /* @__PURE__ */ a("span", { className: "text-[11px]", children: [
                      /* @__PURE__ */ t("span", { className: "font-medium", children: "Auto-sync the GitHub webhook URL" }),
                      " — on tunnel start, re-point each allowed repo's webhook to the new ",
                      /* @__PURE__ */ t("code", { children: "…trycloudflare.com/github" }),
                      " URL via ",
                      /* @__PURE__ */ t("code", { children: "gh" }),
                      ". Only rewrites a hook already on a quick-tunnel host (a hand-set stable URL is never touched). Save to apply."
                    ] })
                  ] }),
                  (A == null ? void 0 : A.autosync) && A.autosync.enabled && /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: A.autosync.error ? "var(--danger, #ef4444)" : "var(--ok)" }, children: A.autosync.error ? `Auto-sync failed: ${A.autosync.error}` : `Auto-synced ${(A.autosync.results || []).filter((R) => R.action === "updated").length} hook(s) → ${A.autosync.payload_url}` })
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
                    /* @__PURE__ */ t("span", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Automation crons" }),
                    P && P.available && /* @__PURE__ */ t(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: P.all_paused ? "var(--warn)" : "var(--ok)", border: "1px solid var(--border)" },
                        children: P.all_paused ? "paused" : P.any_active ? "running" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ t("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "DLC-YOLO's three background jobs (advance · spawns · backlog-intake). Pause them for a webhook-only or maintenance setup; the webhook receiver keeps working while paused (a verified delivery still wakes advance when resumed). Polling stops while paused." }),
                  P && !P.available && /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Cron control unavailable",
                    P.error ? `: ${P.error}` : "",
                    "."
                  ] }),
                  P && P.available && P.jobs.length > 0 && /* @__PURE__ */ t("div", { className: "flex flex-col gap-1", children: P.jobs.map((R) => /* @__PURE__ */ a(
                    "div",
                    {
                      className: "flex items-center justify-between text-[11px] font-mono",
                      style: { color: "var(--muted)" },
                      children: [
                        /* @__PURE__ */ t("span", { children: R.basename }),
                        /* @__PURE__ */ t("span", { style: { color: R.paused ? "var(--warn)" : "var(--ok)" }, children: R.paused ? "paused" : "active" })
                      ]
                    },
                    R.id
                  )) }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void C(!0),
                        disabled: Ee || !(P != null && P.available) || (P == null ? void 0 : P.all_paused),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--warn)", color: "var(--bg)" },
                        children: Ee ? "…" : "Pause all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void C(!1),
                        disabled: Ee || !(P != null && P.available) || (P == null ? void 0 : P.any_active),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: Ee ? "…" : "Resume all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Ce(),
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
          F && /* @__PURE__ */ t("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))" }, children: F })
        ] }),
        /* @__PURE__ */ a("footer", { className: "px-4 py-3 flex justify-between gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--card)" }, children: [
          /* @__PURE__ */ t("button", { onClick: () => void te(), disabled: O || z, className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50", style: { color: "var(--muted)" }, children: "Refresh status" }),
          (r == null ? void 0 : r.editable) && /* @__PURE__ */ t(
            "button",
            {
              onClick: () => void Q(),
              disabled: !se || z,
              className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
              style: { background: "var(--accent)", color: "var(--bg)" },
              children: z ? "Applying…" : "Save & apply"
            }
          )
        ] })
      ]
    }
  );
}
function ca({ repos: e, selectedRepos: r, onNewPipeline: o, onConfigure: n, onOpenAgents: l }) {
  const { openChat: d } = Ar(), m = r.length === 1 ? r[0] : e.length === 1 ? e[0] : "", i = "/dlc-yolo", c = "text-[10px] leading-none px-1.5 py-1 rounded font-semibold";
  return /* @__PURE__ */ t(Xe, { children: /* @__PURE__ */ a("div", { "data-dlc-command-controls": !0, className: "mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap", children: [
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
        onClick: () => m ? n(m) : o(),
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
    m && /* @__PURE__ */ a("span", { className: "text-[10px] truncate max-w-[300px]", style: { color: "var(--muted)" }, children: [
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
function da({ budget: e, depth: r, onSave: o }) {
  const [n, l] = N(!1), [d, m] = N(Bt(e)), [i, c] = N(
    Bt(e) === "custom" ? { ...e } : { ...Zt[r] || Zt.standard }
  ), b = () => {
    const y = Bt(e);
    m(y), c(y === "custom" ? { ...e } : { ...Zt[r] || Zt.standard }), l(!0);
  }, g = () => {
    o(d === "depth" ? void 0 : d === "unlimited" ? {
      max_child_cards: "unlimited",
      effort_ceiling: "unlimited",
      max_feature_size: "XL",
      addenda: "proactive"
    } : { ...i }), l(!1);
  }, S = Bt(e) === "depth" ? "budget: depth" : Bt(e) === "unlimited" ? "budget: unlimited" : "budget: custom";
  return /* @__PURE__ */ a("div", { className: "relative", children: [
    /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        onClick: b,
        title: "Edit this card's explicit budget override",
        className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
        style: { color: e ? "var(--accent)" : "var(--muted)", border: `1px solid ${e ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)"}`, background: e ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" },
        children: S
      }
    ),
    n && /* @__PURE__ */ a(
      "div",
      {
        className: "absolute z-40 mt-1 left-0 w-72 rounded-lg p-3 flex flex-col gap-2",
        style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 12px 36px rgba(0,0,0,.35)" },
        children: [
          /* @__PURE__ */ t("div", { className: "text-[11px] font-semibold", style: { color: "var(--text)" }, children: "Card budget override" }),
          /* @__PURE__ */ t("div", { className: "grid grid-cols-3 gap-1", children: ["depth", "custom", "unlimited"].map((y) => /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              onClick: () => m(y),
              className: "text-[10px] px-2 py-1 rounded font-semibold",
              style: { color: d === y ? "var(--bg)" : "var(--muted)", background: d === y ? "var(--accent)" : "var(--bg-hover, var(--border))" },
              children: y === "depth" ? "follow depth" : y
            },
            y
          )) }),
          d === "depth" && /* @__PURE__ */ a("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
            "Removes ",
            /* @__PURE__ */ t("code", { children: "card.budget" }),
            "; effective budget follows ",
            r || "standard",
            " depth."
          ] }),
          d === "unlimited" && /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: "var(--warn)" }, children: "Literal unlimited child/effort caps · XL · proactive addenda." }),
          d === "custom" && /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Child cards",
              /* @__PURE__ */ t(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: i.max_child_cards,
                  onChange: (y) => c((f) => ({ ...f, max_child_cards: Math.max(0, Number(y.target.value) || 0) })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Effort ceiling",
              /* @__PURE__ */ t(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: i.effort_ceiling,
                  onChange: (y) => c((f) => ({ ...f, effort_ceiling: Math.max(0, Number(y.target.value) || 0) })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Max feature",
              /* @__PURE__ */ t(
                "select",
                {
                  value: i.max_feature_size,
                  onChange: (y) => c((f) => ({ ...f, max_feature_size: y.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["S", "M", "L", "XL"].map((y) => /* @__PURE__ */ t("option", { children: y }, y))
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Addenda",
              /* @__PURE__ */ t(
                "select",
                {
                  value: i.addenda,
                  onChange: (y) => c((f) => ({ ...f, addenda: y.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["none", "obvious", "proactive"].map((y) => /* @__PURE__ */ t("option", { children: y }, y))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ a("div", { className: "flex justify-end gap-2 mt-1", children: [
            /* @__PURE__ */ t("button", { type: "button", onClick: () => l(!1), className: "text-[10px] px-2 py-1", style: { color: "var(--muted)" }, children: "Cancel" }),
            /* @__PURE__ */ t("button", { type: "button", onClick: g, className: "text-[10px] px-2 py-1 rounded font-semibold", style: { background: "var(--accent)", color: "var(--bg)" }, children: "Save budget" })
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
], Lr = {
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
}, pa = /* @__PURE__ */ new Set(["retired", "merged"]), yr = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked"]);
function ua(e) {
  const r = e == null ? void 0 : e.execution_schedule;
  if (!r || typeof r != "object") return null;
  const o = r.nodes;
  if (!o || typeof o != "object") return null;
  const n = r.current_node_id;
  return typeof n == "string" && o[n] && typeof o[n] == "object" ? o[n] : Object.values(o).find((l) => l && typeof l == "object" && l.step === e.stage) || null;
}
function kr(e, r) {
  const o = e == null ? void 0 : e[r], n = o && typeof o == "object" ? o[e.stage] : null;
  return typeof n == "string" && n.trim() ? n.trim() : null;
}
function ma(e, r) {
  const o = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", n = Array.isArray(e == null ? void 0 : e.decisions) ? e.decisions.filter((d) => d && !d.chosen && !d.resolved_at && (d.step === o || !d.step) && Array.isArray(d.options) && d.options.length) : [], l = (r || "").toLowerCase();
  return n.length ? { severity: "decision", label: "Choose an option", color: "var(--accent)" } : /capability|missing|not in inventory|no crew|external|unavailable|cannot proceed without a tool/.test(l) ? { severity: "hard", label: "Blocked · needs setup", color: "var(--danger)" } : /approv|confirm|sign.?off|awaiting.*human|needs.?you/.test(l) ? { severity: "approval", label: "Needs approval", color: "var(--warn)" } : { severity: "attention", label: "Needs input", color: "var(--warn)" };
}
function wr(e, { isGate: r = !1, liveObserved: o = !1 } = {}) {
  const n = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", l = typeof (e == null ? void 0 : e.lifecycle) == "string" ? e.lifecycle.toLowerCase() : "", d = e != null && e.step_status && typeof e.step_status == "object" ? String(e.step_status[n] || "") : "", m = ua(e), i = typeof (m == null ? void 0 : m.status) == "string" ? m.status : "", c = e != null && e.step_sessions && typeof e.step_sessions == "object" ? e.step_sessions[n] : null, b = yr.has(l) || i === "cancelling" || (c == null ? void 0 : c.writes_allowed) === !1 || !!(c != null && c.cancel_requested_at), g = n === "done" || pa.has(l) || ["completed", "cancelled", "superseded"].includes(i);
  let S, y = null, f = null, x = null, w = null;
  if (g)
    S = "terminal", y = i === "cancelled" || yr.has(l) ? `terminal ${l || i}` : l || i || n || null;
  else if (b)
    S = "cancelling", y = "writes revoked; awaiting terminal observation";
  else if (d === "blocked" || i === "blocked") {
    S = "blocked", y = kr(e, "block_reason") || ((m == null ? void 0 : m.wait_reasons) || [])[0] || "step blocked";
    const O = ma(e, y);
    f = O.severity, x = O.label, w = O.color;
  } else d === "error" || i === "failed" ? (S = "error", y = kr(e, "error_reason") || (m == null ? void 0 : m.dispatch_error) || "step error") : r || i === "gate-wait" ? S = "waiting-gate" : o ? S = "running-observed" : d === "pending" || i === "running" ? (S = "pending-unconfirmed", y = "no current live observation") : ["queued", "dependency-wait", "permit-wait"].includes(i) ? (S = "queued", y = Array.isArray(m == null ? void 0 : m.wait_reasons) ? m.wait_reasons.join(" · ") : null) : i === "ready" ? S = "ready" : S = "idle";
  const B = Lr[S];
  return {
    kind: S,
    reason: y,
    severity: f,
    label: x || B.label,
    color: w || B.color
  };
}
const Ct = { LOOP: "loop", STEP: "step-agent", ORCH: "orchestrator", HUMAN: "human" };
function ft(e) {
  return typeof e == "string" ? e : "";
}
function ha(e) {
  if (!e || typeof e != "object") return [];
  const r = [], o = (n) => {
    n && n.at && r.push(n);
  };
  for (const n of e.history || [])
    !n || typeof n != "object" || o({
      id: `hist:${n.at}:${n.to}`,
      at: ft(n.at),
      actor: Ct.LOOP,
      kind: "promoted",
      step: n.to,
      cls: "notification",
      needs_human: !1,
      headline: `advanced ${n.from || "?"} → ${n.to || "?"}`,
      detail: n.agent ? `by ${n.agent}` : ""
    });
  for (const [n, l] of Object.entries(e.step_summaries || {})) {
    if (!l || typeof l != "object" || !l.headline) continue;
    const d = l.status === "blocked";
    o({
      id: `summ:${n}:${l.at || l.status}`,
      at: ft(l.at) || ft(e.updated_at),
      actor: Ct.STEP,
      kind: d ? "blocked" : l.status === "error" ? "error" : "step-done",
      step: n,
      cls: "notification",
      needs_human: !!l.needs_human,
      headline: l.headline,
      detail: l.description || "",
      executor: l.executor || null
    });
  }
  for (const n of e.gate_history || [])
    !n || typeof n != "object" || o({
      id: `gate:${n.at}:${n.gate}`,
      at: ft(n.at),
      actor: Ct.HUMAN,
      kind: n.decision === "rejected" ? "rejected" : n.decision === "approved" ? "approved" : "gate",
      step: n.gate,
      cls: "decision",
      needs_human: !1,
      headline: `you ${n.decision || "acted on"} ${n.gate}`,
      detail: n.notes || ""
    });
  for (const n of e.decisions || []) {
    if (!n || typeof n != "object") continue;
    const l = !!n.chosen || !!n.resolved_at;
    o({
      id: `dec:${n.id || n.at}`,
      at: ft(n.at),
      actor: Ct.ORCH,
      kind: l ? "resolved" : "decision",
      step: n.step,
      cls: "decision",
      needs_human: !l,
      headline: l ? `resolved: ${n.chosen || n.action || n.kind || "decision"}` : `decision needed: ${n.question || n.kind || "a fork"}`,
      detail: n.rationale || n.question || ""
    });
  }
  for (const n of e.backstep_history || [])
    !n || typeof n != "object" || o({
      id: `back:${n.at}`,
      at: ft(n.at),
      actor: Ct.ORCH,
      kind: "back-stepped",
      step: n.to,
      cls: "notification",
      needs_human: !1,
      headline: `stepped back ${n.from || "?"} → ${n.to || "?"}`,
      detail: n.reason || ""
    });
  for (const n of e.parked || [])
    !n || typeof n != "object" || o({
      id: `park:${n.id || n.at}`,
      at: ft(n.at),
      actor: Ct.ORCH,
      kind: "parked",
      step: n.phase,
      cls: "notification",
      needs_human: !1,
      headline: `parked to backlog: ${n.note || "idea"}`,
      detail: n.issue_url || ""
    });
  return r.map((n, l) => ({ ...n, _i: l })).sort((n, l) => n.at < l.at ? -1 : n.at > l.at ? 1 : n._i - l._i).map(({ _i: n, ...l }) => l);
}
const ga = /^\[([a-z0-9-]+)\s*[·.]\s*f?\d+\]\s*(.*)$/i;
function Ir(e) {
  const r = ga.exec(String(e || ""));
  return r ? { parentId: r[1], rest: r[2] } : null;
}
function va(e, r) {
  var d;
  if (!e) return [];
  const o = [], n = /* @__PURE__ */ new Set(), l = (m) => {
    m && !n.has(m.id) && (n.add(m.id), o.push(m));
  };
  for (const m of ((d = e.topology) == null ? void 0 : d.children) || []) {
    const i = typeof m == "string" ? m : m == null ? void 0 : m.card_id, c = (r || []).find((b) => b.id === i);
    c && l({ id: c.id, title: c.title, stage: c.stage, lifecycle: c.lifecycle, required: (m == null ? void 0 : m.required) !== !1 });
  }
  for (const m of r || []) {
    const i = Ir(m.title);
    i && i.parentId === e.id && l({ id: m.id, title: m.title, stage: m.stage, lifecycle: m.lifecycle, required: !0 });
  }
  return o;
}
function ba(e) {
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
function De(e) {
  return typeof e == "string" ? e : "";
}
function fa(e) {
  return String(e || "").slice(0, 8);
}
function xa(e, r) {
  var m;
  const o = e.id, n = ((m = e.execution_schedule) == null ? void 0 : m.nodes) || {};
  for (const [i, c] of Object.entries(n)) {
    if (!c || typeof c != "object") continue;
    const b = De(c.terminal_at) || De(c.session_at) || De(c.ready_at) || De(c.created_at);
    r({
      id: `sched:${i}`,
      at: b,
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
      at: De(i.time),
      actor: "step-agent",
      kind: (i.type || "").split(".").pop() || "event",
      cardId: o,
      step: i.subject,
      run_id: i.run_id,
      envelope_id: i.envelope_id,
      caused_by: i.correlation_id && i.correlation_id !== o ? i.correlation_id : void 0,
      headline: `${i.subject || "step"} → ${i.terminal_status || i.type || "event"}`,
      detail: i.observed_status ? `observed: ${i.observed_status}` : i.run_id ? `run ${fa(i.run_id)}` : ""
    });
  for (const i of e.history || []) {
    if (!i || typeof i != "object") continue;
    const c = i.agent || "", b = /cron|advance/i.test(c) ? "loop" : /human|user/i.test(c) ? "human" : "loop";
    r({
      id: `hist:${o}:${i.at}:${i.to}`,
      at: De(i.at),
      actor: b,
      kind: "promoted",
      cardId: o,
      step: i.to,
      inferred: b === "loop" && /cron|advance/i.test(c) ? !1 : void 0,
      headline: `advanced ${i.from || "?"} → ${i.to || "?"}`,
      detail: c ? `by ${c}` : ""
    });
  }
  for (const i of e.decisions || []) {
    if (!i || typeof i != "object") continue;
    const c = i.status === "resolved" || !!i.chosen || !!i.resolved_at;
    r({
      id: `dec:${i.id || o + i.step}`,
      at: De(i.at) || De(i.resolved_at),
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
      at: De(i.at),
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
    at: De(l.at),
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
    at: De(d.at),
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
      at: De(c.at),
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
function ya(e, r) {
  for (const o of (e == null ? void 0 : e.github_webhook_history) || [])
    !o || typeof o != "object" || r({
      id: `wh:${o.delivery_id}`,
      at: De(o.at) || De(o.received_at) || De(o.time),
      actor: "webhook",
      kind: `webhook-${o.status || "received"}`,
      cardId: o.card_id,
      caused_by: void 0,
      headline: `${o.event}.${o.action} #${o.issue_number ?? "?"}`,
      detail: `${o.repository || ""}${o.status ? ` · ${o.status}` : ""}${o.reason ? ` (${o.reason})` : ""}`
    });
}
function ka(e, r, o) {
  const n = e == null ? void 0 : e.id, l = (r || []).filter((b) => {
    var g;
    return b && (b.pipeline_id === n || !b.pipeline_id && ((g = b.source) == null ? void 0 : g.repo) === (e == null ? void 0 : e.repo));
  }), d = [], m = (b) => {
    b && b.at && d.push({ glyph: qr[b.actor] || "•", ...b });
  };
  for (const b of l) xa(b, m);
  ya(o, m);
  const i = Object.fromEntries(Nr.map((b, g) => [b, g]));
  d.sort((b, g) => (b.at < g.at ? -1 : b.at > g.at ? 1 : 0) || (i[b.actor] ?? 9) - (i[g.actor] ?? 9) || (b.id < g.id ? -1 : b.id > g.id ? 1 : 0));
  const c = Nr.filter((b) => d.some((g) => g.actor === b));
  return { events: d, actors: c, now: (o == null ? void 0 : o.scheduler_state) || null };
}
const wa = [
  "request:re-spec",
  "request:retry",
  "request:back-step",
  "request:park",
  "request:cancel"
], ir = 500, cr = {
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
function Na() {
  var r, o;
  return `ui-${(((o = (r = globalThis.crypto) == null ? void 0 : r.randomUUID) == null ? void 0 : o.call(r)) || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16)}`;
}
function _a(e, r) {
  if (!wa.includes(e)) return { ok: !1, error: `unknown request kind: ${e}` };
  const o = cr[e], n = String(r || "").trim();
  return o.reasonRequired && !n ? { ok: !1, error: "a reason is required for this request" } : n.length > ir ? { ok: !1, error: `reason exceeds ${ir} chars` } : { ok: !0 };
}
function Sa({ id: e, kind: r, text: o, card: n, now: l, boundary: d }) {
  const m = _a(r, o);
  if (!m.ok) throw new Error(m.error);
  const i = n == null ? void 0 : n.stage, c = n != null && n.step_status && typeof n.step_status == "object" ? n.step_status[i] ?? null : null, b = {
    id: e,
    at: l,
    step: i,
    kind: r,
    text: String(o || "").trim().slice(0, ir),
    by: "user",
    status: "pending",
    expected: { stage: i ?? null, step_status: c }
  };
  return r === "request:back-step" && d && (b.boundary = d), b;
}
function Ca(e, r) {
  const o = Array.isArray(e) ? e : [];
  return o.some((n) => n && n.id === r.id) ? o : [...o, r];
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
function $a(e, r) {
  const o = Object.fromEntries(Mr.map((d) => [d, 0])), n = r && typeof r == "object" ? r : {};
  o.ready = (n.ready_node_ids || []).length, o.running = (n.running_node_ids || []).length, o.blocked = (n.blocked_node_ids || []).length, o.queued = (n.selected_node_ids || []).length;
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
  const r = !!e.authority_active, o = String(e.parity_status || ""), n = o === "verified" || e.verified === !0;
  return {
    available: !0,
    authority_active: r,
    verified: n,
    parity_status: o || (n ? "verified" : "unknown"),
    digest_match: e.digest_match === void 0 ? null : !!e.digest_match,
    failure_code: e.failure_code || e.error || null,
    // never surface paths/prose from the minimized model
    label: r ? n ? "verified" : "blocked" : "authority inactive"
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
function pt({ label: e, value: r }) {
  return /* @__PURE__ */ a("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]", children: [
    /* @__PURE__ */ t("span", { className: "uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ t("span", { className: "break-words", style: { color: r ? "var(--text)" : "var(--muted)" }, children: r || "not set" })
  ] });
}
function Aa({ profiles: e, initial: r, onSave: o, onClose: n }) {
  var z;
  const l = r ? "update" : "create", [d, m] = N((r == null ? void 0 : r.name) || ""), [i, c] = N((r == null ? void 0 : r.kiroAgent) || ((z = e.find(($) => $.status === "loaded")) == null ? void 0 : z.name) || ""), [b, g] = N((r == null ? void 0 : r.workspace) || ""), [S, y] = N((r == null ? void 0 : r.memoryStore) || ""), [f, x] = N(!1), [w, B] = N(""), O = _r.test(d.trim()) && _r.test(i.trim()) && new TextEncoder().encode(b.trim()).length <= 256 && new TextEncoder().encode(S.trim()).length <= 256, j = async () => {
    if (!(!O || f)) {
      x(!0), B("");
      try {
        await o({
          mode: l,
          name: d.trim(),
          kiroAgent: i.trim(),
          workspace: b.trim() || void 0,
          memoryStore: S.trim() || void 0
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
        $.currentTarget === $.target && !f && n();
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
                /* @__PURE__ */ t("h3", { id: "crew-route-editor-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: l === "create" ? "New global crew route" : `Edit ${r == null ? void 0 : r.name}` }),
                /* @__PURE__ */ t("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "UI-managed routing record backed by the sanctioned KiroCrew agent CLI—no chat handoff." })
              ] }),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: n,
                  disabled: f,
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
              /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
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
              /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Workspace ",
                /* @__PURE__ */ t("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ t(
                  "input",
                  {
                    value: b,
                    onChange: ($) => g($.target.value),
                    placeholder: l === "update" ? "Blank keeps the current value" : "Default workspace",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Memory store ",
                /* @__PURE__ */ t("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ t(
                  "input",
                  {
                    value: S,
                    onChange: ($) => y($.target.value),
                    placeholder: l === "update" ? "Blank keeps the current value" : "Default memory store",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ a("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                "This edits the global crew → ",
                /* @__PURE__ */ t("code", { children: "kiro_agent" }),
                " route. Profile prompts, tools, and approval policy remain source-managed declarations; pipeline-local objectives stay in Pipeline Setup."
              ] }),
              w && /* @__PURE__ */ t("div", { className: "text-[11px] rounded-md px-3 py-2", style: { color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))" }, children: w })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              /* @__PURE__ */ t("button", { onClick: n, disabled: f, className: "text-[11px] px-3 py-1.5 rounded-md disabled:opacity-40", style: { color: "var(--muted)" }, children: "Cancel" }),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => void j(),
                  disabled: !O || f,
                  className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: f ? "Saving…" : l === "create" ? "Create crew route" : "Save crew route"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function dr({ profiles: e, crews: r, loading: o = !1, context: n, onRefresh: l, onClose: d, onSelectProfile: m, onSelectCrew: i, onSaveCrew: c }) {
  var F, Y;
  const [b, g] = N("agents"), [S, y] = N(((F = e[0]) == null ? void 0 : F.name) || ""), [f, x] = N(((Y = r[0]) == null ? void 0 : Y.name) || ""), [w, B] = N(null);
  ze(() => {
    var k;
    e.some((te) => te.name === S) || y(((k = e[0]) == null ? void 0 : k.name) || "");
  }, [e, S]), ze(() => {
    var k;
    r.some((te) => te.name === f) || x(((k = r[0]) == null ? void 0 : k.name) || "");
  }, [r, f]);
  const O = e.find((k) => k.name === S), j = r.find((k) => k.name === f), z = Te(
    () => j != null && j.kiroAgent ? e.find((k) => k.name === j.kiroAgent) : void 0,
    [j, e]
  ), $ = O != null && O.prompt ? O.prompt.length > 1200 ? `${O.prompt.slice(0, 1200)}…` : O.prompt : "";
  return /* @__PURE__ */ a(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 62%, transparent)", backdropFilter: "blur(2px)" },
      onMouseDown: (k) => {
        k.currentTarget === k.target && d();
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
                  /* @__PURE__ */ t("h2", { id: "agent-crew-catalog-title", className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agents & crews" }),
                  /* @__PURE__ */ t("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "KiroCrew agent templates define prompts/tools/approval policy. Global crew records route to one template plus workspace and memory." }),
                  n && /* @__PURE__ */ a("p", { className: "text-[10px] mt-1", style: { color: "var(--accent)" }, children: [
                    "Pipeline context: ",
                    n
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
                      g("crews"), B({ mode: "create" });
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
              /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: [["agents", `Agent templates · ${e.length}`], ["crews", `Global crews · ${r.length}`]].map(([k, te]) => /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => g(k),
                  className: "text-[12px] px-3 py-2 font-semibold",
                  style: { color: b === k ? "var(--accent)" : "var(--muted)", borderBottom: `2px solid ${b === k ? "var(--accent)" : "transparent"}`, marginBottom: -1 },
                  children: te
                },
                k
              )) }),
              /* @__PURE__ */ t("div", { className: "flex min-h-0 flex-1", children: b === "agents" ? /* @__PURE__ */ a(Xe, { children: [
                /* @__PURE__ */ a("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  e.map((k) => /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: () => y(k.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: k.name === S ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: k.name === S ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold truncate", children: k.name }),
                        /* @__PURE__ */ t("div", { className: "text-[9px] mt-0.5", style: { color: k.status === "loaded" ? "var(--ok)" : "var(--warn)" }, children: k.status === "loaded" ? "config loaded" : "config unavailable" })
                      ]
                    },
                    k.name
                  )),
                  !e.length && /* @__PURE__ */ t("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No referenced profiles." })
                ] }),
                /* @__PURE__ */ t("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: O ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
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
                  /* @__PURE__ */ a("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ t(pt, { label: "Model", value: O.model || "auto / provider default" }),
                    /* @__PURE__ */ t(pt, { label: "Config source", value: O.sourcePath }),
                    /* @__PURE__ */ t(pt, { label: "Prompt", value: O.prompt ? O.prompt.startsWith("file://") ? O.prompt : "inline prompt" : void 0 })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Declared tools" }),
                    /* @__PURE__ */ t(zt, { values: O.tools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Auto-approved tools" }),
                    /* @__PURE__ */ t(zt, { values: O.allowedTools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Resources / skills" }),
                    /* @__PURE__ */ t(zt, { values: O.resources })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "MCP servers" }),
                    /* @__PURE__ */ t(zt, { values: O.mcpServers })
                  ] }),
                  $ && /* @__PURE__ */ a("details", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ t("summary", { className: "text-[11px] cursor-pointer", style: { color: "var(--accent)" }, children: "Prompt preview" }),
                    /* @__PURE__ */ t("pre", { className: "mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto", style: { color: "var(--muted)" }, children: $ })
                  ] }),
                  /* @__PURE__ */ t("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 28%, var(--border))" }, children: "These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access." })
                ] }) : /* @__PURE__ */ t("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select an agent template." }) })
              ] }) : /* @__PURE__ */ a(Xe, { children: [
                /* @__PURE__ */ a("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  r.map((k) => /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: () => x(k.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: k.name === f ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: k.name === f ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold truncate", children: k.name }),
                        /* @__PURE__ */ a("div", { className: "text-[9px] mt-0.5 truncate", style: { color: "var(--muted)" }, children: [
                          "→ ",
                          k.kiroAgent || "profile not declared"
                        ] })
                      ]
                    },
                    k.name
                  )),
                  !r.length && /* @__PURE__ */ t("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No global crews found." })
                ] }),
                /* @__PURE__ */ t("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: j ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ t("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: j.name }),
                      /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: j.description || "No description declared." })
                    ] }),
                    c && /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => B({ mode: "update", crew: j }),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { color: "var(--accent)", border: "1px solid var(--border)" },
                        children: "Edit route"
                      }
                    ),
                    i && /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => i(j),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Route step here"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ a("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ t(pt, { label: "kiro_agent", value: j.kiroAgent }),
                    /* @__PURE__ */ t(pt, { label: "Workspace", value: j.workspace }),
                    /* @__PURE__ */ t(pt, { label: "Memory store", value: j.memoryStore }),
                    /* @__PURE__ */ t(pt, { label: "Model override", value: j.model }),
                    /* @__PURE__ */ t(pt, { label: "Source", value: j.source })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Selection triggers" }),
                    /* @__PURE__ */ t(zt, { values: j.triggers })
                  ] }),
                  j.kiroAgent && /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Authority profile" }),
                    /* @__PURE__ */ a("div", { className: "flex items-center gap-2 mt-1.5", children: [
                      /* @__PURE__ */ t("code", { className: "text-[12px]", style: { color: "var(--accent)" }, children: j.kiroAgent }),
                      /* @__PURE__ */ t("span", { className: "text-[10px]", style: { color: (z == null ? void 0 : z.status) === "loaded" ? "var(--ok)" : "var(--warn)" }, children: (z == null ? void 0 : z.status) === "loaded" ? "loaded" : "unavailable" }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => {
                            y(j.kiroAgent || ""), g("agents");
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
                    /* @__PURE__ */ t("code", { children: "kiro_agent" }),
                    " template; they are not duplicated on the crew."
                  ] })
                ] }) : /* @__PURE__ */ t("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select a global crew." }) })
              ] }) })
            ]
          }
        ),
        w && c && /* @__PURE__ */ t(
          Aa,
          {
            profiles: e,
            initial: w.mode === "update" ? w.crew : void 0,
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
]), Ra = /^[A-Za-z0-9._-]{1,128}$/;
function tt(e) {
  return typeof e == "string" && Ra.test(e);
}
function ot(e) {
  return typeof e == "string" && e.trim() ? e.trim() : void 0;
}
function tr(e) {
  return Array.isArray(e) ? [...new Set(e.filter((r) => typeof r == "string" && r.trim()).map((r) => r.trim()))] : [];
}
function Ta(e) {
  return !e || typeof e != "object" || Array.isArray(e) ? [] : Object.entries(e).filter(([r, o]) => tt(r) && o && typeof o == "object" && !Array.isArray(o)).map(([r, o]) => ({
    name: r,
    kiroAgent: tt(o.kiro_agent) ? o.kiro_agent : void 0,
    workspace: ot(o.workspace),
    memoryStore: ot(o.memory_store ?? o.memoryStore),
    model: ot(o.model),
    description: ot(o.description),
    triggers: tr(o.triggers),
    source: ot(o.source)
  })).sort((r, o) => r.name.localeCompare(o.name));
}
function ja(e, r = Dr) {
  const o = [];
  for (const l of r)
    tt(l) && !o.includes(l) && o.push(l);
  const n = (Array.isArray(e) ? e : []).map((l) => l == null ? void 0 : l.kiroAgent).filter(tt).sort((l, d) => l.localeCompare(d));
  for (const l of n)
    o.includes(l) || o.push(l);
  return o;
}
function Ea(e, r, o = Dr) {
  if (!tt(e)) return;
  if (o.includes(e)) return `~/.kiro/crew/apps/dlc-yolo/agents/${e}.json`;
  const n = [...new Set(
    (Array.isArray(r) ? r : []).filter((l) => (l == null ? void 0 : l.kiroAgent) === e).map((l) => l == null ? void 0 : l.source).filter(tt)
  )];
  if (n.length === 1)
    return `~/.kiro/agents/${n[0]}--${e}.json`;
}
function lr(e, r, o) {
  const n = tt(r) ? r : "unknown", l = !!e && typeof e == "object" && !Array.isArray(e), d = l && tt(e.name) ? e.name : n, m = l && e.mcpServers && typeof e.mcpServers == "object" ? Object.keys(e.mcpServers).filter(tt) : [];
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
function Oa(e) {
  const r = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(e || "");
  return r == null ? void 0 : r[1];
}
function La(e, r) {
  if (!r || !tt(r.name)) return { ...e };
  const o = Oa(r.name);
  return {
    ...e,
    name: r.name,
    tools: [...r.tools || []],
    model: r.model || "auto",
    ...o ? { capability: o } : {}
  };
}
let ut = ht;
const Sr = (e) => ({
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
]), Ia = {
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
}, xt = ["manual", "assisted", "autonomous"], Tt = ["quick", "standard", "deep"], Ft = { trust: "assisted", depth: "standard" }, nr = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, or = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Ye({ color: e, children: r, title: o, onClick: n, active: l }) {
  return /* @__PURE__ */ t(
    "button",
    {
      type: "button",
      title: o,
      onClick: n,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: e,
        background: `color-mix(in srgb, ${e} 14%, transparent)`,
        boxShadow: l ? `inset 0 0 0 1px color-mix(in srgb, ${e} 55%, transparent)` : "none",
        opacity: n && !l ? 0.85 : 1,
        cursor: n ? "pointer" : "default"
      },
      children: r
    }
  );
}
const Qt = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function qa({ steps: e, cardsByStage: r, onNodeClick: o }) {
  const n = Be(null), l = Be(null), d = Be(0), m = Be(null), i = Be(e), c = Be(r), b = Be([]);
  i.current = e, c.current = r;
  const g = 3, S = 116, y = S / g, f = y - 26, [x, w] = N(880);
  ze(() => {
    const j = l.current;
    if (!j) return;
    const z = new ResizeObserver(($) => {
      const F = Math.max(360, Math.floor($[0].contentRect.width));
      w(F);
    });
    return z.observe(j), () => z.disconnect();
  }, []);
  const B = (j) => j.type === "gate" || j.id.startsWith("gate-");
  return ze(() => {
    const j = n.current;
    if (!j) return;
    const z = Math.floor(x / g);
    j.width = z * g, j.height = y * g;
    const $ = j.getContext("2d");
    if (!$) return;
    const F = (te, A, xe, pe, me) => {
      $.fillStyle = me, $.fillRect(te * g, A * g, xe * g, pe * g);
    }, Y = () => {
      const te = d.current, A = i.current, xe = c.current, pe = Math.max(1, A.length);
      Math.max(1, ...A.map((J) => {
        var P;
        return ((P = xe[J.id]) == null ? void 0 : P.length) || 0;
      })), F(0, 0, z, f, "#0f172a");
      for (let J = 0; J < z / 5; J++) {
        const P = J * 37 % z, re = J * 13 % (f - 4);
        Math.sin(te * 0.03 + J * 2.1) > 0.35 && F(P, re, 1, 1, "#e2e8f0");
      }
      F(z - 26, 8, 10, 10, "#fde68a"), F(z - 24, 7, 8, 8, "#0f172a");
      for (let J = 0; J < z; J += 16)
        for (let P = f; P < y; P += 16)
          F(J, P, 16, 16, J / 16 + P / 16 & 1 ? "#33261a" : "#2a1f14");
      F(0, f - 2, z, 2, "#4a3520");
      const me = z / pe, we = [];
      for (let J = 0; J < A.length; J++) {
        const P = A[J], re = Math.round(me * (J + 0.5)), Oe = (xe[P.id] || []).length, Ce = Oe > 0, C = Qt[J % Qt.length], G = B(P), ae = f - 2;
        if (we.push({ x: re - Math.floor(me / 2), w: Math.floor(me), id: P.id }), J < A.length - 1) {
          const se = Math.round(me * (J + 1.5));
          for (let Q = re + 8; Q < se - 8; Q += 4) F(Q, f - 1, 2, 1, "#4a3520");
        }
        if (G) {
          const se = ae - 20, Q = Ce ? "#f39c12" : "#3a3222";
          F(re - 3, se, 6, 20, Ce ? "#5c4a2a" : "#2a2418");
          for (let V = 0; V < 5; V++) F(re - V, se - 5 + V, V * 2 + 1, 1, Q);
          for (let V = 0; V < 5; V++) F(re - (4 - V), se - V, (4 - V) * 2 + 1, 1, Q);
          if (Ce) {
            const V = (Math.sin(te * 0.08) + 1) / 2;
            $.globalAlpha = 0.35 + V * 0.4, F(re - 1, se - 6, 2, 2, "#ffd27a"), $.globalAlpha = 1;
          }
        } else {
          const se = ae - 14;
          if (F(re - 10, se, 20, 3, "#7a5c47"), F(re - 10, se - 1, 20, 1, C), F(re - 9, se + 3, 2, 8, "#5c4033"), F(re + 7, se + 3, 2, 8, "#5c4033"), F(re - 5, se - 9, 10, 9, "#333"), F(re - 4, se - 8, 8, 7, Ce ? "#0a2a0a" : "#1a1a1a"), Ce)
            for (let Q = 0; Q < 3; Q++) {
              const V = 2 + (te + Q * 7) % 5;
              F(re - 3, se - 7 + Q * 2, V, 0.8, "#33ff33");
            }
        }
        const _e = Math.min(Oe, 5);
        for (let se = 0; se < _e; se++) {
          const Q = _e > 1 ? (se - (_e - 1) / 2) * 8 : 0, V = Math.round(re + Q) - 3, be = ae - (G ? 2 : 4), R = Qt[(J + se) % Qt.length], de = Math.sin(te * 0.08 + J + se) > 0 ? 1 : 0;
          $.fillStyle = "rgba(0,0,0,0.18)", $.fillRect(V * g, (be + 8) * g, 6 * g, g), F(V, be + de, 6, 6, R), F(V + 1, be - 4 + de, 4, 4, "#fdd"), F(V + 1, be - 5 + de, 4, 1, "#333"), (te + J * 9 + se * 5) % 120 >= 3 && (F(V + 2, be - 3 + de, 1, 1, "#333"), F(V + 4, be - 3 + de, 1, 1, "#333")), F(V + 1, be + 6, 1, 2, R), F(V + 4, be + 6, 1, 2, R);
        }
        Oe > 5 && ($.fillStyle = C, $.font = `${3 * g}px monospace`, $.fillText(`+${Oe - 5}`, (re + 10) * g, (ae - 6) * g)), Oe > 0 && ($.fillStyle = C, $.fillRect((re + 6) * g, (ae - 30) * g, 9 * g, 9 * g), $.fillStyle = "#0f172a", $.font = `bold ${5 * g}px monospace`, $.textAlign = "center", $.fillText(String(Oe), (re + 10.5) * g, (ae - 24) * g), $.textAlign = "left"), $.fillStyle = Ce ? "#e2e8f0" : "#6b7280", $.font = `${3.4 * g}px monospace`, $.textAlign = "center";
        const Fe = P.name.length > 12 ? P.name.slice(0, 11) + "…" : P.name;
        $.fillText(Fe, re * g, (y - 4) * g), $.textAlign = "left";
      }
      b.current = we;
      const je = A.reduce((J, P) => {
        var re;
        return J + (((re = xe[P.id]) == null ? void 0 : re.length) || 0);
      }, 0);
      $.fillStyle = "#f90", $.font = `bold ${3.6 * g}px monospace`, $.fillText(`${je} card${je !== 1 ? "s" : ""} · ${pe} milestone${pe !== 1 ? "s" : ""}`, 4 * g, 8 * g);
    }, k = () => {
      d.current++, Y(), m.current = requestAnimationFrame(k);
    };
    return m.current = requestAnimationFrame(k), () => {
      m.current && cancelAnimationFrame(m.current);
    };
  }, [x, y, f]), /* @__PURE__ */ t("div", { ref: l, className: "w-full mb-5", children: /* @__PURE__ */ t(
    "canvas",
    {
      ref: n,
      onClick: (j) => {
        const z = n.current;
        if (!z) return;
        const $ = z.getBoundingClientRect(), F = (j.clientX - $.left) / $.width * (z.width / g), Y = b.current.find((k) => F >= k.x && F <= k.x + k.w);
        Y && o(Y.id);
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
function Ma({ active: e, onChange: r, counts: o }) {
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
        return /* @__PURE__ */ a(
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
  return /* @__PURE__ */ a("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ t("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: e }),
    r
  ] });
}
function mt({ rows: e, empty: r = "None recorded" }) {
  return e.length ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: e.map((o) => /* @__PURE__ */ a("div", { className: "rounded-md px-2 py-1.5", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)" }, children: [
    /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-[11px]", children: [
      /* @__PURE__ */ t("span", { className: "font-medium min-w-0 break-words", style: { color: "var(--text)" }, children: o.title }),
      /* @__PURE__ */ a("span", { className: "ml-auto flex gap-1 flex-shrink-0", children: [
        o.level && /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: o.level === "required" ? "var(--warn)" : "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: o.level }),
        o.status && /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: /fail|block|open|pending/i.test(o.status) ? "var(--warn)" : "var(--ok)", background: "var(--bg-hover, var(--border))" }, children: o.status })
      ] })
    ] }),
    o.detail && /* @__PURE__ */ t("div", { className: "mt-0.5 text-[10px] break-words", style: { color: "var(--muted)" }, children: o.detail }),
    o.ref && (o.url ? /* @__PURE__ */ t("a", { href: o.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: o.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: o.ref }))
  ] }, o.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: r });
}
function Se({ label: e, value: r, status: o }) {
  return /* @__PURE__ */ a("div", { className: "min-w-0", children: [
    /* @__PURE__ */ t("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-0.5 break-words", style: { color: gt(r) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      gt(r),
      o && /* @__PURE__ */ a("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        gt(o),
        ")"
      ] })
    ] })
  ] });
}
function Da({ card: e, inspection: r, producerSession: o, onClose: n, onOpenProducer: l, onApprove: d, onReject: m, onInterject: i }) {
  const c = r.routing, b = () => {
    const g = window.prompt(`Why reject revision ${r.revision ?? "unknown"}?`);
    g != null && g.trim() && m && (m(g.trim()), n());
  };
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (g) => {
        g.currentTarget === g.target && n();
      },
      children: /* @__PURE__ */ a(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": `gate-inspection-${e.id}`,
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(860px, calc(100vw - 32px))", maxHeight: "min(88vh, 860px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ a("header", { className: "px-5 py-4 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ t("h2", { id: `gate-inspection-${e.id}`, className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Gate result inspection" }),
                  /* @__PURE__ */ t("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)", background: `color-mix(in srgb, ${r.ready ? "var(--ok)" : "var(--warn)"} 14%, transparent)` }, children: r.ready ? "review-ready" : "not review-ready" }),
                  /* @__PURE__ */ a("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: [
                    "revision ",
                    r.revision ?? "unobservable"
                  ] })
                ] }),
                /* @__PURE__ */ t("div", { className: "text-[12px] mt-1 truncate", style: { color: "var(--text)" }, children: e.title }),
                /* @__PURE__ */ a("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: [
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
                  onClick: n,
                  "aria-label": "Close gate inspection",
                  className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                  style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ a("div", { className: "overflow-y-auto p-4 flex flex-col gap-3", children: [
              /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { background: r.ready ? "color-mix(in srgb, var(--ok) 8%, transparent)" : "color-mix(in srgb, var(--warn) 8%, transparent)", border: `1px solid color-mix(in srgb, ${r.ready ? "var(--ok)" : "var(--warn)"} 38%, var(--border))` }, children: [
                /* @__PURE__ */ t("div", { className: "text-[11px] font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)" }, children: r.ready ? "Bundle is structurally ready for review" : `${r.missing.length} readiness gap${r.missing.length === 1 ? "" : "s"}` }),
                !r.ready && /* @__PURE__ */ t("ul", { className: "mt-1.5 pl-4 list-disc text-[10px] space-y-0.5", style: { color: "var(--muted)" }, children: r.missing.map((g) => /* @__PURE__ */ t("li", { children: g }, g)) }),
                r.preferredShortfalls.length > 0 && /* @__PURE__ */ a("div", { className: "mt-2 text-[10px]", style: { color: "var(--muted)" }, children: [
                  "Preferred shortfalls (non-blocking): ",
                  r.preferredShortfalls.join(" · ")
                ] }),
                /* @__PURE__ */ t("div", { className: "text-[9px] mt-2", style: { color: "var(--muted)" }, children: "Inspection is read-only; deterministic runtime remains authoritative for movement and readiness enforcement." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ a(Ke, { title: "Result summary", children: [
                  /* @__PURE__ */ t("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: r.summary ? "var(--text)" : "var(--warn)" }, children: r.summary || "No result summary was published." }),
                  /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ t(Se, { label: "Envelope", value: r.envelopeId }),
                    /* @__PURE__ */ t(Se, { label: "Created", value: r.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ t(Ke, { title: "Changes since prior revision", children: /* @__PURE__ */ t(mt, { rows: r.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ t(Ke, { title: "Artifacts and evidence references", children: r.artifacts.length ? /* @__PURE__ */ t("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: r.artifacts.map((g) => /* @__PURE__ */ a("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ t("span", { className: "font-medium", style: { color: "var(--text)" }, children: g.label }),
                  g.kind && /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: g.kind })
                ] }),
                g.preview && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: g.preview }),
                g.ref && (g.url ? /* @__PURE__ */ t("a", { href: g.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: g.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: g.ref }))
              ] }, g.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ke, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ t(mt, { rows: r.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ t(Ke, { title: "Research and citations", children: /* @__PURE__ */ t(mt, { rows: r.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ke, { title: "Intent and requirement coverage", children: /* @__PURE__ */ t(mt, { rows: r.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ t(Ke, { title: "Omissions and deviations", children: /* @__PURE__ */ t(mt, { rows: r.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ a(Ke, { title: "Card topology and integration", children: [
                /* @__PURE__ */ a("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ t(Se, { label: "Action", value: r.topology.action }),
                  /* @__PURE__ */ t(Se, { label: "Integration owner", value: r.topology.integrationOwner }),
                  /* @__PURE__ */ t(Se, { label: "Integration status", value: r.topology.integrationStatus }),
                  /* @__PURE__ */ t(Se, { label: "Required children incomplete", value: r.topology.incompleteRequiredChildren.length })
                ] }),
                r.topology.children.length > 0 ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: r.topology.children.map((g) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: g.label }),
                  /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: g.required ? "var(--warn)" : "var(--muted)" }, children: g.required ? "required" : "optional" }),
                  /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(g.status) ? "var(--ok)" : "var(--warn)" }, children: g.status })
                ] }, g.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Ke, { title: "Budget consumption", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ t(Se, { label: "Allocated", value: r.budget.allocated }),
                  /* @__PURE__ */ t(Se, { label: "Consumed", value: r.budget.consumed }),
                  /* @__PURE__ */ t(Se, { label: "Remaining", value: r.budget.remaining })
                ] }) }),
                /* @__PURE__ */ t(Ke, { title: "Routing and runtime provenance", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ t(Se, { label: "Assigned profile", value: c.assignedProfile }),
                  /* @__PURE__ */ t(Se, { label: "Effective profile", value: c.effectiveProfile }),
                  /* @__PURE__ */ t(Se, { label: "Model requested", value: c.model.requested }),
                  /* @__PURE__ */ t(Se, { label: "Model applied", value: c.model.applied, status: c.model.status }),
                  /* @__PURE__ */ t(Se, { label: "Provider / version", value: c.model.provider || c.model.version ? [c.model.provider, c.model.version].filter(Boolean) : null }),
                  /* @__PURE__ */ t(Se, { label: "Effort requested", value: c.effort.requested }),
                  /* @__PURE__ */ t(Se, { label: "Effort applied", value: c.effort.applied, status: c.effort.status }),
                  /* @__PURE__ */ t(Se, { label: "Tools available", value: c.tools.actual, status: c.tools.status }),
                  /* @__PURE__ */ t(Se, { label: "Skills available", value: c.skills.actual, status: c.skills.status }),
                  /* @__PURE__ */ t(Se, { label: "Network scope", value: c.network.actual, status: c.network.status }),
                  /* @__PURE__ */ t(Se, { label: "Write scope", value: c.write.actual, status: c.write.status }),
                  /* @__PURE__ */ t(Se, { label: "Worktree / branch", value: c.worktree })
                ] }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ t(Ke, { title: "Validation and evidence", children: /* @__PURE__ */ t(mt, { rows: r.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ t(Ke, { title: "Known risks", children: /* @__PURE__ */ t(mt, { rows: r.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ t(Ke, { title: "Open decisions and questions", children: /* @__PURE__ */ t(mt, { rows: r.decisions, empty: "No open decisions recorded" }) })
              ] })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex items-center gap-2 flex-wrap", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              d && /* @__PURE__ */ a("button", { onClick: () => {
                d(), n();
              }, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--ok)", color: "var(--bg)" }, children: [
                "Approve",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              m && /* @__PURE__ */ a("button", { onClick: b, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--danger)", color: "var(--bg)" }, children: [
                "Reject",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              i && /* @__PURE__ */ t("button", { onClick: i, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: "Interject on this revision" }),
              o && l && /* @__PURE__ */ a("button", { onClick: l, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: [
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
function Ba({ card: e, openChat: r }) {
  const o = e.bootstrap, n = e.intent_contract || e.intent;
  if (!o && !n) return null;
  const l = `pipeline ${e.pipeline_id || ""} card ${e.id} (${e.title})`, d = (b, g) => /* @__PURE__ */ t(
    "button",
    {
      className: "text-[10px] px-2 py-0.5 rounded hover:opacity-80",
      style: { color: "var(--accent)", border: "1px solid var(--border)" },
      title: "Opens /dlc-yolo with this context — nothing is created in the browser",
      onClick: () => r({ message: `/dlc-yolo ${b} for ${l}` }),
      children: g
    }
  ), m = o ? String(o.status || "not-run") : "n/a", i = Array.isArray(o == null ? void 0 : o.crews_created) ? o.crews_created : [], c = Array.isArray(o == null ? void 0 : o.issues_opened) ? o.issues_opened : [];
  return /* @__PURE__ */ a("div", { className: "mt-2 pt-2", style: { borderTop: "1px dashed var(--border)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: "🌱 self-enablement" }),
    /* @__PURE__ */ a("div", { className: "flex flex-col gap-1 text-[10px]", children: [
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "① setup" }),
        /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: String(e.self_enable_mode || "default") })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "② intent" }),
        /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: n ? String(n.classification || n.status || "present") : "not run" }),
        d("resolve intent", "Resolve intent"),
        d("skip intent", "Skip intent")
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "③ per-step" }),
        d(`elaborate step ${e.stage}`, "Elaborate step")
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "④ bootstrap" }),
        /* @__PURE__ */ t("span", { style: { color: m === "done" ? "var(--ok)" : "var(--muted)" }, children: m }),
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
        d("resume bootstrap", "Resume bootstrap")
      ] }),
      m === "done" && /* @__PURE__ */ t("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "Replaying bootstrap is idempotent intent, not a promise." })
    ] })
  ] });
}
function za({ cards: e, schedulerState: r, statePath: o, readAppFile: n, onClose: l }) {
  const d = Te(() => $a(e, r), [e, r]), [m, i] = N(Jt(null)), [c, b] = N([]), [g, S] = N([]);
  ze(() => {
    const x = `${o.replace(/\/state\.json$/, "")}/workspaces/default/data/ledger/projections/status.json`;
    let w = !1;
    return n(x).then((B) => {
      if (!w)
        try {
          i(Jt(JSON.parse(B.content || "null")));
        } catch {
          i(Jt(null));
        }
    }).catch(() => {
      w || i(Jt(null));
    }), () => {
      w = !0;
    };
  }, [o, n]), ze(() => {
    const f = [], x = [];
    for (const w of e) {
      const B = w.step_sessions;
      if (B) for (const [j, z] of Object.entries(B)) f.push({ card: w.id, step: j, slot: z == null ? void 0 : z.slot_key });
      const O = w.worktree_lease;
      O && x.push({ card: w.id, branch: O.branch, status: O.status });
    }
    b(f.slice(0, 60)), S(x.slice(0, 60));
  }, [e]);
  const y = ({ title: f, children: x }) => /* @__PURE__ */ a("div", { className: "mb-4", children: [
    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: f }),
    x
  ] });
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
      onMouseDown: (f) => {
        f.currentTarget === f.target && l();
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
              /* @__PURE__ */ t("h2", { className: "text-[15px] font-semibold flex-1", style: { color: "var(--text-strong, var(--text))" }, children: "🛠 Operations" }),
              /* @__PURE__ */ t("button", { onClick: l, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ a("div", { className: "px-5 py-3 overflow-y-auto text-[11px]", children: [
              /* @__PURE__ */ a(y, { title: "Runtime / scheduler", children: [
                /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-2", children: Mr.map((f) => /* @__PURE__ */ a("span", { className: "px-2 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: d.counts[f] ? "var(--text)" : "var(--muted)" }, children: [
                  f,
                  " ",
                  d.counts[f]
                ] }, f)) }),
                d.waitReasons.length > 0 && /* @__PURE__ */ t("div", { className: "mt-2", children: d.waitReasons.map((f, x) => /* @__PURE__ */ a("div", { style: { color: "var(--muted)" }, children: [
                  "⛔ ",
                  f.card,
                  ": ",
                  f.reason
                ] }, x)) })
              ] }),
              /* @__PURE__ */ t(y, { title: "Projection parity", children: m.available ? /* @__PURE__ */ a("div", { children: [
                /* @__PURE__ */ a("div", { style: { color: m.verified ? "var(--ok)" : "var(--warn)" }, children: [
                  m.label,
                  " · authority ",
                  m.authority_active ? "active" : "inactive"
                ] }),
                m.digest_match !== null && /* @__PURE__ */ a("div", { style: { color: "var(--muted)" }, children: [
                  "digest match: ",
                  String(m.digest_match)
                ] }),
                m.failure_code && /* @__PURE__ */ a("div", { style: { color: "var(--warn)" }, children: [
                  "failure: ",
                  m.failure_code
                ] }),
                /* @__PURE__ */ t("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "last-known-good runs.json preserved when blocked" })
              ] }) : /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: "unavailable" }) }),
              /* @__PURE__ */ t(y, { title: "Webhook", children: /* @__PURE__ */ t(Or, {}) }),
              /* @__PURE__ */ a(y, { title: "Sessions & worktrees", children: [
                /* @__PURE__ */ a("div", { className: "mb-1", style: { color: "var(--muted)" }, children: [
                  c.length,
                  " session(s) · ",
                  g.length,
                  " lease(s)"
                ] }),
                c.slice(0, 12).map((f, x) => /* @__PURE__ */ a("div", { style: { color: "var(--text)" }, children: [
                  f.card,
                  " · ",
                  f.step,
                  f.slot ? ` · ${f.slot}` : ""
                ] }, x)),
                g.slice(0, 12).map((f, x) => /* @__PURE__ */ a("div", { style: { color: "var(--muted)" }, children: [
                  "🌿 ",
                  f.card,
                  " · ",
                  f.branch || "—",
                  " · ",
                  f.status || "—"
                ] }, `l${x}`))
              ] })
            ] })
          ]
        }
      )
    }
  );
}
function fe(e, r) {
  return r == null || r === "" ? null : /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px] py-0.5", children: [
    /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: "var(--muted)", minWidth: "110px" }, children: e }),
    /* @__PURE__ */ t("span", { className: "min-w-0 break-words", style: { color: "var(--text)" }, children: String(r) })
  ] });
}
function Cr(e) {
  return typeof e == "string" && /^https?:\/\//i.test(e);
}
function Fa({ card: e, cardStatus: r, effectiveCapability: o, onClose: n }) {
  var S, y, f;
  const [l, d] = N("overview"), m = [
    ["overview", "Overview"],
    ["results", "Results"],
    ["history", "Decisions & history"],
    ["execution", "Execution"]
  ], i = e.execution_schedule, c = i != null && i.current_node_id ? (S = i == null ? void 0 : i.nodes) == null ? void 0 : S[i.current_node_id] : void 0, b = e.worktree_lease, g = e.topology;
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (x) => {
        x.currentTarget === x.target && n();
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
                /* @__PURE__ */ t("div", { className: "text-[14px] font-semibold truncate", style: { color: "var(--text-strong, var(--text))" }, children: e.title }),
                /* @__PURE__ */ a("div", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: [
                  e.stage,
                  " · ",
                  r.label
                ] })
              ] }),
              /* @__PURE__ */ t("button", { onClick: n, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ t("nav", { className: "flex gap-1 px-3 pt-2", style: { borderBottom: "1px solid var(--border)" }, children: m.map(([x, w]) => /* @__PURE__ */ t(
              "button",
              {
                onClick: () => d(x),
                className: "text-[11px] px-2.5 py-1 rounded-t-md",
                style: {
                  color: l === x ? "var(--accent)" : "var(--muted)",
                  borderBottom: l === x ? "2px solid var(--accent)" : "2px solid transparent"
                },
                children: w
              },
              x
            )) }),
            /* @__PURE__ */ a("div", { className: "px-5 py-3 overflow-y-auto text-[11px]", children: [
              l === "overview" && /* @__PURE__ */ a("div", { children: [
                (y = e.source) != null && y.url && Cr(e.source.url) ? fe("source", null) || /* @__PURE__ */ a("div", { className: "text-[11px] py-0.5", children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--muted)", minWidth: 110, display: "inline-block" }, children: "source" }),
                  /* @__PURE__ */ a("a", { href: e.source.url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: [
                    e.source.repo,
                    e.source.issue ? `#${e.source.issue}` : ""
                  ] })
                ] }) : fe("source", (f = e.source) == null ? void 0 : f.repo),
                fe("pipeline", e.pipeline_id),
                fe("workspace", e.workspace),
                fe("stage", e.stage),
                fe("lifecycle", e.lifecycle),
                fe("SoT", e.sot),
                fe("status", `${r.label}${r.reason ? ` — ${r.reason}` : ""}`),
                fe("trust", e.trust ? `${e.trust} (override)` : "inherited"),
                fe("depth", e.depth ? `${e.depth} (override)` : "inherited"),
                fe("capability", o),
                fe("effort", e.effort ? JSON.stringify(e.effort) : null),
                fe("writes_allowed", e.writes_allowed === !1 ? "false (cancel requested)" : null)
              ] }),
              l === "results" && /* @__PURE__ */ a("div", { children: [
                Object.entries(e.step_summaries || {}).map(([x, w]) => /* @__PURE__ */ a("div", { className: "mb-2", children: [
                  /* @__PURE__ */ a("div", { className: "font-medium", style: { color: "var(--text)" }, children: [
                    x,
                    ": ",
                    (w == null ? void 0 : w.headline) || "—"
                  ] }),
                  (w == null ? void 0 : w.description) && /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: w.description }),
                  (w == null ? void 0 : w.executor) && /* @__PURE__ */ a("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: [
                    "executor ",
                    w.executor
                  ] })
                ] }, x)),
                Object.entries(e.artifacts || {}).map(([x, w]) => /* @__PURE__ */ t("div", { className: "py-0.5", children: Cr(w) ? /* @__PURE__ */ t("a", { href: w, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: x }) : /* @__PURE__ */ a("span", { style: { color: "var(--text)" }, children: [
                  x,
                  ": ",
                  /* @__PURE__ */ t("code", { style: { color: "var(--muted)" }, children: String(w) })
                ] }) }, x)),
                !e.step_summaries && !e.artifacts && /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: "No results recorded." })
              ] }),
              l === "history" && /* @__PURE__ */ a("div", { children: [
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-1 mb-1", style: { color: "var(--muted)" }, children: "Decisions" }),
                (e.decisions || []).map((x, w) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--text)" }, children: [
                  String(x.status) === "open" ? "🔴 " : "✓ ",
                  String(x.kind),
                  " — ",
                  String(x.question || x.chosen || x.action || "")
                ] }, w)),
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Stage history" }),
                (e.history || []).map((x, w) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                  String(x.from),
                  " → ",
                  String(x.to),
                  " · ",
                  String(x.agent || ""),
                  " · ",
                  String(x.at || "")
                ] }, w)),
                (e.gate_history || []).length > 0 && /* @__PURE__ */ a(Xe, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Gates" }),
                  (e.gate_history || []).map((x, w) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.decision),
                    " ",
                    String(x.gate),
                    " · ",
                    String(x.actor || "")
                  ] }, w))
                ] }),
                (e.interjection || []).length > 0 && /* @__PURE__ */ a(Xe, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Requests / interjections" }),
                  (e.interjection || []).map((x, w) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.kind),
                    " · ",
                    String(x.status),
                    x.reason ? ` (${String(x.reason)})` : ""
                  ] }, w))
                ] })
              ] }),
              l === "execution" && /* @__PURE__ */ a("div", { children: [
                fe("current node", i == null ? void 0 : i.current_node_id),
                fe("node status", c == null ? void 0 : c.status),
                fe("permit", c == null ? void 0 : c.permit_id),
                fe("concurrency class", c == null ? void 0 : c.concurrency_class),
                fe("model (requested)", e.model_request),
                fe("model (applied)", e.model_applied),
                g && /* @__PURE__ */ a(Xe, { children: [
                  fe("topology", g.action),
                  fe("integration owner", g.integration_owner),
                  fe("children", Array.isArray(g.children) ? `${g.children.length}` : null)
                ] }),
                b && /* @__PURE__ */ a(Xe, { children: [
                  fe("worktree branch", b.branch),
                  fe("lease status", b.status),
                  fe("lease locked", b.locked ? "true" : null)
                ] }),
                fe("cancel requested", e.cancel_requested_at),
                e.writes_allowed === !1 && fe("terminal observed", "pending (cooperative cancel in progress)")
              ] })
            ] }),
            /* @__PURE__ */ t("footer", { className: "px-5 py-2 text-[9px]", style: { borderTop: "1px solid var(--border)", color: "var(--muted)" }, children: "Read-only view. Use 🔧 maintain to request changes; gate actions use the gate controls." })
          ]
        }
      )
    }
  );
}
function Ua({ onRequest: e }) {
  const [r, o] = N(!1), n = (l) => {
    const d = cr[l];
    let m = "";
    if (d.reasonRequired) {
      const i = window.prompt(d.confirm);
      if (!i || !i.trim()) return;
      m = i.trim();
    } else if (!window.confirm(d.confirm))
      return;
    e(l, m), o(!1);
  };
  return /* @__PURE__ */ a("div", { className: "relative inline-block", children: [
    /* @__PURE__ */ t(
      "button",
      {
        className: "text-[10px] hover:underline",
        style: { color: "var(--muted)" },
        title: "Request re-spec / retry / back-step / park / cancel",
        onClick: () => o((l) => !l),
        children: "🔧 maintain"
      }
    ),
    r && /* @__PURE__ */ t(
      "div",
      {
        className: "absolute z-20 mt-1 rounded-md py-1 text-[11px]",
        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 8px 28px rgba(0,0,0,0.4)", minWidth: "120px" },
        children: Object.entries(cr).map(([l, d]) => /* @__PURE__ */ t(
          "button",
          {
            className: "block w-full text-left px-3 py-1 hover:opacity-80",
            style: { color: l === "request:cancel" ? "var(--danger, #e66)" : "var(--text)" },
            onClick: () => n(l),
            children: d.label
          },
          l
        ))
      }
    )
  ] });
}
function Wa({ card: e, decision: r, onClose: o, onResolve: n }) {
  var c, b, g;
  const l = r.options || [], d = ((c = l.find((S) => S.recommended === !0)) == null ? void 0 : c.id) || ((b = l.find((S) => S.id && (r.rationale || "").toLowerCase().includes((S.id + ")").toLowerCase()))) == null ? void 0 : b.id) || ((g = l[0]) == null ? void 0 : g.id), [m, i] = N(d || "");
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[72] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (S) => {
        S.currentTarget === S.target && o();
      },
      children: /* @__PURE__ */ a(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": `decision-resolve-${r.id}`,
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(560px, calc(100vw - 32px))", maxHeight: "min(80vh, 640px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ a("header", { className: "px-5 py-4 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ a("h2", { id: `decision-resolve-${r.id}`, className: "text-[14px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: [
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
            /* @__PURE__ */ a("div", { className: "overflow-y-auto p-4 flex flex-col gap-2", children: [
              l.map((S, y) => {
                const f = S.id || String.fromCharCode(65 + y), x = m === (S.id || f), w = (S.id || f) === d;
                return /* @__PURE__ */ a(
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
                          onChange: () => i(S.id || f)
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ a("div", { className: "text-[12px] font-semibold flex items-center gap-1.5", style: { color: "var(--text-strong, var(--text))" }, children: [
                          "Option ",
                          f,
                          w && /* @__PURE__ */ t("span", { className: "text-[10px] font-normal", style: { color: "var(--accent)" }, children: "⭐ recommended" })
                        ] }),
                        /* @__PURE__ */ t("div", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: S.note }),
                        S.risk && /* @__PURE__ */ a("div", { className: "text-[10px] mt-0.5", style: { color: "var(--warn, var(--muted))" }, children: [
                          "risk: ",
                          S.risk
                        ] })
                      ] })
                    ]
                  },
                  f
                );
              }),
              r.rationale && /* @__PURE__ */ a("div", { className: "text-[10px] italic mt-1 p-2 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, transparent)" }, children: [
                "Agent rationale: ",
                r.rationale
              ] })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex items-center justify-end gap-2", style: { borderTop: "1px solid var(--border)" }, children: [
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
                    m && (n(m), o());
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
function $t({ card: e, config: r, isGate: o, cardStatus: n, effectiveCapability: l, producerStep: d, producerSession: m, onOpenProducer: i, onApprove: c, onReject: b, onCycleTrust: g, onCycleDepth: S, onSetBudget: y, onInterject: f, onResolveDecision: x, onOpenOrchestrator: w, liveView: B, allCards: O, onOpenCard: j, onRequest: z, onOpenStepSession: $, onCancelCard: F }) {
  var Ze, rt, lt, at, yt, Le, bt, it, Je;
  const Y = o ? "var(--warn)" : n.kind === "idle" ? "var(--border-strong, var(--border))" : n.color, k = e.trust || r.trust, te = e.depth || r.depth, A = ((Ze = e.parked) == null ? void 0 : Ze.length) || 0, xe = Object.values(e.step_sessions || {}).some(
    (v) => !!v.last_response_at && !v.chat_disabled_at && !v.superseded && (!v.last_response_handled_at || v.last_response_handled_at < v.last_response_at)
  ), [pe, me] = N(""), [we, je] = N(!1), [J, P] = N(null), [re, Ee] = N(!1), [Oe, Ce] = N(!1), { openChat: C } = Ar(), G = Te(() => ha(e), [e]), ae = Te(() => va(e, O || []), [e, O]), _e = Te(() => ba(e), [e]), Fe = Te(() => {
    if (!_e) return null;
    const v = (O || []).find((L) => L.id === _e);
    return v ? { id: v.id, title: v.title } : null;
  }, [_e, O]), se = G.length > 0 || ae.length > 0 || !!Fe, Q = Te(
    () => o ? ta(e, d) : null,
    [e, o, d]
  ), V = () => {
    const v = window.prompt(`Why reject revision ${(Q == null ? void 0 : Q.revision) ?? "unknown"}?`);
    v != null && v.trim() && b && b(v.trim());
  }, be = (e.decisions || []).filter((v) => !v.chosen && !v.resolved_at && (!!v.action || !!v.options)), [R, de] = N(!1), [We, Pe] = N(!1), [He, he] = N(() => {
    const v = Number(typeof localStorage < "u" && localStorage.getItem("dlc-live-wing-width"));
    return Number.isFinite(v) && v >= 220 ? v : 320;
  }), vt = (lt = (rt = e.step_sessions) == null ? void 0 : rt[e.stage]) == null ? void 0 : lt.slot_key, ge = (() => {
    var Ie, Ae, nt, Ve;
    const v = (Ie = e.step_results) == null ? void 0 : Ie[e.stage], L = v && typeof v == "object" && v.bundle && typeof v.bundle == "object" ? v.bundle.summary : void 0;
    if (typeof L == "string" && L.trim()) return L;
    const le = (Ae = e.step_progress) == null ? void 0 : Ae[e.stage], ve = le && typeof le == "object" && Array.isArray(le.lines) ? le.lines : [];
    if (ve.length) {
      const Qe = ve.map((ct) => String((ct == null ? void 0 : ct.note) || "")).filter(Boolean);
      if (Qe.length) return Qe.join(`
`);
    }
    const Ne = (Ve = (nt = e.step_summaries) == null ? void 0 : nt[e.stage]) == null ? void 0 : Ve.headline;
    return typeof Ne == "string" && Ne.trim() ? Ne : "";
  })(), $e = B || (vt ? {
    stage: e.stage,
    phase: "idle",
    tail: ge,
    buffer: ge,
    active: !1,
    seq: 0,
    slotKey: vt,
    onOpen: () => navigate(`/chat?sid=${encodeURIComponent(vt)}`)
  } : null);
  return /* @__PURE__ */ a(
    "div",
    {
      id: `card-${e.id}`,
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${Y}`,
        position: "relative",
        zIndex: 1
      },
      children: [
        (() => {
          const v = ($ || []).find((L) => L.step === e.stage);
          return v ? /* @__PURE__ */ a(
            "button",
            {
              onClick: () => v.open(),
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
        ((at = e.source) == null ? void 0 : at.repo) && /* @__PURE__ */ a(
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
          const v = (L = e.step_summaries) == null ? void 0 : L[e.stage];
          return v != null && v.headline ? /* @__PURE__ */ a("div", { className: "mt-1 flex items-start gap-1 text-[11px] leading-snug", title: v.description || v.headline, children: [
            v.needs_human ? /* @__PURE__ */ t("span", { "aria-label": "needs you", title: "Needs you", style: { color: "var(--warn)" }, children: "🔴" }) : /* @__PURE__ */ t("span", { "aria-hidden": "true", style: { color: "var(--muted)" }, children: "•" }),
            /* @__PURE__ */ t("span", { className: "truncate", style: { color: v.needs_human ? "var(--warn)" : "var(--text)" }, children: v.headline })
          ] }) : null;
        })(),
        /* @__PURE__ */ a("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "⚙ modes" }),
          /* @__PURE__ */ a(
            Ye,
            {
              color: nr[k],
              active: !!e.trust,
              onClick: g,
              title: `trust: ${k}${e.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🛡 ",
                k
              ]
            }
          ),
          /* @__PURE__ */ a(
            Ye,
            {
              color: or[te],
              active: !!e.depth,
              onClick: S,
              title: `depth: ${te}${e.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🔬 ",
                te
              ]
            }
          ),
          /* @__PURE__ */ a(
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
          y && /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-0.5", title: "Decomposition/effort budget for this card", children: [
            /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "💰" }),
            /* @__PURE__ */ t(da, { budget: e.budget, depth: te, onSave: y })
          ] })
        ] }),
        /* @__PURE__ */ a(
          "div",
          {
            className: "mt-1.5 flex items-center gap-1 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "🏷 state" }),
              /* @__PURE__ */ t(
                Ye,
                {
                  color: n.color,
                  active: n.kind !== "idle",
                  title: `${n.label}${n.reason ? ` — ${n.reason}` : ""}`,
                  children: n.label
                }
              ),
              /* @__PURE__ */ a(
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
              e.lifecycle && /* @__PURE__ */ a(Ye, { color: "var(--muted)", title: `card lifecycle: ${e.lifecycle}`, children: [
                "🔄 ",
                e.lifecycle
              ] }),
              A > 0 && /* @__PURE__ */ a(Ye, { color: "var(--warn)", title: `${A} parked idea(s)`, children: [
                "⏸ ",
                A
              ] }),
              xe && /* @__PURE__ */ t(Ye, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
              typeof ((yt = e.effort) == null ? void 0 : yt.total) == "number" && e.effort.total > 0 && /* @__PURE__ */ a(Ye, { color: "var(--info)", title: `estimated effort: ${e.effort.total} points`, children: [
                "⚡ ",
                e.effort.total
              ] }),
              e.backstep_history && e.backstep_history.length > 0 && /* @__PURE__ */ a(
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
                const v = e.decisions[e.decisions.length - 1];
                return /* @__PURE__ */ a(
                  Ye,
                  {
                    color: "var(--accent)",
                    title: `${e.decisions.length} decision${e.decisions.length === 1 ? "" : "s"} — last: ${v.question || v.kind || ""}${v.action ? ` → ${v.action}` : ""}${v.rationale ? `
${v.rationale}` : ""}`,
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
        o && Q && /* @__PURE__ */ a(
          "div",
          {
            "data-gate-inspection-summary": !0,
            className: "mt-2.5 rounded-md p-2",
            style: { background: Q.ready ? "color-mix(in srgb, var(--ok) 7%, transparent)" : "color-mix(in srgb, var(--warn) 7%, transparent)", border: `1px solid color-mix(in srgb, ${Q.ready ? "var(--ok)" : "var(--warn)"} 32%, var(--border))` },
            children: [
              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
                /* @__PURE__ */ t("span", { className: "font-semibold", style: { color: Q.ready ? "var(--ok)" : "var(--warn)" }, children: Q.ready ? "Review-ready" : "Not review-ready" }),
                /* @__PURE__ */ a("span", { className: "ml-auto", style: { color: "var(--muted)" }, children: [
                  "r",
                  Q.revision ?? "?"
                ] }),
                /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: Q.reviewStatus })
              ] }),
              /* @__PURE__ */ t("div", { className: "mt-1 text-[11px] leading-snug overflow-hidden", style: { color: Q.summary ? "var(--text)" : "var(--warn)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: Q.summary || "No review bundle summary published." }),
              !Q.ready && /* @__PURE__ */ a("div", { className: "mt-1 text-[9px]", style: { color: "var(--muted)" }, children: [
                Q.missing.length,
                " readiness gap",
                Q.missing.length === 1 ? "" : "s"
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
        o && c && b && /* @__PURE__ */ a("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          (() => {
            const v = (e.gate_commands || []).filter((Ie) => Ie.gate === e.stage), L = v.length ? v[v.length - 1] : void 0, le = (L == null ? void 0 : L.status) === "pending", ve = (L == null ? void 0 : L.status) === "rejected", Ne = (L == null ? void 0 : L.status) === "applied" || (L == null ? void 0 : L.status) === "approved";
            return /* @__PURE__ */ a(Xe, { children: [
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: le,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--ok)", color: "var(--bg)" },
                  onClick: c,
                  title: le ? "A gate command is being processed…" : "Approve this gate",
                  children: [
                    le && (L == null ? void 0 : L.action) === "approve" && /* @__PURE__ */ t(Rt, { size: 10 }),
                    le && (L == null ? void 0 : L.action) === "approve" ? "Approving…" : "✓ Approve"
                  ]
                }
              ),
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: le,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--danger)", color: "var(--bg)" },
                  onClick: V,
                  children: [
                    le && (L == null ? void 0 : L.action) === "reject" && /* @__PURE__ */ t(Rt, { size: 10 }),
                    le && (L == null ? void 0 : L.action) === "reject" ? "Rejecting…" : "✕ Reject"
                  ]
                }
              ),
              le && /* @__PURE__ */ a("span", { className: "text-[10px] inline-flex items-center gap-1", style: { color: "var(--muted)" }, children: [
                /* @__PURE__ */ t(Rt, { size: 10 }),
                " ",
                L == null ? void 0 : L.action,
                " sent — runtime processing…"
              ] }),
              ve && /* @__PURE__ */ a(
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
              Ne && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--ok)" }, children: [
                "✓ ",
                L == null ? void 0 : L.action,
                " applied"
              ] })
            ] });
          })(),
          m && i && /* @__PURE__ */ a(
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
            const v = (Ne = e.source) == null ? void 0 : Ne.repo;
            if (!v) return null;
            const L = (Ie = e.artifacts) == null ? void 0 : Ie.pr_url, le = L && ((Ae = /\/pull\/(\d+)/.exec(L)) == null ? void 0 : Ae[1]), ve = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + v)}` + (le ? `&pr=${le}` : "");
            return /* @__PURE__ */ a(
              "a",
              {
                href: ve,
                title: L ? `Deep-review PR #${le} in Code Review Sage` : `Open Code Review Sage for ${v}`,
                className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
                style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: [
                  /* @__PURE__ */ a("svg", { width: "11", height: "11", viewBox: "0 0 16 16", fill: "none", children: [
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
          const v = e.block_reason || {}, L = new Set(be.map((ve) => ve.step).filter(Boolean)), le = Object.entries(v).filter(([ve]) => !L.has(ve));
          return le.length ? le.map(([ve, Ne]) => /* @__PURE__ */ a(
            "div",
            {
              className: "mt-2 p-2 rounded-md text-[11px]",
              style: { background: "color-mix(in srgb, var(--danger, #e66) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--danger, #e66) 35%, var(--border))" },
              children: [
                /* @__PURE__ */ a("div", { className: "font-semibold", style: { color: "var(--danger, #e66)" }, children: [
                  "⏸ Blocked · ",
                  ve
                ] }),
                /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: Ne }),
                f && /* @__PURE__ */ t(
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
        x && be.map((v) => {
          var Ne, Ie;
          const L = v.step && ((Ne = e.block_reason) != null && Ne[v.step]) ? v.step : Object.keys(e.block_reason || {})[0], le = L ? (Ie = e.block_reason) == null ? void 0 : Ie[L] : void 0, ve = v.options || [];
          return /* @__PURE__ */ a(
            "div",
            {
              className: "mt-2 p-2 rounded-md text-[11px]",
              style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
              children: [
                /* @__PURE__ */ a("div", { className: "font-semibold", style: { color: "var(--text, var(--muted))" }, children: [
                  "⚖ Decision needed",
                  v.step ? ` · ${v.step}` : "",
                  v.confidence ? ` · confidence ${v.confidence}` : ""
                ] }),
                /* @__PURE__ */ t("div", { className: "mt-1", style: { color: "var(--text, var(--muted))" }, children: v.question || v.kind }),
                le && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: le }),
                ve.length > 0 && /* @__PURE__ */ t("div", { className: "mt-1.5 flex flex-col gap-1", children: ve.map((Ae, nt) => {
                  const Ve = Ae.id || String.fromCharCode(65 + nt), Qe = Ae.recommended === !0 || v.chosen === Ae.id || (v.rationale || "").toLowerCase().includes((Ae.id || "").toLowerCase() + ")");
                  return /* @__PURE__ */ a(
                    "div",
                    {
                      className: "flex items-start gap-2 p-1 rounded",
                      style: { background: Qe ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent" },
                      children: [
                        /* @__PURE__ */ a(
                          "button",
                          {
                            className: "text-[10px] px-2 py-0.5 rounded font-semibold shrink-0",
                            style: { background: "var(--accent)", color: "var(--bg)" },
                            title: `Resolve this decision by selecting option ${Ve} — the step resumes on this branch`,
                            onClick: () => x(v.id, Ae.id || Ve),
                            children: [
                              "Choose ",
                              Ve
                            ]
                          }
                        ),
                        /* @__PURE__ */ a("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
                          Ae.note,
                          Ae.risk ? ` · risk: ${Ae.risk}` : "",
                          Qe ? "  ⭐ recommended" : ""
                        ] })
                      ]
                    },
                    Ve
                  );
                }) }),
                v.rationale && /* @__PURE__ */ a("div", { className: "mt-1 text-[10px] italic", style: { color: "var(--muted)" }, children: [
                  "Agent rationale: ",
                  v.rationale
                ] }),
                /* @__PURE__ */ a("div", { className: "mt-1.5 flex items-center gap-2", children: [
                  ve.length > 0 && /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded font-semibold",
                      style: { background: "var(--accent)", color: "var(--bg)" },
                      title: "Open a picker to select an option and resolve this decision",
                      onClick: () => P(v.id),
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
                      onClick: () => x(v.id),
                      children: "Acknowledge & continue"
                    }
                  )
                ] })
              ]
            },
            v.id
          );
        }),
        $e && /* @__PURE__ */ a(Xe, { children: [
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
                pointerEvents: R ? "auto" : "none"
              },
              children: /* @__PURE__ */ a(
                "div",
                {
                  className: We ? void 0 : "dlc-wing-slide",
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: "100%",
                    transform: R ? "translateX(0)" : "translateX(-100%)",
                    willChange: "transform",
                    background: "var(--card)",
                    color: "var(--card-fg, var(--text))",
                    border: "1px solid var(--border)",
                    borderRight: `2px solid ${Y}`,
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
                        onMouseDown: (v) => {
                          v.preventDefault();
                          const L = v.clientX, le = He;
                          let ve = le;
                          Pe(!0);
                          const Ne = (Ae) => {
                            ve = Math.min(720, Math.max(240, le + (Ae.clientX - L))), he(ve);
                          }, Ie = () => {
                            Pe(!1);
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
                    /* @__PURE__ */ a(
                      "div",
                      {
                        className: "flex items-center gap-1.5 px-2 py-1.5 text-[10px]",
                        style: { borderBottom: "1px solid var(--border)" },
                        children: [
                          /* @__PURE__ */ a("span", { className: "uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                            Za[$e.stage] || "⚙",
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
                    /* @__PURE__ */ t(Qa, { tail: $e.buffer || $e.tail, active: $e.active }),
                    f && /* @__PURE__ */ a("div", { className: "px-2 py-1.5 flex items-center gap-1.5", style: { borderTop: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: pe,
                          onChange: (v) => me(v.target.value),
                          onKeyDown: (v) => {
                            v.key === "Enter" && pe.trim() && (f("note", pe.trim()), me(""));
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
                            pe.trim() && (f("note", pe.trim()), me(""));
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
              className: We ? void 0 : "dlc-wing-slide",
              "aria-label": R ? "Collapse live session panel" : "Open live session panel",
              title: R ? "Collapse live session" : "Open live session",
              onClick: () => de((v) => !v),
              style: {
                position: "absolute",
                top: "10px",
                left: "100%",
                zIndex: 1,
                width: "14px",
                height: "46px",
                cursor: "pointer",
                padding: 0,
                transform: R ? `translateX(${He}px)` : "translateX(0)",
                transition: We ? "none" : void 0,
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
              children: /* @__PURE__ */ t("span", { style: { fontSize: "9px", lineHeight: 1 }, "aria-hidden": "true", children: R ? "›" : "‹" })
            }
          )
        ] }),
        /* @__PURE__ */ t(Ba, { card: e, openChat: C }),
        (f || w || $ && $.length || F) && /* @__PURE__ */ a(
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
                  onClick: () => de(!0),
                  children: "💬 steer session"
                }
              ),
              w && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: (Le = e.orchestrator_session) != null && Le.slot_key || (bt = e.orchestrator_session) != null && bt.session_key ? "Open this pipeline’s orchestrator session" : "Trigger an inspectable orchestrator session for this card",
                  onClick: () => w(),
                  children: (it = e.orchestrator_session) != null && it.slot_key || (Je = e.orchestrator_session) != null && Je.session_key ? "⚙ open orchestrator" : "⚙ orchestrator"
                }
              ),
              se && /* @__PURE__ */ a(
                "button",
                {
                  className: "text-[10px] hover:underline inline-flex items-center gap-0.5",
                  style: { color: "var(--muted)" },
                  title: "Card timeline — the ordered story of what happened",
                  onClick: () => Ee(!0),
                  children: [
                    "📜 timeline",
                    G.some((v) => v.needs_human) ? " 🔴" : "",
                    ae.length > 0 ? ` 🌿${ae.length}` : ""
                  ]
                }
              ),
              z && /* @__PURE__ */ t(Ua, { onRequest: z }),
              ($ || []).map((v) => /* @__PURE__ */ a(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--accent)" },
                  title: `Open the ${v.step} step session`,
                  onClick: () => v.open(),
                  children: [
                    "⚙ ",
                    v.step
                  ]
                },
                v.step
              )),
              F && !["cancelled", "canceled", "retired", "merged"].includes(String(e.lifecycle || "")) && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--danger, #e66)" },
                  title: "Cancel this card (cooperative — revokes writes, retains worktree until terminal)",
                  onClick: () => F(),
                  children: "⏹ cancel"
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: "Card details (read-only)",
                  onClick: () => Ce(!0),
                  children: "🔍 details"
                }
              )
            ]
          }
        ),
        re && /* @__PURE__ */ t(
          rn,
          {
            card: e,
            events: G,
            children: ae,
            parent: Fe,
            onOpenCard: j,
            onClose: () => Ee(!1)
          }
        ),
        Oe && /* @__PURE__ */ t(
          Fa,
          {
            card: e,
            cardStatus: n,
            effectiveCapability: String(l),
            onClose: () => Ce(!1)
          }
        ),
        we && Q && /* @__PURE__ */ t(
          Da,
          {
            card: e,
            inspection: Q,
            producerSession: m,
            onClose: () => je(!1),
            onOpenProducer: i,
            onApprove: c,
            onReject: b,
            onInterject: f ? () => {
              je(!1), de(!0);
            } : void 0
          }
        ),
        J && x && (() => {
          const v = (e.decisions || []).find((L) => L.id === J);
          return v ? /* @__PURE__ */ t(
            Wa,
            {
              card: e,
              decision: v,
              onClose: () => P(null),
              onResolve: (L) => x(v.id, L)
            }
          ) : null;
        })()
      ]
    }
  );
}
function At({ title: e, count: r, children: o, id: n }) {
  return /* @__PURE__ */ a("div", { id: n, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
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
function Pa({ config: e, onSet: r }) {
  function o({ label: n, value: l, options: d, tokens: m, onPick: i }) {
    return /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: n }),
      /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: d.map((c) => {
        const b = l === c;
        return /* @__PURE__ */ t(
          "button",
          {
            onClick: () => i(c),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: b ? m[c] : "var(--muted)",
              background: b ? `color-mix(in srgb, ${m[c]} 16%, transparent)` : "transparent",
              boxShadow: b ? `inset 0 0 0 1px color-mix(in srgb, ${m[c]} 45%, transparent)` : "none"
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
        /* @__PURE__ */ t("span", { className: "text-xs font-semibold", style: { color: "var(--muted-strong, var(--muted))" }, children: "Defaults" }),
        /* @__PURE__ */ t(o, { label: "Trust", value: e.trust, options: xt, tokens: nr, onPick: (n) => r({ trust: n }) }),
        /* @__PURE__ */ t(o, { label: "Depth", value: e.depth, options: Tt, tokens: or, onPick: (n) => r({ depth: n }) }),
        /* @__PURE__ */ t("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
const Ha = {
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
function Ga({ pipeline: e, cards: r, extras: o, onOpenCard: n }) {
  const { events: l, actors: d, now: m } = Te(
    () => ka(e, r, o),
    [e, r, o]
  );
  return e ? l.length === 0 ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "No recorded events for this pipeline yet." }) : /* @__PURE__ */ a("div", { className: "w-full overflow-x-auto pb-4", children: [
    m && /* @__PURE__ */ a("div", { className: "text-[10px] mb-2 flex flex-wrap gap-2", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ t("span", { children: "now:" }),
      /* @__PURE__ */ a("span", { children: [
        "▶ running ",
        (m.running_node_ids || []).length
      ] }),
      /* @__PURE__ */ a("span", { children: [
        "◷ ready ",
        (m.ready_node_ids || []).length
      ] }),
      /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
        "⛔ blocked ",
        (m.blocked_node_ids || []).length
      ] })
    ] }),
    /* @__PURE__ */ t("div", { className: "text-[10px] mb-2 flex flex-wrap gap-3", style: { color: "var(--muted)" }, children: d.map((i) => /* @__PURE__ */ a("span", { children: [
      qr[i] || "•",
      " ",
      i
    ] }, i)) }),
    /* @__PURE__ */ t("ol", { className: "flex flex-col gap-1.5", style: { borderLeft: "1px solid var(--border)", paddingLeft: "10px" }, children: l.map((i) => {
      const c = Ha[i.kind] || "var(--text)";
      return /* @__PURE__ */ a("li", { className: "flex items-start gap-2 text-[11px]", children: [
        /* @__PURE__ */ t("span", { className: "text-[9px] flex-shrink-0 mt-0.5 tabular-nums", style: { color: "var(--muted)", minWidth: "62px" }, children: i.at ? i.at.replace("T", " ").replace("Z", "").slice(5) : "" }),
        /* @__PURE__ */ t("span", { "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", title: i.actor, children: i.glyph }),
        /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ a(
            "button",
            {
              className: "text-left hover:underline",
              onClick: () => i.cardId && (n == null ? void 0 : n(i.cardId)),
              title: i.cardId ? "Open card" : void 0,
              style: { color: c },
              children: [
                i.headline,
                i.inferred && /* @__PURE__ */ t("span", { className: "ml-1 text-[8px] px-1 rounded-full", style: { color: "var(--muted)", border: "1px solid var(--border)" }, children: "~inferred" }),
                i.needs_human && /* @__PURE__ */ t("span", { className: "ml-1", children: "🔴" })
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
  ] }) : /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "No pipeline selected." });
}
function Ka({ cards: e }) {
  const r = e.flatMap(
    (o) => (o.parked || []).map((n) => {
      var l;
      return { ...n, cardTitle: o.title, repo: (l = o.source) == null ? void 0 : l.repo };
    })
  ).sort((o, n) => (n.at || "").localeCompare(o.at || ""));
  return r.length === 0 ? /* @__PURE__ */ a("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ a("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ t("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ t("div", { className: "flex flex-col gap-2 max-w-2xl", children: r.map((o) => /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: o.note }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ a("span", { children: [
        "from ",
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: o.cardTitle })
      ] }),
      o.phase && /* @__PURE__ */ a("span", { children: [
        "· parked at ",
        o.phase
      ] }),
      o.repo && /* @__PURE__ */ a("span", { children: [
        "· ",
        o.repo
      ] }),
      o.issue_url && /* @__PURE__ */ t("a", { href: o.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, o.id)) });
}
function Va({ repos: e, selected: r, onToggle: o, onClear: n, onAddWorkspace: l, onEdit: d }) {
  const m = e.reduce((b, g) => b + g.count, 0), i = r.size === 0, c = ({ name: b, count: g, label: S, checked: y, onClick: f, isAll: x }) => {
    const [w, B] = N(!1);
    return /* @__PURE__ */ a(
      "div",
      {
        onMouseEnter: () => B(!0),
        onMouseLeave: () => B(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: y ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: y ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ a(
            "button",
            {
              onClick: f,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                x ? /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: y ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ t(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: y ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${y ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: y && /* @__PURE__ */ t("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ t("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ t(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: y ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: S
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
          !x && b && /* @__PURE__ */ t(
            "button",
            {
              onClick: (O) => {
                O.stopPropagation(), d(b);
              },
              title: `Edit pipeline "${S}"`,
              "aria-label": `Edit pipeline ${S}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: w ? 1 : 0,
                pointerEvents: w ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (O) => {
                const j = O.currentTarget;
                j.style.color = "var(--accent)", j.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (O) => {
                const j = O.currentTarget;
                j.style.color = "var(--text-strong, var(--text))", j.style.borderColor = "var(--border-strong, var(--border))";
              },
              children: /* @__PURE__ */ t("svg", { width: "13", height: "13", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ t("path", { d: "M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) })
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
          /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspaces" }),
          r.size > 0 && /* @__PURE__ */ t("button", { onClick: n, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ t(c, { isAll: !0, count: m, label: "All repos", checked: i, onClick: n }),
        e.map((b) => /* @__PURE__ */ t(
          c,
          {
            name: b.name,
            count: b.count,
            label: (Br.has(b.name) ? "Example: " : "") + (b.name.includes("/") ? b.name.split("/")[1] : b.name),
            checked: r.has(b.name),
            onClick: () => o(b.name)
          },
          b.name
        )),
        /* @__PURE__ */ a(
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
        r.size > 1 && /* @__PURE__ */ a("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          r.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const Xa = [
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
function Ya({ initial: e, agentProfiles: r, crews: o, repo: n, stepName: l, onSave: d, onSaveCrew: m, onClose: i }) {
  const [c, b] = N(e.name || ""), [g, S] = N(e.role || ""), [y, f] = N(e.tools || ["read"]), [x, w] = N(e.model || "auto"), [B, O] = N(e.crew || ""), [j, z] = N(e.addenda || []), [$, F] = N(e.capability || ""), [Y, k] = N(e.trust || ""), [te, A] = N(e.depth || ""), [xe, pe] = N(!1), me = r.find((C) => C.name === c), we = o.find((C) => C.name === B), je = [.../* @__PURE__ */ new Set([...Xa, ...y])], J = (C) => {
    const G = La({ name: c, role: g, tools: y, model: x, crew: B, addenda: j, capability: $, trust: Y, depth: te }, C);
    b(G.name), f(G.tools || []), w(G.model || "auto"), G.capability && F(G.capability);
  }, P = (C) => f((G) => G.includes(C) ? G.filter((ae) => ae !== C) : [...G, C]), re = () => z((C) => {
    var G;
    return C.length >= 3 ? C : [...C, { crew: ((G = o[0]) == null ? void 0 : G.name) || "", when: "always", writes: "" }];
  }), Ee = (C, G) => z((ae) => ae.map((_e, Fe) => Fe === C ? { ..._e, ...G } : _e)), Oe = (C) => z((G) => G.filter((ae, _e) => _e !== C)), Ce = c.trim().length > 0;
  return /* @__PURE__ */ a("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ a("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ t("button", { onClick: i, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ a("div", { className: "ml-1", children: [
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
    /* @__PURE__ */ a("div", { className: "px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto", children: [
      r.length > 0 && /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between gap-2", children: [
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
            onClick: () => J(C),
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
        me && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1.5 rounded-md px-2 py-1.5", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
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
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: c,
            onChange: (C) => b(C.target.value),
            placeholder: "e.g. impl-agent",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Role / prompt" }),
        /* @__PURE__ */ t(
          "textarea",
          {
            value: g,
            onChange: (C) => S(C.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: je.map((C) => {
          const G = y.includes(C);
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => P(C),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: G ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: G ? "var(--accent)" : "var(--muted)",
                boxShadow: G ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: C
            },
            C
          );
        }) })
      ] }),
      /* @__PURE__ */ a("div", { className: "rounded-md p-2.5", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ a("div", { children: [
            /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Capability profile" }),
            /* @__PURE__ */ t("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: "Trust = when · depth = how much · capability = what authority" })
          ] }),
          /* @__PURE__ */ a(
            "select",
            {
              value: $,
              onChange: (C) => F(C.target.value),
              className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "auto-derived" }),
                ["readonly", "authoring", "builder", "coordinator"].map((C) => /* @__PURE__ */ t("option", { value: C, children: C }, C))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "text-[10px] mt-2", style: { color: $ === "coordinator" ? "var(--warn)" : "var(--muted)" }, children: [
          "The tools above are requested/declared—not proof of runtime access. Actual crew authority comes from its ",
          /* @__PURE__ */ t("code", { children: "kiro_agent" }),
          " profile; widening remains trust-gated and handshake-verified."
        ] })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ t(
          "input",
          {
            value: x,
            onChange: (C) => w(C.target.value),
            placeholder: "auto",
            className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Crew" }),
          /* @__PURE__ */ a(
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
        we && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: [
          "Global route ",
          /* @__PURE__ */ t("code", { children: we.name }),
          " → ",
          /* @__PURE__ */ t("code", { children: we.kiroAgent || "profile unknown" }),
          we.workspace ? ` · workspace ${we.workspace}` : "",
          we.description ? ` · ${we.description}` : ""
        ] })
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ t(
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
        /* @__PURE__ */ t("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        j.length === 0 && /* @__PURE__ */ t("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        j.map((C, G) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ t(
            "select",
            {
              value: C.crew,
              onChange: (ae) => Ee(G, { crew: ae.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: o.map((ae) => /* @__PURE__ */ t("option", { value: ae.name, children: ae.name }, ae.name))
            }
          ),
          /* @__PURE__ */ a(
            "select",
            {
              value: C.when || "always",
              onChange: (ae) => Ee(G, { when: ae.target.value }),
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
              onChange: (ae) => Ee(G, { writes: ae.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ t("button", { onClick: () => Oe(G), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ t("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ t("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, G))
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...xt].map((C) => {
          const G = Y === C;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => k(C),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: G ? C ? nr[C] : "var(--text)" : "var(--muted)", background: G ? "var(--bg-hover, var(--border))" : "transparent" },
              children: C || "inherit"
            },
            C || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Tt].map((C) => {
          const G = te === C;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => A(C),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: G ? C ? or[C] : "var(--text)" : "var(--muted)", background: G ? "var(--bg-hover, var(--border))" : "transparent" },
              children: C || "inherit"
            },
            C || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ a("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ t("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ t(
        "button",
        {
          disabled: !Ce,
          onClick: () => d({
            name: c.trim(),
            role: g.trim() || void 0,
            tools: y,
            model: x.trim() && x.trim() !== "auto" ? x.trim() : void 0,
            crew: B || void 0,
            addenda: j.length ? j.filter((C) => C.crew) : void 0,
            capability: $ || void 0,
            trust: Y || void 0,
            depth: te || void 0
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
        crews: o,
        context: `${n || "unassigned pipeline"} · ${l || "unnamed step"}`,
        onSaveCrew: m,
        onClose: () => pe(!1),
        onSelectProfile: (C) => {
          J(C), pe(!1);
        },
        onSelectCrew: (C) => {
          O(C.name), pe(!1);
        }
      }
    )
  ] });
}
function $r({ candidates: e, existingRepos: r, defaults: o, agentProfiles: n, crews: l, onCreate: d, onSaveCrew: m, onClose: i, editPipeline: c, cardCount: b, isExample: g, onDelete: S }) {
  var nt, Ve, Qe, ct, jt, Et, Ot, Ut, kt, wt, Nt, Wt, Lt, It, Pt;
  const y = !!c, [f, x] = N((c == null ? void 0 : c.repo) || ""), [w, B] = N((c == null ? void 0 : c.workspace) || "default"), [O, j] = N((c == null ? void 0 : c.repo_path) || ""), [z, $] = N((c == null ? void 0 : c.source) || "manual"), [F, Y] = N((c == null ? void 0 : c.trust) || o.trust), [k, te] = N((c == null ? void 0 : c.depth) || o.depth), A = c == null ? void 0 : c.budget, [xe, pe] = N(
    A ? A.max_child_cards === "unlimited" && A.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [me, we] = N(
    () => A && A.max_child_cards !== "unlimited" && A.effort_ceiling !== "unlimited" ? { ...A } : Sr((c == null ? void 0 : c.depth) || o.depth)
  ), [je, J] = N((c == null ? void 0 : c.backlog_intake) ?? !0), [P, re] = N((c == null ? void 0 : c.results_in_repo) ?? !1), [Ee, Oe] = N((c == null ? void 0 : c.conversation_log) ?? !1), [Ce, C] = N(((c == null ? void 0 : c.trusted_authors) || []).join(`
`)), [G, ae] = N((c == null ? void 0 : c.self_enabling) ?? !1), [_e, Fe] = N((c == null ? void 0 : c.approach) || "simplified"), [se, Q] = N((c == null ? void 0 : c.sync_mode) || "poll"), [V, be] = N(() => {
    var h;
    return (h = c == null ? void 0 : c.steps) != null && h.length ? c.steps.map((T) => ({ ...T })) : rr.map((T) => ({ ...T }));
  }), [R, de] = N(null), [We, Pe] = N(""), [He, he] = N("settings"), [vt, ge] = N(!1), $e = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", Ze = (h, T) => be((ye) => ye.map((Re, ie) => ie === h ? { ...Re, ...T } : Re)), rt = (h) => be((T) => T.filter((ye, Re) => Re !== h)), lt = (h, T) => be((ye) => {
    const Re = h + T;
    if (Re < 0 || Re >= ye.length) return ye;
    const ie = [...ye];
    return [ie[h], ie[Re]] = [ie[Re], ie[h]], ie;
  }), at = (h) => be((T) => [...T, {
    id: `${h}-${Math.random().toString(36).slice(2, 6)}`,
    name: h === "gate" ? "New Gate" : "New Step",
    type: h,
    agent: h === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), yt = (h) => {
    x(h.repo || ""), B(h.workspace || "default"), j(h.path || ""), $(h.source);
  }, Le = (h) => {
    let T = (h || "").trim();
    if (!T) return "";
    const ye = T.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return ye && (T = ye[1]), T.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, bt = (h) => {
    const T = /github\.com|gitlab\.com/i.test(h);
    x(T ? Le(h) : h), $("manual");
  }, it = [...new Map(
    Ce.split(/[\n,]/).map((h) => h.trim()).filter(Boolean).map((h) => [h.toLowerCase(), h])
  ).values()], Je = it.every((h) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(h)), v = /^[A-Za-z0-9_.-]{1,80}$/.test(w), L = (/^[^/\s]+\/[^/\s]+$/.test(Le(f)) || e.some((h) => h.repo && h.repo === f)) && Je && v, le = !y && r.has(Le(f)), ve = ({ value: h, options: T, tokens: ye, onPick: Re }) => /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: T.map((ie) => {
    const qt = h === ie;
    return /* @__PURE__ */ t(
      "button",
      {
        onClick: () => Re(ie),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: qt ? ye[ie] : "var(--muted)",
          background: qt ? `color-mix(in srgb, ${ye[ie]} 16%, transparent)` : "transparent",
          boxShadow: qt ? `inset 0 0 0 1px color-mix(in srgb, ${ye[ie]} 45%, transparent)` : "none"
        },
        children: ie
      },
      ie
    );
  }) }), Ne = { "issue-radar": [], workspace: [], manual: [] };
  e.forEach((h) => {
    var T;
    (Ne[T = h.source] || (Ne[T] = [])).push(h);
  });
  const Ie = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" }, Ae = y ? ["settings", "webhook", "danger"] : ["settings", "webhook"];
  return /* @__PURE__ */ t(
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
            vt && /* @__PURE__ */ t(
              dr,
              {
                profiles: n,
                crews: l,
                context: f || w,
                onSaveCrew: m,
                onClose: () => ge(!1)
              }
            ),
            R !== null ? /* @__PURE__ */ t(
              Ya,
              {
                initial: {
                  name: ((Ve = (nt = V[R]) == null ? void 0 : nt.agent) == null ? void 0 : Ve.name) || "",
                  role: (ct = (Qe = V[R]) == null ? void 0 : Qe.agent) == null ? void 0 : ct.role,
                  tools: (Et = (jt = V[R]) == null ? void 0 : jt.agent) == null ? void 0 : Et.tools,
                  model: (Ut = (Ot = V[R]) == null ? void 0 : Ot.agent) == null ? void 0 : Ut.model,
                  crew: (wt = (kt = V[R]) == null ? void 0 : kt.agent) == null ? void 0 : wt.crew,
                  addenda: (Nt = V[R]) == null ? void 0 : Nt.addenda,
                  capability: (Wt = V[R]) == null ? void 0 : Wt.capability,
                  trust: (Lt = V[R]) == null ? void 0 : Lt.trust,
                  depth: (It = V[R]) == null ? void 0 : It.depth
                },
                agentProfiles: n,
                crews: l,
                repo: f,
                stepName: ((Pt = V[R]) == null ? void 0 : Pt.name) || "",
                onSaveCrew: m,
                onClose: () => de(null),
                onSave: (h) => {
                  Ze(R, {
                    agent: { name: h.name, role: h.role, tools: h.tools, model: h.model, crew: h.crew },
                    addenda: h.addenda,
                    capability: h.capability,
                    trust: h.trust,
                    depth: h.depth
                  }), de(null);
                }
              }
            ) : /* @__PURE__ */ a(Xe, { children: [
              /* @__PURE__ */ a("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { children: [
                  /* @__PURE__ */ t("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: y ? "Edit Pipeline" : "New Pipeline" }),
                  /* @__PURE__ */ t("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: y ? f.includes("/") ? f.split("/")[1] : f : "Configure a pipeline for a repository or workspace" })
                ] }),
                /* @__PURE__ */ t("button", { onClick: i, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
              ] }),
              /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: Ae.map((h) => {
                const T = He === h, ye = h === "danger";
                return /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: () => he(h),
                    className: "text-[12px] px-3 py-2 font-semibold transition-all",
                    style: {
                      color: T ? ye ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                      borderBottom: `2px solid ${T ? ye ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
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
                  style: { display: He === "settings" ? "flex" : "none" },
                  children: [
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: f,
                          onChange: (h) => bt(h.target.value),
                          onPaste: (h) => {
                            const T = h.clipboardData.getData("text");
                            /github\.com|gitlab\.com/i.test(T) && (h.preventDefault(), bt(T));
                          },
                          placeholder: "https://github.com/owner/name  ·  or  owner/name",
                          disabled: y,
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${le ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                        }
                      ),
                      !y && f && Le(f) !== f && /* @__PURE__ */ a("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                        "→ ",
                        /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: Le(f) })
                      ] }),
                      le && /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                      /* @__PURE__ */ t("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((h) => Ne[h].length > 0 && /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Ie[h] }),
                        /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1.5", children: Ne[h].map((T) => {
                          const ye = `${h}:${T.workspace || T.repo}:${T.path || ""}`, Re = T.source === "workspace" ? w === T.workspace && O === (T.path || "") : f === T.repo;
                          return /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => yt(T),
                              disabled: !!T.repo && r.has(T.repo),
                              title: T.detail || T.repo || T.workspace,
                              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                              style: {
                                background: Re ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                                color: Re ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                                boxShadow: Re ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                              },
                              children: T.label || (T.repo.includes("/") ? T.repo.split("/")[1] : T.repo) || T.workspace
                            },
                            ye
                          );
                        }) })
                      ] }, h)) })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspace partition" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: w,
                          onChange: (h) => B(h.target.value.trim()),
                          placeholder: "default",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${v ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: v ? "var(--muted)" : "var(--danger)" }, children: [
                        "Partitions results and ledgers. It is independent from ",
                        /* @__PURE__ */ t("code", { children: "owner/name" }),
                        " and never inferred from a filesystem path."
                      ] })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Local checkout path" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: O,
                          onChange: (h) => j(h.target.value),
                          placeholder: "/absolute/path/to/checkout",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ t("div", { className: "text-[10px] mt-1", style: { color: "var(--muted)" }, children: "Required before code or repo-mirrored results run. Mutable steps block rather than use the shared checkout when this path is absent or unverifiable." })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                      /* @__PURE__ */ t(ve, { value: F, options: xt, tokens: nr, onPick: Y })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                      /* @__PURE__ */ t(ve, { value: k, options: Tt, tokens: or, onPick: te })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
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
                      const h = Sr(k);
                      return /* @__PURE__ */ a("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                        "Follows ",
                        /* @__PURE__ */ t("strong", { children: k }),
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
                    xe === "unlimited" && /* @__PURE__ */ t("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                    xe === "custom" && /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max child cards",
                        /* @__PURE__ */ t(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: me.max_child_cards,
                            onChange: (h) => we((T) => ({ ...T, max_child_cards: Math.max(0, Number(h.target.value) || 0) })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                          }
                        )
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Effort ceiling",
                        /* @__PURE__ */ t(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: me.effort_ceiling,
                            onChange: (h) => we((T) => ({ ...T, effort_ceiling: Math.max(0, Number(h.target.value) || 0) })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                          }
                        )
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max feature size",
                        /* @__PURE__ */ t(
                          "select",
                          {
                            value: me.max_feature_size,
                            onChange: (h) => we((T) => ({ ...T, max_feature_size: h.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["S", "M", "L", "XL"].map((h) => /* @__PURE__ */ t("option", { children: h }, h))
                          }
                        )
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Addenda",
                        /* @__PURE__ */ t(
                          "select",
                          {
                            value: me.addenda,
                            onChange: (h) => we((T) => ({ ...T, addenda: h.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["none", "obvious", "proactive"].map((h) => /* @__PURE__ */ t("option", { children: h }, h))
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { className: "min-w-0 pr-3", children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "GitHub sync mode" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: se === "webhook" ? "Webhook is the fast path; the safety-net poll reconciles this pipeline on a longer window. Requires the app-wide webhook receiver enabled — falls back to polling if it is not." : "Poll reconciles this pipeline every cycle (default). Correct when no webhook is configured." })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex rounded-md overflow-hidden flex-shrink-0", style: { border: "1px solid var(--border)" }, children: ["poll", "webhook"].map((h) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => Q(h),
                          className: "text-[11px] px-2.5 py-1 font-semibold",
                          style: {
                            background: se === h ? "var(--accent)" : "transparent",
                            color: se === h ? "var(--bg)" : "var(--muted)"
                          },
                          children: h === "poll" ? "Poll" : "Webhook"
                        },
                        h
                      )) })
                    ] }),
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Backlog auto-intake" }),
                        /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                          "Back-feed open ",
                          /* @__PURE__ */ t("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
                          " issues as cards"
                        ] })
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => J((h) => !h),
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
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                        /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                          "Also commit results & the pipeline conversation to a ",
                          /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: ".dlc-yolo/" }),
                          " copy in the owned repo (always kept in app data)"
                        ] })
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => re((h) => !h),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: P ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: P ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Pipeline conversation log" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Opt in to the review-oriented command transcript; off means no log file is created" })
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => Oe((h) => !h),
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
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trusted GitHub authors · optional" }),
                      /* @__PURE__ */ t(
                        "textarea",
                        {
                          value: Ce,
                          onChange: (h) => C(h.target.value),
                          rows: 2,
                          placeholder: "Defaults to the authenticated GitHub user",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Je ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: Je ? "var(--muted)" : "var(--danger)" }, children: [
                        "One login per line. Empty never means allow-all; it falls back to the authenticated ",
                        /* @__PURE__ */ t("code", { children: "gh" }),
                        " user."
                      ] })
                    ] }),
                    /* @__PURE__ */ a("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => ae((h) => !h),
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
                    G && /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((h) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => Fe(h),
                          className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                          style: {
                            background: _e === h ? "var(--accent)" : "transparent",
                            color: _e === h ? "var(--bg)" : "var(--muted)",
                            border: `1px solid ${_e === h ? "var(--accent)" : "var(--border)"}`
                          },
                          children: h
                        },
                        h
                      )) })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ a("div", { className: "flex items-center justify-between mb-1.5", children: [
                        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                        /* @__PURE__ */ a("div", { className: "flex gap-1", children: [
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => ge(!0),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--muted)", border: "1px solid var(--border)" },
                              children: "Agents & crews"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => at("agent"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                              children: "+ agent"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => at("gate"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                              children: "+ gate"
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: V.map((h, T) => {
                        var ye, Re;
                        return /* @__PURE__ */ a(
                          "div",
                          {
                            className: "rounded-md p-2",
                            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${h.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                            children: [
                              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ a("div", { className: "flex flex-col", children: [
                                  /* @__PURE__ */ t("button", { onClick: () => lt(T, -1), disabled: T === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                  /* @__PURE__ */ t("button", { onClick: () => lt(T, 1), disabled: T === V.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                                ] }),
                                /* @__PURE__ */ t(
                                  "input",
                                  {
                                    value: h.name,
                                    onChange: (ie) => Ze(T, { name: ie.target.value, id: $e(ie.target.value) }),
                                    className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                  }
                                ),
                                /* @__PURE__ */ t(
                                  "span",
                                  {
                                    className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                    style: { color: h.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${h.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                    children: h.type
                                  }
                                ),
                                /* @__PURE__ */ t("button", { onClick: () => rt(T), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                              ] }),
                              h.type === "agent" && /* @__PURE__ */ a("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                                /* @__PURE__ */ a(
                                  "button",
                                  {
                                    onClick: () => de(T),
                                    className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                    style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                    children: [
                                      "⚙ ",
                                      (ye = h.agent) != null && ye.name ? `Agent: ${h.agent.name}` : "Configure agent"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                                /* @__PURE__ */ a(
                                  "select",
                                  {
                                    value: h.trigger || "ask",
                                    onChange: (ie) => Ze(T, { trigger: ie.target.value === "ask" ? void 0 : ie.target.value }),
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
                                /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: h.capability ? "var(--accent)" : "var(--muted)" }, title: "Actual authority is verified from the assigned capability profile at runtime", children: [
                                  "cap: ",
                                  h.capability || "auto"
                                ] }),
                                (h.trust || h.depth) && /* @__PURE__ */ t("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [h.trust, h.depth].filter(Boolean).join(" · ") }),
                                h.addenda && h.addenda.length > 0 && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                  "+",
                                  h.addenda.length,
                                  " addendum",
                                  h.addenda.length === 1 ? "" : "s"
                                ] }),
                                ((Re = h.agent) == null ? void 0 : Re.role) && /* @__PURE__ */ t("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: h.agent.role })
                              ] }),
                              h.type === "gate" && /* @__PURE__ */ a("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                                /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                                /* @__PURE__ */ a(
                                  "select",
                                  {
                                    value: h.trust || "",
                                    onChange: (ie) => Ze(T, { trust: ie.target.value || void 0 }),
                                    className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                    children: [
                                      /* @__PURE__ */ t("option", { value: "", children: "inherit" }),
                                      xt.map((ie) => /* @__PURE__ */ t("option", { value: ie, children: ie }, ie))
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
              He === "webhook" && /* @__PURE__ */ t("div", { className: "px-5 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ t(Or, {}) }),
              y && He === "danger" && S && (() => {
                const h = f.includes("/") ? f.split("/")[1] : f, T = We.trim() === h;
                return /* @__PURE__ */ t("div", { className: "px-5 pb-4 pt-4", children: g ? /* @__PURE__ */ a(
                  "div",
                  {
                    className: "rounded-lg p-4 flex flex-col gap-3",
                    style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                    children: [
                      /* @__PURE__ */ a("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "This is a bundled ",
                        /* @__PURE__ */ t("strong", { children: "example" }),
                        " pipeline (",
                        b ?? 0,
                        " sample card",
                        (b ?? 0) === 1 ? "" : "s",
                        "). Remove it any time — it's demo data, not real work."
                      ] }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => {
                            S(f), i();
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
                      /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold uppercase tracking-wide", style: { color: "var(--danger, #ef4444)" }, children: "Danger Zone" }),
                      /* @__PURE__ */ a("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "Deleting removes this pipeline and its ",
                        b ?? 0,
                        " card",
                        (b ?? 0) === 1 ? "" : "s",
                        " from DLC-YOLO's local state. It does ",
                        /* @__PURE__ */ t("strong", { children: "not" }),
                        " touch GitHub issues or labels. This cannot be undone."
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Type ",
                        /* @__PURE__ */ t("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: h }),
                        " to confirm:"
                      ] }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: We,
                          onChange: (ye) => Pe(ye.target.value),
                          placeholder: h,
                          className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                        }
                      ),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          disabled: !T,
                          onClick: () => {
                            S(f), i();
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
                /* @__PURE__ */ t("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: He === "settings" ? "Cancel" : "Close" }),
                He === "settings" && /* @__PURE__ */ t(
                  "button",
                  {
                    disabled: !L || !y && le,
                    onClick: () => d({
                      repo: Le(f),
                      workspace: w,
                      ...O.trim() ? { repo_path: O.trim() } : {},
                      source: z,
                      trust: F,
                      depth: k,
                      budget: xe === "depth" ? void 0 : xe === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : me,
                      backlog_intake: je,
                      results_in_repo: P,
                      conversation_log: Ee,
                      trusted_authors: it,
                      self_enabling: G,
                      approach: _e,
                      sync_mode: se,
                      steps: V.map((h) => ({ ...h, label: `dlc:${h.id}` }))
                    }),
                    className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                    style: { background: "var(--accent)", color: "var(--bg)" },
                    children: y ? "Save Pipeline" : "Create Pipeline"
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
  return /* @__PURE__ */ a("svg", { className: "animate-spin flex-shrink-0", width: e, height: e, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ t("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ t("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
const Za = {
  investigate: "🔎",
  requirements: "📝",
  design: "📐",
  tasks: "🧩",
  implement: "🔨",
  review: "🔍",
  pr: "🚀",
  intent: "🎯"
};
function Ja(e, r) {
  const [o, n] = N(""), l = Be(""), d = Be(""), m = Be(null);
  return d.current = e || "", ze(() => {
    if (!r || !d.current.startsWith(l.current)) {
      l.current = d.current, n(d.current);
      return;
    }
    const i = () => {
      const c = d.current, b = l.current;
      if (b.length >= c.length) {
        m.current = null;
        return;
      }
      const g = Math.max(1, Math.ceil((c.length - b.length) / 12));
      l.current = c.slice(0, b.length + g), n(l.current), m.current = requestAnimationFrame(i);
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
function Qa({ tail: e, active: r }) {
  const n = Ja(e, r), l = !String(n || "").trim(), d = r ? "linear-gradient(to bottom, transparent 0, #000 30px)" : "linear-gradient(to bottom, #000 calc(100% - 30px), transparent 100%)";
  return /* @__PURE__ */ t("div", { className: `flex-1 min-h-0 flex flex-col overflow-hidden ${r ? "justify-end" : "justify-start"}`, style: { background: "#0a0c10" }, children: /* @__PURE__ */ t(
    "div",
    {
      className: "min-h-0 px-3 py-2 break-words overflow-hidden",
      style: {
        fontSize: "12px",
        lineHeight: "1.55",
        color: "#e8eef5",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        whiteSpace: "pre-wrap",
        maxHeight: "100%",
        WebkitMaskImage: l ? void 0 : d,
        maskImage: l ? void 0 : d
      },
      children: l ? /* @__PURE__ */ t("span", { style: { color: "#5a6b7d" }, children: r ? "waiting for output…" : "— session idle —" }) : /* @__PURE__ */ a("span", { children: [
        r && /* @__PURE__ */ t("span", { style: { color: "#5a6b7d" }, children: "… " }),
        /* @__PURE__ */ t("span", { style: { color: "#e6edf3" }, children: n }),
        r && /* @__PURE__ */ t("span", { className: "dlc-cursor", style: { color: "#7ee787" }, children: "▍" })
      ] })
    }
  ) });
}
const en = {
  loop: "⚙",
  "step-agent": "🤖",
  orchestrator: "🧠",
  human: "🧑"
}, tn = {
  loop: "var(--muted)",
  "step-agent": "var(--info)",
  orchestrator: "var(--accent)",
  human: "var(--ok)"
};
function rn({ card: e, events: r, children: o, parent: n, onOpenCard: l, onClose: d }) {
  const m = o && o.length > 0 || !!n;
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (i) => {
        i.currentTarget === i.target && d();
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
                /* @__PURE__ */ t("h2", { className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "📜 Timeline" }),
                /* @__PURE__ */ t("div", { className: "text-[12px] mt-0.5 truncate", style: { color: "var(--text)" }, children: e.title })
              ] }),
              /* @__PURE__ */ t("button", { onClick: d, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ a("div", { className: "px-4 py-3 overflow-y-auto", children: [
              m && /* @__PURE__ */ a("div", { className: "mb-3 pb-3", style: { borderBottom: "1px dashed var(--border)" }, children: [
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "🌿 fan-out" }),
                n && /* @__PURE__ */ a(
                  "button",
                  {
                    className: "flex items-center gap-1.5 text-[12px] hover:underline mb-1",
                    onClick: () => l == null ? void 0 : l(n.id),
                    style: { color: "var(--accent)" },
                    title: "Open the integration parent",
                    children: [
                      "↑ parent · ",
                      /* @__PURE__ */ t("span", { className: "truncate max-w-[420px]", style: { color: "var(--text)" }, children: n.title })
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
                      /* @__PURE__ */ t("span", { "aria-hidden": "true", style: { color: "var(--accent)" }, children: "↳" }),
                      /* @__PURE__ */ t("span", { className: "truncate flex-1", children: i.title }),
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
              r.length === 0 ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: m ? "No events recorded on this card directly." : "No recorded events yet." }) : /* @__PURE__ */ t("ol", { className: "flex flex-col gap-2", children: r.map((i) => /* @__PURE__ */ a("li", { className: "flex gap-2 text-[12px]", children: [
                /* @__PURE__ */ t("span", { title: i.actor, "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", children: en[i.actor] || "•" }),
                /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-baseline gap-1.5 flex-wrap", children: [
                    /* @__PURE__ */ a("span", { className: "font-medium", style: { color: i.needs_human ? "var(--warn)" : "var(--text)" }, children: [
                      i.needs_human && "🔴 ",
                      i.headline
                    ] }),
                    i.cls === "decision" && /* @__PURE__ */ t("span", { className: "text-[9px] px-1 rounded-full", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: "decision" }),
                    /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: i.at ? i.at.replace("T", " ").replace("Z", "") : "" })
                  ] }),
                  i.detail && /* @__PURE__ */ t("div", { className: "text-[10px] mt-0.5 leading-snug", style: { color: "var(--muted)" }, children: i.detail }),
                  /* @__PURE__ */ a("div", { className: "text-[9px] mt-0.5", style: { color: tn[i.actor] || "var(--muted)" }, children: [
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
function ln() {
  const e = Rr(), r = zr();
  ze(() => {
    console.info(
      "[dlc-yolo] UI bundle build: v35 (worker-model true-order wing). prefers-reduced-motion:",
      typeof window < "u" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "REDUCE — drawer re-asserted, should play" : "no-preference"
    );
  }, []);
  const [o, n] = N([]), [l, d] = N([]), [m, i] = N({}), [c, b] = N(Ft), [g, S] = N(!0), [y, f] = N("pipeline"), [x, w] = N(/* @__PURE__ */ new Set()), [B, O] = N(!1), [j, z] = N(null), [$, F] = N([]), [Y, k] = N([]), [te, A] = N([]), [xe, pe] = N(!1), [me, we] = N(!1), [je, J] = N(!1), [P, re] = N(!1), [Ee, Oe] = N(!1), [Ce, C] = N(!1), [G, ae] = N([]), _e = Be(null), Fe = Be(!1), se = Be(!1), Q = Be(/* @__PURE__ */ new Set()), V = Be(/* @__PURE__ */ new Set()), [be, R] = N({}), de = ce(
    (s) => e.get("/api/file-read?path=" + encodeURIComponent(s)),
    [e]
  ), We = ce((s) => e.get(s), [e]), Pe = ce(async (s = !1) => {
    try {
      const p = !se.current || s ? await er(de, We) : await br(de, ut, We);
      ut = p.source === "endpoint" ? ht : p.path, se.current = p.source !== "unresolved";
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
      ), n(u.cards || []), d(u.pipelines || []), i({ github_webhook_history: u.github_webhook_history || [], scheduler_state: u.scheduler_state || null }), b({ ...Ft, ...u.config || {} });
    } catch (p) {
      console.error("Failed to fetch cards:", p);
    } finally {
      S(!1);
    }
  }, [de, We]), He = Te(() => {
    const s = /* @__PURE__ */ new Map();
    return l.forEach((p) => {
      s.has(p.repo) || s.set(p.repo, 0);
    }), o.forEach((p) => {
      var _;
      const u = ((_ = p.source) == null ? void 0 : _.repo) || "unlinked";
      s.set(u, (s.get(u) || 0) + 1);
    }), [...s.entries()].map(([p, u]) => ({ name: p, count: u })).sort((p, u) => u.count - p.count);
  }, [o, l]), he = Te(
    () => x.size === 0 ? o : o.filter((s) => {
      var p;
      return x.has(((p = s.source) == null ? void 0 : p.repo) || "unlinked");
    }),
    [o, x]
  );
  ze(() => {
    V.current = new Set(o.map((s) => s.id)), Q.current = new Set(o.flatMap(
      (s) => Object.values(s.step_sessions || {}).filter((p) => !!p.slot_key && !p.chat_disabled_at && !p.superseded).map((p) => p.slot_key)
    ));
  }, [o]), ze(() => {
    let s = !1, p = null, u, _ = 0;
    const E = () => {
      if (s) return;
      const q = window.location.protocol === "https:" ? "wss:" : "ws:";
      p = new WebSocket(`${q}//${window.location.host}/api/ws`), p.onopen = () => {
        _ = 0;
      }, p.onmessage = (M) => {
        if (typeof M.data == "string")
          try {
            const D = JSON.parse(M.data), U = D == null ? void 0 : D.data;
            if (D.type === "slots" && Array.isArray(U)) {
              const ee = new Set(Q.current), K = [];
              for (const H of U) {
                const I = (H == null ? void 0 : H.key) || (H == null ? void 0 : H.slot) || (H == null ? void 0 : H.name), qe = String((H == null ? void 0 : H.title) || (H == null ? void 0 : H.name) || "");
                typeof I == "string" && I.startsWith("cron-") && [...V.current].some((Me) => qe.includes(Me)) && ee.add(I), typeof I == "string" && (H != null && H.running) && ee.has(I) && K.push(I);
              }
              Q.current = ee, K.length && R((H) => {
                let I = H;
                for (const qe of K) {
                  const Me = ur(H[qe]);
                  Me !== H[qe] && (I = { ...I, [qe]: Me });
                }
                return I;
              });
              return;
            }
            if (D.type === "subagent_spawn" || D.type === "subagent_chunk" || D.type === "subagent_done") {
              const ee = typeof (U == null ? void 0 : U.id) == "string" ? U.id : null;
              if (!ee || !V.current.has(ee)) return;
              const K = `card:${ee}`;
              R((H) => {
                const I = H[K];
                if (D.type === "subagent_spawn") {
                  const Me = typeof (U == null ? void 0 : U.agent) == "string" ? U.agent : U != null && U.task ? String(U.task).slice(0, 40) : "agent", Z = (I != null && I.buffer ? `
` : "") + `── ${Me} ──
`, ue = sr(
                    I != null && I.active ? I : { buffer: (I == null ? void 0 : I.buffer) || "", tail: "", active: !0, phase: "crew", seq: (I == null ? void 0 : I.seq) || 0 },
                    Z,
                    ((I == null ? void 0 : I.seq) || 0) + 1
                  );
                  return { ...H, [K]: ue };
                }
                if (D.type === "subagent_chunk" && typeof U.text == "string") {
                  const Me = sr(I, U.text, Number(U.seq));
                  return Me === I ? H : { ...H, [K]: Me };
                }
                const qe = mr(I);
                return qe === I ? H : { ...H, [K]: qe };
              });
              return;
            }
            const ne = U == null ? void 0 : U.slot;
            if (!ne || !Q.current.has(ne))
              return;
            D.type === "chat_status" && String(U.status || "").toLowerCase().startsWith("thinking") || D.type === "chat_thinking" ? R((ee) => {
              const K = ur(ee[ne], D.type === "chat_status");
              return K === ee[ne] ? ee : { ...ee, [ne]: K };
            }) : D.type === "chat_chunk" && typeof U.content == "string" ? R((ee) => {
              const K = sr(ee[ne], U.content, Number(U.seq));
              return K === ee[ne] ? ee : { ...ee, [ne]: K };
            }) : D.type === "chat_done" && R((ee) => {
              const K = mr(ee[ne]);
              return K === ee[ne] ? ee : { ...ee, [ne]: K };
            });
          } catch {
          }
      }, p.onclose = () => {
        if (s) return;
        const M = Math.min(1e3 * 2 ** _++, 15e3);
        u = setTimeout(E, M);
      }, p.onerror = () => p == null ? void 0 : p.close();
    };
    return E(), () => {
      s = !0, u && clearTimeout(u), p == null || p.close();
    };
  }, []), ze(() => {
    if (!je) return;
    const s = (p) => {
      p.key === "Escape" && J(!1);
    };
    return window.addEventListener("keydown", s), () => window.removeEventListener("keydown", s);
  }, [je]);
  const vt = 6e5, ge = Te(() => {
    var u, _, E, q;
    const s = [], p = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked", "retired"]);
    for (const M of he) {
      if (p.has(String(M.lifecycle || "").toLowerCase())) continue;
      const D = M.step_status || {}, U = M.step_sessions || {}, ne = l.find((K) => K.id === M.pipeline_id) || l.find((K) => {
        var H;
        return K.repo === ((H = M.source) == null ? void 0 : H.repo);
      }), ee = /* @__PURE__ */ new Set([...Object.keys(D), ...Object.keys(U)]);
      for (const K of ee) {
        const H = D[K] || "idle", I = U[K], qe = H === "pending" || H === "error", Me = !!(I && (I.chat_disabled_at || I.superseded || I.retired_at || I.cron_pause_observed_at || I.retention === "released")), Z = !!(I != null && I.slot_key) && !Me;
        if (!qe && !Z || !qe && Me) continue;
        const ue = (u = M.pending_at) == null ? void 0 : u[K], et = qe && !!ue && Date.now() - new Date(ue).getTime() > vt, oe = (_ = ne == null ? void 0 : ne.steps) == null ? void 0 : _.find((Ue) => Ue.id === K), Ge = (I == null ? void 0 : I.agent) || ((E = oe == null ? void 0 : oe.agent) == null ? void 0 : E.crew) || ((q = oe == null ? void 0 : oe.agent) == null ? void 0 : q.name) || "orchestrator", St = I == null ? void 0 : I.agent_id, Gt = I == null ? void 0 : I.slot_key, Kt = I == null ? void 0 : I.session_key, Vt = St ? G.some((Ue) => Ue.id === St) : qe && G.some((Ue) => (Ue.task || "").includes(M.id) || (Ue.task || "").includes(M.title)), Xt = !!(I != null && I.last_response_at) && (!I.last_response_handled_at || I.last_response_handled_at < I.last_response_at);
        s.push({ cardId: M.id, card: M.title || M.id, step: K, agent: Ge, stale: et, status: H, live: Vt, responsePending: Xt, agentId: St, slotKey: Gt, sessionKey: Kt, sessionName: I == null ? void 0 : I.name });
      }
    }
    return s;
  }, [he, l, G]), $e = Te(() => {
    var E;
    let s;
    if (x.size === 1) {
      const q = [...x][0];
      s = (E = l.find((M) => M.repo === q)) == null ? void 0 : E.steps;
    } else l.length === 1 && (s = l[0].steps);
    const p = (s && s.length ? s : rr).map((q) => ({ ...q })), u = new Set(p.map((q) => q.id)), _ = [];
    return u.has("intake") || _.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), _.push(...p), u.has("done") || _.push({ id: "done", name: "Done", type: "agent" }), _;
  }, [x, l]), Ze = Te(() => $e.map((s) => s.id), [$e]), rt = ce((s) => {
    var p;
    return ((p = $e.find((u) => u.id === s)) == null ? void 0 : p.type) === "gate" || s.startsWith("gate-");
  }, [$e]), lt = ce((s) => {
    var p, u;
    return ((u = (p = $e.find((_) => _.id === s)) == null ? void 0 : p.agent) == null ? void 0 : u.name) || Ia[s] || "unknown";
  }, [$e]), at = ce((s) => {
    var E, q;
    const p = s.step_sessions || {}, u = Object.entries(p).find(
      ([, M]) => M.retained_for_gate === s.stage && M.retention !== "released"
    );
    let _ = ((E = s.gate_review) == null ? void 0 : E.producer_step) || (u == null ? void 0 : u[0]);
    if (!_) {
      const M = l.find((K) => K.id === s.pipeline_id) || l.find((K) => {
        var H;
        return K.repo === ((H = s.source) == null ? void 0 : H.repo);
      }), D = (q = M == null ? void 0 : M.steps) != null && q.length ? M.steps : rr, U = [
        { id: "intake", name: "Intake", type: "agent" },
        ...D.filter((K) => K.id !== "intake" && K.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], ne = U.findIndex((K) => K.id === s.stage), ee = ne >= 0 ? U[ne] : void 0;
      if (_ = ee == null ? void 0 : ee.reviews_step, !_ && ne >= 0)
        for (let K = ne - 1; K >= 0; K--) {
          const H = U[K];
          if (!(H.id === "intake" || H.id === "done") && H.type !== "gate" && !H.id.startsWith("gate-")) {
            _ = H.id;
            break;
          }
        }
    }
    return _;
  }, [l]), yt = ce((s) => {
    const p = at(s);
    if (!p) return;
    const u = (s.step_sessions || {})[p];
    if (!(!(u != null && u.slot_key) || u.chat_disabled_at || u.superseded))
      return {
        step: p,
        slotKey: u.slot_key,
        retained: u.retention === "held-for-gate"
      };
  }, [at]);
  ze(() => {
    const s = async () => {
      try {
        const _ = ut.slice(0, ut.lastIndexOf("/")), E = (_ ? _ + "/" : "") + "live_spawns.json", q = await e.get("/api/file-read?path=" + encodeURIComponent(E));
        Fe.current = !1;
        const M = q != null && q.at ? Date.now() - new Date(q.at).getTime() < 18e4 : !0;
        ae(M && Array.isArray(q == null ? void 0 : q.runs) ? q.runs : []);
      } catch {
        Fe.current = !0, ae([]);
      }
    };
    let p = 0;
    Pe(!0).then(s);
    const u = setInterval(() => {
      p += 1;
      const _ = p % 12 === 0;
      Pe(_).then(() => {
        Fe.current || s();
      });
    }, 1e4);
    return () => clearInterval(u);
  }, [Pe, e]);
  const Le = ce(async () => {
    we(!0);
    let s = [];
    try {
      const u = await de("~/.kiro/crew/config.json");
      s = Ta(u == null ? void 0 : u.agents), k(s);
    } catch (u) {
      console.warn("crew roster (config.json) unreadable:", u), k([]);
    }
    const p = await Promise.all(ja(s).map(async (u) => {
      const _ = Ea(u, s);
      if (!_) return lr(null, u);
      try {
        const E = await de(_);
        return lr(E, u, _);
      } catch {
        return lr(null, u, _);
      }
    }));
    A(p), we(!1);
  }, [de]), bt = ce(() => {
    pe(!0), Le();
  }, [Le]), it = ce((s) => {
    Le().then(() => z(s));
  }, [Le]), Je = ce(async (s) => {
    await e.post("/apps/dlc-yolo/api/agents/crew", {
      mode: s.mode,
      name: s.name,
      kiro_agent: s.kiroAgent,
      workspace: s.workspace || null,
      memory_store: s.memoryStore || null
    }), await Le();
  }, [e, Le]), v = ce(async (s) => {
    try {
      const p = await er(de, We);
      ut = p.source === "endpoint" ? ht : p.path, p.data.cards = p.data.cards || [], s(p.data);
      let u = p;
      try {
        u = await er(de, We), ut = u.source === "endpoint" ? ht : u.path, u.data.cards = u.data.cards || [], s(u.data);
      } catch {
        u = p;
      }
      try {
        await e.post("/apps/dlc-yolo/api/state", u.data);
      } catch (_) {
        console.warn("[dlc-yolo] uncapped state POST failed; falling back to file-write (capped):", _), await e.post("/api/file-write", {
          path: u.source === "endpoint" ? ht : u.path,
          content: JSON.stringify(u.data, null, 2)
        });
      }
      Pe();
    } catch (p) {
      console.error("Failed to mutate state:", p);
    }
  }, [e, Pe, de, We]), L = ce((s) => {
    b((p) => ({ ...p, ...s })), v((p) => {
      p.config = { ...Ft, ...p.config || {}, ...s };
    });
  }, [v]), le = ce((s, p, u, _) => {
    const E = (/* @__PURE__ */ new Date()).toISOString(), q = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    v((M) => {
      var K;
      const D = M.cards.find((H) => H.id === s);
      if (!D || D.stage !== p) return;
      if (_ === void 0 && u.type === "interject") {
        const H = u.text.trim();
        if (!H) return;
        D.interjection = D.interjection || [], D.interjection.some((I) => I.id === q) || D.interjection.push({
          id: q,
          at: E,
          step: p,
          kind: u.kind,
          text: H,
          by: "user",
          status: "pending"
        }), D.updated_at = E;
        return;
      }
      if ((((K = D.gate_review) == null ? void 0 : K.result_revision) ?? null) !== _) return;
      const ne = u.type === "reject" ? u.reason.trim() : void 0, ee = u.type === "interject" ? u.text.trim() : void 0;
      u.type === "reject" && !ne || u.type === "interject" && !ee || (D.gate_commands = D.gate_commands || [], D.gate_commands.some((H) => H.id === q) || D.gate_commands.push({
        id: q,
        gate: p,
        action: u.type,
        expected_revision: _ ?? null,
        actor: "user",
        at: E,
        status: "pending",
        ...ne ? { reason: ne } : {},
        ...u.type === "interject" ? { kind: u.kind, text: ee } : {}
      }), D.updated_at = E);
    });
  }, [v]), ve = ce((s, p, u) => {
    const _ = (/* @__PURE__ */ new Date()).toISOString(), E = Na();
    v((q) => {
      const M = q.cards.find((U) => U.id === s);
      if (!M) return;
      let D;
      try {
        D = Sa({ id: E, kind: p, text: u, card: M, now: _ });
      } catch {
        return;
      }
      M.interjection = Ca(M.interjection, D), M.updated_at = _;
    });
  }, [v]), Ne = ce((s) => {
    if (!window.confirm("Cancel this card? Writes are revoked cooperatively — a live turn may not stop immediately, and its worktree is retained until terminal observation.")) return;
    const p = (/* @__PURE__ */ new Date()).toISOString();
    v((u) => {
      const _ = u.cards.find((E) => E.id === s);
      _ && (_.lifecycle = "cancelled", _.writes_allowed = !1, _.cancel_requested_at = p, _.updated_at = p);
    });
  }, [v]), Ie = ce((s, p, u) => {
    v((_) => {
      const E = _.cards.find((M) => M.id === s);
      if (!E) return;
      const q = (E.decisions || []).find((M) => M.id === p);
      if (q) {
        const M = (/* @__PURE__ */ new Date()).toISOString();
        q.chosen = u && u.trim() ? u.trim() : "acknowledged", q.status = u ? "resolved" : "acknowledged", q.resolved_at = M, q.resolved_by = "user";
      }
      E.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [v]), Ae = ce(async (s) => {
    var _, E, q;
    const u = ((M) => {
      var ne;
      const D = M == null ? void 0 : M.orchestrator_session;
      if (D != null && D.slot_key) return D.slot_key;
      if (D != null && D.session_key) return D.session_key.replace(/^cron:/, "cron-");
      const U = (ne = l.find((ee) => ee.id === (M == null ? void 0 : M.pipeline_id))) == null ? void 0 : ne.orchestrator_session;
      return (U == null ? void 0 : U.slot_key) || (U != null && U.session_key ? U.session_key.replace(/^cron:/, "cron-") : void 0);
    })(s);
    if (u) {
      r(`/chat?sid=${encodeURIComponent(u)}`);
      return;
    }
    try {
      const M = await e.post("/apps/dlc-yolo/api/orchestrator/trigger", { card_id: s.id });
      if (M != null && M.slot_key) {
        r(`/chat?sid=${encodeURIComponent(M.slot_key)}`);
        return;
      }
    } catch {
    }
    for (let M = 0; M < 8; M++) {
      await new Promise((D) => setTimeout(D, 2e3));
      try {
        const D = await br(de, ut), U = (D.data.cards || []).find((K) => K.id === s.id), ne = (_ = (D.data.pipelines || []).find((K) => K.id === (U == null ? void 0 : U.pipeline_id))) == null ? void 0 : _.orchestrator_session, ee = ((E = U == null ? void 0 : U.orchestrator_session) == null ? void 0 : E.slot_key) || (((q = U == null ? void 0 : U.orchestrator_session) == null ? void 0 : q.session_key) || (ne == null ? void 0 : ne.session_key) || "").replace(/^cron:/, "cron-") || (ne == null ? void 0 : ne.slot_key);
        if (ee) {
          Pe(), r(`/chat?sid=${encodeURIComponent(ee)}`);
          return;
        }
      } catch {
      }
    }
    Pe();
  }, [e, r, de, Pe]), nt = ce((s) => {
    v((p) => {
      var E;
      const u = p.cards.find((q) => q.id === s);
      if (!u) return;
      const _ = u.trust || ((E = p.config) == null ? void 0 : E.trust) || Ft.trust;
      u.trust = xt[(xt.indexOf(_) + 1) % xt.length], u.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [v]), Ve = ce((s) => {
    v((p) => {
      var E;
      const u = p.cards.find((q) => q.id === s);
      if (!u) return;
      const _ = u.depth || ((E = p.config) == null ? void 0 : E.depth) || Ft.depth;
      u.depth = Tt[(Tt.indexOf(_) + 1) % Tt.length], u.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [v]), Qe = ce((s, p) => {
    v((u) => {
      const _ = u.cards.find((E) => E.id === s);
      _ && (p ? _.budget = { ...p } : delete _.budget, _.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [v]), ct = ce((s) => {
    w((p) => {
      const u = new Set(p);
      return u.has(s) ? u.delete(s) : u.add(s), u;
    });
  }, []), jt = ce(() => w(/* @__PURE__ */ new Set()), []), Et = ce(async () => {
    const s = Le(), p = [];
    try {
      const u = await e.get("/api/file-read?path=~/.kiro/crew/config.json"), _ = (u == null ? void 0 : u.workspaces) || {};
      Object.entries(_).forEach(([E, q]) => {
        const M = typeof (q == null ? void 0 : q.repo) == "string" && /^[^/\s]+\/[^/\s]+$/.test(q.repo) ? q.repo : "";
        p.push({
          repo: M,
          workspace: E,
          label: E,
          source: "workspace",
          detail: (q == null ? void 0 : q.dir) || E,
          path: typeof (q == null ? void 0 : q.dir) == "string" ? q.dir : void 0
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
    F(p), await s, O(!0);
  }, [e, Le]), Ot = ce(async (s) => {
    const p = (/* @__PURE__ */ new Date()).toISOString(), u = "pl-" + Math.random().toString(36).slice(2, 10);
    await v((_) => {
      _.pipelines = _.pipelines || [];
      const E = _.pipelines.find((q) => q.repo === s.repo);
      E ? (E.source = s.source, E.workspace = s.workspace, s.repo_path ? E.repo_path = s.repo_path : delete E.repo_path, E.trust = s.trust, E.depth = s.depth, s.budget ? E.budget = s.budget : delete E.budget, E.backlog_intake = s.backlog_intake, E.results_in_repo = s.results_in_repo, E.conversation_log = s.conversation_log, s.trusted_authors.length ? E.trusted_authors = s.trusted_authors : delete E.trusted_authors, E.self_enabling = s.self_enabling, E.approach = s.approach, s.sync_mode ? E.sync_mode = s.sync_mode : delete E.sync_mode, E.steps = s.steps) : _.pipelines.push({
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
    }), O(!1), z(null), w(/* @__PURE__ */ new Set([s.repo]));
  }, [v]), Ut = ce(async (s) => {
    await v((p) => {
      p.pipelines = (p.pipelines || []).filter((u) => u.repo !== s), p.cards = (p.cards || []).filter((u) => {
        var _;
        return (((_ = u.source) == null ? void 0 : _.repo) || "unlinked") !== s;
      });
    }), w((p) => {
      const u = new Set(p);
      return u.delete(s), u;
    });
  }, [v]), kt = Te(() => {
    const s = /* @__PURE__ */ new Set(["retired", "cancelled", "canceled", "merged", "superseded"]);
    return Ze.reduce((p, u) => (p[u] = he.filter((_) => _.stage === u && !s.has(String(_.lifecycle || ""))), p), {});
  }, [he, Ze]), wt = Te(
    () => he.filter((s) => ["retired", "merged"].includes(String(s.lifecycle || ""))),
    [he]
  ), Nt = Te(
    () => he.filter((s) => ["cancelled", "canceled", "superseded"].includes(String(s.lifecycle || ""))),
    [he]
  ), Wt = ce((s) => {
    var p;
    (p = document.getElementById(`stage-col-${s}`)) == null || p.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), Lt = Te(() => {
    const s = {};
    return he.forEach((p) => {
      var _;
      const u = ((_ = p.source) == null ? void 0 : _.repo) || "unlinked";
      (s[u] || (s[u] = [])).push(p);
    }), s;
  }, [he]), It = Te(() => {
    const s = {};
    return he.forEach((p) => {
      const u = lt(p.stage);
      (s[u] || (s[u] = [])).push(p);
    }), s;
  }, [he, lt]), Pt = Te(() => {
    const s = Object.fromEntries(xr.map((p) => [p, []]));
    return he.forEach((p) => {
      var q, M;
      const u = l.find((D) => D.id === p.pipeline_id) || l.find((D) => {
        var U;
        return D.repo === ((U = p.source) == null ? void 0 : U.repo);
      }), _ = ((M = (q = u == null ? void 0 : u.steps) == null ? void 0 : q.find((D) => D.id === p.stage)) == null ? void 0 : M.type) === "gate" || rt(p.stage), E = ge.some((D) => D.cardId === p.id && D.step === p.stage && D.live);
      s[wr(p, { isGate: _, liveObserved: E }).kind].push(p);
    }), Object.fromEntries(xr.filter((p) => s[p].length > 0).map((p) => [Lr[p].label, s[p]]));
  }, [he, l, rt, ge]), h = /* @__PURE__ */ new Set(["retired", "merged", "cancelled", "canceled", "superseded"]), T = he.filter((s) => !h.has(String(s.lifecycle || ""))).length, ye = he.filter((s) => rt(s.stage) && !h.has(String(s.lifecycle || ""))).length, Re = he.filter((s) => h.has(String(s.lifecycle || ""))).length, ie = he.reduce((s, p) => {
    var u;
    return s + (((u = p.parked) == null ? void 0 : u.length) || 0);
  }, 0), qt = {
    pipeline: he.length,
    workspace: Object.keys(Lt).length,
    crew: Object.keys(It).length,
    status: he.length,
    backlog: ie
  }, Mt = ge.some((s) => {
    var p, u;
    return !!s.slotKey && ((p = be[s.slotKey]) == null ? void 0 : p.active) && ((u = be[s.slotKey]) == null ? void 0 : u.phase) === "generating";
  }), Ht = ge.some((s) => {
    var p, u;
    return !!s.slotKey && ((p = be[s.slotKey]) == null ? void 0 : p.active) && ((u = be[s.slotKey]) == null ? void 0 : u.phase) === "thinking";
  }), _t = (s) => {
    var H, I, qe, Me;
    const p = l.find((Z) => Z.id === s.pipeline_id) || l.find((Z) => {
      var ue;
      return Z.repo === ((ue = s.source) == null ? void 0 : ue.repo);
    }), u = ((I = (H = p == null ? void 0 : p.steps) == null ? void 0 : H.find((Z) => Z.id === s.stage)) == null ? void 0 : I.type) === "gate" || rt(s.stage), _ = ["cancelled", "canceled", "retired", "merged", "superseded"].includes(String(s.lifecycle || "")), E = u && !_, q = E ? ((qe = s.gate_review) == null ? void 0 : qe.result_revision) ?? null : void 0, M = E ? at(s) : void 0, D = E ? yt(s) : void 0, U = ge.some((Z) => Z.cardId === s.id && Z.step === s.stage && Z.live), ne = wr(s, { isGate: E, liveObserved: U }), ee = (Me = p == null ? void 0 : p.steps) == null ? void 0 : Me.find((Z) => Z.id === s.stage), K = s.capability || (ee == null ? void 0 : ee.capability) || "auto-derived";
    return {
      card: s,
      config: c,
      isGate: E,
      cardStatus: ne,
      effectiveCapability: K,
      producerStep: M,
      producerSession: D,
      onOpenProducer: D ? () => r(`/chat?sid=${encodeURIComponent(D.slotKey)}`) : void 0,
      onApprove: E ? () => le(s.id, s.stage, { type: "approve" }, q) : void 0,
      onReject: E ? (Z) => le(s.id, s.stage, { type: "reject", reason: Z }, q) : void 0,
      onCycleTrust: () => nt(s.id),
      onCycleDepth: () => Ve(s.id),
      onSetBudget: (Z) => Qe(s.id, Z),
      onInterject: (Z, ue) => le(
        s.id,
        s.stage,
        { type: "interject", kind: Z, text: ue },
        q
      ),
      onResolveDecision: (Z, ue) => Ie(s.id, Z, ue),
      onOpenOrchestrator: () => Ae(s),
      liveView: (() => {
        var Gt, Kt, Vt, Xt;
        const Z = (Kt = (Gt = s.step_sessions) == null ? void 0 : Gt[s.stage]) == null ? void 0 : Kt.slot_key, ue = Z ? be[Z] : void 0, et = ge.some((Ue) => Ue.cardId === s.id && Ue.step === s.stage && Ue.live), oe = be[`card:${s.id}`], Ge = Gr((Vt = s.step_progress) == null ? void 0 : Vt[s.stage]), St = !!Ge && (et || ((Xt = s.step_status) == null ? void 0 : Xt[s.stage]) === "pending");
        if (Ge && (St || oe != null && oe.buffer || oe != null && oe.tail)) {
          const Ue = !!(oe != null && oe.active);
          return {
            stage: s.stage,
            phase: Ue ? "crew" : Ge.phase,
            tail: Ue && (oe == null ? void 0 : oe.tail) || Ge.tail,
            buffer: Ge.buffer || Ge.tail || "",
            active: !!(St || Ue),
            seq: Ge.seq,
            slotKey: Z || "",
            source: "progress-trail",
            onOpen: () => Z && r(`/chat?sid=${encodeURIComponent(Z)}`)
          };
        }
        if (oe && (oe.buffer || oe.tail))
          return {
            stage: s.stage,
            phase: oe.active ? "crew" : "idle",
            tail: oe.tail || "",
            buffer: oe.buffer || "",
            active: !!oe.active,
            seq: oe.seq || 0,
            slotKey: Z || "",
            onOpen: () => Z && r(`/chat?sid=${encodeURIComponent(Z)}`)
          };
        if (ue != null && ue.active)
          return {
            stage: s.stage,
            phase: ue.phase || "running",
            tail: ue.tail || "",
            buffer: ue.buffer || "",
            active: !!ue.active && et,
            seq: ue.seq || 0,
            slotKey: Z,
            onOpen: () => r(`/chat?sid=${encodeURIComponent(Z)}`)
          };
      })(),
      allCards: he,
      onRequest: (Z, ue) => ve(s.id, Z, ue),
      onOpenStepSession: (() => {
        const Z = s.step_sessions;
        if (!Z || typeof Z != "object") return;
        const ue = Object.entries(Z).map(([et, oe]) => {
          const Ge = (oe == null ? void 0 : oe.slot_key) || (oe != null && oe.session_key ? oe.session_key.replace(/^cron:/, "cron-") : void 0);
          return Ge ? { step: et, open: () => r(`/chat?sid=${encodeURIComponent(Ge)}`) } : null;
        }).filter((et) => et !== null);
        return ue.length ? ue : void 0;
      })(),
      onCancelCard: () => Ne(s.id),
      onOpenCard: (Z) => {
        const ue = document.getElementById(`card-${Z}`);
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
  return /* @__PURE__ */ a(Xe, { children: [
    /* @__PURE__ */ t("style", { children: `
.dlc-yolo-root, .dlc-yolo-root * { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
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
    /* @__PURE__ */ a("div", { className: "dlc-yolo-root", children: [
      /* @__PURE__ */ t(Fr, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
      xe && /* @__PURE__ */ t(
        dr,
        {
          profiles: te,
          crews: Y,
          loading: me,
          context: x.size === 1 ? [...x][0] : void 0,
          onRefresh: () => {
            Le();
          },
          onSaveCrew: Je,
          onClose: () => pe(!1)
        }
      ),
      P && /* @__PURE__ */ t(
        "div",
        {
          className: "fixed inset-0 z-50 flex items-center justify-center p-4",
          style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
          onMouseDown: (s) => {
            s.currentTarget === s.target && re(!1);
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
                  /* @__PURE__ */ t("h2", { className: "text-[15px] font-semibold flex-1", style: { color: "var(--text-strong, var(--text))" }, children: "🌲 Pipeline event tree" }),
                  /* @__PURE__ */ t("button", { onClick: () => re(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
                ] }),
                /* @__PURE__ */ t("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ t(
                  Ga,
                  {
                    pipeline: l.find((s) => he.some((p) => p.pipeline_id === s.id)) || l[0],
                    cards: he,
                    extras: m,
                    onOpenCard: (s) => {
                      re(!1), f("pipeline"), setTimeout(() => {
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
            s.currentTarget === s.target && Oe(!1);
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
                    ie ? ` · ${ie}` : ""
                  ] }),
                  /* @__PURE__ */ t("button", { onClick: () => Oe(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
                ] }),
                /* @__PURE__ */ t("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ t(Ka, { cards: he }) })
              ]
            }
          )
        }
      ),
      Ce && /* @__PURE__ */ t(
        za,
        {
          cards: he,
          schedulerState: m.scheduler_state,
          statePath: ut,
          readAppFile: de,
          onClose: () => C(!1)
        }
      ),
      je && /* @__PURE__ */ t(
        "div",
        {
          className: "fixed inset-0 z-50 flex items-center justify-center p-4",
          style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
          onMouseDown: (s) => {
            s.currentTarget === s.target && J(!1);
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
                      /* @__PURE__ */ t("h2", { id: "agent-sessions-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agent sessions" }),
                      /* @__PURE__ */ t("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: ge.length })
                    ] }),
                    /* @__PURE__ */ t("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "Live activity from enabled chats linked to pipeline cards." })
                  ] }),
                  /* @__PURE__ */ t(
                    "button",
                    {
                      onClick: () => J(!1),
                      "aria-label": "Close agent sessions",
                      className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                      style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                      children: "×"
                    }
                  )
                ] }),
                /* @__PURE__ */ t("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: ge.length === 0 ? /* @__PURE__ */ t("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : ge.map((s) => {
                  const p = s.slotKey ? be[s.slotKey] : void 0;
                  return /* @__PURE__ */ a(
                    "div",
                    {
                      className: "rounded-lg px-3 py-2.5",
                      style: { background: s.responsePending ? "color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))" : "var(--bg, transparent)", border: "1px solid var(--border)" },
                      children: [
                        /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-[11px] min-w-0", children: [
                          /* @__PURE__ */ t(
                            "span",
                            {
                              className: s.status === "pending" || s.responsePending ? "inline-block animate-pulse flex-shrink-0" : "inline-block flex-shrink-0",
                              style: { width: 7, height: 7, borderRadius: 999, background: s.stale ? "var(--warn)" : s.responsePending || s.status === "pending" ? "var(--accent)" : "var(--muted)" }
                            }
                          ),
                          /* @__PURE__ */ t("span", { className: "font-semibold flex-shrink-0", style: { color: "var(--accent)" }, title: s.sessionName || void 0, children: s.agent }),
                          /* @__PURE__ */ a("span", { className: "truncate", style: { color: "var(--muted)" }, children: [
                            "· ",
                            s.step
                          ] }),
                          /* @__PURE__ */ t("span", { className: "ml-auto truncate max-w-[220px]", style: { color: "var(--text, var(--muted))" }, title: s.card, children: s.card }),
                          /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: s.responsePending ? "var(--warn)" : s.status === "pending" ? "var(--ok)" : "var(--muted)" }, children: s.responsePending ? "response" : s.status }),
                          s.stale && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, title: "stale — will be reclaimed", children: "↻" })
                        ] }),
                        (p == null ? void 0 : p.active) && p.phase === "thinking" && /* @__PURE__ */ a("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                          /* @__PURE__ */ t(Rt, { size: 13 }),
                          /* @__PURE__ */ t("span", { children: "Thinking" })
                        ] }),
                        (p == null ? void 0 : p.active) && p.phase === "generating" && p.tail && /* @__PURE__ */ a("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                          /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                          /* @__PURE__ */ a("span", { className: "font-mono text-[11px] truncate", children: [
                            "Generating · …",
                            p.tail
                          ] })
                        ] }),
                        s.slotKey && /* @__PURE__ */ a(
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
          agentProfiles: te,
          crews: Y,
          onCreate: Ot,
          onSaveCrew: Je,
          onClose: () => O(!1)
        }
      ),
      j && /* @__PURE__ */ t(
        $r,
        {
          candidates: $,
          existingRepos: new Set(l.map((s) => s.repo)),
          defaults: c,
          agentProfiles: te,
          crews: Y,
          editPipeline: l.find((s) => s.repo === j) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
          { id: "pl-" + j, repo: j, source: "manual", trust: c.trust, depth: c.depth, backlog_intake: !0, sot: "github", steps: rr.map((s) => ({ ...s })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
          cardCount: o.filter((s) => {
            var p;
            return (((p = s.source) == null ? void 0 : p.repo) || "unlinked") === j;
          }).length,
          isExample: Br.has(j),
          onCreate: Ot,
          onSaveCrew: Je,
          onDelete: Ut,
          onClose: () => z(null)
        }
      ),
      /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
        /* @__PURE__ */ t(qa, { steps: $e, cardsByStage: kt, onNodeClick: Wt }),
        /* @__PURE__ */ a("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3", children: [
          /* @__PURE__ */ t(Yt, { label: "Active", value: String(T), accent: !0 }),
          /* @__PURE__ */ t(Yt, { label: "Gated", value: String(ye) }),
          /* @__PURE__ */ t(Yt, { label: "Done", value: String(Re) }),
          /* @__PURE__ */ t(Yt, { label: "Parked", value: String(ie) })
        ] }),
        /* @__PURE__ */ t(
          ca,
          {
            repos: He.map((s) => s.name),
            selectedRepos: [...x],
            onNewPipeline: () => {
              Et();
            },
            onConfigure: it,
            onOpenAgents: bt
          }
        ),
        /* @__PURE__ */ a("div", { className: "flex gap-4 items-start", children: [
          /* @__PURE__ */ t(
            Va,
            {
              repos: He,
              selected: x,
              onToggle: ct,
              onClear: jt,
              onAddWorkspace: Et,
              onEdit: it
            }
          ),
          /* @__PURE__ */ a("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ a("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
              /* @__PURE__ */ t(Ma, { active: y, onChange: f, counts: qt }),
              /* @__PURE__ */ a(
                "button",
                {
                  onClick: () => re(!0),
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
              /* @__PURE__ */ a(
                "button",
                {
                  onClick: () => Oe(!0),
                  "aria-haspopup": "dialog",
                  className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Parked backlog ideas",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                  children: [
                    "📋 ",
                    /* @__PURE__ */ t("span", { className: "font-semibold", children: "Backlog" }),
                    ie ? /* @__PURE__ */ a("span", { style: { color: "var(--accent)" }, children: [
                      "· ",
                      ie
                    ] }) : null
                  ]
                }
              ),
              /* @__PURE__ */ a(
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
              /* @__PURE__ */ a(
                "button",
                {
                  onClick: () => J(!0),
                  "aria-haspopup": "dialog",
                  "aria-expanded": je,
                  className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                  title: "Open enabled agent sessions and see live activity",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: Mt || Ht || ge.some((s) => s.status === "pending" || s.responsePending) ? "var(--accent)" : "var(--muted)" },
                  children: [
                    Ht ? /* @__PURE__ */ t(Rt, { size: 11 }) : /* @__PURE__ */ t(
                      "span",
                      {
                        className: Mt || ge.some((s) => s.status === "pending" || s.responsePending) ? "inline-block animate-pulse" : "inline-block",
                        style: { width: 7, height: 7, borderRadius: 999, background: Mt ? "var(--ok)" : ge.some((s) => s.responsePending) ? "var(--warn)" : ge.some((s) => s.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: ge.length ? 1 : 0.5 }
                      }
                    ),
                    /* @__PURE__ */ t("span", { className: "font-semibold", children: ge.length ? `${ge.length} session${ge.length === 1 ? "" : "s"}` : "no sessions" }),
                    Ht && /* @__PURE__ */ t("span", { children: "· thinking" }),
                    Mt && /* @__PURE__ */ t("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                    !Ht && !Mt && ge.filter((s) => s.status === "pending").length > 0 && /* @__PURE__ */ a("span", { children: [
                      "· ",
                      ge.filter((s) => s.status === "pending").length,
                      " running"
                    ] }),
                    ge.some((s) => s.responsePending) && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, children: "· response" }),
                    ge.some((s) => s.stale) && /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
                      "· ",
                      ge.filter((s) => s.stale).length,
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
                    /* @__PURE__ */ t("button", { onClick: jt, className: "underline hover:opacity-80", children: "clear" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ t(Pa, { config: c, onSet: L }),
            g ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : /* @__PURE__ */ a("div", { ref: _e, className: "flex gap-3 overflow-x-auto pb-4", children: [
              y === "pipeline" && $e.map((s) => /* @__PURE__ */ t(At, { id: `stage-col-${s.id}`, title: s.name, count: (kt[s.id] || []).length, children: (kt[s.id] || []).map((p) => /* @__PURE__ */ t($t, { ..._t(p) }, p.id)) }, s.id)),
              y === "pipeline" && wt.length > 0 && /* @__PURE__ */ t("div", { className: "flex-shrink-0 pl-3", style: { borderLeft: "2px dashed var(--border-strong, var(--border))" }, children: /* @__PURE__ */ t(At, { id: "stage-col-done", title: "✅ Done", count: wt.length, children: wt.map((s) => /* @__PURE__ */ t($t, { ..._t(s) }, s.id)) }) }),
              y === "pipeline" && Nt.length > 0 && /* @__PURE__ */ t(At, { id: "stage-col-cancelled", title: "⏹ Cancelled", count: Nt.length, children: Nt.map((s) => /* @__PURE__ */ t($t, { ..._t(s) }, s.id)) }),
              y === "workspace" && Object.entries(Lt).map(([s, p]) => /* @__PURE__ */ t(At, { title: s, count: p.length, children: p.map((u) => /* @__PURE__ */ t($t, { ..._t(u) }, u.id)) }, s)),
              y === "crew" && Object.entries(It).map(([s, p]) => /* @__PURE__ */ t(At, { title: s, count: p.length, children: p.map((u) => /* @__PURE__ */ t($t, { ..._t(u) }, u.id)) }, s)),
              y === "status" && Object.entries(Pt).map(([s, p]) => /* @__PURE__ */ t(At, { title: s, count: p.length, children: p.map((u) => /* @__PURE__ */ t($t, { ..._t(u) }, u.id)) }, s))
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  ln as default
};
