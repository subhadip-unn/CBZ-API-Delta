import { useEffect, useState } from 'react'
import MonacoDiffViewer from './components/MonacoDiffViewer'
import './App.css'
import './styles/MonacoDiffViewer.css'

function App() {
  // Get recordId and folder from URL search params
  const [params, setParams] = useState({
    recordId: null,
    folder: null
  });
  
  // Parse URL parameters on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const recordId = searchParams.get('recordId');
    const folder = searchParams.get('folder');
    
    setParams({
      recordId,
      folder
    });
  }, []);

  return (
    <div className="monaco-app">
      {params.recordId && params.folder ? (
        <MonacoDiffViewer 
          recordId={params.recordId} 
          folder={params.folder} 
        />
      ) : (
        <div className="monaco-error-container">
          <h2>Missing Required Parameters</h2>
          <p>Please provide both <code>recordId</code> and <code>folder</code> query parameters.</p>
          <a href="/" className="btn btn-primary">Go Back to Reports</a>
        </div>
      )}
    </div>
  )
}

export default App
