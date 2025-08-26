import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wheat, Key, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const res = await apiRequest("POST", "/api/reset-password", data);
      return await res.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !newPassword) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sourdough-50 to-sourdough-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and App Name */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-sourdough-600 text-white p-3 rounded-full">
              <Wheat className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-sourdough-900">Crumb Coach</h1>
          <p className="text-sourdough-600 mt-2">Set your new password</p>
        </div>

        <Card className="shadow-lg border-sourdough-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-sourdough-900">
              Reset Password
            </CardTitle>
            <CardDescription className="text-sourdough-600">
              Enter your reset token and new password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSuccess ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-sourdough-800">
                      Reset Token
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-sourdough-400" />
                      <Input
                        id="token"
                        type="text"
                        placeholder="Paste your reset token here"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="pl-10 border-sourdough-200 focus:border-sourdough-500 font-mono"
                        required
                        data-testid="input-reset-token"
                      />
                    </div>
                    <p className="text-xs text-sourdough-600">
                      Enter the token you received via email or copied from the previous page.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sourdough-800">
                      New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-sourdough-400" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 border-sourdough-200 focus:border-sourdough-500"
                        required
                        minLength={6}
                        data-testid="input-new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sourdough-800">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-sourdough-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 border-sourdough-200 focus:border-sourdough-500"
                        required
                        minLength={6}
                        data-testid="input-confirm-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-sourdough-600 hover:bg-sourdough-700 text-white"
                    disabled={resetPasswordMutation.isPending}
                    data-testid="button-reset-password"
                  >
                    {resetPasswordMutation.isPending ? "Resetting Password..." : "Reset Password"}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-sourdough-600 hover:text-sourdough-800"
                    data-testid="button-back-to-forgot"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Forgot Password
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Your password has been reset successfully! You can now sign in with your new password.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => setLocation("/auth")}
                  className="w-full bg-sourdough-600 hover:bg-sourdough-700 text-white"
                  data-testid="button-go-to-login"
                >
                  Go to Sign In
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}