"use client";

const Loader = () => {
  return (
    <div className="mx-auto w-[600px] bg-gray-950 rounded-xl overflow-hidden drop-shadow-2xl">
      <div className="bg-[#202020] flex items-center p-5 text-white relative rounded-t-xl">
        <div className="flex absolute left-3 space-x-2">
          <span className="h-3.5 w-3.5 bg-[#ff605c] rounded-full transition-all hover:scale-125 hover:bg-[#ff3b36]" />
          <span className="h-3.5 w-3.5 bg-[#ffbd44] rounded-full transition-all hover:scale-125 hover:bg-[#ffaa33]" />
          <span className="h-3.5 w-3.5 bg-[#00ca4e] rounded-full transition-all hover:scale-125 hover:bg-[#00b44e]" />
        </div>
        <div className="flex-1 text-center text-white font-semibold text-lg relative animate-pulse">
          <div className="text-xl">Loading...</div>
        </div>
        <div className="absolute w-full bottom-0 left-0 bg-[#333333] h-1 rounded-t-xl">
          <div className="w-[30%] bg-[#00e600] h-full animate-progressBar" />
        </div>
      </div>
      <div className="flex bg-[#121212] p-8 justify-center items-center h-[450px]">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 border-4 border-t-[#00e600] border-gray-700 rounded-full animate-spin mx-auto" />
          <div className="text-[#00e600] font-semibold text-4xl opacity-90 animate-fadeIn">
            Almost There...
          </div>
          <div className="text-[#9e9e9e] text-sm opacity-80 animate-fadeIn">
            <p>We're getting everything ready for you...</p>
            <p>Just relax for a moment.</p>
          </div>
        </div>
      </div>
      <div className="bg-[#202020] p-4 text-center text-gray-400 text-xs font-mono">
        <p>Appreciate your patience. Almost there!</p>
      </div>
    </div>
  );
};

export default Loader;
