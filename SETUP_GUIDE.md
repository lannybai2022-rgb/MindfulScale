# MindfulScale 设置操作指引

## 📋 前置准备

1. **Supabase 账号**
   - 访问 https://supabase.com 注册/登录
   - 创建一个新项目

2. **DeepSeek API Key**
   - 访问 https://platform.deepseek.com 获取 API Key

---

## 🗄️ 第一步：创建数据库表

### ⚠️ 重要提示

**如果你已经有 `emotion_logs` 表：**
- 请查看 `UPGRADE_EXISTING_DB.md` 文件
- 该文件包含在现有表基础上添加账号系统的完整步骤

**如果是全新安装：**
- 继续下面的步骤

---

### 1.1 进入 Supabase SQL Editor

1. 登录 Supabase Dashboard
2. 选择你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 点击 **New query**

### 1.2 执行以下 SQL 语句

**复制并执行以下 SQL，创建3个表：**

```sql
-- 1. 情绪日志表（如果已存在可跳过）
CREATE TABLE IF NOT EXISTS emotion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_input TEXT NOT NULL,
  ai_result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emotion_logs_user_id ON emotion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_created_at ON emotion_logs(created_at DESC);

-- 2. 测试账号表
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

-- 3. 账号使用记录表
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

### 1.3 生成10个测试账号

**继续在 SQL Editor 中执行：**

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

**执行后，你应该看到 "Success. No rows returned" 或类似提示。**

### 1.4 验证账号创建成功

**执行查询验证：**

```sql
SELECT username, password, expires_at, daily_limit, is_active 
FROM test_accounts 
ORDER BY username;
```

**应该看到10行数据：**
- test01 / pass01
- test02 / pass02
- ... 
- test10 / pass10

---

## 🔑 第二步：获取 Supabase 配置信息

### 2.1 获取 Project URL

1. 在 Supabase Dashboard 中，点击左侧菜单的 **Settings** (⚙️)
2. 点击 **API**
3. 在 **Project URL** 下方，点击复制按钮
4. 格式类似：`https://xxxxxxxxxxxxx.supabase.co`

### 2.2 获取 Anon Public Key

1. 在同一页面（Settings > API）
2. 在 **Project API keys** 部分
3. 找到 **anon public** key（不是 service_role key！）
4. 点击复制按钮
5. 格式类似：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 🚀 第三步：配置应用

### 3.1 启动应用

```bash
# 安装依赖（如果还没安装）
npm install

# 启动开发服务器
npm run dev
```

### 3.2 配置设置

1. 打开浏览器访问应用（通常是 http://localhost:5173）
2. 点击右上角的 **设置图标** ⚙️
3. 填写以下信息：

   **DeepSeek API Key:**
   - 输入你的 DeepSeek API Key
   - 格式：`sk-...`

   **Supabase 数据库:**
   - **Project URL**: 粘贴第二步获取的 Project URL
   - **Anon Public Key**: 粘贴第二步获取的 anon public key

4. 点击 **保存配置** ✅

---

## 🔐 第四步：登录使用

### 4.1 登录界面

配置保存后，会显示登录界面。

### 4.2 使用测试账号登录

**可用账号：**
- 用户名：`test01` 到 `test10`
- 密码：`pass01` 到 `pass10`

例如：
- 用户名：`test01`
- 密码：`pass01`

### 4.3 登录后

- 顶部显示当前用户名和剩余使用次数
- 每日限制：15次
- 账号有效期：30天
- 可以开始记录情绪日记

---

## 📊 功能说明

### 注意力地图
- **显示范围**: 仅显示**当天**的数据
- **坐标**: 
  - Y轴：时间维度（Past/Present/Future）
  - X轴：时间（小时:分钟）
  - 颜色：紫色=Internal，橙色=External

### 使用限制
- 每次提交前会自动检查：
  - 是否达到每日15次限制
  - 账号是否过期
- 达到限制或过期时会提示，无法继续使用

---

## 🛠️ 管理账号（可选）

### 修改账号限制

在 Supabase SQL Editor 中执行：

```sql
-- 修改某个账号的每日限制为20次
UPDATE test_accounts 
SET daily_limit = 20 
WHERE username = 'test01';
```

### 延长账号有效期

```sql
-- 延长账号30天
UPDATE test_accounts 
SET expires_at = expires_at + INTERVAL '30 days' 
WHERE username = 'test01';
```

### 重置今日使用次数

```sql
-- 重置某个账号今日的使用次数
DELETE FROM account_usage 
WHERE account_id = (SELECT id FROM test_accounts WHERE username = 'test01')
  AND date = CURRENT_DATE;
```

### 查看账号使用统计

```sql
-- 查看所有账号的使用情况
SELECT 
  t.username,
  t.daily_limit,
  t.total_usage,
  t.expires_at,
  COALESCE(u.count, 0) as today_usage,
  t.daily_limit - COALESCE(u.count, 0) as remaining
FROM test_accounts t
LEFT JOIN account_usage u ON t.id = u.account_id AND u.date = CURRENT_DATE
WHERE t.is_active = true
ORDER BY t.username;
```

---

## ❓ 常见问题

### Q: 登录时提示"用户名或密码错误"
- 检查是否已执行生成测试账号的 SQL
- 确认用户名和密码格式正确（test01/pass01）

### Q: 提示"账号已过期"
- 在 SQL Editor 中延长账号有效期
- 或重新生成新账号

### Q: 提示"今日使用次数已达上限"
- 等待明天自动重置
- 或使用 SQL 重置今日使用次数

### Q: 数据没有保存到数据库
- 检查 Supabase URL 和 Key 是否正确
- 检查网络连接
- 查看浏览器控制台的错误信息

### Q: 注意力地图没有数据
- 确认今天有提交过记录
- 注意力地图只显示**当天**的数据

---

## ✅ 完成检查清单

- [ ] 已创建3个数据库表
- [ ] 已生成10个测试账号
- [ ] 已获取 Supabase URL 和 Key
- [ ] 已在应用中配置 Supabase 和 DeepSeek
- [ ] 已成功登录测试账号
- [ ] 已测试提交功能
- [ ] 已查看注意力地图（当天数据）

---

## 📝 测试账号列表

| 用户名 | 密码 | 每日限制 | 有效期 |
|--------|------|----------|--------|
| test01 | pass01 | 15次 | 30天 |
| test02 | pass02 | 15次 | 30天 |
| test03 | pass03 | 15次 | 30天 |
| test04 | pass04 | 15次 | 30天 |
| test05 | pass05 | 15次 | 30天 |
| test06 | pass06 | 15次 | 30天 |
| test07 | pass07 | 15次 | 30天 |
| test08 | pass08 | 15次 | 30天 |
| test09 | pass09 | 15次 | 30天 |
| test10 | pass10 | 15次 | 30天 |

---

**🎉 完成以上步骤后，你就可以开始使用 MindfulScale 了！**

