import { jsx as e, Fragment as He, jsxs as o } from "react/jsx-runtime";
import { useChatLauncher as nr, useAppApi as Kt, useNavigate as sr } from "@kirocrew/app-sdk";
import { PageHeader as lr, StatCard as gt } from "@kirocrew/app-sdk/ui";
import { useState as w, useCallback as te, useEffect as _e, useMemo as ye, useRef as ke } from "react";
const ir = new RegExp("\\p{L}[\\p{L}\\p{N}_'’-]*|\\p{N}+(?:[.,]\\p{N}+)*|[^\\s\\p{L}\\p{N}]", "gu"), dr = /^[.,!?;:%)\]}]$/u, cr = /^[(\[{]$/u;
function pr(t, r = 3) {
  const d = (String(t || "").match(ir) || []).slice(-Math.max(0, r));
  return d.reduce((i, u, b) => {
    if (b === 0) return u;
    const N = d[b - 1];
    return dr.test(u) || cr.test(N) ? i + u : i + " " + u;
  }, "");
}
function jt(t, r = !1) {
  return t != null && t.active && !r ? t : { buffer: "", tail: "", active: !0, phase: "thinking", seq: 0 };
}
function ur(t, r, s) {
  if (!r || t != null && t.active && Number.isFinite(s) && Number.isFinite(t.seq) && s <= t.seq)
    return t;
  const i = ((t != null && t.active ? t.buffer : "") + r).slice(-512);
  return { buffer: i, tail: pr(i, 3), active: !0, phase: "generating", seq: Number(s) || 0 };
}
function mr(t) {
  return t && { ...t, active: !1, phase: "idle" };
}
const vr = /* @__PURE__ */ new Set(["done", "advanced"]), gr = /* @__PURE__ */ new Set([
  "done",
  "advanced",
  "completed",
  "consumed",
  "integrated",
  "waived",
  "omitted"
]), Te = (t) => !!t && typeof t == "object" && !Array.isArray(t), H = (t) => Te(t) ? t : {}, ie = (t) => Array.isArray(t) ? t : t == null ? [] : [t], q = (...t) => t.find((r) => r != null && r !== "");
function Ie(t) {
  if (t == null || t === "") return "unobservable";
  if (typeof t == "boolean") return t ? "yes" : "no";
  if (typeof t == "string" || typeof t == "number") return String(t);
  if (Array.isArray(t)) return t.length ? t.map(Ie).join(" · ") : "none";
  if (Te(t)) {
    const r = Object.entries(t);
    return r.length ? r.map(([s, d]) => `${s}: ${Ie(d)}`).join(" · ") : "none";
  }
  return String(t);
}
function Le(t) {
  return ie(t).map((r, s) => {
    if (!Te(r))
      return { key: `item-${s}`, title: Ie(r), detail: null, status: null, level: null, ref: null, url: null };
    const d = q(
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
    ) || `item ${s + 1}`, i = q(
      r.summary,
      r.detail,
      r.description,
      r.rationale,
      r.result,
      r.note,
      r.reason,
      r.path,
      r.ref
    ), u = q(
      r.enforcement,
      r.level,
      r.priority,
      r.required === !0 ? "required" : void 0
    ), b = q(
      r.status,
      r.outcome,
      r.state,
      r.passed === !0 ? "passed" : void 0,
      r.passed === !1 ? "failed" : void 0
    ), N = q(r.url, r.path, r.ref), p = typeof N == "string" && /^https?:\/\//.test(N) ? N : null;
    return {
      key: String(q(r.id, r.key, r.path, r.ref, `item-${s}`)),
      title: String(d),
      detail: i == null || String(i) === String(d) ? null : Ie(i),
      status: b == null ? null : String(b),
      level: u == null ? null : String(u),
      ref: N == null ? null : String(N),
      url: p
    };
  });
}
function hr(t) {
  return ie(t).filter((r) => r != null).map((r, s) => {
    const d = H(r), i = Te(r) ? q(d.url, d.path, d.ref, d.id) : String(r), u = Te(r) ? q(d.label, d.name, d.kind, d.id, d.path, d.ref, `artifact ${s + 1}`) : String(r), b = q(d.url, typeof i == "string" && /^https?:\/\//.test(i) ? i : void 0), N = q(d.preview, d.summary, d.description, d.evidence, d.detail);
    return {
      key: String(q(d.id, d.path, d.ref, `artifact-${s}`)),
      label: String(u),
      ref: i == null ? null : String(i),
      url: typeof b == "string" && /^https?:\/\//.test(b) ? b : null,
      preview: N == null ? null : Ie(N),
      kind: d.kind == null ? null : String(d.kind),
      status: d.status == null ? null : String(d.status)
    };
  });
}
function br(t) {
  return ie(t.children).map((s, d) => {
    const i = H(s), u = i.required !== !1 && !["optional", "preferred", "advisory"].includes(
      String(q(i.enforcement, i.level, "required")).toLowerCase()
    ), b = String(q(i.status, i.state, "unobservable"));
    return {
      key: String(q(i.id, i.card_id, i.issue, `child-${d}`)),
      label: String(q(i.title, i.name, i.card_id, i.id, i.issue, `child ${d + 1}`)),
      required: u,
      status: b,
      complete: gr.has(b.toLowerCase())
    };
  });
}
const Vt = /* @__PURE__ */ new Set([
  "done",
  "completed",
  "covered",
  "satisfied",
  "validated",
  "met",
  "passed",
  "approved"
]);
function xr(t, r) {
  const s = H(t == null ? void 0 : t.execution_envelope);
  return s.step === r ? s : ie(t == null ? void 0 : t.execution_envelope_history).map(H).reverse().find((d) => d.step === r) || {};
}
function Xt(t) {
  return typeof t == "string" ? t.trim().length > 0 : Te(t) ? [
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
function Ot(t, r) {
  const s = ie(t.validation_and_evidence).map(H);
  return ie(r).map(String).filter((d) => !s.some((i) => {
    const u = String(q(i.kind, i.type, i.id, "")).toLowerCase(), b = String(q(i.status, "")).toLowerCase();
    return (u === d.toLowerCase() || ie(i.satisfies).map(String).includes(d)) && Vt.has(b) && Xt(i);
  }));
}
function fr(t, r) {
  const s = ie(t.findings).map(H);
  if (!s.length) return !1;
  if (!r) return !0;
  const d = ie(q(t.sources, t.consulted_sources)).map(H).filter((u) => typeof u.url == "string" && /^https?:\/\//.test(u.url) && u.title && u.accessed_at && q(u.source_type, u.type)), i = new Set(d.flatMap((u) => [u.id && String(u.id), u.url]).filter(Boolean));
  return i.size > 0 && s.every((u) => {
    const b = ie(q(u.source_ids, u.sources)).map(String);
    return u.claim && b.some((N) => i.has(N));
  });
}
function yr(t, r, s, d) {
  const i = H(t == null ? void 0 : t.intent_integrity), u = i.status === "violation" ? [`intent integrity (${ie(i.violations).join(", ")})`] : [], b = xr(t, r), N = ie(H(b.observations).controls_runtime);
  if (Number(b.schema_version || 0) < 2 || !N.includes("result_scope"))
    return { missing: u, preferredShortfalls: [] };
  const p = [...u], S = [];
  s.envelope_id !== b.id && p.push("result bound to the active envelope revision");
  const v = ie(t == null ? void 0 : t.decisions).map(H).filter((h) => h.step && h.step !== r || h.envelope_id && h.envelope_id !== b.id ? !1 : h.question || [
    "intent-fidelity",
    "scope-drift",
    "technical-fork",
    "capability-gap",
    "qualitative-direction",
    "visual-direction"
  ].includes(h.kind)), $ = v.filter((h) => {
    const ee = String(q(h.status, "")).toLowerCase();
    return h.chosen === void 0 && h.resolved_at == null && !["resolved", "answered", "accepted", "declined", "superseded"].includes(ee);
  }), g = H(b.questions);
  $.length && p.push("all qualified questions resolved before completion"), $.length > 1 && g.cadence === "one-at-a-time" && p.push("one-at-a-time question cadence"), Number.isInteger(g.max_rounds) && v.length > g.max_rounds && p.push(`question rounds within max_rounds=${g.max_rounds}`);
  const y = H(b.result_scope), V = H(y.enforcement), O = new Map(ie(d.intent_and_requirement_coverage).map(H).filter((h) => q(h.intent_id, h.constraint_id, h.id)).map((h) => [String(q(h.intent_id, h.constraint_id, h.id)), h]));
  for (const h of [...ie(y.required_outcome_ids), ...ie(y.hard_constraint_ids)]) {
    const ee = O.get(String(h)) || {}, _ = String(q(ee.status, "")).toLowerCase(), ae = ie(q(ee.evidence_refs, ee.requirement_refs, ee.refs));
    (!Vt.has(_) || !ae.some(Xt)) && p.push(`required intent coverage ${h}`);
  }
  const I = ie(d.alternatives);
  if (Number.isInteger(y.alternatives) && I.length < y.alternatives) {
    const h = `${y.alternatives} material alternatives`;
    V.alternatives === "required" ? p.push(h) : V.alternatives === "preferred" && S.push(h);
  }
  const j = Ot(d, y.evidence), C = Ot(d, y.validation);
  V.evidence === "required" ? p.push(...j.map((h) => `required evidence ${h.toLowerCase()}`)) : V.evidence === "preferred" && S.push(...j.map((h) => `preferred evidence ${h.toLowerCase()}`)), V.validation === "required" ? p.push(...C.map((h) => `required validation ${h.toLowerCase()}`)) : V.validation === "preferred" && S.push(...C.map((h) => `preferred validation ${h.toLowerCase()}`));
  const B = H(b.research_policy), k = H(t == null ? void 0 : t.research_artifacts)[r], M = ie(q(d.research_and_citations, k)).map(H), K = M.filter((h) => fr(
    h,
    B.citations === "required"
  ));
  return B.mode === "required" && !K.length && p.push("required research with claim-level citations"), Number.isInteger(B.max_passes) && M.length > B.max_passes && p.push(`research passes within max_passes=${B.max_passes}`), B.mode === "on-demand" && M.length && !K.length && S.push("complete citations for used research"), {
    missing: [...new Set(p)],
    preferredShortfalls: [...new Set(S)]
  };
}
function kr(t, r, s) {
  const d = H(t.runtime_handshakes), i = H(t.runtime_handshake), u = H(d[r] || (i.step == null || i.step === r ? i : {})), b = H(u.assignment), N = H(u.capabilities), p = H(N.tools), S = H(N.skills), v = H(u.routing), $ = H(v.model), g = H(v.reasoning_effort), y = H(u.scope), V = H(y.worktree), O = H(s.routing_and_provenance), I = H(O.model), j = H(O.reasoning_effort), C = H(O.assignment), B = q(p.profile_declared, p.declared, O.declared_tools), k = q(p.actual, O.actual_tools), M = q(S.profile_declared, S.declared, O.declared_skills), K = q(S.actual, O.actual_skills);
  return {
    assignedProfile: q(
      C.assigned_profile,
      O.assigned_profile,
      b.assigned_profile
    ) ?? null,
    effectiveProfile: q(
      C.effective_profile,
      O.effective_profile,
      b.effective_profile
    ) ?? null,
    model: {
      requested: q(I.requested, O.requested_model, $.requested) ?? null,
      applied: q(I.applied, O.applied_model, $.applied) ?? null,
      provider: q(I.provider, O.resolved_provider, $.provider) ?? null,
      version: q(I.version, O.model_version, $.version) ?? null,
      status: q(
        I.status,
        O.model_resolution_status,
        $.status,
        q(I.applied, O.applied_model, $.applied) != null ? "observed" : "unobservable"
      )
    },
    effort: {
      requested: q(j.requested, O.requested_effort, g.requested) ?? null,
      applied: q(j.applied, O.applied_effort, g.applied) ?? null,
      status: q(
        j.status,
        O.effort_resolution_status,
        g.status,
        q(j.applied, O.applied_effort, g.applied) != null ? "observed" : "unobservable"
      )
    },
    tools: {
      declared: B == null ? null : ie(B),
      actual: k == null ? null : ie(k),
      status: q(p.status, O.tools_status, k != null ? "observed" : "unobservable")
    },
    skills: {
      declared: M == null ? null : ie(M),
      actual: K == null ? null : ie(K),
      status: q(S.status, O.skills_status, K != null ? "observed" : "unobservable")
    },
    network: H(y.network),
    write: H(y.write),
    worktree: Object.keys(V).length ? V : null
  };
}
function wr(t, r) {
  const s = H(t == null ? void 0 : t.gate_review), d = H(s.bundle), i = q(s.gate, t == null ? void 0 : t.stage), u = q(s.producer_step, r), b = H(t == null ? void 0 : t.step_sessions), N = Number.isInteger(s.result_revision) ? s.result_revision : null, p = q(s.status, "unobservable"), S = u ? H(t == null ? void 0 : t.step_status)[u] : void 0, v = hr(d.artifacts), $ = H(d.card_topology), g = br($), y = q($.action, "unobservable"), V = ["fan-in", "unify"].includes(String(y).toLowerCase()), O = V ? g.filter((K) => K.required && !K.complete) : [], I = [];
  (!(t != null && t.gate_review) || !Te(t.gate_review)) && I.push("result bundle record"), (!s.bundle || !Te(s.bundle)) && I.push("declared result bundle"), u || I.push("producer binding"), N === null && I.push("result revision"), i && (t != null && t.stage) && i !== t.stage && I.push("gate binding matches current stage"), p !== "awaiting-review" && I.push(`review status awaiting-review (currently ${p})`), vr.has(String(S || "").toLowerCase()) || I.push(`terminal producer status (currently ${S || "unobservable"})`), q(d.summary) || I.push("result summary"), v.length === 0 && I.push("referenced artifact");
  const j = v.filter((K) => !K.ref);
  j.length > 0 && I.push(`artifact reference (${j.length} missing)`), V && g.length === 0 && I.push("declared fan-in child set"), O.length > 0 && I.push(`required child fan-in (${O.length} incomplete)`);
  const C = yr(t, u, s, d);
  I.push(...C.missing);
  const B = ie(t == null ? void 0 : t.decisions).filter((K) => {
    const h = H(K);
    return !h.chosen && (!u || !h.step || h.step === u);
  }), k = Le([
    ...ie(d.decisions_and_questions),
    ...B
  ]), M = kr(t || {}, u, d);
  return {
    gate: i || null,
    producerStep: u || null,
    producerSessionRef: q(
      s.producer_session_ref,
      u && Te(b[u]) ? `step_sessions.${u}` : void 0
    ) || null,
    envelopeId: q(s.envelope_id) || null,
    revision: N,
    reviewStatus: p,
    createdAt: q(s.created_at) || null,
    ready: I.length === 0,
    missing: I,
    summary: q(d.summary) || null,
    changes: Le(d.changes_since_prior),
    artifacts: v,
    coverage: Le(d.intent_and_requirement_coverage),
    alternatives: Le(d.alternatives),
    research: Le(q(
      d.research_and_citations,
      u && H(t == null ? void 0 : t.research_artifacts)[u]
    )),
    preferredShortfalls: C.preferredShortfalls,
    decisions: k,
    topology: {
      action: y,
      integrationOwner: q($.integration_owner, $.owner) || null,
      integrationStatus: q($.integration_status, $.status) || null,
      children: g,
      incompleteRequiredChildren: O
    },
    budget: {
      allocated: H(d.budget).allocated ?? null,
      consumed: H(d.budget).consumed ?? null,
      remaining: H(d.budget).remaining ?? null
    },
    routing: M,
    validation: Le(d.validation_and_evidence),
    risks: Le(d.known_risks),
    deviations: Le(d.omissions_and_deviations)
  };
}
const Nr = "~/.dlc-yolo/.statepath", Et = "~/.dlc-yolo/state.json", It = "/tmp/dlc-yolo/state.json", _r = 1, Mt = 4096, Cr = 3072;
function Sr(t) {
  let r = t;
  if (typeof t == "string") {
    if (new TextEncoder().encode(t).length > Mt) return null;
    try {
      r = JSON.parse(t);
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
  if (new TextEncoder().encode(s).length > Mt) return null;
  const d = Object.keys(r).sort();
  if (d.length !== 2 || d[0] !== "path" || d[1] !== "schema_version" || r.schema_version !== _r || typeof r.path != "string") return null;
  const i = r.path;
  return !i.startsWith("/") || i.length === 0 || i.length > Cr || i.includes("\0") || i.includes("\r") || i.includes(`
`) || i.split("/").some((u) => u === "." || u === "..") ? null : i;
}
async function yt(t) {
  try {
    const r = await t(Nr), s = Sr(r);
    if (s)
      try {
        return { path: s, data: await t(s), source: "pointer" };
      } catch {
      }
  } catch {
  }
  try {
    return { path: Et, data: await t(Et), source: "durable" };
  } catch {
    return { path: It, data: await t(It), source: "scratch" };
  }
}
async function qt(t, r) {
  try {
    return { path: r, data: await t(r), source: "current" };
  } catch {
    return yt(t);
  }
}
const Ar = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
function Tr(t) {
  const r = /* @__PURE__ */ new Map();
  for (const s of String(t || "").split(/[\n,]/)) {
    const d = s.trim();
    Ar.test(d) && !r.has(d.toLowerCase()) && r.set(d.toLowerCase(), d);
  }
  return [...r.values()].sort((s, d) => s.toLowerCase().localeCompare(d.toLowerCase()));
}
const Rr = {
  "receiver-disabled": "Enable and save the receiver above first.",
  "receiver-secret-missing": "Set a webhook secret above before exposing the port.",
  "receiver-allowlist-empty": "Add at least one allowed repository above first.",
  "receiver-port-mismatch": "Save the receiver on this port before starting the tunnel.",
  "receiver-not-listening": "The receiver is not listening yet — save it, then Refresh.",
  "receiver-config-invalid": "Repair the stored receiver configuration first."
};
function Dt(t) {
  return t === "listening" ? "var(--ok)" : t === "misconfigured" || t === "failed" ? "var(--danger, #ef4444)" : "var(--muted)";
}
function tt(t) {
  const r = (t == null ? void 0 : t.message) || String(t);
  return /(?:404|not found)/i.test(r) ? "Webhook backend unavailable in the running gateway. Restart KiroCrew after syncing this app, then refresh this tab." : r;
}
function $r() {
  var L, le;
  const t = Kt(), [r, s] = w(null), [d, i] = w(!1), [u, b] = w("8765"), [N, p] = w(""), [S, v] = w(""), [$, g] = w(""), [y, V] = w(!1), [O, I] = w(!1), [j, C] = w(!0), [B, k] = w(!1), [M, K] = w(""), h = te((E) => {
    s(E), i(!!E.enabled), b(String(E.port || 8765)), p((E.repositories || []).join(`
`)), v(E.inbox_path || ""), I(!!E.autosync), g(""), V(!1);
  }, []), ee = te(async () => {
    C(!0), K("");
    try {
      h(await t.get("/apps/dlc-yolo/api/webhook/config"));
    } catch (E) {
      K(tt(E));
    } finally {
      C(!1);
    }
  }, [t, h]);
  _e(() => {
    ee();
  }, [ee]);
  const [_, ae] = w(null), [Y, re] = w(!1), se = te(async () => {
    try {
      ae(await t.get("/apps/dlc-yolo/api/tunnel/status"));
    } catch {
      ae(null);
    }
  }, [t]);
  _e(() => {
    se();
  }, [se]);
  const he = te(async () => {
    re(!0);
    try {
      ae(await t.post("/apps/dlc-yolo/api/tunnel/start", {}));
    } catch (E) {
      K(tt(E));
    } finally {
      re(!1);
    }
  }, [t]), Z = te(async () => {
    re(!0);
    try {
      ae(await t.post("/apps/dlc-yolo/api/tunnel/stop", {}));
    } catch (E) {
      K(tt(E));
    } finally {
      re(!1);
    }
  }, [t]), [D, J] = w(null), [ue, z] = w(!1), de = te(async () => {
    try {
      J(await t.get("/apps/dlc-yolo/api/crons/status"));
    } catch {
      J(null);
    }
  }, [t]);
  _e(() => {
    de();
  }, [de]);
  const x = te(async (E) => {
    z(!0);
    try {
      const ge = E ? "/apps/dlc-yolo/api/crons/pause" : "/apps/dlc-yolo/api/crons/resume";
      J(await t.post(ge, {}));
    } catch (ge) {
      K(tt(ge));
    } finally {
      z(!1);
    }
  }, [t]), G = ye(() => Tr(N), [N]), P = Number(u), oe = typeof TextEncoder > "u" ? $.length : new TextEncoder().encode($).length, be = !!(r != null && r.secret_configured) || oe >= 32, U = Number.isInteger(P) && P >= 1024 && P <= 65535 && (!d || G.length > 0 && be) && (!S.trim() || S.trim().startsWith("/")), me = async () => {
    if (!(!(r != null && r.editable) || !U)) {
      k(!0), K("");
      try {
        const E = {
          enabled: d,
          port: P,
          repositories: G,
          inbox_path: S.trim() || null,
          clear_secret: y,
          autosync: O
        };
        $ && (E.secret = $), h(await t.post("/apps/dlc-yolo/api/webhook/config", E));
      } catch (E) {
        K(tt(E));
      } finally {
        k(!1);
      }
    }
  };
  return /* @__PURE__ */ o(
    "section",
    {
      "data-pipeline-webhook-settings": !0,
      "aria-labelledby": "webhook-settings-title",
      className: "w-full rounded-lg overflow-hidden flex flex-col",
      style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))" },
      children: [
        /* @__PURE__ */ e("header", { className: "px-4 py-3 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: /* @__PURE__ */ o("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
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
                style: { color: Dt(r.listener), background: `color-mix(in srgb, ${Dt(r.listener)} 13%, transparent)` },
                children: r.listener
              }
            )
          ] }),
          /* @__PURE__ */ e("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "Shared by every pipeline. This authenticated control owns the app-wide loopback receiver; the secret is write-only and never returned." })
        ] }) }),
        /* @__PURE__ */ o("div", { className: "px-4 py-4 flex flex-col gap-4", children: [
          j ? /* @__PURE__ */ e("div", { className: "text-[12px]", style: { color: "var(--muted)" }, children: "Loading receiver configuration…" }) : r && /* @__PURE__ */ o(He, { children: [
            r.configuration_source === "environment" && /* @__PURE__ */ e("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))", background: "color-mix(in srgb, var(--warn) 7%, transparent)" }, children: "Gateway environment variables currently own this configuration, so the UI is read-only. Remove those overrides and restart the gateway to transfer authority to this form." }),
            r.configuration_source === "invalid" && /* @__PURE__ */ o("div", { className: "rounded-md px-3 py-2 text-[11px]", style: { color: "var(--danger, #ef4444)", border: "1px solid var(--danger, #ef4444)" }, children: [
              "Stored configuration failed secure validation and was not loaded. Repair or remove the app-owned config file before using this form.",
              r.configuration_error && /* @__PURE__ */ o("div", { className: "mt-1 font-mono", children: [
                "Reason: ",
                r.configuration_error
              ] })
            ] }),
            /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
              /* @__PURE__ */ o("div", { children: [
                /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Enable receiver" }),
                /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Applies immediately for UI-managed settings; polling remains reconciliation." })
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  type: "button",
                  disabled: !r.editable,
                  onClick: () => i((E) => !E),
                  "aria-pressed": d,
                  className: "rounded-full transition-all relative disabled:opacity-50",
                  style: { background: d ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                  children: /* @__PURE__ */ e("span", { className: "absolute top-0.5 rounded-full transition-all", style: { height: 18, width: 18, background: "var(--bg)", left: d ? 20 : 2 } })
                }
              )
            ] }),
            /* @__PURE__ */ o("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
              /* @__PURE__ */ o("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Loopback port",
                /* @__PURE__ */ e(
                  "input",
                  {
                    type: "number",
                    min: 1024,
                    max: 65535,
                    value: u,
                    disabled: !r.editable,
                    onChange: (E) => b(E.target.value),
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ o("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Fixed listener route",
                /* @__PURE__ */ o(
                  "div",
                  {
                    className: "mt-1 px-3 py-2 rounded-md text-sm font-mono normal-case",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
                    children: [
                      "127.0.0.1:",
                      Number.isFinite(P) ? P : "—",
                      "/github"
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ o("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "Repository allowlist · one owner/repo per line",
              /* @__PURE__ */ e(
                "textarea",
                {
                  rows: 4,
                  value: N,
                  disabled: !r.editable,
                  onChange: (E) => p(E.target.value),
                  placeholder: "owner/repo",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ o("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "Durable inbox override · optional absolute path",
              /* @__PURE__ */ e(
                "input",
                {
                  value: S,
                  disabled: !r.editable,
                  onChange: (E) => v(E.target.value),
                  placeholder: "Uses the state directory by default",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ o("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
              "GitHub webhook secret · ",
              r.secret_configured ? "configured; leave blank to keep" : "minimum 32 bytes",
              /* @__PURE__ */ e(
                "input",
                {
                  type: "password",
                  autoComplete: "new-password",
                  value: $,
                  disabled: !r.editable,
                  onChange: (E) => g(E.target.value),
                  placeholder: r.secret_configured ? "•••••••••••••••• (unchanged)" : "Enter a new secret",
                  className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                  style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            !d && r.secret_configured && r.editable && /* @__PURE__ */ o("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer", style: { color: "var(--muted)" }, children: [
              /* @__PURE__ */ e("input", { type: "checkbox", checked: y, onChange: (E) => V(E.target.checked) }),
              "Remove the stored secret when saving the disabled receiver"
            ] }),
            /* @__PURE__ */ o(
              "div",
              {
                className: "rounded-md p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Source" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: r.configuration_source })
                  ] }),
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Allowlist" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: r.allowed_repository_count })
                  ] }),
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Pending" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: ((L = r.inbox) == null ? void 0 : L.pending) ?? "—" })
                  ] }),
                  /* @__PURE__ */ o("div", { children: [
                    /* @__PURE__ */ e("span", { style: { color: "var(--muted)" }, children: "Processed" }),
                    /* @__PURE__ */ e("div", { style: { color: "var(--text)" }, children: ((le = r.inbox) == null ? void 0 : le.processed) ?? "—" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ o("div", { className: "text-[11px] leading-5", style: { color: "var(--muted)" }, children: [
              "Configure GitHub for ",
              /* @__PURE__ */ e("strong", { children: "Issues" }),
              " and ",
              /* @__PURE__ */ e("strong", { children: "Labels" }),
              " events and use the same secret. A public relay/tunnel may forward only its ",
              /* @__PURE__ */ e("code", { children: "/github" }),
              " route to this loopback listener—never expose the dashboard or general API."
            ] }),
            /* @__PURE__ */ o(
              "div",
              {
                "data-cloudflare-tunnel": !0,
                className: "rounded-md p-3 flex flex-col gap-2",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ e("span", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "Cloudflare tunnel" }),
                    /* @__PURE__ */ e(
                      "span",
                      {
                        className: "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style: { color: _ != null && _.running ? "var(--ok)" : "var(--muted)", border: "1px solid var(--border)" },
                        children: _ ? _.running ? "running" : _.installed ? "stopped" : "not installed" : "—"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ e("p", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "The receiver is loopback-only, so GitHub needs a public relay. Start a Cloudflare quick tunnel here, or run the shown command yourself. cloudflared is never installed automatically." }),
                  _ && !_.installed && /* @__PURE__ */ o("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "cloudflared is not installed. Install it, then Refresh status.",
                    _.install_hint && /* @__PURE__ */ e("pre", { className: "mt-1 whitespace-pre-wrap font-mono text-[10px]", style: { color: "var(--text)" }, children: _.install_hint })
                  ] }),
                  (_ == null ? void 0 : _.running) && _.payload_url && /* @__PURE__ */ o("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "GitHub payload URL",
                    /* @__PURE__ */ e(
                      "input",
                      {
                        readOnly: !0,
                        value: _.payload_url,
                        onFocus: (E) => E.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ok)" }
                      }
                    )
                  ] }),
                  (_ == null ? void 0 : _.command) && /* @__PURE__ */ o("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                    "Command ",
                    _.running ? "running" : "to run yourself",
                    /* @__PURE__ */ e(
                      "input",
                      {
                        readOnly: !0,
                        value: _.command,
                        onFocus: (E) => E.currentTarget.select(),
                        className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none",
                        style: { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }
                      }
                    )
                  ] }),
                  (_ == null ? void 0 : _.last_error) && /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Tunnel: ",
                    _.last_error
                  ] }),
                  _ && _.installed && !_.running && _.receiver_ready === !1 && /* @__PURE__ */ o("div", { className: "rounded px-2 py-1.5 text-[11px]", style: { color: "var(--warn)", border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))" }, children: [
                    "Won't expose the port until the receiver is ready: ",
                    Rr[_.receiver_block_reason || ""] || _.receiver_block_reason
                  ] }),
                  /* @__PURE__ */ o("div", { className: "flex gap-2", children: [
                    _ != null && _.running ? /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void Z(),
                        disabled: Y,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--danger, #ef4444)", color: "var(--bg)" },
                        children: Y ? "Stopping…" : "Stop tunnel"
                      }
                    ) : /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void he(),
                        disabled: Y || !(_ != null && _.installed) || (_ == null ? void 0 : _.receiver_ready) === !1,
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: Y ? "Starting…" : "Start tunnel"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void se(),
                        disabled: Y,
                        className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50",
                        style: { color: "var(--muted)" },
                        children: "Refresh"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("p", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
                    "Exposes only the receiver's ",
                    /* @__PURE__ */ e("code", { children: "/github" }),
                    " route; every delivery is HMAC-verified. Quick-tunnel URLs change each restart — update the GitHub payload URL when it does."
                  ] }),
                  /* @__PURE__ */ o("label", { className: "flex items-start gap-2 mt-1 cursor-pointer", style: { color: "var(--text)" }, children: [
                    /* @__PURE__ */ e(
                      "input",
                      {
                        type: "checkbox",
                        checked: O,
                        disabled: !(r != null && r.editable),
                        onChange: (E) => I(E.target.checked),
                        className: "mt-0.5"
                      }
                    ),
                    /* @__PURE__ */ o("span", { className: "text-[11px]", children: [
                      /* @__PURE__ */ e("span", { className: "font-medium", children: "Auto-sync the GitHub webhook URL" }),
                      " — on tunnel start, re-point each allowed repo's webhook to the new ",
                      /* @__PURE__ */ e("code", { children: "…trycloudflare.com/github" }),
                      " URL via ",
                      /* @__PURE__ */ e("code", { children: "gh" }),
                      ". Only rewrites a hook already on a quick-tunnel host (a hand-set stable URL is never touched). Save to apply."
                    ] })
                  ] }),
                  (_ == null ? void 0 : _.autosync) && _.autosync.enabled && /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: _.autosync.error ? "var(--danger, #ef4444)" : "var(--ok)" }, children: _.autosync.error ? `Auto-sync failed: ${_.autosync.error}` : `Auto-synced ${(_.autosync.results || []).filter((E) => E.action === "updated").length} hook(s) → ${_.autosync.payload_url}` })
                ]
              }
            ),
            /* @__PURE__ */ o(
              "div",
              {
                "data-automation-crons": !0,
                className: "rounded-md p-3 flex flex-col gap-2",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" },
                children: [
                  /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
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
                  D && !D.available && /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--danger, #ef4444)" }, children: [
                    "Cron control unavailable",
                    D.error ? `: ${D.error}` : "",
                    "."
                  ] }),
                  D && D.available && D.jobs.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-col gap-1", children: D.jobs.map((E) => /* @__PURE__ */ o(
                    "div",
                    {
                      className: "flex items-center justify-between text-[11px] font-mono",
                      style: { color: "var(--muted)" },
                      children: [
                        /* @__PURE__ */ e("span", { children: E.basename }),
                        /* @__PURE__ */ e("span", { style: { color: E.paused ? "var(--warn)" : "var(--ok)" }, children: E.paused ? "paused" : "active" })
                      ]
                    },
                    E.id
                  )) }),
                  /* @__PURE__ */ o("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void x(!0),
                        disabled: ue || !(D != null && D.available) || (D == null ? void 0 : D.all_paused),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--warn)", color: "var(--bg)" },
                        children: ue ? "…" : "Pause all"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void x(!1),
                        disabled: ue || !(D != null && D.available) || (D == null ? void 0 : D.any_active),
                        className: "text-xs px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: ue ? "…" : "Resume all"
                      }
                    ),
                    /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => void de(),
                        disabled: ue,
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
        /* @__PURE__ */ o("footer", { className: "px-4 py-3 flex justify-between gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--card)" }, children: [
          /* @__PURE__ */ e("button", { onClick: () => void ee(), disabled: j || B, className: "text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50", style: { color: "var(--muted)" }, children: "Refresh status" }),
          (r == null ? void 0 : r.editable) && /* @__PURE__ */ e(
            "button",
            {
              onClick: () => void me(),
              disabled: !U || B,
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
function Er({ repos: t, selectedRepos: r, onNewPipeline: s, onConfigure: d, onOpenAgents: i }) {
  const { openChat: u } = nr(), b = r.length === 1 ? r[0] : t.length === 1 ? t[0] : "", N = "/dlc-yolo", p = "text-[10px] leading-none px-1.5 py-1 rounded font-semibold";
  return /* @__PURE__ */ e(He, { children: /* @__PURE__ */ o("div", { "data-dlc-command-controls": !0, className: "mb-4 flex min-h-6 items-center justify-end gap-1.5 flex-wrap", children: [
    /* @__PURE__ */ e(
      "button",
      {
        onClick: () => u({ message: N }),
        title: "Open the DLC-YOLO command session; choose the next command action there",
        className: p,
        style: { background: "var(--accent)", color: "var(--bg)" },
        children: "✨ Command session"
      }
    ),
    /* @__PURE__ */ e(
      "button",
      {
        onClick: () => b ? d(b) : s(),
        className: p,
        style: { color: "var(--muted)", border: "1px solid var(--border)" },
        children: b ? "Edit pipeline" : "New pipeline"
      }
    ),
    /* @__PURE__ */ e(
      "button",
      {
        onClick: i,
        className: p,
        style: { color: "var(--muted)", border: "1px solid var(--border)" },
        children: "Agent config"
      }
    ),
    b && /* @__PURE__ */ o("span", { className: "text-[10px] truncate max-w-[300px]", style: { color: "var(--muted)" }, children: [
      "Target: ",
      b
    ] })
  ] }) });
}
const ht = {
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
};
function rt(t) {
  return t ? t.max_child_cards === "unlimited" && t.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth";
}
function Lr({ budget: t, depth: r, onSave: s }) {
  const [d, i] = w(!1), [u, b] = w(rt(t)), [N, p] = w(
    rt(t) === "custom" ? { ...t } : { ...ht[r] || ht.standard }
  ), S = () => {
    const g = rt(t);
    b(g), p(g === "custom" ? { ...t } : { ...ht[r] || ht.standard }), i(!0);
  }, v = () => {
    s(u === "depth" ? void 0 : u === "unlimited" ? {
      max_child_cards: "unlimited",
      effort_ceiling: "unlimited",
      max_feature_size: "XL",
      addenda: "proactive"
    } : { ...N }), i(!1);
  }, $ = rt(t) === "depth" ? "budget: depth" : rt(t) === "unlimited" ? "budget: unlimited" : "budget: custom";
  return /* @__PURE__ */ o("div", { className: "relative", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        onClick: S,
        title: "Edit this card's explicit budget override",
        className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
        style: { color: t ? "var(--accent)" : "var(--muted)", border: `1px solid ${t ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)"}`, background: t ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" },
        children: $
      }
    ),
    d && /* @__PURE__ */ o(
      "div",
      {
        className: "absolute z-40 mt-1 left-0 w-72 rounded-lg p-3 flex flex-col gap-2",
        style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 12px 36px rgba(0,0,0,.35)" },
        children: [
          /* @__PURE__ */ e("div", { className: "text-[11px] font-semibold", style: { color: "var(--text)" }, children: "Card budget override" }),
          /* @__PURE__ */ e("div", { className: "grid grid-cols-3 gap-1", children: ["depth", "custom", "unlimited"].map((g) => /* @__PURE__ */ e(
            "button",
            {
              type: "button",
              onClick: () => b(g),
              className: "text-[10px] px-2 py-1 rounded font-semibold",
              style: { color: u === g ? "var(--bg)" : "var(--muted)", background: u === g ? "var(--accent)" : "var(--bg-hover, var(--border))" },
              children: g === "depth" ? "follow depth" : g
            },
            g
          )) }),
          u === "depth" && /* @__PURE__ */ o("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [
            "Removes ",
            /* @__PURE__ */ e("code", { children: "card.budget" }),
            "; effective budget follows ",
            r || "standard",
            " depth."
          ] }),
          u === "unlimited" && /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: "var(--warn)" }, children: "Literal unlimited child/effort caps · XL · proactive addenda." }),
          u === "custom" && /* @__PURE__ */ o("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ o("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Child cards",
              /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: N.max_child_cards,
                  onChange: (g) => p((y) => ({ ...y, max_child_cards: Math.max(0, Number(g.target.value) || 0) })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ o("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Effort ceiling",
              /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  min: 0,
                  value: N.effort_ceiling,
                  onChange: (g) => p((y) => ({ ...y, effort_ceiling: Math.max(0, Number(g.target.value) || 0) })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                }
              )
            ] }),
            /* @__PURE__ */ o("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Max feature",
              /* @__PURE__ */ e(
                "select",
                {
                  value: N.max_feature_size,
                  onChange: (g) => p((y) => ({ ...y, max_feature_size: g.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["S", "M", "L", "XL"].map((g) => /* @__PURE__ */ e("option", { children: g }, g))
                }
              )
            ] }),
            /* @__PURE__ */ o("label", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: [
              "Addenda",
              /* @__PURE__ */ e(
                "select",
                {
                  value: N.addenda,
                  onChange: (g) => p((y) => ({ ...y, addenda: g.target.value })),
                  className: "mt-0.5 w-full px-2 py-1 rounded text-[11px]",
                  style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                  children: ["none", "obvious", "proactive"].map((g) => /* @__PURE__ */ e("option", { children: g }, g))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ o("div", { className: "flex justify-end gap-2 mt-1", children: [
            /* @__PURE__ */ e("button", { type: "button", onClick: () => i(!1), className: "text-[10px] px-2 py-1", style: { color: "var(--muted)" }, children: "Cancel" }),
            /* @__PURE__ */ e("button", { type: "button", onClick: v, className: "text-[10px] px-2 py-1 rounded font-semibold", style: { background: "var(--accent)", color: "var(--bg)" }, children: "Save budget" })
          ] })
        ]
      }
    )
  ] });
}
const Bt = [
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
], Yt = {
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
}, jr = /* @__PURE__ */ new Set(["retired", "merged"]), zt = /* @__PURE__ */ new Set(["cancelled", "canceled", "superseded", "parked"]);
function Or(t) {
  const r = t == null ? void 0 : t.execution_schedule;
  if (!r || typeof r != "object") return null;
  const s = r.nodes;
  if (!s || typeof s != "object") return null;
  const d = r.current_node_id;
  return typeof d == "string" && s[d] && typeof s[d] == "object" ? s[d] : Object.values(s).find((i) => i && typeof i == "object" && i.step === t.stage) || null;
}
function Wt(t, r) {
  const s = t == null ? void 0 : t[r], d = s && typeof s == "object" ? s[t.stage] : null;
  return typeof d == "string" && d.trim() ? d.trim() : null;
}
function Gt(t, { isGate: r = !1, liveObserved: s = !1 } = {}) {
  const d = typeof (t == null ? void 0 : t.stage) == "string" ? t.stage : "", i = typeof (t == null ? void 0 : t.lifecycle) == "string" ? t.lifecycle.toLowerCase() : "", u = t != null && t.step_status && typeof t.step_status == "object" ? String(t.step_status[d] || "") : "", b = Or(t), N = typeof (b == null ? void 0 : b.status) == "string" ? b.status : "", p = t != null && t.step_sessions && typeof t.step_sessions == "object" ? t.step_sessions[d] : null, S = zt.has(i) || N === "cancelling" || (p == null ? void 0 : p.writes_allowed) === !1 || !!(p != null && p.cancel_requested_at), v = d === "done" || jr.has(i) || ["completed", "cancelled", "superseded"].includes(N);
  let $, g = null;
  return v ? ($ = "terminal", g = N === "cancelled" || zt.has(i) ? `terminal ${i || N}` : i || N || d || null) : S ? ($ = "cancelling", g = "writes revoked; awaiting terminal observation") : u === "blocked" || N === "blocked" ? ($ = "blocked", g = Wt(t, "block_reason") || ((b == null ? void 0 : b.wait_reasons) || [])[0] || "step blocked") : u === "error" || N === "failed" ? ($ = "error", g = Wt(t, "error_reason") || (b == null ? void 0 : b.dispatch_error) || "step error") : r || N === "gate-wait" ? $ = "waiting-gate" : s ? $ = "running-observed" : u === "pending" || N === "running" ? ($ = "pending-unconfirmed", g = "no current live observation") : ["queued", "dependency-wait", "permit-wait"].includes(N) ? ($ = "queued", g = Array.isArray(b == null ? void 0 : b.wait_reasons) ? b.wait_reasons.join(" · ") : null) : N === "ready" ? $ = "ready" : $ = "idle", { kind: $, reason: g, ...Yt[$] };
}
const Ut = /^[A-Za-z0-9._-]{1,128}$/;
function at({ values: t, empty: r = "none declared" }) {
  return t.length ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1", children: t.map((s) => /* @__PURE__ */ e(
    "code",
    {
      className: "text-[10px] px-1.5 py-0.5 rounded",
      style: { color: "var(--text)", background: "var(--bg-hover, var(--border))", border: "1px solid var(--border)" },
      children: s
    },
    s
  )) }) : /* @__PURE__ */ e("span", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: r });
}
function je({ label: t, value: r }) {
  return /* @__PURE__ */ o("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[11px]", children: [
    /* @__PURE__ */ e("span", { className: "uppercase tracking-wide", style: { color: "var(--muted)" }, children: t }),
    /* @__PURE__ */ e("span", { className: "break-words", style: { color: r ? "var(--text)" : "var(--muted)" }, children: r || "not set" })
  ] });
}
function Ir({ profiles: t, initial: r, onSave: s, onClose: d }) {
  var B;
  const i = r ? "update" : "create", [u, b] = w((r == null ? void 0 : r.name) || ""), [N, p] = w((r == null ? void 0 : r.kiroAgent) || ((B = t.find((k) => k.status === "loaded")) == null ? void 0 : B.name) || ""), [S, v] = w((r == null ? void 0 : r.workspace) || ""), [$, g] = w((r == null ? void 0 : r.memoryStore) || ""), [y, V] = w(!1), [O, I] = w(""), j = Ut.test(u.trim()) && Ut.test(N.trim()) && new TextEncoder().encode(S.trim()).length <= 256 && new TextEncoder().encode($.trim()).length <= 256, C = async () => {
    if (!(!j || y)) {
      V(!0), I("");
      try {
        await s({
          mode: i,
          name: u.trim(),
          kiroAgent: N.trim(),
          workspace: S.trim() || void 0,
          memoryStore: $.trim() || void 0
        });
      } catch (k) {
        I((k == null ? void 0 : k.message) || String(k)), V(!1);
      }
    }
  };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[80] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 68%, transparent)", backdropFilter: "blur(3px)" },
      onMouseDown: (k) => {
        k.currentTarget === k.target && !y && d();
      },
      children: /* @__PURE__ */ o(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "crew-route-editor-title",
          className: "w-full max-w-lg rounded-xl overflow-hidden",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ o("header", { className: "px-5 py-4 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ o("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ e("h3", { id: "crew-route-editor-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: i === "create" ? "New global crew route" : `Edit ${r == null ? void 0 : r.name}` }),
                /* @__PURE__ */ e("p", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: "UI-managed routing record backed by the sanctioned KiroCrew agent CLI—no chat handoff." })
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  onClick: d,
                  disabled: y,
                  "aria-label": "Close crew route editor",
                  className: "w-8 h-8 rounded-lg text-lg disabled:opacity-40",
                  style: { color: "var(--muted)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ o("div", { className: "px-5 py-4 flex flex-col gap-3.5", children: [
              /* @__PURE__ */ o("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Crew name",
                /* @__PURE__ */ e(
                  "input",
                  {
                    value: u,
                    onChange: (k) => b(k.target.value),
                    disabled: i === "update",
                    placeholder: "e.g. dlcyolo-secure-review",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none disabled:opacity-60",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ o("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Kiro agent authority profile",
                /* @__PURE__ */ e(
                  "input",
                  {
                    list: "dlc-agent-profile-options",
                    value: N,
                    onChange: (k) => p(k.target.value),
                    placeholder: "dlcyolo-readonly",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                ),
                /* @__PURE__ */ e("datalist", { id: "dlc-agent-profile-options", children: t.map((k) => /* @__PURE__ */ e("option", { value: k.name }, k.name)) })
              ] }),
              /* @__PURE__ */ o("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Workspace ",
                /* @__PURE__ */ e("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    value: S,
                    onChange: (k) => v(k.target.value),
                    placeholder: i === "update" ? "Blank keeps the current value" : "Default workspace",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ o("label", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: [
                "Memory store ",
                /* @__PURE__ */ e("span", { className: "normal-case tracking-normal", children: "(optional)" }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    value: $,
                    onChange: (k) => g(k.target.value),
                    placeholder: i === "update" ? "Blank keeps the current value" : "Default memory store",
                    className: "mt-1 w-full px-3 py-2 rounded-md text-sm normal-case tracking-normal outline-none",
                    style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                  }
                )
              ] }),
              /* @__PURE__ */ o("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                "This edits the global crew → ",
                /* @__PURE__ */ e("code", { children: "kiro_agent" }),
                " route. Profile prompts, tools, and approval policy remain source-managed declarations; pipeline-local objectives stay in Pipeline Setup."
              ] }),
              O && /* @__PURE__ */ e("div", { className: "text-[11px] rounded-md px-3 py-2", style: { color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))" }, children: O })
            ] }),
            /* @__PURE__ */ o("footer", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              /* @__PURE__ */ e("button", { onClick: d, disabled: y, className: "text-[11px] px-3 py-1.5 rounded-md disabled:opacity-40", style: { color: "var(--muted)" }, children: "Cancel" }),
              /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => void C(),
                  disabled: !j || y,
                  className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                  style: { background: "var(--accent)", color: "var(--bg)" },
                  children: y ? "Saving…" : i === "create" ? "Create crew route" : "Save crew route"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function Lt({ profiles: t, crews: r, loading: s = !1, context: d, onRefresh: i, onClose: u, onSelectProfile: b, onSelectCrew: N, onSaveCrew: p }) {
  var M, K;
  const [S, v] = w("agents"), [$, g] = w(((M = t[0]) == null ? void 0 : M.name) || ""), [y, V] = w(((K = r[0]) == null ? void 0 : K.name) || ""), [O, I] = w(null);
  _e(() => {
    var h;
    t.some((ee) => ee.name === $) || g(((h = t[0]) == null ? void 0 : h.name) || "");
  }, [t, $]), _e(() => {
    var h;
    r.some((ee) => ee.name === y) || V(((h = r[0]) == null ? void 0 : h.name) || "");
  }, [r, y]);
  const j = t.find((h) => h.name === $), C = r.find((h) => h.name === y), B = ye(
    () => C != null && C.kiroAgent ? t.find((h) => h.name === C.kiroAgent) : void 0,
    [C, t]
  ), k = j != null && j.prompt ? j.prompt.length > 1200 ? `${j.prompt.slice(0, 1200)}…` : j.prompt : "";
  return /* @__PURE__ */ o(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 62%, transparent)", backdropFilter: "blur(2px)" },
      onMouseDown: (h) => {
        h.currentTarget === h.target && u();
      },
      children: [
        /* @__PURE__ */ o(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "agent-crew-catalog-title",
            className: "w-full max-w-4xl rounded-xl overflow-hidden flex flex-col",
            style: { height: "min(78vh, 760px)", background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" },
            children: [
              /* @__PURE__ */ o("header", { className: "px-5 py-4 flex items-start gap-3", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ o("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ e("h2", { id: "agent-crew-catalog-title", className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agents & crews" }),
                  /* @__PURE__ */ e("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "KiroCrew agent templates define prompts/tools/approval policy. Global crew records route to one template plus workspace and memory." }),
                  d && /* @__PURE__ */ o("p", { className: "text-[10px] mt-1", style: { color: "var(--accent)" }, children: [
                    "Pipeline context: ",
                    d
                  ] })
                ] }),
                i && /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: i,
                    disabled: s,
                    className: "text-[11px] px-2.5 py-1.5 rounded-md disabled:opacity-50",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: s ? "Refreshing…" : "Refresh"
                  }
                ),
                p && /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => {
                      v("crews"), I({ mode: "create" });
                    },
                    className: "text-[11px] px-2.5 py-1.5 rounded-md font-semibold",
                    style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))" },
                    children: "+ New crew route"
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: u,
                    "aria-label": "Close agents and crews",
                    className: "w-8 h-8 rounded-lg text-lg leading-none",
                    style: { color: "var(--muted)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: [["agents", `Agent templates · ${t.length}`], ["crews", `Global crews · ${r.length}`]].map(([h, ee]) => /* @__PURE__ */ e(
                "button",
                {
                  onClick: () => v(h),
                  className: "text-[12px] px-3 py-2 font-semibold",
                  style: { color: S === h ? "var(--accent)" : "var(--muted)", borderBottom: `2px solid ${S === h ? "var(--accent)" : "transparent"}`, marginBottom: -1 },
                  children: ee
                },
                h
              )) }),
              /* @__PURE__ */ e("div", { className: "flex min-h-0 flex-1", children: S === "agents" ? /* @__PURE__ */ o(He, { children: [
                /* @__PURE__ */ o("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  t.map((h) => /* @__PURE__ */ o(
                    "button",
                    {
                      onClick: () => g(h.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: h.name === $ ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: h.name === $ ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold truncate", children: h.name }),
                        /* @__PURE__ */ e("div", { className: "text-[9px] mt-0.5", style: { color: h.status === "loaded" ? "var(--ok)" : "var(--warn)" }, children: h.status === "loaded" ? "config loaded" : "config unavailable" })
                      ]
                    },
                    h.name
                  )),
                  !t.length && /* @__PURE__ */ e("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No referenced profiles." })
                ] }),
                /* @__PURE__ */ e("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: j ? /* @__PURE__ */ o("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ o("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ o("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ e("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: j.name }),
                      /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: j.description || "No description declared." })
                    ] }),
                    b && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => b(j),
                        disabled: j.status !== "loaded",
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold disabled:opacity-40",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Use for this step"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ e(je, { label: "Model", value: j.model || "auto / provider default" }),
                    /* @__PURE__ */ e(je, { label: "Config source", value: j.sourcePath }),
                    /* @__PURE__ */ e(je, { label: "Prompt", value: j.prompt ? j.prompt.startsWith("file://") ? j.prompt : "inline prompt" : void 0 })
                  ] }),
                  /* @__PURE__ */ o("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Declared tools" }),
                    /* @__PURE__ */ e(at, { values: j.tools })
                  ] }),
                  /* @__PURE__ */ o("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Auto-approved tools" }),
                    /* @__PURE__ */ e(at, { values: j.allowedTools })
                  ] }),
                  /* @__PURE__ */ o("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Resources / skills" }),
                    /* @__PURE__ */ e(at, { values: j.resources })
                  ] }),
                  /* @__PURE__ */ o("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "MCP servers" }),
                    /* @__PURE__ */ e(at, { values: j.mcpServers })
                  ] }),
                  k && /* @__PURE__ */ o("details", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ e("summary", { className: "text-[11px] cursor-pointer", style: { color: "var(--accent)" }, children: "Prompt preview" }),
                    /* @__PURE__ */ e("pre", { className: "mt-2 text-[10px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto", style: { color: "var(--muted)" }, children: k })
                  ] }),
                  /* @__PURE__ */ e("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--warn) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 28%, var(--border))" }, children: "These are declarations from disk, not proof that a live session loaded or applied them. Runtime handshake evidence remains authoritative for observed access." })
                ] }) : /* @__PURE__ */ e("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select an agent template." }) })
              ] }) : /* @__PURE__ */ o(He, { children: [
                /* @__PURE__ */ o("aside", { className: "w-60 flex-shrink-0 overflow-y-auto p-2", style: { borderRight: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                  r.map((h) => /* @__PURE__ */ o(
                    "button",
                    {
                      onClick: () => V(h.name),
                      className: "w-full text-left px-3 py-2 rounded-md mb-1",
                      style: { background: h.name === y ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent", color: h.name === y ? "var(--accent)" : "var(--text)" },
                      children: [
                        /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold truncate", children: h.name }),
                        /* @__PURE__ */ o("div", { className: "text-[9px] mt-0.5 truncate", style: { color: "var(--muted)" }, children: [
                          "→ ",
                          h.kiroAgent || "profile not declared"
                        ] })
                      ]
                    },
                    h.name
                  )),
                  !r.length && /* @__PURE__ */ e("div", { className: "p-3 text-[11px] italic", style: { color: "var(--muted)" }, children: "No global crews found." })
                ] }),
                /* @__PURE__ */ e("main", { className: "flex-1 min-w-0 overflow-y-auto p-5", children: C ? /* @__PURE__ */ o("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ o("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ o("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ e("div", { className: "text-lg font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: C.name }),
                      /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: C.description || "No description declared." })
                    ] }),
                    p && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => I({ mode: "update", crew: C }),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { color: "var(--accent)", border: "1px solid var(--border)" },
                        children: "Edit route"
                      }
                    ),
                    N && /* @__PURE__ */ e(
                      "button",
                      {
                        onClick: () => N(C),
                        className: "text-[11px] px-3 py-1.5 rounded-md font-semibold",
                        style: { background: "var(--accent)", color: "var(--bg)" },
                        children: "Route step here"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("div", { className: "rounded-lg p-3 flex flex-col gap-2", style: { border: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
                    /* @__PURE__ */ e(je, { label: "kiro_agent", value: C.kiroAgent }),
                    /* @__PURE__ */ e(je, { label: "Workspace", value: C.workspace }),
                    /* @__PURE__ */ e(je, { label: "Memory store", value: C.memoryStore }),
                    /* @__PURE__ */ e(je, { label: "Model override", value: C.model }),
                    /* @__PURE__ */ e(je, { label: "Source", value: C.source })
                  ] }),
                  /* @__PURE__ */ o("section", { children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1.5", style: { color: "var(--muted)" }, children: "Selection triggers" }),
                    /* @__PURE__ */ e(at, { values: C.triggers })
                  ] }),
                  C.kiroAgent && /* @__PURE__ */ o("div", { className: "rounded-lg p-3", style: { border: "1px solid var(--border)" }, children: [
                    /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Authority profile" }),
                    /* @__PURE__ */ o("div", { className: "flex items-center gap-2 mt-1.5", children: [
                      /* @__PURE__ */ e("code", { className: "text-[12px]", style: { color: "var(--accent)" }, children: C.kiroAgent }),
                      /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: (B == null ? void 0 : B.status) === "loaded" ? "var(--ok)" : "var(--warn)" }, children: (B == null ? void 0 : B.status) === "loaded" ? "loaded" : "unavailable" }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => {
                            g(C.kiroAgent || ""), v("agents");
                          },
                          className: "ml-auto text-[10px] px-2 py-1 rounded",
                          style: { color: "var(--accent)", border: "1px solid var(--border)" },
                          children: "View profile"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "text-[10px] rounded-md p-2.5", style: { color: "var(--muted)", background: "color-mix(in srgb, var(--accent) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))" }, children: [
                    "This crew entry is a thin global routing record. Its tools and approval policy come from the linked ",
                    /* @__PURE__ */ e("code", { children: "kiro_agent" }),
                    " template; they are not duplicated on the crew."
                  ] })
                ] }) : /* @__PURE__ */ e("div", { className: "text-[12px] italic", style: { color: "var(--muted)" }, children: "Select a global crew." }) })
              ] }) })
            ]
          }
        ),
        O && p && /* @__PURE__ */ e(
          Ir,
          {
            profiles: t,
            initial: O.mode === "update" ? O.crew : void 0,
            onClose: () => I(null),
            onSave: async (h) => {
              await p(h), V(h.name), I(null);
            }
          }
        )
      ]
    }
  );
}
const Zt = Object.freeze([
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
]), Mr = /^[A-Za-z0-9._-]{1,128}$/;
function Ce(t) {
  return typeof t == "string" && Mr.test(t);
}
function Ae(t) {
  return typeof t == "string" && t.trim() ? t.trim() : void 0;
}
function kt(t) {
  return Array.isArray(t) ? [...new Set(t.filter((r) => typeof r == "string" && r.trim()).map((r) => r.trim()))] : [];
}
function qr(t) {
  return !t || typeof t != "object" || Array.isArray(t) ? [] : Object.entries(t).filter(([r, s]) => Ce(r) && s && typeof s == "object" && !Array.isArray(s)).map(([r, s]) => ({
    name: r,
    kiroAgent: Ce(s.kiro_agent) ? s.kiro_agent : void 0,
    workspace: Ae(s.workspace),
    memoryStore: Ae(s.memory_store ?? s.memoryStore),
    model: Ae(s.model),
    description: Ae(s.description),
    triggers: kt(s.triggers),
    source: Ae(s.source)
  })).sort((r, s) => r.name.localeCompare(s.name));
}
function Dr(t, r = Zt) {
  const s = [];
  for (const i of r)
    Ce(i) && !s.includes(i) && s.push(i);
  const d = (Array.isArray(t) ? t : []).map((i) => i == null ? void 0 : i.kiroAgent).filter(Ce).sort((i, u) => i.localeCompare(u));
  for (const i of d)
    s.includes(i) || s.push(i);
  return s;
}
function Br(t, r, s = Zt) {
  if (!Ce(t)) return;
  if (s.includes(t)) return `~/.kiro/crew/apps/dlc-yolo/agents/${t}.json`;
  const d = [...new Set(
    (Array.isArray(r) ? r : []).filter((i) => (i == null ? void 0 : i.kiroAgent) === t).map((i) => i == null ? void 0 : i.source).filter(Ce)
  )];
  if (d.length === 1)
    return `~/.kiro/agents/${d[0]}--${t}.json`;
}
function $t(t, r, s) {
  const d = Ce(r) ? r : "unknown", i = !!t && typeof t == "object" && !Array.isArray(t), u = i && Ce(t.name) ? t.name : d, b = i && t.mcpServers && typeof t.mcpServers == "object" ? Object.keys(t.mcpServers).filter(Ce) : [];
  return {
    name: u,
    description: i ? Ae(t.description) : void 0,
    prompt: i ? Ae(t.prompt) : void 0,
    model: i ? Ae(t.model) : void 0,
    tools: i ? kt(t.tools) : [],
    allowedTools: i ? kt(t.allowedTools) : [],
    resources: i ? kt(t.resources) : [],
    mcpServers: b,
    status: i ? "loaded" : "unavailable",
    sourcePath: Ae(s)
  };
}
function zr(t) {
  const r = /^dlcyolo-(readonly|authoring|builder|coordinator)$/.exec(t || "");
  return r == null ? void 0 : r[1];
}
function Wr(t, r) {
  if (!r || !Ce(r.name)) return { ...t };
  const s = zr(r.name);
  return {
    ...t,
    name: r.name,
    tools: [...r.tools || []],
    model: r.model || "auto",
    ...s ? { capability: s } : {}
  };
}
let De = Et;
const Ft = (t) => ({
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: "S", addenda: "none" },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: "L", addenda: "obvious" },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: "XL", addenda: "proactive" }
})[t], wt = [
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
], Jt = /* @__PURE__ */ new Set([
  "example-org/web-app",
  "example-org/dashboard",
  "example-org/api-core"
]), Gr = {
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
}, Be = ["manual", "assisted", "autonomous"], Pe = ["quick", "standard", "deep"], ot = { trust: "assisted", depth: "standard" }, Nt = {
  manual: "var(--info)",
  assisted: "var(--accent)",
  autonomous: "var(--danger)"
}, _t = {
  quick: "var(--ok)",
  standard: "var(--muted)",
  deep: "var(--warn)"
};
function Ne({ color: t, children: r, title: s, onClick: d, active: i }) {
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      title: s,
      onClick: d,
      className: "text-[10px] leading-none px-1.5 py-1 rounded font-semibold tracking-wide transition-all",
      style: {
        color: t,
        background: `color-mix(in srgb, ${t} 14%, transparent)`,
        boxShadow: i ? `inset 0 0 0 1px color-mix(in srgb, ${t} 55%, transparent)` : "none",
        opacity: d && !i ? 0.85 : 1,
        cursor: d ? "pointer" : "default"
      },
      children: r
    }
  );
}
const bt = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#2ecc71", "#e84393"];
function Ur({ steps: t, cardsByStage: r, onNodeClick: s }) {
  const d = ke(null), i = ke(null), u = ke(0), b = ke(null), N = ke(t), p = ke(r), S = ke([]);
  N.current = t, p.current = r;
  const v = 3, $ = 116, g = $ / v, y = g - 26, [V, O] = w(880);
  _e(() => {
    const C = i.current;
    if (!C) return;
    const B = new ResizeObserver((k) => {
      const M = Math.max(360, Math.floor(k[0].contentRect.width));
      O(M);
    });
    return B.observe(C), () => B.disconnect();
  }, []);
  const I = (C) => C.type === "gate" || C.id.startsWith("gate-");
  return _e(() => {
    const C = d.current;
    if (!C) return;
    const B = Math.floor(V / v);
    C.width = B * v, C.height = g * v;
    const k = C.getContext("2d");
    if (!k) return;
    const M = (ee, _, ae, Y, re) => {
      k.fillStyle = re, k.fillRect(ee * v, _ * v, ae * v, Y * v);
    }, K = () => {
      const ee = u.current, _ = N.current, ae = p.current, Y = Math.max(1, _.length);
      Math.max(1, ..._.map((Z) => {
        var D;
        return ((D = ae[Z.id]) == null ? void 0 : D.length) || 0;
      })), M(0, 0, B, y, "#0f172a");
      for (let Z = 0; Z < B / 5; Z++) {
        const D = Z * 37 % B, J = Z * 13 % (y - 4);
        Math.sin(ee * 0.03 + Z * 2.1) > 0.35 && M(D, J, 1, 1, "#e2e8f0");
      }
      M(B - 26, 8, 10, 10, "#fde68a"), M(B - 24, 7, 8, 8, "#0f172a");
      for (let Z = 0; Z < B; Z += 16)
        for (let D = y; D < g; D += 16)
          M(Z, D, 16, 16, Z / 16 + D / 16 & 1 ? "#33261a" : "#2a1f14");
      M(0, y - 2, B, 2, "#4a3520");
      const re = B / Y, se = [];
      for (let Z = 0; Z < _.length; Z++) {
        const D = _[Z], J = Math.round(re * (Z + 0.5)), z = (ae[D.id] || []).length, de = z > 0, x = bt[Z % bt.length], G = I(D), P = y - 2;
        if (se.push({ x: J - Math.floor(re / 2), w: Math.floor(re), id: D.id }), Z < _.length - 1) {
          const U = Math.round(re * (Z + 1.5));
          for (let me = J + 8; me < U - 8; me += 4) M(me, y - 1, 2, 1, "#4a3520");
        }
        if (G) {
          const U = P - 20, me = de ? "#f39c12" : "#3a3222";
          M(J - 3, U, 6, 20, de ? "#5c4a2a" : "#2a2418");
          for (let L = 0; L < 5; L++) M(J - L, U - 5 + L, L * 2 + 1, 1, me);
          for (let L = 0; L < 5; L++) M(J - (4 - L), U - L, (4 - L) * 2 + 1, 1, me);
          if (de) {
            const L = (Math.sin(ee * 0.08) + 1) / 2;
            k.globalAlpha = 0.35 + L * 0.4, M(J - 1, U - 6, 2, 2, "#ffd27a"), k.globalAlpha = 1;
          }
        } else {
          const U = P - 14;
          if (M(J - 10, U, 20, 3, "#7a5c47"), M(J - 10, U - 1, 20, 1, x), M(J - 9, U + 3, 2, 8, "#5c4033"), M(J + 7, U + 3, 2, 8, "#5c4033"), M(J - 5, U - 9, 10, 9, "#333"), M(J - 4, U - 8, 8, 7, de ? "#0a2a0a" : "#1a1a1a"), de)
            for (let me = 0; me < 3; me++) {
              const L = 2 + (ee + me * 7) % 5;
              M(J - 3, U - 7 + me * 2, L, 0.8, "#33ff33");
            }
        }
        const oe = Math.min(z, 5);
        for (let U = 0; U < oe; U++) {
          const me = oe > 1 ? (U - (oe - 1) / 2) * 8 : 0, L = Math.round(J + me) - 3, le = P - (G ? 2 : 4), E = bt[(Z + U) % bt.length], ge = Math.sin(ee * 0.08 + Z + U) > 0 ? 1 : 0;
          k.fillStyle = "rgba(0,0,0,0.18)", k.fillRect(L * v, (le + 8) * v, 6 * v, v), M(L, le + ge, 6, 6, E), M(L + 1, le - 4 + ge, 4, 4, "#fdd"), M(L + 1, le - 5 + ge, 4, 1, "#333"), (ee + Z * 9 + U * 5) % 120 >= 3 && (M(L + 2, le - 3 + ge, 1, 1, "#333"), M(L + 4, le - 3 + ge, 1, 1, "#333")), M(L + 1, le + 6, 1, 2, E), M(L + 4, le + 6, 1, 2, E);
        }
        z > 5 && (k.fillStyle = x, k.font = `${3 * v}px monospace`, k.fillText(`+${z - 5}`, (J + 10) * v, (P - 6) * v)), z > 0 && (k.fillStyle = x, k.fillRect((J + 6) * v, (P - 30) * v, 9 * v, 9 * v), k.fillStyle = "#0f172a", k.font = `bold ${5 * v}px monospace`, k.textAlign = "center", k.fillText(String(z), (J + 10.5) * v, (P - 24) * v), k.textAlign = "left"), k.fillStyle = de ? "#e2e8f0" : "#6b7280", k.font = `${3.4 * v}px monospace`, k.textAlign = "center";
        const be = D.name.length > 12 ? D.name.slice(0, 11) + "…" : D.name;
        k.fillText(be, J * v, (g - 4) * v), k.textAlign = "left";
      }
      S.current = se;
      const he = _.reduce((Z, D) => {
        var J;
        return Z + (((J = ae[D.id]) == null ? void 0 : J.length) || 0);
      }, 0);
      k.fillStyle = "#f90", k.font = `bold ${3.6 * v}px monospace`, k.fillText(`${he} card${he !== 1 ? "s" : ""} · ${Y} milestone${Y !== 1 ? "s" : ""}`, 4 * v, 8 * v);
    }, h = () => {
      u.current++, K(), b.current = requestAnimationFrame(h);
    };
    return b.current = requestAnimationFrame(h), () => {
      b.current && cancelAnimationFrame(b.current);
    };
  }, [V, g, y]), /* @__PURE__ */ e("div", { ref: i, className: "w-full mb-5", children: /* @__PURE__ */ e(
    "canvas",
    {
      ref: d,
      onClick: (C) => {
        const B = d.current;
        if (!B) return;
        const k = B.getBoundingClientRect(), M = (C.clientX - k.left) / k.width * (B.width / v), K = S.current.find((h) => M >= h.x && M <= h.x + h.w);
        K && s(K.id);
      },
      style: {
        width: "100%",
        height: $ + "px",
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--border, #333)",
        cursor: "pointer",
        display: "block"
      }
    }
  ) });
}
function Fr({ active: t, onChange: r, counts: s }) {
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
      ].map((i) => {
        const u = t === i.id, b = s[i.id];
        return /* @__PURE__ */ o(
          "button",
          {
            onClick: () => r(i.id),
            className: "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5",
            style: {
              background: u ? "var(--accent)" : "transparent",
              color: u ? "var(--bg)" : "var(--muted)"
            },
            children: [
              i.label,
              b > 0 && /* @__PURE__ */ e(
                "span",
                {
                  className: "text-[10px] px-1 rounded-full font-semibold",
                  style: { background: u ? "color-mix(in srgb, var(--bg) 25%, transparent)" : "var(--bg-hover, var(--border))", color: u ? "var(--bg)" : "var(--muted)" },
                  children: b
                }
              )
            ]
          },
          i.id
        );
      })
    }
  );
}
function xe({ title: t, children: r }) {
  return /* @__PURE__ */ o("section", { className: "rounded-lg p-3", style: { background: "var(--bg, transparent)", border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ e("h3", { className: "text-[10px] uppercase tracking-wider font-semibold mb-2", style: { color: "var(--muted)" }, children: t }),
    r
  ] });
}
function Oe({ rows: t, empty: r = "None recorded" }) {
  return t.length ? /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: t.map((s) => /* @__PURE__ */ o("div", { className: "rounded-md px-2 py-1.5", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)" }, children: [
    /* @__PURE__ */ o("div", { className: "flex items-start gap-2 text-[11px]", children: [
      /* @__PURE__ */ e("span", { className: "font-medium min-w-0 break-words", style: { color: "var(--text)" }, children: s.title }),
      /* @__PURE__ */ o("span", { className: "ml-auto flex gap-1 flex-shrink-0", children: [
        s.level && /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: s.level === "required" ? "var(--warn)" : "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: s.level }),
        s.status && /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded text-[9px] font-semibold", style: { color: /fail|block|open|pending/i.test(s.status) ? "var(--warn)" : "var(--ok)", background: "var(--bg-hover, var(--border))" }, children: s.status })
      ] })
    ] }),
    s.detail && /* @__PURE__ */ e("div", { className: "mt-0.5 text-[10px] break-words", style: { color: "var(--muted)" }, children: s.detail }),
    s.ref && (s.url ? /* @__PURE__ */ e("a", { href: s.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: s.ref }) : /* @__PURE__ */ e("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: s.ref }))
  ] }, s.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: r });
}
function pe({ label: t, value: r, status: s }) {
  return /* @__PURE__ */ o("div", { className: "min-w-0", children: [
    /* @__PURE__ */ e("div", { className: "text-[9px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: t }),
    /* @__PURE__ */ o("div", { className: "text-[11px] mt-0.5 break-words", style: { color: Ie(r) === "unobservable" ? "var(--warn)" : "var(--text)" }, children: [
      Ie(r),
      s && /* @__PURE__ */ o("span", { className: "ml-1 text-[9px]", style: { color: "var(--muted)" }, children: [
        "(",
        Ie(s),
        ")"
      ] })
    ] })
  ] });
}
function Pr({ card: t, inspection: r, producerSession: s, onClose: d, onOpenProducer: i, onApprove: u, onReject: b, onInterject: N }) {
  const p = r.routing, S = () => {
    const v = window.prompt(`Why reject revision ${r.revision ?? "unknown"}?`);
    v != null && v.trim() && b && (b(v.trim()), d());
  };
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-[70] flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" },
      onMouseDown: (v) => {
        v.currentTarget === v.target && d();
      },
      children: /* @__PURE__ */ o(
        "section",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": `gate-inspection-${t.id}`,
          className: "flex flex-col rounded-xl overflow-hidden",
          style: { width: "min(860px, calc(100vw - 32px))", maxHeight: "min(88vh, 860px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 28px 90px rgba(0,0,0,0.5)" },
          children: [
            /* @__PURE__ */ o("header", { className: "px-5 py-4 flex items-start gap-4", style: { borderBottom: "1px solid var(--border)" }, children: [
              /* @__PURE__ */ o("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ o("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ e("h2", { id: `gate-inspection-${t.id}`, className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Gate result inspection" }),
                  /* @__PURE__ */ e("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)", background: `color-mix(in srgb, ${r.ready ? "var(--ok)" : "var(--warn)"} 14%, transparent)` }, children: r.ready ? "review-ready" : "not review-ready" }),
                  /* @__PURE__ */ o("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style: { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" }, children: [
                    "revision ",
                    r.revision ?? "unobservable"
                  ] })
                ] }),
                /* @__PURE__ */ e("div", { className: "text-[12px] mt-1 truncate", style: { color: "var(--text)" }, children: t.title }),
                /* @__PURE__ */ o("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: [
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
                  onClick: d,
                  "aria-label": "Close gate inspection",
                  className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                  style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                  children: "×"
                }
              )
            ] }),
            /* @__PURE__ */ o("div", { className: "overflow-y-auto p-4 flex flex-col gap-3", children: [
              /* @__PURE__ */ o("div", { className: "rounded-lg p-3", style: { background: r.ready ? "color-mix(in srgb, var(--ok) 8%, transparent)" : "color-mix(in srgb, var(--warn) 8%, transparent)", border: `1px solid color-mix(in srgb, ${r.ready ? "var(--ok)" : "var(--warn)"} 38%, var(--border))` }, children: [
                /* @__PURE__ */ e("div", { className: "text-[11px] font-semibold", style: { color: r.ready ? "var(--ok)" : "var(--warn)" }, children: r.ready ? "Bundle is structurally ready for review" : `${r.missing.length} readiness gap${r.missing.length === 1 ? "" : "s"}` }),
                !r.ready && /* @__PURE__ */ e("ul", { className: "mt-1.5 pl-4 list-disc text-[10px] space-y-0.5", style: { color: "var(--muted)" }, children: r.missing.map((v) => /* @__PURE__ */ e("li", { children: v }, v)) }),
                r.preferredShortfalls.length > 0 && /* @__PURE__ */ o("div", { className: "mt-2 text-[10px]", style: { color: "var(--muted)" }, children: [
                  "Preferred shortfalls (non-blocking): ",
                  r.preferredShortfalls.join(" · ")
                ] }),
                /* @__PURE__ */ e("div", { className: "text-[9px] mt-2", style: { color: "var(--muted)" }, children: "Inspection is read-only; deterministic runtime remains authoritative for movement and readiness enforcement." })
              ] }),
              /* @__PURE__ */ o("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ o(xe, { title: "Result summary", children: [
                  /* @__PURE__ */ e("div", { className: "text-[12px] leading-relaxed whitespace-pre-wrap", style: { color: r.summary ? "var(--text)" : "var(--warn)" }, children: r.summary || "No result summary was published." }),
                  /* @__PURE__ */ o("div", { className: "grid grid-cols-2 gap-2 mt-3", children: [
                    /* @__PURE__ */ e(pe, { label: "Envelope", value: r.envelopeId }),
                    /* @__PURE__ */ e(pe, { label: "Created", value: r.createdAt })
                  ] })
                ] }),
                /* @__PURE__ */ e(xe, { title: "Changes since prior revision", children: /* @__PURE__ */ e(Oe, { rows: r.changes, empty: "No revision delta recorded" }) })
              ] }),
              /* @__PURE__ */ e(xe, { title: "Artifacts and evidence references", children: r.artifacts.length ? /* @__PURE__ */ e("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: r.artifacts.map((v) => /* @__PURE__ */ o("div", { className: "rounded-md p-2", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ o("div", { className: "flex gap-2 text-[11px]", children: [
                  /* @__PURE__ */ e("span", { className: "font-medium", style: { color: "var(--text)" }, children: v.label }),
                  v.kind && /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: v.kind })
                ] }),
                v.preview && /* @__PURE__ */ e("div", { className: "mt-1 text-[10px] leading-relaxed", style: { color: "var(--muted)" }, children: v.preview }),
                v.ref && (v.url ? /* @__PURE__ */ e("a", { href: v.url, target: "_blank", rel: "noreferrer", className: "mt-1 block text-[10px] underline break-all", style: { color: "var(--accent)" }, children: v.ref }) : /* @__PURE__ */ e("code", { className: "mt-1 block text-[10px] break-all", style: { color: "var(--muted)" }, children: v.ref }))
              ] }, v.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--warn)" }, children: "No referenced artifacts were published." }) }),
              /* @__PURE__ */ o("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(xe, { title: "Alternatives and trade-offs", children: /* @__PURE__ */ e(Oe, { rows: r.alternatives, empty: "No alternatives published" }) }),
                /* @__PURE__ */ e(xe, { title: "Research and citations", children: /* @__PURE__ */ e(Oe, { rows: r.research, empty: "No research passes published" }) })
              ] }),
              /* @__PURE__ */ o("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(xe, { title: "Intent and requirement coverage", children: /* @__PURE__ */ e(Oe, { rows: r.coverage, empty: "No coverage records published" }) }),
                /* @__PURE__ */ e(xe, { title: "Omissions and deviations", children: /* @__PURE__ */ e(Oe, { rows: r.deviations, empty: "No omissions or deviations recorded" }) })
              ] }),
              /* @__PURE__ */ o(xe, { title: "Card topology and integration", children: [
                /* @__PURE__ */ o("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3", children: [
                  /* @__PURE__ */ e(pe, { label: "Action", value: r.topology.action }),
                  /* @__PURE__ */ e(pe, { label: "Integration owner", value: r.topology.integrationOwner }),
                  /* @__PURE__ */ e(pe, { label: "Integration status", value: r.topology.integrationStatus }),
                  /* @__PURE__ */ e(pe, { label: "Required children incomplete", value: r.topology.incompleteRequiredChildren.length })
                ] }),
                r.topology.children.length > 0 ? /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: r.topology.children.map((v) => /* @__PURE__ */ o("div", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: [
                  /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: v.label }),
                  /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: v.required ? "var(--warn)" : "var(--muted)" }, children: v.required ? "required" : "optional" }),
                  /* @__PURE__ */ e("span", { className: "text-[9px]", style: { color: /done|advanced|complete|consume|integrate|waive|omit/i.test(v.status) ? "var(--ok)" : "var(--warn)" }, children: v.status })
                ] }, v.key)) }) : /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "No child topology recorded." })
              ] }),
              /* @__PURE__ */ o("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ e(xe, { title: "Budget consumption", children: /* @__PURE__ */ o("div", { className: "grid grid-cols-1 gap-3", children: [
                  /* @__PURE__ */ e(pe, { label: "Allocated", value: r.budget.allocated }),
                  /* @__PURE__ */ e(pe, { label: "Consumed", value: r.budget.consumed }),
                  /* @__PURE__ */ e(pe, { label: "Remaining", value: r.budget.remaining })
                ] }) }),
                /* @__PURE__ */ e(xe, { title: "Routing and runtime provenance", children: /* @__PURE__ */ o("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ e(pe, { label: "Assigned profile", value: p.assignedProfile }),
                  /* @__PURE__ */ e(pe, { label: "Effective profile", value: p.effectiveProfile }),
                  /* @__PURE__ */ e(pe, { label: "Model requested", value: p.model.requested }),
                  /* @__PURE__ */ e(pe, { label: "Model applied", value: p.model.applied, status: p.model.status }),
                  /* @__PURE__ */ e(pe, { label: "Provider / version", value: p.model.provider || p.model.version ? [p.model.provider, p.model.version].filter(Boolean) : null }),
                  /* @__PURE__ */ e(pe, { label: "Effort requested", value: p.effort.requested }),
                  /* @__PURE__ */ e(pe, { label: "Effort applied", value: p.effort.applied, status: p.effort.status }),
                  /* @__PURE__ */ e(pe, { label: "Tools available", value: p.tools.actual, status: p.tools.status }),
                  /* @__PURE__ */ e(pe, { label: "Skills available", value: p.skills.actual, status: p.skills.status }),
                  /* @__PURE__ */ e(pe, { label: "Network scope", value: p.network.actual, status: p.network.status }),
                  /* @__PURE__ */ e(pe, { label: "Write scope", value: p.write.actual, status: p.write.status }),
                  /* @__PURE__ */ e(pe, { label: "Worktree / branch", value: p.worktree })
                ] }) })
              ] }),
              /* @__PURE__ */ o("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                /* @__PURE__ */ e(xe, { title: "Validation and evidence", children: /* @__PURE__ */ e(Oe, { rows: r.validation, empty: "No validation results published" }) }),
                /* @__PURE__ */ e(xe, { title: "Known risks", children: /* @__PURE__ */ e(Oe, { rows: r.risks, empty: "No known risks recorded" }) }),
                /* @__PURE__ */ e(xe, { title: "Open decisions and questions", children: /* @__PURE__ */ e(Oe, { rows: r.decisions, empty: "No open decisions recorded" }) })
              ] })
            ] }),
            /* @__PURE__ */ o("footer", { className: "px-5 py-3 flex items-center gap-2 flex-wrap", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--bg))" }, children: [
              u && /* @__PURE__ */ o("button", { onClick: () => {
                u(), d();
              }, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--ok)", color: "var(--bg)" }, children: [
                "Approve",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              b && /* @__PURE__ */ o("button", { onClick: S, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--danger)", color: "var(--bg)" }, children: [
                "Reject",
                r.revision != null ? ` r${r.revision}` : ""
              ] }),
              N && /* @__PURE__ */ e("button", { onClick: N, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: "Interject on this revision" }),
              s && i && /* @__PURE__ */ o("button", { onClick: i, className: "text-[11px] px-3 py-1.5 rounded-md font-semibold", style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid var(--border)" }, children: [
                "Open producer · ",
                s.step
              ] }),
              /* @__PURE__ */ e("span", { className: "ml-auto text-[9px]", style: { color: "var(--muted)" }, children: r.producerSessionRef || "producer session reference unobservable" })
            ] })
          ]
        }
      )
    }
  );
}
function xt({ card: t, config: r, isGate: s, cardStatus: d, effectiveCapability: i, producerStep: u, producerSession: b, onOpenProducer: N, onApprove: p, onReject: S, onCycleTrust: v, onCycleDepth: $, onSetBudget: g, onInterject: y, onResolveDecision: V, onOpenOrchestrator: O }) {
  var he, Z, D, J, ue;
  const I = s ? "var(--warn)" : d.kind === "idle" ? "var(--border-strong, var(--border))" : d.color, j = t.trust || r.trust, C = t.depth || r.depth, B = ((he = t.parked) == null ? void 0 : he.length) || 0, k = Object.values(t.step_sessions || {}).some(
    (z) => !!z.last_response_at && !z.chat_disabled_at && !z.superseded && (!z.last_response_handled_at || z.last_response_handled_at < z.last_response_at)
  ), [M, K] = w(!1), [h, ee] = w(""), [_, ae] = w(!1), Y = ye(
    () => s ? wr(t, u) : null,
    [t, s, u]
  ), re = () => {
    const z = window.prompt(`Why reject revision ${(Y == null ? void 0 : Y.revision) ?? "unknown"}?`);
    z != null && z.trim() && S && S(z.trim());
  }, se = (t.decisions || []).filter((z) => !z.chosen && !z.resolved_at && (!!z.action || !!z.options));
  return /* @__PURE__ */ o(
    "div",
    {
      className: "rounded-lg p-2.5 transition-all duration-150",
      style: {
        background: "var(--card)",
        color: "var(--card-fg, var(--text))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${I}`
      },
      children: [
        /* @__PURE__ */ e("div", { className: "text-[13px] font-medium leading-snug truncate", style: { color: "var(--text-strong, var(--text))" }, children: t.title }),
        ((Z = t.source) == null ? void 0 : Z.repo) && /* @__PURE__ */ o(
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
        /* @__PURE__ */ o("div", { className: "mt-2 flex items-center gap-1 flex-wrap", children: [
          /* @__PURE__ */ e(
            Ne,
            {
              color: Nt[j],
              active: !!t.trust,
              onClick: v,
              title: `trust: ${j}${t.trust ? " (override)" : " (inherited)"} — click to cycle`,
              children: j
            }
          ),
          /* @__PURE__ */ e(
            Ne,
            {
              color: _t[C],
              active: !!t.depth,
              onClick: $,
              title: `depth: ${C}${t.depth ? " (override)" : " (inherited)"} — click to cycle`,
              children: C
            }
          ),
          /* @__PURE__ */ e(
            Ne,
            {
              color: d.color,
              active: d.kind !== "idle",
              title: `${d.label}${d.reason ? ` — ${d.reason}` : ""}`,
              children: d.label
            }
          ),
          /* @__PURE__ */ o(
            Ne,
            {
              color: i === "coordinator" ? "var(--warn)" : "var(--info)",
              active: i !== "auto-derived",
              title: `capability: ${i}; actual authority is runtime handshake-verified`,
              children: [
                "cap:",
                i === "auto-derived" ? "auto" : i
              ]
            }
          ),
          /* @__PURE__ */ o(
            Ne,
            {
              color: t.sot === "local" ? "var(--warn)" : t.sot === "github" ? "var(--info)" : "var(--muted)",
              active: t.sot === "local",
              title: t.sot === "local" ? "Local stage authority; linked cards retry guarded GitHub convergence" : t.sot === "github" ? "GitHub issue label is stage authority" : "Source-of-truth field is unrecorded",
              children: [
                "sot:",
                t.sot || "unknown"
              ]
            }
          ),
          t.lifecycle && /* @__PURE__ */ o(Ne, { color: "var(--muted)", title: `card lifecycle: ${t.lifecycle}`, children: [
            "life:",
            t.lifecycle
          ] }),
          g && /* @__PURE__ */ e(Lr, { budget: t.budget, depth: C, onSave: g }),
          B > 0 && /* @__PURE__ */ o(Ne, { color: "var(--warn)", title: `${B} parked idea(s)`, children: [
            "⏸ ",
            B
          ] }),
          k && /* @__PURE__ */ e(Ne, { color: "var(--accent)", active: !0, title: "A response in an enabled linked agent chat is being applied to this card", children: "↪ chat response" }),
          typeof ((D = t.effort) == null ? void 0 : D.total) == "number" && t.effort.total > 0 && /* @__PURE__ */ o(Ne, { color: "var(--info)", title: `estimated effort: ${t.effort.total} points`, children: [
            "⚡ ",
            t.effort.total
          ] }),
          t.backstep_history && t.backstep_history.length > 0 && /* @__PURE__ */ o(
            Ne,
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
            const z = t.decisions[t.decisions.length - 1];
            return /* @__PURE__ */ o(
              Ne,
              {
                color: "var(--accent)",
                title: `${t.decisions.length} decision${t.decisions.length === 1 ? "" : "s"} — last: ${z.question || z.kind || ""}${z.action ? ` → ${z.action}` : ""}${z.rationale ? `
${z.rationale}` : ""}`,
                children: [
                  "⚖ ",
                  t.decisions.length
                ]
              }
            );
          })()
        ] }),
        s && Y && /* @__PURE__ */ o(
          "div",
          {
            "data-gate-inspection-summary": !0,
            className: "mt-2.5 rounded-md p-2",
            style: { background: Y.ready ? "color-mix(in srgb, var(--ok) 7%, transparent)" : "color-mix(in srgb, var(--warn) 7%, transparent)", border: `1px solid color-mix(in srgb, ${Y.ready ? "var(--ok)" : "var(--warn)"} 32%, var(--border))` },
            children: [
              /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5 text-[10px]", children: [
                /* @__PURE__ */ e("span", { className: "font-semibold", style: { color: Y.ready ? "var(--ok)" : "var(--warn)" }, children: Y.ready ? "Review-ready" : "Not review-ready" }),
                /* @__PURE__ */ o("span", { className: "ml-auto", style: { color: "var(--muted)" }, children: [
                  "r",
                  Y.revision ?? "?"
                ] }),
                /* @__PURE__ */ e("span", { className: "px-1 py-0.5 rounded", style: { color: "var(--muted)", background: "var(--bg-hover, var(--border))" }, children: Y.reviewStatus })
              ] }),
              /* @__PURE__ */ e("div", { className: "mt-1 text-[11px] leading-snug overflow-hidden", style: { color: Y.summary ? "var(--text)" : "var(--warn)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: Y.summary || "No review bundle summary published." }),
              !Y.ready && /* @__PURE__ */ o("div", { className: "mt-1 text-[9px]", style: { color: "var(--muted)" }, children: [
                Y.missing.length,
                " readiness gap",
                Y.missing.length === 1 ? "" : "s"
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  type: "button",
                  onClick: () => ae(!0),
                  className: "mt-1.5 text-[10px] font-semibold hover:underline",
                  style: { color: "var(--accent)" },
                  children: "Inspect result bundle →"
                }
              )
            ]
          }
        ),
        s && p && S && /* @__PURE__ */ o("div", { className: "mt-2.5 flex gap-1.5 items-center flex-wrap", children: [
          /* @__PURE__ */ e(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--ok)", color: "var(--bg)" },
              onClick: p,
              children: "Approve"
            }
          ),
          /* @__PURE__ */ e(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85",
              style: { background: "var(--danger)", color: "var(--bg)" },
              onClick: re,
              children: "Reject"
            }
          ),
          b && N && /* @__PURE__ */ o(
            "button",
            {
              className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
              style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
              onClick: N,
              title: `Open the ${b.step} producer session${b.retained ? " (held for this gate)" : ""}`,
              children: [
                /* @__PURE__ */ e("span", { "aria-hidden": "true", children: "↗" }),
                "Open producer · ",
                b.step
              ]
            }
          ),
          (t.stage === "gate-review" || /review/i.test(t.stage || "")) && (() => {
            var P, oe, be;
            const z = (P = t.source) == null ? void 0 : P.repo;
            if (!z) return null;
            const de = (oe = t.artifacts) == null ? void 0 : oe.pr_url, x = de && ((be = /\/pull\/(\d+)/.exec(de)) == null ? void 0 : be[1]), G = `/code-review-sage?repo=${encodeURIComponent("https://github.com/" + z)}` + (x ? `&pr=${x}` : "");
            return /* @__PURE__ */ o(
              "a",
              {
                href: G,
                title: de ? `Deep-review PR #${x} in Code Review Sage` : `Open Code Review Sage for ${z}`,
                className: "text-[11px] px-2.5 py-1 rounded-md font-semibold transition-opacity hover:opacity-85 inline-flex items-center gap-1",
                style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                children: [
                  /* @__PURE__ */ o("svg", { width: "11", height: "11", viewBox: "0 0 16 16", fill: "none", children: [
                    /* @__PURE__ */ e("circle", { cx: "7", cy: "7", r: "4.5", stroke: "currentColor", strokeWidth: "1.5" }),
                    /* @__PURE__ */ e("path", { d: "M10.5 10.5L14 14", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                  ] }),
                  "Review in Sage"
                ]
              }
            );
          })()
        ] }),
        V && se.map((z) => /* @__PURE__ */ o(
          "div",
          {
            className: "mt-2 p-1.5 rounded-md text-[11px]",
            style: { background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" },
            children: [
              /* @__PURE__ */ o("div", { style: { color: "var(--text, var(--muted))" }, children: [
                "⚖ ",
                z.question || z.kind
              ] }),
              /* @__PURE__ */ o("div", { className: "mt-1 text-[10px]", style: { color: "var(--muted)" }, children: [
                "This records acknowledgement only; it does not enact ",
                z.action || "the proposed pipeline change",
                "."
              ] }),
              /* @__PURE__ */ e(
                "button",
                {
                  className: "mt-1 px-2 py-0.5 rounded font-semibold",
                  style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                  onClick: () => V(z.id),
                  children: "Acknowledge & continue"
                }
              )
            ]
          },
          z.id
        )),
        y && (M ? /* @__PURE__ */ o("div", { className: "mt-2 flex flex-col gap-1", children: [
          /* @__PURE__ */ e(
            "textarea",
            {
              value: h,
              onChange: (z) => ee(z.target.value),
              placeholder: "Interject: design/spec note, re-scope…",
              rows: 2,
              className: "w-full text-[11px] px-2 py-1 rounded outline-none resize-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ o("div", { className: "flex gap-1.5", children: [
            /* @__PURE__ */ e(
              "button",
              {
                className: "text-[11px] px-2 py-0.5 rounded font-semibold",
                style: { background: "var(--accent)", color: "var(--bg)" },
                onClick: () => {
                  h.trim() && (y("note", h.trim()), ee(""), K(!1));
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
                  K(!1), ee("");
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
            onClick: () => K(!0),
            children: "+ interject"
          }
        )),
        O && /* @__PURE__ */ e(
          "button",
          {
            className: "mt-2 ml-2 text-[10px] hover:underline",
            style: { color: "var(--muted)" },
            title: (J = t.orchestrator_session) != null && J.slot_key ? "Open this pipeline’s orchestrator session" : "Trigger an inspectable orchestrator session for this card",
            onClick: () => O(),
            children: (ue = t.orchestrator_session) != null && ue.slot_key ? "⚙ open orchestrator" : "⚙ orchestrator"
          }
        ),
        _ && Y && /* @__PURE__ */ e(
          Pr,
          {
            card: t,
            inspection: Y,
            producerSession: b,
            onClose: () => ae(!1),
            onOpenProducer: N,
            onApprove: p,
            onReject: S,
            onInterject: y ? () => {
              ae(!1), K(!0);
            } : void 0
          }
        )
      ]
    }
  );
}
function ft({ title: t, count: r, children: s, id: d }) {
  return /* @__PURE__ */ o("div", { id: d, className: "min-w-[210px] max-w-[240px] flex-shrink-0", children: [
    /* @__PURE__ */ o("div", { className: "flex items-center gap-2 mb-2 px-0.5 sticky top-0", children: [
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
    ) : s })
  ] });
}
function Hr({ config: t, onSet: r }) {
  function s({ label: d, value: i, options: u, tokens: b, onPick: N }) {
    return /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: d }),
      /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: u.map((p) => {
        const S = i === p;
        return /* @__PURE__ */ e(
          "button",
          {
            onClick: () => N(p),
            className: "text-[11px] px-2 py-0.5 rounded font-semibold transition-all",
            style: {
              color: S ? b[p] : "var(--muted)",
              background: S ? `color-mix(in srgb, ${b[p]} 16%, transparent)` : "transparent",
              boxShadow: S ? `inset 0 0 0 1px color-mix(in srgb, ${b[p]} 45%, transparent)` : "none"
            },
            children: p
          },
          p
        );
      }) })
    ] });
  }
  return /* @__PURE__ */ o(
    "div",
    {
      className: "flex items-center gap-5 flex-wrap mb-4 px-3 py-2 rounded-lg",
      style: { background: "var(--card)", border: "1px solid var(--border)" },
      children: [
        /* @__PURE__ */ e("span", { className: "text-xs font-semibold", style: { color: "var(--muted-strong, var(--muted))" }, children: "Defaults" }),
        /* @__PURE__ */ e(s, { label: "Trust", value: t.trust, options: Be, tokens: Nt, onPick: (d) => r({ trust: d }) }),
        /* @__PURE__ */ e(s, { label: "Depth", value: t.depth, options: Pe, tokens: _t, onPick: (d) => r({ depth: d }) }),
        /* @__PURE__ */ e("span", { className: "text-[10px] ml-auto", style: { color: "var(--muted)" }, children: "click a card badge to override per-card" })
      ]
    }
  );
}
function Kr({ cards: t }) {
  const r = t.flatMap(
    (s) => (s.parked || []).map((d) => {
      var i;
      return { ...d, cardTitle: s.title, repo: (i = s.source) == null ? void 0 : i.repo };
    })
  ).sort((s, d) => (d.at || "").localeCompare(s.at || ""));
  return r.length === 0 ? /* @__PURE__ */ o("div", { className: "rounded-lg p-6 text-center max-w-xl", style: { border: "1px dashed var(--border)", color: "var(--muted)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-sm font-medium", style: { color: "var(--text)" }, children: "No parked ideas yet" }),
    /* @__PURE__ */ o("div", { className: "text-xs mt-1", children: [
      "Agents file un-specable tangents here as ",
      /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
      " issues on each card's owned repo. The intake cron back-feeds them as new cards."
    ] })
  ] }) : /* @__PURE__ */ e("div", { className: "flex flex-col gap-2 max-w-2xl", children: r.map((s) => /* @__PURE__ */ o("div", { className: "rounded-lg p-3", style: { background: "var(--card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--warn)" }, children: [
    /* @__PURE__ */ e("div", { className: "text-[13px] font-medium", style: { color: "var(--text-strong, var(--text))" }, children: s.note }),
    /* @__PURE__ */ o("div", { className: "text-[11px] mt-1 flex items-center gap-2 flex-wrap", style: { color: "var(--muted)" }, children: [
      /* @__PURE__ */ o("span", { children: [
        "from ",
        /* @__PURE__ */ e("span", { style: { color: "var(--text)" }, children: s.cardTitle })
      ] }),
      s.phase && /* @__PURE__ */ o("span", { children: [
        "· parked at ",
        s.phase
      ] }),
      s.repo && /* @__PURE__ */ o("span", { children: [
        "· ",
        s.repo
      ] }),
      s.issue_url && /* @__PURE__ */ e("a", { href: s.issue_url, target: "_blank", rel: "noreferrer", className: "hover:underline", style: { color: "var(--accent)" }, children: "view issue →" })
    ] })
  ] }, s.id)) });
}
function Vr({ repos: t, selected: r, onToggle: s, onClear: d, onAddWorkspace: i, onEdit: u }) {
  const b = t.reduce((S, v) => S + v.count, 0), N = r.size === 0, p = ({ name: S, count: v, label: $, checked: g, onClick: y, isAll: V }) => {
    const [O, I] = w(!1);
    return /* @__PURE__ */ o(
      "div",
      {
        onMouseEnter: () => I(!0),
        onMouseLeave: () => I(!1),
        className: "relative w-full rounded-md transition-all flex items-center",
        style: {
          background: g ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
          boxShadow: g ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" : "none"
        },
        children: [
          /* @__PURE__ */ o(
            "button",
            {
              onClick: y,
              className: "flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2",
              children: [
                V ? /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: g ? "var(--accent)" : "var(--border-strong, var(--border))" } }) : /* @__PURE__ */ e(
                  "span",
                  {
                    className: "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0",
                    style: {
                      background: g ? "var(--accent)" : "transparent",
                      border: `1.5px solid ${g ? "var(--accent)" : "var(--border-strong, var(--border))"}`
                    },
                    children: g && /* @__PURE__ */ e("svg", { width: "9", height: "9", viewBox: "0 0 10 10", children: /* @__PURE__ */ e("path", { d: "M1 5l2.5 2.5L9 2", fill: "none", stroke: "var(--bg)", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })
                  }
                ),
                /* @__PURE__ */ e(
                  "span",
                  {
                    className: "text-[12px] font-medium truncate flex-1",
                    style: { color: g ? "var(--text-strong, var(--text))" : "var(--muted-strong, var(--muted))" },
                    children: $
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
          !V && S && /* @__PURE__ */ e(
            "button",
            {
              onClick: (j) => {
                j.stopPropagation(), u(S);
              },
              title: `Edit pipeline "${$}"`,
              "aria-label": `Edit pipeline ${$}`,
              className: "mr-1.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all",
              style: {
                opacity: O ? 1 : 0,
                pointerEvents: O ? "auto" : "none",
                color: "var(--text-strong, var(--text))",
                background: "var(--bg-hover, color-mix(in srgb, var(--accent) 12%, transparent))",
                border: "1px solid var(--border-strong, var(--border))"
              },
              onMouseEnter: (j) => {
                const C = j.currentTarget;
                C.style.color = "var(--accent)", C.style.borderColor = "var(--accent)";
              },
              onMouseLeave: (j) => {
                const C = j.currentTarget;
                C.style.color = "var(--text-strong, var(--text))", C.style.borderColor = "var(--border-strong, var(--border))";
              },
              children: /* @__PURE__ */ e("svg", { width: "13", height: "13", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ e("path", { d: "M11.5 1.5l3 3L5 14l-3.5.5L2 11 11.5 1.5z", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) })
            }
          )
        ]
      }
    );
  };
  return /* @__PURE__ */ o(
    "div",
    {
      className: "flex-shrink-0 w-52 flex flex-col gap-1 pr-3 border-r self-stretch overflow-y-auto",
      style: { borderColor: "var(--border)" },
      children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between px-2.5 mb-1", children: [
          /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspaces" }),
          r.size > 0 && /* @__PURE__ */ e("button", { onClick: d, className: "text-[10px] hover:underline", style: { color: "var(--accent)" }, children: "clear" })
        ] }),
        /* @__PURE__ */ e(p, { isAll: !0, count: b, label: "All repos", checked: N, onClick: d }),
        t.map((S) => /* @__PURE__ */ e(
          p,
          {
            name: S.name,
            count: S.count,
            label: (Jt.has(S.name) ? "Example: " : "") + (S.name.includes("/") ? S.name.split("/")[1] : S.name),
            checked: r.has(S.name),
            onClick: () => s(S.name)
          },
          S.name
        )),
        /* @__PURE__ */ o(
          "button",
          {
            onClick: i,
            className: "mt-2 w-full px-2.5 py-2 rounded-md text-[12px] font-semibold flex items-center gap-2 transition-all",
            style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
            children: [
              /* @__PURE__ */ e("span", { className: "text-[15px] leading-none", children: "+" }),
              " New Pipeline"
            ]
          }
        ),
        r.size > 1 && /* @__PURE__ */ o("div", { className: "text-[10px] px-2.5 mt-1", style: { color: "var(--muted)" }, children: [
          "Showing ",
          r.size,
          " pipelines combined"
        ] })
      ]
    }
  );
}
const Xr = [
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
function Yr({ initial: t, agentProfiles: r, crews: s, repo: d, stepName: i, onSave: u, onSaveCrew: b, onClose: N }) {
  const [p, S] = w(t.name || ""), [v, $] = w(t.role || ""), [g, y] = w(t.tools || ["read"]), [V, O] = w(t.model || "auto"), [I, j] = w(t.crew || ""), [C, B] = w(t.addenda || []), [k, M] = w(t.capability || ""), [K, h] = w(t.trust || ""), [ee, _] = w(t.depth || ""), [ae, Y] = w(!1), re = r.find((x) => x.name === p), se = s.find((x) => x.name === I), he = [.../* @__PURE__ */ new Set([...Xr, ...g])], Z = (x) => {
    const G = Wr({ name: p, role: v, tools: g, model: V, crew: I, addenda: C, capability: k, trust: K, depth: ee }, x);
    S(G.name), y(G.tools || []), O(G.model || "auto"), G.capability && M(G.capability);
  }, D = (x) => y((G) => G.includes(x) ? G.filter((P) => P !== x) : [...G, x]), J = () => B((x) => {
    var G;
    return x.length >= 3 ? x : [...x, { crew: ((G = s[0]) == null ? void 0 : G.name) || "", when: "always", writes: "" }];
  }), ue = (x, G) => B((P) => P.map((oe, be) => be === x ? { ...oe, ...G } : oe)), z = (x) => B((G) => G.filter((P, oe) => oe !== x)), de = p.trim().length > 0;
  return /* @__PURE__ */ o("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex items-center gap-2", style: { borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ e("button", { onClick: N, className: "text-sm leading-none", style: { color: "var(--accent)" }, children: "← Steps" }),
      /* @__PURE__ */ o("div", { className: "ml-1", children: [
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
    /* @__PURE__ */ o("div", { className: "px-5 py-4 flex flex-col gap-3.5 flex-1 overflow-y-auto", children: [
      r.length > 0 && /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent profile preset" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: () => Y(!0),
              className: "text-[10px] px-2 py-1 rounded-md font-semibold",
              style: { color: "var(--accent)", border: "1px solid var(--border)" },
              children: "Browse agents & crews"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: r.map((x) => /* @__PURE__ */ e(
          "button",
          {
            onClick: () => Z(x),
            disabled: x.status !== "loaded",
            title: x.description || x.name,
            className: "text-[11px] px-2 py-1 rounded-md font-medium disabled:opacity-40",
            style: {
              background: p === x.name ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
              color: p === x.name ? "var(--accent)" : "var(--muted-strong, var(--muted))",
              boxShadow: p === x.name ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
            },
            children: x.name
          },
          x.name
        )) }),
        re && /* @__PURE__ */ o("div", { className: "text-[10px] mt-1.5 rounded-md px-2 py-1.5", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
          "Loaded config: model ",
          /* @__PURE__ */ e("code", { children: re.model || "auto" }),
          " · ",
          re.tools.length,
          " declared tool",
          re.tools.length === 1 ? "" : "s",
          " · ",
          re.allowedTools.length,
          " auto-approved. The step objective below remains pipeline-local."
        ] })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Agent name" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: p,
            onChange: (x) => S(x.target.value),
            placeholder: "e.g. impl-agent",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Role / prompt" }),
        /* @__PURE__ */ e(
          "textarea",
          {
            value: v,
            onChange: (x) => $(x.target.value),
            rows: 3,
            placeholder: "What this agent does in this step…",
            className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none resize-y",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Tools" }),
        /* @__PURE__ */ e("div", { className: "mt-1 flex flex-wrap gap-1.5", children: he.map((x) => {
          const G = g.includes(x);
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => D(x),
              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
              style: {
                background: G ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                color: G ? "var(--accent)" : "var(--muted)",
                boxShadow: G ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
              },
              children: x
            },
            x
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "rounded-md p-2.5", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ o("div", { children: [
            /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Capability profile" }),
            /* @__PURE__ */ e("div", { className: "text-[10px] mt-0.5", style: { color: "var(--muted)" }, children: "Trust = when · depth = how much · capability = what authority" })
          ] }),
          /* @__PURE__ */ o(
            "select",
            {
              value: k,
              onChange: (x) => M(x.target.value),
              className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "auto-derived" }),
                ["readonly", "authoring", "builder", "coordinator"].map((x) => /* @__PURE__ */ e("option", { value: x, children: x }, x))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ o("div", { className: "text-[10px] mt-2", style: { color: k === "coordinator" ? "var(--warn)" : "var(--muted)" }, children: [
          "The tools above are requested/declared—not proof of runtime access. Actual crew authority comes from its ",
          /* @__PURE__ */ e("code", { children: "kiro_agent" }),
          " profile; widening remains trust-gated and handshake-verified."
        ] })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Model" }),
        /* @__PURE__ */ e(
          "input",
          {
            value: V,
            onChange: (x) => O(x.target.value),
            placeholder: "auto",
            className: "w-40 px-2 py-1 rounded-md text-sm outline-none",
            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Crew" }),
          /* @__PURE__ */ o(
            "select",
            {
              value: I,
              onChange: (x) => j(x.target.value),
              className: "w-52 px-2 py-1 rounded-md text-sm outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: [
                /* @__PURE__ */ e("option", { value: "", children: "— none (use step agent) —" }),
                s.map((x) => /* @__PURE__ */ e("option", { value: x.name, children: x.name }, x.name))
              ]
            }
          )
        ] }),
        se && /* @__PURE__ */ o("div", { className: "text-[10px] mt-1 text-right", style: { color: "var(--muted)" }, children: [
          "Global route ",
          /* @__PURE__ */ e("code", { children: se.name }),
          " → ",
          /* @__PURE__ */ e("code", { children: se.kiroAgent || "profile unknown" }),
          se.workspace ? ` · workspace ${se.workspace}` : "",
          se.description ? ` · ${se.description}` : ""
        ] })
      ] }),
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Addendum crews" }),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: J,
              disabled: C.length >= 3,
              className: "text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40",
              style: { color: "var(--accent)", border: "1px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" },
              children: "+ addendum"
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "text-[10px] mb-1.5", style: { color: "var(--muted)" }, children: "Run after the canon crew as separate passes (e.g. research, secure-design). Max 3." }),
        C.length === 0 && /* @__PURE__ */ e("div", { className: "text-[11px] italic", style: { color: "var(--muted)" }, children: "none" }),
        C.map((x, G) => /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
          /* @__PURE__ */ e(
            "select",
            {
              value: x.crew,
              onChange: (P) => ue(G, { crew: P.target.value }),
              className: "flex-1 min-w-0 px-2 py-1 rounded-md text-[12px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" },
              children: s.map((P) => /* @__PURE__ */ e("option", { value: P.name, children: P.name }, P.name))
            }
          ),
          /* @__PURE__ */ o(
            "select",
            {
              value: x.when || "always",
              onChange: (P) => ue(G, { when: P.target.value }),
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
              value: x.writes || "",
              onChange: (P) => ue(G, { writes: P.target.value }),
              placeholder: "writes (e.g. research.md)",
              className: "w-32 px-2 py-1 rounded-md text-[11px] outline-none",
              style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
            }
          ),
          /* @__PURE__ */ e("button", { onClick: () => z(G), className: "w-5 h-5 flex items-center justify-center flex-shrink-0", style: { color: "var(--muted)" }, "aria-label": "Remove addendum", children: /* @__PURE__ */ e("svg", { width: "10", height: "10", viewBox: "0 0 12 12", children: /* @__PURE__ */ e("path", { d: "M2 2l8 8M10 2l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
        ] }, G))
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trust" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Be].map((x) => {
          const G = K === x;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => h(x),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: G ? x ? Nt[x] : "var(--text)" : "var(--muted)", background: G ? "var(--bg-hover, var(--border))" : "transparent" },
              children: x || "inherit"
            },
            x || "inherit"
          );
        }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Depth" }),
        /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: ["", ...Pe].map((x) => {
          const G = ee === x;
          return /* @__PURE__ */ e(
            "button",
            {
              onClick: () => _(x),
              className: "text-[11px] px-2 py-0.5 rounded font-semibold",
              style: { color: G ? x ? _t[x] : "var(--text)" : "var(--muted)", background: G ? "var(--bg-hover, var(--border))" : "transparent" },
              children: x || "inherit"
            },
            x || "inherit"
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
      /* @__PURE__ */ e("button", { onClick: N, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: "Back" }),
      /* @__PURE__ */ e(
        "button",
        {
          disabled: !de,
          onClick: () => u({
            name: p.trim(),
            role: v.trim() || void 0,
            tools: g,
            model: V.trim() && V.trim() !== "auto" ? V.trim() : void 0,
            crew: I || void 0,
            addenda: C.length ? C.filter((x) => x.crew) : void 0,
            capability: k || void 0,
            trust: K || void 0,
            depth: ee || void 0
          }),
          className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
          style: { background: "var(--accent)", color: "var(--bg)" },
          children: "Save step"
        }
      )
    ] }),
    ae && /* @__PURE__ */ e(
      Lt,
      {
        profiles: r,
        crews: s,
        context: `${d || "unassigned pipeline"} · ${i || "unnamed step"}`,
        onSaveCrew: b,
        onClose: () => Y(!1),
        onSelectProfile: (x) => {
          Z(x), Y(!1);
        },
        onSelectCrew: (x) => {
          j(x.name), Y(!1);
        }
      }
    )
  ] });
}
function Pt({ candidates: t, existingRepos: r, defaults: s, agentProfiles: d, crews: i, onCreate: u, onSaveCrew: b, onClose: N, editPipeline: p, cardCount: S, isExample: v, onDelete: $ }) {
  var Qe, ct, pt, ut, mt, et, vt, Ee, Me, qe, a, l, c, f, T;
  const g = !!p, [y, V] = w((p == null ? void 0 : p.repo) || ""), [O, I] = w((p == null ? void 0 : p.workspace) || "default"), [j, C] = w((p == null ? void 0 : p.repo_path) || ""), [B, k] = w((p == null ? void 0 : p.source) || "manual"), [M, K] = w((p == null ? void 0 : p.trust) || s.trust), [h, ee] = w((p == null ? void 0 : p.depth) || s.depth), _ = p == null ? void 0 : p.budget, [ae, Y] = w(
    _ ? _.max_child_cards === "unlimited" && _.effort_ceiling === "unlimited" ? "unlimited" : "custom" : "depth"
  ), [re, se] = w(
    () => _ && _.max_child_cards !== "unlimited" && _.effort_ceiling !== "unlimited" ? { ..._ } : Ft((p == null ? void 0 : p.depth) || s.depth)
  ), [he, Z] = w((p == null ? void 0 : p.backlog_intake) ?? !0), [D, J] = w((p == null ? void 0 : p.results_in_repo) ?? !1), [ue, z] = w((p == null ? void 0 : p.conversation_log) ?? !1), [de, x] = w(((p == null ? void 0 : p.trusted_authors) || []).join(`
`)), [G, P] = w((p == null ? void 0 : p.self_enabling) ?? !1), [oe, be] = w((p == null ? void 0 : p.approach) || "simplified"), [U, me] = w((p == null ? void 0 : p.sync_mode) || "poll"), [L, le] = w(() => {
    var n;
    return (n = p == null ? void 0 : p.steps) != null && n.length ? p.steps.map((m) => ({ ...m })) : wt.map((m) => ({ ...m }));
  }), [E, ge] = w(null), [Ke, Ve] = w(""), [Re, we] = w("settings"), [Ct, Xe] = w(!1), Ye = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "step", ce = (n, m) => le((R) => R.map((F, W) => W === n ? { ...F, ...m } : F)), St = (n) => le((m) => m.filter((R, F) => F !== n)), ze = (n, m) => le((R) => {
    const F = n + m;
    if (F < 0 || F >= R.length) return R;
    const W = [...R];
    return [W[n], W[F]] = [W[F], W[n]], W;
  }), nt = (n) => le((m) => [...m, {
    id: `${n}-${Math.random().toString(36).slice(2, 6)}`,
    name: n === "gate" ? "New Gate" : "New Step",
    type: n,
    agent: n === "agent" ? { name: "impl-agent", role: "" } : void 0
  }]), At = (n) => {
    V(n.repo || ""), I(n.workspace || "default"), C(n.path || ""), k(n.source);
  }, $e = (n) => {
    let m = (n || "").trim();
    if (!m) return "";
    const R = m.match(/^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab)\.com\/([^/\s]+\/[^/\s#?]+)/i);
    return R && (m = R[1]), m.replace(/\.git$/i, "").replace(/\/+$/, "");
  }, st = (n) => {
    const m = /github\.com|gitlab\.com/i.test(n);
    V(m ? $e(n) : n), k("manual");
  }, lt = [...new Map(
    de.split(/[\n,]/).map((n) => n.trim()).filter(Boolean).map((n) => [n.toLowerCase(), n])
  ).values()], Ze = lt.every((n) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(n)), We = /^[A-Za-z0-9_.-]{1,80}$/.test(O), it = (/^[^/\s]+\/[^/\s]+$/.test($e(y)) || t.some((n) => n.repo && n.repo === y)) && Ze && We, Ge = !g && r.has($e(y)), Je = ({ value: n, options: m, tokens: R, onPick: F }) => /* @__PURE__ */ e("div", { className: "flex gap-0.5 p-0.5 rounded-md", style: { background: "var(--bg-elevated, var(--card))", border: "1px solid var(--border)" }, children: m.map((W) => {
    const X = n === W;
    return /* @__PURE__ */ e(
      "button",
      {
        onClick: () => F(W),
        className: "text-[11px] px-2.5 py-1 rounded font-semibold transition-all",
        style: {
          color: X ? R[W] : "var(--muted)",
          background: X ? `color-mix(in srgb, ${R[W]} 16%, transparent)` : "transparent",
          boxShadow: X ? `inset 0 0 0 1px color-mix(in srgb, ${R[W]} 45%, transparent)` : "none"
        },
        children: W
      },
      W
    );
  }) }), Se = { "issue-radar": [], workspace: [], manual: [] };
  t.forEach((n) => {
    var m;
    (Se[m = n.source] || (Se[m] = [])).push(n);
  });
  const Tt = { "issue-radar": "Issue Radar", workspace: "KiroCrew Workspaces", manual: "Manual" }, dt = g ? ["settings", "webhook", "danger"] : ["settings", "webhook"];
  return /* @__PURE__ */ e(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "color-mix(in srgb, black 55%, transparent)" },
      onClick: N,
      children: /* @__PURE__ */ o(
        "div",
        {
          className: "w-full max-w-lg rounded-xl overflow-hidden flex flex-col",
          style: { background: "var(--card)", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "82vh" },
          onClick: (n) => n.stopPropagation(),
          children: [
            Ct && /* @__PURE__ */ e(
              Lt,
              {
                profiles: d,
                crews: i,
                context: y || O,
                onSaveCrew: b,
                onClose: () => Xe(!1)
              }
            ),
            E !== null ? /* @__PURE__ */ e(
              Yr,
              {
                initial: {
                  name: ((ct = (Qe = L[E]) == null ? void 0 : Qe.agent) == null ? void 0 : ct.name) || "",
                  role: (ut = (pt = L[E]) == null ? void 0 : pt.agent) == null ? void 0 : ut.role,
                  tools: (et = (mt = L[E]) == null ? void 0 : mt.agent) == null ? void 0 : et.tools,
                  model: (Ee = (vt = L[E]) == null ? void 0 : vt.agent) == null ? void 0 : Ee.model,
                  crew: (qe = (Me = L[E]) == null ? void 0 : Me.agent) == null ? void 0 : qe.crew,
                  addenda: (a = L[E]) == null ? void 0 : a.addenda,
                  capability: (l = L[E]) == null ? void 0 : l.capability,
                  trust: (c = L[E]) == null ? void 0 : c.trust,
                  depth: (f = L[E]) == null ? void 0 : f.depth
                },
                agentProfiles: d,
                crews: i,
                repo: y,
                stepName: ((T = L[E]) == null ? void 0 : T.name) || "",
                onSaveCrew: b,
                onClose: () => ge(null),
                onSave: (n) => {
                  ce(E, {
                    agent: { name: n.name, role: n.role, tools: n.tools, model: n.model, crew: n.crew },
                    addenda: n.addenda,
                    capability: n.capability,
                    trust: n.trust,
                    depth: n.depth
                  }), ge(null);
                }
              }
            ) : /* @__PURE__ */ o(He, { children: [
              /* @__PURE__ */ o("div", { className: "px-5 py-4 flex items-center justify-between", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ o("div", { children: [
                  /* @__PURE__ */ e("div", { className: "text-base font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: g ? "Edit Pipeline" : "New Pipeline" }),
                  /* @__PURE__ */ e("div", { className: "text-xs mt-0.5", style: { color: "var(--muted)" }, children: g ? y.includes("/") ? y.split("/")[1] : y : "Configure a pipeline for a repository or workspace" })
                ] }),
                /* @__PURE__ */ e("button", { onClick: N, className: "text-lg leading-none px-2", style: { color: "var(--muted)" }, children: "×" })
              ] }),
              /* @__PURE__ */ e("div", { className: "px-5 pt-3 flex gap-1", style: { borderBottom: "1px solid var(--border)" }, children: dt.map((n) => {
                const m = Re === n, R = n === "danger";
                return /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => we(n),
                    className: "text-[12px] px-3 py-2 font-semibold transition-all",
                    style: {
                      color: m ? R ? "var(--danger, #ef4444)" : "var(--accent)" : "var(--muted)",
                      borderBottom: `2px solid ${m ? R ? "var(--danger, #ef4444)" : "var(--accent)" : "transparent"}`,
                      marginBottom: "-1px"
                    },
                    children: n === "settings" ? "Settings" : n === "webhook" ? "Webhook · app-wide" : "Danger Zone"
                  },
                  n
                );
              }) }),
              /* @__PURE__ */ o(
                "div",
                {
                  className: "px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1",
                  style: { display: Re === "settings" ? "flex" : "none" },
                  children: [
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Repository — paste a GitHub URL or owner/name" }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: y,
                          onChange: (n) => st(n.target.value),
                          onPaste: (n) => {
                            const m = n.clipboardData.getData("text");
                            /github\.com|gitlab\.com/i.test(m) && (n.preventDefault(), st(m));
                          },
                          placeholder: "https://github.com/owner/name  ·  or  owner/name",
                          disabled: g,
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-60",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Ge ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }
                        }
                      ),
                      !g && y && $e(y) !== y && /* @__PURE__ */ o("div", { className: "text-[11px] mt-1", style: { color: "var(--muted)" }, children: [
                        "→ ",
                        /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: $e(y) })
                      ] }),
                      Ge && /* @__PURE__ */ e("div", { className: "text-[11px] mt-1", style: { color: "var(--danger)" }, children: "A pipeline for this repo already exists." }),
                      /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-2", children: ["issue-radar", "workspace"].map((n) => Se[n].length > 0 && /* @__PURE__ */ o("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-[10px] uppercase tracking-wider mb-1", style: { color: "var(--muted)" }, children: Tt[n] }),
                        /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-1.5", children: Se[n].map((m) => {
                          const R = `${n}:${m.workspace || m.repo}:${m.path || ""}`, F = m.source === "workspace" ? O === m.workspace && j === (m.path || "") : y === m.repo;
                          return /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => At(m),
                              disabled: !!m.repo && r.has(m.repo),
                              title: m.detail || m.repo || m.workspace,
                              className: "text-[11px] px-2 py-1 rounded-md font-medium transition-all disabled:opacity-40",
                              style: {
                                background: F ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-hover, var(--border))",
                                color: F ? "var(--accent)" : "var(--muted-strong, var(--muted))",
                                boxShadow: F ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent)" : "none"
                              },
                              children: m.label || (m.repo.includes("/") ? m.repo.split("/")[1] : m.repo) || m.workspace
                            },
                            R
                          );
                        }) })
                      ] }, n)) })
                    ] }),
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Workspace partition" }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: O,
                          onChange: (n) => I(n.target.value.trim()),
                          placeholder: "default",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${We ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ o("div", { className: "text-[10px] mt-1", style: { color: We ? "var(--muted)" : "var(--danger)" }, children: [
                        "Partitions results and ledgers. It is independent from ",
                        /* @__PURE__ */ e("code", { children: "owner/name" }),
                        " and never inferred from a filesystem path."
                      ] })
                    ] }),
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Local checkout path" }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: j,
                          onChange: (n) => C(n.target.value),
                          placeholder: "/absolute/path/to/checkout",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ e("div", { className: "text-[10px] mt-1", style: { color: "var(--muted)" }, children: "Required before code or repo-mirrored results run. Mutable steps block rather than use the shared checkout when this path is absent or unverifiable." })
                    ] }),
                    /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Trust" }),
                      /* @__PURE__ */ e(Je, { value: M, options: Be, tokens: Nt, onPick: K })
                    ] }),
                    /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Default Depth" }),
                      /* @__PURE__ */ e(Je, { value: h, options: Pe, tokens: _t, onPick: ee })
                    ] }),
                    /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ o("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Budget Mode" }),
                        /* @__PURE__ */ e("div", { className: "text-[10px]", style: { color: "var(--muted)" }, children: "Controls fan-out and effort spend" })
                      ] }),
                      /* @__PURE__ */ e(
                        Je,
                        {
                          value: ae,
                          options: ["depth", "custom", "unlimited"],
                          tokens: { depth: "var(--muted)", custom: "var(--accent)", unlimited: "var(--ok)" },
                          onPick: Y
                        }
                      )
                    ] }),
                    ae === "depth" && (() => {
                      const n = Ft(h);
                      return /* @__PURE__ */ o("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--muted)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                        "Follows ",
                        /* @__PURE__ */ e("strong", { children: h }),
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
                    ae === "unlimited" && /* @__PURE__ */ e("div", { className: "text-[11px] px-3 py-2 rounded-md", style: { color: "var(--ok)", background: "color-mix(in srgb, var(--ok) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 35%, var(--border))" }, children: "No child-card or effort ceiling · max XL · proactive addenda" }),
                    ae === "custom" && /* @__PURE__ */ o("div", { className: "grid grid-cols-2 gap-2 p-3 rounded-md", style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)" }, children: [
                      /* @__PURE__ */ o("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max child cards",
                        /* @__PURE__ */ e(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: re.max_child_cards,
                            onChange: (n) => se((m) => ({ ...m, max_child_cards: Math.max(0, Number(n.target.value) || 0) })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                          }
                        )
                      ] }),
                      /* @__PURE__ */ o("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Effort ceiling",
                        /* @__PURE__ */ e(
                          "input",
                          {
                            type: "number",
                            min: 0,
                            value: re.effort_ceiling,
                            onChange: (n) => se((m) => ({ ...m, effort_ceiling: Math.max(0, Number(n.target.value) || 0) })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }
                          }
                        )
                      ] }),
                      /* @__PURE__ */ o("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Max feature size",
                        /* @__PURE__ */ e(
                          "select",
                          {
                            value: re.max_feature_size,
                            onChange: (n) => se((m) => ({ ...m, max_feature_size: n.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["S", "M", "L", "XL"].map((n) => /* @__PURE__ */ e("option", { children: n }, n))
                          }
                        )
                      ] }),
                      /* @__PURE__ */ o("label", { className: "text-[10px] uppercase tracking-wide", style: { color: "var(--muted)" }, children: [
                        "Addenda",
                        /* @__PURE__ */ e(
                          "select",
                          {
                            value: re.addenda,
                            onChange: (n) => se((m) => ({ ...m, addenda: n.target.value })),
                            className: "mt-1 w-full px-2 py-1.5 rounded text-[12px] outline-none",
                            style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                            children: ["none", "obvious", "proactive"].map((n) => /* @__PURE__ */ e("option", { children: n }, n))
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ o("div", { className: "min-w-0 pr-3", children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "GitHub sync mode" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: U === "webhook" ? "Webhook is the fast path; the safety-net poll reconciles this pipeline on a longer window. Requires the app-wide webhook receiver enabled — falls back to polling if it is not." : "Poll reconciles this pipeline every cycle (default). Correct when no webhook is configured." })
                      ] }),
                      /* @__PURE__ */ e("div", { className: "flex rounded-md overflow-hidden flex-shrink-0", style: { border: "1px solid var(--border)" }, children: ["poll", "webhook"].map((n) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => me(n),
                          className: "text-[11px] px-2.5 py-1 font-semibold",
                          style: {
                            background: U === n ? "var(--accent)" : "transparent",
                            color: U === n ? "var(--bg)" : "var(--muted)"
                          },
                          children: n === "poll" ? "Poll" : "Webhook"
                        },
                        n
                      )) })
                    ] }),
                    /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ o("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Backlog auto-intake" }),
                        /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                          "Back-feed open ",
                          /* @__PURE__ */ e("code", { style: { color: "var(--warn)" }, children: "dlc-backlog" }),
                          " issues as cards"
                        ] })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => Z((n) => !n),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: he ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: he ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ o("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Save results into repo" }),
                        /* @__PURE__ */ o("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                          "Also commit results & the pipeline conversation to a ",
                          /* @__PURE__ */ e("code", { style: { color: "var(--accent)" }, children: ".dlc-yolo/" }),
                          " copy in the owned repo (always kept in app data)"
                        ] })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => J((n) => !n),
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
                    /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ o("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Pipeline conversation log" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Opt in to the review-oriented command transcript; off means no log file is created" })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => z((n) => !n),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: ue ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: ue ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ e("label", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Trusted GitHub authors · optional" }),
                      /* @__PURE__ */ e(
                        "textarea",
                        {
                          value: de,
                          onChange: (n) => x(n.target.value),
                          rows: 2,
                          placeholder: "Defaults to the authenticated GitHub user",
                          className: "mt-1 w-full px-3 py-2 rounded-md text-sm font-mono outline-none resize-y",
                          style: { background: "var(--bg-elevated, var(--bg))", border: `1px solid ${Ze ? "var(--border)" : "var(--danger)"}`, color: "var(--text)" }
                        }
                      ),
                      /* @__PURE__ */ o("div", { className: "text-[10px] mt-1", style: { color: Ze ? "var(--muted)" : "var(--danger)" }, children: [
                        "One login per line. Empty never means allow-all; it falls back to the authenticated ",
                        /* @__PURE__ */ e("code", { children: "gh" }),
                        " user."
                      ] })
                    ] }),
                    /* @__PURE__ */ o("label", { className: "flex items-center justify-between cursor-pointer", children: [
                      /* @__PURE__ */ o("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Self-enabling pipeline" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Orchestrator resolves intent & auto-configures crews/steps (setup → intent → per-step)" })
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => P((n) => !n),
                          className: "w-10 h-5.5 rounded-full transition-all relative flex-shrink-0",
                          style: { background: G ? "var(--accent)" : "var(--border-strong, var(--border))", height: 22, width: 40 },
                          children: /* @__PURE__ */ e(
                            "span",
                            {
                              className: "absolute top-0.5 rounded-full transition-all",
                              style: { height: 18, width: 18, background: "var(--bg)", left: G ? 20 : 2 }
                            }
                          )
                        }
                      )
                    ] }),
                    G && /* @__PURE__ */ o("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ o("div", { children: [
                        /* @__PURE__ */ e("div", { className: "text-sm", style: { color: "var(--text)" }, children: "Setup approach" }),
                        /* @__PURE__ */ e("div", { className: "text-[11px]", style: { color: "var(--muted)" }, children: "Simplified = lean ladder · Enhanced = research gate + addendum crews + deeper" })
                      ] }),
                      /* @__PURE__ */ e("div", { className: "flex gap-1", children: ["simplified", "enhanced"].map((n) => /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => be(n),
                          className: "text-[11px] px-2 py-1 rounded-md font-semibold transition-all capitalize",
                          style: {
                            background: oe === n ? "var(--accent)" : "transparent",
                            color: oe === n ? "var(--bg)" : "var(--muted)",
                            border: `1px solid ${oe === n ? "var(--accent)" : "var(--border)"}`
                          },
                          children: n
                        },
                        n
                      )) })
                    ] }),
                    /* @__PURE__ */ o("div", { children: [
                      /* @__PURE__ */ o("div", { className: "flex items-center justify-between mb-1.5", children: [
                        /* @__PURE__ */ e("span", { className: "text-[11px] uppercase tracking-wider", style: { color: "var(--muted)" }, children: "Steps" }),
                        /* @__PURE__ */ o("div", { className: "flex gap-1", children: [
                          /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => Xe(!0),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--muted)", border: "1px solid var(--border)" },
                              children: "Agents & crews"
                            }
                          ),
                          /* @__PURE__ */ e(
                            "button",
                            {
                              onClick: () => nt("agent"),
                              className: "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                              style: { color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" },
                              children: "+ agent"
                            }
                          ),
                          /* @__PURE__ */ e(
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
                      /* @__PURE__ */ e("div", { className: "flex flex-col gap-1.5", children: L.map((n, m) => {
                        var R, F;
                        return /* @__PURE__ */ o(
                          "div",
                          {
                            className: "rounded-md p-2",
                            style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", borderLeft: `2px solid ${n.type === "gate" ? "var(--warn)" : "var(--accent)"}` },
                            children: [
                              /* @__PURE__ */ o("div", { className: "flex items-center gap-1.5", children: [
                                /* @__PURE__ */ o("div", { className: "flex flex-col", children: [
                                  /* @__PURE__ */ e("button", { onClick: () => ze(m, -1), disabled: m === 0, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▲" }),
                                  /* @__PURE__ */ e("button", { onClick: () => ze(m, 1), disabled: m === L.length - 1, className: "text-[8px] leading-none disabled:opacity-30", style: { color: "var(--muted)" }, children: "▼" })
                                ] }),
                                /* @__PURE__ */ e(
                                  "input",
                                  {
                                    value: n.name,
                                    onChange: (W) => ce(m, { name: W.target.value, id: Ye(W.target.value) }),
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
                                /* @__PURE__ */ e("button", { onClick: () => St(m), className: "text-[13px] leading-none px-1", style: { color: "var(--muted)" }, children: "×" })
                              ] }),
                              n.type === "agent" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-2 flex-wrap", children: [
                                /* @__PURE__ */ o(
                                  "button",
                                  {
                                    onClick: () => ge(m),
                                    className: "text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1.5",
                                    style: { background: "var(--bg-hover, var(--border))", color: "var(--accent)" },
                                    children: [
                                      "⚙ ",
                                      (R = n.agent) != null && R.name ? `Agent: ${n.agent.name}` : "Configure agent"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trigger" }),
                                /* @__PURE__ */ o(
                                  "select",
                                  {
                                    value: n.trigger || "ask",
                                    onChange: (W) => ce(m, { trigger: W.target.value === "ask" ? void 0 : W.target.value }),
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
                                /* @__PURE__ */ o("span", { className: "text-[10px]", style: { color: n.capability ? "var(--accent)" : "var(--muted)" }, title: "Actual authority is verified from the assigned capability profile at runtime", children: [
                                  "cap: ",
                                  n.capability || "auto"
                                ] }),
                                (n.trust || n.depth) && /* @__PURE__ */ e("span", { className: "text-[10px]", style: { color: "var(--muted)" }, children: [n.trust, n.depth].filter(Boolean).join(" · ") }),
                                n.addenda && n.addenda.length > 0 && /* @__PURE__ */ o("span", { className: "text-[10px]", style: { color: "var(--accent)" }, children: [
                                  "+",
                                  n.addenda.length,
                                  " addendum",
                                  n.addenda.length === 1 ? "" : "s"
                                ] }),
                                ((F = n.agent) == null ? void 0 : F.role) && /* @__PURE__ */ e("span", { className: "text-[10px] truncate", style: { color: "var(--muted)" }, children: n.agent.role })
                              ] }),
                              n.type === "gate" && /* @__PURE__ */ o("div", { className: "mt-1.5 pl-5 flex items-center gap-1", children: [
                                /* @__PURE__ */ e("span", { className: "text-[9px] uppercase", style: { color: "var(--muted)" }, children: "trust" }),
                                /* @__PURE__ */ o(
                                  "select",
                                  {
                                    value: n.trust || "",
                                    onChange: (W) => ce(m, { trust: W.target.value || void 0 }),
                                    className: "text-[10px] px-1 py-0.5 rounded outline-none",
                                    style: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" },
                                    children: [
                                      /* @__PURE__ */ e("option", { value: "", children: "inherit" }),
                                      Be.map((W) => /* @__PURE__ */ e("option", { value: W, children: W }, W))
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
              Re === "webhook" && /* @__PURE__ */ e("div", { className: "px-5 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ e($r, {}) }),
              g && Re === "danger" && $ && (() => {
                const n = y.includes("/") ? y.split("/")[1] : y, m = Ke.trim() === n;
                return /* @__PURE__ */ e("div", { className: "px-5 pb-4 pt-4", children: v ? /* @__PURE__ */ o(
                  "div",
                  {
                    className: "rounded-lg p-4 flex flex-col gap-3",
                    style: { border: "1px solid var(--border-strong, var(--border))", background: "var(--bg-elevated, transparent)" },
                    children: [
                      /* @__PURE__ */ o("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "This is a bundled ",
                        /* @__PURE__ */ e("strong", { children: "example" }),
                        " pipeline (",
                        S ?? 0,
                        " sample card",
                        (S ?? 0) === 1 ? "" : "s",
                        "). Remove it any time — it's demo data, not real work."
                      ] }),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          onClick: () => {
                            $(y), N();
                          },
                          className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                          style: { background: "var(--accent)", color: "var(--bg)" },
                          children: "Remove Example"
                        }
                      )
                    ]
                  }
                ) : /* @__PURE__ */ o(
                  "div",
                  {
                    className: "rounded-lg p-4 flex flex-col gap-3",
                    style: { border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 45%, var(--border))", background: "color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)" },
                    children: [
                      /* @__PURE__ */ e("div", { className: "text-[12px] font-semibold uppercase tracking-wide", style: { color: "var(--danger, #ef4444)" }, children: "Danger Zone" }),
                      /* @__PURE__ */ o("div", { className: "text-[12px]", style: { color: "var(--text, var(--muted))" }, children: [
                        "Deleting removes this pipeline and its ",
                        S ?? 0,
                        " card",
                        (S ?? 0) === 1 ? "" : "s",
                        " from DLC-YOLO's local state. It does ",
                        /* @__PURE__ */ e("strong", { children: "not" }),
                        " touch GitHub issues or labels. This cannot be undone."
                      ] }),
                      /* @__PURE__ */ o("label", { className: "text-[11px]", style: { color: "var(--muted)" }, children: [
                        "Type ",
                        /* @__PURE__ */ e("code", { className: "px-1 py-0.5 rounded", style: { background: "var(--bg-hover, var(--border))", color: "var(--text-strong, var(--text))" }, children: n }),
                        " to confirm:"
                      ] }),
                      /* @__PURE__ */ e(
                        "input",
                        {
                          value: Ke,
                          onChange: (R) => Ve(R.target.value),
                          placeholder: n,
                          className: "w-full px-3 py-2 rounded-md text-[13px] outline-none",
                          style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", color: "var(--text-strong, var(--text))" }
                        }
                      ),
                      /* @__PURE__ */ e(
                        "button",
                        {
                          disabled: !m,
                          onClick: () => {
                            $(y), N();
                          },
                          className: "w-full px-3 py-2 rounded-md text-[13px] font-semibold transition-all",
                          style: {
                            background: m ? "var(--danger, #ef4444)" : "color-mix(in srgb, var(--danger, #ef4444) 20%, transparent)",
                            color: m ? "#fff" : "var(--muted)",
                            cursor: m ? "pointer" : "not-allowed"
                          },
                          children: "Delete pipeline"
                        }
                      )
                    ]
                  }
                ) });
              })(),
              /* @__PURE__ */ o("div", { className: "px-5 py-3 flex justify-end gap-2", style: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated, var(--card))" }, children: [
                /* @__PURE__ */ e("button", { onClick: N, className: "text-xs px-3 py-1.5 rounded-md font-medium", style: { color: "var(--muted)" }, children: Re === "settings" ? "Cancel" : "Close" }),
                Re === "settings" && /* @__PURE__ */ e(
                  "button",
                  {
                    disabled: !it || !g && Ge,
                    onClick: () => u({
                      repo: $e(y),
                      workspace: O,
                      ...j.trim() ? { repo_path: j.trim() } : {},
                      source: B,
                      trust: M,
                      depth: h,
                      budget: ae === "depth" ? void 0 : ae === "unlimited" ? { max_child_cards: "unlimited", effort_ceiling: "unlimited", max_feature_size: "XL", addenda: "proactive" } : re,
                      backlog_intake: he,
                      results_in_repo: D,
                      conversation_log: ue,
                      trusted_authors: lt,
                      self_enabling: G,
                      approach: oe,
                      sync_mode: U,
                      steps: L.map((n) => ({ ...n, label: `dlc:${n.id}` }))
                    }),
                    className: "text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity disabled:opacity-40",
                    style: { background: "var(--accent)", color: "var(--bg)" },
                    children: g ? "Save Pipeline" : "Create Pipeline"
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
function Ht({ size: t = 12 }) {
  return /* @__PURE__ */ o("svg", { className: "animate-spin flex-shrink-0", width: t, height: t, viewBox: "0 0 16 16", "aria-hidden": "true", style: { color: "var(--accent)" }, children: [
    /* @__PURE__ */ e("circle", { cx: "8", cy: "8", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2", opacity: "0.22" }),
    /* @__PURE__ */ e("path", { d: "M8 2a6 6 0 0 1 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
  ] });
}
function ta() {
  const t = Kt(), r = sr(), [s, d] = w([]), [i, u] = w([]), [b, N] = w(ot), [p, S] = w(!0), [v, $] = w("pipeline"), [g, y] = w(/* @__PURE__ */ new Set()), [V, O] = w(!1), [I, j] = w(null), [C, B] = w([]), [k, M] = w([]), [K, h] = w([]), [ee, _] = w(!1), [ae, Y] = w(!1), [re, se] = w(!1), [he, Z] = w([]), D = ke(null), J = ke(!1), ue = ke(!1), z = ke(/* @__PURE__ */ new Set()), de = ke(/* @__PURE__ */ new Set()), [x, G] = w({}), P = te(
    (a) => t.get("/api/file-read?path=" + encodeURIComponent(a)),
    [t]
  ), oe = te(async (a = !1) => {
    try {
      const l = !ue.current || a ? await yt(P) : await qt(P, De);
      De = l.path, ue.current = !0;
      const c = l.data;
      d(c.cards || []), u(c.pipelines || []), N({ ...ot, ...c.config || {} });
    } catch (l) {
      console.error("Failed to fetch cards:", l);
    } finally {
      S(!1);
    }
  }, [P]), be = ye(() => {
    const a = /* @__PURE__ */ new Map();
    return i.forEach((l) => {
      a.has(l.repo) || a.set(l.repo, 0);
    }), s.forEach((l) => {
      var f;
      const c = ((f = l.source) == null ? void 0 : f.repo) || "unlinked";
      a.set(c, (a.get(c) || 0) + 1);
    }), [...a.entries()].map(([l, c]) => ({ name: l, count: c })).sort((l, c) => c.count - l.count);
  }, [s, i]), U = ye(
    () => g.size === 0 ? s : s.filter((a) => {
      var l;
      return g.has(((l = a.source) == null ? void 0 : l.repo) || "unlinked");
    }),
    [s, g]
  );
  _e(() => {
    de.current = new Set(s.map((a) => a.id)), z.current = new Set(s.flatMap(
      (a) => Object.values(a.step_sessions || {}).filter((l) => !!l.slot_key && !l.chat_disabled_at && !l.superseded).map((l) => l.slot_key)
    ));
  }, [s]), _e(() => {
    let a = !1, l = null, c, f = 0;
    const T = () => {
      if (a) return;
      const n = window.location.protocol === "https:" ? "wss:" : "ws:";
      l = new WebSocket(`${n}//${window.location.host}/api/ws`), l.onopen = () => {
        f = 0;
      }, l.onmessage = (m) => {
        if (typeof m.data == "string")
          try {
            const R = JSON.parse(m.data), F = R == null ? void 0 : R.data;
            if (R.type === "slots" && Array.isArray(F)) {
              const X = new Set(z.current), Q = [];
              for (const A of F) {
                const ve = (A == null ? void 0 : A.key) || (A == null ? void 0 : A.slot) || (A == null ? void 0 : A.name), ne = String((A == null ? void 0 : A.title) || (A == null ? void 0 : A.name) || "");
                typeof ve == "string" && ve.startsWith("cron-") && [...de.current].some((fe) => ne.includes(fe)) && X.add(ve), typeof ve == "string" && (A != null && A.running) && X.has(ve) && Q.push(ve);
              }
              z.current = X, Q.length && G((A) => {
                let ve = A;
                for (const ne of Q) {
                  const fe = jt(A[ne]);
                  fe !== A[ne] && (ve = { ...ve, [ne]: fe });
                }
                return ve;
              });
              return;
            }
            const W = F == null ? void 0 : F.slot;
            if (!W || !z.current.has(W)) return;
            R.type === "chat_status" && String(F.status || "").toLowerCase().startsWith("thinking") || R.type === "chat_thinking" ? G((X) => {
              const Q = jt(X[W], R.type === "chat_status");
              return Q === X[W] ? X : { ...X, [W]: Q };
            }) : R.type === "chat_chunk" && typeof F.content == "string" ? G((X) => {
              const Q = ur(X[W], F.content, Number(F.seq));
              return Q === X[W] ? X : { ...X, [W]: Q };
            }) : R.type === "chat_done" && G((X) => {
              const Q = mr(X[W]);
              return Q === X[W] ? X : { ...X, [W]: Q };
            });
          } catch {
          }
      }, l.onclose = () => {
        if (a) return;
        const m = Math.min(1e3 * 2 ** f++, 15e3);
        c = setTimeout(T, m);
      }, l.onerror = () => l == null ? void 0 : l.close();
    };
    return T(), () => {
      a = !0, c && clearTimeout(c), l == null || l.close();
    };
  }, []), _e(() => {
    if (!re) return;
    const a = (l) => {
      l.key === "Escape" && se(!1);
    };
    return window.addEventListener("keydown", a), () => window.removeEventListener("keydown", a);
  }, [re]);
  const me = 6e5, L = ye(() => {
    var l, c, f, T;
    const a = [];
    for (const n of U) {
      const m = n.step_status || {}, R = n.step_sessions || {}, F = i.find((X) => X.id === n.pipeline_id) || i.find((X) => {
        var Q;
        return X.repo === ((Q = n.source) == null ? void 0 : Q.repo);
      }), W = /* @__PURE__ */ new Set([...Object.keys(m), ...Object.keys(R)]);
      for (const X of W) {
        const Q = m[X] || "idle", A = R[X], ve = Q === "pending" || Q === "error", ne = !!(A != null && A.slot_key) && !A.chat_disabled_at && !A.superseded;
        if (!ve && !ne) continue;
        const fe = (l = n.pending_at) == null ? void 0 : l[X], Qt = ve && !!fe && Date.now() - new Date(fe).getTime() > me, Ue = (c = F == null ? void 0 : F.steps) == null ? void 0 : c.find((Fe) => Fe.id === X), er = (A == null ? void 0 : A.agent) || ((f = Ue == null ? void 0 : Ue.agent) == null ? void 0 : f.crew) || ((T = Ue == null ? void 0 : Ue.agent) == null ? void 0 : T.name) || "orchestrator", Rt = A == null ? void 0 : A.agent_id, tr = A == null ? void 0 : A.slot_key, rr = A == null ? void 0 : A.session_key, ar = Rt ? he.some((Fe) => Fe.id === Rt) : ve && he.some((Fe) => (Fe.task || "").includes(n.id) || (Fe.task || "").includes(n.title)), or = !!(A != null && A.last_response_at) && (!A.last_response_handled_at || A.last_response_handled_at < A.last_response_at);
        a.push({ cardId: n.id, card: n.title || n.id, step: X, agent: er, stale: Qt, status: Q, live: ar, responsePending: or, agentId: Rt, slotKey: tr, sessionKey: rr, sessionName: A == null ? void 0 : A.name });
      }
    }
    return a;
  }, [U, i, he]), le = ye(() => {
    var T;
    let a;
    if (g.size === 1) {
      const n = [...g][0];
      a = (T = i.find((m) => m.repo === n)) == null ? void 0 : T.steps;
    } else i.length === 1 && (a = i[0].steps);
    const l = (a && a.length ? a : wt).map((n) => ({ ...n })), c = new Set(l.map((n) => n.id)), f = [];
    return c.has("intake") || f.push({ id: "intake", name: "Intake", type: "agent", agent: { name: "orchestrator" } }), f.push(...l), c.has("done") || f.push({ id: "done", name: "Done", type: "agent" }), f;
  }, [g, i]), E = ye(() => le.map((a) => a.id), [le]), ge = te((a) => {
    var l;
    return ((l = le.find((c) => c.id === a)) == null ? void 0 : l.type) === "gate" || a.startsWith("gate-");
  }, [le]), Ke = te((a) => {
    var l, c;
    return ((c = (l = le.find((f) => f.id === a)) == null ? void 0 : l.agent) == null ? void 0 : c.name) || Gr[a] || "unknown";
  }, [le]), Ve = te((a) => {
    var T, n;
    const l = a.step_sessions || {}, c = Object.entries(l).find(
      ([, m]) => m.retained_for_gate === a.stage && m.retention !== "released"
    );
    let f = ((T = a.gate_review) == null ? void 0 : T.producer_step) || (c == null ? void 0 : c[0]);
    if (!f) {
      const m = i.find((Q) => Q.id === a.pipeline_id) || i.find((Q) => {
        var A;
        return Q.repo === ((A = a.source) == null ? void 0 : A.repo);
      }), R = (n = m == null ? void 0 : m.steps) != null && n.length ? m.steps : wt, F = [
        { id: "intake", name: "Intake", type: "agent" },
        ...R.filter((Q) => Q.id !== "intake" && Q.id !== "done"),
        { id: "done", name: "Done", type: "agent" }
      ], W = F.findIndex((Q) => Q.id === a.stage), X = W >= 0 ? F[W] : void 0;
      if (f = X == null ? void 0 : X.reviews_step, !f && W >= 0)
        for (let Q = W - 1; Q >= 0; Q--) {
          const A = F[Q];
          if (!(A.id === "intake" || A.id === "done") && A.type !== "gate" && !A.id.startsWith("gate-")) {
            f = A.id;
            break;
          }
        }
    }
    return f;
  }, [i]), Re = te((a) => {
    const l = Ve(a);
    if (!l) return;
    const c = (a.step_sessions || {})[l];
    if (!(!(c != null && c.slot_key) || c.chat_disabled_at || c.superseded))
      return {
        step: l,
        slotKey: c.slot_key,
        retained: c.retention === "held-for-gate"
      };
  }, [Ve]);
  _e(() => {
    const a = async () => {
      try {
        const f = De.slice(0, De.lastIndexOf("/")), T = (f ? f + "/" : "") + "live_spawns.json", n = await t.get("/api/file-read?path=" + encodeURIComponent(T));
        J.current = !1;
        const m = n != null && n.at ? Date.now() - new Date(n.at).getTime() < 18e4 : !0;
        Z(m && Array.isArray(n == null ? void 0 : n.runs) ? n.runs : []);
      } catch {
        J.current = !0, Z([]);
      }
    };
    let l = 0;
    oe(!0).then(a);
    const c = setInterval(() => {
      l += 1;
      const f = l % 12 === 0;
      oe(f).then(() => {
        J.current || a();
      });
    }, 1e4);
    return () => clearInterval(c);
  }, [oe, t]);
  const we = te(async () => {
    Y(!0);
    let a = [];
    try {
      const c = await P("~/.kiro/crew/config.json");
      a = qr(c == null ? void 0 : c.agents), M(a);
    } catch (c) {
      console.warn("crew roster (config.json) unreadable:", c), M([]);
    }
    const l = await Promise.all(Dr(a).map(async (c) => {
      const f = Br(c, a);
      if (!f) return $t(null, c);
      try {
        const T = await P(f);
        return $t(T, c, f);
      } catch {
        return $t(null, c, f);
      }
    }));
    h(l), Y(!1);
  }, [P]), Ct = te(() => {
    _(!0), we();
  }, [we]), Xe = te((a) => {
    we().then(() => j(a));
  }, [we]), Ye = te(async (a) => {
    await t.post("/apps/dlc-yolo/api/agents/crew", {
      mode: a.mode,
      name: a.name,
      kiro_agent: a.kiroAgent,
      workspace: a.workspace || null,
      memory_store: a.memoryStore || null
    }), await we();
  }, [t, we]), ce = te(async (a) => {
    try {
      const l = await yt(P);
      De = l.path, l.data.cards = l.data.cards || [], a(l.data);
      let c = l;
      try {
        c = await yt(P), De = c.path, c.data.cards = c.data.cards || [], a(c.data);
      } catch {
        c = l;
      }
      await t.post("/api/file-write", {
        path: c.path,
        content: JSON.stringify(c.data, null, 2)
      }), oe();
    } catch (l) {
      console.error("Failed to mutate state:", l);
    }
  }, [t, oe, P]), St = te((a) => {
    N((l) => ({ ...l, ...a })), ce((l) => {
      l.config = { ...ot, ...l.config || {}, ...a };
    });
  }, [ce]), ze = te((a, l, c, f) => {
    const T = (/* @__PURE__ */ new Date()).toISOString(), n = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    ce((m) => {
      var Q;
      const R = m.cards.find((A) => A.id === a);
      if (!R || R.stage !== l) return;
      if (f === void 0 && c.type === "interject") {
        const A = c.text.trim();
        if (!A) return;
        R.interjection = R.interjection || [], R.interjection.some((ve) => ve.id === n) || R.interjection.push({
          id: n,
          at: T,
          step: l,
          kind: c.kind,
          text: A,
          by: "user",
          status: "pending"
        }), R.updated_at = T;
        return;
      }
      if ((((Q = R.gate_review) == null ? void 0 : Q.result_revision) ?? null) !== f) return;
      const W = c.type === "reject" ? c.reason.trim() : void 0, X = c.type === "interject" ? c.text.trim() : void 0;
      c.type === "reject" && !W || c.type === "interject" && !X || (R.gate_commands = R.gate_commands || [], R.gate_commands.some((A) => A.id === n) || R.gate_commands.push({
        id: n,
        gate: l,
        action: c.type,
        expected_revision: f ?? null,
        actor: "user",
        at: T,
        status: "pending",
        ...W ? { reason: W } : {},
        ...c.type === "interject" ? { kind: c.kind, text: X } : {}
      }), R.updated_at = T);
    });
  }, [ce]), nt = te((a, l) => {
    ce((c) => {
      const f = c.cards.find((n) => n.id === a);
      if (!f) return;
      const T = (f.decisions || []).find((n) => n.id === l);
      T && (T.chosen = "acknowledged", T.status = "acknowledged", T.resolved_at = (/* @__PURE__ */ new Date()).toISOString()), f.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [ce]), At = te(async (a) => {
    var c, f, T;
    const l = (c = a.orchestrator_session) == null ? void 0 : c.slot_key;
    if (l) {
      r(`/chat?sid=${encodeURIComponent(l)}`);
      return;
    }
    try {
      const n = await t.post("/apps/dlc-yolo/api/orchestrator/trigger", { card_id: a.id });
      if (n != null && n.slot_key) {
        r(`/chat?sid=${encodeURIComponent(n.slot_key)}`);
        return;
      }
    } catch {
    }
    for (let n = 0; n < 8; n++) {
      await new Promise((m) => setTimeout(m, 2e3));
      try {
        const R = (T = (f = ((await qt(P, De)).data.cards || []).find((F) => F.id === a.id)) == null ? void 0 : f.orchestrator_session) == null ? void 0 : T.slot_key;
        if (R) {
          oe(), r(`/chat?sid=${encodeURIComponent(R)}`);
          return;
        }
      } catch {
      }
    }
    oe();
  }, [t, r, P, oe]), $e = te((a) => {
    ce((l) => {
      var T;
      const c = l.cards.find((n) => n.id === a);
      if (!c) return;
      const f = c.trust || ((T = l.config) == null ? void 0 : T.trust) || ot.trust;
      c.trust = Be[(Be.indexOf(f) + 1) % Be.length], c.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [ce]), st = te((a) => {
    ce((l) => {
      var T;
      const c = l.cards.find((n) => n.id === a);
      if (!c) return;
      const f = c.depth || ((T = l.config) == null ? void 0 : T.depth) || ot.depth;
      c.depth = Pe[(Pe.indexOf(f) + 1) % Pe.length], c.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    });
  }, [ce]), lt = te((a, l) => {
    ce((c) => {
      const f = c.cards.find((T) => T.id === a);
      f && (l ? f.budget = { ...l } : delete f.budget, f.updated_at = (/* @__PURE__ */ new Date()).toISOString());
    });
  }, [ce]), Ze = te((a) => {
    y((l) => {
      const c = new Set(l);
      return c.has(a) ? c.delete(a) : c.add(a), c;
    });
  }, []), We = te(() => y(/* @__PURE__ */ new Set()), []), it = te(async () => {
    const a = we(), l = [];
    try {
      const c = await t.get("/api/file-read?path=~/.kiro/crew/config.json"), f = (c == null ? void 0 : c.workspaces) || {};
      Object.entries(f).forEach(([T, n]) => {
        const m = typeof (n == null ? void 0 : n.repo) == "string" && /^[^/\s]+\/[^/\s]+$/.test(n.repo) ? n.repo : "";
        l.push({
          repo: m,
          workspace: T,
          label: T,
          source: "workspace",
          detail: (n == null ? void 0 : n.dir) || T,
          path: typeof (n == null ? void 0 : n.dir) == "string" ? n.dir : void 0
        });
      });
    } catch (c) {
      console.warn("workspaces registry unreadable:", c);
    }
    try {
      const c = await t.get("/api/file-read?path=~/.kiro/crew/apps/issue-radar/data/config.json");
      ((c == null ? void 0 : c.repos) || []).forEach((f) => {
        f != null && f.owner && (f != null && f.repo) && l.push({ repo: `${f.owner}/${f.repo}`, source: "issue-radar", detail: `${f.provider || "github"} · ${f.host || "github.com"}` });
      });
    } catch (c) {
      console.warn("issue-radar config unreadable (app may not be installed):", c);
    }
    B(l), await a, O(!0);
  }, [t, we]), Ge = te(async (a) => {
    const l = (/* @__PURE__ */ new Date()).toISOString(), c = "pl-" + Math.random().toString(36).slice(2, 10);
    await ce((f) => {
      f.pipelines = f.pipelines || [];
      const T = f.pipelines.find((n) => n.repo === a.repo);
      T ? (T.source = a.source, T.workspace = a.workspace, a.repo_path ? T.repo_path = a.repo_path : delete T.repo_path, T.trust = a.trust, T.depth = a.depth, a.budget ? T.budget = a.budget : delete T.budget, T.backlog_intake = a.backlog_intake, T.results_in_repo = a.results_in_repo, T.conversation_log = a.conversation_log, a.trusted_authors.length ? T.trusted_authors = a.trusted_authors : delete T.trusted_authors, T.self_enabling = a.self_enabling, T.approach = a.approach, a.sync_mode ? T.sync_mode = a.sync_mode : delete T.sync_mode, T.steps = a.steps) : f.pipelines.push({
        id: c,
        repo: a.repo,
        workspace: a.workspace,
        ...a.repo_path ? { repo_path: a.repo_path } : {},
        source: a.source,
        trust: a.trust,
        depth: a.depth,
        backlog_intake: a.backlog_intake,
        ...a.budget ? { budget: a.budget } : {},
        results_in_repo: a.results_in_repo,
        conversation_log: a.conversation_log,
        ...a.trusted_authors.length ? { trusted_authors: a.trusted_authors } : {},
        self_enabling: a.self_enabling,
        approach: a.approach,
        ...a.sync_mode && a.sync_mode !== "poll" ? { sync_mode: a.sync_mode } : {},
        sot: "github",
        steps: a.steps,
        created_at: l
      });
    }), O(!1), j(null), y(/* @__PURE__ */ new Set([a.repo]));
  }, [ce]), Je = te(async (a) => {
    await ce((l) => {
      l.pipelines = (l.pipelines || []).filter((c) => c.repo !== a), l.cards = (l.cards || []).filter((c) => {
        var f;
        return (((f = c.source) == null ? void 0 : f.repo) || "unlinked") !== a;
      });
    }), y((l) => {
      const c = new Set(l);
      return c.delete(a), c;
    });
  }, [ce]), Se = ye(() => E.reduce((a, l) => (a[l] = U.filter((c) => c.stage === l), a), {}), [U, E]), Tt = te((a) => {
    var l;
    (l = document.getElementById(`stage-col-${a}`)) == null || l.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []), dt = ye(() => {
    const a = {};
    return U.forEach((l) => {
      var f;
      const c = ((f = l.source) == null ? void 0 : f.repo) || "unlinked";
      (a[c] || (a[c] = [])).push(l);
    }), a;
  }, [U]), Qe = ye(() => {
    const a = {};
    return U.forEach((l) => {
      const c = Ke(l.stage);
      (a[c] || (a[c] = [])).push(l);
    }), a;
  }, [U, Ke]), ct = ye(() => {
    const a = Object.fromEntries(Bt.map((l) => [l, []]));
    return U.forEach((l) => {
      var n, m;
      const c = i.find((R) => R.id === l.pipeline_id) || i.find((R) => {
        var F;
        return R.repo === ((F = l.source) == null ? void 0 : F.repo);
      }), f = ((m = (n = c == null ? void 0 : c.steps) == null ? void 0 : n.find((R) => R.id === l.stage)) == null ? void 0 : m.type) === "gate" || ge(l.stage), T = L.some((R) => R.cardId === l.id && R.step === l.stage && R.live);
      a[Gt(l, { isGate: f, liveObserved: T }).kind].push(l);
    }), Object.fromEntries(Bt.filter((l) => a[l].length > 0).map((l) => [Yt[l].label, a[l]]));
  }, [U, i, ge, L]), pt = U.filter((a) => a.stage !== "done").length, ut = U.filter((a) => ge(a.stage)).length, mt = U.filter((a) => a.stage === "done").length, et = U.reduce((a, l) => {
    var c;
    return a + (((c = l.parked) == null ? void 0 : c.length) || 0);
  }, 0), vt = {
    pipeline: U.length,
    workspace: Object.keys(dt).length,
    crew: Object.keys(Qe).length,
    status: U.length,
    backlog: et
  }, Ee = L.some((a) => {
    var l, c;
    return !!a.slotKey && ((l = x[a.slotKey]) == null ? void 0 : l.active) && ((c = x[a.slotKey]) == null ? void 0 : c.phase) === "generating";
  }), Me = L.some((a) => {
    var l, c;
    return !!a.slotKey && ((l = x[a.slotKey]) == null ? void 0 : l.active) && ((c = x[a.slotKey]) == null ? void 0 : c.phase) === "thinking";
  }), qe = (a) => {
    var X, Q, A, ve;
    const l = i.find((ne) => ne.id === a.pipeline_id) || i.find((ne) => {
      var fe;
      return ne.repo === ((fe = a.source) == null ? void 0 : fe.repo);
    }), c = ((Q = (X = l == null ? void 0 : l.steps) == null ? void 0 : X.find((ne) => ne.id === a.stage)) == null ? void 0 : Q.type) === "gate" || ge(a.stage), f = c ? ((A = a.gate_review) == null ? void 0 : A.result_revision) ?? null : void 0, T = c ? Ve(a) : void 0, n = c ? Re(a) : void 0, m = L.some((ne) => ne.cardId === a.id && ne.step === a.stage && ne.live), R = Gt(a, { isGate: c, liveObserved: m }), F = (ve = l == null ? void 0 : l.steps) == null ? void 0 : ve.find((ne) => ne.id === a.stage), W = a.capability || (F == null ? void 0 : F.capability) || "auto-derived";
    return {
      card: a,
      config: b,
      isGate: c,
      cardStatus: R,
      effectiveCapability: W,
      producerStep: T,
      producerSession: n,
      onOpenProducer: n ? () => r(`/chat?sid=${encodeURIComponent(n.slotKey)}`) : void 0,
      onApprove: c ? () => ze(a.id, a.stage, { type: "approve" }, f) : void 0,
      onReject: c ? (ne) => ze(a.id, a.stage, { type: "reject", reason: ne }, f) : void 0,
      onCycleTrust: () => $e(a.id),
      onCycleDepth: () => st(a.id),
      onSetBudget: (ne) => lt(a.id, ne),
      onInterject: (ne, fe) => ze(
        a.id,
        a.stage,
        { type: "interject", kind: ne, text: fe },
        f
      ),
      onResolveDecision: (ne) => nt(a.id, ne),
      onOpenOrchestrator: () => At(a)
    };
  };
  return /* @__PURE__ */ o(He, { children: [
    /* @__PURE__ */ e(lr, { title: "DLC-YOLO", subtitle: "Autonomous SDLC pipeline with human gates" }),
    ee && /* @__PURE__ */ e(
      Lt,
      {
        profiles: K,
        crews: k,
        loading: ae,
        context: g.size === 1 ? [...g][0] : void 0,
        onRefresh: () => {
          we();
        },
        onSaveCrew: Ye,
        onClose: () => _(!1)
      }
    ),
    re && /* @__PURE__ */ e(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center p-4",
        style: { background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" },
        onMouseDown: (a) => {
          a.currentTarget === a.target && se(!1);
        },
        children: /* @__PURE__ */ o(
          "section",
          {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "agent-sessions-title",
            className: "flex flex-col rounded-xl overflow-hidden",
            style: { width: "min(680px, calc(100vw - 32px))", maxHeight: "min(76vh, 680px)", background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border-strong, var(--border))", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" },
            children: [
              /* @__PURE__ */ o("header", { className: "flex items-start gap-4 px-5 py-4", style: { borderBottom: "1px solid var(--border)" }, children: [
                /* @__PURE__ */ o("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ o("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ e("h2", { id: "agent-sessions-title", className: "text-[15px] font-semibold", style: { color: "var(--text-strong, var(--text))" }, children: "Agent sessions" }),
                    /* @__PURE__ */ e("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full", style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }, children: L.length })
                  ] }),
                  /* @__PURE__ */ e("p", { className: "text-[11px] mt-0.5", style: { color: "var(--muted)" }, children: "Live activity from enabled chats linked to pipeline cards." })
                ] }),
                /* @__PURE__ */ e(
                  "button",
                  {
                    onClick: () => se(!1),
                    "aria-label": "Close agent sessions",
                    className: "w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none",
                    style: { color: "var(--muted)", background: "var(--bg-hover, transparent)", border: "1px solid var(--border)" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ e("div", { className: "overflow-y-auto p-3 flex flex-col gap-2", children: L.length === 0 ? /* @__PURE__ */ e("div", { className: "px-3 py-8 text-center text-[12px]", style: { color: "var(--muted)" }, children: "No linked agent chats yet." }) : L.map((a) => {
                const l = a.slotKey ? x[a.slotKey] : void 0;
                return /* @__PURE__ */ o(
                  "div",
                  {
                    className: "rounded-lg px-3 py-2.5",
                    style: { background: a.responsePending ? "color-mix(in srgb, var(--accent) 9%, var(--bg, transparent))" : "var(--bg, transparent)", border: "1px solid var(--border)" },
                    children: [
                      /* @__PURE__ */ o("div", { className: "flex items-center gap-2 text-[11px] min-w-0", children: [
                        /* @__PURE__ */ e(
                          "span",
                          {
                            className: a.status === "pending" || a.responsePending ? "inline-block animate-pulse flex-shrink-0" : "inline-block flex-shrink-0",
                            style: { width: 7, height: 7, borderRadius: 999, background: a.stale ? "var(--warn)" : a.responsePending || a.status === "pending" ? "var(--accent)" : "var(--muted)" }
                          }
                        ),
                        /* @__PURE__ */ e("span", { className: "font-semibold flex-shrink-0", style: { color: "var(--accent)" }, title: a.sessionName || void 0, children: a.agent }),
                        /* @__PURE__ */ o("span", { className: "truncate", style: { color: "var(--muted)" }, children: [
                          "· ",
                          a.step
                        ] }),
                        /* @__PURE__ */ e("span", { className: "ml-auto truncate max-w-[220px]", style: { color: "var(--text, var(--muted))" }, title: a.card, children: a.card }),
                        /* @__PURE__ */ e("span", { className: "flex-shrink-0", style: { color: a.responsePending ? "var(--warn)" : a.status === "pending" ? "var(--ok)" : "var(--muted)" }, children: a.responsePending ? "response" : a.status }),
                        a.stale && /* @__PURE__ */ e("span", { style: { color: "var(--warn)" }, title: "stale — will be reclaimed", children: "↻" })
                      ] }),
                      (l == null ? void 0 : l.active) && l.phase === "thinking" && /* @__PURE__ */ o("div", { className: "mt-2 ml-4 flex items-center gap-2 text-[11px] font-medium", style: { color: "var(--accent)" }, title: "Real thinking state from this linked dashboard slot", children: [
                        /* @__PURE__ */ e(Ht, { size: 13 }),
                        /* @__PURE__ */ e("span", { children: "Thinking" })
                      ] }),
                      (l == null ? void 0 : l.active) && l.phase === "generating" && l.tail && /* @__PURE__ */ o("div", { className: "mt-2 ml-4 flex items-center gap-2 min-w-0", style: { color: "var(--ok)" }, title: "Real text projected from this linked slot's live chat_chunk stream", children: [
                        /* @__PURE__ */ e("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", style: { background: "var(--ok)" } }),
                        /* @__PURE__ */ o("span", { className: "font-mono text-[11px] truncate", children: [
                          "Generating · …",
                          l.tail
                        ] })
                      ] }),
                      a.slotKey && /* @__PURE__ */ o(
                        "button",
                        {
                          className: "mt-2 ml-4 font-mono",
                          style: { color: "var(--muted)", fontSize: 10, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
                          title: `Copy openable slot ${a.slotKey} (${a.sessionName || a.sessionKey}); open it from Chats`,
                          onClick: () => {
                            var c;
                            try {
                              (c = navigator.clipboard) == null || c.writeText(a.slotKey || "");
                            } catch {
                            }
                          },
                          children: [
                            "copy ",
                            a.slotKey.slice(0, 18)
                          ]
                        }
                      )
                    ]
                  },
                  `${a.card}:${a.step}`
                );
              }) }),
              /* @__PURE__ */ e("footer", { className: "px-5 py-3 text-[10px]", style: { color: "var(--muted)", borderTop: "1px solid var(--border)" }, children: "Thinking and text tails come directly from live dashboard events. Terminal turns stay linked until chat is explicitly disabled." })
            ]
          }
        )
      }
    ),
    V && /* @__PURE__ */ e(
      Pt,
      {
        candidates: C,
        existingRepos: new Set(i.map((a) => a.repo)),
        defaults: b,
        agentProfiles: K,
        crews: k,
        onCreate: Ge,
        onSaveCrew: Ye,
        onClose: () => O(!1)
      }
    ),
    I && /* @__PURE__ */ e(
      Pt,
      {
        candidates: C,
        existingRepos: new Set(i.map((a) => a.repo)),
        defaults: b,
        agentProfiles: K,
        crews: k,
        editPipeline: i.find((a) => a.repo === I) || // demo repos have cards but no pipelines[] entry — synthesize a default to edit
        { id: "pl-" + I, repo: I, source: "manual", trust: b.trust, depth: b.depth, backlog_intake: !0, sot: "github", steps: wt.map((a) => ({ ...a })), created_at: (/* @__PURE__ */ new Date()).toISOString() },
        cardCount: s.filter((a) => {
          var l;
          return (((l = a.source) == null ? void 0 : l.repo) || "unlinked") === I;
        }).length,
        isExample: Jt.has(I),
        onCreate: Ge,
        onSaveCrew: Ye,
        onDelete: Je,
        onClose: () => j(null)
      }
    ),
    /* @__PURE__ */ o("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ e(Ur, { steps: le, cardsByStage: Se, onNodeClick: Tt }),
      /* @__PURE__ */ o("div", { className: "grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] mb-3", children: [
        /* @__PURE__ */ e(gt, { label: "Active", value: String(pt), accent: !0 }),
        /* @__PURE__ */ e(gt, { label: "Gated", value: String(ut) }),
        /* @__PURE__ */ e(gt, { label: "Done", value: String(mt) }),
        /* @__PURE__ */ e(gt, { label: "Parked", value: String(et) })
      ] }),
      /* @__PURE__ */ e(
        Er,
        {
          repos: be.map((a) => a.name),
          selectedRepos: [...g],
          onNewPipeline: () => {
            it();
          },
          onConfigure: Xe,
          onOpenAgents: Ct
        }
      ),
      /* @__PURE__ */ o("div", { className: "flex gap-4 items-start", children: [
        /* @__PURE__ */ e(
          Vr,
          {
            repos: be,
            selected: g,
            onToggle: Ze,
            onClear: We,
            onAddWorkspace: it,
            onEdit: Xe
          }
        ),
        /* @__PURE__ */ o("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ o("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [
            /* @__PURE__ */ e(Fr, { active: v, onChange: $, counts: vt }),
            /* @__PURE__ */ o(
              "button",
              {
                onClick: () => se(!0),
                "aria-haspopup": "dialog",
                "aria-expanded": re,
                className: "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md cursor-pointer",
                title: "Open enabled agent sessions and see live activity",
                style: { background: "var(--bg-elevated, var(--bg))", border: "1px solid var(--border)", color: Ee || Me || L.some((a) => a.status === "pending" || a.responsePending) ? "var(--accent)" : "var(--muted)" },
                children: [
                  Me ? /* @__PURE__ */ e(Ht, { size: 11 }) : /* @__PURE__ */ e(
                    "span",
                    {
                      className: Ee || L.some((a) => a.status === "pending" || a.responsePending) ? "inline-block animate-pulse" : "inline-block",
                      style: { width: 7, height: 7, borderRadius: 999, background: Ee ? "var(--ok)" : L.some((a) => a.responsePending) ? "var(--warn)" : L.some((a) => a.status === "pending") ? "var(--accent)" : "var(--muted)", opacity: L.length ? 1 : 0.5 }
                    }
                  ),
                  /* @__PURE__ */ e("span", { className: "font-semibold", children: L.length ? `${L.length} session${L.length === 1 ? "" : "s"}` : "no sessions" }),
                  Me && /* @__PURE__ */ e("span", { children: "· thinking" }),
                  Ee && /* @__PURE__ */ e("span", { style: { color: "var(--ok)" }, children: "· generating" }),
                  !Me && !Ee && L.filter((a) => a.status === "pending").length > 0 && /* @__PURE__ */ o("span", { children: [
                    "· ",
                    L.filter((a) => a.status === "pending").length,
                    " running"
                  ] }),
                  L.some((a) => a.responsePending) && /* @__PURE__ */ e("span", { style: { color: "var(--warn)" }, children: "· response" }),
                  L.some((a) => a.stale) && /* @__PURE__ */ o("span", { style: { color: "var(--warn)" }, children: [
                    "· ",
                    L.filter((a) => a.stale).length,
                    " stale ↻"
                  ] })
                ]
              }
            ),
            g.size > 0 && /* @__PURE__ */ o(
              "span",
              {
                className: "text-[11px] px-2 py-1 rounded-md font-medium",
                style: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" },
                children: [
                  g.size === 1 ? [...g][0] : `${g.size} workspaces`,
                  " · ",
                  /* @__PURE__ */ e("button", { onClick: We, className: "underline hover:opacity-80", children: "clear" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ e(Hr, { config: b, onSet: St }),
          p ? /* @__PURE__ */ e("div", { className: "text-sm p-3", style: { color: "var(--muted)" }, children: "Loading pipeline…" }) : v === "backlog" ? /* @__PURE__ */ e(Kr, { cards: U }) : /* @__PURE__ */ o("div", { ref: D, className: "flex gap-3 overflow-x-auto pb-4", children: [
            v === "pipeline" && le.map((a) => /* @__PURE__ */ e(ft, { id: `stage-col-${a.id}`, title: a.name, count: (Se[a.id] || []).length, children: (Se[a.id] || []).map((l) => /* @__PURE__ */ e(xt, { ...qe(l) }, l.id)) }, a.id)),
            v === "workspace" && Object.entries(dt).map(([a, l]) => /* @__PURE__ */ e(ft, { title: a, count: l.length, children: l.map((c) => /* @__PURE__ */ e(xt, { ...qe(c) }, c.id)) }, a)),
            v === "crew" && Object.entries(Qe).map(([a, l]) => /* @__PURE__ */ e(ft, { title: a, count: l.length, children: l.map((c) => /* @__PURE__ */ e(xt, { ...qe(c) }, c.id)) }, a)),
            v === "status" && Object.entries(ct).map(([a, l]) => /* @__PURE__ */ e(ft, { title: a, count: l.length, children: l.map((c) => /* @__PURE__ */ e(xt, { ...qe(c) }, c.id)) }, a))
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  ta as default
};
