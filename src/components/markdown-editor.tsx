import React from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import "prismjs/themes/prism.css";

export default function MarkdownEditor({
  value,
  onValueChange,
  textareaId,
  textareaClassName,
}: {
  value: string;
  onValueChange: (code: string) => void;
  textareaId?: string;
  textareaClassName?: string;
}) {
  return (
    <Editor
      value={value}
      onValueChange={onValueChange}
      highlight={(code) => Prism.highlight(code, Prism.languages.markdown, "markdown")}
      padding={16}
      style={{
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 14,
        lineHeight: "1.5",
        minHeight: "620px",
      }}
      textareaId={textareaId}
      textareaClassName={textareaClassName}
    />
  );
}
