"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { deleteCollectionItem, duplicateCollectionItem, saveCollectionItem, setCollectionStatus } from "@/lib/cms/actions";
import { collections, type CollectionKey } from "@/lib/cms/collections";
import type { Field } from "@/lib/cms/fields";
import { Badge, Btn, Card, Confirm, PageHeader, useAction, useUnsavedWarning } from "./ui";
import { FieldsForm } from "./FieldsForm";

type Values = Record<string, unknown>;
export type Relations = {
  gallery: Values[];
  milestones: { id: string; label: string }[];
  publications: { id: string; label: string }[];
  selectedMilestones: string[];
  selectedPublications: string[];
};

const galleryField: Field = { name: "__gallery", label: "Gallery", kind: "list", itemLabel: "Photo", titleField: "caption", max: 40, fields: [{ name: "image", label: "Image", kind: "image", required: true }, { name: "caption", label: "Caption", kind: "text", max: 300 }] };

const viewPath: Partial<Record<CollectionKey, (v: Values) => string>> = {
  timeline: () => "/journey",
  publications: () => "/impact",
  awards: () => "/impact#awards",
  projects: (v) => `/projects/${v.slug}`,
  principles: () => "/about#principles",
  people: () => "/about#founder",
  technology: () => "/technology",
};

export function CollectionEditor({ collectionKey, id, initial, status: initialStatus, relations }: { collectionKey: CollectionKey; id: string | null; initial: Values; status: string; relations?: Relations }) {
  const def = collections[collectionKey];
  const router = useRouter();
  const { run, pending } = useAction();
  const [values, setValues] = useState<Values>(initial);
  const [rel, setRel] = useState(relations);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(JSON.stringify([initial, relations]));
  const status = initialStatus;
  const dirty = useMemo(() => JSON.stringify([values, rel]) !== saved, [values, rel, saved]);
  useUnsavedWarning(dirty);
  const title = String(values[def.titleField] || "") || (id ? "Untitled" : `New ${def.singular.toLowerCase()}`);

  const payload = () => (rel ? { ...values, __gallery: rel.gallery, __milestones: rel.selectedMilestones, __publications: rel.selectedPublications } : values);

  const save = (nextStatus?: string) =>
    run(() => saveCollectionItem(collectionKey, id, payload(), nextStatus), {
      onOk: (r) => {
        setErrors({});
        setSaved(JSON.stringify([values, rel]));
        if (!id && r.id) router.replace(`/admin/${collectionKey}/${r.id}`);
      },
      onError: (r) => setErrors(r.fieldErrors ?? {}),
    });

  const path = viewPath[collectionKey]?.(values);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/admin/${collectionKey}${def.filter && values[def.filter.field] ? `?${def.filter.field}=${values[def.filter.field]}` : ""}`} className="inline-flex items-center gap-1 hover:text-ws-ink">
            <ArrowLeft className="h-3 w-3" /> {def.label}
          </Link>
        }
        title={title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {def.hasStatus && id && <Badge status={status} />}
            {!id && <span>Not saved yet</span>}
            {dirty && <span className="text-[12px] font-medium text-amber-ink">Unsaved changes</span>}
          </span>
        }
        actions={
          <>
            {id && path && status === "published" && (
              <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-ws-line bg-white px-3.5 text-[13px] font-medium hover:border-ws-ink/40">
                <ExternalLink className="h-4 w-4" /> View
              </a>
            )}
            {def.hasStatus ? (
              <>
                <Btn onClick={() => save(status === "published" && id ? undefined : "draft")} loading={pending}>
                  {status === "published" && id ? "Save changes" : "Save draft"}
                </Btn>
                {(status !== "published" || !id) && (
                  <Btn variant="amber" onClick={() => save("published")} loading={pending}>
                    Save & publish
                  </Btn>
                )}
              </>
            ) : (
              <Btn variant="amber" onClick={() => save()} loading={pending}>
                Save
              </Btn>
            )}
          </>
        }
      />
      {def.hasStatus && status === "published" && id && <p className="-mt-4 mb-6 text-[12px] text-ws-ink/55">This item is live. Saving updates the website immediately; to work privately, unpublish it first.</p>}
      {Object.keys(errors).length > 0 && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-800">Some fields need attention. They are highlighted below.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
        <div className="space-y-6">
          <Card title="Details">
            <div className="p-5 sm:p-6">
              <FieldsForm fields={def.fields} values={values} onChange={setValues} errors={errors} />
            </div>
          </Card>
          {rel && (
            <>
              <Card title="Gallery">
                <div className="p-5 sm:p-6">
                  <FieldsForm fields={[galleryField]} values={{ __gallery: rel.gallery }} onChange={(v) => setRel({ ...rel, gallery: v.__gallery as Values[] })} errors={errors} />
                </div>
              </Card>
              <Card title="Related milestones & publications">
                <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
                  <Picklist label="Milestones" options={rel.milestones} selected={rel.selectedMilestones} onChange={(s) => setRel({ ...rel, selectedMilestones: s })} />
                  <Picklist label="Publications" options={rel.publications} selected={rel.selectedPublications} onChange={(s) => setRel({ ...rel, selectedPublications: s })} />
                </div>
              </Card>
            </>
          )}
        </div>
        {id && (
          <Card title="Manage">
            <div className="space-y-2 p-5">
              {def.hasStatus && status === "published" && (
                <Btn className="w-full" onClick={() => run(() => setCollectionStatus(collectionKey, id, "draft"))} loading={pending}>
                  Unpublish
                </Btn>
              )}
              {def.hasStatus && status !== "archived" && (
                <Btn className="w-full" onClick={() => run(() => setCollectionStatus(collectionKey, id, "archived"))} loading={pending}>
                  Archive
                </Btn>
              )}
              <Btn className="w-full" onClick={() => run(() => duplicateCollectionItem(collectionKey, id), { onOk: (r) => r.id && router.push(`/admin/${collectionKey}/${r.id}`) })} loading={pending}>
                Duplicate
              </Btn>
              <Confirm
                title={`Delete this ${def.singular.toLowerCase()}?`}
                body="This cannot be undone."
                onConfirm={() => run(() => deleteCollectionItem(collectionKey, id), { onOk: () => router.push(`/admin/${collectionKey}`) })}
                trigger={(open) => (
                  <Btn variant="danger" className="w-full" onClick={open}>
                    Delete
                  </Btn>
                )}
              />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function Picklist({ label, options, selected, onChange }: { label: string; options: { id: string; label: string }[]; selected: string[]; onChange: (s: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium">{label}</legend>
      <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-ws-line p-2">
        {options.length === 0 && <p className="p-2 text-[12px] text-ws-ink/50">None yet.</p>}
        {options.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-ws">
            <input type="checkbox" className="mt-0.5 accent-[#344b3b]" checked={selected.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id))} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
