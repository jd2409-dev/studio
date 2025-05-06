
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { Home, BookOpen, HelpCircle, Settings, User, Upload, LogOut, Activity, BrainCircuit, CalendarDays, ListChecks, MessageSquareQuote } from 'lucide-react'; // Changed icon
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
                 {/* Correct usage: Link is the direct child when using asChild */}
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
        <SidebarFooter>
          <SidebarMenu>
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
              {/* Correct usage: Direct button action, no asChild needed */}
              <SidebarMenuButton onClick={handleLogout} tooltip="Log Out">
                <LogOut />
                 <span>Log Out</span>
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
