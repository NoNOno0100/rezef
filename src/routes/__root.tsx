import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "רצף RETZEF";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: "סטודיו קולנוע בינה מלאכותית. תסריט, פריימים, סרטים וקריינות — כל שוט ממשיך מהפריים האחרון.",
      },
      { name: "theme-color", content: "#09090b" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;600;700&family=Heebo:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="he" dir="rtl" suppressHydrationWarning className="antialiased">
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
          <Toaster
            theme="dark"
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#18181b",
                color: "#f3efe6",
                border: "1px solid #2a2926",
                fontFamily: "Heebo, sans-serif",
              },
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
