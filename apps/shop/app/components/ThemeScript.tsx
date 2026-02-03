export default function ThemeScript() {
  const script = `
    (function() {
      const key = 'shop-theme';
      const stored = localStorage.getItem(key);
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      const theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
