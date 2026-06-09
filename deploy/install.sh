#!/usr/bin/env bash
#
# 在 Debian/Linux 上一键部署 worldcup-predictor：
#   1. 安装依赖、生产构建
#   2. 注册 systemd 服务（开机自启、崩溃自动重启、常驻 0.0.0.0:3000）
#   3. 注册 cron：每小时同步赛果、每半小时补预测
#
# 用法（在项目根目录）：sudo bash deploy/install.sh
#
set -euo pipefail

# ── 探测环境（不硬编码路径） ──────────────────────────
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# 以调用 sudo 的真实用户身份运行服务，而非 root
RUN_USER="${SUDO_USER:-$(whoami)}"
NPM_BIN="$(command -v npm)"
NODE_DIR="$(dirname "$(command -v node)")"
RUN_PATH="${NODE_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "▶ 项目目录: $WORKDIR"
echo "▶ 运行用户: $RUN_USER"
echo "▶ npm:      $NPM_BIN"
echo "▶ PATH:     $RUN_PATH"
echo

# ── 1. 依赖 + 构建 ───────────────────────────────────
echo "▶ 安装依赖并构建（生产）…"
sudo -u "$RUN_USER" bash -lc "cd '$WORKDIR' && npm install && npm run build"

# ── 2. systemd 服务 ─────────────────────────────────
echo "▶ 注册 systemd 服务 worldcup.service …"
SERVICE_OUT=/etc/systemd/system/worldcup.service
sed \
  -e "s|__USER__|${RUN_USER}|g" \
  -e "s|__WORKDIR__|${WORKDIR}|g" \
  -e "s|__NPM__|${NPM_BIN}|g" \
  -e "s|__PATH__|${RUN_PATH}|g" \
  "$WORKDIR/deploy/worldcup.service" > "$SERVICE_OUT"

systemctl daemon-reload
systemctl enable worldcup.service
systemctl restart worldcup.service

# ── 3. cron 定时同步 + 预测 ──────────────────────────
echo "▶ 注册 cron 定时任务 …"
CRON_FILE=/etc/cron.d/worldcup
cat > "$CRON_FILE" <<EOF
# worldcup-predictor 自动化（由 deploy/install.sh 生成）
# 每小时第 7 分钟同步赛程赛果
7 * * * * ${RUN_USER} curl -fsS http://localhost:3000/api/sync    >/dev/null 2>&1
# 每小时第 37 分钟为新比赛补预测
37 * * * * ${RUN_USER} curl -fsS http://localhost:3000/api/predict >/dev/null 2>&1
EOF
chmod 0644 "$CRON_FILE"

echo
echo "✅ 部署完成。"
echo "   服务状态:  systemctl status worldcup.service"
echo "   实时日志:  journalctl -u worldcup.service -f"
echo "   访问地址:  http://<本机IP>:3000"
echo "   定时任务:  $CRON_FILE"
