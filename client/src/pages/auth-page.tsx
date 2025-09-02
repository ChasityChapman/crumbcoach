import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signIn, signUp, user, setDemoMode } = useSupabaseAuth();

  // Login form state
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  });

  // Register form state  
  const [registerData, setRegisterData] = useState<RegisterData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // State for showing redirect message
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect if already authenticated - using useEffect to avoid hooks violation
  useEffect(() => {
    if (user) {
      setIsRedirecting(true);
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(loginData.email, loginData.password);
      if (result.error) {
        toast({
          title: "Login failed",
          description: result.error.message,
          variant: "destructive",
        });
      } else {
        if ((result as any).isDemoMode) {
          setDemoMode((result as any).mockUser, (result as any).mockSession);
          toast({
            title: "Welcome to Demo Mode!",
            description: "You're using offline mode - all data is local.",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You've successfully logged in.",
          });
        }
        // Wait a brief moment for user state to update before navigating
        setTimeout(() => {
          setLocation("/");
        }, 100);
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const metadata = {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
      };
      
      const result = await signUp(registerData.email, registerData.password, metadata);
      if (result.error) {
        toast({
          title: "Registration failed",
          description: result.error.message,
          variant: "destructive",
        });
      } else {
        if ((result as any).isDemoMode) {
          setDemoMode((result as any).mockUser, (result as any).mockSession);
          toast({
            title: "Welcome to Demo Mode!",
            description: "Your demo account has been created - all data is local.",
          });
        } else {
          toast({
            title: "Welcome to Crumb Coach!",
            description: "Your account has been created successfully.",
          });
        }
        // Wait a brief moment for user state to update before navigating
        setTimeout(() => {
          setLocation("/");
        }, 100);
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  // Always render consistent structure - no conditional returns
  return (
    <div className="min-h-screen bg-gradient-to-br from-sourdough-50 to-sourdough-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Show redirecting message if user is authenticated */}
        {(user || isRedirecting) ? (
          <div className="text-center">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sourdough-600">Redirecting...</p>
          </div>
        ) : (
          <>
            {/* Logo and App Name */}
            <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src={crumbCoachLogo} 
              alt="Crumb Coach" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-sourdough-900">Crumb Coach</h1>
          <p className="text-sm sm:text-base text-sourdough-600 mt-2">Your sourdough baking companion</p>
        </div>

        <Card className="shadow-lg border-sourdough-200">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl text-sourdough-900">
              Get Started
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-sourdough-600">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm sm:text-base text-sourdough-800">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-sourdough-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData({ ...loginData, email: e.target.value })
                        }
                        className="pl-10 border-sourdough-200 focus:border-sourdough-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm sm:text-base text-sourdough-800">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-sourdough-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({ ...loginData, password: e.target.value })
                        }
                        className="pl-10 border-sourdough-200 focus:border-sourdough-500"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-sourdough-600 hover:bg-sourdough-700 text-white"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-sourdough-600 hover:text-sourdough-800 text-sm"
                    data-testid="link-forgot-password"
                  >
                    Forgot your password?
                  </Button>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm sm:text-base text-sourdough-800">
                      Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-sourdough-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, email: e.target.value })
                        }
                        className="pl-10 border-sourdough-200 focus:border-sourdough-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm sm:text-base text-sourdough-800">
                      Password *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-sourdough-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, password: e.target.value })
                        }
                        className="pl-10 border-sourdough-200 focus:border-sourdough-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname" className="text-sm sm:text-base text-sourdough-800">
                        First Name
                      </Label>
                      <Input
                        id="register-firstname"
                        type="text"
                        placeholder="First name"
                        value={registerData.firstName}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, firstName: e.target.value })
                        }
                        className="border-sourdough-200 focus:border-sourdough-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-lastname" className="text-sm sm:text-base text-sourdough-800">
                        Last Name
                      </Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        placeholder="Last name"
                        value={registerData.lastName}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, lastName: e.target.value })
                        }
                        className="border-sourdough-200 focus:border-sourdough-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-sourdough-600 hover:bg-sourdough-700 text-white"
                    disabled={isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

            <p className="text-center text-xs sm:text-sm text-sourdough-500 mt-6">
              Start your sourdough journey with expert guidance every step of the way
            </p>
          </>
        )}
      </div>
    </div>
  );
}