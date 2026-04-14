"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Phone,
  ShieldPlus,
  UserRound
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const LightRegister = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-200 via-cyan-100 to-transparent opacity-40 blur-3xl -mt-20" />
        <div className="h-28 overflow-hidden relative">
          <Image
            src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80"
            alt="IoT registration"
            width={1200}
            height={320}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/45 to-transparent" />
        </div>

        <div className="p-8 pt-4">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-lg mb-6">
              <ShieldPlus className="h-12 w-12 text-blue-500" />
            </div>
            <div className="p-0">
              <h2 className="text-2xl font-bold text-gray-900 text-center">
                Create Account
              </h2>
              <p className="text-center text-gray-500 mt-2">
                Register to access your IoT dashboard
              </p>
            </div>
          </div>

          <div className="space-y-4 p-0">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <div className="relative">
                <input
                  className="bg-gray-50 border-gray-200 text-gray-900 h-12 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/50 focus:border-blue-500 w-full pl-10 pr-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border"
                  placeholder="Your full name"
                />
                <UserRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                className="bg-gray-50 border-gray-200 text-gray-900 h-12 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/50 focus:border-blue-500 w-full px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border"
                placeholder="you@example.com"
                type="email"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <div className="relative">
                <input
                  className="bg-gray-50 border-gray-200 text-gray-900 h-12 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/50 focus:border-blue-500 w-full pl-10 pr-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border"
                  placeholder="+7 777 123 45 67"
                  type="tel"
                />
                <Phone className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="bg-gray-50 border-gray-200 text-gray-900 pr-12 h-12 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/50 focus:border-blue-500 w-full px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 inline-flex items-center justify-center rounded-md transition-colors h-9 px-3"
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

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="bg-gray-50 border-gray-200 text-gray-900 pr-12 h-12 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500/50 focus:border-blue-500 w-full px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border"
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 inline-flex items-center justify-center rounded-md transition-colors h-9 px-3"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password value"
                      : "Show confirm password value"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button className="w-full h-12 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-blue-100 active:scale-[0.98] inline-flex items-center justify-center whitespace-nowrap text-sm">
              Create Account
            </button>
          </div>

          <div className="p-0 mt-6">
            <p className="text-sm text-center text-gray-500 w-full">
              Already have an account?{" "}
              <Link href="/" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
