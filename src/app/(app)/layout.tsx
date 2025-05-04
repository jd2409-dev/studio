
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { Home, BookOpen, HelpCircle, Settings, User, Upload, LogOut, Activity, BarChart, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { auth, ensureFirebaseInitialized } from '@/lib/firebase/config'; // Import Firebase auth instance and helper
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth(); // Get user and loading state

  useEffect(() => {
    // Redirect to login if not loading and no user is authenticated
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
       ensureFirebaseInitialized(); // Ensure Firebase is initialized before using auth
      await signOut(auth!); // Use non-null assertion as we check initialization
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
      router.push('/login'); // Redirect to login page after successful logout
    } catch (error) {
      console.error("Logout Error:", error);
      toast({
        title: "Logout Failed",
        description: "An error occurred during logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Placeholder handler for unimplemented features
  const handlePlaceholderClick = (featureName: string) => {
    toast({
      title: "Feature Coming Soon",
      description: `${featureName} functionality is not yet implemented.`,
      variant: "default"
    });
  };

   // Show loading spinner while auth state is being determined
   if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
     )
  }

  // If user is null after loading, it means they should be redirected,
  // but we render null briefly to avoid flashing the layout.
  if (!user) {
      return null;
  }


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
              <SidebarMenuButton asChild isActive={pathname === '/'}>
                  <Link href="/">
                    <Home />
                    Dashboard
                  </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <SidebarMenuButton asChild isActive={pathname === '/textbook-summary'}>
                  <Link href="/textbook-summary">
                    <BookOpen />
                    Textbook Summary
                  </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <SidebarMenuButton asChild isActive={pathname === '/quiz'}>
                 <Link href="/quiz">
                    <HelpCircle />
                    Quiz Generation
                 </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <SidebarMenuButton asChild isActive={pathname === '/upload-textbook'}>
                  <Link href="/upload-textbook">
                    <Upload />
                    Upload Textbook
                  </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>
             {/* Placeholder Menu Items */}
            <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handlePlaceholderClick('Study Planner')}>
                   <BarChart />
                   Study Planner
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handlePlaceholderClick('Performance Analytics')}>
                  <Activity />
                   Performance
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handlePlaceholderClick('AI Tutor')}>
                   <BrainCircuit />
                   AI Tutor
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
               <SidebarMenuButton asChild isActive={pathname === '/settings'}>
                  <Link href="/settings">
                    <Settings />
                    Settings
                  </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <SidebarMenuButton asChild isActive={pathname === '/profile'}>
                 <Link href="/profile">
                    <User />
                    Profile
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
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
