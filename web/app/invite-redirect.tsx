"use client";

import { useEffect } from "react";

export default function InviteRedirect() {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search.slice(1));
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (["invite", "recovery"].includes(query.get("type") ?? "") ||
        ["invite", "recovery"].includes(fragment.get("type") ?? "")) {
      window.location.replace(`/staff/accept${window.location.search}${window.location.hash}`);
    }
  }, []);
  return null;
}
