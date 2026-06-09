import { ExternalLink, MapPin, Globe, Calendar } from "lucide-react";

import type { Exhibition, LocalizedText } from "@/lib/types";
import { PRIORITY_LABEL, TAG_LABELS, ZONE_LABELS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { SaveButton } from "@/components/save-button";
import { Bi, BiInline } from "@/components/bi";

const SECTION_LABELS = {
  about: { zh: "簡介", en: "About" },
  whyGo: { zh: "為何值得去", en: "Why Go" },
  whatToLookFor: { zh: "看點", en: "What To Look For" },
} satisfies Record<string, LocalizedText>;

const ACTION_LABELS = {
  map: { zh: "地圖", en: "Map" },
  website: { zh: "官網", en: "Website" },
  event: { zh: "活動頁", en: "3daysofdesign" },
} satisfies Record<string, LocalizedText>;

function PriorityBadge({ priority }: { priority: Exhibition["priority"] }) {
  const variant =
    priority === "must-go"
      ? "solid"
      : priority === "worth-it"
        ? "default"
        : "outline";
  return (
    <Badge variant={variant} className="shrink-0">
      <BiInline text={PRIORITY_LABEL[priority]} />
    </Badge>
  );
}

export function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  const e = exhibition;
  return (
    <Card className="overflow-hidden animate-fade-in">
      {/* Image strip: one lead image + two supporting. */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-px bg-line">
          <ImagePlaceholder
            seed={0}
            label={`${e.name} image 1`}
            className="col-span-2 aspect-[4/3]"
          />
          <div className="grid grid-rows-2 gap-px">
            <ImagePlaceholder seed={1} label={`${e.name} image 2`} />
            <ImagePlaceholder seed={2} label={`${e.name} image 3`} />
          </div>
        </div>
        <SaveButton id={e.id} name={e.name} className="absolute right-3 top-3" />
      </div>

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl leading-tight tracking-tight">
              {e.name}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/60">
              <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} />
              <BiInline text={ZONE_LABELS[e.zone]} />
            </p>
          </div>
          <PriorityBadge priority={e.priority} />
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {e.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              <BiInline text={TAG_LABELS[tag] ?? { zh: tag, en: tag }} />
            </Badge>
          ))}
        </div>

        {/* Editorial sections */}
        <div className="mt-5 space-y-4">
          <Section label={SECTION_LABELS.about} body={e.about} />
          <Section label={SECTION_LABELS.whyGo} body={e.whyGo} />
          <Section label={SECTION_LABELS.whatToLookFor} body={e.whatToLookFor} />
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button asChild variant="outline" size="sm">
            <a href={e.mapUrl} target="_blank" rel="noopener noreferrer">
              <MapPin /> <BiInline text={ACTION_LABELS.map} />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={e.websiteUrl} target="_blank" rel="noopener noreferrer">
              <Globe /> <BiInline text={ACTION_LABELS.website} />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={e.eventUrl} target="_blank" rel="noopener noreferrer">
              <Calendar /> <BiInline text={ACTION_LABELS.event} />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ label, body }: { label: LocalizedText; body: LocalizedText }) {
  return (
    <div>
      <h3 className="text-[0.7rem] font-semibold uppercase tracking-widest text-ink/50">
        {label.zh} · {label.en}
      </h3>
      <p className="mt-1 text-[0.95rem] leading-relaxed text-ink/85" lang="zh-Hant">
        {body.zh}
      </p>
      <p className="mt-1 text-[0.85rem] leading-relaxed text-ink/55" lang="en">
        {body.en}
      </p>
    </div>
  );
}

/** Compact variant used by the Planner and Map pages. */
export function ExhibitionRow({ exhibition }: { exhibition: Exhibition }) {
  const e = exhibition;
  return (
    <Card className="flex items-center gap-3 overflow-hidden p-3">
      <ImagePlaceholder
        seed={e.id.length}
        label={`${e.name} thumbnail`}
        className="size-16 shrink-0 rounded-md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-serif text-lg leading-tight">
            {e.name}
          </h3>
          <PriorityBadge priority={e.priority} />
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/60">
          <MapPin className="size-3 shrink-0" strokeWidth={1.75} />
          <BiInline text={ZONE_LABELS[e.zone]} />
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {e.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[0.65rem]">
              <BiInline text={TAG_LABELS[tag] ?? { zh: tag, en: tag }} />
            </Badge>
          ))}
        </div>
      </div>
      <a
        href={e.mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open map for ${e.name}`}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-line/40 hover:text-ink"
      >
        <ExternalLink className="size-4" strokeWidth={1.75} />
      </a>
    </Card>
  );
}
