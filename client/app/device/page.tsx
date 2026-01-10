'use client';
import { authClient } from '@/lib/auth-client';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'

const DeviceAuthPage = () => {

    const { data, isPending } = authClient.useSession();
    const [code, setCode] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();

    if(isPending){
        return (
        <div className='flex justify-items-center'>
          <Loader2 className="animate-spin" />
          <p className='text-2xl'>Loading...</p>
        </div>
        );
    }

    if(!data?.user || !data?.session){
        router.push('/auth/sign-in');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formattedCode = code.trim().replace(/-/g, "").toUpperCase();

            const response = await authClient.device({
                query: {
                    user_code: formattedCode
                }
            })
            if (response.data) {
              router.push(`/device/approve?user_code=${formattedCode}`);
            }
            
        } catch (error) {
            setError("Failed to verify code. Please check and try again.");
        }
        finally {
            setLoading(false);
        }
    }

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let inputCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (inputCode.length > 4) {
            inputCode = inputCode.slice(0, 4) + '-' + inputCode.slice(4, 8);
        }
        setCode(inputCode);
    }

  return (
    <div className="min-h-screen flex items-center justify-center text-white px-4">
        
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex flex-col items-center mb-6 gap-4">
        <div className='border border-dashed border-red-400 p-2 rounded'>
            <ShieldAlert className='text-yellow-300'/>
        </div>
        <h1 className="text-2xl font-bold mb-6 text-center">
          Verify Your Device
        </h1>
        </div>

        <p className="text-neutral-400 text-sm mb-6 text-center">
          Enter the device code shown on your CLI.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm text-neutral-300">
              Device Code
            </label>
            <input
              type="text"
              placeholder="XXXX-XXXX"
              value={code}
              onChange={handleCodeChange}
              className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white 
                         placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         outline-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            disabled={loading || code.trim() === ""}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition
                       disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Verifying..." : "Verify Code"}
          </button>

          <div className='mt-4 border border-dashed p-2 border-gray-400 rounded'>
            <p className="text-xs text-neutral-500 text-center">
                The Code is case insensetive and will expire shortly. Make sure to enter it exactly as shown.Keep it confidential.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeviceAuthPage
