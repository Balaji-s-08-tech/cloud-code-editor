"use client";

import { useEffect } from "react";

export function PWAUpdateHandler() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let isRefreshing = false;

    const handleControllerChange = () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
