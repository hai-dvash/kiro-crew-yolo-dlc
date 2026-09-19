import { jsx as t, Fragment as Fe, jsxs as a } from "react/jsx-runtime";
import { useChatLauncher as kr, useAppApi as wr, useNavigate as Er } from "@kirocrew/app-sdk";
import { PageHeader as Or, StatCard as Ft } from "@kirocrew/app-sdk/ui";
import { useState as w, useCallback as se, useEffect as De, useMemo as $e, useRef as Ie } from "react";
const qr = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), Lr = /^[.,!?;:%)\]}]$/u, Ir = /^[(\[{]$/u;
function Mr(e, r = 3) {
  const s = (String(e || "").match(qr) || []).slice(-Math.max(0, r));
  return s.reduce((l, d, u) => {
    if (u === 0) return d;
    const i = s[u - 1];
    return Lr.test(d) || Ir.test(i) ? l + d : l + " " + d;
  }, "");
}
function sr(e, r = !1) {
  return e != null && e.active && !r ? e : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function Dr(e, r, n) {
  if (!r || e != null && e.active && Number.isFinite(n) && Number.isFinite(e.seq) && n <= e.seq)
    return e;
  const l = ((e != null && e.active ? e.buffer : "") + r).slice(-512);
  return { buffer: l, tail: Mr(l, 3), active: !0, phase: "generating", seq: Number(n) || 0 };
}
function Br(e) {
  return e && { ...e, active: !1, phase: "idle" };
}
function zr(e) {
  if (!e || typeof e != "object") return null;
  const r = Array.isArray(e.lines) ? e.lines : [];
  if (!r.length) return null;
  const n = [...r].sort((d, u) => (Number(d == null ? void 0 : d.seq) || 0) - (Number(u == null ? void 0 : u.seq) || 0)), s = n.map((d) => String((d == null ? void 0 : d.note) || "")).filter(Boolean).join(" · ").slice(-512);
  if (!s) return null;
  const l = n[n.length - 1] || {};
  return {
    buffer: s,
    tail: s,
    // whole trail suffix — it is already short, human sentences
    active: !0,
    phase: String(l.phase || "running"),
    seq: Number(l.seq) || n.length,
    source: "progress-trail"
  };
}
const Pr = /* @__PURE__ */ new Set(["done", "advanced"]), Wr = /* @__PURE__ */ new Set([
  "done",
  "advanced",
  "completed",
  "consumed",
  "integrated",
  "waived",
  "omitted"
]), Ze = (e) => !!e && typeof e == "object" && !Array.isArray(e), H = (e) => Ze(e) ? e : {}, ye = (e) => Array.isArray(e) ? e : e == null ? [] : [e], W = (...e) => e.find((r) => r != null && r !== "");
function nt(e) {
  if (e == null || e === "") return "unobservable";
  if (typeof e == "boolean") return e ? "yes" : "no";
  if (typeof e == "string" || typeof e == "number") return String(e);
  if (Array.isArray(e)) return e.length ? e.map(nt).join(" · ") : "none";
  if (Ze(e)) {
    const r = Object.entries(e);
    return r.length ? r.map(([n, s]) => `${n}: ${nt(s)}`).join(" · ") : "none";
  }
  return String(e);
}
function et(e) {
  return ye(e).map((r, n) => {
    if (!Ze(r))
      return { key: `item-${n}`, title: nt(r), detail: null, status: null, level: null, ref: null, url: null };
    const s = W(
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
    ) || `item ${n + 1}`, l = W(
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
    ), u = W(
      r.status,
      r.outcome,
      r.state,
      r.passed === !0 ? "passed" : void 0,
      r.passed === !1 ? "failed" : void 0
    ), i = W(r.url, r.path, r.ref), c = typeof i == "string" && /^https?:\/\//.test(i) ? i : null;
    return {
      key: String(W(r.id, r.key, r.path, r.ref, `item-${n}`)),
      title: String(s),
      detail: l == null || String(l) === String(s) ? null : nt(l),
      status: u == null ? null : String(u),
      level: d == null ? null : String(d),
      ref: i == null ? null : String(i),
      url: c
    };
  });
}
function Ur(e) {
  return ye(e).filter((r) => r != null).map((r, n) => {
    const s = H(r), l = Ze(r) ? W(s.url, s.path, s.ref, s.id) : String(r), d = Ze(r) ? W(s.label, s.name, s.kind, s.id, s.path, s.ref, `artifact ${n + 1}`) : String(r), u = W(s.url, typeof l == "string" && /^https?:\/\//.test(l) ? l : void 0), i = W(s.preview, s.summary, s.description, s.evidence, s.detail);
    return {
      key: String(W(s.id, s.path, s.ref, `artifact-${n}`)),
      label: String(d),
      ref: l == null ? null : String(l),
      url: typeof u == "string" && /^https?:\/\//.test(u) ? u : null,
      preview: i == null ? null : nt(i),
      kind: s.kind == null ? null : String(s.kind),
      status: s.status == null ? null : String(s.status)
    };
  });
}
function Fr(e) {
  return ye(e.children).map((n, s) => {
    const l = H(n), d = l.required !== !1 && !["optional", "preferred", "advisory"].includes(
      String(W(l.enforcement, l.level, "required")).toLowerCase()
    ), u = String(W(l.status, l.state, "unobservable"));
    return {
      key: String(W(l.id, l.card_id, l.issue, `child-${s}`)),
      label: String(W(l.title, l.name, l.card_id, l.id, l.issue, `child ${s + 1}`)),
      required: d,
      status: u,
      complete: Wr.has(u.toLowerCase())
    };
  });
}
const Nr = /* @__PURE__ */ new Set([
  "done",
  "completed",
  "covered",
  "satisfied",
  "validated",
  "met",
  "passed",
  "approved"
]);
function Gr(e, r) {
  const n = H(e == null ? void 0 : e.execution_envelope);
  return n.step === r ? n : ye(e == null ? void 0 : e.execution_envelope_history).map(H).reverse().find((s) => s.step === r) || {};
}
function _r(e) {
  return typeof e == "string" ? e.trim().length > 0 : Ze(e) ? [
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
function lr(e, r) {
  const n = ye(e.validation_and_evidence).map(H);
  return ye(r).map(String).filter((s) => !n.some((l) => {
    const d = String(W(l.kind, l.type, l.id, "")).toLowerCase(), u = String(W(l.status, "")).toLowerCase();
    return (d === s.toLowerCase() || ye(l.satisfies).map(String).includes(s)) && Nr.has(u) && _r(l);
  }));
}
function Hr(e, r) {
  const n = ye(e.findings).map(H);
  if (!n.length) return !1;
  if (!r) return !0;
  const s = ye(W(e.sources, e.consulted_sources)).map(H).filter((d) => typeof d.url == "string" && /^https?:\/\//.test(d.url) && d.title && d.accessed_at && W(d.source_type, d.type)), l = new Set(s.flatMap((d) => [d.id && String(d.id), d.url]).filter(Boolean));
  return l.size > 0 && n.every((d) => {
    const u = ye(W(d.source_ids, d.sources)).map(String);
    return d.claim && u.some((i) => l.has(i));
  });
}
function Kr(e, r, n, s) {
  const l = H(e == null ? void 0 : e.intent_integrity), d = l.status === "violation" ? [`intent integrity (${ye(l.violations).join(", ")})`] : [], u = Gr(e, r), i = ye(H(u.observations).controls_runtime);
  if (Number(u.schema_version || 0) < 2 || !i.includes("result_scope"))
    return { missing: d, preferredShortfalls: [] };
  const c = [...d], b = [];
  n.envelope_id !== u.id && c.push("result bound to the active envelope revision");
  const h = ye(e == null ? void 0 : e.decisions).map(H).filter((y) => y.step && y.step !== r || y.envelope_id && y.envelope_id !== u.id ? !1 : y.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(y.kind)), S = h.filter((y) => {
    const J = String(W(y.status, "")).toLowerCase();
    return y.chosen === void 0 && y.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(J);
  }), f = H(u.questions);
  S.length && c.push("all qualified questions resolved before completion"), S.length > 1 && f.cadence === "one-at-a-time" && c.push("one-at-a-time question cadence"), Number.isInteger(f.max_rounds) && h.length > f.max_rounds && c.push(`question rounds within max_rounds=${f.max_rounds}`);
  const g = H(u.result_scope), x = H(g.enforcement), k = new Map(ye(s.intent_and_requirement_coverage).map(H).filter((y) => W(y.intent_id, y.constraint_id, y.id)).map((y) => [String(W(y.intent_id, y.constraint_id, y.id)), y]));
  for (const y of [...ye(g.required_outcome_ids), ...ye(g.hard_constraint_ids)]) {
    const J = k.get(String(y)) || {}, T = String(W(J.status, "")).toLowerCase(), he = ye(W(J.evidence_refs, J.requirement_refs, J.refs));
    (!Nr.has(T) || !he.some(_r)) && c.push(`required intent coverage ${y}`);
  }
  const M = ye(s.alternatives);
  if (Number.isInteger(g.alternatives) && M.length < g.alternatives) {
    const y = `${g.alternatives} material alternatives`;
    x.alternatives === "required" ? c.push(y) : x.alternatives === "preferred" && b.push(y);
  }
  const O = lr(s, g.evidence), A = lr(s, g.validation);
  x.evidence === "required" ? c.push(...O.map((y) => `required evidence ${y.toLowerCase()}`)) : x.evidence === "preferred" && b.push(...O.map((y) => `preferred evidence ${y.toLowerCase()}`)), x.validation === "required" ? c.push(...A.map((y) => `required validation ${y.toLowerCase()}`)) : x.validation === "preferred" && b.push(...A.map((y) => `preferred validation ${y.toLowerCase()}`));
  const D = H(u.research_policy), $ = H(e == null ? void 0 : e.research_artifacts)[r], z = ye(W(s.research_and_citations, $)).map(H), X = z.filter((y) => Hr(
    y,
    D.citations === "required"
  ));
  return D.mode === "required" && !X.length && c.push("required research with claim-level citations"), Number.isInteger(D.max_passes) && z.length > D.max_passes && c.push(`research passes within max_passes=${D.max_passes}`), D.mode === "on-demand" && z.length && !X.length && b.push("complete citations for used research"), {
    missing: [...new Set(c)],
    preferredShortfalls: [...new Set(b)]
  };
}
function Vr(e, r, n) {
  const s = H(e.runtime_handshakes), l = H(e.runtime_handshake), d = H(s[r] || (l.step == null || l.step === r ? l : {})), u = H(d.assignment), i = H(d.capabilities), c = H(i.tools), b = H(i.skills), h = H(d.routing), S = H(h.model), f = H(h.reasoning_effort), g = H(d.scope), x = H(g.worktree), k = H(n.routing_and_provenance), M = H(k.model), O = H(k.reasoning_effort), A = H(k.assignment), D = W(c.profile_declared, c.declared, k.declared_tools), $ = W(c.actual, k.actual_tools), z = W(b.profile_declared, b.declared, k.declared_skills), X = W(b.actual, k.actual_skills);
  return {
    assignedProfile: W(
      A.assigned_profile,
      k.assigned_profile,
      u.assigned_profile
    ) ?? null,
    effectiveProfile: W(
      A.effective_profile,
      k.effective_profile,
      u.effective_profile
    ) ?? null,
    model: {
      requested: W(M.requested, k.requested_model, S.requested) ?? null,
      applied: W(M.applied, k.applied_model, S.applied) ?? null,
      provider: W(M.provider, k.resolved_provider, S.provider) ?? null,
      version: W(M.version, k.model_version, S.version) ?? null,
      status: W(
        M.status,
        k.model_resolution_status,
        S.status,
        W(M.applied, k.applied_model, S.applied) != null ? "observed" : "unobservable"
      )
    },
    effort: {
      requested: W(O.requested, k.requested_effort, f.requested) ?? null,
      applied: W(O.applied, k.applied_effort, f.applied) ?? null,
      status: W(
        O.status,
        k.effort_resolution_status,
        f.status,
        W(O.applied, k.applied_effort, f.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: D == null ? null : ye(D),
      actual: $ == null ? null : ye($),
      status: W(c.status, k.tools_status, $ != null ? "observed" : "unobservable")
    },
    skills: {
      declared: z == null ? null : ye(z),
      actual: X == null ? null : ye(X),
      status: W(b.status, k.skills_status, X != null ? "observed" : "unobservable")
    },
    network: H(g.network),
    write: H(g.write),
    worktree: Object.keys(x).length ? x : null
  };
}
function Xr(e, r) {
  const n = H(e == null ? void 0 : e.gate_review), s = H(n.bundle), l = W(n.gate, e == null ? void 0 : e.stage), d = W(n.producer_step, r), u = H(e == null ? void 0 : e.step_sessions), i = Number.isInteger(n.result_revision) ? n.result_revision : null, c = W(n.status, "unobservable"), b = d ? H(e == null ? void 0 : e.step_status)[d] : void 0, h = Ur(s.artifacts), S = H(s.card_topology), f = Fr(S), g = W(S.action, "unobservable"), x = ["fan-in", "unify"].includes(String(g).toLowerCase()), k = x ? f.filter((X) => X.required && !X.complete) : [], M = [];
  (!(e != null && e.gate_review) || !Ze(e.gate_review)) && M.push("result bundle record"), (!n.bundle || !Ze(n.bundle)) && M.push("declared result bundle"), d || M.push("producer binding"), i === null && M.push("result revision"), l && (e != null && e.stage) && l !== e.stage && M.push("gate binding matches current stage"), c !== "awaiting-review" && M.push(`review status awaiting-review (currently ${c})`), Pr.has(String(b || "").toLowerCase()) || M.push(`terminal producer status (currently ${b || "unobservable"})`), W(s.summary) || M.push("result summary"), h.length === 0 && M.push("referenced artifact");
  const O = h.filter((X) => !X.ref);
  O.length > 0 && M.push(`artifact reference (${O.length} missing)`), x && f.length === 0 && M.push("declared fan-in child set"), k.length > 0 && M.push(`required child fan-in (${k.length} incomplete)`);
  const A = Kr(e, d, n, s);
  M.push(...A.missing);
  const D = ye(e == null ? void 0 : e.decisions).filter((X) => {
    const y = H(X);
    return !y.chosen && (!d || !y.step || y.step === d);
  }), $ = et([
    ...ye(s.decisions_and_questions),
    ...D
  ]), z = Vr(e || {}, d, s);
  return {
    gate: l || null,
    producerStep: d || null,
    producerSessionRef: W(
      n.producer_session_ref,
      d && Ze(u[d]) ? `step_sessions.${d}` : void 0
    ) || null,
    envelopeId: W(n.envelope_id) || null,
    revision: i,
    reviewStatus: c,
    createdAt: W(n.created_at) || null,
    ready: M.length === 0,
    missing: M,
    summary: W(s.summary) || null,
    changes: et(s.changes_since_prior),
    artifacts: h,
    coverage: et(s.intent_and_requirement_coverage),
    alternatives: et(s.alternatives),
    research: et(W(
      s.research_and_citations,
      d && H(e == null ? void 0 : e.research_artifacts)[d]
    )),
    preferredShortfalls: A.preferredShortfalls,
    decisions: $,
    topology: {
      action: g,
      integrationOwner: W(S.integration_owner, S.owner) || null,
      integrationStatus: W(S.integration_status, S.status) || null,
      children: f,
      incompleteRequiredChildren: k
    },
    budget: {
      allocated: H(s.budget).allocated ?? null,
      consumed: H(s.budget).consumed ?? null,
      remaining: H(s.budget).remaining ?? null
    },
    routing: z,
    validation: et(s.validation_and_evidence),
    risks: et(s.known_risks),
    deviations: et(s.omissions_and_deviations)
  };
}
const Yr = "~/.dlc-yolo/.statepath", rr = "~/.dlc-yolo/state.json", ir = "/tmp/dlc-yolo/state.json", Zr = 1, cr = 4096, Jr = 3072;
function Qr(e) {
  let r = e;
  if (typeof e == "string") {
    if (new TextEncoder().encode(e).length > cr) return null;
    try {
      r = JSON.parse(e);
    } catch {
      return null;
    }
  }
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  let n;
  try {
    n = JSON.stringify(r);
  } catch {
    return null;
  }
  if (new TextEncoder().encode(n).length > cr) return null;
  const s = Object.keys(r).sort();
  if (s.length !== 2 || s[0] !== "path" || s[1] !== "schema_version" || r.schema_version !== Zr || typeof r.path != "string") return null;
  const l = r.path;
  return !l.startsWith("/") || l.length === 0 || l.length > Jr || l.includes("\0") || l.includes("\r") || l.includes(`
`) || l.split("/").some((d) => d === "." || d === "..") ? null : l;
}
async function Vt(e) {
  try {
    const r = await e(Yr), n = Qr(r);
    if (n)
      try {
        return { path: n, data: await e(n), source: "pointer" };
      } catch {
      }
  } catch {
  }
  try {
    return { path: rr, data: await e(rr), source: "durable" };
  } catch {
    return { path: ir, data: await e(ir), source: "scratch" };
  }
}
async function dr(e, r) {
  try {
    return { path: r, data: await e(r), source: "current" };
  } catch {
    return Vt(e);
  }
}
const ea = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
function ta(e) {
  const r = /* @__PURE__ */ new Map();
  for (const n of String(e || "").split(/[\n,]/)) {
    const s = n.trim();
    ea.test(s) && !r.has(s.toLowerCase()) && r.set(s.toLowerCase(), s);
  }
  return [...r.values()].sort((n, s) => n.toLowerCase().localeCompare(s.toLowerCase()));
}
const ra = {
  "receiver-disabled": "Enable and save the receiver above first.",
  "receiver-secret-missing": "Set a webhook secret above before exposing the port.",
  "receiver-allowlist-empty": "Add at least one allowed repository above first.",
  "receiver-port-mismatch": "Save the receiver on this port before starting the tunnel.",
  "receiver-not-listening": "The receiver is not listening yet — save it, then Refresh.",
  "receiver-config-invalid": "Repair the stored receiver configuration first."
};
function pr(e) {
  return e === "listening" ? "var(--ok)" : e === "misconfigured" || e === "failed" ? "var(--danger, #ef4444)" : "var(--muted)";
}
function At(e) {
  const r = (e == null ? void 0 : e.message) || String(e);
  return /(?:404|not found)/i.test(r) ? "Webhook backend unavailable in the running gateway. Restart KiroCrew after syncing this app, then refresh this tab." : r;
}
function Cr() {
  var G, Y;
  const e = wr(), [r, n] = w(null), [s, l] = w(!1), [d, u] = w("8765"), [i, c] = w(""), [b, h] = w(""), [S, f] = w(""), [g, x] = w(!1), [k, M] = w(!1), [O, A] = w(!0), [D, $] = w(!1), [z, X] = w(""), y = se((q) => {
    n(q), l(!!q.enabled), u(String(q.port || 8765)), c((q.repositories || []).join(`
`)), h(q.inbox_path || ""), M(!!q.autosync), f(""), x(!1);
  }, []), J = se(async () => {
    A(!0), X("");
    try {
      y(await e.get("/apps/dlc-yolo/api/webhook/config"));
    } catch (q) {
      X(At(q));
    } finally {
      A(!1);
    }
  }, [e, y]);
  De(() => {
    J();
  }, [J]);
  const [T, he] = w(null), [ke, le] = w(!1), ve = se(async () => {
    try {
      he(await e.get("/apps/dlc-yolo/api/tunnel/status"));
    } catch {
      he(null);
    }
  }, [e]);
  De(() => {
    ve();
  }, [ve]);
  const Te = se(async () => {
    le(!0);
    try {
      he(await e.post("/apps/dlc-yolo/api/tunnel/start", {}));
    } catch (q) {
      X(At(q));
    } finally {
      le(!1);
    }
  }, [e]), Q = se(async () => {
    le(!0);
    try {
      he(await e.post("/apps/dlc-yolo/api/tunnel/stop", {}));
    } catch (q) {
      X(At(q));
    } finally {
      le(!1);
    }
  }, [e]), [P, ee] = w(null), [Re, Ae] = w(!1), Ce = se(async () => {
    try {
      ee(await e.get("/apps/dlc-yolo/api/crons/status"));
    } catch {
      ee(null);
    }
  }, [e]);
  De(() => {
    Ce();
  }, [Ce]);
  const C = se(async (q) => {
    Ae(!0);
    try {
      const ce = q ? "/apps/dlc-yolo/api/crons/pause" : "/apps/dlc-yolo/api/crons/resume";
      ee(await e.post(ce, {}));
    } catch (ce) {
      X(At(ce));
    } finally {
      Ae(!1);
    }
  }, [e]), F = $e(() => ta(i), [i]), ae = Number(d), we = typeof TextEncoder > "u" ? S.length : new TextEncoder().encode(S).length, Oe = !!(r != null && r.secret_configured) || we >= 32, re = Number.isInteger(ae) && ae >= 1024 && ae <= 65535 && (!s || F.length > 0 && Oe) && (!b.trim() || b.trim().startsWith("/")), ge = async () => {
    if (!(!(r != null && r.editable) || !re)) {
      $(!0), X("");
      try {
        const q = {
          enabled: s,
          port: ae,
          repositories: F,
          inbox_path: b.trim() || null,
          clear_secret: g,
          autosync: k
        };
        S && (q.secret = S), y(await e.post("/apps/dlc-yolo/api/webhook/config", q));
      } catch (q) {
        X(At(q));
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
                style: { color: pr(r.listener), background: `color-mix(in srgb, ${pr(r.listener)} 13%, transparent)` },
                children: r.listener
              }
            )
          ] }),
          /* @__PURE__ */ t("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "Shared by every pipeline. This authenticated control owns the app-wide loopback receiver; the secret is write-only and never returned." })
        ] }) }),
        /* @__PURE__ */ a("div", { className: "px-4 py-4 flex flex-col gap-4", children: [
          O ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: "Loading receiver configuration…" }) : r && /* @__PURE__ */ a(Fe, { children: [
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
                  onClick: () => l((q) => !q),
                  "aria-pressed": s,
                  className: "rounded-full transition-all relative disabled:opacity-50",
                  style: { background: s ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                  children: /* @__PURE__ */ t("span", { className: "absolute top-0.5 rounded-full transition-all", style: { height: 18, width: 18, background: "var(--bg)", left: s ? 20 : 2 } })
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
                    onChange: (q) => u(q.target.value),
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
                  onChange: (q) => c(q.target.value),
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
                  onChange: (q) => h(q.target.value),
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
                  onChange: (q) => f(q.target.value),
                  placeholder: r.secret_configured ? "•••••••••••••••• (unchanged)" : "Enter a new secret",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            !s && r.secret_configured && r.editable && /* @__PURE__ */ a("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer", style: { color: "var(--muted)" }, children: [
              /* @__PURE__ */ t("input", { type: "checkbox", checked: g, onChange: (q) => x(q.target.checked) }),
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
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: ((G = r.inbox) == null ? void 0 : G.pending) ?? "—" })
                  ] }),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: "Processed" }),
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: ((Y = r.inbox) == null ? void 0 : Y.processed) ?? "—" })
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
                        style: { color: T != null && T.running ? "var(--ok)" : "var(--muted)", border: "1px solid var(--border)" },
                        children: T ? T.running ? "running" : T.installed ? "stopped" : "not installed" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ t("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "The receiver is loopback-only, so GitHub needs a public relay. Start a Cloudflare quick tunnel here, or run the shown command yourself. cloudflared is never installed automatically." }),
                  T && !T.installed && /* @__PURE__ */ a("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "cloudflared is not installed. Install it, then Refresh status.",
                    T.install_hint && /* @__PURE__ */ t("pre", { className: "mt-1 whitespace-pre-wrap font-mono text-[10px]", style: { color: "var(--text)" }, children: T.install_hint })
                  ] }),
                  (T == null ? void 0 : T.running) && T.payload_url && /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "GitHub payload URL",
                    /* @__PURE__ */ t(
                      "input",
                      {
                        readOnly: !0,
                        value: T.payload_url,
                        onFocus: (q) => q.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ok)" }
                      }
                    )
                  ] }),
                  (T == null ? void 0 : T.command) && /* @__PURE__ */ a("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "Command ",
                    T.running ? "running" : "to run yourself",
                    /* @__PURE__ */ t(
                      "input",
                      {
                        readOnly: !0,
                        value: T.command,
                        onFocus: (q) => q.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }
                      }
                    )
                  ] }),
                  (T == null ? void 0 : T.last_error) && /* @__PURE__ */ a("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Tunnel: ",
                    T.last_error
                  ] }),
                  T && T.installed && !T.running && T.receiver_ready === !1 && /* @__PURE__ */ a("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "Won't expose the port until the receiver is ready: ",
                    ra[T.receiver_block_reason || ""] || T.receiver_block_reason
                  ] }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    T != null && T.running ? /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Q(),
                        disabled: ke,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--danger, #ef4444)", color: "var(--bg)" },
                        children: ke ? "Stopping…" : "Stop tunnel"
                      }
                    ) : /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Te(),
                        disabled: ke || !(T != null && T.installed) || (T == null ? void 0 : T.receiver_ready) === !1,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: ke ? "Starting…" : "Start tunnel"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void ve(),
                        disabled: ke,
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
                        checked: k,
                        disabled: !(r != null && r.editable),
                        onChange: (q) => M(q.target.checked),
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
                  (T == null ? void 0 : T.autosync) && T.autosync.enabled && /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: T.autosync.error ? "var(--danger, #ef4444)" : "var(--ok)" }, children: T.autosync.error ? `Auto-sync failed: ${T.autosync.error}` : `Auto-synced ${(T.autosync.results || []).filter((q) => q.action === "updated").length} hook(s) → ${T.autosync.payload_url}` })
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
                  P && P.available && P.jobs.length > 0 && /* @__PURE__ */ t("div", { className: "flex flex-col gap-1", children: P.jobs.map((q) => /* @__PURE__ */ a(
                    "div",
                    {
                      className: "flex items-center justify-between text-[11px] font-mono",
                      style: { color: "var(--muted)" },
                      children: [
                        /* @__PURE__ */ t("span", { children: q.basename }),
                        /* @__PURE__ */ t("span", { style: { color: q.paused ? "var(--warn)" : "var(--ok)" }, children: q.paused ? "paused" : "active" })
                      ]
                    },
                    q.id
                  )) }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void C(!0),
                        disabled: Re || !(P != null && P.available) || (P == null ? void 0 : P.all_paused),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--warn)", color: "var(--bg)" },
                        children: Re ? "…" : "Pause all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void C(!1),
                        disabled: Re || !(P != null && P.available) || (P == null ? void 0 : P.any_active),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: Re ? "…" : "Resume all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Ce(),
                        disabled: Re,
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
          z && /* @__PURE__ */ t("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))" }, children: z })
        ] }),
        /* @__PURE__ */ a("footer", { className: "px-4 py-3 flex justify-between gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--card)" }, children: [
          /* @__PURE__ */ t("button", { onClick: () => void J(), disabled: O || D, className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50", style: { color: "var(--muted)" }, children: "Refresh status" }),
          (r == null ? void 0 : r.editable) && /* @__PURE__ */ t(
            "button",
            {
              onClick: () => void ge(),
              disabled: !re || D,
              className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
              style: { background: "var(--accent)", color: "var(--bg)" },
              children: D ? "Applying…" : "Save & apply"
            }
          )
        ] })
      ]
    }
  );
}
function aa({ repos: e, selectedRepos: r, onNewPipeline: n, onConfigure: s, onOpenAgents: l }) {
  const { openChat: d } = kr(), u = r.length === 1 ? r[0] : e.length === 1 ? e[0] : "", i = "/dlc-yolo", c = "text-[10px] leading-none px-1.5 py-1 rounded font-semibold";
  return /* @__PURE__ */ t(Fe, { children: /* @__PURE__ */ a("div", { "data-dlc-command-controls": !0, className: "mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap", children: [
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
        onClick: () => u ? s(u) : n(),
        className: c,
        style: { color: "var(--muted)", border: "1px solid var(--border)" },
        children: u ? "Edit pipeline" : "New pipeline"
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
    u && /* @__PURE__ */ a("span", { className: "text-[10px] truncate max-w-[300px]", style: { color: "var(--muted)" }, children: [
      "Target: ",
      u
    ] })
  ] }) });
}
const Gt = {
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
};
function jt(e) {
  return e ? e.max_child_cards === "unlimited" && e.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth";
}
function na({ budget: e, depth: r, onSave: n }) {
  const [s, l] = w(!1), [d, u] = w(jt(e)), [i, c] = w(
    jt(e) === "custom" ? { ...e } : { ...Gt[r] || Gt.standard }
  ), b = () => {
    const f = jt(e);
    u(f), c(f === "custom" ? { ...e } : { ...Gt[r] || Gt.standard }), l(!0);
  }, h = () => {
    n(d === "depth" ? void 0 : d === "unlimited" ? {
      max_child_cards: "unlimited",
      effort_ceiling: "unlimited",
      max_feature_size: "XL",
      addenda: "proactive"
    } : { ...i }), l(!1);
  }, S = jt(e) === "depth" ? "budget: depth" : jt(e) === "unlimited" ? "budget: unlimited" : "budget: custom";
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
    s && /* @__PURE__ */ a(
      "div",
      {
        className: "absolute z-40 mt-1 left-0 w-72 rounded-lg p-3 flex flex-col gap-2",
        style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 12px 36px rgba(0,0,0,.35)" },
        children: [
          /* @__PURE__ */ t("div", { className: "text-[11px] font-semibold", style: { color: "var(--text)" }, children: "Card budget override" }),
          /* @__PURE__ */ t("div", { className: "grid grid-cols-3 gap-1", children: ["depth", "custom", "unlimited"].map((f) => /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              onClick: () => u(f),
              className: "text-[10px] px-2 py-1 rounded font-semibold",
              style: { color: d === f ? "var(--bg)" : "var(--muted)", background: d === f ? "var(--accent)" : "var(--bg-hover, var(--border))" },
              children: f === "depth" ? "follow depth" : f
            },
            f
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
                  onChange: (f) => c((g) => ({ ...g, max_child_cards: Math.max(0, Number(f.target.value) || 0) })),
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
                  onChange: (f) => c((g) => ({ ...g, effort_ceiling: Math.max(0, Number(f.target.value) || 0) })),
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
                  onChange: (f) => c((g) => ({ ...g, max_feature_size: f.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["S", "M", "L", "XL"].map((f) => /* @__PURE__ */ t("option", { children: f }, f))
                }
              )
            ] }),
            /* @__PURE__ */ a("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Addenda",
              /* @__PURE__ */ t(
                "select",
                {
                  value: i.addenda,
                  onChange: (f) => c((g) => ({ ...g, addenda: f.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["none", "obvious", "proactive"].map((f) => /* @__PURE__ */ t("option", { children: f }, f))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ a("div", { className: "flex justify-end gap-2 mt-1", children: [
            /* @__PURE__ */ t("button", { type: "button", onClick: () => l(!1), className: "text-[10px] px-2 py-1", style: { color: "var(--muted)" }, children: "Cancel" }),
            /* @__PURE__ */ t("button", { type: "button", onClick: h, className: "text-[10px] px-2 py-1 rounded font-semibold", style: { background: "var(--accent)", color: "var(--bg)" }, children: "Save budget" })
          ] })
        ]
      }
    )
  ] });
}
const ur = [
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
], Sr = {
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
}, oa = /* @__PURE__ */ new Set(["retired", "merged"]), mr = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked"]);
function sa(e) {
  const r = e == null ? void 0 : e.execution_schedule;
  if (!r || typeof r != "object") return null;
  const n = r.nodes;
  if (!n || typeof n != "object") return null;
  const s = r.current_node_id;
  return typeof s == "string" && n[s] && typeof n[s] == "object" ? n[s] : Object.values(n).find((l) => l && typeof l == "object" && l.step === e.stage) || null;
}
function vr(e, r) {
  const n = e == null ? void 0 : e[r], s = n && typeof n == "object" ? n[e.stage] : null;
  return typeof s == "string" && s.trim() ? s.trim() : null;
}
function la(e, r) {
  const n = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", s = Array.isArray(e == null ? void 0 : e.decisions) ? e.decisions.filter((d) => d && !d.chosen && !d.resolved_at && (d.step === n || !d.step) && Array.isArray(d.options) && d.options.length) : [], l = (r || "").toLowerCase();
  return s.length ? { severity: "decision", label: "Choose an option", color: "var(--accent)" } : /capability|missing|not in inventory|no crew|external|unavailable|cannot proceed without a tool/.test(l) ? { severity: "hard", label: "Blocked · needs setup", color: "var(--danger)" } : /approv|confirm|sign.?off|awaiting.*human|needs.?you/.test(l) ? { severity: "approval", label: "Needs approval", color: "var(--warn)" } : { severity: "attention", label: "Needs input", color: "var(--warn)" };
}
function hr(e, { isGate: r = !1, liveObserved: n = !1 } = {}) {
  const s = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", l = typeof (e == null ? void 0 : e.lifecycle) == "string" ? e.lifecycle.toLowerCase() : "", d = e != null && e.step_status && typeof e.step_status == "object" ? String(e.step_status[s] || "") : "", u = sa(e), i = typeof (u == null ? void 0 : u.status) == "string" ? u.status : "", c = e != null && e.step_sessions && typeof e.step_sessions == "object" ? e.step_sessions[s] : null, b = mr.has(l) || i === "cancelling" || (c == null ? void 0 : c.writes_allowed) === !1 || !!(c != null && c.cancel_requested_at), h = s === "done" || oa.has(l) || ["completed", "cancelled", "superseded"].includes(i);
  let S, f = null, g = null, x = null, k = null;
  if (h)
    S = "terminal", f = i === "cancelled" || mr.has(l) ? `terminal ${l || i}` : l || i || s || null;
  else if (b)
    S = "cancelling", f = "writes revoked; awaiting terminal observation";
  else if (d === "blocked" || i === "blocked") {
    S = "blocked", f = vr(e, "block_reason") || ((u == null ? void 0 : u.wait_reasons) || [])[0] || "step blocked";
    const O = la(e, f);
    g = O.severity, x = O.label, k = O.color;
  } else d === "error" || i === "failed" ? (S = "error", f = vr(e, "error_reason") || (u == null ? void 0 : u.dispatch_error) || "step error") : r || i === "gate-wait" ? S = "waiting-gate" : n ? S = "running-observed" : d === "pending" || i === "running" ? (S = "pending-unconfirmed", f = "no current live observation") : ["queued", "dependency-wait", "permit-wait"].includes(i) ? (S = "queued", f = Array.isArray(u == null ? void 0 : u.wait_reasons) ? u.wait_reasons.join(" · ") : null) : i === "ready" ? S = "ready" : S = "idle";
  const M = Sr[S];
  return {
    kind: S,
    reason: f,
    severity: g,
    label: x || M.label,
    color: k || M.color
  };
}
const bt = { LOOP: "loop", STEP: "step-agent", ORCH: "orchestrator", HUMAN: "human" };
function ct(e) {
  return typeof e == "string" ? e : "";
}
function ia(e) {
  if (!e || typeof e != "object") return [];
  const r = [], n = (s) => {
    s && s.at && r.push(s);
  };
  for (const s of e.history || [])
    !s || typeof s != "object" || n({
      id: `hist:${s.at}:${s.to}`,
      at: ct(s.at),
      actor: bt.LOOP,
      kind: "promoted",
      step: s.to,
      cls: "notification",
      needs_human: !1,
      headline: `advanced ${s.from || "?"} → ${s.to || "?"}`,
      detail: s.agent ? `by ${s.agent}` : ""
    });
  for (const [s, l] of Object.entries(e.step_summaries || {})) {
    if (!l || typeof l != "object" || !l.headline) continue;
    const d = l.status === "blocked";
    n({
      id: `summ:${s}:${l.at || l.status}`,
      at: ct(l.at) || ct(e.updated_at),
      actor: bt.STEP,
      kind: d ? "blocked" : l.status === "error" ? "error" : "step-done",
      step: s,
      cls: "notification",
      needs_human: !!l.needs_human,
      headline: l.headline,
      detail: l.description || "",
      executor: l.executor || null
    });
  }
  for (const s of e.gate_history || [])
    !s || typeof s != "object" || n({
      id: `gate:${s.at}:${s.gate}`,
      at: ct(s.at),
      actor: bt.HUMAN,
      kind: s.decision === "rejected" ? "rejected" : s.decision === "approved" ? "approved" : "gate",
      step: s.gate,
      cls: "decision",
      needs_human: !1,
      headline: `you ${s.decision || "acted on"} ${s.gate}`,
      detail: s.notes || ""
    });
  for (const s of e.decisions || []) {
    if (!s || typeof s != "object") continue;
    const l = !!s.chosen || !!s.resolved_at;
    n({
      id: `dec:${s.id || s.at}`,
      at: ct(s.at),
      actor: bt.ORCH,
      kind: l ? "resolved" : "decision",
      step: s.step,
      cls: "decision",
      needs_human: !l,
      headline: l ? `resolved: ${s.chosen || s.action || s.kind || "decision"}` : `decision needed: ${s.question || s.kind || "a fork"}`,
      detail: s.rationale || s.question || ""
    });
  }
  for (const s of e.backstep_history || [])
    !s || typeof s != "object" || n({
      id: `back:${s.at}`,
      at: ct(s.at),
      actor: bt.ORCH,
      kind: "back-stepped",
      step: s.to,
      cls: "notification",
      needs_human: !1,
      headline: `stepped back ${s.from || "?"} → ${s.to || "?"}`,
      detail: s.reason || ""
    });
  for (const s of e.parked || [])
    !s || typeof s != "object" || n({
      id: `park:${s.id || s.at}`,
      at: ct(s.at),
      actor: bt.ORCH,
      kind: "parked",
      step: s.phase,
      cls: "notification",
      needs_human: !1,
      headline: `parked to backlog: ${s.note || "idea"}`,
      detail: s.issue_url || ""
    });
  return r.map((s, l) => ({ ...s, _i: l })).sort((s, l) => s.at < l.at ? -1 : s.at > l.at ? 1 : s._i - l._i).map(({ _i: s, ...l }) => l);
}
const ca = /^\[([a-z0-9-]+)\s*[·.]\s*f?\d+\]\s*(.*)$/i;
function $r(e) {
  const r = ca.exec(String(e || ""));
  return r ? { parentId: r[1], rest: r[2] } : null;
}
function da(e, r) {
  var d;
  if (!e) return [];
  const n = [], s = /* @__PURE__ */ new Set(), l = (u) => {
    u && !s.has(u.id) && (s.add(u.id), n.push(u));
  };
  for (const u of ((d = e.topology) == null ? void 0 : d.children) || []) {
    const i = typeof u == "string" ? u : u == null ? void 0 : u.card_id, c = (r || []).find((b) => b.id === i);
    c && l({ id: c.id, title: c.title, stage: c.stage, lifecycle: c.lifecycle, required: (u == null ? void 0 : u.required) !== !1 });
  }
  for (const u of r || []) {
    const i = $r(u.title);
    i && i.parentId === e.id && l({ id: u.id, title: u.title, stage: u.stage, lifecycle: u.lifecycle, required: !0 });
  }
  return n;
}
function pa(e) {
  var n;
  const r = $r(e == null ? void 0 : e.title);
  return r ? r.parentId : ((n = e == null ? void 0 : e.topology) == null ? void 0 : n.integration_owner) || (e == null ? void 0 : e.parent_card) || null;
}
const gr = ["webhook", "loop", "orchestrator", "crew", "step-agent", "human"], Tr = {
  webhook: "⬇",
  loop: "⚙",
  orchestrator: "🧠",
  crew: "👥",
  "step-agent": "🤖",
  human: "🧑"
};
function Me(e) {
  return typeof e == "string" ? e : "";
}
function ua(e) {
  return String(e || "").slice(0, 8);
}
function ma(e, r) {
  var u;
  const n = e.id, s = ((u = e.execution_schedule) == null ? void 0 : u.nodes) || {};
  for (const [i, c] of Object.entries(s)) {
    if (!c || typeof c != "object") continue;
    const b = Me(c.terminal_at) || Me(c.session_at) || Me(c.ready_at) || Me(c.created_at);
    r({
      id: `sched:${i}`,
      at: b,
      actor: "step-agent",
      kind: `step-${c.status || "node"}`,
      cardId: n,
      step: c.step,
      node_id: i,
      headline: `${c.step || c.kind || "step"} · ${c.status || "node"}`,
      detail: c.concurrency_class ? `class ${c.concurrency_class}` : ""
    });
  }
  for (const i of e.event_outbox || [])
    !i || typeof i != "object" || r({
      id: i.id || `outbox:${n}:${i.subject}:${i.time}`,
      at: Me(i.time),
      actor: "step-agent",
      kind: (i.type || "").split(".").pop() || "event",
      cardId: n,
      step: i.subject,
      run_id: i.run_id,
      envelope_id: i.envelope_id,
      caused_by: i.correlation_id && i.correlation_id !== n ? i.correlation_id : void 0,
      headline: `${i.subject || "step"} → ${i.terminal_status || i.type || "event"}`,
      detail: i.observed_status ? `observed: ${i.observed_status}` : i.run_id ? `run ${ua(i.run_id)}` : ""
    });
  for (const i of e.history || []) {
    if (!i || typeof i != "object") continue;
    const c = i.agent || "", b = /cron|advance/i.test(c) ? "loop" : /human|user/i.test(c) ? "human" : "loop";
    r({
      id: `hist:${n}:${i.at}:${i.to}`,
      at: Me(i.at),
      actor: b,
      kind: "promoted",
      cardId: n,
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
      id: `dec:${i.id || n + i.step}`,
      at: Me(i.at) || Me(i.resolved_at),
      actor: "orchestrator",
      kind: c ? "decision-resolved" : "decision-open",
      cardId: n,
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
      id: `gate:${n}:${i.at}:${i.gate}`,
      at: Me(i.at),
      actor: c ? "human" : "orchestrator",
      kind: i.decision === "rejected" ? "gate-rejected" : "gate-approved",
      cardId: n,
      step: i.gate,
      headline: `${c ? "human" : i.actor || "system"} ${i.decision || "acted"} ${i.gate}`,
      detail: i.notes || (i.result_revision != null ? `rev ${i.result_revision}` : "")
    });
  }
  const l = e.orchestrator_session;
  l && l.at && r({
    id: `orch:${n}:${l.session_key || l.at}`,
    at: Me(l.at),
    actor: "orchestrator",
    kind: "orchestrator-session",
    cardId: n,
    session_key: l.session_key,
    headline: "orchestrator session",
    detail: l.name || l.slot_key || ""
  });
  const d = e.orchestrator_trigger;
  d && d.at && (!l || d.at !== l.at) && r({
    id: `orchtrig:${n}:${d.at}`,
    at: Me(d.at),
    actor: "orchestrator",
    kind: "orchestrator-trigger",
    cardId: n,
    session_key: d.session_key,
    headline: `orchestrator trigger · ${d.status || ""}`,
    detail: ""
  });
  for (const [i, c] of Object.entries(e.step_sessions || {}))
    !c || typeof c != "object" || !c.at || r({
      id: `sess:${n}:${i}:${c.at}`,
      at: Me(c.at),
      actor: "crew",
      kind: "session",
      cardId: n,
      step: i,
      session_key: c.slot_key || c.session_key,
      headline: `crew session · ${i}`,
      detail: c.executor || c.working_dir || "",
      inferred: !0
    });
}
function va(e, r) {
  for (const n of (e == null ? void 0 : e.github_webhook_history) || [])
    !n || typeof n != "object" || r({
      id: `wh:${n.delivery_id}`,
      at: Me(n.at) || Me(n.received_at) || Me(n.time),
      actor: "webhook",
      kind: `webhook-${n.status || "received"}`,
      cardId: n.card_id,
      caused_by: void 0,
      headline: `${n.event}.${n.action} #${n.issue_number ?? "?"}`,
      detail: `${n.repository || ""}${n.status ? ` · ${n.status}` : ""}${n.reason ? ` (${n.reason})` : ""}`
    });
}
function ha(e, r, n) {
  const s = e == null ? void 0 : e.id, l = (r || []).filter((b) => {
    var h;
    return b && (b.pipeline_id === s || !b.pipeline_id && ((h = b.source) == null ? void 0 : h.repo) === (e == null ? void 0 : e.repo));
  }), d = [], u = (b) => {
    b && b.at && d.push({ glyph: Tr[b.actor] || "•", ...b });
  };
  for (const b of l) ma(b, u);
  va(n, u);
  const i = Object.fromEntries(gr.map((b, h) => [b, h]));
  d.sort((b, h) => (b.at < h.at ? -1 : b.at > h.at ? 1 : 0) || (i[b.actor] ?? 9) - (i[h.actor] ?? 9) || (b.id < h.id ? -1 : b.id > h.id ? 1 : 0));
  const c = gr.filter((b) => d.some((h) => h.actor === b));
  return { events: d, actors: c, now: (n == null ? void 0 : n.scheduler_state) || null };
}
const ga = [
  "request:re-spec",
  "request:retry",
  "request:back-step",
  "request:park",
  "request:cancel"
], ar = 500, nr = {
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
function ba() {
  var r, n;
  return `ui-${(((n = (r = globalThis.crypto) == null ? void 0 : r.randomUUID) == null ? void 0 : n.call(r)) || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16)}`;
}
function xa(e, r) {
  if (!ga.includes(e)) return { ok: !1, error: `unknown request kind: ${e}` };
  const n = nr[e], s = String(r || "").trim();
  return n.reasonRequired && !s ? { ok: !1, error: "a reason is required for this request" } : s.length > ar ? { ok: !1, error: `reason exceeds ${ar} chars` } : { ok: !0 };
}
function fa({ id: e, kind: r, text: n, card: s, now: l, boundary: d }) {
  const u = xa(r, n);
  if (!u.ok) throw new Error(u.error);
  const i = s == null ? void 0 : s.stage, c = s != null && s.step_status && typeof s.step_status == "object" ? s.step_status[i] ?? null : null, b = {
    id: e,
    at: l,
    step: i,
    kind: r,
    text: String(n || "").trim().slice(0, ar),
    by: "user",
    status: "pending",
    expected: { stage: i ?? null, step_status: c }
  };
  return r === "request:back-step" && d && (b.boundary = d), b;
}
function ya(e, r) {
  const n = Array.isArray(e) ? e : [];
  return n.some((s) => s && s.id === r.id) ? n : [...n, r];
}
const Rr = [
  "ready",
  "queued",
  "running",
  "pending",
  "blocked",
  "error",
  "cancelling",
  "terminal"
];
function ka(e, r) {
  const n = Object.fromEntries(Rr.map((d) => [d, 0])), s = r && typeof r == "object" ? r : {};
  n.ready = (s.ready_node_ids || []).length, n.running = (s.running_node_ids || []).length, n.blocked = (s.blocked_node_ids || []).length, n.queued = (s.selected_node_ids || []).length;
  const l = [];
  for (const d of e || []) {
    if (!d || typeof d != "object") continue;
    const u = d.stage, i = d.step_status && typeof d.step_status == "object" ? d.step_status[u] : null;
    d.writes_allowed === !1 || d.cancel_requested_at ? n.cancelling += 1 : i === "error" ? n.error += 1 : i === "blocked" ? n.blocked += 1 : i === "pending" ? n.pending += 1 : (i === "done" || d.lifecycle === "retired" || d.lifecycle === "merged") && (n.terminal += 1);
    const c = d.block_reason && typeof d.block_reason == "object" ? d.block_reason[u] : null;
    c && l.push({ card: d.id, reason: String(c) });
  }
  return { counts: n, waitReasons: l.slice(0, 50) };
}
function Ht(e) {
  if (!e || typeof e != "object")
    return { available: !1, label: "unavailable", authority_active: !1, verified: !1 };
  const r = !!e.authority_active, n = String(e.parity_status || ""), s = n === "verified" || e.verified === !0;
  return {
    available: !0,
    authority_active: r,
    verified: s,
    parity_status: n || (s ? "verified" : "unknown"),
    digest_match: e.digest_match === void 0 ? null : !!e.digest_match,
    failure_code: e.failure_code || e.error || null,
    // never surface paths/prose from the minimized model
    label: r ? s ? "verified" : "blocked" : "authority inactive"
  };
}
const br = /^[A-Za-z0-9._-]{1,128}$/;
function Et({ values: e, empty: r = "none declared" }) {
  return e.length ? /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1", children: e.map((n) => /* @__PURE__ */ t(
    "code",
    {
      className: "text-[10px] px-1.5 py-0.5 rounded",
      style: { color: "var(--text)", background: "var(--bg-hover, var(--border))", border: "1px solid var(--border)" },
      children: n
    },
    n
  )) }) : /* @__PURE__ */ t("span", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: r });
}
function tt({ label: e, value: r }) {
  return /* @__PURE__ */ a("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]", children: [
    /* @__PURE__ */ t("span", { className: "uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ t("span", { className: "break-words", style: { color: r ? "var(--text)" : "var(--muted)" }, children: r || "not set" })
  ] });
}
function wa({ profiles: e, initial: r, onSave: n, onClose: s }) {
  var D;
  const l = r ? "update" : "create", [d, u] = w((r == null ? void 0 : r.name) || ""), [i, c] = w((r == null ? void 0 : r.kiroAgent) || ((D = e.find(($) => $.status === "loaded")) == null ? void 0 : D.name) || ""), [b, h] = w((r == null ? void 0 : r.workspace) || ""), [S, f] = w((r == null ? void 0 : r.memoryStore) || ""), [g, x] = w(!1), [k, M] = w(""), O = br.test(d.trim()) && br.test(i.trim()) && new TextEncoder().encode(b.trim()).length <= 256 && new TextEncoder().encode(S.trim()).length <= 256, A = async () => {
    if (!(!O || g)) {
      x(!0), M("");
      try {
        await n({
          mode: l,
          name: d.trim(),
          kiroAgent: i.trim(),
          workspace: b.trim() || void 0,
          memoryStore: S.trim() || void 0
        });
      } catch ($) {
        M(($ == null ? void 0 : $.message) || String($)), x(!1);
      }
    }
  };
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[80] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 68%, transparent)", backdropFilter: "blur(3px)" },
      onMouseDown: ($) => {
        $.currentTarget === $.target && !g && s();
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
                  onClick: s,
                  disabled: g,
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
                    onChange: ($) => u($.target.value),
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
                    onChange: ($) => h($.target.value),
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
                    onChange: ($) => f($.target.value),
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
              k && /* @__PURE__ */ t("div", { className: "text-[11px] rounded-md px-3 py-2", style: { color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))" }, children: k })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              /* @__PURE__ */ t("button", { onClick: s, disabled: g, className: "text-[11px] px-3 py-1.5 rounded-md disabled:opacity-40", style: { color: "var(--muted)" }, children: "Cancel" }),
              /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => void A(),
                  disabled: !O || g,
                  className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: g ? "Saving…" : l === "create" ? "Create crew route" : "Save crew route"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function or({ profiles: e, crews: r, loading: n = !1, context: s, onRefresh: l, onClose: d, onSelectProfile: u, onSelectCrew: i, onSaveCrew: c }) {
  var z, X;
  const [b, h] = w("agents"), [S, f] = w(((z = e[0]) == null ? void 0 : z.name) || ""), [g, x] = w(((X = r[0]) == null ? void 0 : X.name) || ""), [k, M] = w(null);
  De(() => {
    var y;
    e.some((J) => J.name === S) || f(((y = e[0]) == null ? void 0 : y.name) || "");
  }, [e, S]), De(() => {
    var y;
    r.some((J) => J.name === g) || x(((y = r[0]) == null ? void 0 : y.name) || "");
  }, [r, g]);
  const O = e.find((y) => y.name === S), A = r.find((y) => y.name === g), D = $e(
    () => A != null && A.kiroAgent ? e.find((y) => y.name === A.kiroAgent) : void 0,
    [A, e]
  ), $ = O != null && O.prompt ? O.prompt.length > 1200 ? `${O.prompt.slice(0, 1200)}…` : O.prompt : "";
  return /* @__PURE__ */ a(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 62%, transparent)", backdropFilter: "blur(2px)" },
      onMouseDown: (y) => {
        y.currentTarget === y.target && d();
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
                  s && /* @__PURE__ */ a("p", { className: "text-[10px] mt-1", style: { color: "var(--accent)" }, children: [
                    "Pipeline context: ",
                    s
                  ] })
                ] }),
                l && /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: l,
                    disabled: n,
                    className: "text-[11px] px-2.5 py-1.5 rounded-md disabled:opacity-50",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: n ? "Refreshing…" : "Refresh"
                  }
                ),
                c && /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: () => {
                      h("crews"), M({ mode: "create" });
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
              /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: [["agents", `Agent templates · ${e.length}`], ["crews", `Global crews · ${r.length}`]].map(([y, J]) => /* @__PURE__ */ t(
                "button",
                {
                  onClick: () => h(y),
                  className: "text-[12px] px-3 py-2 font-semibold",
                  style: { color: b === y ? "var(--accent)" : "var(--muted)", borderBottom: `2px solid ${b === y ? "var(--accent)" : "transparent"}`, marginBottom: -1 },
                  children: J
                },
                y
              )) }),
              /* @__PURE__ */ t("div", { className: "flex min-h-0 flex-1", children: b === "agents" ? /* @__PURE__ */ a(Fe, { children: [
                /* @__PURE__ */ a("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  e.map((y) => /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: () => f(y.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: y.name === S ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: y.name === S ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold truncate", children: y.name }),
                        /* @__PURE__ */ t("div", { className: "text-[9px] mt-0.5", style: { color: y.status === "loaded" ? "var(--ok)" : "var(--warn)" }, children: y.status === "loaded" ? "config loaded" : "config unavailable" })
                      ]
                    },
                    y.name
                  )),
                  !e.length && /* @__PURE__ */ t("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No referenced profiles." })
                ] }),
                /* @__PURE__ */ t("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: O ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ t("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: O.name }),
                      /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: O.description || "No description declared." })
                    ] }),
                    u && /* @__PURE__ */ t(
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
                    /* @__PURE__ */ t(tt, { label: "Model", value: O.model || "auto / provider default" }),
                    /* @__PURE__ */ t(tt, { label: "Config source", value: O.sourcePath }),
                    /* @__PURE__ */ t(tt, { label: "Prompt", value: O.prompt ? O.prompt.startsWith("file://") ? O.prompt : "inline prompt" : void 0 })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Declared tools" }),
                    /* @__PURE__ */ t(Et, { values: O.tools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Auto-approved tools" }),
                    /* @__PURE__ */ t(Et, { values: O.allowedTools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Resources / skills" }),
                    /* @__PURE__ */ t(Et, { values: O.resources })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "MCP servers" }),
                    /* @__PURE__ */ t(Et, { values: O.mcpServers })
                  ] }),
                  $ && /* @__PURE__ */ a("details", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ t("summary", { className: "text-[11px] cursor-pointer", style: { color: "var(--accent)" }, children: "Prompt preview" }),
                    /* @__PURE__ */ t("pre", { className: "mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto", style: { color: "var(--muted)" }, children: $ })
                  ] }),
                  /* @__PURE__ */ t("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 28%, var(--border))" }, children: "These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access." })
                ] }) : /* @__PURE__ */ t("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select an agent template." }) })
              ] }) : /* @__PURE__ */ a(Fe, { children: [
                /* @__PURE__ */ a("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  r.map((y) => /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: () => x(y.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: y.name === g ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: y.name === g ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ t("div", { className: "text-[12px] font-semibold truncate", children: y.name }),
                        /* @__PURE__ */ a("div", { className: "text-[9px] mt-0.5 truncate", style: { color: "var(--muted)" }, children: [
                          "→ ",
                          y.kiroAgent || "profile not declared"
                        ] })
                      ]
                    },
                    y.name
                  )),
                  !r.length && /* @__PURE__ */ t("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No global crews found." })
                ] }),
                /* @__PURE__ */ t("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: A ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ t("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: A.name }),
                      /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: A.description || "No description declared." })
                    ] }),
                    c && /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => M({ mode: "update", crew: A }),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { color: "var(--accent)", border: "1px solid var(--border)" },
                        children: "Edit route"
                      }
                    ),
                    i && /* @__PURE__ */ t(
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
                    /* @__PURE__ */ t(tt, { label: "kiro_agent", value: A.kiroAgent }),
                    /* @__PURE__ */ t(tt, { label: "Workspace", value: A.workspace }),
                    /* @__PURE__ */ t(tt, { label: "Memory store", value: A.memoryStore }),
                    /* @__PURE__ */ t(tt, { label: "Model override", value: A.model }),
                    /* @__PURE__ */ t(tt, { label: "Source", value: A.source })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Selection triggers" }),
                    /* @__PURE__ */ t(Et, { values: A.triggers })
                  ] }),
                  A.kiroAgent && /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Authority profile" }),
                    /* @__PURE__ */ a("div", { className: "flex items-center gap-2 mt-1.5", children: [
                      /* @__PURE__ */ t("code", { className: "text-[12px]", style: { color: "var(--accent)" }, children: A.kiroAgent }),
                      /* @__PURE__ */ t("span", { className: "text-[10px]", style: { color: (D == null ? void 0 : D.status) === "loaded" ? "var(--ok)" : "var(--warn)" }, children: (D == null ? void 0 : D.status) === "loaded" ? "loaded" : "unavailable" }),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => {
                            f(A.kiroAgent || ""), h("agents");
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
        k && c && /* @__PURE__ */ t(
          wa,
          {
            profiles: e,
            initial: k.mode === "update" ? k.crew : void 0,
            onClose: () => M(null),
            onSave: async (y) => {
              await c(y), x(y.name), M(null);
            }
          }
        )
      ]
    }
  );
}
const Ar = Object.freeze([
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
]), Na = /^[A-Za-z0-9._-]{1,128}$/;
function Ve(e) {
  return typeof e == "string" && Na.test(e);
}
function Ye(e) {
  return typeof e == "string" && e.trim() ? e.trim() : void 0;
}
function Xt(e) {
  return Array.isArray(e) ? [...new Set(e.filter((r) => typeof r == "string" && r.trim()).map((r) => r.trim()))] : [];
}
function _a(e) {
  return !e || typeof e != "object" || Array.isArray(e) ? [] : Object.entries(e).filter(([r, n]) => Ve(r) && n && typeof n == "object" && !Array.isArray(n)).map(([r, n]) => ({
    name: r,
    kiroAgent: Ve(n.kiro_agent) ? n.kiro_agent : void 0,
    workspace: Ye(n.workspace),
    memoryStore: Ye(n.memory_store ?? n.memoryStore),
    model: Ye(n.model),
    description: Ye(n.description),
    triggers: Xt(n.triggers),
    source: Ye(n.source)
  })).sort((r, n) => r.name.localeCompare(n.name));
}
function Ca(e, r = Ar) {
  const n = [];
  for (const l of r)
    Ve(l) && !n.includes(l) && n.push(l);
  const s = (Array.isArray(e) ? e : []).map((l) => l == null ? void 0 : l.kiroAgent).filter(Ve).sort((l, d) => l.localeCompare(d));
  for (const l of s)
    n.includes(l) || n.push(l);
  return n;
}
function Sa(e, r, n = Ar) {
  if (!Ve(e)) return;
  if (n.includes(e)) return `~/.kiro/crew/apps/dlc-yolo/agents/${e}.json`;
  const s = [...new Set(
    (Array.isArray(r) ? r : []).filter((l) => (l == null ? void 0 : l.kiroAgent) === e).map((l) => l == null ? void 0 : l.source).filter(Ve)
  )];
  if (s.length === 1)
    return `~/.kiro/agents/${s[0]}--${e}.json`;
}
function tr(e, r, n) {
  const s = Ve(r) ? r : "unknown", l = !!e && typeof e == "object" && !Array.isArray(e), d = l && Ve(e.name) ? e.name : s, u = l && e.mcpServers && typeof e.mcpServers == "object" ? Object.keys(e.mcpServers).filter(Ve) : [];
  return {
    name: d,
    description: l ? Ye(e.description) : void 0,
    prompt: l ? Ye(e.prompt) : void 0,
    model: l ? Ye(e.model) : void 0,
    tools: l ? Xt(e.tools) : [],
    allowedTools: l ? Xt(e.allowedTools) : [],
    resources: l ? Xt(e.resources) : [],
    mcpServers: u,
    status: l ? "loaded" : "unavailable",
    sourcePath: Ye(n)
  };
}
function $a(e) {
  const r = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(e || "");
  return r == null ? void 0 : r[1];
}
function Ta(e, r) {
  if (!r || !Ve(r.name)) return { ...e };
  const n = $a(r.name);
  return {
    ...e,
    name: r.name,
    tools: [...r.tools || []],
    model: r.model || "auto",
    ...n ? { capability: n } : {}
  };
}
let rt = rr;
const xr = (e) => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
})[e], Yt = [
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
], jr = /* @__PURE__ */ new Set([
  "example-org/web-app",
  "example-org/dashboard",
  "example-org/api-core"
]), Ra = {
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
}, dt = ["manual", "assisted", "autonomous"], yt = ["quick", "standard", "deep"], Ot = { trust: "assisted", depth: "standard" }, Zt = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, Jt = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Ue({ color: e, children: r, title: n, onClick: s, active: l }) {
  return /* @__PURE__ */ t(
    "button",
    {
      type: "button",
      title: n,
      onClick: s,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: e,
        background: `color-mix(in srgb, ${e} 14%, transparent)`,
        boxShadow: l ? `inset 0 0 0 1px color-mix(in srgb, ${e} 55%, transparent)` : "none",
        opacity: s && !l ? 0.85 : 1,
        cursor: s ? "pointer" : "default"
      },
      children: r
    }
  );
}
const Kt = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Aa({ steps: e, cardsByStage: r, onNodeClick: n }) {
  const s = Ie(null), l = Ie(null), d = Ie(0), u = Ie(null), i = Ie(e), c = Ie(r), b = Ie([]);
  i.current = e, c.current = r;
  const h = 3, S = 116, f = S / h, g = f - 26, [x, k] = w(880);
  De(() => {
    const A = l.current;
    if (!A) return;
    const D = new ResizeObserver(($) => {
      const z = Math.max(360, Math.floor($[0].contentRect.width));
      k(z);
    });
    return D.observe(A), () => D.disconnect();
  }, []);
  const M = (A) => A.type === "gate" || A.id.startsWith("gate-");
  return De(() => {
    const A = s.current;
    if (!A) return;
    const D = Math.floor(x / h);
    A.width = D * h, A.height = f * h;
    const $ = A.getContext("2d");
    if (!$) return;
    const z = (J, T, he, ke, le) => {
      $.fillStyle = le, $.fillRect(J * h, T * h, he * h, ke * h);
    }, X = () => {
      const J = d.current, T = i.current, he = c.current, ke = Math.max(1, T.length);
      Math.max(1, ...T.map((Q) => {
        var P;
        return ((P = he[Q.id]) == null ? void 0 : P.length) || 0;
      })), z(0, 0, D, g, "#0f172a");
      for (let Q = 0; Q < D / 5; Q++) {
        const P = Q * 37 % D, ee = Q * 13 % (g - 4);
        Math.sin(J * 0.03 + Q * 2.1) > 0.35 && z(P, ee, 1, 1, "#e2e8f0");
      }
      z(D - 26, 8, 10, 10, "#fde68a"), z(D - 24, 7, 8, 8, "#0f172a");
      for (let Q = 0; Q < D; Q += 16)
        for (let P = g; P < f; P += 16)
          z(Q, P, 16, 16, Q / 16 + P / 16 & 1 ? "#33261a" : "#2a1f14");
      z(0, g - 2, D, 2, "#4a3520");
      const le = D / ke, ve = [];
      for (let Q = 0; Q < T.length; Q++) {
        const P = T[Q], ee = Math.round(le * (Q + 0.5)), Ae = (he[P.id] || []).length, Ce = Ae > 0, C = Kt[Q % Kt.length], F = M(P), ae = g - 2;
        if (ve.push({ x: ee - Math.floor(le / 2), w: Math.floor(le), id: P.id }), Q < T.length - 1) {
          const re = Math.round(le * (Q + 1.5));
          for (let ge = ee + 8; ge < re - 8; ge += 4) z(ge, g - 1, 2, 1, "#4a3520");
        }
        if (F) {
          const re = ae - 20, ge = Ce ? "#f39c12" : "#3a3222";
          z(ee - 3, re, 6, 20, Ce ? "#5c4a2a" : "#2a2418");
          for (let G = 0; G < 5; G++) z(ee - G, re - 5 + G, G * 2 + 1, 1, ge);
          for (let G = 0; G < 5; G++) z(ee - (4 - G), re - G, (4 - G) * 2 + 1, 1, ge);
          if (Ce) {
            const G = (Math.sin(J * 0.08) + 1) / 2;
            $.globalAlpha = 0.35 + G * 0.4, z(ee - 1, re - 6, 2, 2, "#ffd27a"), $.globalAlpha = 1;
          }
        } else {
          const re = ae - 14;
          if (z(ee - 10, re, 20, 3, "#7a5c47"), z(ee - 10, re - 1, 20, 1, C), z(ee - 9, re + 3, 2, 8, "#5c4033"), z(ee + 7, re + 3, 2, 8, "#5c4033"), z(ee - 5, re - 9, 10, 9, "#333"), z(ee - 4, re - 8, 8, 7, Ce ? "#0a2a0a" : "#1a1a1a"), Ce)
            for (let ge = 0; ge < 3; ge++) {
              const G = 2 + (J + ge * 7) % 5;
              z(ee - 3, re - 7 + ge * 2, G, 0.8, "#33ff33");
            }
        }
        const we = Math.min(Ae, 5);
        for (let re = 0; re < we; re++) {
          const ge = we > 1 ? (re - (we - 1) / 2) * 8 : 0, G = Math.round(ee + ge) - 3, Y = ae - (F ? 2 : 4), q = Kt[(Q + re) % Kt.length], ce = Math.sin(J * 0.08 + Q + re) > 0 ? 1 : 0;
          $.fillStyle = "rgba(0,0,0,0.18)", $.fillRect(G * h, (Y + 8) * h, 6 * h, h), z(G, Y + ce, 6, 6, q), z(G + 1, Y - 4 + ce, 4, 4, "#fdd"), z(G + 1, Y - 5 + ce, 4, 1, "#333"), (J + Q * 9 + re * 5) % 120 >= 3 && (z(G + 2, Y - 3 + ce, 1, 1, "#333"), z(G + 4, Y - 3 + ce, 1, 1, "#333")), z(G + 1, Y + 6, 1, 2, q), z(G + 4, Y + 6, 1, 2, q);
        }
        Ae > 5 && ($.fillStyle = C, $.font = `${3 * h}px monospace`, $.fillText(`+${Ae - 5}`, (ee + 10) * h, (ae - 6) * h)), Ae > 0 && ($.fillStyle = C, $.fillRect((ee + 6) * h, (ae - 30) * h, 9 * h, 9 * h), $.fillStyle = "#0f172a", $.font = `bold ${5 * h}px monospace`, $.textAlign = "center", $.fillText(String(Ae), (ee + 10.5) * h, (ae - 24) * h), $.textAlign = "left"), $.fillStyle = Ce ? "#e2e8f0" : "#6b7280", $.font = `${3.4 * h}px monospace`, $.textAlign = "center";
        const Oe = P.name.length > 12 ? P.name.slice(0, 11) + "…" : P.name;
        $.fillText(Oe, ee * h, (f - 4) * h), $.textAlign = "left";
      }
      b.current = ve;
      const Te = T.reduce((Q, P) => {
        var ee;
        return Q + (((ee = he[P.id]) == null ? void 0 : ee.length) || 0);
      }, 0);
      $.fillStyle = "#f90", $.font = `bold ${3.6 * h}px monospace`, $.fillText(`${Te} card${Te !== 1 ? "s" : ""} · ${ke} milestone${ke !== 1 ? "s" : ""}`, 4 * h, 8 * h);
    }, y = () => {
      d.current++, X(), u.current = requestAnimationFrame(y);
    };
    return u.current = requestAnimationFrame(y), () => {
      u.current && cancelAnimationFrame(u.current);
    };
  }, [x, f, g]), /* @__PURE__ */ t("div", { ref: l, className: "w-full mb-5", children: /* @__PURE__ */ t(
    "canvas",
    {
      ref: s,
      onClick: (A) => {
        const D = s.current;
        if (!D) return;
        const $ = D.getBoundingClientRect(), z = (A.clientX - $.left) / $.width * (D.width / h), X = b.current.find((y) => z >= y.x && z <= y.x + y.w);
        X && n(X.id);
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
function ja({ active: e, onChange: r, counts: n }) {
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
        const d = e === l.id, u = n[l.id];
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
              u > 0 && /* @__PURE__ */ t(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: d ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: d ? "var(--bg)" : "var(--muted)" },
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
function Pe({ title: e, children: r }) {
  return /* @__PURE__ */ a("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ t("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: e }),
    r
  ] });
}
function at({ rows: e, empty: r = "None recorded" }) {
  return e.length ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: e.map((n) => /* @__PURE__ */ a("div", { className: "rounded-md px-2 py-1.5", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)" }, children: [
    /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-[11px]", children: [
      /* @__PURE__ */ t("span", { className: "font-medium min-w-0 break-words", style: { color: "var(--text)" }, children: n.title }),
      /* @__PURE__ */ a("span", { className: "ml-auto flex gap-1 flex-shrink-0", children: [
        n.level && /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: n.level === "required" ? "var(--warn)" : "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: n.level }),
        n.status && /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: /fail|block|open|pending/i.test(n.status) ? "var(--warn)" : "var(--ok)", background: "var(--bg-hover, var(--border))" }, children: n.status })
      ] })
    ] }),
    n.detail && /* @__PURE__ */ t("div", { className: "mt-0.5 text-[10px] break-words", style: { color: "var(--muted)" }, children: n.detail }),
    n.ref && (n.url ? /* @__PURE__ */ t("a", { href: n.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: n.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: n.ref }))
  ] }, n.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: r });
}
function _e({ label: e, value: r, status: n }) {
  return /* @__PURE__ */ a("div", { className: "min-w-0", children: [
    /* @__PURE__ */ t("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-0.5 break-words", style: { color: nt(r) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      nt(r),
      n && /* @__PURE__ */ a("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        nt(n),
        ")"
      ] })
    ] })
  ] });
}
function Ea({ card: e, inspection: r, producerSession: n, onClose: s, onOpenProducer: l, onApprove: d, onReject: u, onInterject: i }) {
  const c = r.routing, b = () => {
    const h = window.prompt(`Why reject revision ${r.revision ?? "unknown"}?`);
    h != null && h.trim() && u && (u(h.trim()), s());
  };
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (h) => {
        h.currentTarget === h.target && s();
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
                /* @__PURE__ */ t("div", { className: "text-[11px] font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)" }, children: r.ready ? "Bundle is structurally ready for review" : `${r.missing.length} readiness gap${r.missing.length === 1 ? "" : "s"}` }),
                !r.ready && /* @__PURE__ */ t("ul", { className: "mt-1.5 pl-4 list-disc text-[10px] space-y-0.5", style: { color: "var(--muted)" }, children: r.missing.map((h) => /* @__PURE__ */ t("li", { children: h }, h)) }),
                r.preferredShortfalls.length > 0 && /* @__PURE__ */ a("div", { className: "mt-2 text-[10px]", style: { color: "var(--muted)" }, children: [
                  "Preferred shortfalls (non-blocking): ",
                  r.preferredShortfalls.join(" · ")
                ] }),
                /* @__PURE__ */ t("div", { className: "text-[9px] mt-2", style: { color: "var(--muted)" }, children: "Inspection is read-only; deterministic runtime remains authoritative for movement and readiness enforcement." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ a(Pe, { title: "Result summary", children: [
                  /* @__PURE__ */ t("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: r.summary ? "var(--text)" : "var(--warn)" }, children: r.summary || "No result summary was published." }),
                  /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ t(_e, { label: "Envelope", value: r.envelopeId }),
                    /* @__PURE__ */ t(_e, { label: "Created", value: r.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ t(Pe, { title: "Changes since prior revision", children: /* @__PURE__ */ t(at, { rows: r.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ t(Pe, { title: "Artifacts and evidence references", children: r.artifacts.length ? /* @__PURE__ */ t("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: r.artifacts.map((h) => /* @__PURE__ */ a("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ t("span", { className: "font-medium", style: { color: "var(--text)" }, children: h.label }),
                  h.kind && /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: h.kind })
                ] }),
                h.preview && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: h.preview }),
                h.ref && (h.url ? /* @__PURE__ */ t("a", { href: h.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: h.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: h.ref }))
              ] }, h.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Pe, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ t(at, { rows: r.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ t(Pe, { title: "Research and citations", children: /* @__PURE__ */ t(at, { rows: r.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Pe, { title: "Intent and requirement coverage", children: /* @__PURE__ */ t(at, { rows: r.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ t(Pe, { title: "Omissions and deviations", children: /* @__PURE__ */ t(at, { rows: r.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ a(Pe, { title: "Card topology and integration", children: [
                /* @__PURE__ */ a("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ t(_e, { label: "Action", value: r.topology.action }),
                  /* @__PURE__ */ t(_e, { label: "Integration owner", value: r.topology.integrationOwner }),
                  /* @__PURE__ */ t(_e, { label: "Integration status", value: r.topology.integrationStatus }),
                  /* @__PURE__ */ t(_e, { label: "Required children incomplete", value: r.topology.incompleteRequiredChildren.length })
                ] }),
                r.topology.children.length > 0 ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: r.topology.children.map((h) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: h.label }),
                  /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: h.required ? "var(--warn)" : "var(--muted)" }, children: h.required ? "required" : "optional" }),
                  /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(h.status) ? "var(--ok)" : "var(--warn)" }, children: h.status })
                ] }, h.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(Pe, { title: "Budget consumption", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ t(_e, { label: "Allocated", value: r.budget.allocated }),
                  /* @__PURE__ */ t(_e, { label: "Consumed", value: r.budget.consumed }),
                  /* @__PURE__ */ t(_e, { label: "Remaining", value: r.budget.remaining })
                ] }) }),
                /* @__PURE__ */ t(Pe, { title: "Routing and runtime provenance", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ t(_e, { label: "Assigned profile", value: c.assignedProfile }),
                  /* @__PURE__ */ t(_e, { label: "Effective profile", value: c.effectiveProfile }),
                  /* @__PURE__ */ t(_e, { label: "Model requested", value: c.model.requested }),
                  /* @__PURE__ */ t(_e, { label: "Model applied", value: c.model.applied, status: c.model.status }),
                  /* @__PURE__ */ t(_e, { label: "Provider / version", value: c.model.provider || c.model.version ? [c.model.provider, c.model.version].filter(Boolean) : null }),
                  /* @__PURE__ */ t(_e, { label: "Effort requested", value: c.effort.requested }),
                  /* @__PURE__ */ t(_e, { label: "Effort applied", value: c.effort.applied, status: c.effort.status }),
                  /* @__PURE__ */ t(_e, { label: "Tools available", value: c.tools.actual, status: c.tools.status }),
                  /* @__PURE__ */ t(_e, { label: "Skills available", value: c.skills.actual, status: c.skills.status }),
                  /* @__PURE__ */ t(_e, { label: "Network scope", value: c.network.actual, status: c.network.status }),
                  /* @__PURE__ */ t(_e, { label: "Write scope", value: c.write.actual, status: c.write.status }),
                  /* @__PURE__ */ t(_e, { label: "Worktree / branch", value: c.worktree })
                ] }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ t(Pe, { title: "Validation and evidence", children: /* @__PURE__ */ t(at, { rows: r.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ t(Pe, { title: "Known risks", children: /* @__PURE__ */ t(at, { rows: r.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ t(Pe, { title: "Open decisions and questions", children: /* @__PURE__ */ t(at, { rows: r.decisions, empty: "No open decisions recorded" }) })
              ] })
            ] }),
            /* @__PURE__ */ a("footer", { className: "px-5 py-3 flex items-center gap-2 flex-wrap", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              d && /* @__PURE__ */ a("button", { onClick: () => {
                d(), s();
              }, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--ok)", color: "var(--bg)" }, children: [
                "Approve",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              u && /* @__PURE__ */ a("button", { onClick: b, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--danger)", color: "var(--bg)" }, children: [
                "Reject",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              i && /* @__PURE__ */ t("button", { onClick: i, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: "Interject on this revision" }),
              n && l && /* @__PURE__ */ a("button", { onClick: l, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: [
                "Open producer · ",
                n.step
              ] }),
              /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: r.producerSessionRef || "producer session reference unobservable" })
            ] })
          ]
        }
      )
    }
  );
}
function Oa({ card: e, openChat: r }) {
  const n = e.bootstrap, s = e.intent_contract || e.intent;
  if (!n && !s) return null;
  const l = `pipeline ${e.pipeline_id || ""} card ${e.id} (${e.title})`, d = (b, h) => /* @__PURE__ */ t(
    "button",
    {
      className: "text-[10px] px-2 py-0.5 rounded hover:opacity-80",
      style: { color: "var(--accent)", border: "1px solid var(--border)" },
      title: "Opens /dlc-yolo with this context — nothing is created in the browser",
      onClick: () => r({ message: `/dlc-yolo ${b} for ${l}` }),
      children: h
    }
  ), u = n ? String(n.status || "not-run") : "n/a", i = Array.isArray(n == null ? void 0 : n.crews_created) ? n.crews_created : [], c = Array.isArray(n == null ? void 0 : n.issues_opened) ? n.issues_opened : [];
  return /* @__PURE__ */ a("div", { className: "mt-2 pt-2", style: { borderTop: "1px dashed var(--border)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: "🌱 self-enablement" }),
    /* @__PURE__ */ a("div", { className: "flex flex-col gap-1 text-[10px]", children: [
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "① setup" }),
        /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: String(e.self_enable_mode || "default") })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "② intent" }),
        /* @__PURE__ */ t("span", { style: { color: "var(--muted)" }, children: s ? String(s.classification || s.status || "present") : "not run" }),
        d("resolve intent", "Resolve intent"),
        d("skip intent", "Skip intent")
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "③ per-step" }),
        d(`elaborate step ${e.stage}`, "Elaborate step")
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: "④ bootstrap" }),
        /* @__PURE__ */ t("span", { style: { color: u === "done" ? "var(--ok)" : "var(--muted)" }, children: u }),
        i.length > 0 && /* @__PURE__ */ a("span", { style: { color: "var(--muted)" }, children: [
          "· crews ",
          i.length
        ] }),
        c.length > 0 && /* @__PURE__ */ a("span", { style: { color: "var(--muted)" }, children: [
          "· issues ",
          c.length
        ] }),
        n != null && n.blocking_reason ? /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
          "· ",
          String(n.blocking_reason)
        ] }) : null,
        d("resume bootstrap", "Resume bootstrap")
      ] }),
      u === "done" && /* @__PURE__ */ t("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "Replaying bootstrap is idempotent intent, not a promise." })
    ] })
  ] });
}
function qa({ cards: e, schedulerState: r, statePath: n, readAppFile: s, onClose: l }) {
  const d = $e(() => ka(e, r), [e, r]), [u, i] = w(Ht(null)), [c, b] = w([]), [h, S] = w([]);
  De(() => {
    const x = `${n.replace(/\/state\.json$/, "")}/workspaces/default/data/ledger/projections/status.json`;
    let k = !1;
    return s(x).then((M) => {
      if (!k)
        try {
          i(Ht(JSON.parse(M.content || "null")));
        } catch {
          i(Ht(null));
        }
    }).catch(() => {
      k || i(Ht(null));
    }), () => {
      k = !0;
    };
  }, [n, s]), De(() => {
    const g = [], x = [];
    for (const k of e) {
      const M = k.step_sessions;
      if (M) for (const [A, D] of Object.entries(M)) g.push({ card: k.id, step: A, slot: D == null ? void 0 : D.slot_key });
      const O = k.worktree_lease;
      O && x.push({ card: k.id, branch: O.branch, status: O.status });
    }
    b(g.slice(0, 60)), S(x.slice(0, 60));
  }, [e]);
  const f = ({ title: g, children: x }) => /* @__PURE__ */ a("div", { className: "mb-4", children: [
    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: g }),
    x
  ] });
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
      onMouseDown: (g) => {
        g.currentTarget === g.target && l();
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
              /* @__PURE__ */ a(f, { title: "Runtime / scheduler", children: [
                /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-2", children: Rr.map((g) => /* @__PURE__ */ a("span", { className: "px-2 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: d.counts[g] ? "var(--text)" : "var(--muted)" }, children: [
                  g,
                  " ",
                  d.counts[g]
                ] }, g)) }),
                d.waitReasons.length > 0 && /* @__PURE__ */ t("div", { className: "mt-2", children: d.waitReasons.map((g, x) => /* @__PURE__ */ a("div", { style: { color: "var(--muted)" }, children: [
                  "⛔ ",
                  g.card,
                  ": ",
                  g.reason
                ] }, x)) })
              ] }),
              /* @__PURE__ */ t(f, { title: "Projection parity", children: u.available ? /* @__PURE__ */ a("div", { children: [
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
                /* @__PURE__ */ t("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "last-known-good runs.json preserved when blocked" })
              ] }) : /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: "unavailable" }) }),
              /* @__PURE__ */ t(f, { title: "Webhook", children: /* @__PURE__ */ t(Cr, {}) }),
              /* @__PURE__ */ a(f, { title: "Sessions & worktrees", children: [
                /* @__PURE__ */ a("div", { className: "mb-1", style: { color: "var(--muted)" }, children: [
                  c.length,
                  " session(s) · ",
                  h.length,
                  " lease(s)"
                ] }),
                c.slice(0, 12).map((g, x) => /* @__PURE__ */ a("div", { style: { color: "var(--text)" }, children: [
                  g.card,
                  " · ",
                  g.step,
                  g.slot ? ` · ${g.slot}` : ""
                ] }, x)),
                h.slice(0, 12).map((g, x) => /* @__PURE__ */ a("div", { style: { color: "var(--muted)" }, children: [
                  "🌿 ",
                  g.card,
                  " · ",
                  g.branch || "—",
                  " · ",
                  g.status || "—"
                ] }, `l${x}`))
              ] })
            ] })
          ]
        }
      )
    }
  );
}
function me(e, r) {
  return r == null || r === "" ? null : /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px] py-0.5", children: [
    /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: "var(--muted)", minWidth: "110px" }, children: e }),
    /* @__PURE__ */ t("span", { className: "min-w-0 break-words", style: { color: "var(--text)" }, children: String(r) })
  ] });
}
function fr(e) {
  return typeof e == "string" && /^https?:\/\//i.test(e);
}
function La({ card: e, cardStatus: r, effectiveCapability: n, onClose: s }) {
  var S, f, g;
  const [l, d] = w("overview"), u = [
    ["overview", "Overview"],
    ["results", "Results"],
    ["history", "Decisions & history"],
    ["execution", "Execution"]
  ], i = e.execution_schedule, c = i != null && i.current_node_id ? (S = i == null ? void 0 : i.nodes) == null ? void 0 : S[i.current_node_id] : void 0, b = e.worktree_lease, h = e.topology;
  return /* @__PURE__ */ t(
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
                /* @__PURE__ */ t("div", { className: "text-[14px] font-semibold truncate", style: { color: "var(--text-strong, var(--text))" }, children: e.title }),
                /* @__PURE__ */ a("div", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: [
                  e.stage,
                  " · ",
                  r.label
                ] })
              ] }),
              /* @__PURE__ */ t("button", { onClick: s, className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
            ] }),
            /* @__PURE__ */ t("nav", { className: "flex gap-1 px-3 pt-2", style: { borderBottom: "1px solid var(--border)" }, children: u.map(([x, k]) => /* @__PURE__ */ t(
              "button",
              {
                onClick: () => d(x),
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
                (f = e.source) != null && f.url && fr(e.source.url) ? me("source", null) || /* @__PURE__ */ a("div", { className: "text-[11px] py-0.5", children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--muted)", minWidth: 110, display: "inline-block" }, children: "source" }),
                  /* @__PURE__ */ a("a", { href: e.source.url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: [
                    e.source.repo,
                    e.source.issue ? `#${e.source.issue}` : ""
                  ] })
                ] }) : me("source", (g = e.source) == null ? void 0 : g.repo),
                me("pipeline", e.pipeline_id),
                me("workspace", e.workspace),
                me("stage", e.stage),
                me("lifecycle", e.lifecycle),
                me("SoT", e.sot),
                me("status", `${r.label}${r.reason ? ` — ${r.reason}` : ""}`),
                me("trust", e.trust ? `${e.trust} (override)` : "inherited"),
                me("depth", e.depth ? `${e.depth} (override)` : "inherited"),
                me("capability", n),
                me("effort", e.effort ? JSON.stringify(e.effort) : null),
                me("writes_allowed", e.writes_allowed === !1 ? "false (cancel requested)" : null)
              ] }),
              l === "results" && /* @__PURE__ */ a("div", { children: [
                Object.entries(e.step_summaries || {}).map(([x, k]) => /* @__PURE__ */ a("div", { className: "mb-2", children: [
                  /* @__PURE__ */ a("div", { className: "font-medium", style: { color: "var(--text)" }, children: [
                    x,
                    ": ",
                    (k == null ? void 0 : k.headline) || "—"
                  ] }),
                  (k == null ? void 0 : k.description) && /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: k.description }),
                  (k == null ? void 0 : k.executor) && /* @__PURE__ */ a("div", { className: "text-[9px]", style: { color: "var(--muted)" }, children: [
                    "executor ",
                    k.executor
                  ] })
                ] }, x)),
                Object.entries(e.artifacts || {}).map(([x, k]) => /* @__PURE__ */ t("div", { className: "py-0.5", children: fr(k) ? /* @__PURE__ */ t("a", { href: k, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: x }) : /* @__PURE__ */ a("span", { style: { color: "var(--text)" }, children: [
                  x,
                  ": ",
                  /* @__PURE__ */ t("code", { style: { color: "var(--muted)" }, children: String(k) })
                ] }) }, x)),
                !e.step_summaries && !e.artifacts && /* @__PURE__ */ t("div", { style: { color: "var(--muted)" }, children: "No results recorded." })
              ] }),
              l === "history" && /* @__PURE__ */ a("div", { children: [
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-1 mb-1", style: { color: "var(--muted)" }, children: "Decisions" }),
                (e.decisions || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--text)" }, children: [
                  String(x.status) === "open" ? "🔴 " : "✓ ",
                  String(x.kind),
                  " — ",
                  String(x.question || x.chosen || x.action || "")
                ] }, k)),
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Stage history" }),
                (e.history || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                  String(x.from),
                  " → ",
                  String(x.to),
                  " · ",
                  String(x.agent || ""),
                  " · ",
                  String(x.at || "")
                ] }, k)),
                (e.gate_history || []).length > 0 && /* @__PURE__ */ a(Fe, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Gates" }),
                  (e.gate_history || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.decision),
                    " ",
                    String(x.gate),
                    " · ",
                    String(x.actor || "")
                  ] }, k))
                ] }),
                (e.interjection || []).length > 0 && /* @__PURE__ */ a(Fe, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Requests / interjections" }),
                  (e.interjection || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.kind),
                    " · ",
                    String(x.status),
                    x.reason ? ` (${String(x.reason)})` : ""
                  ] }, k))
                ] })
              ] }),
              l === "execution" && /* @__PURE__ */ a("div", { children: [
                me("current node", i == null ? void 0 : i.current_node_id),
                me("node status", c == null ? void 0 : c.status),
                me("permit", c == null ? void 0 : c.permit_id),
                me("concurrency class", c == null ? void 0 : c.concurrency_class),
                me("model (requested)", e.model_request),
                me("model (applied)", e.model_applied),
                h && /* @__PURE__ */ a(Fe, { children: [
                  me("topology", h.action),
                  me("integration owner", h.integration_owner),
                  me("children", Array.isArray(h.children) ? `${h.children.length}` : null)
                ] }),
                b && /* @__PURE__ */ a(Fe, { children: [
                  me("worktree branch", b.branch),
                  me("lease status", b.status),
                  me("lease locked", b.locked ? "true" : null)
                ] }),
                me("cancel requested", e.cancel_requested_at),
                e.writes_allowed === !1 && me("terminal observed", "pending (cooperative cancel in progress)")
              ] })
            ] }),
            /* @__PURE__ */ t("footer", { className: "px-5 py-2 text-[9px]", style: { borderTop: "1px solid var(--border)", color: "var(--muted)" }, children: "Read-only view. Use 🔧 maintain to request changes; gate actions use the gate controls." })
          ]
        }
      )
    }
  );
}
function Ia({ onRequest: e }) {
  const [r, n] = w(!1), s = (l) => {
    const d = nr[l];
    let u = "";
    if (d.reasonRequired) {
      const i = window.prompt(d.confirm);
      if (!i || !i.trim()) return;
      u = i.trim();
    } else if (!window.confirm(d.confirm))
      return;
    e(l, u), n(!1);
  };
  return /* @__PURE__ */ a("div", { className: "relative inline-block", children: [
    /* @__PURE__ */ t(
      "button",
      {
        className: "text-[10px] hover:underline",
        style: { color: "var(--muted)" },
        title: "Request re-spec / retry / back-step / park / cancel",
        onClick: () => n((l) => !l),
        children: "🔧 maintain"
      }
    ),
    r && /* @__PURE__ */ t(
      "div",
      {
        className: "absolute z-20 mt-1 rounded-md py-1 text-[11px]",
        style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 8px 28px rgba(0,0,0,0.4)", minWidth: "120px" },
        children: Object.entries(nr).map(([l, d]) => /* @__PURE__ */ t(
          "button",
          {
            className: "block w-full text-left px-3 py-1 hover:opacity-80",
            style: { color: l === "request:cancel" ? "var(--danger, #e66)" : "var(--text)" },
            onClick: () => s(l),
            children: d.label
          },
          l
        ))
      }
    )
  ] });
}
function Ma({ card: e, decision: r, onClose: n, onResolve: s }) {
  var c, b, h;
  const l = r.options || [], d = ((c = l.find((S) => S.recommended === !0)) == null ? void 0 : c.id) || ((b = l.find((S) => S.id && (r.rationale || "").toLowerCase().includes((S.id + ")").toLowerCase()))) == null ? void 0 : b.id) || ((h = l[0]) == null ? void 0 : h.id), [u, i] = w(d || "");
  return /* @__PURE__ */ t(
    "div",
    {
      className: "fixed inset-0 z-[72] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (S) => {
        S.currentTarget === S.target && n();
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
                  onClick: n,
                  "aria-label": "Close decision",
                  className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                  style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ a("div", { className: "overflow-y-auto p-4 flex flex-col gap-2", children: [
              l.map((S, f) => {
                const g = S.id || String.fromCharCode(65 + f), x = u === (S.id || g), k = (S.id || g) === d;
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
                          onChange: () => i(S.id || g)
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ a("div", { className: "text-[12px] font-semibold flex items-center gap-1.5", style: { color: "var(--text-strong, var(--text))" }, children: [
                          "Option ",
                          g,
                          k && /* @__PURE__ */ t("span", { className: "text-[10px] font-normal", style: { color: "var(--accent)" }, children: "⭐ recommended" })
                        ] }),
                        /* @__PURE__ */ t("div", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: S.note }),
                        S.risk && /* @__PURE__ */ a("div", { className: "text-[10px] mt-0.5", style: { color: "var(--warn, var(--muted))" }, children: [
                          "risk: ",
                          S.risk
                        ] })
                      ] })
                    ]
                  },
                  g
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
                  onClick: n,
                  className: "text-[12px] px-3 py-1.5 rounded-md",
                  style: { color: "var(--muted)", border: "1px solid var(--border)" },
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  disabled: !u,
                  onClick: () => {
                    u && (s(u), n());
                  },
                  className: "text-[12px] px-3 py-1.5 rounded-md font-semibold",
                  style: { background: u ? "var(--accent)" : "var(--border)", color: u ? "var(--bg)" : "var(--muted)", cursor: u ? "pointer" : "not-allowed" },
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
function xt({ card: e, config: r, isGate: n, cardStatus: s, effectiveCapability: l, producerStep: d, producerSession: u, onOpenProducer: i, onApprove: c, onReject: b, onCycleTrust: h, onCycleDepth: S, onSetBudget: f, onInterject: g, onResolveDecision: x, onOpenOrchestrator: k, liveView: M, allCards: O, onOpenCard: A, onRequest: D, onOpenStepSession: $, onCancelCard: z }) {
  var Be, ot, ne, pt, ue, ze, st;
  const X = n ? "var(--warn)" : s.kind === "idle" ? "var(--border-strong, var(--border))" : s.color, y = e.trust || r.trust, J = e.depth || r.depth, T = ((Be = e.parked) == null ? void 0 : Be.length) || 0, he = Object.values(e.step_sessions || {}).some(
    (N) => !!N.last_response_at && !N.chat_disabled_at && !N.superseded && (!N.last_response_handled_at || N.last_response_handled_at < N.last_response_at)
  ), [ke, le] = w(!1), [ve, Te] = w(""), [Q, P] = w(!1), [ee, Re] = w(null), [Ae, Ce] = w(!1), [C, F] = w(!1), { openChat: ae } = kr(), we = $e(() => ia(e), [e]), Oe = $e(() => da(e, O || []), [e, O]), re = $e(() => pa(e), [e]), ge = $e(() => {
    if (!re) return null;
    const N = (O || []).find((I) => I.id === re);
    return N ? { id: N.id, title: N.title } : null;
  }, [re, O]), G = we.length > 0 || Oe.length > 0 || !!ge, Y = $e(
    () => n ? Xr(e, d) : null,
    [e, n, d]
  ), q = () => {
    const N = window.prompt(`Why reject revision ${(Y == null ? void 0 : Y.revision) ?? "unknown"}?`);
    N != null && N.trim() && b && b(N.trim());
  }, ce = (e.decisions || []).filter((N) => !N.chosen && !N.resolved_at && (!!N.action || !!N.options));
  return /* @__PURE__ */ a(
    "div",
    {
      id: `card-${e.id}`,
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${X}`
      },
      children: [
        (() => {
          const N = ($ || []).find((I) => I.step === e.stage);
          return N ? /* @__PURE__ */ a(
            "button",
            {
              onClick: () => N.open(),
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
        ((ot = e.source) == null ? void 0 : ot.repo) && /* @__PURE__ */ a(
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
          var I;
          const N = (I = e.step_summaries) == null ? void 0 : I[e.stage];
          return N != null && N.headline ? /* @__PURE__ */ a("div", { className: "mt-1 flex items-start gap-1 text-[11px] leading-snug", title: N.description || N.headline, children: [
            N.needs_human ? /* @__PURE__ */ t("span", { "aria-label": "needs you", title: "Needs you", style: { color: "var(--warn)" }, children: "🔴" }) : /* @__PURE__ */ t("span", { "aria-hidden": "true", style: { color: "var(--muted)" }, children: "•" }),
            /* @__PURE__ */ t("span", { className: "truncate", style: { color: N.needs_human ? "var(--warn)" : "var(--text)" }, children: N.headline })
          ] }) : null;
        })(),
        /* @__PURE__ */ a("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "⚙ modes" }),
          /* @__PURE__ */ a(
            Ue,
            {
              color: Zt[y],
              active: !!e.trust,
              onClick: h,
              title: `trust: ${y}${e.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🛡 ",
                y
              ]
            }
          ),
          /* @__PURE__ */ a(
            Ue,
            {
              color: Jt[J],
              active: !!e.depth,
              onClick: S,
              title: `depth: ${J}${e.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: [
                "🔬 ",
                J
              ]
            }
          ),
          /* @__PURE__ */ a(
            Ue,
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
            /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: "var(--muted)" }, children: "💰" }),
            /* @__PURE__ */ t(na, { budget: e.budget, depth: J, onSave: f })
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
                Ue,
                {
                  color: s.color,
                  active: s.kind !== "idle",
                  title: `${s.label}${s.reason ? ` — ${s.reason}` : ""}`,
                  children: s.label
                }
              ),
              /* @__PURE__ */ a(
                Ue,
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
              e.lifecycle && /* @__PURE__ */ a(Ue, { color: "var(--muted)", title: `card lifecycle: ${e.lifecycle}`, children: [
                "🔄 ",
                e.lifecycle
              ] }),
              T > 0 && /* @__PURE__ */ a(Ue, { color: "var(--warn)", title: `${T} parked idea(s)`, children: [
                "⏸ ",
                T
              ] }),
              he && /* @__PURE__ */ t(Ue, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
              typeof ((ne = e.effort) == null ? void 0 : ne.total) == "number" && e.effort.total > 0 && /* @__PURE__ */ a(Ue, { color: "var(--info)", title: `estimated effort: ${e.effort.total} points`, children: [
                "⚡ ",
                e.effort.total
              ] }),
              e.backstep_history && e.backstep_history.length > 0 && /* @__PURE__ */ a(
                Ue,
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
                const N = e.decisions[e.decisions.length - 1];
                return /* @__PURE__ */ a(
                  Ue,
                  {
                    color: "var(--accent)",
                    title: `${e.decisions.length} decision${e.decisions.length === 1 ? "" : "s"} — last: ${N.question || N.kind || ""}${N.action ? ` → ${N.action}` : ""}${N.rationale ? `
${N.rationale}` : ""}`,
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
        n && Y && /* @__PURE__ */ a(
          "div",
          {
            "data-gate-inspection-summary": !0,
            className: "mt-2.5 rounded-md p-2",
            style: { background: Y.ready ? "color-mix(in srgb, var(--ok) 7%, transparent)" : "color-mix(in srgb, var(--warn) 7%, transparent)", border: `1px solid color-mix(in srgb, ${Y.ready ? "var(--ok)" : "var(--warn)"} 32%, var(--border))` },
            children: [
              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
                /* @__PURE__ */ t("span", { className: "font-semibold", style: { color: Y.ready ? "var(--ok)" : "var(--warn)" }, children: Y.ready ? "Review-ready" : "Not review-ready" }),
                /* @__PURE__ */ a("span", { className: "ml-auto", style: { color: "var(--muted)" }, children: [
                  "r",
                  Y.revision ?? "?"
                ] }),
                /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: Y.reviewStatus })
              ] }),
              /* @__PURE__ */ t("div", { className: "mt-1 text-[11px] leading-snug overflow-hidden", style: { color: Y.summary ? "var(--text)" : "var(--warn)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: Y.summary || "No review bundle summary published." }),
              !Y.ready && /* @__PURE__ */ a("div", { className: "mt-1 text-[9px]", style: { color: "var(--muted)" }, children: [
                Y.missing.length,
                " readiness gap",
                Y.missing.length === 1 ? "" : "s"
              ] }),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  onClick: () => P(!0),
                  className: "mt-1.5 text-[10px] font-semibold hover:underline",
                  style: { color: "var(--accent)" },
                  children: "Inspect result bundle →"
                }
              )
            ]
          }
        ),
        n && c && b && /* @__PURE__ */ a("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          (() => {
            const N = (e.gate_commands || []).filter((qe) => qe.gate === e.stage), I = N.length ? N[N.length - 1] : void 0, be = (I == null ? void 0 : I.status) === "pending", Se = (I == null ? void 0 : I.status) === "rejected", Ne = (I == null ? void 0 : I.status) === "applied" || (I == null ? void 0 : I.status) === "approved";
            return /* @__PURE__ */ a(Fe, { children: [
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: be,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--ok)", color: "var(--bg)" },
                  onClick: c,
                  title: be ? "A gate command is being processed…" : "Approve this gate",
                  children: [
                    be && (I == null ? void 0 : I.action) === "approve" && /* @__PURE__ */ t(kt, { size: 10 }),
                    be && (I == null ? void 0 : I.action) === "approve" ? "Approving…" : "✓ Approve"
                  ]
                }
              ),
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: be,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--danger)", color: "var(--bg)" },
                  onClick: q,
                  children: [
                    be && (I == null ? void 0 : I.action) === "reject" && /* @__PURE__ */ t(kt, { size: 10 }),
                    be && (I == null ? void 0 : I.action) === "reject" ? "Rejecting…" : "✕ Reject"
                  ]
                }
              ),
              be && /* @__PURE__ */ a("span", { className: "text-[10px] inline-flex items-center gap-1", style: { color: "var(--muted)" }, children: [
                /* @__PURE__ */ t(kt, { size: 10 }),
                " ",
                I == null ? void 0 : I.action,
                " sent — runtime processing…"
              ] }),
              Se && /* @__PURE__ */ a(
                "span",
                {
                  className: "text-[10px]",
                  style: { color: "var(--danger)" },
                  title: (I == null ? void 0 : I.rejection_reason) || "rejected",
                  children: [
                    "⚠ ",
                    I == null ? void 0 : I.action,
                    " rejected: ",
                    (I == null ? void 0 : I.rejection_reason) || "see gate result"
                  ]
                }
              ),
              Ne && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--ok)" }, children: [
                "✓ ",
                I == null ? void 0 : I.action,
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
                /* @__PURE__ */ t("span", { "aria-hidden": "true", children: "↗" }),
                "Open producer · ",
                u.step
              ]
            }
          ),
          (e.stage === "gate-review" || /review/i.test(e.stage || "")) && (() => {
            var Ne, qe, Ee;
            const N = (Ne = e.source) == null ? void 0 : Ne.repo;
            if (!N) return null;
            const I = (qe = e.artifacts) == null ? void 0 : qe.pr_url, be = I && ((Ee = /\/pull\/(\d+)/.exec(I)) == null ? void 0 : Ee[1]), Se = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + N)}` + (be ? `&pr=${be}` : "");
            return /* @__PURE__ */ a(
              "a",
              {
                href: Se,
                title: I ? `Deep-review PR #${be} in Code Review Sage` : `Open Code Review Sage for ${N}`,
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
          const N = e.block_reason || {}, I = new Set(ce.map((Se) => Se.step).filter(Boolean)), be = Object.entries(N).filter(([Se]) => !I.has(Se));
          return be.length ? be.map(([Se, Ne]) => /* @__PURE__ */ a(
            "div",
            {
              className: "mt-2 p-2 rounded-md text-[11px]",
              style: { background: "color-mix(in srgb, var(--danger, #e66) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--danger, #e66) 35%, var(--border))" },
              children: [
                /* @__PURE__ */ a("div", { className: "font-semibold", style: { color: "var(--danger, #e66)" }, children: [
                  "⏸ Blocked · ",
                  Se
                ] }),
                /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: Ne }),
                g && /* @__PURE__ */ t(
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
        x && ce.map((N) => {
          var Ne, qe;
          const I = N.step && ((Ne = e.block_reason) != null && Ne[N.step]) ? N.step : Object.keys(e.block_reason || {})[0], be = I ? (qe = e.block_reason) == null ? void 0 : qe[I] : void 0, Se = N.options || [];
          return /* @__PURE__ */ a(
            "div",
            {
              className: "mt-2 p-2 rounded-md text-[11px]",
              style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
              children: [
                /* @__PURE__ */ a("div", { className: "font-semibold", style: { color: "var(--text, var(--muted))" }, children: [
                  "⚖ Decision needed",
                  N.step ? ` · ${N.step}` : "",
                  N.confidence ? ` · confidence ${N.confidence}` : ""
                ] }),
                /* @__PURE__ */ t("div", { className: "mt-1", style: { color: "var(--text, var(--muted))" }, children: N.question || N.kind }),
                be && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: be }),
                Se.length > 0 && /* @__PURE__ */ t("div", { className: "mt-1.5 flex flex-col gap-1", children: Se.map((Ee, Je) => {
                  const de = Ee.id || String.fromCharCode(65 + Je), Qe = Ee.recommended === !0 || N.chosen === Ee.id || (N.rationale || "").toLowerCase().includes((Ee.id || "").toLowerCase() + ")");
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
                            title: `Resolve this decision by selecting option ${de} — the step resumes on this branch`,
                            onClick: () => x(N.id, Ee.id || de),
                            children: [
                              "Choose ",
                              de
                            ]
                          }
                        ),
                        /* @__PURE__ */ a("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
                          Ee.note,
                          Ee.risk ? ` · risk: ${Ee.risk}` : "",
                          Qe ? "  ⭐ recommended" : ""
                        ] })
                      ]
                    },
                    de
                  );
                }) }),
                N.rationale && /* @__PURE__ */ a("div", { className: "mt-1 text-[10px] italic", style: { color: "var(--muted)" }, children: [
                  "Agent rationale: ",
                  N.rationale
                ] }),
                /* @__PURE__ */ a("div", { className: "mt-1.5 flex items-center gap-2", children: [
                  Se.length > 0 && /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded font-semibold",
                      style: { background: "var(--accent)", color: "var(--bg)" },
                      title: "Open a picker to select an option and resolve this decision",
                      onClick: () => Re(N.id),
                      children: "⚖ resolve in picker…"
                    }
                  ),
                  /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded",
                      style: { color: "var(--muted)", border: "1px solid var(--border)" },
                      title: "Answer in your own words instead of choosing an option",
                      onClick: () => le(!0),
                      children: "✏️ answer in words"
                    }
                  ),
                  !Se.length && /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded font-semibold",
                      style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                      onClick: () => x(N.id),
                      children: "Acknowledge & continue"
                    }
                  )
                ] })
              ]
            },
            N.id
          );
        }),
        M && /* @__PURE__ */ t(Ka, { live: M }),
        /* @__PURE__ */ t(Oa, { card: e, openChat: ae }),
        (g || k || $ && $.length || z) && /* @__PURE__ */ a(
          "div",
          {
            className: "mt-2 flex items-center gap-2 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider select-none", style: { color: "var(--muted)" }, children: "⚡ actions" }),
              g && (ke ? /* @__PURE__ */ a("div", { className: "w-full flex flex-col gap-1", children: [
                /* @__PURE__ */ t(
                  "textarea",
                  {
                    value: ve,
                    onChange: (N) => Te(N.target.value),
                    placeholder: "Interject: design/spec note, re-scope…",
                    rows: 2,
                    className: "w-full text-[11px] px-2 py-1 rounded outline-none resize-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                ),
                /* @__PURE__ */ a("div", { className: "flex gap-1.5", children: [
                  /* @__PURE__ */ t(
                    "button",
                    {
                      className: "text-[11px] px-2 py-0.5 rounded font-semibold",
                      style: { background: "var(--accent)", color: "var(--bg)" },
                      onClick: () => {
                        ve.trim() && (g("note", ve.trim()), Te(""), le(!1));
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
                        le(!1), Te("");
                      },
                      children: "Cancel"
                    }
                  )
                ] })
              ] }) : /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  onClick: () => le(!0),
                  children: "✏️ interject"
                }
              )),
              k && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: (pt = e.orchestrator_session) != null && pt.slot_key || (ue = e.orchestrator_session) != null && ue.session_key ? "Open this pipeline’s orchestrator session" : "Trigger an inspectable orchestrator session for this card",
                  onClick: () => k(),
                  children: (ze = e.orchestrator_session) != null && ze.slot_key || (st = e.orchestrator_session) != null && st.session_key ? "⚙ open orchestrator" : "⚙ orchestrator"
                }
              ),
              G && /* @__PURE__ */ a(
                "button",
                {
                  className: "text-[10px] hover:underline inline-flex items-center gap-0.5",
                  style: { color: "var(--muted)" },
                  title: "Card timeline — the ordered story of what happened",
                  onClick: () => Ce(!0),
                  children: [
                    "📜 timeline",
                    we.some((N) => N.needs_human) ? " 🔴" : "",
                    Oe.length > 0 ? ` 🌿${Oe.length}` : ""
                  ]
                }
              ),
              D && /* @__PURE__ */ t(Ia, { onRequest: D }),
              ($ || []).map((N) => /* @__PURE__ */ a(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--accent)" },
                  title: `Open the ${N.step} step session`,
                  onClick: () => N.open(),
                  children: [
                    "⚙ ",
                    N.step
                  ]
                },
                N.step
              )),
              z && !["cancelled", "canceled", "retired", "merged"].includes(String(e.lifecycle || "")) && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--danger, #e66)" },
                  title: "Cancel this card (cooperative — revokes writes, retains worktree until terminal)",
                  onClick: () => z(),
                  children: "⏹ cancel"
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: "Card details (read-only)",
                  onClick: () => F(!0),
                  children: "🔍 details"
                }
              )
            ]
          }
        ),
        Ae && /* @__PURE__ */ t(
          Ya,
          {
            card: e,
            events: we,
            children: Oe,
            parent: ge,
            onOpenCard: A,
            onClose: () => Ce(!1)
          }
        ),
        C && /* @__PURE__ */ t(
          La,
          {
            card: e,
            cardStatus: s,
            effectiveCapability: String(l),
            onClose: () => F(!1)
          }
        ),
        Q && Y && /* @__PURE__ */ t(
          Ea,
          {
            card: e,
            inspection: Y,
            producerSession: u,
            onClose: () => P(!1),
            onOpenProducer: i,
            onApprove: c,
            onReject: b,
            onInterject: g ? () => {
              P(!1), le(!0);
            } : void 0
          }
        ),
        ee && x && (() => {
          const N = (e.decisions || []).find((I) => I.id === ee);
          return N ? /* @__PURE__ */ t(
            Ma,
            {
              card: e,
              decision: N,
              onClose: () => Re(null),
              onResolve: (I) => x(N.id, I)
            }
          ) : null;
        })()
      ]
    }
  );
}
function ft({ title: e, count: r, children: n, id: s }) {
  return /* @__PURE__ */ a("div", { id: s, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
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
    ) : n })
  ] });
}
function Da({ config: e, onSet: r }) {
  function n({ label: s, value: l, options: d, tokens: u, onPick: i }) {
    return /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ t("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: s }),
      /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: d.map((c) => {
        const b = l === c;
        return /* @__PURE__ */ t(
          "button",
          {
            onClick: () => i(c),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: b ? u[c] : "var(--muted)",
              background: b ? `color-mix(in srgb, ${u[c]} 16%, transparent)` : "transparent",
              boxShadow: b ? `inset 0 0 0 1px color-mix(in srgb, ${u[c]} 45%, transparent)` : "none"
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
        /* @__PURE__ */ t(n, { label: "Trust", value: e.trust, options: dt, tokens: Zt, onPick: (s) => r({ trust: s }) }),
        /* @__PURE__ */ t(n, { label: "Depth", value: e.depth, options: yt, tokens: Jt, onPick: (s) => r({ depth: s }) }),
        /* @__PURE__ */ t("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
const Ba = {
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
function za({ pipeline: e, cards: r, extras: n, onOpenCard: s }) {
  const { events: l, actors: d, now: u } = $e(
    () => ha(e, r, n),
    [e, r, n]
  );
  return e ? l.length === 0 ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "No recorded events for this pipeline yet." }) : /* @__PURE__ */ a("div", { className: "w-full overflow-x-auto pb-4", children: [
    u && /* @__PURE__ */ a("div", { className: "text-[10px] mb-2 flex flex-wrap gap-2", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ t("span", { children: "now:" }),
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
    /* @__PURE__ */ t("div", { className: "text-[10px] mb-2 flex flex-wrap gap-3", style: { color: "var(--muted)" }, children: d.map((i) => /* @__PURE__ */ a("span", { children: [
      Tr[i] || "•",
      " ",
      i
    ] }, i)) }),
    /* @__PURE__ */ t("ol", { className: "flex flex-col gap-1.5", style: { borderLeft: "1px solid var(--border)", paddingLeft: "10px" }, children: l.map((i) => {
      const c = Ba[i.kind] || "var(--text)";
      return /* @__PURE__ */ a("li", { className: "flex items-start gap-2 text-[11px]", children: [
        /* @__PURE__ */ t("span", { className: "text-[9px] flex-shrink-0 mt-0.5 tabular-nums", style: { color: "var(--muted)", minWidth: "62px" }, children: i.at ? i.at.replace("T", " ").replace("Z", "").slice(5) : "" }),
        /* @__PURE__ */ t("span", { "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", title: i.actor, children: i.glyph }),
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
function Pa({ cards: e }) {
  const r = e.flatMap(
    (n) => (n.parked || []).map((s) => {
      var l;
      return { ...s, cardTitle: n.title, repo: (l = n.source) == null ? void 0 : l.repo };
    })
  ).sort((n, s) => (s.at || "").localeCompare(n.at || ""));
  return r.length === 0 ? /* @__PURE__ */ a("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ a("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ t("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ t("div", { className: "flex flex-col gap-2 max-w-2xl", children: r.map((n) => /* @__PURE__ */ a("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ t("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: n.note }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ a("span", { children: [
        "from ",
        /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: n.cardTitle })
      ] }),
      n.phase && /* @__PURE__ */ a("span", { children: [
        "· parked at ",
        n.phase
      ] }),
      n.repo && /* @__PURE__ */ a("span", { children: [
        "· ",
        n.repo
      ] }),
      n.issue_url && /* @__PURE__ */ t("a", { href: n.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, n.id)) });
}
function Wa({ repos: e, selected: r, onToggle: n, onClear: s, onAddWorkspace: l, onEdit: d }) {
  const u = e.reduce((b, h) => b + h.count, 0), i = r.size === 0, c = ({ name: b, count: h, label: S, checked: f, onClick: g, isAll: x }) => {
    const [k, M] = w(!1);
    return /* @__PURE__ */ a(
      "div",
      {
        onMouseEnter: () => M(!0),
        onMouseLeave: () => M(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: f ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: f ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ a(
            "button",
            {
              onClick: g,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                x ? /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: f ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ t(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: f ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${f ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: f && /* @__PURE__ */ t("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ t("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ t(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: f ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: S
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
                opacity: k ? 1 : 0,
                pointerEvents: k ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (O) => {
                const A = O.currentTarget;
                A.style.color = "var(--accent)", A.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (O) => {
                const A = O.currentTarget;
                A.style.color = "var(--text-strong, var(--text))", A.style.borderColor = "var(--border-strong, var(--border))";
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
          r.size > 0 && /* @__PURE__ */ t("button", { onClick: s, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ t(c, { isAll: !0, count: u, label: "All repos", checked: i, onClick: s }),
        e.map((b) => /* @__PURE__ */ t(
          c,
          {
            name: b.name,
            count: b.count,
            label: (jr.has(b.name) ? "Example: " : "") + (b.name.includes("/") ? b.name.split("/")[1] : b.name),
            checked: r.has(b.name),
            onClick: () => n(b.name)
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
const Ua = [
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
function Fa({ initial: e, agentProfiles: r, crews: n, repo: s, stepName: l, onSave: d, onSaveCrew: u, onClose: i }) {
  const [c, b] = w(e.name || ""), [h, S] = w(e.role || ""), [f, g] = w(e.tools || ["read"]), [x, k] = w(e.model || "auto"), [M, O] = w(e.crew || ""), [A, D] = w(e.addenda || []), [$, z] = w(e.capability || ""), [X, y] = w(e.trust || ""), [J, T] = w(e.depth || ""), [he, ke] = w(!1), le = r.find((C) => C.name === c), ve = n.find((C) => C.name === M), Te = [.../* @__PURE__ */ new Set([...Ua, ...f])], Q = (C) => {
    const F = Ta({ name: c, role: h, tools: f, model: x, crew: M, addenda: A, capability: $, trust: X, depth: J }, C);
    b(F.name), g(F.tools || []), k(F.model || "auto"), F.capability && z(F.capability);
  }, P = (C) => g((F) => F.includes(C) ? F.filter((ae) => ae !== C) : [...F, C]), ee = () => D((C) => {
    var F;
    return C.length >= 3 ? C : [...C, { crew: ((F = n[0]) == null ? void 0 : F.name) || "", when: "always", writes: "" }];
  }), Re = (C, F) => D((ae) => ae.map((we, Oe) => Oe === C ? { ...we, ...F } : we)), Ae = (C) => D((F) => F.filter((ae, we) => we !== C)), Ce = c.trim().length > 0;
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
              onClick: () => ke(!0),
              className: "text-[10px] px-2 py-1 rounded-md font-semibold",
              style: { color: "var(--accent)", border: "1px solid var(--border)" },
              children: "Browse agents & crews"
            }
          )
        ] }),
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: r.map((C) => /* @__PURE__ */ t(
          "button",
          {
            onClick: () => Q(C),
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
        le && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1.5 rounded-md px-2 py-1.5", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
          "Loaded config: model ",
          /* @__PURE__ */ t("code", { children: le.model || "auto" }),
          " · ",
          le.tools.length,
          " declared tool",
          le.tools.length === 1 ? "" : "s",
          " · ",
          le.allowedTools.length,
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
            value: h,
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
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: Te.map((C) => {
          const F = f.includes(C);
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => P(C),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: F ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: F ? "var(--accent)" : "var(--muted)",
                boxShadow: F ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
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
              onChange: (C) => z(C.target.value),
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
            onChange: (C) => k(C.target.value),
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
              value: M,
              onChange: (C) => O(C.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "— none (use step agent) —" }),
                n.map((C) => /* @__PURE__ */ t("option", { value: C.name, children: C.name }, C.name))
              ]
            }
          )
        ] }),
        ve && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: [
          "Global route ",
          /* @__PURE__ */ t("code", { children: ve.name }),
          " → ",
          /* @__PURE__ */ t("code", { children: ve.kiroAgent || "profile unknown" }),
          ve.workspace ? ` · workspace ${ve.workspace}` : "",
          ve.description ? ` · ${ve.description}` : ""
        ] })
      ] }),
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ a("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ t(
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
        /* @__PURE__ */ t("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        A.length === 0 && /* @__PURE__ */ t("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        A.map((C, F) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ t(
            "select",
            {
              value: C.crew,
              onChange: (ae) => Re(F, { crew: ae.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: n.map((ae) => /* @__PURE__ */ t("option", { value: ae.name, children: ae.name }, ae.name))
            }
          ),
          /* @__PURE__ */ a(
            "select",
            {
              value: C.when || "always",
              onChange: (ae) => Re(F, { when: ae.target.value }),
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
              onChange: (ae) => Re(F, { writes: ae.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ t("button", { onClick: () => Ae(F), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ t("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ t("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, F))
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...dt].map((C) => {
          const F = X === C;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => y(C),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: F ? C ? Zt[C] : "var(--text)" : "var(--muted)", background: F ? "var(--bg-hover, var(--border))" : "transparent" },
              children: C || "inherit"
            },
            C || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...yt].map((C) => {
          const F = J === C;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => T(C),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: F ? C ? Jt[C] : "var(--text)" : "var(--muted)", background: F ? "var(--bg-hover, var(--border))" : "transparent" },
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
            role: h.trim() || void 0,
            tools: f,
            model: x.trim() && x.trim() !== "auto" ? x.trim() : void 0,
            crew: M || void 0,
            addenda: A.length ? A.filter((C) => C.crew) : void 0,
            capability: $ || void 0,
            trust: X || void 0,
            depth: J || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save step"
        }
      )
    ] }),
    he && /* @__PURE__ */ t(
      or,
      {
        profiles: r,
        crews: n,
        context: `${s || "unassigned pipeline"} · ${l || "unnamed step"}`,
        onSaveCrew: u,
        onClose: () => ke(!1),
        onSelectProfile: (C) => {
          Q(C), ke(!1);
        },
        onSelectCrew: (C) => {
          O(C.name), ke(!1);
        }
      }
    )
  ] });
}
function yr({ candidates: e, existingRepos: r, defaults: n, agentProfiles: s, crews: l, onCreate: d, onSaveCrew: u, onClose: i, editPipeline: c, cardCount: b, isExample: h, onDelete: S }) {
  var qt, Lt, It, Ct, St, $t, Mt, ut, mt, vt, Dt, Tt, Rt, Bt, ht;
  const f = !!c, [g, x] = w((c == null ? void 0 : c.repo) || ""), [k, M] = w((c == null ? void 0 : c.workspace) || "default"), [O, A] = w((c == null ? void 0 : c.repo_path) || ""), [D, $] = w((c == null ? void 0 : c.source) || "manual"), [z, X] = w((c == null ? void 0 : c.trust) || n.trust), [y, J] = w((c == null ? void 0 : c.depth) || n.depth), T = c == null ? void 0 : c.budget, [he, ke] = w(
    T ? T.max_child_cards === "unlimited" && T.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [le, ve] = w(
    () => T && T.max_child_cards !== "unlimited" && T.effort_ceiling !== "unlimited" ? { ...T } : xr((c == null ? void 0 : c.depth) || n.depth)
  ), [Te, Q] = w((c == null ? void 0 : c.backlog_intake) ?? !0), [P, ee] = w((c == null ? void 0 : c.results_in_repo) ?? !1), [Re, Ae] = w((c == null ? void 0 : c.conversation_log) ?? !1), [Ce, C] = w(((c == null ? void 0 : c.trusted_authors) || []).join(`
`)), [F, ae] = w((c == null ? void 0 : c.self_enabling) ?? !1), [we, Oe] = w((c == null ? void 0 : c.approach) || "simplified"), [re, ge] = w((c == null ? void 0 : c.sync_mode) || "poll"), [G, Y] = w(() => {
    var v;
    return (v = c == null ? void 0 : c.steps) != null && v.length ? c.steps.map((R) => ({ ...R })) : Yt.map((R) => ({ ...R }));
  }), [q, ce] = w(null), [Be, ot] = w(""), [ne, pt] = w("settings"), [ue, ze] = w(!1), st = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", N = (v, R) => Y((xe) => xe.map((fe, pe) => pe === v ? { ...fe, ...R } : fe)), I = (v) => Y((R) => R.filter((xe, fe) => fe !== v)), be = (v, R) => Y((xe) => {
    const fe = v + R;
    if (fe < 0 || fe >= xe.length) return xe;
    const pe = [...xe];
    return [pe[v], pe[fe]] = [pe[fe], pe[v]], pe;
  }), Se = (v) => Y((R) => [...R, {
    id: `${v}-${Math.random().toString(36).slice(2, 6)}`,
    name: v === "gate" ? "New Gate" : "New Step",
    type: v,
    agent: v === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), Ne = (v) => {
    x(v.repo || ""), M(v.workspace || "default"), A(v.path || ""), $(v.source);
  }, qe = (v) => {
    let R = (v || "").trim();
    if (!R) return "";
    const xe = R.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return xe && (R = xe[1]), R.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, Ee = (v) => {
    const R = /github\.com|gitlab\.com/i.test(v);
    x(R ? qe(v) : v), $("manual");
  }, Je = [...new Map(
    Ce.split(/[\n,]/).map((v) => v.trim()).filter(Boolean).map((v) => [v.toLowerCase(), v])
  ).values()], de = Je.every((v) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(v)), Qe = /^[A-Za-z0-9_.-]{1,80}$/.test(k), wt = (/^[^/\s]+\/[^/\s]+$/.test(qe(g)) || e.some((v) => v.repo && v.repo === g)) && de && Qe, Nt = !f && r.has(qe(g)), _t = ({ value: v, options: R, tokens: xe, onPick: fe }) => /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: R.map((pe) => {
    const Xe = v === pe;
    return /* @__PURE__ */ t(
      "button",
      {
        onClick: () => fe(pe),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: Xe ? xe[pe] : "var(--muted)",
          background: Xe ? `color-mix(in srgb, ${xe[pe]} 16%, transparent)` : "transparent",
          boxShadow: Xe ? `inset 0 0 0 1px color-mix(in srgb, ${xe[pe]} 45%, transparent)` : "none"
        },
        children: pe
      },
      pe
    );
  }) }), lt = { "issue-radar": [], workspace: [], manual: [] };
  e.forEach((v) => {
    var R;
    (lt[R = v.source] || (lt[R] = [])).push(v);
  });
  const Qt = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" }, er = f ? ["settings", "webhook", "danger"] : ["settings", "webhook"];
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
          onClick: (v) => v.stopPropagation(),
          children: [
            ue && /* @__PURE__ */ t(
              or,
              {
                profiles: s,
                crews: l,
                context: g || k,
                onSaveCrew: u,
                onClose: () => ze(!1)
              }
            ),
            q !== null ? /* @__PURE__ */ t(
              Fa,
              {
                initial: {
                  name: ((Lt = (qt = G[q]) == null ? void 0 : qt.agent) == null ? void 0 : Lt.name) || "",
                  role: (Ct = (It = G[q]) == null ? void 0 : It.agent) == null ? void 0 : Ct.role,
                  tools: ($t = (St = G[q]) == null ? void 0 : St.agent) == null ? void 0 : $t.tools,
                  model: (ut = (Mt = G[q]) == null ? void 0 : Mt.agent) == null ? void 0 : ut.model,
                  crew: (vt = (mt = G[q]) == null ? void 0 : mt.agent) == null ? void 0 : vt.crew,
                  addenda: (Dt = G[q]) == null ? void 0 : Dt.addenda,
                  capability: (Tt = G[q]) == null ? void 0 : Tt.capability,
                  trust: (Rt = G[q]) == null ? void 0 : Rt.trust,
                  depth: (Bt = G[q]) == null ? void 0 : Bt.depth
                },
                agentProfiles: s,
                crews: l,
                repo: g,
                stepName: ((ht = G[q]) == null ? void 0 : ht.name) || "",
                onSaveCrew: u,
                onClose: () => ce(null),
                onSave: (v) => {
                  N(q, {
                    agent: { name: v.name, role: v.role, tools: v.tools, model: v.model, crew: v.crew },
                    addenda: v.addenda,
                    capability: v.capability,
                    trust: v.trust,
                    depth: v.depth
                  }), ce(null);
                }
              }
            ) : /* @__PURE__ */ a(Fe, { children: [
              /* @__PURE__ */ a("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { children: [
                  /* @__PURE__ */ t("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: f ? "Edit Pipeline" : "New Pipeline" }),
                  /* @__PURE__ */ t("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: f ? g.includes("/") ? g.split("/")[1] : g : "Configure a pipeline for a repository or workspace" })
                ] }),
                /* @__PURE__ */ t("button", { onClick: i, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
              ] }),
              /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: er.map((v) => {
                const R = ne === v, xe = v === "danger";
                return /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: () => pt(v),
                    className: "text-[12px] px-3 py-2 font-semibold transition-all",
                    style: {
                      color: R ? xe ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                      borderBottom: `2px solid ${R ? xe ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                      marginBottom: "-1px"
                    },
                    children: v === "settings" ? "Settings" : v === "webhook" ? "Webhook · app-wide" : "Danger Zone"
                  },
                  v
                );
              }) }),
              /* @__PURE__ */ a(
                "div",
                {
                  className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                  style: { display: ne === "settings" ? "flex" : "none" },
                  children: [
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: g,
                          onChange: (v) => Ee(v.target.value),
                          onPaste: (v) => {
                            const R = v.clipboardData.getData("text");
                            /github\.com|gitlab\.com/i.test(R) && (v.preventDefault(), Ee(R));
                          },
                          placeholder: "https://github.com/owner/name  ·  or  owner/name",
                          disabled: f,
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Nt ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                        }
                      ),
                      !f && g && qe(g) !== g && /* @__PURE__ */ a("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                        "→ ",
                        /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: qe(g) })
                      ] }),
                      Nt && /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                      /* @__PURE__ */ t("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((v) => lt[v].length > 0 && /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Qt[v] }),
                        /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1.5", children: lt[v].map((R) => {
                          const xe = `${v}:${R.workspace || R.repo}:${R.path || ""}`, fe = R.source === "workspace" ? k === R.workspace && O === (R.path || "") : g === R.repo;
                          return /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => Ne(R),
                              disabled: !!R.repo && r.has(R.repo),
                              title: R.detail || R.repo || R.workspace,
                              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                              style: {
                                background: fe ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                                color: fe ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                                boxShadow: fe ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                              },
                              children: R.label || (R.repo.includes("/") ? R.repo.split("/")[1] : R.repo) || R.workspace
                            },
                            xe
                          );
                        }) })
                      ] }, v)) })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspace partition" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: k,
                          onChange: (v) => M(v.target.value.trim()),
                          placeholder: "default",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Qe ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: Qe ? "var(--muted)" : "var(--danger)" }, children: [
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
                          onChange: (v) => A(v.target.value),
                          placeholder: "/absolute/path/to/checkout",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ t("div", { className: "text-[10px] mt-1", style: { color: "var(--muted)" }, children: "Required before code or repo-mirrored results run. Mutable steps block rather than use the shared checkout when this path is absent or unverifiable." })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                      /* @__PURE__ */ t(_t, { value: z, options: dt, tokens: Zt, onPick: X })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                      /* @__PURE__ */ t(_t, { value: y, options: yt, tokens: Jt, onPick: J })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                        /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                      ] }),
                      /* @__PURE__ */ t(
                        _t,
                        {
                          value: he,
                          options: ["depth", "custom", "unlimited"],
                          tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                          onPick: ke
                        }
                      )
                    ] }),
                    he === "depth" && (() => {
                      const v = xr(y);
                      return /* @__PURE__ */ a("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                        "Follows ",
                        /* @__PURE__ */ t("strong", { children: y }),
                        ": ",
                        String(v.max_child_cards),
                        " child cards · ",
                        String(v.effort_ceiling),
                        " effort points · max ",
                        v.max_feature_size,
                        " · ",
                        v.addenda,
                        " addenda"
                      ] });
                    })(),
                    he === "unlimited" && /* @__PURE__ */ t("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                    he === "custom" && /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max child cards",
                        /* @__PURE__ */ t(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: le.max_child_cards,
                            onChange: (v) => ve((R) => ({ ...R, max_child_cards: Math.max(0, Number(v.target.value) || 0) })),
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
                            value: le.effort_ceiling,
                            onChange: (v) => ve((R) => ({ ...R, effort_ceiling: Math.max(0, Number(v.target.value) || 0) })),
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
                            value: le.max_feature_size,
                            onChange: (v) => ve((R) => ({ ...R, max_feature_size: v.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["S", "M", "L", "XL"].map((v) => /* @__PURE__ */ t("option", { children: v }, v))
                          }
                        )
                      ] }),
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Addenda",
                        /* @__PURE__ */ t(
                          "select",
                          {
                            value: le.addenda,
                            onChange: (v) => ve((R) => ({ ...R, addenda: v.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["none", "obvious", "proactive"].map((v) => /* @__PURE__ */ t("option", { children: v }, v))
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { className: "min-w-0 pr-3", children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "GitHub sync mode" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: re === "webhook" ? "Webhook is the fast path; the safety-net poll reconciles this pipeline on a longer window. Requires the app-wide webhook receiver enabled — falls back to polling if it is not." : "Poll reconciles this pipeline every cycle (default). Correct when no webhook is configured." })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex rounded-md overflow-hidden flex-shrink-0", style: { border: "1px solid var(--border)" }, children: ["poll", "webhook"].map((v) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => ge(v),
                          className: "text-[11px] px-2.5 py-1 font-semibold",
                          style: {
                            background: re === v ? "var(--accent)" : "transparent",
                            color: re === v ? "var(--bg)" : "var(--muted)"
                          },
                          children: v === "poll" ? "Poll" : "Webhook"
                        },
                        v
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
                          onClick: () => Q((v) => !v),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: Te ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: Te ? 20 : 2 }
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
                          onClick: () => ee((v) => !v),
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
                          onClick: () => Ae((v) => !v),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: Re ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: Re ? 20 : 2 }
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
                          onChange: (v) => C(v.target.value),
                          rows: 2,
                          placeholder: "Defaults to the authenticated GitHub user",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${de ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: de ? "var(--muted)" : "var(--danger)" }, children: [
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
                          onClick: () => ae((v) => !v),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: F ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: F ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    F && /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((v) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => Oe(v),
                          className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                          style: {
                            background: we === v ? "var(--accent)" : "transparent",
                            color: we === v ? "var(--bg)" : "var(--muted)",
                            border: `1px solid ${we === v ? "var(--accent)" : "var(--border)"}`
                          },
                          children: v
                        },
                        v
                      )) })
                    ] }),
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ a("div", { className: "flex items-center justify-between mb-1.5", children: [
                        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                        /* @__PURE__ */ a("div", { className: "flex gap-1", children: [
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => ze(!0),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--muted)", border: "1px solid var(--border)" },
                              children: "Agents & crews"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => Se("agent"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                              children: "+ agent"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => Se("gate"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                              children: "+ gate"
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: G.map((v, R) => {
                        var xe, fe;
                        return /* @__PURE__ */ a(
                          "div",
                          {
                            className: "rounded-md p-2",
                            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${v.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                            children: [
                              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ a("div", { className: "flex flex-col", children: [
                                  /* @__PURE__ */ t("button", { onClick: () => be(R, -1), disabled: R === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                  /* @__PURE__ */ t("button", { onClick: () => be(R, 1), disabled: R === G.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                                ] }),
                                /* @__PURE__ */ t(
                                  "input",
                                  {
                                    value: v.name,
                                    onChange: (pe) => N(R, { name: pe.target.value, id: st(pe.target.value) }),
                                    className: "flex-1 min-w-0 px-2 py-1 rounded text-[12px] outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                                  }
                                ),
                                /* @__PURE__ */ t(
                                  "span",
                                  {
                                    className: "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                    style: { color: v.type === "gate" ? "var(--warn)" : "var(--accent)", background: `color-mix(in srgb, ${v.type === "gate" ? "var(--warn)" : "var(--accent)"} 14%, transparent)` },
                                    children: v.type
                                  }
                                ),
                                /* @__PURE__ */ t("button", { onClick: () => I(R), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                              ] }),
                              v.type === "agent" && /* @__PURE__ */ a("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                                /* @__PURE__ */ a(
                                  "button",
                                  {
                                    onClick: () => ce(R),
                                    className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                    style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                    children: [
                                      "⚙ ",
                                      (xe = v.agent) != null && xe.name ? `Agent: ${v.agent.name}` : "Configure agent"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                                /* @__PURE__ */ a(
                                  "select",
                                  {
                                    value: v.trigger || "ask",
                                    onChange: (pe) => N(R, { trigger: pe.target.value === "ask" ? void 0 : pe.target.value }),
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
                                /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: v.capability ? "var(--accent)" : "var(--muted)" }, title: "Actual authority is verified from the assigned capability profile at runtime", children: [
                                  "cap: ",
                                  v.capability || "auto"
                                ] }),
                                (v.trust || v.depth) && /* @__PURE__ */ t("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [v.trust, v.depth].filter(Boolean).join(" · ") }),
                                v.addenda && v.addenda.length > 0 && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                  "+",
                                  v.addenda.length,
                                  " addendum",
                                  v.addenda.length === 1 ? "" : "s"
                                ] }),
                                ((fe = v.agent) == null ? void 0 : fe.role) && /* @__PURE__ */ t("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: v.agent.role })
                              ] }),
                              v.type === "gate" && /* @__PURE__ */ a("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                                /* @__PURE__ */ t("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                                /* @__PURE__ */ a(
                                  "select",
                                  {
                                    value: v.trust || "",
                                    onChange: (pe) => N(R, { trust: pe.target.value || void 0 }),
                                    className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                    children: [
                                      /* @__PURE__ */ t("option", { value: "", children: "inherit" }),
                                      dt.map((pe) => /* @__PURE__ */ t("option", { value: pe, children: pe }, pe))
                                    ]
                                  }
                                )
                              ] })
                            ]
                          },
                          v.id
                        );
                      }) })
                    ] })
                  ]
                }
              ),
              ne === "webhook" && /* @__PURE__ */ t("div", { className: "px-5 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ t(Cr, {}) }),
              f && ne === "danger" && S && (() => {
                const v = g.includes("/") ? g.split("/")[1] : g, R = Be.trim() === v;
                return /* @__PURE__ */ t("div", { className: "px-5 pb-4 pt-4", children: h ? /* @__PURE__ */ a(
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
                            S(g), i();
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
                        /* @__PURE__ */ t("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: v }),
                        " to confirm:"
                      ] }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: Be,
                          onChange: (xe) => ot(xe.target.value),
                          placeholder: v,
                          className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                        }
                      ),
                      /* @__PURE__ */ t(
                        "button",
                        {
                          disabled: !R,
                          onClick: () => {
                            S(g), i();
                          },
                          className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                          style: {
                            background: R ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                            color: R ? "#fff" : "var(--muted)",
                            cursor: R ? "pointer" : "not-allowed"
                          },
                          children: "Delete pipeline"
                        }
                      )
                    ]
                  }
                ) });
              })(),
              /* @__PURE__ */ a("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
                /* @__PURE__ */ t("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: ne === "settings" ? "Cancel" : "Close" }),
                ne === "settings" && /* @__PURE__ */ t(
                  "button",
                  {
                    disabled: !wt || !f && Nt,
                    onClick: () => d({
                      repo: qe(g),
                      workspace: k,
                      ...O.trim() ? { repo_path: O.trim() } : {},
                      source: D,
                      trust: z,
                      depth: y,
                      budget: he === "depth" ? void 0 : he === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : le,
                      backlog_intake: Te,
                      results_in_repo: P,
                      conversation_log: Re,
                      trusted_authors: Je,
                      self_enabling: F,
                      approach: we,
                      sync_mode: re,
                      steps: G.map((v) => ({ ...v, label: `dlc:${v.id}` }))
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
function kt({ size: e = 12 }) {
  return /* @__PURE__ */ a("svg", { className: "animate-spin flex-shrink-0", width: e, height: e, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ t("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ t("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
const Ga = {
  investigate: "🔎",
  requirements: "📝",
  design: "📐",
  tasks: "🧩",
  implement: "🔨",
  review: "🔍",
  pr: "🚀",
  intent: "🎯"
};
function Ha(e, r) {
  const [n, s] = w(""), l = Ie(""), d = Ie(""), u = Ie(null);
  return d.current = e || "", De(() => {
    if (!r || !d.current.startsWith(l.current)) {
      l.current = d.current, s(d.current);
      return;
    }
    const i = () => {
      const c = d.current, b = l.current;
      if (b.length >= c.length) {
        u.current = null;
        return;
      }
      const h = Math.max(1, Math.ceil((c.length - b.length) / 12));
      l.current = c.slice(0, b.length + h), s(l.current), u.current = requestAnimationFrame(i);
    };
    return u.current == null && (u.current = requestAnimationFrame(i)), () => {
      u.current != null && (cancelAnimationFrame(u.current), u.current = null);
    };
  }, [e, r]), n;
}
function Ka({ live: e }) {
  const [r, n] = w(!0), s = Ie(null), l = Ha(e.tail, e.active);
  De(() => {
    s.current && (s.current.scrollTop = s.current.scrollHeight);
  }, [l]);
  const d = Ga[e.stage] || "⚙";
  return /* @__PURE__ */ a("div", { className: "mt-2", style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" }, children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
      /* @__PURE__ */ a(
        "button",
        {
          className: "inline-flex items-center gap-1 hover:underline",
          onClick: () => n((u) => !u),
          title: "Toggle live output",
          style: { color: "var(--muted)" },
          children: [
            /* @__PURE__ */ t("span", { "aria-hidden": "true", children: r ? "▾" : "▸" }),
            /* @__PURE__ */ a("span", { className: "uppercase tracking-wider", children: [
              d,
              " ",
              e.stage
            ] })
          ]
        }
      ),
      /* @__PURE__ */ a("span", { style: { color: e.active ? "var(--accent)" : "var(--muted)" }, children: [
        "· ",
        e.active ? e.phase : "idle"
      ] }),
      e.active && /* @__PURE__ */ t(kt, { size: 10 }),
      e.source === "progress-trail" && /* @__PURE__ */ t(
        "span",
        {
          className: "text-[9px]",
          title: "A cron-launched step session cannot stream tokens live; these are progress checkpoints the agent writes between tool calls.",
          style: { color: "var(--muted)" },
          children: "· checkpoints"
        }
      ),
      /* @__PURE__ */ t(
        "button",
        {
          className: "ml-auto hover:underline",
          onClick: e.onOpen,
          title: "Open the full step session",
          style: { color: "var(--accent)" },
          children: "open ↗"
        }
      )
    ] }),
    r && /* @__PURE__ */ t(
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
        children: l || (e.source === "progress-trail" ? e.active ? "waiting for the next checkpoint…" : "no progress reported" : e.active ? "thinking…" : "no live output")
      }
    )
  ] });
}
const Va = {
  loop: "⚙",
  "step-agent": "🤖",
  orchestrator: "🧠",
  human: "🧑"
}, Xa = {
  loop: "var(--muted)",
  "step-agent": "var(--info)",
  orchestrator: "var(--accent)",
  human: "var(--ok)"
};
function Ya({ card: e, events: r, children: n, parent: s, onOpenCard: l, onClose: d }) {
  const u = n && n.length > 0 || !!s;
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
              u && /* @__PURE__ */ a("div", { className: "mb-3 pb-3", style: { borderBottom: "1px dashed var(--border)" }, children: [
                /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "🌿 fan-out" }),
                s && /* @__PURE__ */ a(
                  "button",
                  {
                    className: "flex items-center gap-1.5 text-[12px] hover:underline mb-1",
                    onClick: () => l == null ? void 0 : l(s.id),
                    style: { color: "var(--accent)" },
                    title: "Open the integration parent",
                    children: [
                      "↑ parent · ",
                      /* @__PURE__ */ t("span", { className: "truncate max-w-[420px]", style: { color: "var(--text)" }, children: s.title })
                    ]
                  }
                ),
                n.map((i) => /* @__PURE__ */ a(
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
                n.length > 0 && r.length === 0 && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1.5 italic", style: { color: "var(--muted)" }, children: [
                  "This card fanned its work out to the ",
                  n.length,
                  " child card",
                  n.length > 1 ? "s" : "",
                  " above — the story lives there."
                ] })
              ] }),
              r.length === 0 ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: u ? "No events recorded on this card directly." : "No recorded events yet." }) : /* @__PURE__ */ t("ol", { className: "flex flex-col gap-2", children: r.map((i) => /* @__PURE__ */ a("li", { className: "flex gap-2 text-[12px]", children: [
                /* @__PURE__ */ t("span", { title: i.actor, "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", children: Va[i.actor] || "•" }),
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
                  /* @__PURE__ */ a("div", { className: "text-[9px] mt-0.5", style: { color: Xa[i.actor] || "var(--muted)" }, children: [
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
function tn() {
  const e = wr(), r = Er(), [n, s] = w([]), [l, d] = w([]), [u, i] = w({}), [c, b] = w(Ot), [h, S] = w(!0), [f, g] = w("pipeline"), [x, k] = w(/* @__PURE__ */ new Set()), [M, O] = w(!1), [A, D] = w(null), [$, z] = w([]), [X, y] = w([]), [J, T] = w([]), [he, ke] = w(!1), [le, ve] = w(!1), [Te, Q] = w(!1), [P, ee] = w(!1), [Re, Ae] = w(!1), [Ce, C] = w(!1), [F, ae] = w([]), we = Ie(null), Oe = Ie(!1), re = Ie(!1), ge = Ie(/* @__PURE__ */ new Set()), G = Ie(/* @__PURE__ */ new Set()), [Y, q] = w({}), ce = se(
    (o) => e.get("/api/file-read?path=" + encodeURIComponent(o)),
    [e]
  ), Be = se(async (o = !1) => {
    try {
      const p = !re.current || o ? await Vt(ce) : await dr(ce, rt);
      rt = p.path, re.current = !0;
      const m = p.data;
      s(m.cards || []), d(m.pipelines || []), i({ github_webhook_history: m.github_webhook_history || [], scheduler_state: m.scheduler_state || null }), b({ ...Ot, ...m.config || {} });
    } catch (p) {
      console.error("Failed to fetch cards:", p);
    } finally {
      S(!1);
    }
  }, [ce]), ot = $e(() => {
    const o = /* @__PURE__ */ new Map();
    return l.forEach((p) => {
      o.has(p.repo) || o.set(p.repo, 0);
    }), n.forEach((p) => {
      var _;
      const m = ((_ = p.source) == null ? void 0 : _.repo) || "unlinked";
      o.set(m, (o.get(m) || 0) + 1);
    }), [...o.entries()].map(([p, m]) => ({ name: p, count: m })).sort((p, m) => m.count - p.count);
  }, [n, l]), ne = $e(
    () => x.size === 0 ? n : n.filter((o) => {
      var p;
      return x.has(((p = o.source) == null ? void 0 : p.repo) || "unlinked");
    }),
    [n, x]
  );
  De(() => {
    G.current = new Set(n.map((o) => o.id)), ge.current = new Set(n.flatMap(
      (o) => Object.values(o.step_sessions || {}).filter((p) => !!p.slot_key && !p.chat_disabled_at && !p.superseded).map((p) => p.slot_key)
    ));
  }, [n]), De(() => {
    let o = !1, p = null, m, _ = 0;
    const j = () => {
      if (o) return;
      const E = window.location.protocol === "https:" ? "wss:" : "ws:";
      p = new WebSocket(`${E}//${window.location.host}/api/ws`), p.onopen = () => {
        _ = 0;
      }, p.onmessage = (U) => {
        if (typeof U.data == "string")
          try {
            const B = JSON.parse(U.data), V = B == null ? void 0 : B.data;
            if (B.type === "slots" && Array.isArray(V)) {
              const K = new Set(ge.current), Z = [];
              for (const L of V) {
                const je = (L == null ? void 0 : L.key) || (L == null ? void 0 : L.slot) || (L == null ? void 0 : L.name), Ge = String((L == null ? void 0 : L.title) || (L == null ? void 0 : L.name) || "");
                typeof je == "string" && je.startsWith("cron-") && [...G.current].some((He) => Ge.includes(He)) && K.add(je), typeof je == "string" && (L != null && L.running) && K.has(je) && Z.push(je);
              }
              ge.current = K, Z.length && q((L) => {
                let je = L;
                for (const Ge of Z) {
                  const He = sr(L[Ge]);
                  He !== L[Ge] && (je = { ...je, [Ge]: He });
                }
                return je;
              });
              return;
            }
            const oe = V == null ? void 0 : V.slot;
            if (!oe || !ge.current.has(oe)) return;
            B.type === "chat_status" && String(V.status || "").toLowerCase().startsWith("thinking") || B.type === "chat_thinking" ? q((K) => {
              const Z = sr(K[oe], B.type === "chat_status");
              return Z === K[oe] ? K : { ...K, [oe]: Z };
            }) : B.type === "chat_chunk" && typeof V.content == "string" ? q((K) => {
              const Z = Dr(K[oe], V.content, Number(V.seq));
              return Z === K[oe] ? K : { ...K, [oe]: Z };
            }) : B.type === "chat_done" && q((K) => {
              const Z = Br(K[oe]);
              return Z === K[oe] ? K : { ...K, [oe]: Z };
            });
          } catch {
          }
      }, p.onclose = () => {
        if (o) return;
        const U = Math.min(1e3 * 2 ** _++, 15e3);
        m = setTimeout(j, U);
      }, p.onerror = () => p == null ? void 0 : p.close();
    };
    return j(), () => {
      o = !0, m && clearTimeout(m), p == null || p.close();
    };
  }, []), De(() => {
    if (!Te) return;
    const o = (p) => {
      p.key === "Escape" && Q(!1);
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, [Te]);
  const pt = 6e5, ue = $e(() => {
    var p, m, _, j;
    const o = [];
    for (const E of ne) {
      const U = E.step_status || {}, B = E.step_sessions || {}, V = l.find((K) => K.id === E.pipeline_id) || l.find((K) => {
        var Z;
        return K.repo === ((Z = E.source) == null ? void 0 : Z.repo);
      }), oe = /* @__PURE__ */ new Set([...Object.keys(U), ...Object.keys(B)]);
      for (const K of oe) {
        const Z = U[K] || "idle", L = B[K], je = Z === "pending" || Z === "error", Ge = !!(L != null && L.slot_key) && !L.chat_disabled_at && !L.superseded;
        if (!je && !Ge) continue;
        const He = (p = E.pending_at) == null ? void 0 : p[K], te = je && !!He && Date.now() - new Date(He).getTime() > pt, ie = (m = V == null ? void 0 : V.steps) == null ? void 0 : m.find((Ke) => Ke.id === K), We = (L == null ? void 0 : L.agent) || ((_ = ie == null ? void 0 : ie.agent) == null ? void 0 : _.crew) || ((j = ie == null ? void 0 : ie.agent) == null ? void 0 : j.name) || "orchestrator", Le = L == null ? void 0 : L.agent_id, it = L == null ? void 0 : L.slot_key, Pt = L == null ? void 0 : L.session_key, Wt = Le ? F.some((Ke) => Ke.id === Le) : je && F.some((Ke) => (Ke.task || "").includes(E.id) || (Ke.task || "").includes(E.title)), Ut = !!(L != null && L.last_response_at) && (!L.last_response_handled_at || L.last_response_handled_at < L.last_response_at);
        o.push({ cardId: E.id, card: E.title || E.id, step: K, agent: We, stale: te, status: Z, live: Wt, responsePending: Ut, agentId: Le, slotKey: it, sessionKey: Pt, sessionName: L == null ? void 0 : L.name });
      }
    }
    return o;
  }, [ne, l, F]), ze = $e(() => {
    var j;
    let o;
    if (x.size === 1) {
      const E = [...x][0];
      o = (j = l.find((U) => U.repo === E)) == null ? void 0 : j.steps;
    } else l.length === 1 && (o = l[0].steps);
    const p = (o && o.length ? o : Yt).map((E) => ({ ...E })), m = new Set(p.map((E) => E.id)), _ = [];
    return m.has("intake") || _.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), _.push(...p), m.has("done") || _.push({ id: "done", name: "Done", type: "agent" }), _;
  }, [x, l]), st = $e(() => ze.map((o) => o.id), [ze]), N = se((o) => {
    var p;
    return ((p = ze.find((m) => m.id === o)) == null ? void 0 : p.type) === "gate" || o.startsWith("gate-");
  }, [ze]), I = se((o) => {
    var p, m;
    return ((m = (p = ze.find((_) => _.id === o)) == null ? void 0 : p.agent) == null ? void 0 : m.name) || Ra[o] || "unknown";
  }, [ze]), be = se((o) => {
    var j, E;
    const p = o.step_sessions || {}, m = Object.entries(p).find(
      ([, U]) => U.retained_for_gate === o.stage && U.retention !== "released"
    );
    let _ = ((j = o.gate_review) == null ? void 0 : j.producer_step) || (m == null ? void 0 : m[0]);
    if (!_) {
      const U = l.find((Z) => Z.id === o.pipeline_id) || l.find((Z) => {
        var L;
        return Z.repo === ((L = o.source) == null ? void 0 : L.repo);
      }), B = (E = U == null ? void 0 : U.steps) != null && E.length ? U.steps : Yt, V = [
        { id: "intake", name: "Intake", type: "agent" },
        ...B.filter((Z) => Z.id !== "intake" && Z.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], oe = V.findIndex((Z) => Z.id === o.stage), K = oe >= 0 ? V[oe] : void 0;
      if (_ = K == null ? void 0 : K.reviews_step, !_ && oe >= 0)
        for (let Z = oe - 1; Z >= 0; Z--) {
          const L = V[Z];
          if (!(L.id === "intake" || L.id === "done") && L.type !== "gate" && !L.id.startsWith("gate-")) {
            _ = L.id;
            break;
          }
        }
    }
    return _;
  }, [l]), Se = se((o) => {
    const p = be(o);
    if (!p) return;
    const m = (o.step_sessions || {})[p];
    if (!(!(m != null && m.slot_key) || m.chat_disabled_at || m.superseded))
      return {
        step: p,
        slotKey: m.slot_key,
        retained: m.retention === "held-for-gate"
      };
  }, [be]);
  De(() => {
    const o = async () => {
      try {
        const _ = rt.slice(0, rt.lastIndexOf("/")), j = (_ ? _ + "/" : "") + "live_spawns.json", E = await e.get("/api/file-read?path=" + encodeURIComponent(j));
        Oe.current = !1;
        const U = E != null && E.at ? Date.now() - new Date(E.at).getTime() < 18e4 : !0;
        ae(U && Array.isArray(E == null ? void 0 : E.runs) ? E.runs : []);
      } catch {
        Oe.current = !0, ae([]);
      }
    };
    let p = 0;
    Be(!0).then(o);
    const m = setInterval(() => {
      p += 1;
      const _ = p % 12 === 0;
      Be(_).then(() => {
        Oe.current || o();
      });
    }, 1e4);
    return () => clearInterval(m);
  }, [Be, e]);
  const Ne = se(async () => {
    ve(!0);
    let o = [];
    try {
      const m = await ce("~/.kiro/crew/config.json");
      o = _a(m == null ? void 0 : m.agents), y(o);
    } catch (m) {
      console.warn("crew roster (config.json) unreadable:", m), y([]);
    }
    const p = await Promise.all(Ca(o).map(async (m) => {
      const _ = Sa(m, o);
      if (!_) return tr(null, m);
      try {
        const j = await ce(_);
        return tr(j, m, _);
      } catch {
        return tr(null, m, _);
      }
    }));
    T(p), ve(!1);
  }, [ce]), qe = se(() => {
    ke(!0), Ne();
  }, [Ne]), Ee = se((o) => {
    Ne().then(() => D(o));
  }, [Ne]), Je = se(async (o) => {
    await e.post("/apps/dlc-yolo/api/agents/crew", {
      mode: o.mode,
      name: o.name,
      kiro_agent: o.kiroAgent,
      workspace: o.workspace || null,
      memory_store: o.memoryStore || null
    }), await Ne();
  }, [e, Ne]), de = se(async (o) => {
    try {
      const p = await Vt(ce);
      rt = p.path, p.data.cards = p.data.cards || [], o(p.data);
      let m = p;
      try {
        m = await Vt(ce), rt = m.path, m.data.cards = m.data.cards || [], o(m.data);
      } catch {
        m = p;
      }
      await e.post("/api/file-write", {
        path: m.path,
        content: JSON.stringify(m.data, null, 2)
      }), Be();
    } catch (p) {
      console.error("Failed to mutate state:", p);
    }
  }, [e, Be, ce]), Qe = se((o) => {
    b((p) => ({ ...p, ...o })), de((p) => {
      p.config = { ...Ot, ...p.config || {}, ...o };
    });
  }, [de]), wt = se((o, p, m, _) => {
    const j = (/* @__PURE__ */ new Date()).toISOString(), E = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    de((U) => {
      var Z;
      const B = U.cards.find((L) => L.id === o);
      if (!B || B.stage !== p) return;
      if (_ === void 0 && m.type === "interject") {
        const L = m.text.trim();
        if (!L) return;
        B.interjection = B.interjection || [], B.interjection.some((je) => je.id === E) || B.interjection.push({
          id: E,
          at: j,
          step: p,
          kind: m.kind,
          text: L,
          by: "user",
          status: "pending"
        }), B.updated_at = j;
        return;
      }
      if ((((Z = B.gate_review) == null ? void 0 : Z.result_revision) ?? null) !== _) return;
      const oe = m.type === "reject" ? m.reason.trim() : void 0, K = m.type === "interject" ? m.text.trim() : void 0;
      m.type === "reject" && !oe || m.type === "interject" && !K || (B.gate_commands = B.gate_commands || [], B.gate_commands.some((L) => L.id === E) || B.gate_commands.push({
        id: E,
        gate: p,
        action: m.type,
        expected_revision: _ ?? null,
        actor: "user",
        at: j,
        status: "pending",
        ...oe ? { reason: oe } : {},
        ...m.type === "interject" ? { kind: m.kind, text: K } : {}
      }), B.updated_at = j);
    });
  }, [de]), Nt = se((o, p, m) => {
    const _ = (/* @__PURE__ */ new Date()).toISOString(), j = ba();
    de((E) => {
      const U = E.cards.find((V) => V.id === o);
      if (!U) return;
      let B;
      try {
        B = fa({ id: j, kind: p, text: m, card: U, now: _ });
      } catch {
        return;
      }
      U.interjection = ya(U.interjection, B), U.updated_at = _;
    });
  }, [de]), _t = se((o) => {
    if (!window.confirm("Cancel this card? Writes are revoked cooperatively — a live turn may not stop immediately, and its worktree is retained until terminal observation.")) return;
    const p = (/* @__PURE__ */ new Date()).toISOString();
    de((m) => {
      const _ = m.cards.find((j) => j.id === o);
      _ && (_.lifecycle = "cancelled", _.writes_allowed = !1, _.cancel_requested_at = p, _.updated_at = p);
    });
  }, [de]), lt = se((o, p, m) => {
    de((_) => {
      const j = _.cards.find((U) => U.id === o);
      if (!j) return;
      const E = (j.decisions || []).find((U) => U.id === p);
      if (E) {
        const U = (/* @__PURE__ */ new Date()).toISOString();
        E.chosen = m && m.trim() ? m.trim() : "acknowledged", E.status = m ? "resolved" : "acknowledged", E.resolved_at = U, E.resolved_by = "user";
      }
      j.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [de]), Qt = se(async (o) => {
    var _, j, E;
    const m = ((U) => {
      var oe;
      const B = U == null ? void 0 : U.orchestrator_session;
      if (B != null && B.slot_key) return B.slot_key;
      if (B != null && B.session_key) return B.session_key.replace(/^cron:/, "cron-");
      const V = (oe = l.find((K) => K.id === (U == null ? void 0 : U.pipeline_id))) == null ? void 0 : oe.orchestrator_session;
      return (V == null ? void 0 : V.slot_key) || (V != null && V.session_key ? V.session_key.replace(/^cron:/, "cron-") : void 0);
    })(o);
    if (m) {
      r(`/chat?sid=${encodeURIComponent(m)}`);
      return;
    }
    try {
      const U = await e.post("/apps/dlc-yolo/api/orchestrator/trigger", { card_id: o.id });
      if (U != null && U.slot_key) {
        r(`/chat?sid=${encodeURIComponent(U.slot_key)}`);
        return;
      }
    } catch {
    }
    for (let U = 0; U < 8; U++) {
      await new Promise((B) => setTimeout(B, 2e3));
      try {
        const B = await dr(ce, rt), V = (B.data.cards || []).find((Z) => Z.id === o.id), oe = (_ = (B.data.pipelines || []).find((Z) => Z.id === (V == null ? void 0 : V.pipeline_id))) == null ? void 0 : _.orchestrator_session, K = ((j = V == null ? void 0 : V.orchestrator_session) == null ? void 0 : j.slot_key) || (((E = V == null ? void 0 : V.orchestrator_session) == null ? void 0 : E.session_key) || (oe == null ? void 0 : oe.session_key) || "").replace(/^cron:/, "cron-") || (oe == null ? void 0 : oe.slot_key);
        if (K) {
          Be(), r(`/chat?sid=${encodeURIComponent(K)}`);
          return;
        }
      } catch {
      }
    }
    Be();
  }, [e, r, ce, Be]), er = se((o) => {
    de((p) => {
      var j;
      const m = p.cards.find((E) => E.id === o);
      if (!m) return;
      const _ = m.trust || ((j = p.config) == null ? void 0 : j.trust) || Ot.trust;
      m.trust = dt[(dt.indexOf(_) + 1) % dt.length], m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [de]), qt = se((o) => {
    de((p) => {
      var j;
      const m = p.cards.find((E) => E.id === o);
      if (!m) return;
      const _ = m.depth || ((j = p.config) == null ? void 0 : j.depth) || Ot.depth;
      m.depth = yt[(yt.indexOf(_) + 1) % yt.length], m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [de]), Lt = se((o, p) => {
    de((m) => {
      const _ = m.cards.find((j) => j.id === o);
      _ && (p ? _.budget = { ...p } : delete _.budget, _.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [de]), It = se((o) => {
    k((p) => {
      const m = new Set(p);
      return m.has(o) ? m.delete(o) : m.add(o), m;
    });
  }, []), Ct = se(() => k(/* @__PURE__ */ new Set()), []), St = se(async () => {
    const o = Ne(), p = [];
    try {
      const m = await e.get("/api/file-read?path=~/.kiro/crew/config.json"), _ = (m == null ? void 0 : m.workspaces) || {};
      Object.entries(_).forEach(([j, E]) => {
        const U = typeof (E == null ? void 0 : E.repo) == "string" && /^[^/\s]+\/[^/\s]+$/.test(E.repo) ? E.repo : "";
        p.push({
          repo: U,
          workspace: j,
          label: j,
          source: "workspace",
          detail: (E == null ? void 0 : E.dir) || j,
          path: typeof (E == null ? void 0 : E.dir) == "string" ? E.dir : void 0
        });
      });
    } catch (m) {
      console.warn("workspaces registry unreadable:", m);
    }
    try {
      const m = await e.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((m == null ? void 0 : m.repos) || []).forEach((_) => {
        _ != null && _.owner && (_ != null && _.repo) && p.push({ repo: `${_.owner}/${_.repo}`, source: "issue-radar", detail: `${_.provider || "github"} · ${_.host || "github.com"}` });
      });
    } catch (m) {
      console.warn("issue-radar config unreadable (app may not be installed):", m);
    }
    z(p), await o, O(!0);
  }, [e, Ne]), $t = se(async (o) => {
    const p = (/* @__PURE__ */ new Date()).toISOString(), m = "pl-" + Math.random().toString(36).slice(2, 10);
    await de((_) => {
      _.pipelines = _.pipelines || [];
      const j = _.pipelines.find((E) => E.repo === o.repo);
      j ? (j.source = o.source, j.workspace = o.workspace, o.repo_path ? j.repo_path = o.repo_path : delete j.repo_path, j.trust = o.trust, j.depth = o.depth, o.budget ? j.budget = o.budget : delete j.budget, j.backlog_intake = o.backlog_intake, j.results_in_repo = o.results_in_repo, j.conversation_log = o.conversation_log, o.trusted_authors.length ? j.trusted_authors = o.trusted_authors : delete j.trusted_authors, j.self_enabling = o.self_enabling, j.approach = o.approach, o.sync_mode ? j.sync_mode = o.sync_mode : delete j.sync_mode, j.steps = o.steps) : _.pipelines.push({
        id: m,
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
    }), O(!1), D(null), k(/* @__PURE__ */ new Set([o.repo]));
  }, [de]), Mt = se(async (o) => {
    await de((p) => {
      p.pipelines = (p.pipelines || []).filter((m) => m.repo !== o), p.cards = (p.cards || []).filter((m) => {
        var _;
        return (((_ = m.source) == null ? void 0 : _.repo) || "unlinked") !== o;
      });
    }), k((p) => {
      const m = new Set(p);
      return m.delete(o), m;
    });
  }, [de]), ut = $e(() => {
    const o = /* @__PURE__ */ new Set(["retired", "cancelled", "canceled", "merged", "superseded"]);
    return st.reduce((p, m) => (p[m] = ne.filter((_) => _.stage === m && !o.has(String(_.lifecycle || ""))), p), {});
  }, [ne, st]), mt = $e(
    () => ne.filter((o) => ["retired", "merged"].includes(String(o.lifecycle || ""))),
    [ne]
  ), vt = $e(
    () => ne.filter((o) => ["cancelled", "canceled", "superseded"].includes(String(o.lifecycle || ""))),
    [ne]
  ), Dt = se((o) => {
    var p;
    (p = document.getElementById(`stage-col-${o}`)) == null || p.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), Tt = $e(() => {
    const o = {};
    return ne.forEach((p) => {
      var _;
      const m = ((_ = p.source) == null ? void 0 : _.repo) || "unlinked";
      (o[m] || (o[m] = [])).push(p);
    }), o;
  }, [ne]), Rt = $e(() => {
    const o = {};
    return ne.forEach((p) => {
      const m = I(p.stage);
      (o[m] || (o[m] = [])).push(p);
    }), o;
  }, [ne, I]), Bt = $e(() => {
    const o = Object.fromEntries(ur.map((p) => [p, []]));
    return ne.forEach((p) => {
      var E, U;
      const m = l.find((B) => B.id === p.pipeline_id) || l.find((B) => {
        var V;
        return B.repo === ((V = p.source) == null ? void 0 : V.repo);
      }), _ = ((U = (E = m == null ? void 0 : m.steps) == null ? void 0 : E.find((B) => B.id === p.stage)) == null ? void 0 : U.type) === "gate" || N(p.stage), j = ue.some((B) => B.cardId === p.id && B.step === p.stage && B.live);
      o[hr(p, { isGate: _, liveObserved: j }).kind].push(p);
    }), Object.fromEntries(ur.filter((p) => o[p].length > 0).map((p) => [Sr[p].label, o[p]]));
  }, [ne, l, N, ue]), ht = /* @__PURE__ */ new Set(["retired", "merged", "cancelled", "canceled", "superseded"]), v = ne.filter((o) => !ht.has(String(o.lifecycle || ""))).length, R = ne.filter((o) => N(o.stage) && !ht.has(String(o.lifecycle || ""))).length, xe = ne.filter((o) => ht.has(String(o.lifecycle || ""))).length, fe = ne.reduce((o, p) => {
    var m;
    return o + (((m = p.parked) == null ? void 0 : m.length) || 0);
  }, 0), pe = {
    pipeline: ne.length,
    workspace: Object.keys(Tt).length,
    crew: Object.keys(Rt).length,
    status: ne.length,
    backlog: fe
  }, Xe = ue.some((o) => {
    var p, m;
    return !!o.slotKey && ((p = Y[o.slotKey]) == null ? void 0 : p.active) && ((m = Y[o.slotKey]) == null ? void 0 : m.phase) === "generating";
  }), zt = ue.some((o) => {
    var p, m;
    return !!o.slotKey && ((p = Y[o.slotKey]) == null ? void 0 : p.active) && ((m = Y[o.slotKey]) == null ? void 0 : m.phase) === "thinking";
  }), gt = (o) => {
    var L, je, Ge, He;
    const p = l.find((te) => te.id === o.pipeline_id) || l.find((te) => {
      var ie;
      return te.repo === ((ie = o.source) == null ? void 0 : ie.repo);
    }), m = ((je = (L = p == null ? void 0 : p.steps) == null ? void 0 : L.find((te) => te.id === o.stage)) == null ? void 0 : je.type) === "gate" || N(o.stage), _ = ["cancelled", "canceled", "retired", "merged", "superseded"].includes(String(o.lifecycle || "")), j = m && !_, E = j ? ((Ge = o.gate_review) == null ? void 0 : Ge.result_revision) ?? null : void 0, U = j ? be(o) : void 0, B = j ? Se(o) : void 0, V = ue.some((te) => te.cardId === o.id && te.step === o.stage && te.live), oe = hr(o, { isGate: j, liveObserved: V }), K = (He = p == null ? void 0 : p.steps) == null ? void 0 : He.find((te) => te.id === o.stage), Z = o.capability || (K == null ? void 0 : K.capability) || "auto-derived";
    return {
      card: o,
      config: c,
      isGate: j,
      cardStatus: oe,
      effectiveCapability: Z,
      producerStep: U,
      producerSession: B,
      onOpenProducer: B ? () => r(`/chat?sid=${encodeURIComponent(B.slotKey)}`) : void 0,
      onApprove: j ? () => wt(o.id, o.stage, { type: "approve" }, E) : void 0,
      onReject: j ? (te) => wt(o.id, o.stage, { type: "reject", reason: te }, E) : void 0,
      onCycleTrust: () => er(o.id),
      onCycleDepth: () => qt(o.id),
      onSetBudget: (te) => Lt(o.id, te),
      onInterject: (te, ie) => wt(
        o.id,
        o.stage,
        { type: "interject", kind: te, text: ie },
        E
      ),
      onResolveDecision: (te, ie) => lt(o.id, te, ie),
      onOpenOrchestrator: () => Qt(o),
      liveView: (() => {
        var it, Pt, Wt, Ut;
        const te = (Pt = (it = o.step_sessions) == null ? void 0 : it[o.stage]) == null ? void 0 : Pt.slot_key, ie = te ? Y[te] : void 0, We = ue.some((Ke) => Ke.cardId === o.id && Ke.step === o.stage && Ke.live), Le = zr((Wt = o.step_progress) == null ? void 0 : Wt[o.stage]);
        if (ie != null && ie.active)
          return {
            stage: o.stage,
            phase: ie.phase || "running",
            tail: ie.tail || "",
            active: !!ie.active && We,
            seq: ie.seq || 0,
            slotKey: te,
            onOpen: () => r(`/chat?sid=${encodeURIComponent(te)}`)
          };
        if (Le && (We || ((Ut = o.step_status) == null ? void 0 : Ut[o.stage]) === "pending"))
          return {
            stage: o.stage,
            phase: Le.phase,
            tail: Le.tail,
            active: !!We,
            seq: Le.seq,
            slotKey: te || "",
            source: "progress-trail",
            onOpen: () => te && r(`/chat?sid=${encodeURIComponent(te)}`)
          };
      })(),
      allCards: ne,
      onRequest: (te, ie) => Nt(o.id, te, ie),
      onOpenStepSession: (() => {
        const te = o.step_sessions;
        if (!te || typeof te != "object") return;
        const ie = Object.entries(te).map(([We, Le]) => {
          const it = (Le == null ? void 0 : Le.slot_key) || (Le != null && Le.session_key ? Le.session_key.replace(/^cron:/, "cron-") : void 0);
          return it ? { step: We, open: () => r(`/chat?sid=${encodeURIComponent(it)}`) } : null;
        }).filter((We) => We !== null);
        return ie.length ? ie : void 0;
      })(),
      onCancelCard: () => _t(o.id),
      onOpenCard: (te) => {
        const ie = document.getElementById(`card-${te}`);
        if (ie) {
          ie.scrollIntoView({ behavior: "smooth", block: "center" });
          const We = ie.style.outline;
          ie.style.outline = "2px solid var(--accent)", setTimeout(() => {
            ie.style.outline = We;
          }, 1400);
        }
      }
    };
  };
  return /* @__PURE__ */ a(Fe, { children: [
    /* @__PURE__ */ t(Or, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    he && /* @__PURE__ */ t(
      or,
      {
        profiles: J,
        crews: X,
        loading: le,
        context: x.size === 1 ? [...x][0] : void 0,
        onRefresh: () => {
          Ne();
        },
        onSaveCrew: Je,
        onClose: () => ke(!1)
      }
    ),
    P && /* @__PURE__ */ t(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (o) => {
          o.currentTarget === o.target && ee(!1);
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
                /* @__PURE__ */ t("button", { onClick: () => ee(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
              ] }),
              /* @__PURE__ */ t("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ t(
                za,
                {
                  pipeline: l.find((o) => ne.some((p) => p.pipeline_id === o.id)) || l[0],
                  cards: ne,
                  extras: u,
                  onOpenCard: (o) => {
                    ee(!1), g("pipeline"), setTimeout(() => {
                      const p = document.getElementById(`card-${o}`);
                      if (p) {
                        p.scrollIntoView({ behavior: "smooth", block: "center" });
                        const m = p.style.outline;
                        p.style.outline = "2px solid var(--accent)", setTimeout(() => {
                          p.style.outline = m;
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
    Re && /* @__PURE__ */ t(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (o) => {
          o.currentTarget === o.target && Ae(!1);
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
                  fe ? ` · ${fe}` : ""
                ] }),
                /* @__PURE__ */ t("button", { onClick: () => Ae(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
              ] }),
              /* @__PURE__ */ t("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ t(Pa, { cards: ne }) })
            ]
          }
        )
      }
    ),
    Ce && /* @__PURE__ */ t(
      qa,
      {
        cards: ne,
        schedulerState: u.scheduler_state,
        statePath: rt,
        readAppFile: ce,
        onClose: () => C(!1)
      }
    ),
    Te && /* @__PURE__ */ t(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (o) => {
          o.currentTarget === o.target && Q(!1);
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
                    /* @__PURE__ */ t("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: ue.length })
                  ] }),
                  /* @__PURE__ */ t("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "Live activity from enabled chats linked to pipeline cards." })
                ] }),
                /* @__PURE__ */ t(
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
              /* @__PURE__ */ t("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: ue.length === 0 ? /* @__PURE__ */ t("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : ue.map((o) => {
                const p = o.slotKey ? Y[o.slotKey] : void 0;
                return /* @__PURE__ */ a(
                  "div",
                  {
                    className: "rounded-lg px-3 py-2.5",
                    style: { background: o.responsePending ? "color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))" : "var(--bg, transparent)", border: "1px solid var(--border)" },
                    children: [
                      /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-[11px] min-w-0", children: [
                        /* @__PURE__ */ t(
                          "span",
                          {
                            className: o.status === "pending" || o.responsePending ? "inline-block animate-pulse flex-shrink-0" : "inline-block flex-shrink-0",
                            style: { width: 7, height: 7, borderRadius: 999, background: o.stale ? "var(--warn)" : o.responsePending || o.status === "pending" ? "var(--accent)" : "var(--muted)" }
                          }
                        ),
                        /* @__PURE__ */ t("span", { className: "font-semibold flex-shrink-0", style: { color: "var(--accent)" }, title: o.sessionName || void 0, children: o.agent }),
                        /* @__PURE__ */ a("span", { className: "truncate", style: { color: "var(--muted)" }, children: [
                          "· ",
                          o.step
                        ] }),
                        /* @__PURE__ */ t("span", { className: "ml-auto truncate max-w-[220px]", style: { color: "var(--text, var(--muted))" }, title: o.card, children: o.card }),
                        /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: o.responsePending ? "var(--warn)" : o.status === "pending" ? "var(--ok)" : "var(--muted)" }, children: o.responsePending ? "response" : o.status }),
                        o.stale && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, title: "stale — will be reclaimed", children: "↻" })
                      ] }),
                      (p == null ? void 0 : p.active) && p.phase === "thinking" && /* @__PURE__ */ a("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                        /* @__PURE__ */ t(kt, { size: 13 }),
                        /* @__PURE__ */ t("span", { children: "Thinking" })
                      ] }),
                      (p == null ? void 0 : p.active) && p.phase === "generating" && p.tail && /* @__PURE__ */ a("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                        /* @__PURE__ */ t("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                        /* @__PURE__ */ a("span", { className: "font-mono text-[11px] truncate", children: [
                          "Generating · …",
                          p.tail
                        ] })
                      ] }),
                      o.slotKey && /* @__PURE__ */ a(
                        "button",
                        {
                          className: "mt-2 ml-4 font-mono",
                          style: { color: "var(--muted)", fontSize: 10, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
                          title: `Copy openable slot ${o.slotKey} (${o.sessionName || o.sessionKey}); open it from Chats`,
                          onClick: () => {
                            var m;
                            try {
                              (m = navigator.clipboard) == null || m.writeText(o.slotKey || "");
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
    M && /* @__PURE__ */ t(
      yr,
      {
        candidates: $,
        existingRepos: new Set(l.map((o) => o.repo)),
        defaults: c,
        agentProfiles: J,
        crews: X,
        onCreate: $t,
        onSaveCrew: Je,
        onClose: () => O(!1)
      }
    ),
    A && /* @__PURE__ */ t(
      yr,
      {
        candidates: $,
        existingRepos: new Set(l.map((o) => o.repo)),
        defaults: c,
        agentProfiles: J,
        crews: X,
        editPipeline: l.find((o) => o.repo === A) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + A, repo: A, source: "manual", trust: c.trust, depth: c.depth, backlog_intake: !0, sot: "github", steps: Yt.map((o) => ({ ...o })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: n.filter((o) => {
          var p;
          return (((p = o.source) == null ? void 0 : p.repo) || "unlinked") === A;
        }).length,
        isExample: jr.has(A),
        onCreate: $t,
        onSaveCrew: Je,
        onDelete: Mt,
        onClose: () => D(null)
      }
    ),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ t(Aa, { steps: ze, cardsByStage: ut, onNodeClick: Dt }),
      /* @__PURE__ */ a("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3", children: [
        /* @__PURE__ */ t(Ft, { label: "Active", value: String(v), accent: !0 }),
        /* @__PURE__ */ t(Ft, { label: "Gated", value: String(R) }),
        /* @__PURE__ */ t(Ft, { label: "Done", value: String(xe) }),
        /* @__PURE__ */ t(Ft, { label: "Parked", value: String(fe) })
      ] }),
      /* @__PURE__ */ t(
        aa,
        {
          repos: ot.map((o) => o.name),
          selectedRepos: [...x],
          onNewPipeline: () => {
            St();
          },
          onConfigure: Ee,
          onOpenAgents: qe
        }
      ),
      /* @__PURE__ */ a("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ t(
          Wa,
          {
            repos: ot,
            selected: x,
            onToggle: It,
            onClear: Ct,
            onAddWorkspace: St,
            onEdit: Ee
          }
        ),
        /* @__PURE__ */ a("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ a("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ t(ja, { active: f, onChange: g, counts: pe }),
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
                  /* @__PURE__ */ t("span", { className: "font-semibold", children: "Tree" })
                ]
              }
            ),
            /* @__PURE__ */ a(
              "button",
              {
                onClick: () => Ae(!0),
                "aria-haspopup": "dialog",
                className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Parked backlog ideas",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                children: [
                  "📋 ",
                  /* @__PURE__ */ t("span", { className: "font-semibold", children: "Backlog" }),
                  fe ? /* @__PURE__ */ a("span", { style: { color: "var(--accent)" }, children: [
                    "· ",
                    fe
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
                onClick: () => Q(!0),
                "aria-haspopup": "dialog",
                "aria-expanded": Te,
                className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Open enabled agent sessions and see live activity",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: Xe || zt || ue.some((o) => o.status === "pending" || o.responsePending) ? "var(--accent)" : "var(--muted)" },
                children: [
                  zt ? /* @__PURE__ */ t(kt, { size: 11 }) : /* @__PURE__ */ t(
                    "span",
                    {
                      className: Xe || ue.some((o) => o.status === "pending" || o.responsePending) ? "inline-block animate-pulse" : "inline-block",
                      style: { width: 7, height: 7, borderRadius: 999, background: Xe ? "var(--ok)" : ue.some((o) => o.responsePending) ? "var(--warn)" : ue.some((o) => o.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: ue.length ? 1 : 0.5 }
                    }
                  ),
                  /* @__PURE__ */ t("span", { className: "font-semibold", children: ue.length ? `${ue.length} session${ue.length === 1 ? "" : "s"}` : "no sessions" }),
                  zt && /* @__PURE__ */ t("span", { children: "· thinking" }),
                  Xe && /* @__PURE__ */ t("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                  !zt && !Xe && ue.filter((o) => o.status === "pending").length > 0 && /* @__PURE__ */ a("span", { children: [
                    "· ",
                    ue.filter((o) => o.status === "pending").length,
                    " running"
                  ] }),
                  ue.some((o) => o.responsePending) && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, children: "· response" }),
                  ue.some((o) => o.stale) && /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
                    "· ",
                    ue.filter((o) => o.stale).length,
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
                  /* @__PURE__ */ t("button", { onClick: Ct, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ t(Da, { config: c, onSet: Qe }),
          h ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : /* @__PURE__ */ a("div", { ref: we, className: "flex gap-3 overflow-x-auto pb-4", children: [
            f === "pipeline" && ze.map((o) => /* @__PURE__ */ t(ft, { id: `stage-col-${o.id}`, title: o.name, count: (ut[o.id] || []).length, children: (ut[o.id] || []).map((p) => /* @__PURE__ */ t(xt, { ...gt(p) }, p.id)) }, o.id)),
            f === "pipeline" && mt.length > 0 && /* @__PURE__ */ t("div", { className: "flex-shrink-0 pl-3", style: { borderLeft: "2px dashed var(--border-strong, var(--border))" }, children: /* @__PURE__ */ t(ft, { id: "stage-col-done", title: "✅ Done", count: mt.length, children: mt.map((o) => /* @__PURE__ */ t(xt, { ...gt(o) }, o.id)) }) }),
            f === "pipeline" && vt.length > 0 && /* @__PURE__ */ t(ft, { id: "stage-col-cancelled", title: "⏹ Cancelled", count: vt.length, children: vt.map((o) => /* @__PURE__ */ t(xt, { ...gt(o) }, o.id)) }),
            f === "workspace" && Object.entries(Tt).map(([o, p]) => /* @__PURE__ */ t(ft, { title: o, count: p.length, children: p.map((m) => /* @__PURE__ */ t(xt, { ...gt(m) }, m.id)) }, o)),
            f === "crew" && Object.entries(Rt).map(([o, p]) => /* @__PURE__ */ t(ft, { title: o, count: p.length, children: p.map((m) => /* @__PURE__ */ t(xt, { ...gt(m) }, m.id)) }, o)),
            f === "status" && Object.entries(Bt).map(([o, p]) => /* @__PURE__ */ t(ft, { title: o, count: p.length, children: p.map((m) => /* @__PURE__ */ t(xt, { ...gt(m) }, m.id)) }, o))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  tn as default
};
