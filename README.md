# 标本分类助手

手机端中药标本分类、上架和快速查找工具，包含全部809种标本。

## 在线地址

https://dishihao.github.io/-2/

## 多设备自动同步

1. 创建一个 Supabase 项目。
2. 在 Supabase 的 SQL Editor 中执行仓库根目录的 `supabase-setup.sql`。
3. 在软件的“数据”页面填写项目网址、Publishable/anon key，以及自定的同步密码。
4. 手机和电脑填写相同配置后，会自动同步。

云端只保存由同步密码加密后的数据；同步密码不会上传。

部署恢复：2026-07-20 重新触发 GitHub Pages。
