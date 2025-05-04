
'use client'; // Add 'use client' directive

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useRouter } from 'next/navigation'; // Import useRouter

export default function LoginPage() {
  const { toast } = useToast(); // Initialize toast
  const router = useRouter(); // Initialize router

  const handleLogin = () => {
    // Simulate login logic - replace with actual authentication
    console.log("Attempting login...");
    toast({
      title: "Login Successful",
      description: "Redirecting to dashboard (simulation).",
    });
    // Redirect to dashboard or main app page
    router.push('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Enter your credentials to access NexusLearn AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              {/* Add Forgot password link if needed */}
              {/* <Link href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </Link> */}
            </div>
            <Input id="password" type="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
           {/* Update Button to use handleLogin */}
          <Button className="w-full" onClick={handleLogin}>
            Login
          </Button>
           <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            {/* Link to a potential signup page */}
            <Link href="/signup" className="underline" onClick={(e) => {
              e.preventDefault(); // Prevent navigation for now
              toast({ title: "Info", description: "Signup page not implemented yet." });
            }}>
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
