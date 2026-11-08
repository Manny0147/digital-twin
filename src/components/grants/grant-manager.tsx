"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createGrantAction,
  issueShareLinkAction,
  revokeGrantAction,
} from "@/app/actions/grants";

export type GrantView = {
  id: string;
  granteeType: string;
  granteeLabel: string | null;
  scopes: string[];
  purpose: string;
  expiresAt: string | null;
  revokedAt: string | null;
  maxUses: number | null;
  useCount: number;
  hasShareLink: boolean;
};

const SCOPES = [
  "READ_MEMORIES",
  "READ_PROFILE",
  "CHAT",
  "ACT_ON_BEHALF",
  "EXPORT",
  "SUGGEST_MEMORIES",
  "MANAGE_GRANTS",
] as const;

const GRANTEE_TYPES = ["APP", "PERSON", "AGENT", "PUBLIC", "API_KEY"] as const;

export function GrantManager({ grants }: { grants: GrantView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [granteeType, setGranteeType] = useState<string>("PUBLIC");
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scopes, setScopes] = useState<string[]>(["CHAT"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await createGrantAction({
          granteeType,
          granteeLabel: label.trim() || null,
          scopes,
          purpose,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          maxUses: maxUses ? Number(maxUses) : null,
        });
        setPurpose("");
        setLabel("");
        setExpiresAt("");
        setMaxUses("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create grant");
      }
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onCreate} className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h2 className="font-medium">New consent grant</h2>
        <label className="block text-sm">
          Who receives access
          <select
            value={granteeType}
            onChange={(e) => setGranteeType(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background p-2"
          >
            {GRANTEE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Portfolio site, family member…"
            className="mt-1 w-full rounded-md border border-border bg-background p-2"
          />
        </label>
        <label className="block text-sm">
          Purpose
          <textarea
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-background p-2"
          />
        </label>
        <fieldset className="space-y-1">
          <legend className="text-sm">Scopes</legend>
          {SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
              />
              {scope}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Expires
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background p-2"
            />
          </label>
          <label className="block text-sm">
            Max uses
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background p-2"
            />
          </label>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending || scopes.length === 0 || !purpose.trim()}>
          {pending ? "Saving…" : "Create grant"}
        </Button>
      </form>

      {sharePath && (
        <div className="rounded-lg border border-border bg-card p-4" role="status">
          <p className="text-sm font-medium">Share link</p>
          <p className="mt-1 text-xs text-muted">
            This replaces any previous link for the grant. It is shown once.
          </p>
          <input
            readOnly
            value={sharePath}
            className="mt-2 w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
            aria-label="Share link"
          />
        </div>
      )}

      <ul className="space-y-3">
        {grants.length === 0 && <li className="text-sm text-muted">No grants yet.</li>}
        {grants.map((grant) => (
          <li key={grant.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{grant.granteeLabel || grant.granteeType}</p>
              <span className="text-xs text-muted">
                {grant.revokedAt ? "Revoked" : "Active"}
                {grant.hasShareLink ? " · link issued" : ""}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{grant.purpose}</p>
            <p className="mt-2 text-xs text-muted">
              {grant.scopes.join(", ")}
              {grant.maxUses !== null ? ` · ${grant.useCount}/${grant.maxUses} uses` : ""}
              {grant.expiresAt ? ` · expires ${new Date(grant.expiresAt).toLocaleString()}` : ""}
            </p>
            {!grant.revokedAt && (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    start(async () => {
                      try {
                        const issued = await issueShareLinkAction(grant.id);
                        setSharePath(`${window.location.origin}${issued.path}`);
                        router.refresh();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Could not issue link");
                      }
                    });
                  }}
                >
                  Issue link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    start(async () => {
                      try {
                        await revokeGrantAction(grant.id);
                        router.refresh();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Could not revoke grant");
                      }
                    });
                  }}
                >
                  Revoke
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
