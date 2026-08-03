"use client";

import dynamic from "next/dynamic";

type MarkdownEditorProps = {
  value?: string;
  height?: string;
  onChange?: (value?: string) => void;
};

type MarkdownPreviewProps = {
  source?: string;
  height?: string;
};

// @uiw/react-markdown-editor depends on browser APIs, so it must be loaded
// dynamically with SSR disabled inside the App Router.
const MarkdownEditor = dynamic(
  () => import("@uiw/react-markdown-editor").then((mod) => mod.default),
  {
    ssr: false,
  },
);

// Reuse the editor package's Markdown renderer so edit and preview rendering
// stay visually consistent.
const MarkdownPreview = dynamic(
  () => import("@uiw/react-markdown-editor").then((mod) => mod.default.Markdown),
  {
    ssr: false,
  },
);

// MarkdownEditorField wraps the third-party editor with the project's light
// theme container and a small, form-friendly API.
export function MarkdownEditorField({
  value = "",
  height = "320px",
  onChange,
}: MarkdownEditorProps) {
  return (
    <div className="markdown-editor-wrap" data-color-mode="light">
      <MarkdownEditor
        value={value}
        height={height}
        onChange={(nextValue) => onChange?.(nextValue)}
      />
    </div>
  );
}

// MarkdownPreviewBox is used by both C-end detail pages and admin preview panes.
export function MarkdownPreviewBox({
  source = "",
  height,
}: MarkdownPreviewProps) {
  return (
    <div className="markdown-preview-wrap" data-color-mode="light" style={{ height }}>
      <MarkdownPreview source={source || "暂无 Markdown 内容"} />
    </div>
  );
}
