# Doctor 路由页规格

## Goal

在《大人考试｜父母卷》的独立发布包内增加 `/doctor/` 路由，作为 QR 码落地页。二维码进入后不再显示二维码，而是变成参考海报风格的三个大按钮：答卷、成为出卷人、天使请点我。

## Non-goals

- 不改动已有答题流程、题库、结果卡或本地存档逻辑。
- 不虚构收题 API、邮箱、报名表单或天使联系人；出卷人入口使用用户提供的飞书表单链接，天使入口使用已记录的 GitHub 联系渠道。
- 不把发布包重新覆盖到普通 LifeNotes 首页分支。

## Completion conditions

- `deploy/darenkaoshi/doctor/index.html` 可由 `/doctor/` 直接访问，并在窄屏上可用。
- 答卷人入口指向当前答题首页；出卷人入口指向用户提供的飞书表单，天使入口指向已记录的 GitHub 联系渠道。
- 页面先只交付三行入口框架，AIGC 视频模块作为后续迭代，不混入本次极简落地页。
- 《大人考试》首页有一个不打断答题的 Doctor 路由入口。
- 所有改动形成独立 Git 提交，并将 `deploy/darenkaoshi` 发布到 Cloudflare Pages 项目 `cyberdoctor`。

## Validation plan

- 对新增 JavaScript 运行 `node --check`，对 JSON 运行解析检查，运行 `git diff --check`。
- 在本地静态服务器检查 `/doctor/` 桌面与手机宽度，并验证视频、海报和 GitHub 链接。
- 运行 `npx wrangler@latest whoami` 后，使用 `npx wrangler@latest pages deploy deploy/darenkaoshi --project-name=cyberdoctor` 发布并验证 HTTPS 路由。
