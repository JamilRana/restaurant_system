"use client";
import React from "react";

const Footer = () => {
  return (
    <footer className="bg-[#060b1d] text-white py-4 text-sm">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        {/* Left */}
        <p className="mb-2 md:mb-0">
          Order.uk Copyright 2025, All Rights Reserved.
        </p>

        {/* Right */}
        <div className="flex flex-wrap justify-center gap-4">
          {/* <a href="#" className="hover:underline text-center"> */}
            Do not sell or share my personal information
          {/* </a> */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
