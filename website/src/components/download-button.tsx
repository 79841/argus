"use client";

import { useState, useEffect, useRef } from "react";
import { Download, ChevronDown } from "lucide-react";

type Platform = "mac" | "windows";

const RELEASES_URL = "https://github.com/79841/argus/releases/latest";
const API_URL = "https://api.github.com/repos/79841/argus/releases/latest";

const AppleLogo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const WindowsLogo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 12V6.5l8-1.1V12H3zm0 .5h8v6.6l-8-1.1V12.5zM11.5 5.3l9.5-1.3v8.5h-9.5V5.3zM21 12.5v8.5l-9.5-1.3v-7.2H21z" />
  </svg>
);

const platformIcons = { mac: AppleLogo, windows: WindowsLogo };

const platforms: Record<
  Platform,
  { label: string; extension: string; suffix: string }
> = {
  mac: { label: "macOS", extension: ".dmg", suffix: "Apple Silicon" },
  windows: { label: "Windows", extension: ".exe", suffix: "x64" },
};

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  return "mac";
};

export const DownloadButton = () => {
  const [detected] = useState<Platform>(detectPlatform);
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Record<Platform, string>>({
    mac: RELEASES_URL,
    windows: RELEASES_URL,
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        if (!data.assets) return;
        const urls: Record<string, string> = {};
        for (const asset of data.assets) {
          const name: string = asset.name;
          if (name.endsWith(".dmg")) urls.mac = asset.browser_download_url;
          if (name.endsWith(".exe")) urls.windows = asset.browser_download_url;
        }
        setAssets((prev) => ({ ...prev, ...urls }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const current = platforms[detected];
  const Icon = platformIcons[detected];

  return (
    <div ref={ref} className="relative inline-flex">
      <a
        href={assets[detected]}
        className="inline-flex items-center gap-2 rounded-l-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <Download size={18} />
        <span>Download for {current.label}</span>
      </a>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center rounded-r-xl border-l border-primary-500 bg-primary-600 px-3 py-3 text-white transition-colors hover:bg-primary-700"
        aria-label="Select platform"
      >
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800">
          {(
            Object.entries(platforms) as [
              Platform,
              (typeof platforms)[Platform],
            ][]
          ).map(([key, p]) => {
            const PIcon = platformIcons[key];
            return (
              <a
                key={key}
                href={assets[key]}
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
          })}
        </div>
      )}
    </div>
  );
};

export const DownloadCards = () => {
  const [assets, setAssets] = useState<Record<Platform, string>>({
    mac: RELEASES_URL,
    windows: RELEASES_URL,
  });
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        if (!data.assets) return;
        if (data.tag_name) setVersion(data.tag_name);
        const urls: Record<string, string> = {};
        for (const asset of data.assets) {
          const name: string = asset.name;
          if (name.endsWith(".dmg")) urls.mac = asset.browser_download_url;
          if (name.endsWith(".exe")) urls.windows = asset.browser_download_url;
        }
        setAssets((prev) => ({ ...prev, ...urls }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="my-6 grid gap-4 sm:grid-cols-2">
      {(
        Object.entries(platforms) as [Platform, (typeof platforms)[Platform]][]
      ).map(([key, p]) => {
        const Icon = platformIcons[key];
        return (
          <a
            key={key}
            href={assets[key]}
            className="flex items-center gap-4 rounded-xl border border-surface-200 bg-white p-5 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
              <Icon size={24} />
            </div>
            <div>
              <div className="font-semibold text-surface-900 dark:text-white">
                {p.label}{" "}
                <span className="text-sm font-normal text-surface-400">
                  ({p.suffix})
                </span>
              </div>
              <div className="text-sm text-surface-500">
                {p.extension.slice(1).toUpperCase()} {version && `· ${version}`}
              </div>
            </div>
            <Download size={18} className="ml-auto text-surface-400" />
          </a>
        );
      })}
    </div>
  );
};
