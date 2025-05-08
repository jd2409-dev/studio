'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar'; // Removed SidebarTrigger
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
    // Ensure sidebar is open by default since toggle is removed
    <SidebarProvider defaultOpen={true}>
      {/* Desktop Sidebar - Set collapsible to "none" so it doesn't collapse */}
      <Sidebar className="hidden md:flex flex-col" collapsible="none">
        <SidebarHeader className="flex items-center justify-between p-2 border-b border-sidebar-border">
            {/* Logo/Title */}
            <Link href="/" className="flex items-center gap-2">
               {/* SVG Logo */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <span className="font-semibold text-lg text-sidebar-foreground">NexusLearn AI</span>
            </Link>
             {/* Removed SidebarTrigger */}
        </SidebarHeader>

        {/* Scrollable Content Area */}
        <SidebarContent className="flex-1 overflow-y-auto p-1">
          <SidebarMenu className="space-y-1">
             {/* Main Features */}
             <SidebarMenuItem>
               <Link href="/" passHref>
                  <SidebarMenuButton asChild isActive={pathname === '/'}>
                        <Home />
                        <span>Dashboard</span>
                  </SidebarMenuButton>
               </Link>
             </SidebarMenuItem>
             <SidebarMenuItem>
                <Link href="/textbook-summary" passHref>
                   <SidebarMenuButton asChild isActive={pathname === '/textbook-summary'}>
                         <BookOpen />
                         <span>Textbook Summary</span>
                   </SidebarMenuButton>
                 </Link>
             </SidebarMenuItem>
              <SidebarMenuItem>
                  <Link href="/textbook-explainer" passHref>
                     <SidebarMenuButton asChild isActive={pathname === '/textbook-explainer'}>
                           <MessageSquareQuote />
                           <span>Textbook Explainer</span>
                     </SidebarMenuButton>
                   </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <Link href="/quickfind" passHref>
                     <SidebarMenuButton asChild isActive={pathname === '/quickfind'}>
                           <Search />
                           <span>QuickFind</span>
                     </SidebarMenuButton>
                  </Link>
              </SidebarMenuItem>
             <SidebarMenuItem>
                 <Link href="/quiz" passHref>
                   <SidebarMenuButton asChild isActive={pathname === '/quiz'}>
                          <HelpCircle />
                          <span>Quiz Generation</span>
                   </SidebarMenuButton>
                 </Link>
             </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/upload-textbook" passHref>
                   <SidebarMenuButton asChild isActive={pathname === '/upload-textbook'}>
                         <Upload />
                         <span>Upload Textbook</span>
                   </SidebarMenuButton>
                 </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                  <Link href="/study-planner" passHref>
                     <SidebarMenuButton asChild isActive={pathname === '/study-planner'}>
                          <CalendarDays />
                          <span>Study Planner</span>
                     </SidebarMenuButton>
                   </Link>
             </SidebarMenuItem>
             <SidebarMenuItem>
                  <Link href="/performance" passHref>
                     <SidebarMenuButton asChild isActive={pathname === '/performance'}>
                          <Activity />
                          <span>Performance</span>
                     </SidebarMenuButton>
                   </Link>
             </SidebarMenuItem>
             <SidebarMenuItem>
                 <Link href="/ai-tutor" passHref>
                     <SidebarMenuButton asChild isActive={pathname === '/ai-tutor'}>
                           <BrainCircuit />
                           <span>AI Tutor</span>
                     </SidebarMenuButton>
                  </Link>
             </SidebarMenuItem>
             <SidebarMenuItem>
                 <Link href="/reflection" passHref>
                    <SidebarMenuButton asChild isActive={pathname === '/reflection'}>
                            <ListChecks />
                            <span>Reflection</span>
                    </SidebarMenuButton>
                 </Link>
             </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>

        {/* Footer Section */}
        <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto">
          <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
               <Link href="/settings" passHref>
                  <SidebarMenuButton asChild isActive={pathname === '/settings'}>
                       <Settings />
                       <span>Settings</span>
                  </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <Link href="/profile" passHref>
                  <SidebarMenuButton asChild isActive={pathname === '/profile'}>
                       <User />
                       <span>Profile</span>
                  </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                 <span>Log Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset className="flex-1 flex flex-col">
        {/* Mobile Header - Removed the trigger */}
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
          {/* <SidebarTrigger /> Mobile Menu Trigger REMOVED */}
          {/* Note: Removing the trigger means the mobile sidebar cannot be opened easily. */}
          {/* You might need an alternative way to show the mobile menu if required. */}
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/40 dark:bg-muted/10"> {/* Light background for content */}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}