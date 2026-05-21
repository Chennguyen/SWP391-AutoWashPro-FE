"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Package, LogOut } from "lucide-react";

interface UserMenuProps {
  user: {
    name: string;
    avatar: string;
    email?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-xl bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center select-none hover:ring-2 hover:ring-offset-2 hover:ring-[#2563EB] transition-all"
        aria-label="Menu người dùng"
        aria-expanded={isOpen}
      >
        {user.avatar}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 border-b border-slate-100 mb-1">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email || "user@example.com"}</p>
          </div>
          
          <Link
            href="/customer/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#2563EB] transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <User size={15} />
            Tài khoản
          </Link>
          
          <Link
            href="/customer/vehicles"
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#2563EB] transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Package size={15} />
            Sản phẩm
          </Link>
          
          <div className="border-t border-slate-100 my-1"></div>
          
          <Link
            href="/auth/login"
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <LogOut size={15} />
            Đăng xuất
          </Link>
        </div>
      )}
    </div>
  );
}
