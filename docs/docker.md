# Docker 独立运行

镜像提供一个 Bun 1.3.14 进程，同时托管工作台和 HTTP API，默认监听容器内 `0.0.0.0:4890`。PNG 渲染使用原生 Canvas，不需要 Chrome。以下示例以 `linux/amd64` 为验收平台；在其他架构的主机上构建或运行，需要 Docker 的平台模拟支持。

Pipeline 使用 `@akairos/typeset-studio/adapter` 的本地 npm 模式时，不需要启动此服务。此镜像用于单管理员独立工作台，不承担多用户隔离。

## 构建与启动

在仓库根目录执行。Dockerfile 分阶段构建前端和库文件，运行层仅安装生产依赖；本机 `node_modules`、`dist`、`data`、`.env` 和未提交的本地字体不会进入构建上下文。镜像首次运行会按源码初始化通用模板，不携带个人模板、上传素材或账号配置。

```bash
docker build --platform linux/amd64 -t typeset-studio:local .

# 密钥只写入权限受限的文件，不输出到终端；不要开启 shell 命令追踪。
umask 077
mkdir -p "$HOME/.config/typeset-studio"
TYPESET_ENV_FILE="$HOME/.config/typeset-studio/docker.env"
if [ ! -f "$TYPESET_ENV_FILE" ]; then
  printf 'TYPESET_ADMIN_KEY=%s\n' "$(openssl rand -hex 32)" > "$TYPESET_ENV_FILE"
fi
docker volume create typeset-studio-data
docker run -d --name typeset-studio \
  --platform linux/amd64 \
  --env-file "$TYPESET_ENV_FILE" \
  -p 127.0.0.1:4890:4890 \
  -v typeset-studio-data:/data \
  typeset-studio:local
```

容器要求运行时显式提供 `TYPESET_ADMIN_KEY`，缺少或为空时直接退出，不依靠自动生成密钥或读取日志。重建容器时继续使用原密钥文件，且不要提交该文件。工作台位于 `http://127.0.0.1:4890`，在设置中填写文件中的密钥；容器端口映射后的连接不保证属于服务识别的真实回环连接，因此不依赖自动取钥。

远程主机继续绑定宿主机 loopback，通过 SSH 访问：

```bash
ssh -N -L 4890:127.0.0.1:4890 your-server
```

## 数据、素材与字体

`TYPESET_DATA_DIR=/data` 统一保存以下内容：

| 路径 | 内容 |
| --- | --- |
| `/data/templates/` | 模板 JSON 和首次初始化标记 |
| `/data/default-template.json` | 全局及账号槽位默认配置 |
| `/data/uploads/` | 上传素材，模板通过 `/uploads/...` 引用 |

重启、替换镜像或重建容器时，复用同一个数据卷和密钥文件。备份和恢复以整个数据卷为单位，包含初始化标记和上传素材；不要只复制模板 JSON。命名卷由镜像初始化为 `bun` 用户可写；改用宿主机 bind mount 时，需要自行给容器内 `bun` 用户写权限。

镜像通过 Debian 的 `fonts-noto-cjk` 安装中文系统字体，Canvas 可在运行时离线加载。`/api/fonts` 只扫描项目字体目录，不列举系统字体，因此返回空列表不能作为中文渲染失败的依据。默认模板中的 macOS 字体名会使用系统字体回退，外观可能与开发机不同；中文 PNG 需要按下面的实际渲染结果确认。浏览器预览使用访问者的字体，不承诺与容器像素一致。

需要自定义字体时，核对分发许可后将字体目录只读挂到 `/app/fonts`，例如在启动参数中加 `--mount type=bind,src=/absolute/path/fonts,dst=/app/fonts,readonly`。该目录可同时被服务端和工作台读取；不要依赖本机未提交的 `public/fonts/*.ttf` 来构建通用镜像。

部分通用示例模板包含远程图片，首次使用这些图片需要网络。下面的验收模板清空图片引用，用于确认中文、Canvas 和持久化，不依赖外部图片服务。

## 主控验收

以下命令需要宿主机有 `curl` 和 `jq`，在上述启动完成后运行。健康检查只代表服务响应；模板持久化和 PNG 渲染单独确认。临时头文件包含管理员密钥，只保存在权限受限的临时目录，不把密钥写入 URL、命令参数或验收日志。

```bash
curl --fail --silent --show-error http://127.0.0.1:4890/api/health

umask 077
TYPESET_CHECK_DIR=$(mktemp -d)
sed 's/^TYPESET_ADMIN_KEY=/X-Admin-Key: /' "$TYPESET_ENV_FILE" > "$TYPESET_CHECK_DIR/headers"

curl --fail --silent --show-error http://127.0.0.1:4890/api/templates \
  --header @"$TYPESET_CHECK_DIR/headers" \
  --output "$TYPESET_CHECK_DIR/templates.json"

jq '.templates[] | select(.id == "tpl_wechat_cover_minimal")
  | .id = "tpl_docker_check" | .name = "Docker 中文封面验收"
  | .images = []
  | .typography = {headingFont: "Noto Sans CJK SC", bodyFont: "Noto Serif CJK SC"}' \
  "$TYPESET_CHECK_DIR/templates.json" > "$TYPESET_CHECK_DIR/template.json"

curl --fail --silent --show-error http://127.0.0.1:4890/api/templates \
  --header @"$TYPESET_CHECK_DIR/headers" \
  --header 'Content-Type: application/json' \
  --data-binary @"$TYPESET_CHECK_DIR/template.json" \
  --output "$TYPESET_CHECK_DIR/saved.json"
jq -e '.ok and .template.id == "tpl_docker_check"' "$TYPESET_CHECK_DIR/saved.json"

docker restart typeset-studio
```

重启后等待 `/api/health` 可响应，再确认模板仍在并渲染封面：

```bash
curl --fail --silent --show-error http://127.0.0.1:4890/api/templates/tpl_docker_check \
  --header @"$TYPESET_CHECK_DIR/headers" \
  --output "$TYPESET_CHECK_DIR/reloaded.json"
jq -e '.ok and .template.name == "Docker 中文封面验收"' "$TYPESET_CHECK_DIR/reloaded.json"

curl --fail --silent --show-error http://127.0.0.1:4890/api/render/png \
  --header @"$TYPESET_CHECK_DIR/headers" \
  --header 'Content-Type: application/json' \
  --data-binary '{"templateId":"tpl_docker_check","markdown":"# Docker 中文封面\n字体与模板持久化验证","kind":"cover","maxPages":1,"preserveTemplateStyle":true}' \
  --output "$TYPESET_CHECK_DIR/cover.png"
file "$TYPESET_CHECK_DIR/cover.png"
```

确认产物为 `3350 × 1000` PNG，并打开图片确认中文字形可见。继续检查容器健康状态、Bun 版本、系统字体和上下文边界：

```bash
docker inspect --format '{{.State.Health.Status}}' typeset-studio
docker exec typeset-studio bun --version
docker exec typeset-studio fc-match ':lang=zh-cn'
docker exec typeset-studio sh -c 'test ! -e /app/.env && test ! -e /app/data && test ! -e /app/.git'
docker exec typeset-studio sh -c 'find /app/public/fonts -type f'
rm "$TYPESET_CHECK_DIR/headers"
```

最后一项只应列出字体说明和清单，不应包含开发机私有字体文件。保留验收 JSON 和 PNG 作为结果证据；该镜像本身不创建微信草稿，完整发布需由调用方按 Pipeline 状态机另行验收。
