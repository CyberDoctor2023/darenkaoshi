# 《大人考试》独立发布版本

## Goal

基于 `/Users/jack/Documents/goals` 的当前 Git 提交创建一个独立分支，承载《大人考试｜父母卷》的静态网页发布包，并让该发布包可作为 `cyberdoctor.me` 的根站点部署。

## Non-goals

- 不修改或删除原有《人生备忘录》的根站点源码、提交和分支。
- 不在本次工作中改变答题算法、题库内容或交互逻辑。
- 不把《大人考试》代码直接覆盖到原仓库的根目录。

## Completion conditions

- 新分支从 `a11865f` 创建，并有独立提交。
- 发布包位于仓库内独立目录，入口资源及其依赖完整。
- 原仓库工作树与原有分支保持可恢复，后续可通过原分支重新发布《人生备忘录》。
- Cloudflare 使用该独立发布目录部署到 `cyberdoctor.me` 根域名。
- GitHub 另建 `CyberDoctor2023/darenkaoshi` 远端仓库，保存当前发布版本；默认使用私有仓库，除非用户另行要求公开。

## Validation plan

- 检查新分支提交内容和父提交关系。
- 对入口 JavaScript、运行引擎做语法检查，对 JSON 数据做解析检查。
- 检查发布包包含 `gamification-engine.js`，避免静态站点将缺失模块回退为 `index.html`。
- 仅确认 Cloudflare 部署任务成功；交互测试由用户自行完成。
- 使用 `gh repo view` 确认远端仓库，然后将当前 Git 版本推送为远端 `main` 分支。
