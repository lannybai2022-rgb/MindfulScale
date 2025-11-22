# 在现有数据库基础上添加账号系统

## 📋 说明

如果你已经有 `emotion_logs` 表，只需要：
1. **检查并添加 `user_id` 字段**（如果还没有）
2. **创建两个新表**：`test_accounts` 和 `account_usage`
3. **生成测试账号**

---

## 🔍 第一步：检查现有表结构

在 Supabase SQL Editor 中执行，查看现有表结构：

```sql
-- 查看 emotion_logs 表结构
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'emotion_logs'
ORDER BY ordinal_position;
```

**检查是否有 `user_id` 字段：**
- ✅ 如果有 `user_id` 字段 → 跳到第二步
- ❌ 如果没有 `user_id` 字段 → 需要先添加

---

## 🔧 第二步：添加 user_id 字段（如果需要）

**如果 emotion_logs 表没有 `user_id` 字段，执行以下 SQL：**

```sql
-- 添加 user_id 字段
ALTER TABLE emotion_logs 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 为现有数据设置默认值（如果表中有旧数据）
UPDATE emotion_logs 
SET user_id = 'guest_001' 
WHERE user_id IS NULL;

-- 设置 NOT NULL 约束（可选，如果希望强制要求）
-- ALTER TABLE emotion_logs ALTER COLUMN user_id SET NOT NULL;

-- 创建索引（如果还没有）
CREATE INDEX IF NOT EXISTS idx_emotion_logs_user_id ON emotion_logs(user_id);
```

---

## 🆕 第三步：创建新表

**执行以下 SQL，创建账号相关的两个新表：**

```sql
-- 1. 测试账号表
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

-- 2. 账号使用记录表
CREATE TABLE IF NOT EXISTS account_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES test_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(account_id, date)
);

CREATE INDEX IF NOT EXISTS idx_account_usage_account_id ON account_usage(account_id);
CREATE INDEX IF NOT EXISTS idx_account_usage_date ON account_usage(date);
```

---

## 👥 第四步：生成测试账号

**执行以下 SQL 生成10个测试账号：**

```sql
-- 生成10个测试账号（有效期30天）
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

## 🔐 第五步：配置 RLS（Row Level Security）

**如果你的 emotion_logs 表已启用 RLS，需要更新策略以支持新账号系统：**

### 5.1 检查是否启用了 RLS

```sql
-- 检查 RLS 是否启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'emotion_logs';
```

### 5.2 如果需要，更新 RLS 策略

**允许用户查看自己的数据：**

```sql
-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view own logs" ON emotion_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON emotion_logs;

-- 创建新策略：允许通过 user_id 访问
CREATE POLICY "Users can view own logs" ON emotion_logs
  FOR SELECT
  USING (true);  -- 或者使用更严格的策略：auth.uid()::text = user_id

CREATE POLICY "Users can insert own logs" ON emotion_logs
  FOR INSERT
  WITH CHECK (true);  -- 或者使用更严格的策略：auth.uid()::text = user_id
```

**注意：** 如果你的应用使用 Supabase Auth，可能需要调整策略。这里使用 `true` 允许所有操作，因为账号系统是独立的。

### 5.3 为新表启用 RLS（可选）

```sql
-- 为 test_accounts 启用 RLS
ALTER TABLE test_accounts ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看和插入（因为这是测试账号系统）
CREATE POLICY "Allow all operations on test_accounts" ON test_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 为 account_usage 启用 RLS
ALTER TABLE account_usage ENABLE ROW LEVEL SECURITY;

-- 允许所有人操作
CREATE POLICY "Allow all operations on account_usage" ON account_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

---

## ✅ 第六步：验证设置

**执行以下查询验证所有设置：**

```sql
-- 1. 验证 emotion_logs 表有 user_id 字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'emotion_logs' AND column_name = 'user_id';

-- 2. 验证新表已创建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('test_accounts', 'account_usage');

-- 3. 验证测试账号已创建
SELECT username, password, expires_at, daily_limit, is_active 
FROM test_accounts 
ORDER BY username;

-- 应该看到10行数据
```

---

## 📝 完整 SQL 脚本（一键执行）

**如果你想一次性执行所有操作，可以使用以下完整脚本：**

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

-- 5. 验证结果
SELECT 
  'emotion_logs' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'emotion_logs' AND column_name = 'user_id') as has_user_id
FROM emotion_logs
UNION ALL
SELECT 
  'test_accounts' as table_name,
  COUNT(*) as row_count,
  0 as has_user_id
FROM test_accounts;
```

---

## 🎯 执行顺序建议

1. **先执行检查 SQL**（第一步），确认表结构
2. **如果需要，添加 user_id 字段**（第二步）
3. **创建新表**（第三步）
4. **生成测试账号**（第四步）
5. **配置 RLS**（第五步，如果需要）
6. **验证设置**（第六步）

---

## ⚠️ 注意事项

1. **现有数据不会丢失**：所有操作都使用 `IF NOT EXISTS` 和 `ON CONFLICT DO NOTHING`，不会影响现有数据
2. **user_id 字段**：如果表中有旧数据，会被设置为 `'guest_001'`，新数据会使用实际账号 ID
3. **RLS 策略**：如果你的表已启用 RLS，可能需要调整策略以支持新账号系统
4. **测试账号**：如果之前已经生成过测试账号，`ON CONFLICT DO NOTHING` 会跳过重复插入

---

## 🚀 完成后

完成以上步骤后，你就可以：
1. 在应用中配置 Supabase URL 和 Key
2. 使用测试账号登录（test01/pass01 等）
3. 开始使用账号系统

**详细使用说明请参考 `SETUP_GUIDE.md`**

