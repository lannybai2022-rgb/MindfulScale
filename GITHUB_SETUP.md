# GitHub 设置和部署快速指引

## 📦 第一步：创建 GitHub 仓库

1. 访问 https://github.com
2. 登录你的账号
3. 点击右上角的 **"+"** > **"New repository"**
4. 填写信息：
   - **Repository name**: `mindfulscale` (或你喜欢的名字)
   - **Description**: `AI Emotion Asset Manager - 情绪资产管理应用`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（我们已经有了）
5. 点击 **"Create repository"**

---

## 🔗 第二步：连接本地仓库并推送

复制 GitHub 显示的仓库地址（例如：`https://github.com/YOUR_USERNAME/mindfulscale.git`）

然后在终端执行：

```bash
# 添加远程仓库（替换 YOUR_USERNAME 和仓库名）
git remote add origin https://github.com/YOUR_USERNAME/mindfulscale.git

# 重命名分支为 main（如果还没有）
git branch -M main

# 推送代码
git push -u origin main
```

**如果提示需要认证**：
- 使用 GitHub Personal Access Token
- 或使用 SSH 密钥

---

## 🚀 第三步：部署到 Vercel（推荐）

### 最简单的方法：

1. 访问 https://vercel.com
2. 使用 GitHub 账号登录
3. 点击 **"Add New Project"**
4. 选择你刚创建的 GitHub 仓库
5. 配置（通常会自动检测）：
   - **Framework Preset**: Vite ✅
   - **Root Directory**: `./` ✅
   - **Build Command**: `npm run build` ✅
   - **Output Directory**: `dist` ✅
6. 点击 **"Deploy"**

**等待 1-2 分钟，你会得到一个在线链接！**

例如：`https://mindfulscale.vercel.app`

---

## 🌐 访问你的应用

部署完成后：
1. 访问 Vercel 提供的链接
2. 在应用中配置：
   - Supabase URL 和 Key
   - DeepSeek API Key
3. 使用测试账号登录（test01/pass01）

---

## 📝 后续更新代码

当你修改代码后，推送更新：

```bash
# 添加修改的文件
git add .

# 提交
git commit -m "描述你的修改"

# 推送到 GitHub
git push

# Vercel 会自动重新部署！
```

---

## ⚙️ 环境变量（如果需要）

如果你的应用需要环境变量：

1. 在 Vercel 项目设置中
2. 进入 **Settings** > **Environment Variables**
3. 添加变量（例如：`GEMINI_API_KEY`）

**注意**：MindfulScale 的配置是在应用内完成的，存储在浏览器 localStorage，不需要环境变量。

---

## 🆘 遇到问题？

### 推送失败？
- 检查 GitHub 仓库地址是否正确
- 确认有推送权限

### 部署失败？
- 检查 `package.json` 中的构建脚本
- 查看 Vercel 的构建日志

### 页面空白？
- 检查浏览器控制台错误
- 确认 Supabase 和 DeepSeek 已配置

---

**完成这些步骤后，你的应用就可以在线访问了！** 🎉

