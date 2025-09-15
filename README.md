# Hugo Gallery 主题网站

这是一个使用 [Hugo](https://gohugo.io/) 和 [Gallery 主题](https://github.com/nicokaiser/hugo-theme-gallery) 创建的个人相册网站。

## 特点

- 响应式设计
- 暗色主题
- 相册视图使用 Flickr 的 Justified Layout
- 使用 PhotoSwipe 实现灯箱效果
- SEO 优化

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/stevewang1/hugo-theme-gallery.git
cd hugo-theme-gallery

# 初始化子模块
git submodule update --init --recursive

# 启动本地服务器
hugo server -D
```

## 添加内容

在 `content` 目录下创建新的目录和 `index.md` 文件来添加新的相册。例如：

```
content/
├── _index.md
├── about.md
├── landscape/
│   └── index.md
└── city/
    └── index.md
```

## 部署

本网站使用 GitHub Actions 自动部署到 GitHub Pages。每次推送到 `main` 分支时，都会触发构建和部署流程。