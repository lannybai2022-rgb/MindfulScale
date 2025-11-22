# 部署指南

## 🚀 部署到 GitHub 和在线访问

### 方法一：使用 Vercel（推荐，最简单）

#### 1. 推送代码到 GitHub

```bash
# 初始化 git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: MindfulScale app"

# 在 GitHub 上创建新仓库，然后添加远程地址
# 替换 YOUR_USERNAME 和 YOUR_REPO_NAME
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送代码
git branch -M main
git push -u origin main
```

#### 2. 在 Vercel 部署

1. 访问 https://vercel.com
2. 使用 GitHub 账号登录
3. 点击 **"Add New Project"**
4. 选择你的 GitHub 仓库
5. 配置：
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (默认)
   - **Build Command**: `npm run build` (默认)
   - **Output Directory**: `dist` (默认)
6. 点击 **"Deploy"**

**完成！** 几分钟后，你会得到一个在线访问链接，例如：`https://your-app.vercel.app`

---

### 方法二：使用 Netlify

#### 1. 推送代码到 GitHub（同上）

#### 2. 在 Netlify 部署

1. 访问 https://netlify.com
2. 使用 GitHub 账号登录
3. 点击 **"Add new site"** > **"Import an existing project"**
4. 选择你的 GitHub 仓库
5. 配置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. 点击 **"Deploy site"**

**完成！** 你会得到一个链接，例如：`https://your-app.netlify.app`

---

### 方法三：使用 GitHub Pages

#### 1. 安装 gh-pages

```bash
npm install --save-dev gh-pages
```

#### 2. 更新 package.json

在 `scripts` 中添加：

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "npm run build && gh-pages -d dist"
}
```

#### 3. 更新 vite.config.ts

```typescript
export default defineConfig({
  base: '/YOUR_REPO_NAME/', // 替换为你的仓库名
  // ... 其他配置
});
```

#### 4. 部署

```bash
npm run deploy
```

#### 5. 在 GitHub 设置 Pages

1. 进入仓库的 **Settings** > **Pages**
2. **Source** 选择 `gh-pages` 分支
3. 保存

访问地址：`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

---

## ⚙️ 环境变量配置

### 在 Vercel 配置环境变量

1. 进入项目设置
2. 点击 **Environment Variables**
3. 添加（如果需要）：
   - `GEMINI_API_KEY` - DeepSeek API Key

**注意**：Supabase URL 和 Key 是在应用内配置的，存储在浏览器 localStorage 中，不需要环境变量。

### 在 Netlify 配置环境变量

1. 进入项目设置
2. 点击 **Environment variables**
3. 添加环境变量（同上）

---

## 📝 重要提示

1. **不要提交敏感信息**
   - `.env` 文件已在 `.gitignore` 中
   - Supabase 和 DeepSeek 的 Key 在应用内配置，不会提交到代码库

2. **首次使用需要配置**
   - 用户首次访问需要在应用中配置 Supabase 和 DeepSeek API Key
   - 这些信息存储在浏览器 localStorage 中

3. **数据库设置**
   - 确保 Supabase 数据库已正确配置
   - 参考 `SETUP_GUIDE.md` 和 `UPGRADE_EXISTING_DB.md`

---

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

---

## 🆘 常见问题

### Q: 部署后页面空白？
- 检查 `vite.config.ts` 中的 `base` 配置
- 确保构建成功（检查 `dist` 目录）

### Q: API 调用失败？
- 检查 CORS 设置
- 确认 Supabase 和 DeepSeek API Key 已正确配置

### Q: 路由不工作？
- Vercel/Netlify 已配置重定向规则
- 确保所有路由都指向 `index.html`

---

**推荐使用 Vercel，最简单快速！** 🚀

