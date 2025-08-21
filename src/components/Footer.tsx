// components/Footer.tsx
"use client";

import React from "react";

const Footer = () => {
  return (
    <footer className="left-0 right-0 bg-black text-white p-4 z-10">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-center md:text-left">
        <p className="mb-2 md:mb-0">
          Order.uk Copyright 2025, All Rights Reserved.
        </p>
        <div>Do not sell or share my personal information</div>
      </div>
    </footer>
  );
};

export default Footer;
