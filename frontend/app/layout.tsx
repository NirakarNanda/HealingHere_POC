import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "./sw-register";

export const metadata: Metadata = {
  title: {
    default: "Bijayalakshmi Physiotherapy",
    template: "%s · Bijayalakshmi Physiotherapy",
  },
  description:
    "Bijayalakshmi Physiotherapy — restoring movement, rebuilding confidence. Care by Dr. Abhilash Nanda.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bijaya Physio",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#11161d" },
  ],
};

/**
 * Inline anti-flash script: reads the persisted theme before first paint so
 * the page never flashes the wrong theme on load.
 */
const antiFlashScript = `
(function(){try{
var t=localStorage.getItem('bp-theme')||localStorage.getItem('theme');
if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
if(t==='dark'){document.documentElement.classList.add('dark');}
document.documentElement.style.colorScheme=t;
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster position="top-center" gap={8} toastOptions={{ duration: 3200 }} />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
