"use client";

import { useMemo, useState } from "react";
import { saveSettings } from "@/lib/cms/actions";
import { settingsFormFields } from "@/lib/cms/settings-fields";
import { Btn, Card, PageHeader, useAction, useUnsavedWarning } from "./ui";
import { FieldsForm } from "./FieldsForm";

const groups: { title: string; names: string[] }[] = [
  { title: "Identity", names: ["site_name", "tagline", "description"] },
  { title: "Contact & social", names: ["contact_email", "contact_phone", "contact_location", "social_links"] },
  { title: "Header", names: ["nav_cta_label", "nav_cta_href", "nav_secondary_label", "nav_secondary_href"] },
  { title: "Footer", names: ["footer_statement", "footer_copyright", "footer_regions"] },
  { title: "Search engines", names: ["default_seo_title", "default_seo_description"] },
];

export function SettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useAction();
  const dirty = useMemo(() => JSON.stringify(values) !== saved, [values, saved]);
  useUnsavedWarning(dirty);
  return (
    <>
      <PageHeader
        title="Site settings"
        description="Company details, contact information, social links, footer and search-engine defaults. Changes go live when saved."
        actions={
          <Btn variant="amber" loading={pending} onClick={() => run(() => saveSettings(values), { onOk: () => (setSaved(JSON.stringify(values)), setErrors({})), onError: (r) => setErrors(r.fieldErrors ?? {}) })}>
            Save settings
          </Btn>
        }
      />
      {dirty && <p className="-mt-4 mb-6 text-[12px] font-medium text-amber-ink">Unsaved changes</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.title} title={g.title}>
            <div className="p-5">
              <FieldsForm fields={settingsFormFields.filter((f) => g.names.includes(f.name))} values={values} onChange={setValues} errors={errors} />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
