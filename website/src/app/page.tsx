import Image from "next/image";
import Link from "next/link";
import {
  Monitor,
  Lock,
  TrendingDown,
  AppWindow,
  Download,
  ArrowRight,
  Github,
  Terminal,
  Settings,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Monitor,
    title: "Multi-Agent View",
    description:
      "Monitor Claude Code, Codex CLI, and Gemini CLI from a single unified dashboard.",
  },
  {
    icon: Lock,
    title: "Local & Private",
    description:
      "No auth, no cloud, no tracking. Your data stays on your machine.",
  },
  {
    icon: TrendingDown,
    title: "Cost Insights",
    description:
      "AI-powered suggestions to optimize spending. Track high-cost sessions and model efficiency.",
  },
  {
    icon: AppWindow,
    title: "Desktop App",
    description:
      "Electron tray-resident app for Mac and Windows with background OTLP ingestion.",
  },
];

const steps = [
  {
    icon: Download,
    number: "01",
    title: "Download the installer",
    description: "Download the installer for your platform — Mac or Windows.",
  },
  {
    icon: AppWindow,
    number: "02",
    title: "Launch Argus",
    description: "Launch Argus — it starts as a tray app in the background.",
  },
  {
    icon: Settings,
    number: "03",
    title: "Configure your AI agent",
    description:
      "Configure your AI agent to send telemetry with a few environment variables.",
  },
  {
    icon: BarChart3,
    number: "04",
    title: "Monitor everything",
    description:
      "Monitor costs, tokens, sessions, and more from the local dashboard.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden bg-white dark:bg-surface-950">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-500/5" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
            Open source · Local only · No auth required
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-6xl lg:text-7xl">
            Monitor your{" "}
            <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              AI coding agents
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-surface-700 dark:text-surface-300 sm:text-xl">
            Track costs, tokens, and sessions across Claude Code, Codex CLI,
            and Gemini CLI — all in one local dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/docs/installation"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-700"
            >
              <Download size={18} />
              Download
            </Link>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-6 py-3 text-base font-semibold text-surface-900 transition-colors hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com/79841/argus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-6 py-3 text-base font-semibold text-surface-700 transition-colors hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
            >
              <Github size={18} />
              GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-surface-200 bg-surface-50 py-20 dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-4xl">
              Everything you need to track AI agent usage
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              Built for developers who use AI coding assistants daily and want
              full visibility.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
                    <Icon size={20} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="mb-2 font-semibold text-surface-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-surface-600 dark:text-surface-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-4xl">
              See it in action
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              A unified view of all your AI agent activity — locally, in real
              time.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-surface-200 bg-surface-100 shadow-2xl dark:border-surface-700 dark:bg-surface-800">
            <div className="flex items-center gap-2 border-b border-surface-200 px-4 py-3 dark:border-surface-700">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-2 flex-1 rounded-md border border-surface-200 bg-white px-3 py-1 text-xs text-surface-500 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-400">
                localhost:9845
              </div>
            </div>
            <div className="relative">
              <Image
                src="/screenshots/overview.png"
                alt="Argus dashboard overview"
                width={1200}
                height={675}
                className="w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-surface-200 bg-surface-50 py-20 dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              Four simple steps to full observability over your AI agent usage.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600">
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="mt-2 text-2xl font-bold text-surface-200 dark:text-surface-700">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mb-2 font-semibold text-surface-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-sm text-surface-600 dark:text-surface-400">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-12 overflow-hidden rounded-2xl border border-surface-200 bg-surface-900 p-6 dark:border-surface-700">
            <div className="mb-3 flex items-center gap-2">
              <Terminal size={14} className="text-surface-400" />
              <span className="text-xs text-surface-400">
                Configure Claude Code telemetry
              </span>
            </div>
            <pre className="overflow-x-auto text-sm">
              <code>
                <span className="text-surface-500"># Add to your shell profile (~/.zshrc or ~/.bashrc){"\n"}</span>
                <span className="text-green-400">export </span>
                <span className="text-blue-300">CLAUDE_CODE_ENABLE_TELEMETRY</span>
                <span className="text-white">=1{"\n"}</span>
                <span className="text-green-400">export </span>
                <span className="text-blue-300">OTEL_LOGS_EXPORTER</span>
                <span className="text-white">=otlp{"\n"}</span>
                <span className="text-green-400">export </span>
                <span className="text-blue-300">OTEL_EXPORTER_OTLP_PROTOCOL</span>
                <span className="text-white">=http/json{"\n"}</span>
                <span className="text-green-400">export </span>
                <span className="text-blue-300">OTEL_EXPORTER_OTLP_ENDPOINT</span>
                <span className="text-white">=http://localhost:9845</span>
              </code>
            </pre>
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/docs/installation"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-700"
            >
              <Download size={18} />
              Download Argus
            </Link>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 text-base font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Read the docs
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
