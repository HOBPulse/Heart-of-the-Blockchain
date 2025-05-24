import React from "react";

const Hero = () => {
  return (
    <section className="bg-white pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
        {/* Text Content */}
        <div className="space-y-5">
          <p className="text-sm text-gray-500 uppercase tracking-wide">
            Built on Trust. Powered by Blockchain
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Help Save Lives With Just One Click
          </h2>
          <p className="text-lg text-gray-700 max-w-xl">
            We connect critically ill patients with life-saving care and
            transparent blockchain-powered donations.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button className="px-6 py-3 border border-red-500 text-red-500 font-semibold rounded-full hover:bg-red-50 transition">
              Create Campaign
            </button>
            <button className="px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-full hover:bg-gray-200 transition">
              Explore Campaign
            </button>
          </div>
          {/* Highlight Box */}
          <div className="mt-6 inline-block bg-blue-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-full">
            23 countries reached
          </div>
        </div>

        {/* Image + Overlays */}
        <div className="relative w-full h-full">
          <img
            src="young-man-being-ill-hospital-bed.jpg"
            alt="Healthcare donation"
            className="rounded-xl w-full object-cover max-h-[500px]"
          />
          {/* https://www.freepik.com/free-photo/young-man-being-ill-hospital-bed_15634157.htm */}
          {/* Overlays */}
          <div className=" top-4 left-4 bg-white rounded-md px-3 py-1 text-xs font-medium shadow">
            128 lives saved
          </div>
          <div className=" bottom-4 left-4 bg-white rounded-md px-3 py-1 text-xs font-medium shadow">
            View Story
          </div>
          <div className=" bottom-4 right-4 bg-white rounded-md px-3 py-1 text-xs font-medium shadow">
            100% Transparent
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
// This component is a hero section for a donation platform. It includes a title, description, buttons for creating and exploring campaigns, and an image with overlays indicating lives saved and transparency.
// The design is responsive and uses Tailwind CSS for styling.