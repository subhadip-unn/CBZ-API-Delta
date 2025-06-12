import React, { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';

const MonacoDiffViewer = ({ recordId, folder }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jsonData, setJsonData] = useState({
    original: '{}',
    modified: '{}'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if recordId and folder are provided
        if (!recordId || !folder) {
          throw new Error('Missing recordId or folder parameter');
        }

        console.log(`Fetching diff data for recordId=${recordId}, folder=${folder}`);
        
        // Use full URL to ensure we're hitting the right endpoint
        const baseUrl = window.location.origin;
        const apiUrl = `${baseUrl}/api/json-diff?recordId=${recordId}&folder=${folder}`;
        console.log(`API URL: ${apiUrl}`);
        
        // Fetch data from our API endpoint
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          console.error(`API error: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error(`Error body: ${errorText}`);
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        console.log('Received data from API:', data);
        console.log('Original data type:', typeof data.original);
        console.log('Modified data type:', typeof data.modified);
        
        // Ensure we're working with strings for Monaco editor
        const ensureValidString = (input) => {
          if (!input) return '{}';
          
          // If it's already a string, try to validate it
          if (typeof input === 'string') {
            try {
              // Test if it's valid JSON by parsing and re-stringifying
              const parsed = JSON.parse(input);
              return JSON.stringify(parsed, null, 2);
            } catch (e) {
              console.warn('Invalid JSON received, using empty object', e);
              return '{}';
            }
          }
          
          // If it's an object, stringify it
          if (typeof input === 'object') {
            try {
              return JSON.stringify(input, null, 2);
            } catch (e) {
              console.warn('Failed to stringify object', e);
              return '{}';
            }
          }
          
          return '{}';
        };
        
        // Use validated strings
        const originalStr = ensureValidString(data.original);
        const modifiedStr = ensureValidString(data.modified);
        
        console.log('Processed original length:', originalStr.length);
        console.log('Processed modified length:', modifiedStr.length);

        setJsonData({
          original: originalStr,
          modified: modifiedStr
        });
      } catch (error) {
        console.error('Error loading diff data:', error);
        setError(`Failed to load data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recordId, folder]);

  const handleEditorDidMount = (editor) => {
    // Optional: customize editor settings when it loads
    editor.updateOptions({
      readOnly: true
    });
  };

  // Handle back button click - go back to reports
  const handleBackClick = () => {
    window.location.href = '/';
  };

  return (
    <div className="monaco-diff-container">
      <header className="monaco-header">
        <h1>Monaco JSON Diff Viewer</h1>
        <div className="monaco-controls">
          <button className="btn btn-primary" onClick={handleBackClick}>
            ← Back to Reports
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="monaco-error">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="monaco-loading">Loading...</div>
      ) : (
        <div className="monaco-diff-editor">
          <DiffEditor
            height="80vh"
            language="json"
            original={jsonData.original}
            modified={jsonData.modified}
            onMount={handleEditorDidMount}
            options={{
              renderSideBySide: true,
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MonacoDiffViewer;
