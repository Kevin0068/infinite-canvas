import { CanvasProvider } from './context/CanvasContext';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { DropZone } from './components/DropZone';
import './App.css';

function App() {
  return (
    <CanvasProvider>
      <div style={styles.app}>
        <Toolbar />
        <div style={styles.canvasContainer}>
          <DropZone>
            <Canvas />
          </DropZone>
        </div>
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
