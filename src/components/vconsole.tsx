"use client";

import { useEffect } from "react";

export default function VConsole() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("vconsole").then((v) => {
        new v.default();
      });
    }
  }, []);

  return null;
}
