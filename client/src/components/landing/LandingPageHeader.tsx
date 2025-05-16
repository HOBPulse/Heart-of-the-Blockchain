// LandingPage.jsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="font-sans">
      {/* Navbar */}
      <header className="flex justify-between items-center p-6 bg-white shadow">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="New Life Logo" className="w-8 h-8" />
          <span className="text-xl font-bold">New Life</span>
        </div>
        <nav className="space-x-6 hidden md:flex">
          <a href="#" className="hover:text-blue-600">Home</a>
          <a href="#" className="hover:text-blue-600">Explore Campaigns</a>
          <a href="#" className="hover:text-blue-600">About</a>
          <a href="#" className="hover:text-blue-600">FAQ</a>
        </nav>
        <Button className="rounded-full bg-blue-600 text-white hover:bg-blue-700">Connect Wallet</Button>
      </header>

      {/* Hero Section */}
      <section className="grid md:grid-cols-2 gap-6 items-center px-6 py-16 bg-gray-50">
        <div>
          <p className="text-sm uppercase text-gray-500">Built on Trust. Powered by Blockchain</p>
          <h1 className="text-4xl font-bold my-4">Help Save Lives With Just One Click</h1>
          <p className="mb-2 text-blue-600 font-semibold">23 countries reached</p>
          <p className="text-gray-700 mb-6">
            We connect critically ill patients with life-saving care and transparent blockchain-powered donations.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button className="rounded-full bg-red-600 text-white hover:bg-red-700">Create Campaign</Button>
            <Button variant="outline" className="rounded-full">Explore Campaign</Button>
          </div>
          <div className="mt-6 flex space-x-4 text-sm">
            <span className="underline cursor-pointer">View Story</span>
            <span className="underline cursor-pointer">100% Transparent</span>
          </div>
        </div>
        <img src="/hero-image.jpg" alt="Hero Visual" className="rounded-xl w-full" />
      </section>
    </div>
  );
}
