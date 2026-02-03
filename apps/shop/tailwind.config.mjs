/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        shop: {
          bg: 'var(--background)',
          fg: 'var(--foreground)',
          card: 'var(--card-bg)',
          border: 'var(--border)',
          muted: 'var(--muted)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          badge: 'var(--badge-bg)',
          'badge-fg': 'var(--badge-fg)',
          placeholder: 'var(--placeholder-bg)',
          'placeholder-fg': 'var(--placeholder-fg)',
        },
      },
    },
  },
  plugins: [],
};
