import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  // Placeholder data
  const user = {
      name: "Alex Johnson",
      email: "alex.j@example.com",
      avatarUrl: "https://picsum.photos/100/100?random=1", // Placeholder image
      initials: "AJ",
      schoolBoard: "CBSE",
      grade: "10",
      joinDate: "January 15, 2024",
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <p className="text-muted-foreground mb-8">
        View and update your personal information and account details.
      </p>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
             <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="user avatar" />
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
           <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{user.schoolBoard}</Badge>
              <Badge variant="outline">Grade {user.grade}</Badge>
           </div>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-2">
             <Label htmlFor="name">Full Name</Label>
             <Input id="name" defaultValue={user.name} />
           </div>
            <div className="space-y-2">
             <Label htmlFor="email">Email Address</Label>
             <Input id="email" type="email" defaultValue={user.email} readOnly disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
           </div>
           <div className="space-y-2">
              <Label htmlFor="avatar">Profile Picture URL</Label>
              <Input id="avatar" defaultValue={user.avatarUrl} />
           </div>
            <div className="space-y-2">
             <Label htmlFor="password">Change Password</Label>
             <Input id="password" type="password" placeholder="Enter new password" />
           </div>

           <div className="border-t pt-4">
               <p className="text-sm text-muted-foreground">Member since: {user.joinDate}</p>
           </div>

        </CardContent>
        <CardFooter className="flex justify-end">
            <Button>Update Profile</Button>
        </CardFooter>
      </Card>

    </div>
  );
}
