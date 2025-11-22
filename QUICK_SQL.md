# 快速 SQL 脚本（直接复制使用）

## ⚠️ 重要提示
**只复制 SQL 语句，不要复制 ```sql 和 ``` 这些标记！**

---

## 1️⃣ 检查现有表结构

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'emotion_logs'
ORDER BY ordinal_position;
```

---

## 2️⃣ 一键升级脚本（推荐）

**直接复制下面的 SQL，不要复制 ```sql 标记！**

```sql
-- ============================================
-- 在现有 emotion_logs 表基础上添加账号系统
-- ============================================

-- 1. 添加 user_id 字段（如果不存在）
ALTER TABLE emotion_logs 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 为现有数据设置默认值
UPDATE emotion_logs 
SET user_id = 'guest_001' 
WHERE user_id IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_emotion_logs_user_id ON emotion_logs(user_id);

-- 2. 创建测试账号表
CREATE TABLE IF NOT EXISTS test_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 15,
  daily_usage JSONB DEFAULT '{}',
  total_usage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_test_accounts_username ON test_accounts(username);
CREATE INDEX IF NOT EXISTS idx_test_accounts_is_active ON test_accounts(is_active);

-- 3. 创建账号使用记录表
CREATE TABLE IF NOT EXISTS account_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES test_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(account_id, date)
);

CREATE INDEX IF NOT EXISTS idx_account_usage_account_id ON account_usage(account_id);
CREATE INDEX IF NOT EXISTS idx_account_usage_date ON account_usage(date);

-- 4. 生成10个测试账号
INSERT INTO test_accounts (username, password, expires_at, daily_limit)
SELECT 
  'test' || LPAD(seq::text, 2, '0') as username,
  'pass' || LPAD(seq::text, 2, '0') as password,
  NOW() + INTERVAL '30 days' as expires_at,
  15 as daily_limit
FROM generate_series(1, 10) as seq
ON CONFLICT (username) DO NOTHING;
```

---

## 3️⃣ 验证结果

```sql
-- 验证测试账号已创建
SELECT username, password, expires_at, daily_limit 
FROM test_accounts 
ORDER BY username;
```

**应该看到10行数据：test01-test10**

---

## 📝 使用说明

1. **打开 Supabase SQL Editor**
2. **点击 "New query"**
3. **只复制 SQL 语句部分**（从 `--` 注释开始，到最后一个 `;` 结束）
4. **不要复制 ```sql 和 ```**
5. **点击 "Run" 执行**

---

## ✅ 执行成功标志

- 看到 "Success" 提示
- 或者看到 "Success. No rows returned"
- 执行验证查询能看到10个测试账号

