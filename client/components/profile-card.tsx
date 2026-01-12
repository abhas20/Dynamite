"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProfileCardProps {
    user:{
            id: string;
            email: string;
            name: string;
            image?: string | null | undefined;
        } | undefined;
    handleSignOut: () => void;
    isLoading: boolean;
}   

export default function ProfileCard({ user, handleSignOut,isLoading }: ProfileCardProps) {

  const router = useRouter();

   useEffect(() => {
     if (!user) {
       router.push("/auth/sign-in");
     }
   }, [user, router]);

   if (!user) return null;

  return (
    <div className="w-80 bg-yellow-400 rounded-xl shadow-lg p-6 text-center">
      <img
        src={
          user?.image ||
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAYwDt4pLXuFhY99kTU7o51w1n9WTDGrV6-w&s"
        }
        alt="User Image"
        width={120}
        height={120}
        className="rounded-full mx-auto mb-4 object-cover"
      />

      <h2 className="text-xl font-semibold text-gray-800">
        {user?.name || "Unknown User"}
      </h2>

      <p className="text-gray-600 mt-2">
        <strong>Email:</strong> {user?.email || "N/A"}
      </p>

      <button
        onClick={handleSignOut}
        disabled={isLoading}
        className="w-full mt-5 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition">
        {isLoading ? "Signing Out..." : "Sign Out"}
      </button>
    </div>
  );
}
