import { Outfit } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata = {
  title: "My Overtime",
  description: "My Overtime Tracker",
  manifest: "/manifest.json?v=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "My Overtime",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/hadi-icon.png" />
      </head>
      <body className={outfit.className}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
