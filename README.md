# Bob Lee · Hugo 个人博客

一个 Hugo 网站，两种阅读方式：随笔按年份呈现文字列表，技术与小乐趣使用封面、标题和简介卡片。首页以自我介绍为主，通过导航和正文链接进入随笔、日志、技术与小乐趣栏目。日志按年份呈现文字列表。

## 本地预览

固定的 Hugo 版本记录在 `.hugo-version`，目前是 **0.166.0**。本主题不依赖 Node.js、Go Modules、外部主题或 Sass。推荐本地和 GitHub Actions 使用相同版本。

本机已准备 `.tools/hugo`（通过 Homebrew 官方镜像下载并校验 SHA-256，仅供当前 macOS 使用，已被 Git 忽略）：

```sh
.tools/hugo server -D
```

打开终端显示的本地网址，通常为 `http://localhost:1313/`。`-D` 会包含草稿。

如果系统已安装匹配版本的 Hugo，可以直接执行 `hugo server -D`。macOS 可通过 `brew install hugo` 安装；安装后用 `hugo version` 确认版本，升级时一起更新 `.hugo-version` 并重新检查构建。

## 写文章

日志、随笔和技术栏目已各准备 2023—2026 年的示例文章，共 12 篇。入口为 `content/栏目/年份/example/index.md`，栏目分别对应 `journal`、`essays`、`tech`。每篇正文都包含修改教程，可以直接替换为自己的文章。

示例使用 `draft: false`，会显示在列表、RSS 和正式网站中；它们的日期仅用于展示年份。正式写作时请修改标题、日期、简介、标签和正文，去掉“待填写（编辑教程）”。年份分组依据文章的 `date`，并非文件夹名称。只想暂存、不想公开时改为 `draft: true`，使用 `-D` 本地预览。

新建随笔：

```sh
.tools/hugo new content essays/my-note/index.md
```

新建日志：

```sh
.tools/hugo new content journal/my-day/index.md
```

新建技术文章：

```sh
.tools/hugo new content tech/my-project/index.md
```

新建小乐趣：

```sh
.tools/hugo new content fun/my-project/index.md
```

在技术文章或小乐趣文件夹放入 `cover.jpg`、`cover.png` 或其他 Hugo 支持的 `cover.*` 图片。列表和详情页会自动使用它。没有图片时显示标签文字背景，不会产生破图。

文章开头的 YAML 信息示例：

```yaml
---
title: 文章标题
date: 2026-09-27T20:00:00+08:00
draft: true
description: 技术列表中显示的一两句介绍。
tags: [JavaScript, Canvas]
demo: demos/fireworks/
---
```

`demo` 是可选字段，供技术文章和小乐趣使用。随笔不需要封面和简介。草稿确认完成后将 `draft` 改为 `false`，并使用不晚于构建时间的发布日期。正式构建不会加入草稿或未来日期文章。

正文使用 Markdown；与文章有关的图片放在同一目录，使用 `![说明](image.png)` 引用。按相同路径修改已有文章可保留原网址。

## 发布到 GitHub Pages

自动发布流程已放在 `.github/workflows/pages.yml`：`main` 分支收到 push 时构建并部署；拉取请求只检查构建，不部署。

1. 创建或选择 GitHub 仓库。个人主页仓库叫 `用户名.github.io`，对应 `https://用户名.github.io/`；普通仓库对应 `https://用户名.github.io/仓库名/`。
2. 将本项目源码上传到仓库的 `main` 分支。包括隐藏的 `.github` 文件夹、`hugo.toml`、`layouts`、`assets`、`archetypes`、`content`、`static` 和 `.hugo-version`。不要上传 `.tools`、`public` 或缓存。
3. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 在 **Actions → Build and deploy Hugo blog** 手动运行一次，或再向 `main` 推送一次修改。
5. 等待构建和部署均成功，在 Pages 设置或部署任务中打开网址。

工作流通过 GitHub Pages 输出获取实际 `baseURL`，兼容根域名和仓库子路径。`hugo.toml` 里的 `https://example.org/` 是尚未选定仓库时的占位值；确定地址后应改为正式地址，以便手动构建也能产生正确的 canonical、RSS 与 sitemap。自动部署时会覆盖该值。

工作流下载固定版本的官方 Hugo，检查发布文件的 SHA-256，构建后上传 Pages artifact，再由 GitHub Pages 托管。读者不需要安装 Hugo，也不需要你保持电脑开机。

如果仓库限制了 Actions 或 Pages，需要先在仓库设置中启用。不要将私人草稿或凭证提交到公开源码仓库；`draft: true` 仅阻止生成网页，不会隐藏 Git 仓库中的 Markdown。

## 修改布局

| 文件 | 用途 |
| --- | --- |
| `hugo.toml` | 名称、简介、语言、菜单、标签和输出配置 |
| `layouts/baseof.html` | 页头、导航、元信息和页脚 |
| `content/_index.md` | 首页中英文自我介绍，分别在两个 `biography` 区块内用 Markdown 编辑 |
| `layouts/home.html` | 首页自我介绍排版；头像与导航由公共页头提供 |
| `layouts/essays/section.html` | 随笔的年份和文字列表 |
| `layouts/tech/section.html` | 技术文章卡片和分页 |
| `layouts/fun/section.html` | 小乐趣卡片和分页 |
| `layouts/page.html` | 文章详情，按栏目决定封面、目录和演示入口 |
| `assets/css/site.css` | 全站样式与手机适配 |
| `static/demos/` | 当前正式使用的四个互动页面 |

## 原项目与内容来源

迁移已完成，旧 HTML、CSS、JavaScript、字体、图片、`程序` 目录、旧图标和旧架构说明已于 2026-09-28 经确认删除。部署只使用 Hugo 构建出的 `public` 目录。

旧文章「关于设计」和个人介绍来自原 HTML。小乐趣中的三篇说明基于已有演示的代码整理，封面是运行演示后拍摄的截图。文章目前使用本次迁移日期 2026-09-27，可自行改成真实发布日期。未生成个人经历或虚构生活随笔。

互动页面统一维护在 `static/demos/`。三篇文章及封面位于 `content/fun/`，旧 `/tech/文章名/` 地址会跳转到对应新地址。星辰漩涡仍通过外部 CDN 加载 Three.js，其他三个演示不需要外部脚本。

## 构建

```sh
.tools/hugo build --gc --minify --panicOnWarning
```

输出位于 `public/`。仅在正式部署配置完成且 GitHub Actions 成功后，才算完成线上发布。

## 本次本地验证（2026-09-27）

- Hugo 0.166.0 正式构建成功，无警告。
- 1440px 桌面和 390px 手机视口检查：首页、两个栏目、文章、关于和标签页均正常加载，未发现横向溢出、破图或页面脚本错误。
- 根域名与 `/Personal_Blog/` 子路径分别检查 245 个本地引用，文件与锚点均存在。
- 小乐趣卡片 → 文章 → 演示，以及关于 → 万圣节 → 返回博客，导航通过。
- 临时草稿未出现在正式构建的 HTML 或订阅输出中。
- GitHub Actions 的远程构建、仓库权限与公开网址尚待选择仓库并实际部署后验证。
