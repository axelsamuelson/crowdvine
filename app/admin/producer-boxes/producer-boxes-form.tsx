"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProducerBoxesCatalog } from "@/lib/producer-boxes/actions";
import type { ProducerBoxDefinition } from "@/lib/producer-boxes/config";

interface ProducerBoxesFormProps {
  boxes: ProducerBoxDefinition[];
  source: "site_content" | "default";
}

export function ProducerBoxesForm({ boxes, source }: ProducerBoxesFormProps) {
  const [draft, setDraft] = useState(boxes);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function updateBox(
    id: ProducerBoxDefinition["id"],
    patch: Partial<ProducerBoxDefinition> | ((box: ProducerBoxDefinition) => ProducerBoxDefinition),
  ) {
    setSaved(false);
    setDraft((current) =>
      current.map((box) => {
        if (box.id !== id) return box;
        return typeof patch === "function" ? patch(box) : { ...box, ...patch };
      }),
    );
  }

  function onSave() {
    setError("");
    startTransition(async () => {
      const result = await saveProducerBoxesCatalog(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-medium text-stone-900">Producentlådor</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Sidan är opublicerad. Flaggan published sitter i koden och styr
          sitemap och index. Här ändrar du vilka viner som ingår och
          platshållartexten, utan deploy. Sofia (GC) ska läsa texten innan
          sidan publiceras.
        </p>
        <p className="mt-2 text-sm text-stone-500">
          {source === "site_content"
            ? "Visar den sparade versionen i site_content."
            : "Ingen sparad version ännu. Formuläret visar standardvärdena från koden."}
        </p>
        <p className="mt-3 text-sm">
          <a className="underline" href="/vin/naturvin-lada">
            Förhandsvisning på svenska
          </a>
          {" · "}
          <a className="underline" href="/wine/natural-wine-box">
            Preview in English
          </a>
        </p>
      </div>

      {draft.map((box) => (
        <fieldset
          key={box.id}
          className="flex flex-col gap-3 rounded-xl border border-stone-200 p-4"
        >
          <legend className="px-1 text-sm font-medium text-stone-900">
            {box.id}
          </legend>
          <Label htmlFor={`${box.id}-producer`}>Producentnamn</Label>
          <Input
            id={`${box.id}-producer`}
            value={box.producerName}
            onChange={(event) =>
              updateBox(box.id, { producerName: event.target.value })
            }
          />
          <Label htmlFor={`${box.id}-name-sv`}>Namn, svenska</Label>
          <Input
            id={`${box.id}-name-sv`}
            value={box.name.sv}
            onChange={(event) =>
              updateBox(box.id, (current) => ({
                ...current,
                name: { ...current.name, sv: event.target.value },
              }))
            }
          />
          <Label htmlFor={`${box.id}-name-en`}>Name, English</Label>
          <Input
            id={`${box.id}-name-en`}
            value={box.name.en}
            onChange={(event) =>
              updateBox(box.id, (current) => ({
                ...current,
                name: { ...current.name, en: event.target.value },
              }))
            }
          />
          <Label htmlFor={`${box.id}-story-sv`}>Berättelse, svenska</Label>
          <Textarea
            id={`${box.id}-story-sv`}
            rows={3}
            value={box.story.sv}
            onChange={(event) =>
              updateBox(box.id, (current) => ({
                ...current,
                story: { ...current.story, sv: event.target.value },
              }))
            }
          />
          <Label htmlFor={`${box.id}-story-en`}>Story, English</Label>
          <Textarea
            id={`${box.id}-story-en`}
            rows={3}
            value={box.story.en}
            onChange={(event) =>
              updateBox(box.id, (current) => ({
                ...current,
                story: { ...current.story, en: event.target.value },
              }))
            }
          />
          <Label htmlFor={`${box.id}-wines`}>Sex viner, ett namn per rad</Label>
          <Textarea
            id={`${box.id}-wines`}
            rows={7}
            value={box.wineNames.join("\n")}
            onChange={(event) =>
              updateBox(box.id, {
                wineNames: event.target.value.split("\n"),
              })
            }
          />
        </fieldset>
      ))}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-stone-700">Sparat.</p> : null}
      <Button type="button" onClick={onSave} disabled={pending}>
        {pending ? "Sparar" : "Spara lådor"}
      </Button>
    </div>
  );
}
