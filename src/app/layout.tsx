import type { Metadata, Viewport } from 'next'; // Import Viewport type
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider

export const metadata: Metadata = {
  title: 'NexusLearn AI',
  description: 'AI-Powered School Learning System by Firebase Studio',
  manifest: '/manifest.json', // Link to the manifest file
  // Add other relevant metadata here if needed
  // icons: {
  //   icon: '/favicon.ico', // Standard favicon
  //   apple: '/icons/icon-192x192.png', // Apple touch icon
  // },
};

// Add viewport settings for PWA theme color
export const viewport: Viewport = {
  themeColor: '#ffffff', // Match the theme_color in manifest.json
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
       {/*
         Removed the direct meta tag for theme-color as it's now handled
         by the viewport export above, which is the recommended Next.js approach.
         The <link rel="manifest"> is also handled by the metadata export.
       */}
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <AuthProvider> {/* Wrap children with AuthProvider */}
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
