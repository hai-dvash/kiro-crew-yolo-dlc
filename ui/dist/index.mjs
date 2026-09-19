import { jsx as t, Fragment as Ge, jsxs as a } from "react/jsx-runtime";
import { useChatLauncher as wr, useAppApi as Nr, useNavigate as Lr } from "@kirocrew/app-sdk";
import { PageHeader as qr, StatCard as Gt } from "@kirocrew/app-sdk/ui";
import { useState as w, useCallback as le, useEffect as De, useMemo as Te, useRef as Ie } from "react";
const Ir = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), Mr = /^[.,!?;:%)\]}]$/u, Dr = /^[(\[{]$/u;
function Br(e, r = 3) {
  const s = (String(e || "").match(Ir) || []).slice(-Math.max(0, r));
  return s.reduce((l, d, u) => {
    if (u === 0) return d;
    const i = s[u - 1];
    return Mr.test(d) || Dr.test(i) ? l + d : l + " " + d;
  }, "");
}
function lr(e, r = !1) {
  return e != null && e.active && !r ? e : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function zr(e, r, n) {
  if (!r || e != null && e.active && Number.isFinite(n) && Number.isFinite(e.seq) && n <= e.seq)
    return e;
  const l = ((e != null && e.active ? e.buffer : "") + r).slice(-512);
  return { buffer: l, tail: Br(l, 3), active: !0, phase: "generating", seq: Number(n) || 0 };
}
function Pr(e) {
  return e && { ...e, active: !1, phase: "idle" };
}
function Wr(e) {
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
const Ur = /* @__PURE__ */ new Set(["done", "advanced"]), Fr = /* @__PURE__ */ new Set([
  "done",
  "advanced",
  "completed",
  "consumed",
  "integrated",
  "waived",
  "omitted"
]), Xe = (e) => !!e && typeof e == "object" && !Array.isArray(e), K = (e) => Xe(e) ? e : {}, ke = (e) => Array.isArray(e) ? e : e == null ? [] : [e], W = (...e) => e.find((r) => r != null && r !== "");
function at(e) {
  if (e == null || e === "") return "unobservable";
  if (typeof e == "boolean") return e ? "yes" : "no";
  if (typeof e == "string" || typeof e == "number") return String(e);
  if (Array.isArray(e)) return e.length ? e.map(at).join(" · ") : "none";
  if (Xe(e)) {
    const r = Object.entries(e);
    return r.length ? r.map(([n, s]) => `${n}: ${at(s)}`).join(" · ") : "none";
  }
  return String(e);
}
function Qe(e) {
  return ke(e).map((r, n) => {
    if (!Xe(r))
      return { key: `item-${n}`, title: at(r), detail: null, status: null, level: null, ref: null, url: null };
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
      detail: l == null || String(l) === String(s) ? null : at(l),
      status: u == null ? null : String(u),
      level: d == null ? null : String(d),
      ref: i == null ? null : String(i),
      url: c
    };
  });
}
function Gr(e) {
  return ke(e).filter((r) => r != null).map((r, n) => {
    const s = K(r), l = Xe(r) ? W(s.url, s.path, s.ref, s.id) : String(r), d = Xe(r) ? W(s.label, s.name, s.kind, s.id, s.path, s.ref, `artifact ${n + 1}`) : String(r), u = W(s.url, typeof l == "string" && /^https?:\/\//.test(l) ? l : void 0), i = W(s.preview, s.summary, s.description, s.evidence, s.detail);
    return {
      key: String(W(s.id, s.path, s.ref, `artifact-${n}`)),
      label: String(d),
      ref: l == null ? null : String(l),
      url: typeof u == "string" && /^https?:\/\//.test(u) ? u : null,
      preview: i == null ? null : at(i),
      kind: s.kind == null ? null : String(s.kind),
      status: s.status == null ? null : String(s.status)
    };
  });
}
function Hr(e) {
  return ke(e.children).map((n, s) => {
    const l = K(n), d = l.required !== !1 && !["optional", "preferred", "advisory"].includes(
      String(W(l.enforcement, l.level, "required")).toLowerCase()
    ), u = String(W(l.status, l.state, "unobservable"));
    return {
      key: String(W(l.id, l.card_id, l.issue, `child-${s}`)),
      label: String(W(l.title, l.name, l.card_id, l.id, l.issue, `child ${s + 1}`)),
      required: d,
      status: u,
      complete: Fr.has(u.toLowerCase())
    };
  });
}
const _r = /* @__PURE__ */ new Set([
  "done",
  "completed",
  "covered",
  "satisfied",
  "validated",
  "met",
  "passed",
  "approved"
]);
function Kr(e, r) {
  const n = K(e == null ? void 0 : e.execution_envelope);
  return n.step === r ? n : ke(e == null ? void 0 : e.execution_envelope_history).map(K).reverse().find((s) => s.step === r) || {};
}
function Cr(e) {
  return typeof e == "string" ? e.trim().length > 0 : Xe(e) ? [
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
function ir(e, r) {
  const n = ke(e.validation_and_evidence).map(K);
  return ke(r).map(String).filter((s) => !n.some((l) => {
    const d = String(W(l.kind, l.type, l.id, "")).toLowerCase(), u = String(W(l.status, "")).toLowerCase();
    return (d === s.toLowerCase() || ke(l.satisfies).map(String).includes(s)) && _r.has(u) && Cr(l);
  }));
}
function Vr(e, r) {
  const n = ke(e.findings).map(K);
  if (!n.length) return !1;
  if (!r) return !0;
  const s = ke(W(e.sources, e.consulted_sources)).map(K).filter((d) => typeof d.url == "string" && /^https?:\/\//.test(d.url) && d.title && d.accessed_at && W(d.source_type, d.type)), l = new Set(s.flatMap((d) => [d.id && String(d.id), d.url]).filter(Boolean));
  return l.size > 0 && n.every((d) => {
    const u = ke(W(d.source_ids, d.sources)).map(String);
    return d.claim && u.some((i) => l.has(i));
  });
}
function Yr(e, r, n, s) {
  const l = K(e == null ? void 0 : e.intent_integrity), d = l.status === "violation" ? [`intent integrity (${ke(l.violations).join(", ")})`] : [], u = Kr(e, r), i = ke(K(u.observations).controls_runtime);
  if (Number(u.schema_version || 0) < 2 || !i.includes("result_scope"))
    return { missing: d, preferredShortfalls: [] };
  const c = [...d], b = [];
  n.envelope_id !== u.id && c.push("result bound to the active envelope revision");
  const h = ke(e == null ? void 0 : e.decisions).map(K).filter((y) => y.step && y.step !== r || y.envelope_id && y.envelope_id !== u.id ? !1 : y.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(y.kind)), S = h.filter((y) => {
    const J = String(W(y.status, "")).toLowerCase();
    return y.chosen === void 0 && y.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(J);
  }), f = K(u.questions);
  S.length && c.push("all qualified questions resolved before completion"), S.length > 1 && f.cadence === "one-at-a-time" && c.push("one-at-a-time question cadence"), Number.isInteger(f.max_rounds) && h.length > f.max_rounds && c.push(`question rounds within max_rounds=${f.max_rounds}`);
  const g = K(u.result_scope), x = K(g.enforcement), k = new Map(ke(s.intent_and_requirement_coverage).map(K).filter((y) => W(y.intent_id, y.constraint_id, y.id)).map((y) => [String(W(y.intent_id, y.constraint_id, y.id)), y]));
  for (const y of [...ke(g.required_outcome_ids), ...ke(g.hard_constraint_ids)]) {
    const J = k.get(String(y)) || {}, T = String(W(J.status, "")).toLowerCase(), ge = ke(W(J.evidence_refs, J.requirement_refs, J.refs));
    (!_r.has(T) || !ge.some(Cr)) && c.push(`required intent coverage ${y}`);
  }
  const M = ke(s.alternatives);
  if (Number.isInteger(g.alternatives) && M.length < g.alternatives) {
    const y = `${g.alternatives} material alternatives`;
    x.alternatives === "required" ? c.push(y) : x.alternatives === "preferred" && b.push(y);
  }
  const E = ir(s, g.evidence), A = ir(s, g.validation);
  x.evidence === "required" ? c.push(...E.map((y) => `required evidence ${y.toLowerCase()}`)) : x.evidence === "preferred" && b.push(...E.map((y) => `preferred evidence ${y.toLowerCase()}`)), x.validation === "required" ? c.push(...A.map((y) => `required validation ${y.toLowerCase()}`)) : x.validation === "preferred" && b.push(...A.map((y) => `preferred validation ${y.toLowerCase()}`));
  const D = K(u.research_policy), $ = K(e == null ? void 0 : e.research_artifacts)[r], z = ke(W(s.research_and_citations, $)).map(K), X = z.filter((y) => Vr(
    y,
    D.citations === "required"
  ));
  return D.mode === "required" && !X.length && c.push("required research with claim-level citations"), Number.isInteger(D.max_passes) && z.length > D.max_passes && c.push(`research passes within max_passes=${D.max_passes}`), D.mode === "on-demand" && z.length && !X.length && b.push("complete citations for used research"), {
    missing: [...new Set(c)],
    preferredShortfalls: [...new Set(b)]
  };
}
function Xr(e, r, n) {
  const s = K(e.runtime_handshakes), l = K(e.runtime_handshake), d = K(s[r] || (l.step == null || l.step === r ? l : {})), u = K(d.assignment), i = K(d.capabilities), c = K(i.tools), b = K(i.skills), h = K(d.routing), S = K(h.model), f = K(h.reasoning_effort), g = K(d.scope), x = K(g.worktree), k = K(n.routing_and_provenance), M = K(k.model), E = K(k.reasoning_effort), A = K(k.assignment), D = W(c.profile_declared, c.declared, k.declared_tools), $ = W(c.actual, k.actual_tools), z = W(b.profile_declared, b.declared, k.declared_skills), X = W(b.actual, k.actual_skills);
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
      requested: W(E.requested, k.requested_effort, f.requested) ?? null,
      applied: W(E.applied, k.applied_effort, f.applied) ?? null,
      status: W(
        E.status,
        k.effort_resolution_status,
        f.status,
        W(E.applied, k.applied_effort, f.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: D == null ? null : ke(D),
      actual: $ == null ? null : ke($),
      status: W(c.status, k.tools_status, $ != null ? "observed" : "unobservable")
    },
    skills: {
      declared: z == null ? null : ke(z),
      actual: X == null ? null : ke(X),
      status: W(b.status, k.skills_status, X != null ? "observed" : "unobservable")
    },
    network: K(g.network),
    write: K(g.write),
    worktree: Object.keys(x).length ? x : null
  };
}
function Zr(e, r) {
  const n = K(e == null ? void 0 : e.gate_review), s = K(n.bundle), l = W(n.gate, e == null ? void 0 : e.stage), d = W(n.producer_step, r), u = K(e == null ? void 0 : e.step_sessions), i = Number.isInteger(n.result_revision) ? n.result_revision : null, c = W(n.status, "unobservable"), b = d ? K(e == null ? void 0 : e.step_status)[d] : void 0, h = Gr(s.artifacts), S = K(s.card_topology), f = Hr(S), g = W(S.action, "unobservable"), x = ["fan-in", "unify"].includes(String(g).toLowerCase()), k = x ? f.filter((X) => X.required && !X.complete) : [], M = [];
  (!(e != null && e.gate_review) || !Xe(e.gate_review)) && M.push("result bundle record"), (!n.bundle || !Xe(n.bundle)) && M.push("declared result bundle"), d || M.push("producer binding"), i === null && M.push("result revision"), l && (e != null && e.stage) && l !== e.stage && M.push("gate binding matches current stage"), c !== "awaiting-review" && M.push(`review status awaiting-review (currently ${c})`), Ur.has(String(b || "").toLowerCase()) || M.push(`terminal producer status (currently ${b || "unobservable"})`), W(s.summary) || M.push("result summary"), h.length === 0 && M.push("referenced artifact");
  const E = h.filter((X) => !X.ref);
  E.length > 0 && M.push(`artifact reference (${E.length} missing)`), x && f.length === 0 && M.push("declared fan-in child set"), k.length > 0 && M.push(`required child fan-in (${k.length} incomplete)`);
  const A = Yr(e, d, n, s);
  M.push(...A.missing);
  const D = ke(e == null ? void 0 : e.decisions).filter((X) => {
    const y = K(X);
    return !y.chosen && (!d || !y.step || y.step === d);
  }), $ = Qe([
    ...ke(s.decisions_and_questions),
    ...D
  ]), z = Xr(e || {}, d, s);
  return {
    gate: l || null,
    producerStep: d || null,
    producerSessionRef: W(
      n.producer_session_ref,
      d && Xe(u[d]) ? `step_sessions.${d}` : void 0
    ) || null,
    envelopeId: W(n.envelope_id) || null,
    revision: i,
    reviewStatus: c,
    createdAt: W(n.created_at) || null,
    ready: M.length === 0,
    missing: M,
    summary: W(s.summary) || null,
    changes: Qe(s.changes_since_prior),
    artifacts: h,
    coverage: Qe(s.intent_and_requirement_coverage),
    alternatives: Qe(s.alternatives),
    research: Qe(W(
      s.research_and_citations,
      d && K(e == null ? void 0 : e.research_artifacts)[d]
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
      allocated: K(s.budget).allocated ?? null,
      consumed: K(s.budget).consumed ?? null,
      remaining: K(s.budget).remaining ?? null
    },
    routing: z,
    validation: Qe(s.validation_and_evidence),
    risks: Qe(s.known_risks),
    deviations: Qe(s.omissions_and_deviations)
  };
}
const Jr = "~/.dlc-yolo/.statepath", ar = "~/.dlc-yolo/state.json", cr = "/tmp/dlc-yolo/state.json", Qr = 1, dr = 4096, ea = 3072;
function ta(e) {
  let r = e;
  if (typeof e == "string") {
    if (new TextEncoder().encode(e).length > dr) return null;
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
  if (new TextEncoder().encode(n).length > dr) return null;
  const s = Object.keys(r).sort();
  if (s.length !== 2 || s[0] !== "path" || s[1] !== "schema_version" || r.schema_version !== Qr || typeof r.path != "string") return null;
  const l = r.path;
  return !l.startsWith("/") || l.length === 0 || l.length > ea || l.includes("\0") || l.includes("\r") || l.includes(`
`) || l.split("/").some((d) => d === "." || d === "..") ? null : l;
}
async function Yt(e) {
  try {
    const r = await e(Jr), n = ta(r);
    if (n)
      try {
        return { path: n, data: await e(n), source: "pointer" };
      } catch {
      }
  } catch {
  }
  try {
    return { path: ar, data: await e(ar), source: "durable" };
  } catch {
    return { path: cr, data: await e(cr), source: "scratch" };
  }
}
async function pr(e, r) {
  try {
    return { path: r, data: await e(r), source: "current" };
  } catch {
    return Yt(e);
  }
}
const ra = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
function aa(e) {
  const r = /* @__PURE__ */ new Map();
  for (const n of String(e || "").split(/[\n,]/)) {
    const s = n.trim();
    ra.test(s) && !r.has(s.toLowerCase()) && r.set(s.toLowerCase(), s);
  }
  return [...r.values()].sort((n, s) => n.toLowerCase().localeCompare(s.toLowerCase()));
}
const na = {
  "receiver-disabled": "Enable and save the receiver above first.",
  "receiver-secret-missing": "Set a webhook secret above before exposing the port.",
  "receiver-allowlist-empty": "Add at least one allowed repository above first.",
  "receiver-port-mismatch": "Save the receiver on this port before starting the tunnel.",
  "receiver-not-listening": "The receiver is not listening yet — save it, then Refresh.",
  "receiver-config-invalid": "Repair the stored receiver configuration first."
};
function ur(e) {
  return e === "listening" ? "var(--ok)" : e === "misconfigured" || e === "failed" ? "var(--danger, #ef4444)" : "var(--muted)";
}
function Et(e) {
  const r = (e == null ? void 0 : e.message) || String(e);
  return /(?:404|not found)/i.test(r) ? "Webhook backend unavailable in the running gateway. Restart KiroCrew after syncing this app, then refresh this tab." : r;
}
function Sr() {
  var G, Z;
  const e = Nr(), [r, n] = w(null), [s, l] = w(!1), [d, u] = w("8765"), [i, c] = w(""), [b, h] = w(""), [S, f] = w(""), [g, x] = w(!1), [k, M] = w(!1), [E, A] = w(!0), [D, $] = w(!1), [z, X] = w(""), y = le((O) => {
    n(O), l(!!O.enabled), u(String(O.port || 8765)), c((O.repositories || []).join(`
`)), h(O.inbox_path || ""), M(!!O.autosync), f(""), x(!1);
  }, []), J = le(async () => {
    A(!0), X("");
    try {
      y(await e.get("/apps/dlc-yolo/api/webhook/config"));
    } catch (O) {
      X(Et(O));
    } finally {
      A(!1);
    }
  }, [e, y]);
  De(() => {
    J();
  }, [J]);
  const [T, ge] = w(null), [we, ie] = w(!1), he = le(async () => {
    try {
      ge(await e.get("/apps/dlc-yolo/api/tunnel/status"));
    } catch {
      ge(null);
    }
  }, [e]);
  De(() => {
    he();
  }, [he]);
  const Re = le(async () => {
    ie(!0);
    try {
      ge(await e.post("/apps/dlc-yolo/api/tunnel/start", {}));
    } catch (O) {
      X(Et(O));
    } finally {
      ie(!1);
    }
  }, [e]), Q = le(async () => {
    ie(!0);
    try {
      ge(await e.post("/apps/dlc-yolo/api/tunnel/stop", {}));
    } catch (O) {
      X(Et(O));
    } finally {
      ie(!1);
    }
  }, [e]), [P, ee] = w(null), [Ae, je] = w(!1), Se = le(async () => {
    try {
      ee(await e.get("/apps/dlc-yolo/api/crons/status"));
    } catch {
      ee(null);
    }
  }, [e]);
  De(() => {
    Se();
  }, [Se]);
  const C = le(async (O) => {
    je(!0);
    try {
      const ce = O ? "/apps/dlc-yolo/api/crons/pause" : "/apps/dlc-yolo/api/crons/resume";
      ee(await e.post(ce, {}));
    } catch (ce) {
      X(Et(ce));
    } finally {
      je(!1);
    }
  }, [e]), U = Te(() => aa(i), [i]), oe = Number(d), Ne = typeof TextEncoder > "u" ? S.length : new TextEncoder().encode(S).length, Le = !!(r != null && r.secret_configured) || Ne >= 32, re = Number.isInteger(oe) && oe >= 1024 && oe <= 65535 && (!s || U.length > 0 && Le) && (!b.trim() || b.trim().startsWith("/")), be = async () => {
    if (!(!(r != null && r.editable) || !re)) {
      $(!0), X("");
      try {
        const O = {
          enabled: s,
          port: oe,
          repositories: U,
          inbox_path: b.trim() || null,
          clear_secret: g,
          autosync: k
        };
        S && (O.secret = S), y(await e.post("/apps/dlc-yolo/api/webhook/config", O));
      } catch (O) {
        X(Et(O));
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
                style: { color: ur(r.listener), background: `color-mix(in srgb, ${ur(r.listener)} 13%, transparent)` },
                children: r.listener
              }
            )
          ] }),
          /* @__PURE__ */ t("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "Shared by every pipeline. This authenticated control owns the app-wide loopback receiver; the secret is write-only and never returned." })
        ] }) }),
        /* @__PURE__ */ a("div", { className: "px-4 py-4 flex flex-col gap-4", children: [
          E ? /* @__PURE__ */ t("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: "Loading receiver configuration…" }) : r && /* @__PURE__ */ a(Ge, { children: [
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
                  onClick: () => l((O) => !O),
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
                      Number.isFinite(oe) ? oe : "—",
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
                  onChange: (O) => c(O.target.value),
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
                  onChange: (O) => h(O.target.value),
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
                  onChange: (O) => f(O.target.value),
                  placeholder: r.secret_configured ? "•••••••••••••••• (unchanged)" : "Enter a new secret",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            !s && r.secret_configured && r.editable && /* @__PURE__ */ a("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer", style: { color: "var(--muted)" }, children: [
              /* @__PURE__ */ t("input", { type: "checkbox", checked: g, onChange: (O) => x(O.target.checked) }),
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
                    /* @__PURE__ */ t("div", { style: { color: "var(--text)" }, children: ((Z = r.inbox) == null ? void 0 : Z.processed) ?? "—" })
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
                        onFocus: (O) => O.currentTarget.select(),
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
                        onFocus: (O) => O.currentTarget.select(),
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
                    na[T.receiver_block_reason || ""] || T.receiver_block_reason
                  ] }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    T != null && T.running ? /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Q(),
                        disabled: we,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--danger, #ef4444)", color: "var(--bg)" },
                        children: we ? "Stopping…" : "Stop tunnel"
                      }
                    ) : /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Re(),
                        disabled: we || !(T != null && T.installed) || (T == null ? void 0 : T.receiver_ready) === !1,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: we ? "Starting…" : "Start tunnel"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void he(),
                        disabled: we,
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
                        onChange: (O) => M(O.target.checked),
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
                  (T == null ? void 0 : T.autosync) && T.autosync.enabled && /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: T.autosync.error ? "var(--danger, #ef4444)" : "var(--ok)" }, children: T.autosync.error ? `Auto-sync failed: ${T.autosync.error}` : `Auto-synced ${(T.autosync.results || []).filter((O) => O.action === "updated").length} hook(s) → ${T.autosync.payload_url}` })
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
                  P && P.available && P.jobs.length > 0 && /* @__PURE__ */ t("div", { className: "flex flex-col gap-1", children: P.jobs.map((O) => /* @__PURE__ */ a(
                    "div",
                    {
                      className: "flex items-center justify-between text-[11px] font-mono",
                      style: { color: "var(--muted)" },
                      children: [
                        /* @__PURE__ */ t("span", { children: O.basename }),
                        /* @__PURE__ */ t("span", { style: { color: O.paused ? "var(--warn)" : "var(--ok)" }, children: O.paused ? "paused" : "active" })
                      ]
                    },
                    O.id
                  )) }),
                  /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void C(!0),
                        disabled: Ae || !(P != null && P.available) || (P == null ? void 0 : P.all_paused),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--warn)", color: "var(--bg)" },
                        children: Ae ? "…" : "Pause all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void C(!1),
                        disabled: Ae || !(P != null && P.available) || (P == null ? void 0 : P.any_active),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: Ae ? "…" : "Resume all"
                      }
                    ),
                    /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => void Se(),
                        disabled: Ae,
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
          /* @__PURE__ */ t("button", { onClick: () => void J(), disabled: E || D, className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50", style: { color: "var(--muted)" }, children: "Refresh status" }),
          (r == null ? void 0 : r.editable) && /* @__PURE__ */ t(
            "button",
            {
              onClick: () => void be(),
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
function oa({ repos: e, selectedRepos: r, onNewPipeline: n, onConfigure: s, onOpenAgents: l }) {
  const { openChat: d } = wr(), u = r.length === 1 ? r[0] : e.length === 1 ? e[0] : "", i = "/dlc-yolo", c = "text-[10px] leading-none px-1.5 py-1 rounded font-semibold";
  return /* @__PURE__ */ t(Ge, { children: /* @__PURE__ */ a("div", { "data-dlc-command-controls": !0, className: "mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap", children: [
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
const Ht = {
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
};
function Ot(e) {
  return e ? e.max_child_cards === "unlimited" && e.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth";
}
function sa({ budget: e, depth: r, onSave: n }) {
  const [s, l] = w(!1), [d, u] = w(Ot(e)), [i, c] = w(
    Ot(e) === "custom" ? { ...e } : { ...Ht[r] || Ht.standard }
  ), b = () => {
    const f = Ot(e);
    u(f), c(f === "custom" ? { ...e } : { ...Ht[r] || Ht.standard }), l(!0);
  }, h = () => {
    n(d === "depth" ? void 0 : d === "unlimited" ? {
      max_child_cards: "unlimited",
      effort_ceiling: "unlimited",
      max_feature_size: "XL",
      addenda: "proactive"
    } : { ...i }), l(!1);
  }, S = Ot(e) === "depth" ? "budget: depth" : Ot(e) === "unlimited" ? "budget: unlimited" : "budget: custom";
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
const mr = [
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
], $r = {
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
}, la = /* @__PURE__ */ new Set(["retired", "merged"]), vr = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked"]);
function ia(e) {
  const r = e == null ? void 0 : e.execution_schedule;
  if (!r || typeof r != "object") return null;
  const n = r.nodes;
  if (!n || typeof n != "object") return null;
  const s = r.current_node_id;
  return typeof s == "string" && n[s] && typeof n[s] == "object" ? n[s] : Object.values(n).find((l) => l && typeof l == "object" && l.step === e.stage) || null;
}
function hr(e, r) {
  const n = e == null ? void 0 : e[r], s = n && typeof n == "object" ? n[e.stage] : null;
  return typeof s == "string" && s.trim() ? s.trim() : null;
}
function ca(e, r) {
  const n = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", s = Array.isArray(e == null ? void 0 : e.decisions) ? e.decisions.filter((d) => d && !d.chosen && !d.resolved_at && (d.step === n || !d.step) && Array.isArray(d.options) && d.options.length) : [], l = (r || "").toLowerCase();
  return s.length ? { severity: "decision", label: "Choose an option", color: "var(--accent)" } : /capability|missing|not in inventory|no crew|external|unavailable|cannot proceed without a tool/.test(l) ? { severity: "hard", label: "Blocked · needs setup", color: "var(--danger)" } : /approv|confirm|sign.?off|awaiting.*human|needs.?you/.test(l) ? { severity: "approval", label: "Needs approval", color: "var(--warn)" } : { severity: "attention", label: "Needs input", color: "var(--warn)" };
}
function gr(e, { isGate: r = !1, liveObserved: n = !1 } = {}) {
  const s = typeof (e == null ? void 0 : e.stage) == "string" ? e.stage : "", l = typeof (e == null ? void 0 : e.lifecycle) == "string" ? e.lifecycle.toLowerCase() : "", d = e != null && e.step_status && typeof e.step_status == "object" ? String(e.step_status[s] || "") : "", u = ia(e), i = typeof (u == null ? void 0 : u.status) == "string" ? u.status : "", c = e != null && e.step_sessions && typeof e.step_sessions == "object" ? e.step_sessions[s] : null, b = vr.has(l) || i === "cancelling" || (c == null ? void 0 : c.writes_allowed) === !1 || !!(c != null && c.cancel_requested_at), h = s === "done" || la.has(l) || ["completed", "cancelled", "superseded"].includes(i);
  let S, f = null, g = null, x = null, k = null;
  if (h)
    S = "terminal", f = i === "cancelled" || vr.has(l) ? `terminal ${l || i}` : l || i || s || null;
  else if (b)
    S = "cancelling", f = "writes revoked; awaiting terminal observation";
  else if (d === "blocked" || i === "blocked") {
    S = "blocked", f = hr(e, "block_reason") || ((u == null ? void 0 : u.wait_reasons) || [])[0] || "step blocked";
    const E = ca(e, f);
    g = E.severity, x = E.label, k = E.color;
  } else d === "error" || i === "failed" ? (S = "error", f = hr(e, "error_reason") || (u == null ? void 0 : u.dispatch_error) || "step error") : r || i === "gate-wait" ? S = "waiting-gate" : n ? S = "running-observed" : d === "pending" || i === "running" ? (S = "pending-unconfirmed", f = "no current live observation") : ["queued", "dependency-wait", "permit-wait"].includes(i) ? (S = "queued", f = Array.isArray(u == null ? void 0 : u.wait_reasons) ? u.wait_reasons.join(" · ") : null) : i === "ready" ? S = "ready" : S = "idle";
  const M = $r[S];
  return {
    kind: S,
    reason: f,
    severity: g,
    label: x || M.label,
    color: k || M.color
  };
}
const xt = { LOOP: "loop", STEP: "step-agent", ORCH: "orchestrator", HUMAN: "human" };
function it(e) {
  return typeof e == "string" ? e : "";
}
function da(e) {
  if (!e || typeof e != "object") return [];
  const r = [], n = (s) => {
    s && s.at && r.push(s);
  };
  for (const s of e.history || [])
    !s || typeof s != "object" || n({
      id: `hist:${s.at}:${s.to}`,
      at: it(s.at),
      actor: xt.LOOP,
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
      at: it(l.at) || it(e.updated_at),
      actor: xt.STEP,
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
      at: it(s.at),
      actor: xt.HUMAN,
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
      at: it(s.at),
      actor: xt.ORCH,
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
      at: it(s.at),
      actor: xt.ORCH,
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
      at: it(s.at),
      actor: xt.ORCH,
      kind: "parked",
      step: s.phase,
      cls: "notification",
      needs_human: !1,
      headline: `parked to backlog: ${s.note || "idea"}`,
      detail: s.issue_url || ""
    });
  return r.map((s, l) => ({ ...s, _i: l })).sort((s, l) => s.at < l.at ? -1 : s.at > l.at ? 1 : s._i - l._i).map(({ _i: s, ...l }) => l);
}
const pa = /^\[([a-z0-9-]+)\s*[·.]\s*f?\d+\]\s*(.*)$/i;
function Tr(e) {
  const r = pa.exec(String(e || ""));
  return r ? { parentId: r[1], rest: r[2] } : null;
}
function ua(e, r) {
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
    const i = Tr(u.title);
    i && i.parentId === e.id && l({ id: u.id, title: u.title, stage: u.stage, lifecycle: u.lifecycle, required: !0 });
  }
  return n;
}
function ma(e) {
  var n;
  const r = Tr(e == null ? void 0 : e.title);
  return r ? r.parentId : ((n = e == null ? void 0 : e.topology) == null ? void 0 : n.integration_owner) || (e == null ? void 0 : e.parent_card) || null;
}
const br = ["webhook", "loop", "orchestrator", "crew", "step-agent", "human"], Rr = {
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
function va(e) {
  return String(e || "").slice(0, 8);
}
function ha(e, r) {
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
      detail: i.observed_status ? `observed: ${i.observed_status}` : i.run_id ? `run ${va(i.run_id)}` : ""
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
function ga(e, r) {
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
function ba(e, r, n) {
  const s = e == null ? void 0 : e.id, l = (r || []).filter((b) => {
    var h;
    return b && (b.pipeline_id === s || !b.pipeline_id && ((h = b.source) == null ? void 0 : h.repo) === (e == null ? void 0 : e.repo));
  }), d = [], u = (b) => {
    b && b.at && d.push({ glyph: Rr[b.actor] || "•", ...b });
  };
  for (const b of l) ha(b, u);
  ga(n, u);
  const i = Object.fromEntries(br.map((b, h) => [b, h]));
  d.sort((b, h) => (b.at < h.at ? -1 : b.at > h.at ? 1 : 0) || (i[b.actor] ?? 9) - (i[h.actor] ?? 9) || (b.id < h.id ? -1 : b.id > h.id ? 1 : 0));
  const c = br.filter((b) => d.some((h) => h.actor === b));
  return { events: d, actors: c, now: (n == null ? void 0 : n.scheduler_state) || null };
}
const xa = [
  "request:re-spec",
  "request:retry",
  "request:back-step",
  "request:park",
  "request:cancel"
], nr = 500, or = {
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
function fa() {
  var r, n;
  return `ui-${(((n = (r = globalThis.crypto) == null ? void 0 : r.randomUUID) == null ? void 0 : n.call(r)) || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16)}`;
}
function ya(e, r) {
  if (!xa.includes(e)) return { ok: !1, error: `unknown request kind: ${e}` };
  const n = or[e], s = String(r || "").trim();
  return n.reasonRequired && !s ? { ok: !1, error: "a reason is required for this request" } : s.length > nr ? { ok: !1, error: `reason exceeds ${nr} chars` } : { ok: !0 };
}
function ka({ id: e, kind: r, text: n, card: s, now: l, boundary: d }) {
  const u = ya(r, n);
  if (!u.ok) throw new Error(u.error);
  const i = s == null ? void 0 : s.stage, c = s != null && s.step_status && typeof s.step_status == "object" ? s.step_status[i] ?? null : null, b = {
    id: e,
    at: l,
    step: i,
    kind: r,
    text: String(n || "").trim().slice(0, nr),
    by: "user",
    status: "pending",
    expected: { stage: i ?? null, step_status: c }
  };
  return r === "request:back-step" && d && (b.boundary = d), b;
}
function wa(e, r) {
  const n = Array.isArray(e) ? e : [];
  return n.some((s) => s && s.id === r.id) ? n : [...n, r];
}
const Ar = [
  "ready",
  "queued",
  "running",
  "pending",
  "blocked",
  "error",
  "cancelling",
  "terminal"
];
function Na(e, r) {
  const n = Object.fromEntries(Ar.map((d) => [d, 0])), s = r && typeof r == "object" ? r : {};
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
function Kt(e) {
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
const xr = /^[A-Za-z0-9._-]{1,128}$/;
function Lt({ values: e, empty: r = "none declared" }) {
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
function et({ label: e, value: r }) {
  return /* @__PURE__ */ a("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]", children: [
    /* @__PURE__ */ t("span", { className: "uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ t("span", { className: "break-words", style: { color: r ? "var(--text)" : "var(--muted)" }, children: r || "not set" })
  ] });
}
function _a({ profiles: e, initial: r, onSave: n, onClose: s }) {
  var D;
  const l = r ? "update" : "create", [d, u] = w((r == null ? void 0 : r.name) || ""), [i, c] = w((r == null ? void 0 : r.kiroAgent) || ((D = e.find(($) => $.status === "loaded")) == null ? void 0 : D.name) || ""), [b, h] = w((r == null ? void 0 : r.workspace) || ""), [S, f] = w((r == null ? void 0 : r.memoryStore) || ""), [g, x] = w(!1), [k, M] = w(""), E = xr.test(d.trim()) && xr.test(i.trim()) && new TextEncoder().encode(b.trim()).length <= 256 && new TextEncoder().encode(S.trim()).length <= 256, A = async () => {
    if (!(!E || g)) {
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
                  disabled: !E || g,
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
function sr({ profiles: e, crews: r, loading: n = !1, context: s, onRefresh: l, onClose: d, onSelectProfile: u, onSelectCrew: i, onSaveCrew: c }) {
  var z, X;
  const [b, h] = w("agents"), [S, f] = w(((z = e[0]) == null ? void 0 : z.name) || ""), [g, x] = w(((X = r[0]) == null ? void 0 : X.name) || ""), [k, M] = w(null);
  De(() => {
    var y;
    e.some((J) => J.name === S) || f(((y = e[0]) == null ? void 0 : y.name) || "");
  }, [e, S]), De(() => {
    var y;
    r.some((J) => J.name === g) || x(((y = r[0]) == null ? void 0 : y.name) || "");
  }, [r, g]);
  const E = e.find((y) => y.name === S), A = r.find((y) => y.name === g), D = Te(
    () => A != null && A.kiroAgent ? e.find((y) => y.name === A.kiroAgent) : void 0,
    [A, e]
  ), $ = E != null && E.prompt ? E.prompt.length > 1200 ? `${E.prompt.slice(0, 1200)}…` : E.prompt : "";
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
              /* @__PURE__ */ t("div", { className: "flex min-h-0 flex-1", children: b === "agents" ? /* @__PURE__ */ a(Ge, { children: [
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
                /* @__PURE__ */ t("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: E ? /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ a("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ a("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ t("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: E.name }),
                      /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: E.description || "No description declared." })
                    ] }),
                    u && /* @__PURE__ */ t(
                      "button",
                      {
                        onClick: () => u(E),
                        disabled: E.status !== "loaded",
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Use for this step"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ a("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ t(et, { label: "Model", value: E.model || "auto / provider default" }),
                    /* @__PURE__ */ t(et, { label: "Config source", value: E.sourcePath }),
                    /* @__PURE__ */ t(et, { label: "Prompt", value: E.prompt ? E.prompt.startsWith("file://") ? E.prompt : "inline prompt" : void 0 })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Declared tools" }),
                    /* @__PURE__ */ t(Lt, { values: E.tools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Auto-approved tools" }),
                    /* @__PURE__ */ t(Lt, { values: E.allowedTools })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Resources / skills" }),
                    /* @__PURE__ */ t(Lt, { values: E.resources })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "MCP servers" }),
                    /* @__PURE__ */ t(Lt, { values: E.mcpServers })
                  ] }),
                  $ && /* @__PURE__ */ a("details", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ t("summary", { className: "text-[11px] cursor-pointer", style: { color: "var(--accent)" }, children: "Prompt preview" }),
                    /* @__PURE__ */ t("pre", { className: "mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto", style: { color: "var(--muted)" }, children: $ })
                  ] }),
                  /* @__PURE__ */ t("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 28%, var(--border))" }, children: "These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access." })
                ] }) : /* @__PURE__ */ t("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select an agent template." }) })
              ] }) : /* @__PURE__ */ a(Ge, { children: [
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
                    /* @__PURE__ */ t(et, { label: "kiro_agent", value: A.kiroAgent }),
                    /* @__PURE__ */ t(et, { label: "Workspace", value: A.workspace }),
                    /* @__PURE__ */ t(et, { label: "Memory store", value: A.memoryStore }),
                    /* @__PURE__ */ t(et, { label: "Model override", value: A.model }),
                    /* @__PURE__ */ t(et, { label: "Source", value: A.source })
                  ] }),
                  /* @__PURE__ */ a("section", { children: [
                    /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Selection triggers" }),
                    /* @__PURE__ */ t(Lt, { values: A.triggers })
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
          _a,
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
const jr = Object.freeze([
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
]), Ca = /^[A-Za-z0-9._-]{1,128}$/;
function Ke(e) {
  return typeof e == "string" && Ca.test(e);
}
function Ye(e) {
  return typeof e == "string" && e.trim() ? e.trim() : void 0;
}
function Xt(e) {
  return Array.isArray(e) ? [...new Set(e.filter((r) => typeof r == "string" && r.trim()).map((r) => r.trim()))] : [];
}
function Sa(e) {
  return !e || typeof e != "object" || Array.isArray(e) ? [] : Object.entries(e).filter(([r, n]) => Ke(r) && n && typeof n == "object" && !Array.isArray(n)).map(([r, n]) => ({
    name: r,
    kiroAgent: Ke(n.kiro_agent) ? n.kiro_agent : void 0,
    workspace: Ye(n.workspace),
    memoryStore: Ye(n.memory_store ?? n.memoryStore),
    model: Ye(n.model),
    description: Ye(n.description),
    triggers: Xt(n.triggers),
    source: Ye(n.source)
  })).sort((r, n) => r.name.localeCompare(n.name));
}
function $a(e, r = jr) {
  const n = [];
  for (const l of r)
    Ke(l) && !n.includes(l) && n.push(l);
  const s = (Array.isArray(e) ? e : []).map((l) => l == null ? void 0 : l.kiroAgent).filter(Ke).sort((l, d) => l.localeCompare(d));
  for (const l of s)
    n.includes(l) || n.push(l);
  return n;
}
function Ta(e, r, n = jr) {
  if (!Ke(e)) return;
  if (n.includes(e)) return `~/.kiro/crew/apps/dlc-yolo/agents/${e}.json`;
  const s = [...new Set(
    (Array.isArray(r) ? r : []).filter((l) => (l == null ? void 0 : l.kiroAgent) === e).map((l) => l == null ? void 0 : l.source).filter(Ke)
  )];
  if (s.length === 1)
    return `~/.kiro/agents/${s[0]}--${e}.json`;
}
function rr(e, r, n) {
  const s = Ke(r) ? r : "unknown", l = !!e && typeof e == "object" && !Array.isArray(e), d = l && Ke(e.name) ? e.name : s, u = l && e.mcpServers && typeof e.mcpServers == "object" ? Object.keys(e.mcpServers).filter(Ke) : [];
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
function Ra(e) {
  const r = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(e || "");
  return r == null ? void 0 : r[1];
}
function Aa(e, r) {
  if (!r || !Ke(r.name)) return { ...e };
  const n = Ra(r.name);
  return {
    ...e,
    name: r.name,
    tools: [...r.tools || []],
    model: r.model || "auto",
    ...n ? { capability: n } : {}
  };
}
let tt = ar;
const fr = (e) => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
})[e], Zt = [
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
], Er = /* @__PURE__ */ new Set([
  "example-org/web-app",
  "example-org/dashboard",
  "example-org/api-core"
]), ja = {
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
}, ct = ["manual", "assisted", "autonomous"], kt = ["quick", "standard", "deep"], qt = { trust: "assisted", depth: "standard" }, Jt = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, Qt = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Fe({ color: e, children: r, title: n, onClick: s, active: l }) {
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
const Vt = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Ea({ steps: e, cardsByStage: r, onNodeClick: n }) {
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
    const z = (J, T, ge, we, ie) => {
      $.fillStyle = ie, $.fillRect(J * h, T * h, ge * h, we * h);
    }, X = () => {
      const J = d.current, T = i.current, ge = c.current, we = Math.max(1, T.length);
      Math.max(1, ...T.map((Q) => {
        var P;
        return ((P = ge[Q.id]) == null ? void 0 : P.length) || 0;
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
      const ie = D / we, he = [];
      for (let Q = 0; Q < T.length; Q++) {
        const P = T[Q], ee = Math.round(ie * (Q + 0.5)), je = (ge[P.id] || []).length, Se = je > 0, C = Vt[Q % Vt.length], U = M(P), oe = g - 2;
        if (he.push({ x: ee - Math.floor(ie / 2), w: Math.floor(ie), id: P.id }), Q < T.length - 1) {
          const re = Math.round(ie * (Q + 1.5));
          for (let be = ee + 8; be < re - 8; be += 4) z(be, g - 1, 2, 1, "#4a3520");
        }
        if (U) {
          const re = oe - 20, be = Se ? "#f39c12" : "#3a3222";
          z(ee - 3, re, 6, 20, Se ? "#5c4a2a" : "#2a2418");
          for (let G = 0; G < 5; G++) z(ee - G, re - 5 + G, G * 2 + 1, 1, be);
          for (let G = 0; G < 5; G++) z(ee - (4 - G), re - G, (4 - G) * 2 + 1, 1, be);
          if (Se) {
            const G = (Math.sin(J * 0.08) + 1) / 2;
            $.globalAlpha = 0.35 + G * 0.4, z(ee - 1, re - 6, 2, 2, "#ffd27a"), $.globalAlpha = 1;
          }
        } else {
          const re = oe - 14;
          if (z(ee - 10, re, 20, 3, "#7a5c47"), z(ee - 10, re - 1, 20, 1, C), z(ee - 9, re + 3, 2, 8, "#5c4033"), z(ee + 7, re + 3, 2, 8, "#5c4033"), z(ee - 5, re - 9, 10, 9, "#333"), z(ee - 4, re - 8, 8, 7, Se ? "#0a2a0a" : "#1a1a1a"), Se)
            for (let be = 0; be < 3; be++) {
              const G = 2 + (J + be * 7) % 5;
              z(ee - 3, re - 7 + be * 2, G, 0.8, "#33ff33");
            }
        }
        const Ne = Math.min(je, 5);
        for (let re = 0; re < Ne; re++) {
          const be = Ne > 1 ? (re - (Ne - 1) / 2) * 8 : 0, G = Math.round(ee + be) - 3, Z = oe - (U ? 2 : 4), O = Vt[(Q + re) % Vt.length], ce = Math.sin(J * 0.08 + Q + re) > 0 ? 1 : 0;
          $.fillStyle = "rgba(0,0,0,0.18)", $.fillRect(G * h, (Z + 8) * h, 6 * h, h), z(G, Z + ce, 6, 6, O), z(G + 1, Z - 4 + ce, 4, 4, "#fdd"), z(G + 1, Z - 5 + ce, 4, 1, "#333"), (J + Q * 9 + re * 5) % 120 >= 3 && (z(G + 2, Z - 3 + ce, 1, 1, "#333"), z(G + 4, Z - 3 + ce, 1, 1, "#333")), z(G + 1, Z + 6, 1, 2, O), z(G + 4, Z + 6, 1, 2, O);
        }
        je > 5 && ($.fillStyle = C, $.font = `${3 * h}px monospace`, $.fillText(`+${je - 5}`, (ee + 10) * h, (oe - 6) * h)), je > 0 && ($.fillStyle = C, $.fillRect((ee + 6) * h, (oe - 30) * h, 9 * h, 9 * h), $.fillStyle = "#0f172a", $.font = `bold ${5 * h}px monospace`, $.textAlign = "center", $.fillText(String(je), (ee + 10.5) * h, (oe - 24) * h), $.textAlign = "left"), $.fillStyle = Se ? "#e2e8f0" : "#6b7280", $.font = `${3.4 * h}px monospace`, $.textAlign = "center";
        const Le = P.name.length > 12 ? P.name.slice(0, 11) + "…" : P.name;
        $.fillText(Le, ee * h, (f - 4) * h), $.textAlign = "left";
      }
      b.current = he;
      const Re = T.reduce((Q, P) => {
        var ee;
        return Q + (((ee = ge[P.id]) == null ? void 0 : ee.length) || 0);
      }, 0);
      $.fillStyle = "#f90", $.font = `bold ${3.6 * h}px monospace`, $.fillText(`${Re} card${Re !== 1 ? "s" : ""} · ${we} milestone${we !== 1 ? "s" : ""}`, 4 * h, 8 * h);
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
function Oa({ active: e, onChange: r, counts: n }) {
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
function We({ title: e, children: r }) {
  return /* @__PURE__ */ a("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ t("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: e }),
    r
  ] });
}
function rt({ rows: e, empty: r = "None recorded" }) {
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
function Ce({ label: e, value: r, status: n }) {
  return /* @__PURE__ */ a("div", { className: "min-w-0", children: [
    /* @__PURE__ */ t("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: e }),
    /* @__PURE__ */ a("div", { className: "text-[11px] mt-0.5 break-words", style: { color: at(r) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      at(r),
      n && /* @__PURE__ */ a("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        at(n),
        ")"
      ] })
    ] })
  ] });
}
function La({ card: e, inspection: r, producerSession: n, onClose: s, onOpenProducer: l, onApprove: d, onReject: u, onInterject: i }) {
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
                /* @__PURE__ */ a(We, { title: "Result summary", children: [
                  /* @__PURE__ */ t("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: r.summary ? "var(--text)" : "var(--warn)" }, children: r.summary || "No result summary was published." }),
                  /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ t(Ce, { label: "Envelope", value: r.envelopeId }),
                    /* @__PURE__ */ t(Ce, { label: "Created", value: r.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ t(We, { title: "Changes since prior revision", children: /* @__PURE__ */ t(rt, { rows: r.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ t(We, { title: "Artifacts and evidence references", children: r.artifacts.length ? /* @__PURE__ */ t("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: r.artifacts.map((h) => /* @__PURE__ */ a("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ t("span", { className: "font-medium", style: { color: "var(--text)" }, children: h.label }),
                  h.kind && /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: h.kind })
                ] }),
                h.preview && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: h.preview }),
                h.ref && (h.url ? /* @__PURE__ */ t("a", { href: h.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: h.ref }) : /* @__PURE__ */ t("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: h.ref }))
              ] }, h.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(We, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ t(rt, { rows: r.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ t(We, { title: "Research and citations", children: /* @__PURE__ */ t(rt, { rows: r.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(We, { title: "Intent and requirement coverage", children: /* @__PURE__ */ t(rt, { rows: r.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ t(We, { title: "Omissions and deviations", children: /* @__PURE__ */ t(rt, { rows: r.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ a(We, { title: "Card topology and integration", children: [
                /* @__PURE__ */ a("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ t(Ce, { label: "Action", value: r.topology.action }),
                  /* @__PURE__ */ t(Ce, { label: "Integration owner", value: r.topology.integrationOwner }),
                  /* @__PURE__ */ t(Ce, { label: "Integration status", value: r.topology.integrationStatus }),
                  /* @__PURE__ */ t(Ce, { label: "Required children incomplete", value: r.topology.incompleteRequiredChildren.length })
                ] }),
                r.topology.children.length > 0 ? /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: r.topology.children.map((h) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--text)" }, children: h.label }),
                  /* @__PURE__ */ t("span", { className: "ml-auto text-[9px]", style: { color: h.required ? "var(--warn)" : "var(--muted)" }, children: h.required ? "required" : "optional" }),
                  /* @__PURE__ */ t("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(h.status) ? "var(--ok)" : "var(--warn)" }, children: h.status })
                ] }, h.key)) }) : /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ t(We, { title: "Budget consumption", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ t(Ce, { label: "Allocated", value: r.budget.allocated }),
                  /* @__PURE__ */ t(Ce, { label: "Consumed", value: r.budget.consumed }),
                  /* @__PURE__ */ t(Ce, { label: "Remaining", value: r.budget.remaining })
                ] }) }),
                /* @__PURE__ */ t(We, { title: "Routing and runtime provenance", children: /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-3", children: [
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
              /* @__PURE__ */ a("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ t(We, { title: "Validation and evidence", children: /* @__PURE__ */ t(rt, { rows: r.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ t(We, { title: "Known risks", children: /* @__PURE__ */ t(rt, { rows: r.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ t(We, { title: "Open decisions and questions", children: /* @__PURE__ */ t(rt, { rows: r.decisions, empty: "No open decisions recorded" }) })
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
function qa({ card: e, openChat: r }) {
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
function Ia({ cards: e, schedulerState: r, statePath: n, readAppFile: s, onClose: l }) {
  const d = Te(() => Na(e, r), [e, r]), [u, i] = w(Kt(null)), [c, b] = w([]), [h, S] = w([]);
  De(() => {
    const x = `${n.replace(/\/state\.json$/, "")}/workspaces/default/data/ledger/projections/status.json`;
    let k = !1;
    return s(x).then((M) => {
      if (!k)
        try {
          i(Kt(JSON.parse(M.content || "null")));
        } catch {
          i(Kt(null));
        }
    }).catch(() => {
      k || i(Kt(null));
    }), () => {
      k = !0;
    };
  }, [n, s]), De(() => {
    const g = [], x = [];
    for (const k of e) {
      const M = k.step_sessions;
      if (M) for (const [A, D] of Object.entries(M)) g.push({ card: k.id, step: A, slot: D == null ? void 0 : D.slot_key });
      const E = k.worktree_lease;
      E && x.push({ card: k.id, branch: E.branch, status: E.status });
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
                /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-2", children: Ar.map((g) => /* @__PURE__ */ a("span", { className: "px-2 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: d.counts[g] ? "var(--text)" : "var(--muted)" }, children: [
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
              /* @__PURE__ */ t(f, { title: "Webhook", children: /* @__PURE__ */ t(Sr, {}) }),
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
function ve(e, r) {
  return r == null || r === "" ? null : /* @__PURE__ */ a("div", { className: "flex gap-2 text-[11px] py-0.5", children: [
    /* @__PURE__ */ t("span", { className: "flex-shrink-0", style: { color: "var(--muted)", minWidth: "110px" }, children: e }),
    /* @__PURE__ */ t("span", { className: "min-w-0 break-words", style: { color: "var(--text)" }, children: String(r) })
  ] });
}
function yr(e) {
  return typeof e == "string" && /^https?:\/\//i.test(e);
}
function Ma({ card: e, cardStatus: r, effectiveCapability: n, onClose: s }) {
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
                (f = e.source) != null && f.url && yr(e.source.url) ? ve("source", null) || /* @__PURE__ */ a("div", { className: "text-[11px] py-0.5", children: [
                  /* @__PURE__ */ t("span", { style: { color: "var(--muted)", minWidth: 110, display: "inline-block" }, children: "source" }),
                  /* @__PURE__ */ a("a", { href: e.source.url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: [
                    e.source.repo,
                    e.source.issue ? `#${e.source.issue}` : ""
                  ] })
                ] }) : ve("source", (g = e.source) == null ? void 0 : g.repo),
                ve("pipeline", e.pipeline_id),
                ve("workspace", e.workspace),
                ve("stage", e.stage),
                ve("lifecycle", e.lifecycle),
                ve("SoT", e.sot),
                ve("status", `${r.label}${r.reason ? ` — ${r.reason}` : ""}`),
                ve("trust", e.trust ? `${e.trust} (override)` : "inherited"),
                ve("depth", e.depth ? `${e.depth} (override)` : "inherited"),
                ve("capability", n),
                ve("effort", e.effort ? JSON.stringify(e.effort) : null),
                ve("writes_allowed", e.writes_allowed === !1 ? "false (cancel requested)" : null)
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
                Object.entries(e.artifacts || {}).map(([x, k]) => /* @__PURE__ */ t("div", { className: "py-0.5", children: yr(k) ? /* @__PURE__ */ t("a", { href: k, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: x }) : /* @__PURE__ */ a("span", { style: { color: "var(--text)" }, children: [
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
                (e.gate_history || []).length > 0 && /* @__PURE__ */ a(Ge, { children: [
                  /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mt-2 mb-1", style: { color: "var(--muted)" }, children: "Gates" }),
                  (e.gate_history || []).map((x, k) => /* @__PURE__ */ a("div", { className: "py-0.5", style: { color: "var(--muted)" }, children: [
                    String(x.decision),
                    " ",
                    String(x.gate),
                    " · ",
                    String(x.actor || "")
                  ] }, k))
                ] }),
                (e.interjection || []).length > 0 && /* @__PURE__ */ a(Ge, { children: [
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
                ve("current node", i == null ? void 0 : i.current_node_id),
                ve("node status", c == null ? void 0 : c.status),
                ve("permit", c == null ? void 0 : c.permit_id),
                ve("concurrency class", c == null ? void 0 : c.concurrency_class),
                ve("model (requested)", e.model_request),
                ve("model (applied)", e.model_applied),
                h && /* @__PURE__ */ a(Ge, { children: [
                  ve("topology", h.action),
                  ve("integration owner", h.integration_owner),
                  ve("children", Array.isArray(h.children) ? `${h.children.length}` : null)
                ] }),
                b && /* @__PURE__ */ a(Ge, { children: [
                  ve("worktree branch", b.branch),
                  ve("lease status", b.status),
                  ve("lease locked", b.locked ? "true" : null)
                ] }),
                ve("cancel requested", e.cancel_requested_at),
                e.writes_allowed === !1 && ve("terminal observed", "pending (cooperative cancel in progress)")
              ] })
            ] }),
            /* @__PURE__ */ t("footer", { className: "px-5 py-2 text-[9px]", style: { borderTop: "1px solid var(--border)", color: "var(--muted)" }, children: "Read-only view. Use 🔧 maintain to request changes; gate actions use the gate controls." })
          ]
        }
      )
    }
  );
}
function Da({ onRequest: e }) {
  const [r, n] = w(!1), s = (l) => {
    const d = or[l];
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
        children: Object.entries(or).map(([l, d]) => /* @__PURE__ */ t(
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
function Ba({ card: e, decision: r, onClose: n, onResolve: s }) {
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
function ft({ card: e, config: r, isGate: n, cardStatus: s, effectiveCapability: l, producerStep: d, producerSession: u, onOpenProducer: i, onApprove: c, onReject: b, onCycleTrust: h, onCycleDepth: S, onSetBudget: f, onInterject: g, onResolveDecision: x, onOpenOrchestrator: k, liveView: M, allCards: E, onOpenCard: A, onRequest: D, onOpenStepSession: $, onCancelCard: z }) {
  var Be, nt, se, dt, me, ze, ot;
  const X = n ? "var(--warn)" : s.kind === "idle" ? "var(--border-strong, var(--border))" : s.color, y = e.trust || r.trust, J = e.depth || r.depth, T = ((Be = e.parked) == null ? void 0 : Be.length) || 0, ge = Object.values(e.step_sessions || {}).some(
    (N) => !!N.last_response_at && !N.chat_disabled_at && !N.superseded && (!N.last_response_handled_at || N.last_response_handled_at < N.last_response_at)
  ), [we, ie] = w(!1), [he, Re] = w(""), [Q, P] = w(!1), [ee, Ae] = w(null), [je, Se] = w(!1), [C, U] = w(!1), { openChat: oe } = wr(), Ne = Te(() => da(e), [e]), Le = Te(() => ua(e, E || []), [e, E]), re = Te(() => ma(e), [e]), be = Te(() => {
    if (!re) return null;
    const N = (E || []).find((L) => L.id === re);
    return N ? { id: N.id, title: N.title } : null;
  }, [re, E]), G = Ne.length > 0 || Le.length > 0 || !!be, Z = Te(
    () => n ? Zr(e, d) : null,
    [e, n, d]
  ), O = () => {
    const N = window.prompt(`Why reject revision ${(Z == null ? void 0 : Z.revision) ?? "unknown"}?`);
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
          const N = ($ || []).find((L) => L.step === e.stage);
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
        ((nt = e.source) == null ? void 0 : nt.repo) && /* @__PURE__ */ a(
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
          const N = (L = e.step_summaries) == null ? void 0 : L[e.stage];
          return N != null && N.headline ? /* @__PURE__ */ a("div", { className: "mt-1 flex items-start gap-1 text-[11px] leading-snug", title: N.description || N.headline, children: [
            N.needs_human ? /* @__PURE__ */ t("span", { "aria-label": "needs you", title: "Needs you", style: { color: "var(--warn)" }, children: "🔴" }) : /* @__PURE__ */ t("span", { "aria-hidden": "true", style: { color: "var(--muted)" }, children: "•" }),
            /* @__PURE__ */ t("span", { className: "truncate", style: { color: N.needs_human ? "var(--warn)" : "var(--text)" }, children: N.headline })
          ] }) : null;
        })(),
        /* @__PURE__ */ a("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider mr-0.5 select-none", style: { color: "var(--muted)" }, children: "⚙ modes" }),
          /* @__PURE__ */ a(
            Fe,
            {
              color: Jt[y],
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
            Fe,
            {
              color: Qt[J],
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
            Fe,
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
            /* @__PURE__ */ t(sa, { budget: e.budget, depth: J, onSave: f })
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
                Fe,
                {
                  color: s.color,
                  active: s.kind !== "idle",
                  title: `${s.label}${s.reason ? ` — ${s.reason}` : ""}`,
                  children: s.label
                }
              ),
              /* @__PURE__ */ a(
                Fe,
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
              e.lifecycle && /* @__PURE__ */ a(Fe, { color: "var(--muted)", title: `card lifecycle: ${e.lifecycle}`, children: [
                "🔄 ",
                e.lifecycle
              ] }),
              T > 0 && /* @__PURE__ */ a(Fe, { color: "var(--warn)", title: `${T} parked idea(s)`, children: [
                "⏸ ",
                T
              ] }),
              ge && /* @__PURE__ */ t(Fe, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
              typeof ((se = e.effort) == null ? void 0 : se.total) == "number" && e.effort.total > 0 && /* @__PURE__ */ a(Fe, { color: "var(--info)", title: `estimated effort: ${e.effort.total} points`, children: [
                "⚡ ",
                e.effort.total
              ] }),
              e.backstep_history && e.backstep_history.length > 0 && /* @__PURE__ */ a(
                Fe,
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
                  Fe,
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
        n && Z && /* @__PURE__ */ a(
          "div",
          {
            "data-gate-inspection-summary": !0,
            className: "mt-2.5 rounded-md p-2",
            style: { background: Z.ready ? "color-mix(in srgb, var(--ok) 7%, transparent)" : "color-mix(in srgb, var(--warn) 7%, transparent)", border: `1px solid color-mix(in srgb, ${Z.ready ? "var(--ok)" : "var(--warn)"} 32%, var(--border))` },
            children: [
              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
                /* @__PURE__ */ t("span", { className: "font-semibold", style: { color: Z.ready ? "var(--ok)" : "var(--warn)" }, children: Z.ready ? "Review-ready" : "Not review-ready" }),
                /* @__PURE__ */ a("span", { className: "ml-auto", style: { color: "var(--muted)" }, children: [
                  "r",
                  Z.revision ?? "?"
                ] }),
                /* @__PURE__ */ t("span", { className: "px-1 py-0.5 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: Z.reviewStatus })
              ] }),
              /* @__PURE__ */ t("div", { className: "mt-1 text-[11px] leading-snug overflow-hidden", style: { color: Z.summary ? "var(--text)" : "var(--warn)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: Z.summary || "No review bundle summary published." }),
              !Z.ready && /* @__PURE__ */ a("div", { className: "mt-1 text-[9px]", style: { color: "var(--muted)" }, children: [
                Z.missing.length,
                " readiness gap",
                Z.missing.length === 1 ? "" : "s"
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
            const N = (e.gate_commands || []).filter((qe) => qe.gate === e.stage), L = N.length ? N[N.length - 1] : void 0, xe = (L == null ? void 0 : L.status) === "pending", $e = (L == null ? void 0 : L.status) === "rejected", _e = (L == null ? void 0 : L.status) === "applied" || (L == null ? void 0 : L.status) === "approved";
            return /* @__PURE__ */ a(Ge, { children: [
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: xe,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--ok)", color: "var(--bg)" },
                  onClick: c,
                  title: xe ? "A gate command is being processed…" : "Approve this gate",
                  children: [
                    xe && (L == null ? void 0 : L.action) === "approve" && /* @__PURE__ */ t(wt, { size: 10 }),
                    xe && (L == null ? void 0 : L.action) === "approve" ? "Approving…" : "✓ Approve"
                  ]
                }
              ),
              /* @__PURE__ */ a(
                "button",
                {
                  disabled: xe,
                  className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1",
                  style: { background: "var(--danger)", color: "var(--bg)" },
                  onClick: O,
                  children: [
                    xe && (L == null ? void 0 : L.action) === "reject" && /* @__PURE__ */ t(wt, { size: 10 }),
                    xe && (L == null ? void 0 : L.action) === "reject" ? "Rejecting…" : "✕ Reject"
                  ]
                }
              ),
              xe && /* @__PURE__ */ a("span", { className: "text-[10px] inline-flex items-center gap-1", style: { color: "var(--muted)" }, children: [
                /* @__PURE__ */ t(wt, { size: 10 }),
                " ",
                L == null ? void 0 : L.action,
                " sent — runtime processing…"
              ] }),
              $e && /* @__PURE__ */ a(
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
              _e && /* @__PURE__ */ a("span", { className: "text-[10px]", style: { color: "var(--ok)" }, children: [
                "✓ ",
                L == null ? void 0 : L.action,
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
            var _e, qe, Oe;
            const N = (_e = e.source) == null ? void 0 : _e.repo;
            if (!N) return null;
            const L = (qe = e.artifacts) == null ? void 0 : qe.pr_url, xe = L && ((Oe = /\/pull\/(\d+)/.exec(L)) == null ? void 0 : Oe[1]), $e = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + N)}` + (xe ? `&pr=${xe}` : "");
            return /* @__PURE__ */ a(
              "a",
              {
                href: $e,
                title: L ? `Deep-review PR #${xe} in Code Review Sage` : `Open Code Review Sage for ${N}`,
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
          const N = e.block_reason || {}, L = new Set(ce.map(($e) => $e.step).filter(Boolean)), xe = Object.entries(N).filter(([$e]) => !L.has($e));
          return xe.length ? xe.map(([$e, _e]) => /* @__PURE__ */ a(
            "div",
            {
              className: "mt-2 p-2 rounded-md text-[11px]",
              style: { background: "color-mix(in srgb, var(--danger, #e66) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--danger, #e66) 35%, var(--border))" },
              children: [
                /* @__PURE__ */ a("div", { className: "font-semibold", style: { color: "var(--danger, #e66)" }, children: [
                  "⏸ Blocked · ",
                  $e
                ] }),
                /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: _e }),
                g && /* @__PURE__ */ t(
                  "button",
                  {
                    className: "mt-1.5 text-[10px] px-2 py-0.5 rounded font-semibold",
                    style: { background: "var(--accent)", color: "var(--bg)" },
                    onClick: () => ie(!0),
                    children: "✏️ interject to unblock"
                  }
                )
              ]
            },
            `block-${$e}`
          )) : null;
        })(),
        x && ce.map((N) => {
          var _e, qe;
          const L = N.step && ((_e = e.block_reason) != null && _e[N.step]) ? N.step : Object.keys(e.block_reason || {})[0], xe = L ? (qe = e.block_reason) == null ? void 0 : qe[L] : void 0, $e = N.options || [];
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
                xe && /* @__PURE__ */ t("div", { className: "mt-1 text-[10px] whitespace-pre-wrap", style: { color: "var(--muted)" }, children: xe }),
                $e.length > 0 && /* @__PURE__ */ t("div", { className: "mt-1.5 flex flex-col gap-1", children: $e.map((Oe, Ze) => {
                  const de = Oe.id || String.fromCharCode(65 + Ze), Je = Oe.recommended === !0 || N.chosen === Oe.id || (N.rationale || "").toLowerCase().includes((Oe.id || "").toLowerCase() + ")");
                  return /* @__PURE__ */ a(
                    "div",
                    {
                      className: "flex items-start gap-2 p-1 rounded",
                      style: { background: Je ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent" },
                      children: [
                        /* @__PURE__ */ a(
                          "button",
                          {
                            className: "text-[10px] px-2 py-0.5 rounded font-semibold shrink-0",
                            style: { background: "var(--accent)", color: "var(--bg)" },
                            title: `Resolve this decision by selecting option ${de} — the step resumes on this branch`,
                            onClick: () => x(N.id, Oe.id || de),
                            children: [
                              "Choose ",
                              de
                            ]
                          }
                        ),
                        /* @__PURE__ */ a("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
                          Oe.note,
                          Oe.risk ? ` · risk: ${Oe.risk}` : "",
                          Je ? "  ⭐ recommended" : ""
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
                  $e.length > 0 && /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded font-semibold",
                      style: { background: "var(--accent)", color: "var(--bg)" },
                      title: "Open a picker to select an option and resolve this decision",
                      onClick: () => Ae(N.id),
                      children: "⚖ resolve in picker…"
                    }
                  ),
                  /* @__PURE__ */ t(
                    "button",
                    {
                      className: "px-2 py-0.5 rounded",
                      style: { color: "var(--muted)", border: "1px solid var(--border)" },
                      title: "Answer in your own words instead of choosing an option",
                      onClick: () => ie(!0),
                      children: "✏️ answer in words"
                    }
                  ),
                  !$e.length && /* @__PURE__ */ t(
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
        M && /* @__PURE__ */ t(Ya, { live: M }),
        /* @__PURE__ */ t(qa, { card: e, openChat: oe }),
        (g || k || $ && $.length || z) && /* @__PURE__ */ a(
          "div",
          {
            className: "mt-2 flex items-center gap-2 flex-wrap",
            style: { borderTop: "1px dashed var(--border)", paddingTop: "6px" },
            children: [
              /* @__PURE__ */ t("span", { className: "text-[9px] uppercase tracking-wider select-none", style: { color: "var(--muted)" }, children: "⚡ actions" }),
              g && (we ? /* @__PURE__ */ a("div", { className: "w-full flex flex-col gap-1", children: [
                /* @__PURE__ */ t(
                  "textarea",
                  {
                    value: he,
                    onChange: (N) => Re(N.target.value),
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
                        he.trim() && (g("note", he.trim()), Re(""), ie(!1));
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
                        ie(!1), Re("");
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
                  onClick: () => ie(!0),
                  children: "✏️ interject"
                }
              )),
              k && /* @__PURE__ */ t(
                "button",
                {
                  className: "text-[10px] hover:underline",
                  style: { color: "var(--muted)" },
                  title: (dt = e.orchestrator_session) != null && dt.slot_key || (me = e.orchestrator_session) != null && me.session_key ? "Open this pipeline’s orchestrator session" : "Trigger an inspectable orchestrator session for this card",
                  onClick: () => k(),
                  children: (ze = e.orchestrator_session) != null && ze.slot_key || (ot = e.orchestrator_session) != null && ot.session_key ? "⚙ open orchestrator" : "⚙ orchestrator"
                }
              ),
              G && /* @__PURE__ */ a(
                "button",
                {
                  className: "text-[10px] hover:underline inline-flex items-center gap-0.5",
                  style: { color: "var(--muted)" },
                  title: "Card timeline — the ordered story of what happened",
                  onClick: () => Se(!0),
                  children: [
                    "📜 timeline",
                    Ne.some((N) => N.needs_human) ? " 🔴" : "",
                    Le.length > 0 ? ` 🌿${Le.length}` : ""
                  ]
                }
              ),
              D && /* @__PURE__ */ t(Da, { onRequest: D }),
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
                  onClick: () => U(!0),
                  children: "🔍 details"
                }
              )
            ]
          }
        ),
        je && /* @__PURE__ */ t(
          Ja,
          {
            card: e,
            events: Ne,
            children: Le,
            parent: be,
            onOpenCard: A,
            onClose: () => Se(!1)
          }
        ),
        C && /* @__PURE__ */ t(
          Ma,
          {
            card: e,
            cardStatus: s,
            effectiveCapability: String(l),
            onClose: () => U(!1)
          }
        ),
        Q && Z && /* @__PURE__ */ t(
          La,
          {
            card: e,
            inspection: Z,
            producerSession: u,
            onClose: () => P(!1),
            onOpenProducer: i,
            onApprove: c,
            onReject: b,
            onInterject: g ? () => {
              P(!1), ie(!0);
            } : void 0
          }
        ),
        ee && x && (() => {
          const N = (e.decisions || []).find((L) => L.id === ee);
          return N ? /* @__PURE__ */ t(
            Ba,
            {
              card: e,
              decision: N,
              onClose: () => Ae(null),
              onResolve: (L) => x(N.id, L)
            }
          ) : null;
        })()
      ]
    }
  );
}
function yt({ title: e, count: r, children: n, id: s }) {
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
function za({ config: e, onSet: r }) {
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
        /* @__PURE__ */ t(n, { label: "Trust", value: e.trust, options: ct, tokens: Jt, onPick: (s) => r({ trust: s }) }),
        /* @__PURE__ */ t(n, { label: "Depth", value: e.depth, options: kt, tokens: Qt, onPick: (s) => r({ depth: s }) }),
        /* @__PURE__ */ t("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
const Pa = {
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
function Wa({ pipeline: e, cards: r, extras: n, onOpenCard: s }) {
  const { events: l, actors: d, now: u } = Te(
    () => ba(e, r, n),
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
      Rr[i] || "•",
      " ",
      i
    ] }, i)) }),
    /* @__PURE__ */ t("ol", { className: "flex flex-col gap-1.5", style: { borderLeft: "1px solid var(--border)", paddingLeft: "10px" }, children: l.map((i) => {
      const c = Pa[i.kind] || "var(--text)";
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
function Ua({ cards: e }) {
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
function Fa({ repos: e, selected: r, onToggle: n, onClear: s, onAddWorkspace: l, onEdit: d }) {
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
              onClick: (E) => {
                E.stopPropagation(), d(b);
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
              onMouseEnter: (E) => {
                const A = E.currentTarget;
                A.style.color = "var(--accent)", A.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (E) => {
                const A = E.currentTarget;
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
            label: (Er.has(b.name) ? "Example: " : "") + (b.name.includes("/") ? b.name.split("/")[1] : b.name),
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
const Ga = [
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
function Ha({ initial: e, agentProfiles: r, crews: n, repo: s, stepName: l, onSave: d, onSaveCrew: u, onClose: i }) {
  const [c, b] = w(e.name || ""), [h, S] = w(e.role || ""), [f, g] = w(e.tools || ["read"]), [x, k] = w(e.model || "auto"), [M, E] = w(e.crew || ""), [A, D] = w(e.addenda || []), [$, z] = w(e.capability || ""), [X, y] = w(e.trust || ""), [J, T] = w(e.depth || ""), [ge, we] = w(!1), ie = r.find((C) => C.name === c), he = n.find((C) => C.name === M), Re = [.../* @__PURE__ */ new Set([...Ga, ...f])], Q = (C) => {
    const U = Aa({ name: c, role: h, tools: f, model: x, crew: M, addenda: A, capability: $, trust: X, depth: J }, C);
    b(U.name), g(U.tools || []), k(U.model || "auto"), U.capability && z(U.capability);
  }, P = (C) => g((U) => U.includes(C) ? U.filter((oe) => oe !== C) : [...U, C]), ee = () => D((C) => {
    var U;
    return C.length >= 3 ? C : [...C, { crew: ((U = n[0]) == null ? void 0 : U.name) || "", when: "always", writes: "" }];
  }), Ae = (C, U) => D((oe) => oe.map((Ne, Le) => Le === C ? { ...Ne, ...U } : Ne)), je = (C) => D((U) => U.filter((oe, Ne) => Ne !== C)), Se = c.trim().length > 0;
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
              onClick: () => we(!0),
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
        ie && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1.5 rounded-md px-2 py-1.5", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
          "Loaded config: model ",
          /* @__PURE__ */ t("code", { children: ie.model || "auto" }),
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
        /* @__PURE__ */ t("div", { className: "mt-1 flex flex-wrap gap-1.5", children: Re.map((C) => {
          const U = f.includes(C);
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => P(C),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: U ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: U ? "var(--accent)" : "var(--muted)",
                boxShadow: U ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
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
              onChange: (C) => E(C.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ t("option", { value: "", children: "— none (use step agent) —" }),
                n.map((C) => /* @__PURE__ */ t("option", { value: C.name, children: C.name }, C.name))
              ]
            }
          )
        ] }),
        he && /* @__PURE__ */ a("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: [
          "Global route ",
          /* @__PURE__ */ t("code", { children: he.name }),
          " → ",
          /* @__PURE__ */ t("code", { children: he.kiroAgent || "profile unknown" }),
          he.workspace ? ` · workspace ${he.workspace}` : "",
          he.description ? ` · ${he.description}` : ""
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
        A.map((C, U) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ t(
            "select",
            {
              value: C.crew,
              onChange: (oe) => Ae(U, { crew: oe.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: n.map((oe) => /* @__PURE__ */ t("option", { value: oe.name, children: oe.name }, oe.name))
            }
          ),
          /* @__PURE__ */ a(
            "select",
            {
              value: C.when || "always",
              onChange: (oe) => Ae(U, { when: oe.target.value }),
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
              onChange: (oe) => Ae(U, { writes: oe.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ t("button", { onClick: () => je(U), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ t("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ t("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, U))
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...ct].map((C) => {
          const U = X === C;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => y(C),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: U ? C ? Jt[C] : "var(--text)" : "var(--muted)", background: U ? "var(--bg-hover, var(--border))" : "transparent" },
              children: C || "inherit"
            },
            C || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...kt].map((C) => {
          const U = J === C;
          return /* @__PURE__ */ t(
            "button",
            {
              onClick: () => T(C),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: U ? C ? Qt[C] : "var(--text)" : "var(--muted)", background: U ? "var(--bg-hover, var(--border))" : "transparent" },
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
          disabled: !Se,
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
    ge && /* @__PURE__ */ t(
      sr,
      {
        profiles: r,
        crews: n,
        context: `${s || "unassigned pipeline"} · ${l || "unnamed step"}`,
        onSaveCrew: u,
        onClose: () => we(!1),
        onSelectProfile: (C) => {
          Q(C), we(!1);
        },
        onSelectCrew: (C) => {
          E(C.name), we(!1);
        }
      }
    )
  ] });
}
function kr({ candidates: e, existingRepos: r, defaults: n, agentProfiles: s, crews: l, onCreate: d, onSaveCrew: u, onClose: i, editPipeline: c, cardCount: b, isExample: h, onDelete: S }) {
  var It, Mt, Dt, St, $t, Tt, Bt, pt, ut, mt, zt, Rt, At, Pt, vt;
  const f = !!c, [g, x] = w((c == null ? void 0 : c.repo) || ""), [k, M] = w((c == null ? void 0 : c.workspace) || "default"), [E, A] = w((c == null ? void 0 : c.repo_path) || ""), [D, $] = w((c == null ? void 0 : c.source) || "manual"), [z, X] = w((c == null ? void 0 : c.trust) || n.trust), [y, J] = w((c == null ? void 0 : c.depth) || n.depth), T = c == null ? void 0 : c.budget, [ge, we] = w(
    T ? T.max_child_cards === "unlimited" && T.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [ie, he] = w(
    () => T && T.max_child_cards !== "unlimited" && T.effort_ceiling !== "unlimited" ? { ...T } : fr((c == null ? void 0 : c.depth) || n.depth)
  ), [Re, Q] = w((c == null ? void 0 : c.backlog_intake) ?? !0), [P, ee] = w((c == null ? void 0 : c.results_in_repo) ?? !1), [Ae, je] = w((c == null ? void 0 : c.conversation_log) ?? !1), [Se, C] = w(((c == null ? void 0 : c.trusted_authors) || []).join(`
`)), [U, oe] = w((c == null ? void 0 : c.self_enabling) ?? !1), [Ne, Le] = w((c == null ? void 0 : c.approach) || "simplified"), [re, be] = w((c == null ? void 0 : c.sync_mode) || "poll"), [G, Z] = w(() => {
    var v;
    return (v = c == null ? void 0 : c.steps) != null && v.length ? c.steps.map((R) => ({ ...R })) : Zt.map((R) => ({ ...R }));
  }), [O, ce] = w(null), [Be, nt] = w(""), [se, dt] = w("settings"), [me, ze] = w(!1), ot = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", N = (v, R) => Z((fe) => fe.map((ye, pe) => pe === v ? { ...ye, ...R } : ye)), L = (v) => Z((R) => R.filter((fe, ye) => ye !== v)), xe = (v, R) => Z((fe) => {
    const ye = v + R;
    if (ye < 0 || ye >= fe.length) return fe;
    const pe = [...fe];
    return [pe[v], pe[ye]] = [pe[ye], pe[v]], pe;
  }), $e = (v) => Z((R) => [...R, {
    id: `${v}-${Math.random().toString(36).slice(2, 6)}`,
    name: v === "gate" ? "New Gate" : "New Step",
    type: v,
    agent: v === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), _e = (v) => {
    x(v.repo || ""), M(v.workspace || "default"), A(v.path || ""), $(v.source);
  }, qe = (v) => {
    let R = (v || "").trim();
    if (!R) return "";
    const fe = R.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return fe && (R = fe[1]), R.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, Oe = (v) => {
    const R = /github\.com|gitlab\.com/i.test(v);
    x(R ? qe(v) : v), $("manual");
  }, Ze = [...new Map(
    Se.split(/[\n,]/).map((v) => v.trim()).filter(Boolean).map((v) => [v.toLowerCase(), v])
  ).values()], de = Ze.every((v) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(v)), Je = /^[A-Za-z0-9_.-]{1,80}$/.test(k), Nt = (/^[^/\s]+\/[^/\s]+$/.test(qe(g)) || e.some((v) => v.repo && v.repo === g)) && de && Je, _t = !f && r.has(qe(g)), Ct = ({ value: v, options: R, tokens: fe, onPick: ye }) => /* @__PURE__ */ t("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: R.map((pe) => {
    const Ve = v === pe;
    return /* @__PURE__ */ t(
      "button",
      {
        onClick: () => ye(pe),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: Ve ? fe[pe] : "var(--muted)",
          background: Ve ? `color-mix(in srgb, ${fe[pe]} 16%, transparent)` : "transparent",
          boxShadow: Ve ? `inset 0 0 0 1px color-mix(in srgb, ${fe[pe]} 45%, transparent)` : "none"
        },
        children: pe
      },
      pe
    );
  }) }), st = { "issue-radar": [], workspace: [], manual: [] };
  e.forEach((v) => {
    var R;
    (st[R = v.source] || (st[R] = [])).push(v);
  });
  const er = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" }, tr = f ? ["settings", "webhook", "danger"] : ["settings", "webhook"];
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
            me && /* @__PURE__ */ t(
              sr,
              {
                profiles: s,
                crews: l,
                context: g || k,
                onSaveCrew: u,
                onClose: () => ze(!1)
              }
            ),
            O !== null ? /* @__PURE__ */ t(
              Ha,
              {
                initial: {
                  name: ((Mt = (It = G[O]) == null ? void 0 : It.agent) == null ? void 0 : Mt.name) || "",
                  role: (St = (Dt = G[O]) == null ? void 0 : Dt.agent) == null ? void 0 : St.role,
                  tools: (Tt = ($t = G[O]) == null ? void 0 : $t.agent) == null ? void 0 : Tt.tools,
                  model: (pt = (Bt = G[O]) == null ? void 0 : Bt.agent) == null ? void 0 : pt.model,
                  crew: (mt = (ut = G[O]) == null ? void 0 : ut.agent) == null ? void 0 : mt.crew,
                  addenda: (zt = G[O]) == null ? void 0 : zt.addenda,
                  capability: (Rt = G[O]) == null ? void 0 : Rt.capability,
                  trust: (At = G[O]) == null ? void 0 : At.trust,
                  depth: (Pt = G[O]) == null ? void 0 : Pt.depth
                },
                agentProfiles: s,
                crews: l,
                repo: g,
                stepName: ((vt = G[O]) == null ? void 0 : vt.name) || "",
                onSaveCrew: u,
                onClose: () => ce(null),
                onSave: (v) => {
                  N(O, {
                    agent: { name: v.name, role: v.role, tools: v.tools, model: v.model, crew: v.crew },
                    addenda: v.addenda,
                    capability: v.capability,
                    trust: v.trust,
                    depth: v.depth
                  }), ce(null);
                }
              }
            ) : /* @__PURE__ */ a(Ge, { children: [
              /* @__PURE__ */ a("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ a("div", { children: [
                  /* @__PURE__ */ t("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: f ? "Edit Pipeline" : "New Pipeline" }),
                  /* @__PURE__ */ t("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: f ? g.includes("/") ? g.split("/")[1] : g : "Configure a pipeline for a repository or workspace" })
                ] }),
                /* @__PURE__ */ t("button", { onClick: i, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
              ] }),
              /* @__PURE__ */ t("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: tr.map((v) => {
                const R = se === v, fe = v === "danger";
                return /* @__PURE__ */ t(
                  "button",
                  {
                    onClick: () => dt(v),
                    className: "text-[12px] px-3 py-2 font-semibold transition-all",
                    style: {
                      color: R ? fe ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                      borderBottom: `2px solid ${R ? fe ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
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
                  style: { display: se === "settings" ? "flex" : "none" },
                  children: [
                    /* @__PURE__ */ a("div", { children: [
                      /* @__PURE__ */ t("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                      /* @__PURE__ */ t(
                        "input",
                        {
                          value: g,
                          onChange: (v) => Oe(v.target.value),
                          onPaste: (v) => {
                            const R = v.clipboardData.getData("text");
                            /github\.com|gitlab\.com/i.test(R) && (v.preventDefault(), Oe(R));
                          },
                          placeholder: "https://github.com/owner/name  ·  or  owner/name",
                          disabled: f,
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${_t ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                        }
                      ),
                      !f && g && qe(g) !== g && /* @__PURE__ */ a("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                        "→ ",
                        /* @__PURE__ */ t("code", { style: { color: "var(--accent)" }, children: qe(g) })
                      ] }),
                      _t && /* @__PURE__ */ t("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                      /* @__PURE__ */ t("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((v) => st[v].length > 0 && /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: er[v] }),
                        /* @__PURE__ */ t("div", { className: "flex flex-wrap gap-1.5", children: st[v].map((R) => {
                          const fe = `${v}:${R.workspace || R.repo}:${R.path || ""}`, ye = R.source === "workspace" ? k === R.workspace && E === (R.path || "") : g === R.repo;
                          return /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => _e(R),
                              disabled: !!R.repo && r.has(R.repo),
                              title: R.detail || R.repo || R.workspace,
                              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                              style: {
                                background: ye ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                                color: ye ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                                boxShadow: ye ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                              },
                              children: R.label || (R.repo.includes("/") ? R.repo.split("/")[1] : R.repo) || R.workspace
                            },
                            fe
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
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Je ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ a("div", { className: "text-[10px] mt-1", style: { color: Je ? "var(--muted)" : "var(--danger)" }, children: [
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
                          value: E,
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
                      /* @__PURE__ */ t(Ct, { value: z, options: ct, tokens: Jt, onPick: X })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ t("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                      /* @__PURE__ */ t(Ct, { value: y, options: kt, tokens: Qt, onPick: J })
                    ] }),
                    /* @__PURE__ */ a("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ a("div", { children: [
                        /* @__PURE__ */ t("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                        /* @__PURE__ */ t("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                      ] }),
                      /* @__PURE__ */ t(
                        Ct,
                        {
                          value: ge,
                          options: ["depth", "custom", "unlimited"],
                          tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                          onPick: we
                        }
                      )
                    ] }),
                    ge === "depth" && (() => {
                      const v = fr(y);
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
                    ge === "unlimited" && /* @__PURE__ */ t("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                    ge === "custom" && /* @__PURE__ */ a("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ a("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max child cards",
                        /* @__PURE__ */ t(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: ie.max_child_cards,
                            onChange: (v) => he((R) => ({ ...R, max_child_cards: Math.max(0, Number(v.target.value) || 0) })),
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
                            value: ie.effort_ceiling,
                            onChange: (v) => he((R) => ({ ...R, effort_ceiling: Math.max(0, Number(v.target.value) || 0) })),
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
                            value: ie.max_feature_size,
                            onChange: (v) => he((R) => ({ ...R, max_feature_size: v.target.value })),
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
                            value: ie.addenda,
                            onChange: (v) => he((R) => ({ ...R, addenda: v.target.value })),
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
                          onClick: () => be(v),
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
                          onClick: () => je((v) => !v),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: Ae ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: Ae ? 20 : 2 }
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
                          value: Se,
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
                          onClick: () => oe((v) => !v),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: U ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ t(
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
                        /* @__PURE__ */ t("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                        /* @__PURE__ */ t("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((v) => /* @__PURE__ */ t(
                        "button",
                        {
                          onClick: () => Le(v),
                          className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                          style: {
                            background: Ne === v ? "var(--accent)" : "transparent",
                            color: Ne === v ? "var(--bg)" : "var(--muted)",
                            border: `1px solid ${Ne === v ? "var(--accent)" : "var(--border)"}`
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
                              onClick: () => $e("agent"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                              children: "+ agent"
                            }
                          ),
                          /* @__PURE__ */ t(
                            "button",
                            {
                              onClick: () => $e("gate"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" },
                              children: "+ gate"
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ t("div", { className: "flex flex-col gap-1.5", children: G.map((v, R) => {
                        var fe, ye;
                        return /* @__PURE__ */ a(
                          "div",
                          {
                            className: "rounded-md p-2",
                            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${v.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                            children: [
                              /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ a("div", { className: "flex flex-col", children: [
                                  /* @__PURE__ */ t("button", { onClick: () => xe(R, -1), disabled: R === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                  /* @__PURE__ */ t("button", { onClick: () => xe(R, 1), disabled: R === G.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                                ] }),
                                /* @__PURE__ */ t(
                                  "input",
                                  {
                                    value: v.name,
                                    onChange: (pe) => N(R, { name: pe.target.value, id: ot(pe.target.value) }),
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
                                /* @__PURE__ */ t("button", { onClick: () => L(R), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
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
                                      (fe = v.agent) != null && fe.name ? `Agent: ${v.agent.name}` : "Configure agent"
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
                                ((ye = v.agent) == null ? void 0 : ye.role) && /* @__PURE__ */ t("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: v.agent.role })
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
                                      ct.map((pe) => /* @__PURE__ */ t("option", { value: pe, children: pe }, pe))
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
              se === "webhook" && /* @__PURE__ */ t("div", { className: "px-5 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ t(Sr, {}) }),
              f && se === "danger" && S && (() => {
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
                          onChange: (fe) => nt(fe.target.value),
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
                /* @__PURE__ */ t("button", { onClick: i, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: se === "settings" ? "Cancel" : "Close" }),
                se === "settings" && /* @__PURE__ */ t(
                  "button",
                  {
                    disabled: !Nt || !f && _t,
                    onClick: () => d({
                      repo: qe(g),
                      workspace: k,
                      ...E.trim() ? { repo_path: E.trim() } : {},
                      source: D,
                      trust: z,
                      depth: y,
                      budget: ge === "depth" ? void 0 : ge === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : ie,
                      backlog_intake: Re,
                      results_in_repo: P,
                      conversation_log: Ae,
                      trusted_authors: Ze,
                      self_enabling: U,
                      approach: Ne,
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
function wt({ size: e = 12 }) {
  return /* @__PURE__ */ a("svg", { className: "animate-spin flex-shrink-0", width: e, height: e, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ t("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ t("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
const Ka = {
  investigate: "🔎",
  requirements: "📝",
  design: "📐",
  tasks: "🧩",
  implement: "🔨",
  review: "🔍",
  pr: "🚀",
  intent: "🎯"
};
function Va(e, r) {
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
function Ya({ live: e }) {
  const [r, n] = w(!0), s = Ie(null), l = Va(e.tail, e.active);
  De(() => {
    s.current && (s.current.scrollTop = s.current.scrollHeight);
  }, [l]);
  const d = Ka[e.stage] || "⚙";
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
      e.active && /* @__PURE__ */ t(wt, { size: 10 }),
      e.phase === "crew" && /* @__PURE__ */ t(
        "span",
        {
          className: "text-[9px] px-1 rounded",
          title: "Live output streamed from a crew subagent this step spawned (docs/live-crew-stream).",
          style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" },
          children: "👥 crew"
        }
      ),
      e.source === "progress-trail" && /* @__PURE__ */ t(
        "span",
        {
          className: "text-[9px]",
          title: "A cron-launched step session cannot stream tokens live; these are progress checkpoints the agent writes between tool calls (crew lines are the crew subagent's own streamed output).",
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
const Xa = {
  loop: "⚙",
  "step-agent": "🤖",
  orchestrator: "🧠",
  human: "🧑"
}, Za = {
  loop: "var(--muted)",
  "step-agent": "var(--info)",
  orchestrator: "var(--accent)",
  human: "var(--ok)"
};
function Ja({ card: e, events: r, children: n, parent: s, onOpenCard: l, onClose: d }) {
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
                /* @__PURE__ */ t("span", { title: i.actor, "aria-hidden": "true", className: "flex-shrink-0 mt-0.5", children: Xa[i.actor] || "•" }),
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
                  /* @__PURE__ */ a("div", { className: "text-[9px] mt-0.5", style: { color: Za[i.actor] || "var(--muted)" }, children: [
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
function an() {
  const e = Nr(), r = Lr(), [n, s] = w([]), [l, d] = w([]), [u, i] = w({}), [c, b] = w(qt), [h, S] = w(!0), [f, g] = w("pipeline"), [x, k] = w(/* @__PURE__ */ new Set()), [M, E] = w(!1), [A, D] = w(null), [$, z] = w([]), [X, y] = w([]), [J, T] = w([]), [ge, we] = w(!1), [ie, he] = w(!1), [Re, Q] = w(!1), [P, ee] = w(!1), [Ae, je] = w(!1), [Se, C] = w(!1), [U, oe] = w([]), Ne = Ie(null), Le = Ie(!1), re = Ie(!1), be = Ie(/* @__PURE__ */ new Set()), G = Ie(/* @__PURE__ */ new Set()), [Z, O] = w({}), ce = le(
    (o) => e.get("/api/file-read?path=" + encodeURIComponent(o)),
    [e]
  ), Be = le(async (o = !1) => {
    try {
      const p = !re.current || o ? await Yt(ce) : await pr(ce, tt);
      tt = p.path, re.current = !0;
      const m = p.data;
      s(m.cards || []), d(m.pipelines || []), i({ github_webhook_history: m.github_webhook_history || [], scheduler_state: m.scheduler_state || null }), b({ ...qt, ...m.config || {} });
    } catch (p) {
      console.error("Failed to fetch cards:", p);
    } finally {
      S(!1);
    }
  }, [ce]), nt = Te(() => {
    const o = /* @__PURE__ */ new Map();
    return l.forEach((p) => {
      o.has(p.repo) || o.set(p.repo, 0);
    }), n.forEach((p) => {
      var _;
      const m = ((_ = p.source) == null ? void 0 : _.repo) || "unlinked";
      o.set(m, (o.get(m) || 0) + 1);
    }), [...o.entries()].map(([p, m]) => ({ name: p, count: m })).sort((p, m) => m.count - p.count);
  }, [n, l]), se = Te(
    () => x.size === 0 ? n : n.filter((o) => {
      var p;
      return x.has(((p = o.source) == null ? void 0 : p.repo) || "unlinked");
    }),
    [n, x]
  );
  De(() => {
    G.current = new Set(n.map((o) => o.id)), be.current = new Set(n.flatMap(
      (o) => Object.values(o.step_sessions || {}).filter((p) => !!p.slot_key && !p.chat_disabled_at && !p.superseded).map((p) => p.slot_key)
    ));
  }, [n]), De(() => {
    let o = !1, p = null, m, _ = 0;
    const j = () => {
      if (o) return;
      const q = window.location.protocol === "https:" ? "wss:" : "ws:";
      p = new WebSocket(`${q}//${window.location.host}/api/ws`), p.onopen = () => {
        _ = 0;
      }, p.onmessage = (I) => {
        if (typeof I.data == "string")
          try {
            const B = JSON.parse(I.data), Y = B == null ? void 0 : B.data;
            if (B.type === "slots" && Array.isArray(Y)) {
              const ne = new Set(be.current), V = [];
              for (const F of Y) {
                const H = (F == null ? void 0 : F.key) || (F == null ? void 0 : F.slot) || (F == null ? void 0 : F.name), Pe = String((F == null ? void 0 : F.title) || (F == null ? void 0 : F.name) || "");
                typeof H == "string" && H.startsWith("cron-") && [...G.current].some((He) => Pe.includes(He)) && ne.add(H), typeof H == "string" && (F != null && F.running) && ne.has(H) && V.push(H);
              }
              be.current = ne, V.length && O((F) => {
                let H = F;
                for (const Pe of V) {
                  const He = lr(F[Pe]);
                  He !== F[Pe] && (H = { ...H, [Pe]: He });
                }
                return H;
              });
              return;
            }
            const ae = Y == null ? void 0 : Y.slot;
            if (!ae || !be.current.has(ae)) return;
            B.type === "chat_status" && String(Y.status || "").toLowerCase().startsWith("thinking") || B.type === "chat_thinking" ? O((ne) => {
              const V = lr(ne[ae], B.type === "chat_status");
              return V === ne[ae] ? ne : { ...ne, [ae]: V };
            }) : B.type === "chat_chunk" && typeof Y.content == "string" ? O((ne) => {
              const V = zr(ne[ae], Y.content, Number(Y.seq));
              return V === ne[ae] ? ne : { ...ne, [ae]: V };
            }) : B.type === "chat_done" && O((ne) => {
              const V = Pr(ne[ae]);
              return V === ne[ae] ? ne : { ...ne, [ae]: V };
            });
          } catch {
          }
      }, p.onclose = () => {
        if (o) return;
        const I = Math.min(1e3 * 2 ** _++, 15e3);
        m = setTimeout(j, I);
      }, p.onerror = () => p == null ? void 0 : p.close();
    };
    return j(), () => {
      o = !0, m && clearTimeout(m), p == null || p.close();
    };
  }, []), De(() => {
    if (!Re) return;
    const o = (p) => {
      p.key === "Escape" && Q(!1);
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, [Re]);
  const dt = 6e5, me = Te(() => {
    var m, _, j, q;
    const o = [], p = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked", "retired"]);
    for (const I of se) {
      if (p.has(String(I.lifecycle || "").toLowerCase())) continue;
      const B = I.step_status || {}, Y = I.step_sessions || {}, ae = l.find((V) => V.id === I.pipeline_id) || l.find((V) => {
        var F;
        return V.repo === ((F = I.source) == null ? void 0 : F.repo);
      }), ne = /* @__PURE__ */ new Set([...Object.keys(B), ...Object.keys(Y)]);
      for (const V of ne) {
        const F = B[V] || "idle", H = Y[V], Pe = F === "pending" || F === "error", He = !!(H && (H.chat_disabled_at || H.superseded || H.retired_at || H.cron_pause_observed_at || H.retention === "released")), te = !!(H != null && H.slot_key) && !He;
        if (!Pe && !te || !Pe && He) continue;
        const ue = (m = I.pending_at) == null ? void 0 : m[V], Ue = Pe && !!ue && Date.now() - new Date(ue).getTime() > dt, Ee = (_ = ae == null ? void 0 : ae.steps) == null ? void 0 : _.find((bt) => bt.id === V), lt = (H == null ? void 0 : H.agent) || ((j = Ee == null ? void 0 : Ee.agent) == null ? void 0 : j.crew) || ((q = Ee == null ? void 0 : Ee.agent) == null ? void 0 : q.name) || "orchestrator", gt = H == null ? void 0 : H.agent_id, Ut = H == null ? void 0 : H.slot_key, Ft = H == null ? void 0 : H.session_key, jt = gt ? U.some((bt) => bt.id === gt) : Pe && U.some((bt) => (bt.task || "").includes(I.id) || (bt.task || "").includes(I.title)), Or = !!(H != null && H.last_response_at) && (!H.last_response_handled_at || H.last_response_handled_at < H.last_response_at);
        o.push({ cardId: I.id, card: I.title || I.id, step: V, agent: lt, stale: Ue, status: F, live: jt, responsePending: Or, agentId: gt, slotKey: Ut, sessionKey: Ft, sessionName: H == null ? void 0 : H.name });
      }
    }
    return o;
  }, [se, l, U]), ze = Te(() => {
    var j;
    let o;
    if (x.size === 1) {
      const q = [...x][0];
      o = (j = l.find((I) => I.repo === q)) == null ? void 0 : j.steps;
    } else l.length === 1 && (o = l[0].steps);
    const p = (o && o.length ? o : Zt).map((q) => ({ ...q })), m = new Set(p.map((q) => q.id)), _ = [];
    return m.has("intake") || _.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), _.push(...p), m.has("done") || _.push({ id: "done", name: "Done", type: "agent" }), _;
  }, [x, l]), ot = Te(() => ze.map((o) => o.id), [ze]), N = le((o) => {
    var p;
    return ((p = ze.find((m) => m.id === o)) == null ? void 0 : p.type) === "gate" || o.startsWith("gate-");
  }, [ze]), L = le((o) => {
    var p, m;
    return ((m = (p = ze.find((_) => _.id === o)) == null ? void 0 : p.agent) == null ? void 0 : m.name) || ja[o] || "unknown";
  }, [ze]), xe = le((o) => {
    var j, q;
    const p = o.step_sessions || {}, m = Object.entries(p).find(
      ([, I]) => I.retained_for_gate === o.stage && I.retention !== "released"
    );
    let _ = ((j = o.gate_review) == null ? void 0 : j.producer_step) || (m == null ? void 0 : m[0]);
    if (!_) {
      const I = l.find((V) => V.id === o.pipeline_id) || l.find((V) => {
        var F;
        return V.repo === ((F = o.source) == null ? void 0 : F.repo);
      }), B = (q = I == null ? void 0 : I.steps) != null && q.length ? I.steps : Zt, Y = [
        { id: "intake", name: "Intake", type: "agent" },
        ...B.filter((V) => V.id !== "intake" && V.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], ae = Y.findIndex((V) => V.id === o.stage), ne = ae >= 0 ? Y[ae] : void 0;
      if (_ = ne == null ? void 0 : ne.reviews_step, !_ && ae >= 0)
        for (let V = ae - 1; V >= 0; V--) {
          const F = Y[V];
          if (!(F.id === "intake" || F.id === "done") && F.type !== "gate" && !F.id.startsWith("gate-")) {
            _ = F.id;
            break;
          }
        }
    }
    return _;
  }, [l]), $e = le((o) => {
    const p = xe(o);
    if (!p) return;
    const m = (o.step_sessions || {})[p];
    if (!(!(m != null && m.slot_key) || m.chat_disabled_at || m.superseded))
      return {
        step: p,
        slotKey: m.slot_key,
        retained: m.retention === "held-for-gate"
      };
  }, [xe]);
  De(() => {
    const o = async () => {
      try {
        const _ = tt.slice(0, tt.lastIndexOf("/")), j = (_ ? _ + "/" : "") + "live_spawns.json", q = await e.get("/api/file-read?path=" + encodeURIComponent(j));
        Le.current = !1;
        const I = q != null && q.at ? Date.now() - new Date(q.at).getTime() < 18e4 : !0;
        oe(I && Array.isArray(q == null ? void 0 : q.runs) ? q.runs : []);
      } catch {
        Le.current = !0, oe([]);
      }
    };
    let p = 0;
    Be(!0).then(o);
    const m = setInterval(() => {
      p += 1;
      const _ = p % 12 === 0;
      Be(_).then(() => {
        Le.current || o();
      });
    }, 1e4);
    return () => clearInterval(m);
  }, [Be, e]);
  const _e = le(async () => {
    he(!0);
    let o = [];
    try {
      const m = await ce("~/.kiro/crew/config.json");
      o = Sa(m == null ? void 0 : m.agents), y(o);
    } catch (m) {
      console.warn("crew roster (config.json) unreadable:", m), y([]);
    }
    const p = await Promise.all($a(o).map(async (m) => {
      const _ = Ta(m, o);
      if (!_) return rr(null, m);
      try {
        const j = await ce(_);
        return rr(j, m, _);
      } catch {
        return rr(null, m, _);
      }
    }));
    T(p), he(!1);
  }, [ce]), qe = le(() => {
    we(!0), _e();
  }, [_e]), Oe = le((o) => {
    _e().then(() => D(o));
  }, [_e]), Ze = le(async (o) => {
    await e.post("/apps/dlc-yolo/api/agents/crew", {
      mode: o.mode,
      name: o.name,
      kiro_agent: o.kiroAgent,
      workspace: o.workspace || null,
      memory_store: o.memoryStore || null
    }), await _e();
  }, [e, _e]), de = le(async (o) => {
    try {
      const p = await Yt(ce);
      tt = p.path, p.data.cards = p.data.cards || [], o(p.data);
      let m = p;
      try {
        m = await Yt(ce), tt = m.path, m.data.cards = m.data.cards || [], o(m.data);
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
  }, [e, Be, ce]), Je = le((o) => {
    b((p) => ({ ...p, ...o })), de((p) => {
      p.config = { ...qt, ...p.config || {}, ...o };
    });
  }, [de]), Nt = le((o, p, m, _) => {
    const j = (/* @__PURE__ */ new Date()).toISOString(), q = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    de((I) => {
      var V;
      const B = I.cards.find((F) => F.id === o);
      if (!B || B.stage !== p) return;
      if (_ === void 0 && m.type === "interject") {
        const F = m.text.trim();
        if (!F) return;
        B.interjection = B.interjection || [], B.interjection.some((H) => H.id === q) || B.interjection.push({
          id: q,
          at: j,
          step: p,
          kind: m.kind,
          text: F,
          by: "user",
          status: "pending"
        }), B.updated_at = j;
        return;
      }
      if ((((V = B.gate_review) == null ? void 0 : V.result_revision) ?? null) !== _) return;
      const ae = m.type === "reject" ? m.reason.trim() : void 0, ne = m.type === "interject" ? m.text.trim() : void 0;
      m.type === "reject" && !ae || m.type === "interject" && !ne || (B.gate_commands = B.gate_commands || [], B.gate_commands.some((F) => F.id === q) || B.gate_commands.push({
        id: q,
        gate: p,
        action: m.type,
        expected_revision: _ ?? null,
        actor: "user",
        at: j,
        status: "pending",
        ...ae ? { reason: ae } : {},
        ...m.type === "interject" ? { kind: m.kind, text: ne } : {}
      }), B.updated_at = j);
    });
  }, [de]), _t = le((o, p, m) => {
    const _ = (/* @__PURE__ */ new Date()).toISOString(), j = fa();
    de((q) => {
      const I = q.cards.find((Y) => Y.id === o);
      if (!I) return;
      let B;
      try {
        B = ka({ id: j, kind: p, text: m, card: I, now: _ });
      } catch {
        return;
      }
      I.interjection = wa(I.interjection, B), I.updated_at = _;
    });
  }, [de]), Ct = le((o) => {
    if (!window.confirm("Cancel this card? Writes are revoked cooperatively — a live turn may not stop immediately, and its worktree is retained until terminal observation.")) return;
    const p = (/* @__PURE__ */ new Date()).toISOString();
    de((m) => {
      const _ = m.cards.find((j) => j.id === o);
      _ && (_.lifecycle = "cancelled", _.writes_allowed = !1, _.cancel_requested_at = p, _.updated_at = p);
    });
  }, [de]), st = le((o, p, m) => {
    de((_) => {
      const j = _.cards.find((I) => I.id === o);
      if (!j) return;
      const q = (j.decisions || []).find((I) => I.id === p);
      if (q) {
        const I = (/* @__PURE__ */ new Date()).toISOString();
        q.chosen = m && m.trim() ? m.trim() : "acknowledged", q.status = m ? "resolved" : "acknowledged", q.resolved_at = I, q.resolved_by = "user";
      }
      j.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [de]), er = le(async (o) => {
    var _, j, q;
    const m = ((I) => {
      var ae;
      const B = I == null ? void 0 : I.orchestrator_session;
      if (B != null && B.slot_key) return B.slot_key;
      if (B != null && B.session_key) return B.session_key.replace(/^cron:/, "cron-");
      const Y = (ae = l.find((ne) => ne.id === (I == null ? void 0 : I.pipeline_id))) == null ? void 0 : ae.orchestrator_session;
      return (Y == null ? void 0 : Y.slot_key) || (Y != null && Y.session_key ? Y.session_key.replace(/^cron:/, "cron-") : void 0);
    })(o);
    if (m) {
      r(`/chat?sid=${encodeURIComponent(m)}`);
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
      await new Promise((B) => setTimeout(B, 2e3));
      try {
        const B = await pr(ce, tt), Y = (B.data.cards || []).find((V) => V.id === o.id), ae = (_ = (B.data.pipelines || []).find((V) => V.id === (Y == null ? void 0 : Y.pipeline_id))) == null ? void 0 : _.orchestrator_session, ne = ((j = Y == null ? void 0 : Y.orchestrator_session) == null ? void 0 : j.slot_key) || (((q = Y == null ? void 0 : Y.orchestrator_session) == null ? void 0 : q.session_key) || (ae == null ? void 0 : ae.session_key) || "").replace(/^cron:/, "cron-") || (ae == null ? void 0 : ae.slot_key);
        if (ne) {
          Be(), r(`/chat?sid=${encodeURIComponent(ne)}`);
          return;
        }
      } catch {
      }
    }
    Be();
  }, [e, r, ce, Be]), tr = le((o) => {
    de((p) => {
      var j;
      const m = p.cards.find((q) => q.id === o);
      if (!m) return;
      const _ = m.trust || ((j = p.config) == null ? void 0 : j.trust) || qt.trust;
      m.trust = ct[(ct.indexOf(_) + 1) % ct.length], m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [de]), It = le((o) => {
    de((p) => {
      var j;
      const m = p.cards.find((q) => q.id === o);
      if (!m) return;
      const _ = m.depth || ((j = p.config) == null ? void 0 : j.depth) || qt.depth;
      m.depth = kt[(kt.indexOf(_) + 1) % kt.length], m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [de]), Mt = le((o, p) => {
    de((m) => {
      const _ = m.cards.find((j) => j.id === o);
      _ && (p ? _.budget = { ...p } : delete _.budget, _.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [de]), Dt = le((o) => {
    k((p) => {
      const m = new Set(p);
      return m.has(o) ? m.delete(o) : m.add(o), m;
    });
  }, []), St = le(() => k(/* @__PURE__ */ new Set()), []), $t = le(async () => {
    const o = _e(), p = [];
    try {
      const m = await e.get("/api/file-read?path=~/.kiro/crew/config.json"), _ = (m == null ? void 0 : m.workspaces) || {};
      Object.entries(_).forEach(([j, q]) => {
        const I = typeof (q == null ? void 0 : q.repo) == "string" && /^[^/\s]+\/[^/\s]+$/.test(q.repo) ? q.repo : "";
        p.push({
          repo: I,
          workspace: j,
          label: j,
          source: "workspace",
          detail: (q == null ? void 0 : q.dir) || j,
          path: typeof (q == null ? void 0 : q.dir) == "string" ? q.dir : void 0
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
    z(p), await o, E(!0);
  }, [e, _e]), Tt = le(async (o) => {
    const p = (/* @__PURE__ */ new Date()).toISOString(), m = "pl-" + Math.random().toString(36).slice(2, 10);
    await de((_) => {
      _.pipelines = _.pipelines || [];
      const j = _.pipelines.find((q) => q.repo === o.repo);
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
    }), E(!1), D(null), k(/* @__PURE__ */ new Set([o.repo]));
  }, [de]), Bt = le(async (o) => {
    await de((p) => {
      p.pipelines = (p.pipelines || []).filter((m) => m.repo !== o), p.cards = (p.cards || []).filter((m) => {
        var _;
        return (((_ = m.source) == null ? void 0 : _.repo) || "unlinked") !== o;
      });
    }), k((p) => {
      const m = new Set(p);
      return m.delete(o), m;
    });
  }, [de]), pt = Te(() => {
    const o = /* @__PURE__ */ new Set(["retired", "cancelled", "canceled", "merged", "superseded"]);
    return ot.reduce((p, m) => (p[m] = se.filter((_) => _.stage === m && !o.has(String(_.lifecycle || ""))), p), {});
  }, [se, ot]), ut = Te(
    () => se.filter((o) => ["retired", "merged"].includes(String(o.lifecycle || ""))),
    [se]
  ), mt = Te(
    () => se.filter((o) => ["cancelled", "canceled", "superseded"].includes(String(o.lifecycle || ""))),
    [se]
  ), zt = le((o) => {
    var p;
    (p = document.getElementById(`stage-col-${o}`)) == null || p.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), Rt = Te(() => {
    const o = {};
    return se.forEach((p) => {
      var _;
      const m = ((_ = p.source) == null ? void 0 : _.repo) || "unlinked";
      (o[m] || (o[m] = [])).push(p);
    }), o;
  }, [se]), At = Te(() => {
    const o = {};
    return se.forEach((p) => {
      const m = L(p.stage);
      (o[m] || (o[m] = [])).push(p);
    }), o;
  }, [se, L]), Pt = Te(() => {
    const o = Object.fromEntries(mr.map((p) => [p, []]));
    return se.forEach((p) => {
      var q, I;
      const m = l.find((B) => B.id === p.pipeline_id) || l.find((B) => {
        var Y;
        return B.repo === ((Y = p.source) == null ? void 0 : Y.repo);
      }), _ = ((I = (q = m == null ? void 0 : m.steps) == null ? void 0 : q.find((B) => B.id === p.stage)) == null ? void 0 : I.type) === "gate" || N(p.stage), j = me.some((B) => B.cardId === p.id && B.step === p.stage && B.live);
      o[gr(p, { isGate: _, liveObserved: j }).kind].push(p);
    }), Object.fromEntries(mr.filter((p) => o[p].length > 0).map((p) => [$r[p].label, o[p]]));
  }, [se, l, N, me]), vt = /* @__PURE__ */ new Set(["retired", "merged", "cancelled", "canceled", "superseded"]), v = se.filter((o) => !vt.has(String(o.lifecycle || ""))).length, R = se.filter((o) => N(o.stage) && !vt.has(String(o.lifecycle || ""))).length, fe = se.filter((o) => vt.has(String(o.lifecycle || ""))).length, ye = se.reduce((o, p) => {
    var m;
    return o + (((m = p.parked) == null ? void 0 : m.length) || 0);
  }, 0), pe = {
    pipeline: se.length,
    workspace: Object.keys(Rt).length,
    crew: Object.keys(At).length,
    status: se.length,
    backlog: ye
  }, Ve = me.some((o) => {
    var p, m;
    return !!o.slotKey && ((p = Z[o.slotKey]) == null ? void 0 : p.active) && ((m = Z[o.slotKey]) == null ? void 0 : m.phase) === "generating";
  }), Wt = me.some((o) => {
    var p, m;
    return !!o.slotKey && ((p = Z[o.slotKey]) == null ? void 0 : p.active) && ((m = Z[o.slotKey]) == null ? void 0 : m.phase) === "thinking";
  }), ht = (o) => {
    var F, H, Pe, He;
    const p = l.find((te) => te.id === o.pipeline_id) || l.find((te) => {
      var ue;
      return te.repo === ((ue = o.source) == null ? void 0 : ue.repo);
    }), m = ((H = (F = p == null ? void 0 : p.steps) == null ? void 0 : F.find((te) => te.id === o.stage)) == null ? void 0 : H.type) === "gate" || N(o.stage), _ = ["cancelled", "canceled", "retired", "merged", "superseded"].includes(String(o.lifecycle || "")), j = m && !_, q = j ? ((Pe = o.gate_review) == null ? void 0 : Pe.result_revision) ?? null : void 0, I = j ? xe(o) : void 0, B = j ? $e(o) : void 0, Y = me.some((te) => te.cardId === o.id && te.step === o.stage && te.live), ae = gr(o, { isGate: j, liveObserved: Y }), ne = (He = p == null ? void 0 : p.steps) == null ? void 0 : He.find((te) => te.id === o.stage), V = o.capability || (ne == null ? void 0 : ne.capability) || "auto-derived";
    return {
      card: o,
      config: c,
      isGate: j,
      cardStatus: ae,
      effectiveCapability: V,
      producerStep: I,
      producerSession: B,
      onOpenProducer: B ? () => r(`/chat?sid=${encodeURIComponent(B.slotKey)}`) : void 0,
      onApprove: j ? () => Nt(o.id, o.stage, { type: "approve" }, q) : void 0,
      onReject: j ? (te) => Nt(o.id, o.stage, { type: "reject", reason: te }, q) : void 0,
      onCycleTrust: () => tr(o.id),
      onCycleDepth: () => It(o.id),
      onSetBudget: (te) => Mt(o.id, te),
      onInterject: (te, ue) => Nt(
        o.id,
        o.stage,
        { type: "interject", kind: te, text: ue },
        q
      ),
      onResolveDecision: (te, ue) => st(o.id, te, ue),
      onOpenOrchestrator: () => er(o),
      liveView: (() => {
        var lt, gt, Ut, Ft;
        const te = (gt = (lt = o.step_sessions) == null ? void 0 : lt[o.stage]) == null ? void 0 : gt.slot_key, ue = te ? Z[te] : void 0, Ue = me.some((jt) => jt.cardId === o.id && jt.step === o.stage && jt.live), Ee = Wr((Ut = o.step_progress) == null ? void 0 : Ut[o.stage]);
        if (ue != null && ue.active)
          return {
            stage: o.stage,
            phase: ue.phase || "running",
            tail: ue.tail || "",
            active: !!ue.active && Ue,
            seq: ue.seq || 0,
            slotKey: te,
            onOpen: () => r(`/chat?sid=${encodeURIComponent(te)}`)
          };
        if (Ee && (Ue || ((Ft = o.step_status) == null ? void 0 : Ft[o.stage]) === "pending"))
          return {
            stage: o.stage,
            phase: Ee.phase,
            tail: Ee.tail,
            active: !!Ue,
            seq: Ee.seq,
            slotKey: te || "",
            source: "progress-trail",
            onOpen: () => te && r(`/chat?sid=${encodeURIComponent(te)}`)
          };
      })(),
      allCards: se,
      onRequest: (te, ue) => _t(o.id, te, ue),
      onOpenStepSession: (() => {
        const te = o.step_sessions;
        if (!te || typeof te != "object") return;
        const ue = Object.entries(te).map(([Ue, Ee]) => {
          const lt = (Ee == null ? void 0 : Ee.slot_key) || (Ee != null && Ee.session_key ? Ee.session_key.replace(/^cron:/, "cron-") : void 0);
          return lt ? { step: Ue, open: () => r(`/chat?sid=${encodeURIComponent(lt)}`) } : null;
        }).filter((Ue) => Ue !== null);
        return ue.length ? ue : void 0;
      })(),
      onCancelCard: () => Ct(o.id),
      onOpenCard: (te) => {
        const ue = document.getElementById(`card-${te}`);
        if (ue) {
          ue.scrollIntoView({ behavior: "smooth", block: "center" });
          const Ue = ue.style.outline;
          ue.style.outline = "2px solid var(--accent)", setTimeout(() => {
            ue.style.outline = Ue;
          }, 1400);
        }
      }
    };
  };
  return /* @__PURE__ */ a(Ge, { children: [
    /* @__PURE__ */ t(qr, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    ge && /* @__PURE__ */ t(
      sr,
      {
        profiles: J,
        crews: X,
        loading: ie,
        context: x.size === 1 ? [...x][0] : void 0,
        onRefresh: () => {
          _e();
        },
        onSaveCrew: Ze,
        onClose: () => we(!1)
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
                Wa,
                {
                  pipeline: l.find((o) => se.some((p) => p.pipeline_id === o.id)) || l[0],
                  cards: se,
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
    Ae && /* @__PURE__ */ t(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (o) => {
          o.currentTarget === o.target && je(!1);
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
                  ye ? ` · ${ye}` : ""
                ] }),
                /* @__PURE__ */ t("button", { onClick: () => je(!1), className: "text-[13px] px-2 py-0.5 rounded hover:opacity-80", style: { color: "var(--muted)" }, "aria-label": "Close", children: "✕" })
              ] }),
              /* @__PURE__ */ t("div", { className: "px-4 py-3 overflow-y-auto", children: /* @__PURE__ */ t(Ua, { cards: se }) })
            ]
          }
        )
      }
    ),
    Se && /* @__PURE__ */ t(
      Ia,
      {
        cards: se,
        schedulerState: u.scheduler_state,
        statePath: tt,
        readAppFile: ce,
        onClose: () => C(!1)
      }
    ),
    Re && /* @__PURE__ */ t(
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
                    /* @__PURE__ */ t("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: me.length })
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
              /* @__PURE__ */ t("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: me.length === 0 ? /* @__PURE__ */ t("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : me.map((o) => {
                const p = o.slotKey ? Z[o.slotKey] : void 0;
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
                        /* @__PURE__ */ t(wt, { size: 13 }),
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
      kr,
      {
        candidates: $,
        existingRepos: new Set(l.map((o) => o.repo)),
        defaults: c,
        agentProfiles: J,
        crews: X,
        onCreate: Tt,
        onSaveCrew: Ze,
        onClose: () => E(!1)
      }
    ),
    A && /* @__PURE__ */ t(
      kr,
      {
        candidates: $,
        existingRepos: new Set(l.map((o) => o.repo)),
        defaults: c,
        agentProfiles: J,
        crews: X,
        editPipeline: l.find((o) => o.repo === A) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + A, repo: A, source: "manual", trust: c.trust, depth: c.depth, backlog_intake: !0, sot: "github", steps: Zt.map((o) => ({ ...o })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: n.filter((o) => {
          var p;
          return (((p = o.source) == null ? void 0 : p.repo) || "unlinked") === A;
        }).length,
        isExample: Er.has(A),
        onCreate: Tt,
        onSaveCrew: Ze,
        onDelete: Bt,
        onClose: () => D(null)
      }
    ),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ t(Ea, { steps: ze, cardsByStage: pt, onNodeClick: zt }),
      /* @__PURE__ */ a("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3", children: [
        /* @__PURE__ */ t(Gt, { label: "Active", value: String(v), accent: !0 }),
        /* @__PURE__ */ t(Gt, { label: "Gated", value: String(R) }),
        /* @__PURE__ */ t(Gt, { label: "Done", value: String(fe) }),
        /* @__PURE__ */ t(Gt, { label: "Parked", value: String(ye) })
      ] }),
      /* @__PURE__ */ t(
        oa,
        {
          repos: nt.map((o) => o.name),
          selectedRepos: [...x],
          onNewPipeline: () => {
            $t();
          },
          onConfigure: Oe,
          onOpenAgents: qe
        }
      ),
      /* @__PURE__ */ a("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ t(
          Fa,
          {
            repos: nt,
            selected: x,
            onToggle: Dt,
            onClear: St,
            onAddWorkspace: $t,
            onEdit: Oe
          }
        ),
        /* @__PURE__ */ a("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ a("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ t(Oa, { active: f, onChange: g, counts: pe }),
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
                onClick: () => je(!0),
                "aria-haspopup": "dialog",
                className: "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Parked backlog ideas",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--muted)" },
                children: [
                  "📋 ",
                  /* @__PURE__ */ t("span", { className: "font-semibold", children: "Backlog" }),
                  ye ? /* @__PURE__ */ a("span", { style: { color: "var(--accent)" }, children: [
                    "· ",
                    ye
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
                "aria-expanded": Re,
                className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Open enabled agent sessions and see live activity",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: Ve || Wt || me.some((o) => o.status === "pending" || o.responsePending) ? "var(--accent)" : "var(--muted)" },
                children: [
                  Wt ? /* @__PURE__ */ t(wt, { size: 11 }) : /* @__PURE__ */ t(
                    "span",
                    {
                      className: Ve || me.some((o) => o.status === "pending" || o.responsePending) ? "inline-block animate-pulse" : "inline-block",
                      style: { width: 7, height: 7, borderRadius: 999, background: Ve ? "var(--ok)" : me.some((o) => o.responsePending) ? "var(--warn)" : me.some((o) => o.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: me.length ? 1 : 0.5 }
                    }
                  ),
                  /* @__PURE__ */ t("span", { className: "font-semibold", children: me.length ? `${me.length} session${me.length === 1 ? "" : "s"}` : "no sessions" }),
                  Wt && /* @__PURE__ */ t("span", { children: "· thinking" }),
                  Ve && /* @__PURE__ */ t("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                  !Wt && !Ve && me.filter((o) => o.status === "pending").length > 0 && /* @__PURE__ */ a("span", { children: [
                    "· ",
                    me.filter((o) => o.status === "pending").length,
                    " running"
                  ] }),
                  me.some((o) => o.responsePending) && /* @__PURE__ */ t("span", { style: { color: "var(--warn)" }, children: "· response" }),
                  me.some((o) => o.stale) && /* @__PURE__ */ a("span", { style: { color: "var(--warn)" }, children: [
                    "· ",
                    me.filter((o) => o.stale).length,
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
                  /* @__PURE__ */ t("button", { onClick: St, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ t(za, { config: c, onSet: Je }),
          h ? /* @__PURE__ */ t("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : /* @__PURE__ */ a("div", { ref: Ne, className: "flex gap-3 overflow-x-auto pb-4", children: [
            f === "pipeline" && ze.map((o) => /* @__PURE__ */ t(yt, { id: `stage-col-${o.id}`, title: o.name, count: (pt[o.id] || []).length, children: (pt[o.id] || []).map((p) => /* @__PURE__ */ t(ft, { ...ht(p) }, p.id)) }, o.id)),
            f === "pipeline" && ut.length > 0 && /* @__PURE__ */ t("div", { className: "flex-shrink-0 pl-3", style: { borderLeft: "2px dashed var(--border-strong, var(--border))" }, children: /* @__PURE__ */ t(yt, { id: "stage-col-done", title: "✅ Done", count: ut.length, children: ut.map((o) => /* @__PURE__ */ t(ft, { ...ht(o) }, o.id)) }) }),
            f === "pipeline" && mt.length > 0 && /* @__PURE__ */ t(yt, { id: "stage-col-cancelled", title: "⏹ Cancelled", count: mt.length, children: mt.map((o) => /* @__PURE__ */ t(ft, { ...ht(o) }, o.id)) }),
            f === "workspace" && Object.entries(Rt).map(([o, p]) => /* @__PURE__ */ t(yt, { title: o, count: p.length, children: p.map((m) => /* @__PURE__ */ t(ft, { ...ht(m) }, m.id)) }, o)),
            f === "crew" && Object.entries(At).map(([o, p]) => /* @__PURE__ */ t(yt, { title: o, count: p.length, children: p.map((m) => /* @__PURE__ */ t(ft, { ...ht(m) }, m.id)) }, o)),
            f === "status" && Object.entries(Pt).map(([o, p]) => /* @__PURE__ */ t(yt, { title: o, count: p.length, children: p.map((m) => /* @__PURE__ */ t(ft, { ...ht(m) }, m.id)) }, o))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  an as default
};
