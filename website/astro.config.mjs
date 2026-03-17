// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://79841.github.io',
	base: '/argus',
	integrations: [
		starlight({
			title: 'Argus',
			description: 'Unified monitoring dashboard for AI coding agents',
			logo: {
				light: './src/assets/logo-light.svg',
				dark: './src/assets/logo-dark.svg',
				replacesTitle: false,
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/79841/argus' }],
			defaultLocale: 'root',
			locales: {
				root: { label: 'English', lang: 'en' },
				ko: { label: '한국어', lang: 'ko' },
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started' },
						{ label: 'Installation', slug: 'installation' },
						{ label: 'Agent Setup', slug: 'setup-guide' },
					],
				},
				{
					label: 'Dashboard',
					items: [
						{ label: 'User Guide', slug: 'user-guide' },
						{ label: 'Pages Overview', slug: 'pages' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'API Reference', slug: 'api-reference' },
						{ label: 'Architecture', slug: 'architecture' },
					],
				},
			],
			customCss: ['./src/styles/custom.css'],
			head: [
				{
					tag: 'meta',
					attrs: { property: 'og:image', content: '/argus/screenshots/overview.png' },
				},
			],
		}),
	],
});
