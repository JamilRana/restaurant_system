// components/Navbar.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  adminLinks,
  customerLinks,
  defaultLinks,
  kitchenLinks,
} from "@/app/data";
import { useRestaurantStore } from "@/app/store/restaurantStore";
import Pusher from "pusher-js";

const Navbar = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const rest = useRestaurantStore();
  const [links, setLinks] = useState(defaultLinks);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  // Audio notification
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);

  // Set navigation links based on role
  useEffect(() => {
    if (!session) {
      setLinks(defaultLinks);
      return;
    }

    switch (session.user.role) {
      case "ADMIN":
        setLinks(adminLinks);
        break;
      case "KITCHEN":
        setLinks(kitchenLinks);
        break;
      case "CUSTOMER":
        setLinks(customerLinks);
        break;
      default:
        setLinks(defaultLinks);
    }
  }, [session]);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/notification.mp3");
      // Allow audio to play without user interaction
      audioRef.current.volume = 0.7;
    }
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    if (isNotificationEnabled && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .catch((e) => console.log("Audio play failed:", e));
      } catch (e) {
        console.log("Audio play error:", e);
      }
    }
  };

  // Start continuous notification
  const startContinuousNotification = () => {
    if (notificationIntervalRef.current) return;

    playNotificationSound(); // Play immediately
    notificationIntervalRef.current = setInterval(() => {
      playNotificationSound();
    }, 8000); // Repeat every 8 seconds
  };

  // Stop continuous notification
  const stopContinuousNotification = () => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopContinuousNotification();
    };
  }, []);

  // Fetch initial new orders count
  const fetchNewOrdersCount = async () => {
    if (!session || session.user.role !== "ADMIN") {
      setNewOrdersCount(0);
      stopContinuousNotification();
      return;
    }

    try {
      const res = await fetch("/api/admin/orders/count?status=PLACED");
      if (res.ok) {
        const data = await res.json();
        setNewOrdersCount(data.count);

        // Start notification if there are new orders
        if (data.count > 0) {
          startContinuousNotification();
        } else {
          stopContinuousNotification();
        }
      }
    } catch (error) {
      console.error("Failed to fetch new orders count:", error);
    }
  };

  // Set up Pusher for real-time updates
  useEffect(() => {
    fetchNewOrdersCount();

    if (session?.user.role === "ADMIN" && session.user.restaurantId) {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
      });

      const channel = pusher.subscribe(
        `restaurant-${session.user.restaurantId}`
      );

      // New order created
      channel.bind("order-created", () => {
        setNewOrdersCount((prev) => {
          const newCount = prev + 1;
          if (newCount === 1) {
            startContinuousNotification();
          }
          return newCount;
        });
      });

      // Order status updated
      channel.bind("order-updated", (updatedOrder: any) => {
        if (updatedOrder.status !== "PLACED") {
          setNewOrdersCount((prev) => {
            const newCount = Math.max(0, prev - 1);
            if (newCount === 0) {
              stopContinuousNotification();
            }
            return newCount;
          });
        }
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
        pusher.disconnect();
        stopContinuousNotification();
      };
    } else {
      stopContinuousNotification();
    }
  }, [session, isNotificationEnabled]);

  const handleLogout = () => {
    setOpen(false);
    signOut({ callbackUrl: "/" });
  };

  const handleAuth = () => {
    setOpen(false);
    signIn();
  };

  return (
    <div className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200/50 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LOGO - Apple-style minimal */}
          <div className="flex-shrink-0 flex items-center">
            <Link
              href="/"
              className="text-gray-900 font-semibold text-lg tracking-tight hover:text-gray-700 transition-colors"
            >
              {rest.restaurant?.name}
              <span className="ml-1.5 text-orange-500 font-normal">.uk</span>
            </Link>
          </div>

          {/* DESKTOP NAVIGATION - Apple menu style */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className="px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-100/50 transition-all duration-200 relative group"
              >
                {item.title}
                {/* Apple-style dot indicator for new orders */}
                {item.title === "Orders" &&
                  session?.user.role === "ADMIN" &&
                  newOrdersCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
              </Link>
            ))}
          </div>

          {/* DESKTOP RIGHT SECTION */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-red-600 hover:bg-red-50/30 transition-all duration-200"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            ) : (
              <button
                onClick={handleAuth}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-100/50 transition-all duration-200"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Login
              </button>
            )}
          </div>

          {/* MOBILE MENU BUTTON - Apple-style */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 transition-colors"
              aria-label="Main menu"
            >
              <span className="sr-only">Open main menu</span>
              {open ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU - Full screen Apple style */}
      {open && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40">
            <div
              className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            ></div>
            <div className="relative flex flex-col w-full max-w-xs bg-white/95 backdrop-blur-xl border-r border-gray-200/30 shadow-xl">
              <div className="flex-1 pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center justify-between px-4">
                  <div className="text-gray-900 font-semibold text-lg">
                    {rest.restaurant?.name}
                    <span className="ml-1.5 text-orange-500 font-normal">
                      .uk
                    </span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
                  >
                    <svg
                      className="h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-5 px-2 space-y-1">
                  {links.map((item) => (
                    <Link
                      key={item.id}
                      href={item.url}
                      onClick={() => setOpen(false)}
                      className="group flex items-center px-3 py-3 text-base font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-100/50 transition-colors relative"
                    >
                      {item.title}
                      {/* Mobile order indicator */}
                      {item.title === "Orders" &&
                        session?.user.role === "ADMIN" &&
                        newOrdersCount > 0 && (
                          <span className="ml-2 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center text-white text-xs font-bold">
                              {newOrdersCount > 9 ? "9+" : newOrdersCount}
                            </span>
                          </span>
                        )}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200/30 p-4">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors"
                  >
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={handleAuth}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-black shadow-sm transition-colors"
                  >
                    Login / Signup
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
