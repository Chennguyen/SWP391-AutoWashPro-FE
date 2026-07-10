import Link from "next/link";
import { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "dark";

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
    variant?: ButtonVariant;
};

/**
 * Thành phần (Component) Button
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function Button({
    href,
    children,
    className,
    variant = "primary",
    ...props
}: ButtonProps) {
    const variants: Record<ButtonVariant, string> = {
        primary: "bg-white text-black hover:bg-gray-200 border border-white",
        secondary: "bg-gray-100 text-black hover:bg-gray-200 border border-gray-200",
        outline: "border border-white bg-transparent text-white hover:bg-white hover:text-black",
        dark: "bg-black text-white hover:bg-gray-800 border border-black",
    };

    return (
        <Link
            href={href}
            className={cn(
                "inline-flex items-center justify-center rounded-none px-5 py-3 text-sm font-semibold transition",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </Link>
    );
}