
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { Home, BookOpen, HelpCircle, Settings, User, Upload, LogOut, Activity, BrainCircuit, CalendarDays, ListChecks, MessageSquareQuote, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { auth, ensureFirebaseInitialized, firebaseInitializationError } from '@/lib/firebase/config'; // Import Firebase auth instance and helper
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, authError } = useAuth(); // Get user, loading state, and authError

  useEffect(() => {
    // Redirect to login if auth check is complete, no user, and no auth error (auth error handled by AuthProvider)
    if (!authLoading && !user && !authError) {
      console.log("AppLayout: Auth complete, no user, no critical error. Redirecting to /login.");
      router.push('/login');
    }
  }, [user, authLoading, authError, router]);

  const handleLogout = async () => {
    try {
      ensureFirebaseInitialized(); // Ensure Firebase is initialized before using auth
      if (!auth) throw new Error("Firebase auth is not initialized for logout.");
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
      router.push('/login'); // Redirect to login page after successful logout
    } catch (error) {
      console.error("Logout Error:", error);
      toast({
        title: "Logout Failed",
        description: error instanceof Error ? error.message : "An error occurred during logout. Please try again.",
        variant: "destructive",
      });
    }
  };

   // If there's a firebaseInitializationError, AuthProvider handles the error screen.
   if (firebaseInitializationError) {
       console.log("AppLayout: Firebase initialization error detected. AuthProvider handles display.");
       return null;
   }

   // If there's an authError from AuthContext, AuthProvider also handles its display.
   if (authError) {
       console.log("AppLayout: AuthContext error detected. AuthProvider handles display.");
       return null;
   }

   // Show loading spinner while auth state is being determined by AuthProvider
   if (authLoading) {
    console.log("AppLayout: Auth is loading. Displaying loader.");
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
     );
  }

  // If user is null after loading and no error, it means they should be redirected by the useEffect.
  // Render null briefly to avoid flashing the layout while redirect happens.
  if (!user) {
      console.log("AppLayout: Auth loaded, but no user. Redirect should occur. Returning null.");
      return null;
  }

  // If we reach here, auth is loaded, user exists, and no critical errors.
  console.log("AppLayout: Auth loaded, user exists. Rendering layout.");
  return (
    <SidebarProvider defaultOpen={true}>
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex flex-col" collapsible="icon"> {/* Ensure collapsible="icon" */}
        <SidebarHeader className="flex items-center justify-between p-2 border-b border-sidebar-border">
            {/* Expanded Logo/Title */}
            <Link href="/" className="flex items-center gap-2 group-data-[state=expanded]:flex group-data-[state=collapsed]:hidden">
               {/* SVG Logo */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <span className="font-semibold text-lg text-sidebar-foreground">NexusLearn AI</span>
            </Link>
             {/* Collapsed Logo/Icon */}
            <Link href="/" className="items-center gap-2 hidden group-data-[state=collapsed]:flex group-data-[state=expanded]:hidden p-1.5" aria-label="NexusLearn AI Home">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                   <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                   <path d="M2 17l10 5 10-5"/>
                   <path d="M2 12l10 5 10-5"/>
                 </svg>
            </Link>
          {/* Trigger is only visually relevant when expanded */}
          <SidebarTrigger className="ml-auto group-data-[state=collapsed]:hidden"/>
        </SidebarHeader>

        {/* Scrollable Content Area */}
        <SidebarContent className="flex-1 overflow-y-auto p-1">
          <SidebarMenu className="space-y-1">
             {/* Main Features */}
             <SidebarMenuItem>
               <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Dashboard">
                 <Link href="/">
                   <Home />
                   <span>Dashboard</span>
                 </Link>
               </SidebarMenuButton>
             </SidebarMenuItem>
             <SidebarMenuItem>
               <SidebarMenuButton asChild isActive={pathname === '/textbook-summary'} tooltip="Textbook Summary">
                 <Link href="/textbook-summary">
                   <BookOpen />
                   <span>Textbook Summary</span>
                 </Link>
               </SidebarMenuButton>
             </SidebarMenuItem>
              <SidebarMenuItem>
                 <SidebarMenuButton asChild isActive={pathname === '/textbook-explainer'} tooltip="Textbook Explainer">
                   <Link href="/textbook-explainer">
                      <MessageSquareQuote />
                      <span>Textbook Explainer</span>
                   </Link>
                 </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <SidebarMenuButton asChild isActive={pathname === '/quickfind'} tooltip="QuickFind Document Search">
                   <Link href="/quickfind">
                      <Search />
                      <span>QuickFind</span>
                   </Link>
                 </SidebarMenuButton>
              </SidebarMenuItem>
             <SidebarMenuItem>
               <SidebarMenuButton asChild isActive={pathname === '/quiz'} tooltip="Quiz Generation">
                 <Link href="/quiz">
                   <HelpCircle />
                    <span>Quiz Generation</span>
                 </Link>
               </SidebarMenuButton>
             </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/upload-textbook'} tooltip="Upload Textbook">
                <Link href="/upload-textbook">
                  <Upload />
                   <span>Upload Textbook</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/study-planner'} tooltip="Study Planner">
                  <Link href="/study-planner">
                    <CalendarDays />
                     <span>Study Planner</span>
                  </Link>
                </SidebarMenuButton>
             </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/performance'} tooltip="Performance Analytics">
                  <Link href="/performance">
                    <Activity />
                     <span>Performance</span>
                  </Link>
                </SidebarMenuButton>
             </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/ai-tutor'} tooltip="AI Tutor">
                  <Link href="/ai-tutor">
                    <BrainCircuit />
                     <span>AI Tutor</span>
                  </Link>
                </SidebarMenuButton>
             </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton asChild isActive={pathname === '/reflection'} tooltip="Reflection">
                    <Link href="/reflection">
                        <ListChecks />
                        <span>Reflection</span>
                    </Link>
                 </SidebarMenuButton>
             </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>

        {/* Footer Section */}
        <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto group-data-[state=collapsed]:group-data-[collapsible=icon]:border-t-0">
          <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/settings'} tooltip="Settings">
                <Link href="/settings">
                  <Settings />
                   <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/profile'} tooltip="Profile">
                <Link href="/profile">
                  <User />
                   <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Log Out">
                <LogOut />
                 <span>Log Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:hidden">
           <Link href="/" className="flex items-center gap-2" aria-label="NexusLearn AI Home">
              {/* SVG Logo */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
             <span className="font-semibold text-lg">NexusLearn AI</span>
           </Link>
          <SidebarTrigger /> {/* Mobile Menu Trigger */}
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/40 dark:bg-muted/10"> {/* Light background for content */}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
