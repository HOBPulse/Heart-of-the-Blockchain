import React from 'react';

const Navbar = () => {
  return (
    <header className="w-full bg-white shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo + Brand Name */}
        <div className="flex items-center space-x-2">
          <img src="\NewLifeLogo1.png" alt="New Life Logo" className="h-8 w-8" width={100} />
          <span className="text-xl font-bold text-gray-800">New Life Foundation</span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-8 text-gray-700 font-medium">
          <a href="#" className="hover:text-red-600">Home</a>
          <a href="#" className="hover:text-red-600">Explore Campaigns</a>
          <a href="#" className="hover:text-red-600">About</a>
          <a href="#" className="hover:text-red-600">FAQ</a>
        </nav>

        {/* Connect Wallet Button */}
        <div>
          <button className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition">
            Connect Wallet
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
