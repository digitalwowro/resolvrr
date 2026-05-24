"use client";

import { useEffect } from "react";

export function ClearConnectionMessageQuery() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const changed =
      url.searchParams.has("success") || url.searchParams.has("error");

    url.searchParams.delete("success");
    url.searchParams.delete("error");

    if (!changed) {
      return;
    }

    const nextSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, []);

  return null;
}
