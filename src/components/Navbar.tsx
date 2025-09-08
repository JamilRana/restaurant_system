"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  adminLinks,
  customerLinks,
  defaultLinks,
  kitchenLinks,
} from "@/app/data";
import { useRestaurantStore } from "@/app/store/restaurantStore";

const Navbar = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const rest = useRestaurantStore();
  const [links, setLinks] = useState(defaultLinks);

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

  return (
    <div className="flex justify-between sticky top-0 z-50 items-center px-6 py-4 bg-[#F2F2F2] shadow-sm">
      {/* LOGO */}
      <div className="flex items-center text-sm md:text-3xl font-bold">
        <Link href="/" key={rest.restaurant?.email} className="text-[#000]">
          {rest.restaurant?.name}
          <span className="bg-orange-500 text-white text-sm font-bold px-1 py-0.5 rounded-sm ml-1">
            .uk
          </span>
        </Link>
      </div>

      {/* LEFT LINKS */}
      <div className="hidden md:flex space-x-8 font-medium text-black">
        {links.map((item) => (
          <Link href={item.url} key={item.id} className="hover:text-orange-600">
            {item.title}
          </Link>
        ))}
      </div>

      {/* MOBILE MENU */}
      <div className="md:hidden">
        <Image
          src={open ? "/close.png" : "/open.png"}
          alt=""
          width={28}
          height={28}
          className="cursor-pointer"
          onClick={() => setOpen((prev) => !prev)}
        />
        {open && (
          <div className="absolute mt-4 bg-orange-600 text-white left-0 top-30 w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-8 text-2xl z-10">
            {links.map((item) => (
              <Link
                href={item.url}
                key={item.id}
                onClick={() => setOpen(false)}
              >
                {item.title}
              </Link>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                user ? signOut({ callbackUrl: "/" }) : signIn();
              }}
              className="bg-white text-orange-600 px-4 py-2 rounded"
            >
              {user ? "Logout" : "Login/Signup"}
            </button>
          </div>
        )}
      </div>

      {/* RIGHT AUTH & CART */}
      <div className="hidden md:flex items-center gap-4">
        {user ? (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-orange-600 transition"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => signIn()}
            className="bg-[#030222] text-white px-4 py-2 rounded-full hover:bg-orange-600 transition"
          >
            Login/Signup
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
