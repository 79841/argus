import { vi } from 'vitest'

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
}

export const setupNextMocks = () => {
  vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }))

  vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => {
      return { type: 'a', props: { href, children } }
    },
  }))

  vi.mock('next/image', () => ({
    default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
      return { type: 'img', props: { src, alt, ...props } }
    },
  }))
}
