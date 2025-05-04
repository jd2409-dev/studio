

'use client';

import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { Home, BookOpen, HelpCircle, Settings, User, Upload, LogOut, Activity, FileText, BarChart, Target, Clock, AlertTriangle, BrainCircuit, AudioLines, Text } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Import useRouter
import { usePathname } from 'next/navigation'; // Import usePathname

export default function AppLayout({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter(); // Initialize useRouter
  const pathname = usePathname(); // Get current path

  const handleLogout = () => {
    // Simulate logout logic
    console.log("User logging out...");
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully (simulation).",
    });
    // Redirect to a login page (assuming one exists at '/login')
    // In a real app, you'd clear auth tokens/session here.
    router.push('/login'); // Redirect to login page
  };

   // Placeholder handler for unimplemented features
   const handlePlaceholderClick = (featureName: string) => {
     toast({
       title: "Feature Coming Soon",
       description: `${featureName} functionality is not yet implemented.`,
       variant: "default"
     });
   };


  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
             {/* Using inline SVG for the logo as requested */}
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
               <path d="M12 2L2 7l10 5 10-5-10-5z"/>
               <path d="M2 17l10 5 10-5"/>
               <path d="M2 12l10 5 10-5"/>
             </svg>
            <span className="font-semibold text-lg">NexusLearn AI</span>
          </Link>
          <SidebarTrigger className="hidden md:flex" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
               <Link href="/" passHref legacyBehavior>
                 <SidebarMenuButton asChild isActive={pathname === '/'}>
                   <a>
                     <Home />
                     Dashboard
                   </a>
                 </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <Link href="/textbook-summary" passHref legacyBehavior>
                 <SidebarMenuButton asChild isActive={pathname === '/textbook-summary'}>
                   <a>
                     <BookOpen />
                     Textbook Summary
                   </a>
                 </SidebarMenuButton>
               </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <Link href="/quiz" passHref legacyBehavior>
                <SidebarMenuButton asChild isActive={pathname === '/quiz'}>
                  <a>
                    <HelpCircle />
                    Quiz Generation
                  </a>
                </SidebarMenuButton>
               </Link>
            </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/upload-textbook" passHref legacyBehavior>
                 <SidebarMenuButton asChild isActive={pathname === '/upload-textbook'}>
                   <a>
                    <Upload />
                    Upload Textbook
                   </a>
                 </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
               <Link href="/settings" passHref legacyBehavior>
                <SidebarMenuButton asChild isActive={pathname === '/settings'}>
                   <a>
                    <Settings />
                    Settings
                   </a>
                </SidebarMenuButton>
               </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <Link href="/profile" passHref legacyBehavior>
                 <SidebarMenuButton asChild isActive={pathname === '/profile'}>
                   <a>
                    <User />
                    Profile
                   </a>
                 </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
               {/* Log Out Button - Does not use Link or asChild */}
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                Log Out
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b md:hidden">
           <Link href="/" className="flex items-center gap-2">
              {/* Using inline SVG for the logo as requested */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
             <span className="font-semibold text-lg">NexusLearn AI</span>
           </Link>
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
