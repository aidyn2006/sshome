"use client";

import React, { useState } from "react";
import { Chrome, Eye, EyeOff, Github, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const LightLogin = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-100 via-blue-50 to-transparent opacity-40 blur-3xl -mt-20" />
        <div className="h-28 overflow-hidden relative">
          <Image
            src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80"
            alt="Smart home security"
            width={1200}
            height={320}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
        </div>
        <div className="p-8 pt-4">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-lg mb-6">
              <ShieldCheck className="h-12 w-12 text-blue-500" />
            </div>
            <div className="p-0">
              <h2 className="text-2xl font-bold text-gray-900 text-center">
                Welcome Back
              </h2>
              <p className="text-center text-gray-500 mt-2">
                Sign in to continue to your account
              </p>
            </div>
          </div>

          <div className="space-y-6 p-0">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Email or Phone
              </label>
              <input
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 h-12 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/50 focus:border-blue-500 w-full px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 border"
                placeholder="Enter your email or phone"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link href="#" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="bg-gray-50 border-gray-200 text-gray-900 pr-12 h-12 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/50 focus:border-blue-500 w-full px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 border"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password value" : "Show password value"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button className="w-full h-12 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-blue-100 active:scale-[0.98] inline-flex items-center justify-center whitespace-nowrap text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
              Sign In
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-4 text-sm text-gray-400">or continue with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="h-12 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg flex items-center justify-center gap-2 border bg-background inline-flex whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                <Chrome className="h-[18px] w-[18px]" />
                <span className="whitespace-nowrap">Google</span>
              </button>

              <button className="h-12 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-black rounded-lg flex items-center justify-center gap-2 border bg-background inline-flex whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                <Github className="h-[18px] w-[18px]" />
                <span className="whitespace-nowrap">GitHub</span>
              </button>
            </div>
          </div>

          <div className="p-0 mt-6">
            <p className="text-sm text-center text-gray-500 w-full">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
