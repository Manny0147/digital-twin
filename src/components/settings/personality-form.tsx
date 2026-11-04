"use client";

import { useState, useTransition } from "react";
import { savePersonalityAction } from "@/app/actions/personality";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PersonalityProfile } from "@prisma/client";

type Traits = {
  formality?: number;
  warmth?: number;
  directness?: number;
  humor?: number;
  openness?: number;
};

export function PersonalityForm({
  initial,
}: {
  initial: PersonalityProfile | null;
}) {
  const [pending, start] = useTransition();
  const [tone, setTone] = useState(initial?.preferredTone ?? "");
  const [style, setStyle] = useState(initial?.speakingStyle ?? "");
  const [values, setValues] = useState((initial?.values ?? []).join(", "));
  const [avoid, setAvoid] = useState((initial?.avoidTopics ?? []).join(", "));
  const traits = (initial?.traits ?? {}) as Traits;
  const [formality, setFormality] = useState(traits.formality ?? 0.5);
  const [warmth, setWarmth] = useState(traits.warmth ?? 0.5);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await savePersonalityAction({
          preferredTone: tone || null,
          speakingStyle: style || null,
          values: values.split(",").map((s) => s.trim()).filter(Boolean),
          avoidTopics: avoid.split(",").map((s) => s.trim()).filter(Boolean),
          traits: { formality, warmth },
        });
        toast.success("Personality saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h3 className="font-medium">Personality</h3>
      <label className="block text-sm">
        Preferred tone
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background p-2"
          placeholder="calm, direct, warm"
        />
      </label>
      <label className="block text-sm">
        Speaking style
        <textarea
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-border bg-background p-2"
        />
      </label>
      <label className="block text-sm">
        Values (comma separated)
        <input
          value={values}
          onChange={(e) => setValues(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background p-2"
        />
      </label>
      <label className="block text-sm">
        Avoid topics
        <input
          value={avoid}
          onChange={(e) => setAvoid(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background p-2"
        />
      </label>
      <label className="block text-sm">
        Formality {formality.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={formality}
          onChange={(e) => setFormality(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <label className="block text-sm">
        Warmth {warmth.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={warmth}
          onChange={(e) => setWarmth(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save personality"}
      </Button>
    </form>
  );
}
