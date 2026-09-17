# Installation

> Purpose: the full turnkey install, upgrade/reinstall steps, and host caveats. Procedural only.
> **← [back to README](../README.md)**

```bash
# 1. Install the app (the built UI bundle ui/dist/index.mjs ships in the repo, so no
#    build is required for a plain install; rebuild only if you change the UI — see below).
kirocrew app install /path/to/kiro-crew-yolo-dlc
kirocrew app enable dlc-yolo

# 2. Deploy both zero-token cron scripts plus their webhook and projection helpers, reconcile DLC-YOLO's
#    two cron jobs (including the deterministic advance-job ID used by terminal producers),
#    and publish /dlc-yolo into Kiro's documented global slash-skill directory.
#    The script is idempotent, never overwrites a user-owned skill path or foreign
#    symlink, and never touches another app's jobs. Use --check to preview drift.
python3 scripts/setup-crons.py

# 3. Open a FRESH Kiro session (skill resources are loaded when the session is
#    created). Native Kiro surfaces can then discover /dlc-yolo from the global path.
```

> **Dashboard host limitation (KiroCrew 0.5.0).** The dashboard `/` picker is currently
> populated by KiroCrew's static `/api/slash-commands` catalogue, not the Kiro skill catalogue.
> Publishing the skill is necessary for native execution but cannot add an app command to that
> host-owned list. Fixing the dashboard picker requires a KiroCrew core change; this app does not
> patch live `site-packages` or overwrite the host command registry.

> **Upgrading an existing install.** Two things do not refresh automatically and need a
> nudge after you pull new code and sync the app files:
>
> 1. **Runtime + slash discovery.** KiroCrew reads manifest crons on first install; on
>    an existing install, `app enable` does **not** reliably re-scan them. KiroCrew also
>    registers app skills below `~/.kiro/crew/skills`, while Kiro's fresh-session slash
>    picker scans `~/.kiro/skills`. After syncing, re-run the idempotent reconciler: it
>    deploys both cron scripts plus the webhook and projection helpers, upserts DLC-YOLO's two jobs, and
>    publishes only the `/dlc-yolo` command link, leaving other apps' jobs and user-owned
>    skills untouched:
>
>    ```bash
>    python3 scripts/setup-crons.py            # deploy + reconcile + publish
>    python3 scripts/setup-crons.py --check     # preview drift only, change nothing
>    ```
>
>    Verify with `kirocrew cron list`: advance and spawns are `script` (zero-token) jobs. No
>    DLC-YOLO cron is agent-backed. Open a fresh native Kiro session for skill discovery.
>    KiroCrew 0.5.0's dashboard `/` picker remains host-static as noted above; changing that list
>    requires a core host fix rather than an app reinstall.
>
>    > **Note:** syncing app files includes `app.json` (the manifest the gateway re-seeds crons
>    > from). The full deploy is impl + UI bundle + `app.json` — a stale deployed manifest can
>    > re-seed a retired cron.
>    >
>    > **Note:** `kirocrew app uninstall dlc-yolo` removes the app's registered crons
>    > (app *data* remains by default). After reinstalling, run
>    > `python3 scripts/setup-crons.py` to restore the jobs and slash publication.
>
> 2. **New agents.** A new agent added to the manifest (e.g. `intent-agent` for
>    self-enabling pipelines) is registered by re-enabling the app:
>    `kirocrew app enable dlc-yolo`. Confirm with `kirocrew app info dlc-yolo` (agent count).
