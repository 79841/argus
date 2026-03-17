import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-900">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Getting Started</h3>
            <ul className="space-y-2 text-sm text-surface-700 dark:text-surface-300">
              <li>
                <Link href="/docs/installation" className="hover:text-primary-600">
                  Installation
                </Link>
              </li>
              <li>
                <Link href="/docs/setup-guide" className="hover:text-primary-600">
                  Agent Setup
                </Link>
              </li>
              <li>
                <Link href="/docs/user-guide" className="hover:text-primary-600">
                  User Guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Reference</h3>
            <ul className="space-y-2 text-sm text-surface-700 dark:text-surface-300">
              <li>
                <Link href="/docs/api-reference" className="hover:text-primary-600">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/docs/architecture" className="hover:text-primary-600">
                  Architecture
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Community</h3>
            <ul className="space-y-2 text-sm text-surface-700 dark:text-surface-300">
              <li>
                <a
                  href="https://github.com/79841/argus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-600"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/79841/argus/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-600"
                >
                  Issues
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-surface-200 pt-8 text-center text-sm text-surface-700 dark:border-surface-800 dark:text-surface-400">
          Built with Next.js. Open source under MIT License.
        </div>
      </div>
    </footer>
  );
}
