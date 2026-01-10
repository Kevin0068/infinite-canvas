#!/bin/bash

# 自动更新文件部署脚本
# 使用方法: ./scripts/deploy-updates.sh [服务器地址] [用户名] [远程目录]
# 示例: ./scripts/deploy-updates.sh your-server.com root /var/www/updates

SERVER=${1:-"your-server.com"}
USER=${2:-"root"}
REMOTE_DIR=${3:-"/var/www/updates"}

echo "=========================================="
echo "无限画布 - 更新文件部署脚本"
echo "=========================================="
echo "服务器: $SERVER"
echo "用户: $USER"
echo "远程目录: $REMOTE_DIR"
echo ""

# 检查 release 目录是否存在
if [ ! -d "release" ]; then
    echo "错误: release 目录不存在，请先运行 npm run pack:all"
    exit 1
fi

# 需要上传的文件
FILES=(
    "latest-mac.yml"
    "latest.yml"
)

# 查找所有 .zip, .exe, .blockmap 文件
for file in release/*.zip release/*.exe release/*.blockmap release/*.yml; do
    if [ -f "$file" ]; then
        FILES+=("$(basename $file)")
    fi
done

echo "将要上传的文件:"
for file in "${FILES[@]}"; do
    if [ -f "release/$file" ]; then
        echo "  - $file"
    fi
done
echo ""

read -p "确认上传? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "开始上传..."
    
    # 创建远程目录
    ssh $USER@$SERVER "mkdir -p $REMOTE_DIR"
    
    # 上传文件
    for file in "${FILES[@]}"; do
        if [ -f "release/$file" ]; then
            echo "上传: $file"
            scp "release/$file" "$USER@$SERVER:$REMOTE_DIR/"
        fi
    done
    
    echo ""
    echo "=========================================="
    echo "部署完成!"
    echo "更新地址: https://$SERVER${REMOTE_DIR#/var/www}/"
    echo "=========================================="
else
    echo "已取消"
fi
