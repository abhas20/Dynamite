import SignupForm from "@/components/sign-up-form";


const SignIn = () => {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left: Image Side */}
      <div
        className="hidden md:flex w-1/2 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/image.png')" }}></div>

      {/* Right: Form Side */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <SignupForm />
        </div>
      </div>
    </div>
  );
};

export default SignIn;
