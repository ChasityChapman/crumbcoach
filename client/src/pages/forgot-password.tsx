import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wheat, Mail, ArrowLeft, Copy, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/forgot-password", { email });
      return await res.json() as ForgotPasswordResponse;
    },
    onSuccess: (data) => {
      setResetToken(data.resetToken || null);
      toast({
        title: "Password reset requested",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Missing information",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    forgotPasswordMutation.mutate(email);
  };

  const copyToken = () => {
    if (resetToken) {
      navigator.clipboard.writeText(resetToken);
      setTokenCopied(true);
      toast({
        title: "Token copied",
        description: "Reset token has been copied to clipboard",
      });
      setTimeout(() => setTokenCopied(false), 2000);
    }
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
          <p className="text-sourdough-600 mt-2">Reset your password</p>
        </div>

        <Card className="shadow-lg border-sourdough-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-sourdough-900">
              Forgot Password
            </CardTitle>
            <CardDescription className="text-sourdough-600">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!resetToken ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sourdough-800">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-sourdough-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 border-sourdough-200 focus:border-sourdough-500"
                        required
                        data-testid="input-forgot-password-email"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-sourdough-600 hover:bg-sourdough-700 text-white"
                    disabled={forgotPasswordMutation.isPending}
                    data-testid="button-send-reset-link"
                  >
                    {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/auth")}
                    className="text-sourdough-600 hover:text-sourdough-800"
                    data-testid="button-back-to-login"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Alert className="border-sourdough-200 bg-sourdough-50">
                  <Mail className="h-4 w-4 text-sourdough-600" />
                  <AlertDescription className="text-sourdough-800">
                    A password reset link has been sent to your email address.
                  </AlertDescription>
                </Alert>

                <div className="bg-sourdough-50 border border-sourdough-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-sourdough-700 font-medium">
                    Development Mode - Reset Token:
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={resetToken}
                      readOnly
                      className="font-mono text-xs bg-white border-sourdough-200"
                      data-testid="text-reset-token"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToken}
                      className="flex-shrink-0 border-sourdough-200"
                      data-testid="button-copy-token"
                    >
                      {tokenCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-sourdough-600">
                    Copy this token to reset your password. In production, this would be sent via email.
                  </p>
                </div>

                <Button
                  onClick={() => setLocation("/reset-password")}
                  className="w-full bg-sourdough-600 hover:bg-sourdough-700 text-white"
                  data-testid="button-continue-reset"
                >
                  Continue to Reset Password
                </Button>

                <div className="text-center pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/auth")}
                    className="text-sourdough-600 hover:text-sourdough-800"
                    data-testid="button-back-to-login-success"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}