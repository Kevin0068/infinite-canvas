// 更新日志数据
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.0.7',
    date: '2026-01-12',
    changes: [
      '修复：Windows 自动更新时"无法卸载旧版本"的问题',
      '修复：macOS 自动更新后点击重启无反应的问题',
    ],
  },
  {
    version: '1.0.6',
    date: '2026-01-12',
    changes: [
      '新增：更新后显示更新日志',
      '修复：Windows 自动更新失败的问题',
      '修复：macOS 自动更新后无法重启的问题',
    ],
  },
  {
    version: '1.0.5',
    date: '2026-01-12',
    changes: [
      '修复：Windows 自动更新时提示"无法卸载旧版本"的问题',
    ],
  },
  {
    version: '1.0.4',
    date: '2026-01-12',
    changes: [
      '修复：macOS 自动更新后无法重启的问题',
    ],
  },
  {
    version: '1.0.3',
    date: '2026-01-12',
    changes: [
      '新增：自由旋转 - 拖动顶部圆形手柄可任意角度旋转元素',
      '新增：等比例缩放 - 拖动角点可等比例缩放元素',
      '新增：文字缩放时字体大小同步变化',
      '新增：内联文字编辑 - 右键插入文字，双击编辑',
      '新增：图文合并 - 支持图片和文字混合合并为一张图片',
    ],
  },
  {
    version: '1.0.2',
    date: '2026-01-11',
    changes: [
      '新增：撤销/重做功能 (Ctrl+Z / Ctrl+Y)',
      '新增：文字元素支持',
      '新增：元素旋转功能',
      '优化：选择框显示旋转和缩放手柄',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-01-10',
    changes: [
      '新增：框选功能',
      '新增：右键菜单导出选项',
      '新增：图片裁剪功能',
      '新增：版本号显示和更新检查',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-09',
    changes: [
      '首次发布',
      '支持图片和视频上传',
      '无限画布拖拽和缩放',
      '元素选择、移动、删除',
      '图片合并功能',
      '导出为 PNG/JPG',
      '草稿保存和加载',
    ],
  },
];

// 获取指定版本的更新日志
export function getChangelogForVersion(version: string): ChangelogEntry | undefined {
  return changelog.find(entry => entry.version === version);
}

// 获取两个版本之间的所有更新日志
export function getChangelogBetweenVersions(fromVersion: string, toVersion: string): ChangelogEntry[] {
  const fromIndex = changelog.findIndex(entry => entry.version === fromVersion);
  const toIndex = changelog.findIndex(entry => entry.version === toVersion);
  
  if (fromIndex === -1 || toIndex === -1) {
    return [];
  }
  
  // changelog 是按版本从新到旧排序的
  return changelog.slice(toIndex, fromIndex);
}
