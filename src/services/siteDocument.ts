export function buildSiteDocument(bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src https: data: blob:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; script-src 'unsafe-inline' https://cdn.tailwindcss.com; connect-src 'none'; media-src https: data: blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none';"
      >
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          theme: {
            extend: {
              fontFamily: {
                sans: ['Manrope', 'system-ui', 'sans-serif'],
                display: ['Space Grotesk', 'Manrope', 'system-ui', 'sans-serif'],
                editorial: ['Cormorant Garamond', 'Georgia', 'serif'],
                accent: ['Sora', 'Manrope', 'system-ui', 'sans-serif'],
                mono: ['IBM Plex Mono', 'monospace'],
              },
              boxShadow: {
                glow: '0 20px 80px rgba(15, 23, 42, 0.18)',
              },
            }
          }
        }
      </script>
      <style>
        :root {
          color-scheme: light;
        }

        html { scroll-behavior: smooth; }

        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          font-family: 'Manrope', system-ui, sans-serif;
          background: #ffffff;
        }
      </style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `;
}
