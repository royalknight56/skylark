-- Performance indexes for common list and dashboard queries.

CREATE INDEX IF NOT EXISTS idx_org_members_org_joined ON org_members(org_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_updated ON conversations(org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_org_creator_updated ON documents(org_id, creator_id, updated_at DESC);
