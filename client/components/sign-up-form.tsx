"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  CardContent, CardFooter
} from "./ui/card";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";


// Test@1234
function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

    const { data, isPending, error } = authClient.useSession();

    if (isPending) {
      return (
        <div>
          <Loader2 className="animate-spin" />
          Loading...
        </div>
      );
    }

    if (data?.user && data?.session) {
      router.push("/");
    }

    if (error) {
      toast.error("Error fetching session data");
      console.log("Error fetching session data", error);
      return null;
    }

  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await authClient.signIn.social({
        provider: "github",
        callbackURL: "http://localhost:3000",
      });

      if (error) {
        console.log("Error in GitHub login", error);
        toast.error(error.message);
        return;
      }

      toast.success("GitHub Login Successful");
    } catch (error) {
      console.log("Error in login", error);
      toast.error("GitHub Login Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (user_name:string,email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await authClient.signUp.email({
        name:user_name,
        email,
        password,
        callbackURL: "http://localhost:3000",
      });

      if (error) {
        console.log("Error in Sign Up using email", error);
        toast.error(error.message);
        return;
      }

      toast.success("Registerd Successfully");
      if(data?.user){
        router.push('/');
      }
    } 
    catch (error) {
      console.log("Error in email sign-up", error);
      toast.error("Email SignUp Failed");
    } 
    finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (formData: FormData) => {
    const user_name = formData.get("user_name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirm_password = formData.get("confirm_password") as string;

    if(password!==confirm_password){
        toast.error("Password and Confirm Password donot match");
        return;
    }
    if (!email || !password) {
      toast.error("Please provide both email and password");
      return;
    }
    handleEmailSignUp(user_name,email, password);
  };

  return (
    <div>
      <form
        className="flex flex-col items-center gap-5"
        action={handleFormSubmit}>
        <CardContent className="grid w-full gap-3">
          <>
            <Label htmlFor="name">Username: </Label>
            <Input
              type="text"
              name="user_name"
              id="name"
              placeholder="User Name"
              disabled={loading}
              required
            />
          </>
          <>
            <Label htmlFor="email">Email: </Label>
            <Input
              type="email"
              name="email"
              id="email"
              placeholder="Email"
              disabled={loading}
              required
            />
          </>
          <>
            <Label htmlFor="password">Password: </Label>
            <Input
              type="password"
              name="password"
              id="password"
              placeholder="Password"
              autoComplete="off"
              disabled={loading}
              required
            />
            <Label htmlFor="confirm_password">Confirm Password: </Label>
            <Input
              type="password"
              name="confirm_password"
              id="confirm_password"
              placeholder="Confirm Password"
              autoComplete="off"
              disabled={loading}
              required
            />
          </>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" variant="default" className="mt-5 w-full gap-4">
            {loading ? <Loader2 className="animate-spin" /> : "Register"}
          </Button>
          <p className="gap-4 text-center text-xs">
            Already have an account?
            <Link
              href="/auth/sign-in"
              className={`blue-500 underline ${
                loading ? "pointer-events-none opacity-40" : ""
              }`}>
              Login
            </Link>
          </p>
        </CardFooter>
      </form>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            Or continue with
          </span>
        </div>
      </div>

      <form action={handleGitHubLogin} className="px-6 pb-4">
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign In with GitHub
        </Button>
      </form>
    </div>
  );
}

export default SignupForm;
