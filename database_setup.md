# 数据库表结构说明

## 1. 情绪日志表 (emotion_logs)

```sql
CREATE TABLE IF NOT EXISTS emotion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_input TEXT NOT NULL,
  ai_result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emotion_logs_user_id ON emotion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_created_at ON emotion_logs(created_at DESC);
```

## 2. 测试账号表 (test_accounts)

```sql
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
```

## 3. 账号使用记录表 (account_usage)

```sql
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

## 生成测试账号

在浏览器控制台中运行以下代码（需要先配置 Supabase）：

```javascript
// 在浏览器控制台中运行
import { generateTestAccounts } from './services/accountService';

// 假设你已经有了 supabaseUrl 和 supabaseKey
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';

generateTestAccounts(supabaseUrl, supabaseKey)
  .then(accounts => {
    console.log('✅ 成功生成10个测试账号:');
    accounts.forEach(acc => {
      console.log(`用户名: ${acc.username}, 密码: ${acc.password}`);
    });
  })
  .catch(err => {
    console.error('❌ 生成失败:', err);
  });
```

或者使用 Supabase SQL Editor 直接插入：

```sql
-- 生成10个测试账号（有效期30天）
INSERT INTO test_accounts (username, password, expires_at, daily_limit)
SELECT 
  'test' || LPAD(seq::text, 2, '0') as username,
  'pass' || LPAD(seq::text, 2, '0') as password,
  NOW() + INTERVAL '30 days' as expires_at,
  15 as daily_limit
FROM generate_series(1, 10) as seq;
```

## 测试账号列表

生成后，账号信息如下：

| 用户名 | 密码 | 每日限制 | 有效期 |
|--------|------|----------|--------|
| test01 | pass01 | 15次 | 30天 |
| test02 | pass02 | 15次 | 30天 |
| ... | ... | ... | ... |
| test10 | pass10 | 15次 | 30天 |

## 修改账号限制

可以通过 Supabase Dashboard 或 SQL 直接修改：

```sql
-- 修改某个账号的每日限制
UPDATE test_accounts 
SET daily_limit = 20 
WHERE username = 'test01';

-- 延长账号有效期
UPDATE test_accounts 
SET expires_at = expires_at + INTERVAL '30 days' 
WHERE username = 'test01';

-- 重置今日使用次数
DELETE FROM account_usage 
WHERE account_id = (SELECT id FROM test_accounts WHERE username = 'test01')
  AND date = CURRENT_DATE;
```

