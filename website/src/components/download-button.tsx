"use client";

import { useState, useEffect, useRef } from "react";
import { Download, ChevronDown, Apple, Monitor } from "lucide-react";

type Platform = "mac" | "windows" | "linux";

const REPO = "79841/argus";

const platforms: Record<
  Platform,
  { label: string; icon: typeof Apple; filePattern: string; suffix: string }
> = {
  mac: {
    label: "macOS",
    icon: Apple,
    filePattern: ".dmg",
    suffix: "Apple Silicon",
  },
  windows: {
    label: "Windows",
    icon: Monitor,
    filePattern: ".exe",
    suffix: "x64",
  },
  linux: {
    label: "Linux",
    icon: Monitor,
    filePattern: ".AppImage",
    suffix: "x64",
  },
};

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "mac";
};

const getDownloadUrl = (platform: Platform) =>
  `https://github.com/${REPO}/releases/latest/download/Argus${
    platform === "mac"
      ? ".dmg"
      : platform === "windows"
        ? ".exe"
        : ".AppImage"
  }`;

export const DownloadButton = () => {
  const [detected, setDetected] = useState<Platform>("mac");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDetected(detectPlatform());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = platforms[detected];
  const Icon = current.icon;

  return (
    <div ref={ref} className="relative inline-flex">
      <a
        href={getDownloadUrl(detected)}
        className="inline-flex items-center gap-2 rounded-l-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <Download size={18} />
        <span>
          Download for {current.label}
        </span>
      </a>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center rounded-r-xl border-l border-primary-500 bg-primary-600 px-3 py-3 text-white transition-colors hover:bg-primary-700"
        aria-label="Select platform"
      >
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800">
          {(Object.entries(platforms) as [Platform, (typeof platforms)[Platform]][]).map(
            ([key, p]) => {
              const PIcon = p.icon;
              return (
                <a
                  key={key}
                  href={getDownloadUrl(key)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-surface-700 transition-colors hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700"
                >
                  <PIcon size={16} />
                  <span>
                    {p.label}{" "}
                    <span className="text-surface-400">({p.suffix})</span>
                  </span>
                </a>
              );
            }
          )}
        </div>
      )}
    </div>
  );
};
