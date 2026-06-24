import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/crm/RegisterSW";

export const metadata: Metadata = {
  title: "GNG CRM",
  description: "Golf 'n Go Chicago — Lead & Client Management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GNG CRM",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a3a2a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#f2f4f7' }}>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
