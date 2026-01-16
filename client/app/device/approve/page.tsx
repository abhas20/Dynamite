"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { Loader2, Smartphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

const ApprovePage = () => {
  const { data, isPending } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userCode = searchParams.get("user_code");

  const [isProcessing, setIsProcessing] = useState<{
    approve: boolean;
    deny: boolean;
  }>({
    approve: false,
    deny: false,
  });

  if (isPending) {
    return (
      <div>
        <Loader2 className="animate-spin" />
        Loading...
      </div>
    );
  }

  if (!data?.user || !data?.session) {
    router.push("/auth/sign-in");
  }

  const handleApprove = async () => {
    setIsProcessing({
        approve: true,
        deny: false,
    });

    try {
        toast.loading("Approving device...", {id: "device-approve",position: "top-center"});
        await authClient.device.approve({
            userCode: userCode!,
        })
        toast.dismiss("device-approve");
        toast.success("Device approved successfully!", {position: "top-center"});
        router.push("/");

    } catch (error) {
        toast.error("Failed to approve device. Please try again.",{position: "top-center"});
        console.log("Error in approving",error);
    }
    finally {
        setIsProcessing({
            approve: false,
            deny: false,
        });
    }
  };

  const handleDeny = async () => {
    setIsProcessing({
        approve: false,
        deny: true,
    });

    try {
        toast.loading("Denying device...", {id: "device-deny",position: "top-center"});
        await authClient.device.deny({
            userCode: userCode!,
        })
        toast.dismiss("device-deny");
        toast.success("Device denied successfully!", {position: "top-center"});

    }
    catch (error) {
        toast.error("Failed to deny device. Please try again.",{position: "top-center"});
        console.log("Error in denying",error);
    }

    finally {
        setIsProcessing({
            approve: false,
            deny: false,
        });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center text-white px-4">
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex flex-col items-center mb-6 gap-4">
          <div className="border border-dashed border-red-400 p-2 rounded">
            <Smartphone className="text-yellow-300" />
          </div>
          <h1 className="text-2xl font-bold mb-6 text-center">
            Device Approval !!
          </h1>
        </div>

        <p className="text-neutral-400 text-sm mb-6 text-center">
          A new device is attempting to access your account. Please choose to
          approve or deny this request.
        </p>

        <div className="space-y-5">
          <div>
            <label className="block mb-2 text-sm text-neutral-300">
              Authentication Code
            </label>
            <input
              type="text"
              placeholder="XXXX-XXXX"
              readOnly={true}
              value={userCode || "---- ----"}
              className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-cyan-400 
                         placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         outline-none text-center"
            />
          </div>

          <div className="border border-dashed border-red-300 p-2 rounded flex flex-col items-center">
            <p className="block mb-2 text-sm text-neutral-300">
              Requested By {data?.user?.email ? `: ${data.user.email}` : ""}
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-between gap-4">
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={isProcessing.approve || isProcessing.deny}>
              {isProcessing.deny ? "Denying..." : "Deny"}
            </Button>
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={isProcessing.approve || isProcessing.deny}>
              {isProcessing.approve ? "Approving..." : "Approve"}
            </Button>
          </div>

          <div className="mt-4 border border-dashed p-2 border-gray-400 rounded">
            <p className="text-xs text-neutral-500 text-center">
              ONLY approve this request if you initiated it. If you did not
              recognize this device, please deny the request to protect your
              account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovePage;
