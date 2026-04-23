/**
 * 通讯录页面
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { Users, Loader2 } from "lucide-react";
import ContactList from "@/components/contacts/ContactList";
import ContactCard from "@/components/contacts/ContactCard";
import { useOrg } from "@/lib/org-context";
import type { User, Contact } from "@/lib/types";

/** 联系人 API 返回的数据结构 */
interface ContactRow extends Contact {
  contact: User;
}

export default function ContactsPage() {
  const { currentOrg } = useOrg();
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [groups, setGroups] = useState<{ name: string; contacts: User[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    setSelectedContact(null);

    fetch(`/api/contacts?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: ContactRow[] }>)
      .then((json) => {
        if (json.success && json.data) {
          /** 按 group_name 分组 */
          const groupMap = new Map<string, User[]>();
          for (const row of json.data) {
            const groupName = row.group_name || "我的联系人";
            if (!groupMap.has(groupName)) groupMap.set(groupName, []);
            groupMap.get(groupName)!.push(row.contact);
          }
          setGroups(Array.from(groupMap, ([name, contacts]) => ({ name, contacts })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg?.id, currentOrg]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ContactList
        groups={groups}
        onSelectContact={setSelectedContact}
        selectedId={selectedContact?.id}
      />
      {selectedContact ? (
        <ContactCard user={selectedContact} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-bg-page">
          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
            <Users size={32} className="text-primary" />
          </div>
          <p className="text-text-secondary text-sm">选择联系人查看详情</p>
        </div>
      )}
    </>
  );
}
