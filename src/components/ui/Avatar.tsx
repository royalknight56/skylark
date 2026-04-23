/**
 * 通用头像组件
 * 支持图片和名字首字母占位
 * @author skylark
 */

"use client";

const AVATAR_COLORS = [
  "avatar-blue",
  "avatar-green",
  "avatar-orange",
  "avatar-purple",
  "avatar-red",
  "avatar-cyan",
];

/** 根据名字生成确定性颜色 */
function getColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 获取名字展示字符（取最后1-2个字） */
function getInitials(name: string): string {
  if (!name) return "?";
  return name.length <= 2 ? name : name.slice(-2);
}

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

export default function Avatar({ name, avatarUrl, size = "md", className = "" }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeMap[size]} rounded-lg object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-lg avatar-placeholder ${getColorClass(name)} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
