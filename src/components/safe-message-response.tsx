"use client";

import { MessageResponse, type MessageResponseProps } from "@/components/ai-elements/message";

const SAFE_LINK_PREFIXES = ["http://", "https://", "mailto:"];

export function SafeMessageResponse(props: MessageResponseProps) {
  return (
    <MessageResponse
      disallowedElements={["img"]}
      urlTransform={(url, key) => {
        if (key !== "href") return null;
        return SAFE_LINK_PREFIXES.some((prefix) => url.toLowerCase().startsWith(prefix)) ? url : null;
      }}
      {...props}
    />
  );
}
