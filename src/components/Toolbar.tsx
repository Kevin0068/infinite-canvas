import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { loadFile } from '../services/fileService';
import { mergeImages } from '../core/merger';
import { exportAndDownload } from '../services/exportService';
import { saveDraftToFile, loadDraftFromFile, deserializeDraft, serializeDraft } from '../services/draftService';
import { SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES } from '../types';
import type { ExportFormat } from '../services/exportService';
import type { ImageElement } from '../types';

// 声明 electronAPI 类型
declare global {
  interface Window {
    electronAPI?: {
      getVersion: () => Promise<string>;
      checkForUpdates: () => Promise<unknown>;
      onUpdateAvailable: (callback: (info: { version: string }) => void) => void;
      onUpdateNotAvailable: (callback: () => void) => void;
      onUpdateError: (callback: (error: string) => void) => void;
      onUpdateDownloading: (callback: () => void) => void;
      onUpdateProgress: (callback: (percent: number) => void) => void;
    };
  }
}

export const Toolbar: React.FC<{ onShowShortcuts?: () => void }> = ({ onShowShortcuts }) => {
  const { dispatch, state, canUndo, canRedo } = useCanvas();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [version, setVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'latest' | 'error'>('idle');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // 自动保存间隔（毫秒）
  const AUTO_SAVE_INTERVAL = 60000; // 1分钟
  const AUTO_SAVE_KEY = 'infinite-canvas-autosave';

  // 自动保存功能
  const performAutoSave = useCallback(() => {
    if (!autoSaveEnabled || state.elements.length === 0) return;
    
    try {
      const draft = serializeDraft(state);
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
      setLastAutoSave(new Date());
      console.log('自动保存完成');
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }, [autoSaveEnabled, state]);

  // 定时自动保存
  useEffect(() => {
    if (!autoSaveEnabled) return;
    
    const interval = setInterval(() => {
      if (state.hasUnsavedChanges) {
        performAutoSave();
      }
    }, AUTO_SAVE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [autoSaveEnabled, state.hasUnsavedChanges, performAutoSave]);

  // 启动时检查自动保存
  useEffect(() => {
    const autoSaveData = localStorage.getItem(AUTO_SAVE_KEY);
    if (autoSaveData && state.elements.length === 0) {
      try {
        const draft = JSON.parse(autoSaveData);
        const shouldRestore = confirm('发现自动保存的草稿，是否恢复？');
        if (shouldRestore) {
          const restoredState = deserializeDraft(draft);
          dispatch({ type: 'LOAD_STATE', payload: restoredState });
        }
      } catch (error) {
        console.error('恢复自动保存失败:', error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 获取版本号
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getVersion().then(setVersion);
      
      // 监听更新事件
      window.electronAPI.onUpdateAvailable((info) => {
        setUpdateStatus('available');
        console.log('发现新版本:', info.version);
      });
      
      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateStatus('latest');
        // 3秒后恢复
        setTimeout(() => setUpdateStatus('idle'), 3000);
      });
      
      window.electronAPI.onUpdateError((error) => {
        setUpdateStatus('error');
        console.error('更新错误:', error);
        setTimeout(() => setUpdateStatus('idle'), 3000);
      });
      
      window.electronAPI.onUpdateDownloading(() => {
        setUpdateStatus('downloading');
      });
      
      window.electronAPI.onUpdateProgress((percent) => {
        setUpdateProgress(percent);
      });
    } else {
      // 非 Electron 环境，显示开发版本
      setVersion('dev');
    }
  }, []);

  // 检查更新
  const handleCheckUpdate = async () => {
    if (!window.electronAPI || updateStatus === 'checking') return;
    
    setUpdateStatus('checking');
    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error('检查更新失败:', error);
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
  };

  // 获取版本显示文本
  const getVersionText = () => {
    switch (updateStatus) {
      case 'checking':
        return `v${version} 检查中...`;
      case 'available':
        return `v${version} 有更新!`;
      case 'downloading':
        return `v${version} 下载中 ${updateProgress.toFixed(0)}%`;
      case 'latest':
        return `v${version} 已是最新`;
      case 'error':
        return `v${version} 检查失败`;
      default:
        return `v${version}`;
    }
  };

  // 获取版本样式
  const getVersionStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      ...styles.version,
      cursor: window.electronAPI ? 'pointer' : 'default',
    };
    
    switch (updateStatus) {
      case 'available':
        return { ...baseStyle, color: '#4ade80', fontWeight: 'bold' };
      case 'downloading':
        return { ...baseStyle, color: '#60a5fa' };
      case 'latest':
        return { ...baseStyle, color: '#4ade80' };
      case 'error':
        return { ...baseStyle, color: '#f87171' };
      case 'checking':
        return { ...baseStyle, color: '#fbbf24' };
      default:
        return baseStyle;
    }
  };

  // 未保存更改提醒
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '你有未保存的更改，确定要离开吗？';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  // 撤销
  const handleUndo = () => {
    if (canUndo) {
      dispatch({ type: 'UNDO' });
    }
  };

  // 重做
  const handleRedo = () => {
    if (canRedo) {
      dispatch({ type: 'REDO' });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 计算最大 zIndex
    const maxZIndex = state.elements.length > 0 
      ? Math.max(...state.elements.map(el => el.zIndex)) 
      : 0;

    // 默认位置（画布中心）
    const centerX = -state.viewport.offset.x / state.viewport.scale + 400;
    const centerY = -state.viewport.offset.y / state.viewport.scale + 300;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const element = await loadFile(
          file,
          { x: centerX + i * 20, y: centerY + i * 20 },
          maxZIndex + i + 1
        );
        dispatch({ type: 'ADD_ELEMENT', payload: element });
      } catch (error) {
        console.error('文件加载失败:', error);
        alert(`文件加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 清空 input 以允许重复选择同一文件
    e.target.value = '';
  };

  const acceptTypes = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(',');

  // 获取选中的图片元素
  const selectedImages = state.elements.filter(
    (el): el is ImageElement => el.type === 'image' && state.selectedIds.has(el.id)
  );
  const canMerge = selectedImages.length >= 2;
  
  // 获取所有图片元素（用于导出）
  const allImages = state.elements.filter(
    (el): el is ImageElement => el.type === 'image'
  );
  const canExport = selectedImages.length > 0 || allImages.length > 0;

  const handleMerge = async () => {
    if (!canMerge) return;
    
    try {
      const mergedImage = await mergeImages(selectedImages, () => crypto.randomUUID());
      dispatch({ type: 'MERGE_IMAGES', payload: mergedImage });
    } catch (error) {
      console.error('合并失败:', error);
      alert(`合并失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleExport = async () => {
    if (!canExport || isExporting) return;
    
    // 优先导出选中的图片，否则导出所有图片
    const imagesToExport = selectedImages.length > 0 ? selectedImages : allImages;
    
    setIsExporting(true);
    try {
      const filename = `canvas-export-${Date.now()}`;
      await exportAndDownload(imagesToExport, filename, { format: exportFormat });
    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 保存草稿
  const handleSaveDraft = () => {
    try {
      saveDraftToFile(state, `canvas-draft-${Date.now()}`);
      dispatch({ type: 'MARK_SAVED' });
    } catch (error) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 加载草稿
  const handleLoadDraftClick = () => {
    if (state.hasUnsavedChanges) {
      if (!confirm('你有未保存的更改，确定要加载新草稿吗？')) {
        return;
      }
    }
    draftInputRef.current?.click();
  };

  const handleDraftFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const draft = await loadDraftFromFile(file);
      const restoredState = deserializeDraft(draft);
      dispatch({ type: 'LOAD_STATE', payload: restoredState });
    } catch (error) {
      console.error('加载草稿失败:', error);
      alert(`加载草稿失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    e.target.value = '';
  };

  return (
    <div style={styles.toolbar}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptTypes}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={draftInputRef}
        type="file"
        accept=".json"
        onChange={handleDraftFileChange}
        style={{ display: 'none' }}
      />
      <button onClick={handleUploadClick} style={styles.button} title="上传图片或视频">
        📁 上传
      </button>
      <div style={styles.separator} />
      <button 
        onClick={handleUndo} 
        style={{
          ...styles.button,
          backgroundColor: canUndo ? '#4a90d9' : '#555',
          cursor: canUndo ? 'pointer' : 'not-allowed',
        }} 
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
      >
        ↩️ 撤销
      </button>
      <button 
        onClick={handleRedo} 
        style={{
          ...styles.button,
          backgroundColor: canRedo ? '#4a90d9' : '#555',
          cursor: canRedo ? 'pointer' : 'not-allowed',
        }} 
        disabled={!canRedo}
        title="重做 (Ctrl+Y)"
      >
        ↪️ 重做
      </button>
      <div style={styles.separator} />
      <button 
        onClick={handleMerge} 
        style={{
          ...styles.button,
          backgroundColor: canMerge ? '#4a90d9' : '#555',
          cursor: canMerge ? 'pointer' : 'not-allowed',
        }} 
        disabled={!canMerge}
        title={canMerge ? '合并选中的图片' : '请选择至少2张图片'}
      >
        🔗 合并
      </button>
      <div style={styles.separator} />
      <select
        value={exportFormat}
        onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
        style={styles.select}
      >
        <option value="png">PNG</option>
        <option value="jpg">JPG</option>
      </select>
      <button
        onClick={handleExport}
        style={{
          ...styles.button,
          backgroundColor: canExport && !isExporting ? '#28a745' : '#555',
          cursor: canExport && !isExporting ? 'pointer' : 'not-allowed',
        }}
        disabled={!canExport || isExporting}
        title={selectedImages.length > 0 ? '导出选中的图片' : '导出所有图片'}
      >
        {isExporting ? '⏳ 导出中...' : '📥 导出'}
      </button>
      <div style={styles.separator} />
      <button onClick={handleSaveDraft} style={styles.button} title="保存草稿">
        💾 保存
      </button>
      <button onClick={handleLoadDraftClick} style={styles.button} title="加载草稿">
        📂 加载
      </button>
      <div style={styles.separator} />
      <span style={styles.info}>
        元素: {state.elements.length} | 选中: {state.selectedIds.size}
        {state.hasUnsavedChanges && <span style={{ color: '#ffc107' }}> (未保存)</span>}
      </span>
      <div style={{ flex: 1 }} />
      {version && (
        <span 
          style={getVersionStyle()} 
          onClick={handleCheckUpdate}
          title="点击检查更新"
        >
          {getVersionText()}
        </span>
      )}
      <button 
        onClick={onShowShortcuts} 
        style={{ ...styles.button, backgroundColor: '#555', padding: '8px 12px' }}
        title="快捷键 (F1)"
      >
        ⌨️
      </button>
      <button
        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
        style={{ 
          ...styles.button, 
          backgroundColor: autoSaveEnabled ? '#28a745' : '#555',
          padding: '8px 12px',
        }}
        title={`自动保存: ${autoSaveEnabled ? '开启' : '关闭'}${lastAutoSave ? ` (上次: ${lastAutoSave.toLocaleTimeString()})` : ''}`}
      >
        {autoSaveEnabled ? '🔄' : '⏸️'}
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#2d2d2d',
    borderBottom: '1px solid #404040',
    gap: '8px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#4a90d9',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  select: {
    padding: '8px 12px',
    backgroundColor: '#3d3d3d',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  separator: {
    width: '1px',
    height: '24px',
    backgroundColor: '#404040',
    margin: '0 8px',
  },
  info: {
    color: '#888',
    fontSize: '13px',
  },
  version: {
    color: '#666',
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
};
