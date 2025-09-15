# Hugo Gallery 主题网站搭建指南

本指南将帮助你使用 Hugo 框架和 Gallery 主题搭建一个个人相册网站，并将其部署到 GitHub Pages。

## 目录

1. [准备工作](#准备工作)
2. [创建 Hugo 项目](#创建-hugo-项目)
3. [配置 Gallery 主题](#配置-gallery-主题)
4. [创建网站内容](#创建网站内容)
5. [图片管理](#图片管理)
6. [本地预览网站](#本地预览网站)
7. [部署到 GitHub Pages](#部署到-github-pages)
8. [多语言支持](#多语言支持)
9. [自定义和扩展](#自定义和扩展)
10. [常见问题解答](#常见问题解答)

## 准备工作

### 安装 Hugo

1. 访问 [Hugo 官方网站](https://gohugo.io/installation/) 下载并安装 Hugo Extended 版本（Gallery 主题需要 Hugo Extended >= 0.123.0）。
2. 安装 Git。
3. 准备一个 GitHub 账号。

## 创建 Hugo 项目

1. 创建一个新的 Hugo 站点：

```bash
# 创建新的 Hugo 站点
hugo new site my-gallery-site
cd my-gallery-site
```

2. 初始化 Git 仓库：

```bash
git init
```

## 配置 Gallery 主题

1. 添加 Gallery 主题作为 Git 子模块：

```bash
git submodule add --depth=1 https://github.com/nicokaiser/hugo-theme-gallery.git themes/gallery
```

2. 编辑 `hugo.toml` 配置文件：

```toml
baseURL = 'https://yourusername.github.io/your-repo-name/'
languageCode = 'zh-cn'
title = '我的相册网站'
theme = 'gallery'

copyright = "© Your Name"
defaultContentLanguage = "zh-cn"
disableKinds = ["taxonomy"]
enableRobotsTXT = true
timeZone = "Asia/Shanghai"
timeout = "120s"

[params]
  defaultTheme = "dark"  # 可选：light 或 dark
  description = "使用Hugo Gallery主题创建的个人相册网站"
  title = "我的相册集"
  [params.author]
    email = "your-email@example.com"
    name = "Your Name"
  [params.socialIcons]
    github = "https://github.com/yourusername/your-repo-name/"
    email = "mailto:your-email@example.com"

[outputs]
  home = ["HTML", "RSS"]
  page = ["HTML"]
  section = ["HTML"]

[imaging]
  quality = 75
  resampleFilter = "CatmullRom"
  [imaging.exif]
    disableDate = false
    disableLatLong = true
    includeFields = "ImageDescription|Orientation"

[menu]
  [[menu.footer]]
    name = "GitHub"
    url = "https://github.com/yourusername/your-repo-name/"
    weight = 3

[services]
  [services.rss]
    limit = 100
```

## 创建网站内容

1. 创建主页内容：

```bash
# 创建 content/_index.md 文件
```

```markdown
---
description: 使用Hugo Gallery主题创建的个人相册网站
title: 我的相册集
menus:
  main:
    name: 首页
    weight: -1
---
```

2. 创建关于页面：

```bash
# 创建 content/about.md 文件
```

```markdown
---
title: 关于
menus:
  main:
    weight: 100
---

## 关于本站

这是一个使用 [Hugo](https://gohugo.io/) 和 [Gallery 主题](https://github.com/nicokaiser/hugo-theme-gallery) 创建的个人相册网站。

本站展示了各种精美的照片集，包括风景、城市等类别。
```

3. 创建相册：

```bash
# 创建风景相册
mkdir -p content/landscape
```

```markdown
---
description: 收集的各种美丽风景照片，展示大自然的壮丽景色。
menus: "main"
title: 风景
categories: ["风景"]
weight: 1
params:
  theme: dark
  sort_order: desc
  sort_by: Name
---
```

4. 添加图片：

将你的图片文件放在相应的相册目录中，例如 `content/landscape/image1.jpg`、`content/landscape/image2.jpg` 等。

如果你想指定封面图片，可以在相册的 front matter 中添加：

```markdown
---
title: 风景
resources:
  - src: landscape-cover.jpg
    params:
      cover: true
---
```

## 图片管理

### 图片组织结构

在 Gallery 主题中，图片可以通过以下两种方式组织：

1. **页面资源方式**：将图片直接放在相册目录中，与 `index.md` 文件同级。
   ```
   content/
   └── landscape/
       ├── index.md
       ├── image1.jpg
       ├── image2.jpg
       └── image3.jpg
   ```

2. **子目录方式**：在相册目录下创建子目录，每个子目录包含一组相关的图片。
   ```
   content/
   └── landscape/
       ├── index.md
       ├── mountains/
       │   ├── index.md
       │   ├── mountain1.jpg
       │   └── mountain2.jpg
       └── lakes/
           ├── index.md
           ├── lake1.jpg
           └── lake2.jpg
   ```

### 图片元数据

你可以为每张图片添加元数据，包括标题、描述、日期等信息。在相册的 `index.md` 文件中使用 `resources` 字段：

```markdown
---
title: 风景
resources:
  - src: image1.jpg
    title: 雪山日出
    params:
      description: 清晨的阳光洒在雪山上
      date: 2023-05-15T08:30:00+08:00
      location: 阿尔卑斯山
  - src: image2.jpg
    title: 湖泊倒影
    params:
      description: 平静湖面上的山峰倒影
      date: 2023-06-20T16:45:00+08:00
---
```

### 图片处理

Hugo 提供了强大的图片处理功能，你可以在 `hugo.toml` 中配置图片处理参数：

```toml
[imaging]
  quality = 75  # JPEG 质量
  resampleFilter = "CatmullRom"  # 重采样滤镜
  [imaging.exif]
    disableDate = false  # 是否禁用日期信息
    disableLatLong = true  # 是否禁用位置信息
    includeFields = "ImageDescription|Orientation"  # 包含的 EXIF 字段
```

### 图片排序

你可以通过在相册的 front matter 中设置 `sort_by` 和 `sort_order` 参数来控制图片的排序：

```markdown
---
title: 风景
params:
  sort_by: Name  # 按名称排序，可选值：Name, Date
  sort_order: desc  # 降序排序，可选值：asc, desc
---
```

## 本地预览网站

运行以下命令启动本地开发服务器：

```bash
hugo server -D
```

然后在浏览器中访问 http://localhost:1313/ 预览你的网站。

## 部署到 GitHub Pages

1. 创建 GitHub 仓库：

在 GitHub 上创建一个新的仓库，名称为 `your-username/your-repo-name`。

2. 创建 GitHub Actions 工作流文件：

```bash
mkdir -p .github/workflows
```

创建 `.github/workflows/hugo.yml` 文件：

```yaml
name: Deploy Hugo site to Pages

on:
  # 在推送到main分支时运行
  push:
    branches: ["main"]
  # 允许手动触发工作流
  workflow_dispatch:

# 设置GITHUB_TOKEN的权限
permissions:
  contents: read
  pages: write
  id-token: write

# 只允许一个并发部署
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  # 构建工作
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.123.0
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0

      - name: 设置Pages
        uses: actions/configure-pages@v4

      - name: 设置Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: '0.123.0'
          extended: true

      - name: 构建
        run: hugo --minify

      - name: 上传构建结果
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  # 部署工作
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: 部署到GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

3. 提交并推送到 GitHub：

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

4. 配置 GitHub Pages：

- 在 GitHub 仓库页面，点击 "Settings" > "Pages"。
- 在 "Source" 部分，选择 "GitHub Actions"。

5. 等待部署完成：

部署完成后，你的网站将可以通过 `https://yourusername.github.io/your-repo-name/` 访问。

## 多语言支持

Hugo Gallery 主题支持多语言网站。以下是配置多语言支持的步骤：

### 1. 配置语言

在 `hugo.toml` 中添加语言配置：

```toml
[languages]
  [languages.zh-cn]
    languageName = "中文"
    contentDir = "content"
    weight = 1
    title = "我的相册网站"
    [languages.zh-cn.params]
      description = "使用Hugo Gallery主题创建的个人相册网站"
  
  [languages.en]
    languageName = "English"
    contentDir = "content.en"
    weight = 2
    title = "My Gallery Website"
    [languages.en.params]
      description = "Personal gallery website created with Hugo Gallery theme"
```

### 2. 创建语言目录

为每种语言创建内容目录：

```
├── content/          # 中文内容
│   ├── _index.md
│   ├── about.md
│   └── landscape/
│       └── index.md
└── content.en/       # 英文内容
    ├── _index.md
    ├── about.md
    └── landscape/
        └── index.md
```

### 3. 翻译菜单

在 `hugo.toml` 中为每种语言配置菜单：

```toml
[languages.zh-cn.menu]
  [[languages.zh-cn.menu.main]]
    name = "首页"
    url = "/"
    weight = 1
  [[languages.zh-cn.menu.main]]
    name = "风景"
    url = "/landscape/"
    weight = 2

[languages.en.menu]
  [[languages.en.menu.main]]
    name = "Home"
    url = "/"
    weight = 1
  [[languages.en.menu.main]]
    name = "Landscape"
    url = "/landscape/"
    weight = 2
```

### 4. 语言切换器

Gallery 主题会自动显示语言切换器，用户可以在不同语言版本之间切换。

## 自定义和扩展

### 添加更多相册

按照上面的步骤，你可以创建更多的相册目录和内容文件。

### 自定义主题

你可以通过修改 `hugo.toml` 中的参数来自定义主题的外观和行为。

### 自定义 CSS

如果你想添加自定义 CSS 样式，可以创建 `assets/css/custom.css` 文件：

```css
/* assets/css/custom.css */
.gallery-image {
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.site-header {
  background-color: rgba(0, 0, 0, 0.8);
}
```

然后在 `hugo.toml` 中启用自定义 CSS：

```toml
[params]
  customCSS = ["css/custom.css"]
```

### 自定义 JavaScript

如果你需要添加自定义 JavaScript，可以创建 `assets/js/custom.js` 文件：

```javascript
// assets/js/custom.js
document.addEventListener('DOMContentLoaded', function() {
  console.log('自定义 JavaScript 已加载');
  
  // 添加图片点击事件
  document.querySelectorAll('.gallery-image').forEach(function(img) {
    img.addEventListener('click', function() {
      // 自定义处理逻辑
    });
  });
});
```

然后在 `hugo.toml` 中启用自定义 JavaScript：

```toml
[params]
  customJS = ["js/custom.js"]
```

### 自定义布局

如果你需要修改主题的布局，可以在项目根目录下创建对应的布局文件，覆盖主题中的默认布局：

```
layouts/
├── _default/
│   ├── baseof.html
│   └── single.html
└── partials/
    ├── footer.html
    └── header.html
```

### 添加图片元数据

你可以在图片的 front matter 中添加元数据，例如：

```markdown
---
title: 风景
resources:
  - src: landscape1.jpg
    title: 美丽的山景
    params:
      date: 2023-01-01T12:00:00+08:00
  - src: landscape2.jpg
    title: 宁静的湖泊
---
```

### 私有相册

你可以创建私有相册，这些相册不会在首页上显示：

```markdown
---
title: 私有相册
params:
  private: true
---
```

## 常见问题解答

### 如何更改网站图标？

替换 `static/images/` 目录下的 `favicon.png`、`favicon.svg` 和 `apple-touch-icon.png` 文件。

### 如何添加 Google Analytics？

在 `hugo.toml` 中添加以下配置：

```toml
[services.googleAnalytics]
  ID = "G-XXXXXXXXXX"  # 替换为你的 Google Analytics ID
```

### 如何禁用某些页面的评论功能？

在页面的 front matter 中添加：

```markdown
---
params:
  comments: false
---
```

### 图片无法显示怎么办？

1. 检查图片文件名是否正确，包括大小写。
2. 确保图片路径在 `resources` 中配置正确。
3. 运行 `hugo --gc` 清理缓存后重新构建。

### 如何自定义 404 页面？

创建 `layouts/404.html` 文件自定义 404 页面内容。

## 结语

恭喜！你现在已经成功搭建了一个使用 Hugo 和 Gallery 主题的个人相册网站，并将其部署到了 GitHub Pages。你可以继续添加更多的内容和自定义，使其成为你自己独特的网站。