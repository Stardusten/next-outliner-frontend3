import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stringToUnicode(str: string) {
  let unicodeString = "";
  for (let i = 0; i < str.length; i++) {
    // 获取字符的十进制 Unicode 码点
    const code = str.charCodeAt(i);
    // 转换为十六进制字符串
    const hexCode = code.toString(16);
    // 使用 padStart 补全为4位，例如 '4e2d' -> '4e2d', '43' -> '0043'
    const paddedHex = hexCode.padStart(4, "0");
    // 拼接成 \uXXXX 格式
    unicodeString += "\\u" + paddedHex;
  }
  return unicodeString;
}
