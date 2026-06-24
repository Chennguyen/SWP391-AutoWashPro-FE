import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Hàm tiện ích để hợp nhất các class CSS Tailwind một cách động, xử lý các xung đột class và các class có điều kiện.
 * Kết hợp hai công cụ `clsx` và `twMerge`.
 * 
 * @param inputs Danh sách các biểu thức class CSS hoặc mảng class có điều kiện.
 * @returns Chuỗi các class đã được gộp lại hoàn chỉnh.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}