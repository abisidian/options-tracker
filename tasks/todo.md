# TODO

- [ ] 接入远端仓库并先同步远端历史
- [ ] 提交本地修改并推送到 `git@github.com:abisidian/options-tracker.git`

## Review

- 当前本地工作区干净，`git status --short --branch` 显示仅有 `main`
- 远端 `origin` 已指向 `git@github.com:abisidian/options-tracker.git`
- 直接使用 `~/.ssh/id_rsa` 连接 GitHub 时返回 `Permission denied (publickey)`，且该私钥需要口令，暂时无法在当前无交互流程中完成认证
