/**
 * 字段类型图标与名称映射
 * @author skylark
 */

"use client";

import {
  Type, Hash, Calendar, CheckSquare, List, ListChecks,
  Link, Mail, Phone, Star, Percent, User,
  Clock, RefreshCw,
} from "lucide-react";
import type { BaseFieldType } from "@/lib/types";

/** 字段类型配置表 */
export const FIELD_TYPE_CONFIG: Record<BaseFieldType, { label: string; icon: typeof Type; color: string }> = {
  text:         { label: "文本",     icon: Type,       color: "text-blue-500" },
  number:       { label: "数字",     icon: Hash,       color: "text-purple-500" },
  date:         { label: "日期",     icon: Calendar,   color: "text-orange-500" },
  checkbox:     { label: "复选框",   icon: CheckSquare, color: "text-green-500" },
  select:       { label: "单选",     icon: List,       color: "text-cyan-500" },
  multi_select: { label: "多选",     icon: ListChecks, color: "text-teal-500" },
  url:          { label: "超链接",   icon: Link,       color: "text-indigo-500" },
  email:        { label: "邮箱",     icon: Mail,       color: "text-red-400" },
  phone:        { label: "电话",     icon: Phone,      color: "text-emerald-500" },
  rating:       { label: "评分",     icon: Star,       color: "text-yellow-500" },
  progress:     { label: "进度",     icon: Percent,    color: "text-lime-500" },
  member:       { label: "人员",     icon: User,       color: "text-pink-500" },
  created_at:   { label: "创建时间", icon: Clock,      color: "text-gray-400" },
  updated_at:   { label: "更新时间", icon: RefreshCw,  color: "text-gray-400" },
};

/** 所有可供用户添加的字段类型 */
export const ADDABLE_FIELD_TYPES: BaseFieldType[] = [
  'text', 'number', 'date', 'checkbox', 'select', 'multi_select',
  'url', 'email', 'phone', 'rating', 'progress', 'member',
];

interface FieldTypeIconProps {
  type: BaseFieldType;
  size?: number;
}

export default function FieldTypeIcon({ type, size = 14 }: FieldTypeIconProps) {
  const config = FIELD_TYPE_CONFIG[type];
  if (!config) return null;
  const Icon = config.icon;
  return <Icon size={size} className={config.color} />;
}
