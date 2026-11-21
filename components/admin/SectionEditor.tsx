"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Info } from "lucide-react";
import { deleteSection, discardSectionDraft, publishSection, saveSectionDraft, setSectionStatus } from "@/lib/cms/actions";
import { sectionTypeMap, settingsFields } from "@/lib/cms/section-types";
import { Badge, Btn, Card, Confirm, PageHeader, useAction, useUnsavedWarning } from "./ui";
import { FieldsForm } from "./FieldsForm";

type Values = Record<string, unknown>;
type Props = {
  page: { id: string; title: string; path: string };
  section: { id: string; type: string; label: string; status: string; visible: boolean; content: Values; settings: Values; publishedContent: Values; publishedSettings: Values; hasDraft: boolean };
};

const COLLECTION_LINKS: Record<string, string> = {
  "Timeline & milestones": "/admin/timeline",
  Publications: "/admin/publications",
  "Awards & recognition": "/admin/awards",
  Principles: "/admin/principles",
  Projects: "/admin/projects",
  "People (founder & team)": "/admin/founder",
  "Technology → approach steps": "/admin/technology?kind=approach_step",
  "Technology → capabilities": "/admin/technology?kind=capability",
  "Technology → productive uses": "/admin/technology?kind=productive_use",
  "Technology → microgrid components": "/admin/technology?kind=microgrid_component",
};

export function SectionEditor({ page, section }: Props) {
  const def = sectionTypeMap[section.type];
  const router = useRouter();
  const { run, pending } = useAction();
  const [content, setContent] = useState<Values>(section.content);
  const [settings, setSettings] = useState<Values>(section.settings);
  const [label, setLabel] = useState(section.label);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState({ content: section.content, settings: section.settings, label: section.label });
  const dirty = useMemo(() => JSON.stringify([content, settings, label]) !== JSON.stringify([saved.content, saved.settings, saved.label]), [content, settings, label, saved]);
  useUnsavedWarning(dirty);
  const visibleSettings = def.themeable ? settingsFields : settingsFields.filter((f) => f.name !== "background");

  const save = (publish: boolean) =>
    run(
      async () => {
        const r = await saveSectionDraft(section.id, content, settings, label);
        if (!r.ok || !publish) return r;
        return publishSection(section.id);
      },
      {
        onOk: () => (setErrors({}), setSaved({ content, settings, label })),
        onError: (r) => setErrors(r.fieldErrors ?? {}),
      },
    );

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/admin/pages/${page.id}`} className="inline-flex items-center gap-1 hover:text-ws-ink">
            <ArrowLeft className="h-3 w-3" /> {page.title}
          </Link>
        }
        title={label || def.label}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{def.label}</span>
            <Badge status={section.status} />
            {section.hasDraft && <Badge status="draft changes">unpublished edits</Badge>}
            {!section.visible && <Badge status="hidden" />}
            {dirty && <span className="text-[12px] font-medium text-amber-ink">Unsaved changes</span>}
          </span>
        }
        actions={
          <>
            <a href={`/api/preview?path=${encodeURIComponent(page.path)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-ws-line bg-white px-3.5 text-[13px] font-medium hover:border-ws-ink/40" title="Save a draft first to see your latest edits">
              <Eye className="h-4 w-4" /> Preview
            </a>
            <Btn onClick={() => save(false)} loading={pending}>
              Save draft
            </Btn>
            <Btn variant="amber" onClick={() => save(true)} loading={pending}>
              Save & publish
            </Btn>
          </>
        }
      />

      {Object.keys(errors).length > 0 && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-800">Some fields need attention. They are highlighted below.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
        <Card title="Content">
          <div className="p-5 sm:p-6">
            <p className="mb-6 text-[13px] leading-relaxed text-ws-ink/60">{def.description}</p>
            {def.uses && (
              <p className="mb-6 flex items-start gap-2 rounded-lg bg-forest/[0.06] px-4 py-3 text-[13px] text-forest">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  The items in this section come from{" "}
                  {COLLECTION_LINKS[def.uses] ? (
                    <Link href={COLLECTION_LINKS[def.uses]} className="font-medium underline">
                      {def.uses}
                    </Link>
                  ) : (
                    def.uses
                  )}
                  . Edit them there; edit the headings here.
                </span>
              </p>
            )}
            <FieldsForm fields={def.fields} values={content} onChange={setContent} errors={errors} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Section settings">
            <div className="space-y-5 p-5">
              <label className="block text-[13px] font-medium">
                Admin label
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={def.label} className="mt-1.5 w-full rounded-lg border border-ws-line px-3 py-2 text-[14px] outline-none focus:border-ws-ink/50" />
                <span className="mt-1 block text-[12px] font-normal text-ws-ink/55">Only shown in the admin, to tell sections apart.</span>
              </label>
              <FieldsForm fields={visibleSettings} values={settings} onChange={setSettings} errors={errors} />
            </div>
          </Card>
          <Card title="Publishing">
            <div className="space-y-2 p-5">
              <p className="pb-2 text-[12px] leading-relaxed text-ws-ink/60">“Save draft” keeps edits private; visitors keep seeing the published version until you publish.</p>
              {section.hasDraft && (
                <Confirm
                  title="Discard unpublished edits?"
                  body="The section goes back to its published version."
                  confirmLabel="Discard"
                  onConfirm={() =>
                    run(() => discardSectionDraft(section.id), {
                      onOk: () => {
                        setContent(section.publishedContent);
                        setSettings(section.publishedSettings);
                        setSaved({ content: section.publishedContent, settings: section.publishedSettings, label });
                      },
                    })
                  }
                  trigger={(open) => (
                    <Btn className="w-full" onClick={open}>
                      Discard draft
                    </Btn>
                  )}
                />
              )}
              {section.status === "published" ? (
                <Btn className="w-full" onClick={() => run(() => setSectionStatus(section.id, "draft"))} loading={pending}>
                  Unpublish section
                </Btn>
              ) : (
                <Btn className="w-full" onClick={() => run(() => publishSection(section.id))} loading={pending}>
                  Publish as saved
                </Btn>
              )}
              <Confirm
                title="Delete this section?"
                body="It will be removed from the page permanently."
                onConfirm={() => run(() => deleteSection(section.id), { onOk: () => router.push(`/admin/pages/${page.id}`) })}
                trigger={(open) => (
                  <Btn variant="danger" className="w-full" onClick={open}>
                    Delete section
                  </Btn>
                )}
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
