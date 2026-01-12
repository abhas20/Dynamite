"use client";
import ProfileCard from "@/components/profile-card";
import Loader from "@/components/ui/loader";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Home() {

  const [isLoading,setIsLoading] =useState<boolean>(false);
  const {data, isPending, error} = authClient.useSession();
  const router = useRouter();

  useEffect(()=>{
    if(!isPending && (!data?.user || !data?.session)){
      router.push("/auth/sign-in");
    }
  },[isPending,data,router]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-white text-lg">Loading...</p>{" "}
      </div>
    );
  }
  

  if(error){
    toast.error("Error fetching session data");
    console.log("Error fetching session data",error);
    return null;
  }


  const handleSignOut=async()=>{
    setIsLoading(true);
    try {
      const {error}=await authClient.signOut({
        fetchOptions:{
          onError:(error)=> {
            console.log("Error in signing out",error);
            toast.error("Error in signing out");
          },
          onSuccess:()=> router.push("/auth/sign-in"),
        },
      });
      if(error){
        console.log("Error in signing out",error);
        toast.error("Error in signing out");
        return;
      }
      
    } 
    catch (error) {
      console.log("Error in signing out")
      toast.error("Error in signing out");
    }
    finally{
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 gap-5">
      <h1 className="text-2xl font-bold">Welcome to Dynamite!</h1>
      <ProfileCard user={data?.user} handleSignOut={handleSignOut} isLoading={isLoading}/>
    </div>
  );
}
