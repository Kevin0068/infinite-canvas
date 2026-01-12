import { useState, useEffect } from 'react';
import { CanvasProvider } from './context/CanvasContext';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { DropZone } from './components/DropZone';
import { ChangelogModal } from './components/ChangelogModal';
import './App.css';

// 版本号存储的 key
const VERSION_STORAGE_KEY = 'infinite-canvas-version';

function App() {
  const [showChangelog, setShowChangelog] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [previousVersion, setPreviousVersion] = useState<string | undefined>();

  useEffect(() => {
    // 检查版本更新
    const checkVersionUpdate = async () => {
      let version = '';
      
      // 尝试从 Electron 获取版本
      if (window.electronAPI?.getVersion) {
        try {
          version = await window.electronAPI.getVersion();
        } catch {
          // 如果获取失败，使用硬编码版本
          version = '1.0.6';
        }
      } else {
        // 非 Electron 环境，使用硬编码版本
        version = '1.0.6';
      }
      
      setCurrentVersion(version);
      
      // 获取之前存储的版本
      const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
      
      // 如果版本不同，显示更新日志
      if (storedVersion && storedVersion !== version) {
        setPreviousVersion(storedVersion);
        setShowChangelog(true);
      }
      
      // 更新存储的版本
      localStorage.setItem(VERSION_STORAGE_KEY, version);
    };
    
    checkVersionUpdate();
  }, []);

  const handleCloseChangelog = () => {
    setShowChangelog(false);
  };

  return (
    <CanvasProvider>
      <div style={styles.app}>
        <Toolbar />
        <div style={styles.canvasContainer}>
          <DropZone>
            <Canvas />
          </DropZone>
        </div>
        {showChangelog && currentVersion && (
          <ChangelogModal
            currentVersion={currentVersion}
            previousVersion={previousVersion}
            onClose={handleCloseChangelog}
          />
        )}
      </div>
    </CanvasProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};

export default App;
