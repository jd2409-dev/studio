import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account preferences and application settings.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                       <Label htmlFor="dark-mode">Dark Mode</Label>
                       <Switch id="dark-mode" />
                   </div>
                   {/* Add more appearance settings here */}
              </CardContent>
          </Card>

           <Card>
              <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Control how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                       <Label htmlFor="email-notifications">Email Notifications</Label>
                       <Switch id="email-notifications" defaultChecked />
                   </div>
                   <div className="flex items-center justify-between">
                       <Label htmlFor="push-notifications">Push Notifications</Label>
                       <Switch id="push-notifications" />
                   </div>
                    {/* Add more notification settings here */}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Learning Preferences</CardTitle>
                  <CardDescription>Set your preferred school board and grade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div>
                       <Label htmlFor="school-board">School Board</Label>
                       <Select>
                           <SelectTrigger id="school-board">
                               <SelectValue placeholder="Select board..." />
                           </SelectTrigger>
                           <SelectContent>
                               <SelectItem value="cbse">CBSE</SelectItem>
                               <SelectItem value="icse">ICSE</SelectItem>
                               <SelectItem value="gcse">GCSE</SelectItem>
                               <SelectItem value="ib">IB</SelectItem>
                               <SelectItem value="state">State Board</SelectItem>
                           </SelectContent>
                       </Select>
                   </div>
                    <div>
                       <Label htmlFor="grade-level">Grade Level</Label>
                       <Select>
                           <SelectTrigger id="grade-level">
                               <SelectValue placeholder="Select grade..." />
                           </SelectTrigger>
                           <SelectContent>
                               {[...Array(12)].map((_, i) => (
                                   <SelectItem key={i + 1} value={`${i + 1}`}>Grade {i + 1}</SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                   </div>
              </CardContent>
          </Card>

           <Card>
              <CardHeader>
                  <CardTitle>Accessibility</CardTitle>
                  <CardDescription>Configure accessibility options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                       <Label htmlFor="voice-commands">Enable Voice Commands</Label>
                       <Switch id="voice-commands" />
                   </div>
                   {/* Add font size, contrast settings etc. */}
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
