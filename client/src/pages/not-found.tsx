import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, Home, Bell } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4 border-red-200">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-gray-600">
            The page you're looking for doesn't exist. If you're looking for emergency information, please try the emergency share page.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={() => navigate("/emergency-share")}
            className="w-full bg-red-500 hover:bg-red-600"
            variant="default"
          >
            <Bell className="mr-2 h-4 w-4" />
            Emergency Share Page
          </Button>
          
          <Button
            onClick={() => navigate("/")}
            className="w-full"
            variant="outline"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
