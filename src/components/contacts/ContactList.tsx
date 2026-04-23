/**
 * 通讯录列表组件
 * 按分组展示联系人，支持搜索
 * @author skylark
 */

"use client";

import { useState } from "react";
import { Search, UserPlus, ChevronDown, ChevronRight } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { User } from "@/lib/types";

interface ContactGroup {
  name: string;
  contacts: (User & { group_name?: string })[];
}

interface ContactListProps {
  groups: ContactGroup[];
  onSelectContact: (user: User) => void;
  selectedId?: string;
}

export default function ContactList({ groups, onSelectContact, selectedId }: ContactListProps) {
  const [searchText, setSearchText] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  /** 切换分组折叠 */
  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  /** 过滤联系人 */
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      contacts: g.contacts.filter((c) =>
        searchText ? c.name.toLowerCase().includes(searchText.toLowerCase()) : true
      ),
    }))
    .filter((g) => g.contacts.length > 0);

  /** 在线状态指示 */
  const statusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-success";
      case "busy": return "bg-danger";
      case "away": return "bg-warning";
      default: return "bg-gray-300";
    }
  };

  return (
    <div className="w-72 h-full border-r border-panel-border bg-panel-bg flex flex-col flex-shrink-0">
      {/* 顶部标题栏 */}
      <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 border-b border-panel-border">
        <h2 className="text-base font-semibold text-text-primary">通讯录</h2>
        <button
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary
            hover:bg-list-hover transition-colors"
          title="添加联系人"
        >
          <UserPlus size={18} />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder" />
          <input
            type="text"
            placeholder="搜索联系人"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-page border-none outline-none
              text-sm text-text-primary placeholder:text-text-placeholder"
          />
        </div>
      </div>

      {/* 联系人分组列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.name);
          return (
            <div key={group.name}>
              {/* 分组标题 */}
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center gap-1 px-4 py-2 text-xs font-medium text-text-secondary
                  hover:bg-list-hover transition-colors"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>{group.name}</span>
                <span className="text-text-placeholder ml-1">({group.contacts.length})</span>
              </button>

              {/* 联系人列表 */}
              {!isCollapsed &&
                group.contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => onSelectContact(contact)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left
                      ${selectedId === contact.id ? "bg-list-active" : "hover:bg-list-hover"}`}
                  >
                    <div className="relative">
                      <Avatar name={contact.name} avatarUrl={contact.avatar_url} size="sm" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-panel-bg
                          ${statusColor(contact.status)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary">{contact.name}</span>
                    </div>
                  </button>
                ))}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="py-12 text-center text-text-placeholder text-sm">
            暂无联系人
          </div>
        )}
      </div>
    </div>
  );
}
