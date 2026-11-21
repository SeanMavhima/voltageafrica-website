"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Pilcrow, Quote, Redo2, Undo2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rich text with headings, paragraphs, bold, italics, links, lists and quotes. Output is sanitized server-side. */
export function RichTextEditor({ value, onChange, id }: { value: string; onChange: (html: string) => void; id?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["https", "http", "mailto"], HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        id: id ?? "",
        class:
          "min-h-[10rem] px-4 py-3 text-[14px] leading-relaxed text-ws-ink outline-none [&_a]:text-forest [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-amber [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:mt-3 [&_h2]:font-serif [&_h2]:text-2xl [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:list-disc",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Keep in sync when the value is replaced externally (e.g. discard draft)
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(editor.isEmpty && !value)) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            p: e.isActive("paragraph"),
            ul: e.isActive("bulletList"),
            ol: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });

  if (!editor) return <div className="h-48 rounded-lg border border-ws-line bg-white" />;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (https://… or /page)", prev ?? "https://");
    if (url === null) return;
    if (url === "") return editor.chain().focus().unsetLink().run();
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) return window.alert("Use a full https:// address, a mailto: link or a site path like /about.");
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const B = ({ on, label, active, children }: { on: () => void; label: string; active?: boolean; children: React.ReactNode }) => (
    <button type="button" onClick={on} aria-label={label} title={label} aria-pressed={active} className={cn("flex h-8 w-8 items-center justify-center rounded-md text-ws-ink/70 hover:bg-ws-ink/[0.06]", active && "bg-ws-ink text-white hover:bg-ws-ink")}>
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-ws-line bg-white focus-within:border-ws-ink/50">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ws-line bg-ws/60 px-1.5 py-1" role="toolbar" aria-label="Formatting">
        <B on={() => editor.chain().focus().setParagraph().run()} label="Paragraph" active={state?.p}>
          <Pilcrow className="h-4 w-4" />
        </B>
        <B on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading" active={state?.h2}>
          <Heading2 className="h-4 w-4" />
        </B>
        <B on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Subheading" active={state?.h3}>
          <Heading3 className="h-4 w-4" />
        </B>
        <span className="mx-1 h-5 w-px bg-ws-line" />
        <B on={() => editor.chain().focus().toggleBold().run()} label="Bold" active={state?.bold}>
          <Bold className="h-4 w-4" />
        </B>
        <B on={() => editor.chain().focus().toggleItalic().run()} label="Italic" active={state?.italic}>
          <Italic className="h-4 w-4" />
        </B>
        <B on={setLink} label="Link" active={state?.link}>
          <Link2 className="h-4 w-4" />
        </B>
        {state?.link && (
          <B on={() => editor.chain().focus().unsetLink().run()} label="Remove link">
            <Unlink className="h-4 w-4" />
          </B>
        )}
        <span className="mx-1 h-5 w-px bg-ws-line" />
        <B on={() => editor.chain().focus().toggleBulletList().run()} label="Bulleted list" active={state?.ul}>
          <List className="h-4 w-4" />
        </B>
        <B on={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list" active={state?.ol}>
          <ListOrdered className="h-4 w-4" />
        </B>
        <B on={() => editor.chain().focus().toggleBlockquote().run()} label="Quote" active={state?.quote}>
          <Quote className="h-4 w-4" />
        </B>
        <span className="ml-auto" />
        <B on={() => editor.chain().focus().undo().run()} label="Undo">
          <Undo2 className="h-4 w-4" />
        </B>
        <B on={() => editor.chain().focus().redo().run()} label="Redo">
          <Redo2 className="h-4 w-4" />
        </B>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
