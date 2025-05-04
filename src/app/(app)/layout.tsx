
'use client';

import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { Home, BookOpen, HelpCircle, Settings, User, Upload, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Import useRouter

export default function AppLayout({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter(); // Initialize useRouter

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
     });
   };


  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
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
              <SidebarMenuButton asChild isActive={false}> {/* Update isActive logic based on current route */}
                <Link href="/">
                  <Home />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/textbook-summary">
                  <BookOpen />
                  Textbook Summary
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/quiz">
                  <HelpCircle />
                  Quiz Generation
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
              <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/upload-textbook">
                  <Upload />
                  Upload Textbook
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <Settings />
                  Settings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/profile">
                  <User />
                  Profile
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
               {/* Log Out Button */}
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
